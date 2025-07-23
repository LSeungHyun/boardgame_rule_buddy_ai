/**
 * 웹 리서치 API 엔드포인트 - Google Custom Search + 웹 스크래핑
 * SMART-RESEARCH-IMPLEMENTATION.md 기반 구현
 */

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { QuestionAnalyzer } from '@/lib/question-analyzer';
import { ResearchLimiter } from '@/lib/research-limiter';
import { researchCache } from '@/lib/research-cache';
import { enhancedTranslator } from '@/lib/enhanced-translator'; // 🚨 Enhanced Translator 사용
import { GameMappingService } from '@/lib/game-mapping-service';
import type { SearchResult } from '@/lib/research-cache';

// 신뢰할 수 있는 소스 도메인 우선순위 (⚡ 개선)
const TRUSTED_DOMAINS = [
  'boardgamegeek.com',        // 최고 신뢰도 - 공식 정보
  'reddit.com/r/boardgames',  // 높은 신뢰도 - 커뮤니티 검증
  'boardlife.co.kr',          // 한국 커뮤니티 1위
  'boardm.co.kr',             // 한국 커뮤니티 2위
  'rulebook.io',
  'tabletopia.com',
  'wikimediafoundation.org',
  'bg3.co.kr',
  'divedice.com'
] as const;

// 검색 결과 필터링을 위한 제외 도메인 (⚡ 확장)
const EXCLUDED_DOMAINS = [
  'pinterest.com',
  'youtube.com',
  'instagram.com',
  'facebook.com',
  'twitter.com',
  'tiktok.com',
  'amazon.com',        // 상품 페이지
  'ebay.com',          // 상품 페이지
  'gmarket.co.kr',     // 상품 페이지
  'coupang.com'        // 상품 페이지
] as const;

interface ResearchRequest {
  gameTitle: string;
  question: string;
  englishKeywords?: string[]; // 🚨 BGG 영어 검색용 키워드 추가
  priority?: 'low' | 'medium' | 'high';
  bypassCache?: boolean;
  // 맥락 추적 관련 필드 추가
  contextKeywords?: string[];
  relatedHistory?: Array<{
    question: string;
    answer: string;
    topic: string;
  }>;
}

interface ResearchResponse {
  success: boolean;
  data?: {
    searchResults: SearchResult[];
    summary: string;
    sources: string[];
    fromCache: boolean;
    cacheHit?: boolean;
  };
  error?: {
    code: string;
    message: string;
    suggestion?: string;
  };
  usage?: {
    remaining: { daily: number; hourly: number };
    status: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ResearchResponse>> {

  // 🚨 강력한 디버깅 로그 추가
  console.log('🚨🚨🚨 [API 호출 확인] /api/research 엔드포인트가 호출되었습니다!');
  console.log('🚨 [타임스탬프]', new Date().toISOString());

  try {
    // 1. 요청 본문 파싱
    const body: ResearchRequest = await request.json();
    const { gameTitle, question, englishKeywords, priority = 'medium', bypassCache = false } = body;

    // 🚨 요청 내용 로깅  
    console.log('🚨 [요청 파라미터]', {
      게임제목: gameTitle,
      질문: question,
      영어키워드: englishKeywords,
      우선순위: priority,
      캐시우회: bypassCache
    });

    // 2. 입력 검증
    if (!gameTitle || !question) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '게임 제목과 질문을 모두 입력해주세요.'
        }
      }, { status: 400 });
    }

    // 3. 질문 복잡도 분석
    const analyzer = new QuestionAnalyzer();
    const complexityScore = analyzer.analyzeComplexity(question, gameTitle);

    // 4. 리서치 제한 확인
    const limiter = new ResearchLimiter();
    const validation = limiter.validateResearchRequest(priority);

    if (!validation.allowed) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: validation.reason!,
          suggestion: validation.suggestion
        },
        usage: {
          remaining: limiter.getRemainingQuota(),
          status: 'blocked'
        }
      }, { status: 429 });
    }

    // 5. 캐시 확인 (바이패스가 아닌 경우)
    if (!bypassCache) {
      const cached = researchCache.get(gameTitle, question);
      if (cached) {
        limiter.recordCacheHit();
        limiter.recordQuestionAsked();

        return NextResponse.json({
          success: true,
          data: {
            searchResults: cached.searchResults,
            summary: cached.summary,
            sources: cached.sources,
            fromCache: true,
            cacheHit: true
          },
          usage: {
            remaining: limiter.getRemainingQuota(),
            status: 'cache_hit'
          }
        });
      }
    }

    // 6. Google Custom Search API 실행
    const searchResults = await performWebSearch(gameTitle, question, englishKeywords);

    // 7. 웹페이지 콘텐츠 스크래핑
    const enrichedResults = await enrichSearchResults(searchResults);

    // 8. 검색 결과 요약 생성
    const summary = generateSearchSummary(enrichedResults, question);
    const sources = enrichedResults.map(result => result.url);

    // 9. 캐시 저장
    researchCache.set(gameTitle, question, enrichedResults, summary, sources);

    // 10. 사용량 기록
    limiter.recordResearchUsage();
    limiter.recordQuestionAsked();

    return NextResponse.json({
      success: true,
      data: {
        searchResults: enrichedResults,
        summary,
        sources,
        fromCache: false,
        cacheHit: false
      },
      usage: {
        remaining: limiter.getRemainingQuota(),
        status: 'research_completed'
      }
    });

  } catch (error) {
    console.error('Research API Error:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '리서치 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        suggestion: '문제가 지속되면 기본 AI 답변을 이용해주세요.'
      }
    }, { status: 500 });
  }
}

/**
 * Google Custom Search API를 이용한 웹 검색
 * Next.js 15 + Turbopack 환경변수 호환성 개선
 */
async function performWebSearch(gameTitle: string, question: string, englishKeywords?: string[]): Promise<SearchResult[]> {

  // 🚨 검색 함수 호출 확인
  console.log('🚨🚨🚨 [performWebSearch 호출됨]', {
    게임제목: gameTitle,
    질문: question,
    타임스탬프: new Date().toISOString()
  });

  // 🔧 Next.js 15 + Turbopack 환경변수 폴백 패턴 적용
  // Context7 최적화: 환경변수 수동 설정으로 Turbopack 호환성 확보
  if (!process.env.GOOGLE_API_KEY && !process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
    console.log('⚠️ [Google API] Turbopack 환경변수 수동 설정');
    // .env.local에서 읽은 값으로 수동 설정
    process.env.GOOGLE_API_KEY = 'AIzaSyDwmu418jQYRcQtLugb8OMs4Vhixxex99w';
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY = 'AIzaSyDwmu418jQYRcQtLugb8OMs4Vhixxex99w';
  }

  if (!process.env.GOOGLE_SEARCH_ENGINE_ID && !process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID) {
    console.log('⚠️ [Google Search Engine] Turbopack 환경변수 수동 설정');
    // .env.local에서 읽은 값으로 수동 설정
    process.env.GOOGLE_SEARCH_ENGINE_ID = '141539304eea04ad6';
    process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID = '141539304eea04ad6';
  }

  // 🔑 Context7 호환 환경변수 처리 (서버/클라이언트 폴백)
  const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID;

  // 🚀 향상된 디버깅 로그 (Context7 스타일)
  console.log('🔑 [Google API 환경변수 디버깅]', {
    'GOOGLE_API_KEY 존재': !!process.env.GOOGLE_API_KEY,
    'NEXT_PUBLIC_GOOGLE_API_KEY 존재': !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    'GOOGLE_SEARCH_ENGINE_ID 존재': !!process.env.GOOGLE_SEARCH_ENGINE_ID,
    'NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID 존재': !!process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID,
    '사용할 API키 존재': !!apiKey,
    '사용할 검색엔진ID 존재': !!searchEngineId,
    'API키 길이': apiKey ? apiKey.length : 0,
    'API키 시작': apiKey ? apiKey.substring(0, 10) + '...' : 'undefined',
    '검색엔진ID': searchEngineId || 'undefined',
    '실행 환경': typeof window === 'undefined' ? 'server' : 'client',
    'Next.js 버전': 'v15.4.3',
    'Turbopack 활성화': true
  });

  if (!apiKey || !searchEngineId) {
    console.error('❌ [환경변수 누락 상세]', {
      GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
      NEXT_PUBLIC_GOOGLE_API_KEY: !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
      GOOGLE_SEARCH_ENGINE_ID: !!process.env.GOOGLE_SEARCH_ENGINE_ID,
      NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID: !!process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID,
      '최종 API키': !!apiKey,
      '최종 검색엔진ID': !!searchEngineId,
      '해결방법': '.env.local 파일 주석 오류 수정 또는 수동 설정 확인'
    });
    throw new Error('Google Search API 설정이 누락되었습니다.');
  }

  // ⚡ 스마트 검색 쿼리 생성 (개선된 부분)
  const searchQueries = await generateSmartSearchQueries(gameTitle, question, englishKeywords);

  // 🚨 생성된 쿼리들 확인
  console.log('🚨🚨🚨 [생성된 검색 쿼리들]', {
    총개수: searchQueries.length,
    쿼리목록: searchQueries
  });

  let allResults: SearchResult[] = [];

  // 🌟 Context7 최적화: 병렬 검색 처리 및 에러 복구
  const searchPromises = searchQueries.slice(0, 3).map(async (searchQuery, index) => {
    try {
      console.log(`🚨🚨🚨 [검색 ${index + 1}/${Math.min(searchQueries.length, 3)} 실행]`, {
        쿼리: searchQuery,
        BGG포함여부: searchQuery.includes('boardgamegeek'),
        타임스탬프: new Date().toISOString()
      });

      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=5`;

      console.log('🔍 [Google Search 요청]', {
        쿼리: searchQuery,
        URL길이: url.length,
        검색엔진ID: searchEngineId,
        인덱스: index + 1
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8초 타임아웃

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BoardGameRuleMaster/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('📡 [Google Search 응답]', {
        상태코드: response.status,
        성공여부: response.ok,
        쿼리: searchQuery.slice(0, 50),
        인덱스: index + 1
      });

      if (!response.ok) {
        console.warn(`⚠️ [검색 실패] ${searchQuery}: ${response.status}`);
        return [];
      }

      const data = await response.json();

      // BGG 검색인지 확인하고 상세 로깅
      if (searchQuery.includes('boardgamegeek.com')) {
        console.log('🎯 [BGG 검색 결과 상세]', {
          쿼리: searchQuery,
          응답상태: response.status,
          전체결과수: data.items?.length || 0,
          검색정보: data.searchInformation,
          API에러: data.error,
          BGG결과들: data.items?.filter((item: any) =>
            item.link.includes('boardgamegeek.com')
          ).map((item: any) => ({
            제목: item.title,
            링크: item.link,
            스니펫: item.snippet?.substring(0, 100) + '...'
          })) || []
        });
      }

      if (!data.items || data.items.length === 0) {
        console.warn(`📭 [검색 결과 없음] ${searchQuery}`);
        return [];
      }

      // 검색 결과 변환 및 관련성 점수 계산
      const queryResults = await Promise.all(
        data.items.map(async (item: any) => ({
          title: item.title,
          url: item.link,
          snippet: item.snippet || '',
          relevanceScore: await calculateRelevanceScore(item, gameTitle, question)
        }))
      );

      const filteredResults = queryResults.filter((result: SearchResult) => {
        // 제외 도메인 필터링
        const domain = new URL(result.url).hostname;
        if (EXCLUDED_DOMAINS.some(excluded => domain.includes(excluded))) {
          return false;
        }

        // 🚨 BGG 품질 필터링 강화
        if (result.url.includes('boardgamegeek.com')) {
          // 제외할 BGG 페이지 타입들
          const excludePatterns = [
            '/video/',     // 비디오 페이지
            '/images/',    // 이미지 갤러리
            '/image/',     // 단일 이미지
            '/boardgameversion/', // 버전 정보
            '/boardgameexpansion/', // 확장팩 정보만
            '/boardgameimplementation/', // 구현체 정보
            '/unboxing',   // 언박싱 관련
            'youtube.com', // 유튜브 링크
            'vimeo.com'    // 비메오 링크
          ];

          const shouldExclude = excludePatterns.some(pattern =>
            result.url.toLowerCase().includes(pattern.toLowerCase()) ||
            result.title.toLowerCase().includes(pattern.toLowerCase())
          );

          if (shouldExclude) {
            console.log('🚫 [BGG 페이지 제외]', {
              제목: result.title.substring(0, 50),
              URL: result.url,
              이유: ' 비디오/이미지/버전정보 페이지'
            });
            return false;
          }

          // 우선시할 BGG 페이지 타입들
          const priorityPatterns = [
            '/thread/',    // 포럼 토론
            '/boardgame/', // 게임 메인 페이지
            'FAQ',         // FAQ 섹션
            'rules',       // 룰 설명
            'rulebook',    // 룰북
            'question',    // 질문 페이지
            'forum'        // 포럼
          ];

          const hasPriority = priorityPatterns.some(pattern =>
            result.url.toLowerCase().includes(pattern.toLowerCase()) ||
            result.title.toLowerCase().includes(pattern.toLowerCase())
          );

          if (hasPriority) {
            result.relevanceScore += 50; // 우선 페이지 가산점
            console.log('⭐ [BGG 우선 페이지]', {
              제목: result.title.substring(0, 50),
              URL타입: priorityPatterns.find(p => result.url.toLowerCase().includes(p.toLowerCase())),
              가산점: 50
            });
          }
        }

        return true;
      });

      return filteredResults;

    } catch (error) {
      console.error(`❌ [검색 오류] ${searchQuery}:`, error);
      return [];
    }
  });

  // 🌟 Context7 최적화: Promise.allSettled로 부분 실패 허용
  const searchResults = await Promise.allSettled(searchPromises);

  searchResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value);
      console.log(`✅ [검색 ${index + 1} 성공]`, {
        결과수: result.value.length,
        쿼리: searchQueries[index]?.slice(0, 30) + '...'
      });
    } else {
      console.warn(`⚠️ [검색 ${index + 1} 실패]`, {
        오류: result.reason,
        쿼리: searchQueries[index]?.slice(0, 30) + '...'
      });
    }
  });

  // 중복 제거 및 관련성 점수 기준 정렬
  const uniqueResults = Array.from(
    new Map(allResults.map(result => [result.url, result])).values()
  ).sort((a, b) => b.relevanceScore - a.relevanceScore);

  console.log('📊 [검색 완료]', {
    총검색수: searchQueries.length,
    전체결과: allResults.length,
    중복제거후: uniqueResults.length,
    상위5개점수: uniqueResults.slice(0, 5).map(r => r.relevanceScore)
  });

  // 🚨 최종 반환 결과 상세 로깅
  const finalResults = uniqueResults.slice(0, 8);
  console.log('🚨🚨🚨 [최종 반환 결과]', {
    반환개수: finalResults.length,
    BGG결과수: finalResults.filter(r => r.url.includes('boardgamegeek.com')).length,
    보드라이프결과수: finalResults.filter(r => r.url.includes('boardlife.co.kr')).length,
    사이트별분포: finalResults.reduce((acc, r) => {
      const domain = new URL(r.url).hostname;
      acc[domain] = (acc[domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    상위3개제목: finalResults.slice(0, 3).map(r => r.title.substring(0, 50) + '...')
  });

  return finalResults;
}

/**
 * 🌟 Enhanced Translator 통합 스마트 검색 쿼리 생성
 */
async function generateSmartSearchQueries(gameTitle: string, question: string, englishKeywords?: string[]): Promise<string[]> {
  console.log('🔥 [Enhanced Translator 기반 검색 쿼리 생성]', {
    게임명: gameTitle,
    질문: question.slice(0, 50) + '...',
    JSON영어키워드: englishKeywords
  });

  // 🚨 PRIORITY 1: Enhanced Translator 사용 (기존 시스템)
  try {
    const analyzer = new QuestionAnalyzer();
    const enhancedQueries = analyzer.generateBGGSearchQueries(question, gameTitle);

    console.log('✅ [Enhanced Translator 검색 쿼리 생성 완료]', {
      생성된쿼리수: enhancedQueries.length,
      쿼리목록: enhancedQueries.slice(0, 3)
    });

    // Enhanced Translator 성공 시 사용
    if (enhancedQueries.length > 0) {
      return enhancedQueries;
    }
  } catch (error) {
    console.warn('⚠️ [Enhanced Translator 실패] JSON 키워드로 폴백:', error);
  }

  // 🚨 PRIORITY 2: JSON 영어 키워드 활용 (새로 추가된 시스템)
  if (englishKeywords && englishKeywords.length > 0) {
    const englishTitle = await getEnglishTitle(gameTitle);
    const queries: string[] = [];

    console.log('🎯 [JSON 기반 BGG 영어 검색 활성화]', {
      영어게임명: englishTitle,
      영어키워드: englishKeywords,
      검색전략: 'BGG 영어 우선'
    });

    if (englishTitle) {
      // 최고 우선순위: 정확한 영어 용어 조합
      if (englishKeywords.length >= 2) {
        queries.push(`site:boardgamegeek.com "${englishTitle}" "${englishKeywords[0]}" "${englishKeywords[1]}"`);
      }

      queries.push(`site:boardgamegeek.com "${englishTitle}" "${englishKeywords[0]}"`);

      // BGG 스레드 전용 검색
      queries.push(`site:boardgamegeek.com/thread "${englishTitle}" "${englishKeywords[0]}"`);

      // 다중 키워드 조합
      if (englishKeywords.length >= 3) {
        queries.push(`"${englishTitle}" "${englishKeywords[0]}" "${englishKeywords[1]}" "${englishKeywords[2]}" site:boardgamegeek.com`);
      }

      // FAQ/Rules 섹션 우선 검색
      queries.push(`site:boardgamegeek.com "${englishTitle}" FAQ "${englishKeywords[0]}"`);
      queries.push(`site:boardgamegeek.com "${englishTitle}" rules "${englishKeywords[0]}"`);
    }

    console.log('✅ [JSON 기반 영어 검색 쿼리 생성 완료]', {
      생성된쿼리수: queries.length,
      쿼리미리보기: queries.slice(0, 3)
    });

    return queries;
  }

  // 🚨 PRIORITY 3: 기존 Fallback 로직
  console.log('⚠️ [모든 우선순위 시스템 실패] 기존 폴백 로직 사용');
  const queries: string[] = [];

  // 질문에서 핵심 키워드 추출
  const questionKeywords = extractQuestionKeywords(question);
  const englishTitle = await getEnglishTitle(gameTitle);

  // 기존 로직...
  if (englishTitle && questionKeywords.length >= 1) {
    queries.push(`site:boardgamegeek.com "${englishTitle}" "${questionKeywords[0]}"`);
  }

  queries.push(`site:boardgamegeek.com "${gameTitle}" ${questionKeywords[0] || ''}`);

  return queries;
}

/**
 * 🌟 간단한 게임명 매핑 (매핑 기능 비활성화)
 */
async function getEnglishTitle(koreanTitle: string): Promise<string | null> {
  // 매핑 기능 비활성화 - 한글명으로만 검색 진행
  return null;
}

/**
 * 🚨 새로 추가: 한글 게임 용어를 영문으로 매핑
 */
function translateGameTermsToEnglish(koreanKeywords: string[], gameTitle: string): string[] {
  const translationMap: { [key: string]: string } = {
    // 아크노바 특화 용어들
    '코뿔소': 'rhinoceros',
    '관철': 'breakthrough',
    '돌파': 'breakthrough',
    '침투': 'penetration',
    '효과': 'effect',
    '능력': 'ability',
    '액션': 'action',
    '서식지': 'habitat',
    '동물원': 'zoo',
    '보존': 'conservation',
    '협회': 'association',
    '스폰서': 'sponsor',
    '후원': 'sponsor',
    '대학': 'university',
    '연구': 'research',
    '발견': 'discovery',
    '진화': 'evolution',

    // 일반적인 보드게임 용어들
    '카드': 'card',
    '토큰': 'token',
    '마커': 'marker',
    '타일': 'tile',
    '보드': 'board',
    '주사위': 'dice',
    '자원': 'resource',
    '점수': 'score',
    '무작위': 'random',
    '선택': 'choose'
  };

  const englishKeywords: string[] = [];

  koreanKeywords.forEach(keyword => {
    if (translationMap[keyword]) {
      englishKeywords.push(translationMap[keyword]);
    }
  });

  console.log('🌍 [용어 번역]', {
    게임: gameTitle,
    한글키워드: koreanKeywords,
    번역된키워드: englishKeywords
  });

  return englishKeywords;
}

/**
 * 🌟 365개 게임 범용 키워드 추출 시스템 (게임 고유 요소 우선순위 개선)
 */
function extractQuestionKeywords(question: string): string[] {
  // 1️⃣ 질문 전처리 및 단어 분리
  const cleanQuestion = question
    .toLowerCase()
    .replace(/[?!.,;:]/g, ' ')  // 특수문자를 공백으로
    .replace(/\s+/g, ' ')       // 연속 공백 제거
    .trim();

  const words = cleanQuestion.split(/\s+/);

  // 2️⃣ 범용적 불용어 (모든 게임에서 의미없는 단어들)
  const stopWords = new Set([
    // 한글 불용어
    '어떻게', '무엇을', '무엇', '언제', '왜', '어디서', '어디', '누가', '누구',
    '그', '이', '저', '그런', '이런', '저런', '같은', '다른', '또', '그리고',
    '하지만', '그러나', '만약', '때문에', '에서', '에게', '에', '를', '을',
    '의', '가', '이', '은', '는', '도', '만', '부터', '까지', '와', '과',
    '이다', '있다', '없다', '하다', '되다', '아니다', '이야', '아야',
    // 일반적인 질문 단어들 추가
    '뽑아', '아니면', '진행하면', '때', '시', '할때', '하면',

    // 영문 불용어  
    'how', 'what', 'when', 'why', 'where', 'who', 'which', 'that', 'this',
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'can', 'could',
    'would', 'should', 'will', 'shall', 'may', 'might', 'do', 'does', 'did',
    'have', 'has', 'had', 'be', 'is', 'am', 'are', 'was', 'were', 'been'
  ]);

  // 3️⃣ 동적 키워드 추출 (게임에 관계없이 의미있는 단어들)
  const meaningfulWords = words.filter(word => {
    // 불용어 제거
    if (stopWords.has(word)) return false;

    // 너무 짧은 단어 제거 (단, 한글은 2글자부터 허용)
    if (/[가-힣]/.test(word) && word.length < 2) return false;
    if (!/[가-힣]/.test(word) && word.length < 3) return false;

    // 숫자만 있는 단어 제거
    if (/^\d+$/.test(word)) return false;

    return true;
  });

  // 4️⃣ 🚨 개선된 패턴 분류 (게임 고유 요소 우선순위 향상)
  const patternCategories = {
    // ⭐ 최고 우선순위: 게임 고유 명사/메커니즘
    gameSpecific: new Set([
      // 아크노바 특화 용어들
      '코뿔소', '관철', '돌파', '침투', '쇄도', '급속', '진화', '서식지', '동물원',
      '보존', '협회', '스폰서', '후원', '대학', '연구', '발견', '유니콘', '베어',
      'rhinoceros', 'breakthrough', 'sponsors', 'conservation', 'association',
      // 다른 게임들의 고유 용어도 여기 추가 가능
      '글룸헤이븐', '테라포밍', '윙스팬', '조류', '엔진', '큐브', '미플'
    ]),

    // ⭐ 높은 우선순위: 구체적 게임 요소
    specificMechanism: new Set([
      '효과', '능력', '액션', '스킬', '특수능력', '고유능력',
      'effect', 'ability', 'action', 'skill', 'special'
    ]),

    // 🔸 중간 우선순위: 일반적 게임 메커니즘 (가중치 감소)
    generalMechanism: new Set([
      '카드', '토큰', '마커', '타일', '보드',
      'card', 'token', 'marker', 'tile', 'board'
    ]),

    // 🔹 낮은 우선순위: 일반적 행동/상호작용
    commonInteraction: new Set([
      '가져가기', '획득', '사용', '교환', '거래', '무작위', '선택',
      'take', 'get', 'use', 'exchange', 'trade', 'random', 'choose'
    ])
  };

  // 5️⃣ 개선된 키워드별 중요도 점수 계산
  const keywordScores = meaningfulWords.map(word => {
    let score = 1; // 기본 점수

    // 🚨 게임 고유 요소 최고 우선순위
    if (patternCategories.gameSpecific.has(word)) {
      score += 8; // 최고 보너스
    }
    // 구체적 메커니즘 높은 우선순위  
    else if (patternCategories.specificMechanism.has(word)) {
      score += 5; // 높은 보너스
    }
    // 일반적 메커니즘 중간 우선순위
    else if (patternCategories.generalMechanism.has(word)) {
      score += 2; // 중간 보너스 (기존 3에서 감소)
    }
    // 일반적 상호작용 낮은 우선순위
    else if (patternCategories.commonInteraction.has(word)) {
      score += 1; // 낮은 보너스 (기존 3에서 대폭 감소)
    }

    // 단어 길이별 보너스 (더 긴 단어가 더 구체적)
    if (word.length >= 4) score += 1;
    if (word.length >= 6) score += 1;

    // 한글 단어 보너스 (게임 고유 용어일 가능성)
    if (/^[가-힣]+$/.test(word) && word.length >= 3) score += 2;

    return { word, score };
  });

  // 6️⃣ 점수순 정렬 및 상위 키워드 선택
  const sortedKeywords = keywordScores
    .sort((a, b) => b.score - a.score)
    .map(item => item.word);

  // 중복 제거
  const uniqueKeywords = [...new Set(sortedKeywords)];

  console.log('🔍 [개선된 키워드 추출]', {
    원본질문: question,
    전처리후: cleanQuestion,
    의미있는단어: meaningfulWords,
    점수계산결과: keywordScores.slice(0, 8),
    최종키워드: uniqueKeywords.slice(0, 5)
  });

  return uniqueKeywords.slice(0, 5); // 상위 5개 반환
}

/**
 * 게임명에서 키워드 추출 (다양한 표기법 처리)
 */
function extractGameKeywords(gameTitle: string): string[] {
  const keywords = [gameTitle];

  // 한글-영어 대응 (일반적인 게임들)
  const gameAliases: Record<string, string[]> = {
    '아크노바': ['ark nova', 'arknova'],
    '글룸헤이븐': ['gloomhaven'],
    '윙스팬': ['wingspan'],
    '테라포밍 마스': ['terraforming mars'],
    '스피릿 아일랜드': ['spirit island']
  };

  const lowerTitle = gameTitle.toLowerCase();
  Object.entries(gameAliases).forEach(([korean, english]) => {
    if (lowerTitle.includes(korean.toLowerCase())) {
      keywords.push(...english);
    }
    english.forEach(eng => {
      if (lowerTitle.includes(eng.toLowerCase())) {
        keywords.push(korean);
      }
    });
  });

  return keywords;
}

/**
 * 검색 결과의 관련성 점수 계산
 */
async function calculateRelevanceScore(item: any, gameTitle: string, question: string): Promise<number> {
  let score = 50; // 기본 점수

  const domain = new URL(item.link).hostname;
  const title = item.title.toLowerCase();
  const snippet = item.snippet?.toLowerCase() || '';
  const fullText = `${title} ${snippet}`;

  // 신뢰할 수 있는 도메인 보너스 (강화)
  const trustedIndex = TRUSTED_DOMAINS.findIndex(trusted => domain.includes(trusted));
  if (trustedIndex !== -1) {
    score += (TRUSTED_DOMAINS.length - trustedIndex) * 15; // 10 → 15로 증가
  }

  // 게임 제목 정확 매치 보너스 (강화)
  const englishTitle = await getEnglishTitle(gameTitle);
  const gameKeywords = [gameTitle.toLowerCase(), englishTitle?.toLowerCase()].filter(Boolean);
  gameKeywords.forEach(gameKeyword => {
    if (gameKeyword && fullText.includes(gameKeyword)) {
      score += 30; // 20 → 30으로 증가
    }
  });

  // 🌟 범용 질문 키워드 매치 (365개 게임 대응)
  const extractedKeywords = extractQuestionKeywords(question);
  let keywordMatchCount = 0;

  extractedKeywords.forEach((keyword, index) => {
    const lowerKeyword = keyword.toLowerCase();
    if (fullText.includes(lowerKeyword)) {
      // 키워드 중요도에 따라 차등 점수 (첫 번째가 가장 중요)
      const importanceBonus = (extractedKeywords.length - index) * 5;
      score += 15 + importanceBonus; // 기본 15점 + 중요도 보너스
      keywordMatchCount++;
    }
  });

  // 다중 키워드 매치 보너스
  if (keywordMatchCount >= 2) {
    score += keywordMatchCount * 10; // 키워드 2개 이상 매치 시 추가 보너스
  }

  // 🎯 BGG 특화 보너스 (URL 패턴 기반)
  if (domain.includes('boardgamegeek.com')) {
    if (item.link.includes('/thread/')) score += 25; // 포럼 토론
    if (item.link.includes('/boardgame/') && !item.link.includes('/version/')) score += 20; // 게임 메인
    if (fullText.includes('faq') || fullText.includes('질문')) score += 20; // FAQ
    if (fullText.includes('rules') || fullText.includes('rulebook')) score += 25; // 규칙서
  }

  // 룰 관련 키워드 보너스 (확장)
  const ruleKeywords = [
    // 한글
    '규칙', '룰북', '룰', '설명서', '매뉴얼', '가이드', '방법', '진행', '효과', '능력',
    // 영문  
    'rule', 'manual', 'guide', 'how', 'effect', 'ability', 'FAQ', 'question'
  ];

  ruleKeywords.forEach(keyword => {
    if (fullText.includes(keyword.toLowerCase())) {
      score += 8; // 10 → 8로 조정 (키워드 매치가 더 중요)
    }
  });

  // 🚫 품질 저하 요소 페널티
  const penaltyKeywords = [
    'video', '비디오', 'unboxing', '언박싱', 'review', '리뷰만',
    'image', '이미지', 'gallery', '갤러리', 'version', '버전정보'
  ];

  penaltyKeywords.forEach(keyword => {
    if (fullText.includes(keyword.toLowerCase())) {
      score -= 20; // 품질 저하 페널티
    }
  });

  console.log('📊 [관련성 점수 계산]', {
    URL: item.link.substring(0, 50),
    키워드매치수: keywordMatchCount,
    최종점수: score,
    매치키워드: extractedKeywords.filter(k => fullText.includes(k.toLowerCase()))
  });

  return Math.max(score, 10); // 최소 10점 보장
}

/**
 * 검색 결과에 웹페이지 콘텐츠 추가 (⚡ 정밀화 개선)
 */
async function enrichSearchResults(searchResults: SearchResult[]): Promise<SearchResult[]> {
  const enrichmentPromises = searchResults.slice(0, 5).map(async (result) => {
    try {
      // 3초 타임아웃으로 웹페이지 콘텐츠 가져오기
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(result.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BoardGameRuleMaster/1.0)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return result; // 원본 결과 반환
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // ⚡ 사이트별 최적화된 콘텐츠 추출
      const extractedContent = extractOptimizedContent($, result.url);

      console.log('📄 [스크래핑 결과]', {
        URL: result.url,
        도메인: new URL(result.url).hostname,
        추출방식: extractedContent.method,
        원본길이: extractedContent.rawLength,
        정제후길이: extractedContent.content.length,
        성공여부: extractedContent.content.length > 50
      });

      return {
        ...result,
        snippet: extractedContent.content || result.snippet
      };

    } catch (error) {
      console.warn('⚠️ [스크래핑 실패]', { URL: result.url, 오류: error });
      // 스크래핑 실패 시 원본 snippet 유지
      return result;
    }
  });

  return Promise.all(enrichmentPromises);
}

/**
 * ⚡ 사이트별 최적화된 콘텐츠 추출
 */
function extractOptimizedContent($: any, url: string): {
  content: string;
  method: string;
  rawLength: number;
} {
  const domain = new URL(url).hostname;

  // 불필요한 요소 공통 제거
  $('script, style, nav, footer, header, .advertisement, .ads, .sidebar').remove();

  let content = '';
  let method = 'generic';
  let rawContent = '';

  // 사이트별 최적화 전략
  if (domain.includes('boardgamegeek.com')) {
    // BGG 포럼/위키 최적화
    const forumContent = $('.forum-post-body, .wiki-content, .rules-content').first();
    if (forumContent.length) {
      content = forumContent.text();
      method = 'bgg-forum';
    } else {
      content = $('article, .content, .post').first().text() || $('body').text();
      method = 'bgg-fallback';
    }
  }
  else if (domain.includes('reddit.com')) {
    // Reddit 댓글/포스트 최적화
    const redditContent = $('.comment-body, .post-content, [data-testid="comment"]').first();
    if (redditContent.length) {
      content = redditContent.text();
      method = 'reddit-comment';
    } else {
      content = $('article, .content').first().text() || $('body').text();
      method = 'reddit-fallback';
    }
  }
  else if (domain.includes('boardlife.co.kr') || domain.includes('boardm.co.kr')) {
    // 한국 보드게임 커뮤니티 최적화
    const koreanContent = $('.content, .post-content, .article-content').first();
    if (koreanContent.length) {
      content = koreanContent.text();
      method = 'korean-community';
    } else {
      content = $('main, article, .content').first().text() || $('body').text();
      method = 'korean-fallback';
    }
  }
  else {
    // 일반 사이트 처리
    const mainContent = $('main, article, .content, .post-content, #content').first();
    content = mainContent.length ? mainContent.text() : $('body').text();
    method = 'generic';
  }

  rawContent = content;

  // 콘텐츠 정제 (확장: 500자 → 1500자)
  const cleanContent = content
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 1500); // 더 많은 컨텍스트 확보

  return {
    content: cleanContent,
    method,
    rawLength: rawContent.length
  };
}

/**
 * 검색 결과 요약 생성 (⚡ 관련성 중심 개선)
 */
function generateSearchSummary(searchResults: SearchResult[], question: string): string {
  if (searchResults.length === 0) {
    return '관련된 검색 결과를 찾을 수 없습니다. 게임 룰북이나 공식 FAQ를 직접 확인해보세요.';
  }

  // 상위 5개 결과로 확장 (기존 3개 → 5개)
  const topResults = searchResults.slice(0, 5);

  console.log('📝 [요약 생성]', {
    총결과수: searchResults.length,
    요약대상: topResults.length,
    질문키워드: question.split(' ').slice(0, 3),
    평균관련도: topResults.reduce((sum, r) => sum + r.relevanceScore, 0) / topResults.length
  });

  // ⚡ 질문 관련성 높은 문장만 추출
  const relevantExtracts = extractHighlyRelevantContent(topResults, question);

  // 소스별 요약 생성 (간소화)
  const sourceSummary = topResults.map((result, index) => {
    const domain = new URL(result.url).hostname;
    const sourceType = getSourceType(domain);
    const snippet = result.snippet.slice(0, 200);

    return `**${index + 1}. ${sourceType}**: ${snippet}...`;
  });

  return `
🔍 **질문과 관련된 검색 결과 분석:**

${relevantExtracts.length > 0 ? `**🎯 핵심 정보:**
${relevantExtracts.join('\n')}

` : ''}**📚 출처별 정보:**
${sourceSummary.join('\n\n')}

**📊 신뢰도**: ${topResults.length}개 소스에서 검증된 정보 (평균 관련도: ${Math.round(topResults.reduce((sum, r) => sum + r.relevanceScore, 0) / topResults.length)}%)
  `.trim();
}

/**
 * ⚡ 질문과 높은 관련성을 가진 콘텐츠만 추출
 */
function extractHighlyRelevantContent(results: SearchResult[], question: string): string[] {
  const questionKeywords = question.toLowerCase()
    .split(' ')
    .filter(word => word.length > 2)
    .slice(0, 5); // 주요 키워드 5개

  console.log('🎯 [관련성 추출]', {
    원본질문: question,
    추출키워드: questionKeywords
  });

  const relevantSentences: string[] = [];

  results.forEach((result, resultIndex) => {
    // 문장을 더 정교하게 분리
    const sentences = result.snippet
      .split(/[.!?。]/)
      .filter(s => s.trim().length > 20 && s.trim().length < 300);

    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();

      // 키워드 매칭 점수 계산
      const keywordMatches = questionKeywords.filter(keyword =>
        lowerSentence.includes(keyword)
      );

      // 보드게임 관련 중요 단어 보너스
      const gameTerms = ['rule', 'card', 'action', 'turn', 'phase', '규칙', '카드', '액션', '턴'];
      const gameTermMatches = gameTerms.filter(term =>
        lowerSentence.includes(term)
      );

      const totalScore = keywordMatches.length * 2 + gameTermMatches.length;

      // 높은 관련성 문장만 선택 (점수 3 이상, 최대 6개)
      if (totalScore >= 3 && relevantSentences.length < 6) {
        const domain = new URL(result.url).hostname;
        const sourceLabel = getSourceLabel(domain);

        relevantSentences.push(
          `• ${sentence.trim()} (${sourceLabel})`
        );
      }
    });
  });

  return relevantSentences.length > 0 ? relevantSentences : [
    '• 검색된 내용에서 질문과 직접 관련된 구체적인 정보를 추출하고 있습니다.'
  ];
}

/**
 * 도메인별 소스 타입 반환
 */
function getSourceType(domain: string): string {
  if (domain.includes('boardgamegeek.com')) return 'BGG 커뮤니티';
  if (domain.includes('reddit.com')) return 'Reddit 토론';
  if (domain.includes('boardlife.co.kr')) return '보드라이프';
  if (domain.includes('boardm.co.kr')) return '보드엠';
  return '보드게임 정보';
}

/**
 * 도메인별 소스 라벨 반환
 */
function getSourceLabel(domain: string): string {
  if (domain.includes('boardgamegeek.com')) return 'BGG';
  if (domain.includes('reddit.com')) return 'Reddit';
  if (domain.includes('boardlife.co.kr')) return '보드라이프';
  if (domain.includes('boardm.co.kr')) return '보드엠';
  return '웹';
} 
/**
 * 웹 리서치 API 엔드포인트 - Google Custom Search + 웹 스크래핑
 * SMART-RESEARCH-IMPLEMENTATION.md 기반 구현
 */

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { QuestionAnalyzer } from '@/lib/question-analyzer';
import { ResearchLimiter } from '@/lib/research-limiter';
import { researchCache } from '@/lib/research-cache';
import type { SearchResult } from '@/lib/research-cache';

// 신뢰할 수 있는 소스 도메인 우선순위
const TRUSTED_DOMAINS = [
  'boardgamegeek.com',
  'rulebook.io',
  'tabletopia.com',
  'wikimediafoundation.org',
  'reddit.com/r/boardgames',
  'bg3.co.kr',
  'divedice.com'
] as const;

// 검색 결과 필터링을 위한 제외 도메인
const EXCLUDED_DOMAINS = [
  'pinterest.com',
  'youtube.com',
  'instagram.com',
  'facebook.com',
  'twitter.com'
] as const;

interface ResearchRequest {
  gameTitle: string;
  question: string;
  priority?: 'high' | 'medium' | 'low';
  bypassCache?: boolean;
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
  try {
    // 1. 요청 본문 파싱
    const body: ResearchRequest = await request.json();
    const { gameTitle, question, priority = 'medium', bypassCache = false } = body;

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
    const searchResults = await performWebSearch(gameTitle, question);

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
 */
async function performWebSearch(gameTitle: string, question: string): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    throw new Error('Google Search API 설정이 누락되었습니다.');
  }

  // 검색 쿼리 최적화
  const searchQuery = `${gameTitle} ${question} 보드게임 규칙`;
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=8`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Google Search API 호출 실패: ${response.status}`);
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    return [];
  }

  // 검색 결과 변환 및 필터링
  const searchResults: SearchResult[] = data.items
    .filter((item: any) => {
      const domain = new URL(item.link).hostname;
      return !EXCLUDED_DOMAINS.some(excluded => domain.includes(excluded));
    })
    .map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet || '',
      relevanceScore: calculateRelevanceScore(item, gameTitle, question)
    }));

  // 신뢰도 기준 정렬
  return searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * 검색 결과의 관련성 점수 계산
 */
function calculateRelevanceScore(item: any, gameTitle: string, question: string): number {
  let score = 50; // 기본 점수

  const domain = new URL(item.link).hostname;
  const title = item.title.toLowerCase();
  const snippet = item.snippet?.toLowerCase() || '';

  // 신뢰할 수 있는 도메인 보너스
  const trustedIndex = TRUSTED_DOMAINS.findIndex(trusted => domain.includes(trusted));
  if (trustedIndex !== -1) {
    score += (TRUSTED_DOMAINS.length - trustedIndex) * 10;
  }

  // 게임 제목 포함 보너스
  if (title.includes(gameTitle.toLowerCase()) || snippet.includes(gameTitle.toLowerCase())) {
    score += 20;
  }

  // 질문 키워드 포함 보너스
  const questionWords = question.toLowerCase().split(' ').filter(word => word.length > 2);
  questionWords.forEach(word => {
    if (title.includes(word) || snippet.includes(word)) {
      score += 5;
    }
  });

  // 룰북 관련 키워드 보너스
  const ruleKeywords = ['규칙', '룰북', 'rule', 'manual', 'guide'];
  ruleKeywords.forEach(keyword => {
    if (title.includes(keyword) || snippet.includes(keyword)) {
      score += 10;
    }
  });

  return score;
}

/**
 * 검색 결과에 웹페이지 콘텐츠 추가
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

      // 불필요한 요소 제거
      $('script, style, nav, footer, header, .advertisement').remove();

      // 본문 콘텐츠 추출
      const mainContent = $('main, article, .content, .post-content, #content').first().text();
      const bodyContent = mainContent || $('body').text();

      // 콘텐츠 정제 및 길이 제한
      const cleanContent = bodyContent
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);

      return {
        ...result,
        snippet: cleanContent || result.snippet
      };

    } catch (error) {
      // 스크래핑 실패 시 원본 snippet 유지
      return result;
    }
  });

  return Promise.all(enrichmentPromises);
}

/**
 * 검색 결과 요약 생성
 */
function generateSearchSummary(searchResults: SearchResult[], question: string): string {
  if (searchResults.length === 0) {
    return '검색 결과를 찾을 수 없습니다.';
  }

  const topResults = searchResults.slice(0, 3);
  const summaryParts = topResults.map((result, index) => 
    `${index + 1}. **${result.title}**: ${result.snippet.slice(0, 150)}...`
  );

  return `
다음 검색 결과를 바탕으로 답변드립니다:

${summaryParts.join('\n\n')}

**참고 출처**: ${topResults.length}개의 웹사이트에서 수집된 정보입니다.
  `.trim();
} 
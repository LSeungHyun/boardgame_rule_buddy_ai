/**
 * Firecrawl MCP 기반 강화 웹 검색 Repository
 * Clean Architecture: MCP Tools → Adapters → Use Cases
 */

import { BGGGameEntity } from '@/domain/entities/bgg-game-entity';
import { IEnhancedWebSearchRepository, EnhancedSearchResult } from '@/usecases/enhanced-rule-generation';

// 실제 MCP 함수들 import
import { mcp_firecrawl_search, mcp_firecrawl_scrape } from '@/lib/mcp-firecrawl-client';
import { mcp_context7_get_library_docs, mcp_context7_resolve_library_id } from '@/lib/context7-client';

interface FirecrawlSearchOptions {
  query: string;
  limit?: number;
  lang?: string;
  country?: string;
  scrapeOptions?: {
    formats: string[];
    onlyMainContent: boolean;
  };
}

interface FirecrawlScrapeOptions {
  url: string;
  formats: string[];
  onlyMainContent?: boolean;
  maxAge?: number;
}

/**
 * Firecrawl MCP 기반 강화 웹 검색 어댑터
 */
export class EnhancedWebSearchAdapter implements IEnhancedWebSearchRepository {
  private readonly BGG_PRIORITY_WEIGHT = 2.0;
  private readonly COMMUNITY_WEIGHT = 1.5;
  private readonly OFFICIAL_WEIGHT = 3.0;

  async searchWithBGGPriority(
    gameTitle: string, 
    question: string, 
    bggData?: BGGGameEntity
  ): Promise<EnhancedSearchResult[]> {
    console.log('🔍 [Enhanced Web Search] BGG 우선순위 검색 시작:', {
      게임: gameTitle,
      질문: question.slice(0, 30) + '...',
      BGG데이터있음: !!bggData
    });

    try {
      // 1. BGG 컨텍스트 기반 검색 쿼리 생성
      const searchQueries = this.generateBGGPriorityQueries(gameTitle, question, bggData);
      
      // 2. 병렬 검색 실행
      const searchResults = await this.executeParallelSearches(searchQueries);
      
      // 3. BGG 데이터 기반 결과 재정렬 및 스코어링
      const enhancedResults = await this.enhanceSearchResults(searchResults, bggData);
      
      // 4. Context7 MCP로 추가 보강
      const context7Results = await this.enhanceWithContext7(gameTitle, question);
      
      // 5. 최종 결과 통합 및 정렬
      const finalResults = this.mergeAndRankResults([...enhancedResults, ...context7Results]);

      console.log('✅ [Enhanced Web Search] 검색 완료:', {
        총결과수: finalResults.length,
        BGG결과수: finalResults.filter(r => r.sourceType.startsWith('bgg')).length,
        평균신뢰도: finalResults.reduce((sum, r) => sum + r.credibility, 0) / finalResults.length
      });

      return finalResults.slice(0, 10); // 상위 10개 결과만 반환
    } catch (error) {
      console.error('❌ [Enhanced Web Search] 검색 실패:', error);
      return [];
    }
  }

  /**
   * BGG 데이터 기반 우선순위 검색 쿼리 생성
   */
  private generateBGGPriorityQueries(
    gameTitle: string, 
    question: string, 
    bggData?: BGGGameEntity
  ): string[] {
    const queries: string[] = [];
    const questionKeywords = this.extractQuestionKeywords(question);

    // 1. 최고 우선순위: BGG 공식 정보
    queries.push(`site:boardgamegeek.com "${gameTitle}" "${questionKeywords}" (FAQ OR official OR errata)`);
    
    // 2. BGG 포럼 토론
    queries.push(`site:boardgamegeek.com/thread "${gameTitle}" "${questionKeywords}"`);
    
    // 3. BGG 메카닉 기반 검색 (BGG 데이터가 있는 경우)
    if (bggData?.mechanics.length) {
      const mechanic = bggData.mechanics[0];
      queries.push(`site:boardgamegeek.com "${gameTitle}" "${mechanic}" "${questionKeywords}"`);
    }

    // 4. 한국 보드게임 커뮤니티
    queries.push(`site:boardlife.co.kr OR site:boardm.co.kr "${gameTitle}" "${questionKeywords}"`);
    
    // 5. Reddit 보드게임 커뮤니티
    queries.push(`site:reddit.com/r/boardgames "${gameTitle}" "${questionKeywords}"`);
    
    // 6. 일반 웹 검색 (복잡도 기반 키워드 추가)
    if (bggData) {
      const complexityTerm = bggData.complexity.isLight ? 'beginner guide' : 
                           bggData.complexity.isHeavy ? 'advanced strategy' : 'rules';
      queries.push(`"${gameTitle}" "${questionKeywords}" ${complexityTerm}`);
    } else {
      queries.push(`"${gameTitle}" "${questionKeywords}" rules`);
    }

    console.log('🎯 [Enhanced Web Search] 생성된 검색 쿼리:', queries.length, '개');
    return queries;
  }

  /**
   * Firecrawl MCP를 사용한 병렬 검색 실행
   */
  private async executeParallelSearches(queries: string[]): Promise<any[]> {
    console.log('🔄 [Enhanced Web Search] Firecrawl MCP 병렬 검색 시작');

    const searchPromises = queries.map(async (query, index) => {
      try {
        const searchOptions: FirecrawlSearchOptions = {
          query,
          limit: 5,
          lang: 'ko',
          country: 'kr',
          scrapeOptions: {
            formats: ['markdown'],
            onlyMainContent: true
          }
        };

        console.log(`🔍 [Search ${index + 1}/${queries.length}] 실행:`, query.slice(0, 50) + '...');

        const results = await mcp_firecrawl_search(searchOptions);
        
        console.log(`✅ [Search ${index + 1}] 완료:`, results?.data?.length || 0, '개 결과');
        
        return {
          query,
          results: results?.data || [],
          searchIndex: index
        };
      } catch (error) {
        console.warn(`⚠️ [Search ${index + 1}] 실패:`, error);
        return { query, results: [], searchIndex: index };
      }
    });

    const searchResults = await Promise.all(searchPromises);
    const totalResults = searchResults.reduce((sum, r) => sum + r.results.length, 0);
    
    console.log('✅ [Enhanced Web Search] 병렬 검색 완료:', totalResults, '개 총 결과');
    return searchResults;
  }

  /**
   * BGG 데이터 기반 검색 결과 향상
   */
  private async enhanceSearchResults(
    searchResults: any[], 
    bggData?: BGGGameEntity
  ): Promise<EnhancedSearchResult[]> {
    console.log('⚡ [Enhanced Web Search] 결과 향상 처리 시작');

    const enhancedResults: EnhancedSearchResult[] = [];

    for (const searchGroup of searchResults) {
      for (const result of searchGroup.results) {
        try {
          // Firecrawl로 페이지 내용 스크래핑
          const scrapedContent = await this.scrapePageContent(result.url);
          
          // BGG 데이터 기반 관련성 및 신뢰도 계산
          const relevanceScore = this.calculateBGGAwareRelevance(result, bggData, searchGroup.query);
          const credibility = this.calculateSourceCredibility(result.url, result.title, scrapedContent);
          const sourceType = this.determineSourceType(result.url);

          enhancedResults.push({
            title: result.title || 'Untitled',
            content: scrapedContent || result.description || '',
            url: result.url,
            relevanceScore,
            sourceType,
            credibility
          });

        } catch (error) {
          console.warn('⚠️ [Enhanced Web Search] 결과 처리 실패:', result.url, error);
          
          // 스크래핑 실패 시에도 기본 정보로 추가
          enhancedResults.push({
            title: result.title || 'Untitled',
            content: result.description || result.snippet || '',
            url: result.url,
            relevanceScore: 0.5,
            sourceType: this.determineSourceType(result.url),
            credibility: 0.3
          });
        }
      }
    }

    console.log('✅ [Enhanced Web Search] 결과 향상 완료:', enhancedResults.length, '개');
    return enhancedResults;
  }

  /**
   * Firecrawl MCP로 페이지 내용 스크래핑
   */
  private async scrapePageContent(url: string): Promise<string> {
    try {
      const scrapeOptions: FirecrawlScrapeOptions = {
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        maxAge: 3600000 // 1시간 캐시
      };

      const scraped = await mcp_firecrawl_scrape(scrapeOptions);
      return scraped?.data?.markdown || scraped?.data?.content || '';
    } catch (error) {
      console.warn('⚠️ [Enhanced Web Search] 스크래핑 실패:', url, error);
      return '';
    }
  }

  /**
   * Context7 MCP로 추가 보강
   */
  private async enhanceWithContext7(gameTitle: string, question: string): Promise<EnhancedSearchResult[]> {
    try {
      console.log('🧠 [Enhanced Web Search] Context7 MCP 보강 시작');

      // 1. BGG 관련 라이브러리 ID 찾기
      const librarySearchResult = await mcp_context7_resolve_library_id({
        libraryName: 'BoardGameGeek board game rules documentation'
      });

      if (!librarySearchResult?.libraries?.length) {
        console.warn('⚠️ [Enhanced Web Search] Context7에서 BGG 라이브러리 찾지 못함');
        return [];
      }

      // 2. 관련 문서 검색
      const bggLibrary = librarySearchResult.libraries[0];
      const docs = await mcp_context7_get_library_docs({
        context7CompatibleLibraryID: bggLibrary.id,
        topic: `${gameTitle} ${question}`,
        tokens: 3000
      });

      if (!docs) {
        console.warn('⚠️ [Enhanced Web Search] Context7에서 문서 찾지 못함');
        return [];
      }

      // 3. Context7 결과를 EnhancedSearchResult 형식으로 변환
      const context7Result: EnhancedSearchResult = {
        title: `Context7: ${gameTitle} Documentation`,
        content: docs,
        url: `context7://library/${bggLibrary.id}`,
        relevanceScore: 0.85, // Context7은 높은 관련성
        sourceType: 'bgg_official',
        credibility: 0.9 // Context7 문서는 높은 신뢰도
      };

      console.log('✅ [Enhanced Web Search] Context7 보강 완료:', docs.length, '자 문서');
      return [context7Result];
    } catch (error) {
      console.error('❌ [Enhanced Web Search] Context7 보강 실패:', error);
      return [];
    }
  }

  /**
   * BGG 데이터 기반 관련성 점수 계산
   */
  private calculateBGGAwareRelevance(
    result: any, 
    bggData?: BGGGameEntity, 
    originalQuery?: string
  ): number {
    let score = 0.5; // 기본 점수

    const url = result.url.toLowerCase();
    const title = (result.title || '').toLowerCase();
    const content = (result.content || result.description || '').toLowerCase();

    // URL 기반 가중치
    if (url.includes('boardgamegeek.com')) {
      score += 0.3;
      if (url.includes('/thread/')) score += 0.1; // 포럼 토론
      if (url.includes('/boardgame/')) score += 0.15; // 게임 페이지
    } else if (url.includes('boardlife.co.kr') || url.includes('boardm.co.kr')) {
      score += 0.2; // 한국 커뮤니티
    } else if (url.includes('reddit.com')) {
      score += 0.15; // Reddit
    }

    // BGG 메카닉 매칭 보너스
    if (bggData?.mechanics.length) {
      for (const mechanic of bggData.mechanics) {
        if (content.includes(mechanic.toLowerCase())) {
          score += 0.1;
          break;
        }
      }
    }

    // 키워드 매칭
    if (originalQuery) {
      const queryWords = originalQuery.toLowerCase().split(/\s+/);
      const matchedWords = queryWords.filter(word => 
        word.length > 2 && (title.includes(word) || content.includes(word))
      );
      score += (matchedWords.length / queryWords.length) * 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * 소스 신뢰도 계산
   */
  private calculateSourceCredibility(url: string, title: string, content: string): number {
    let credibility = 0.5;

    const urlLower = url.toLowerCase();
    const titleLower = (title || '').toLowerCase();
    const contentLower = (content || '').toLowerCase();

    // 공식/신뢰할 수 있는 소스
    if (urlLower.includes('boardgamegeek.com')) {
      credibility += 0.3;
      if (titleLower.includes('official') || titleLower.includes('faq')) {
        credibility += 0.2;
      }
    }

    // 커뮤니티 평판
    if (urlLower.includes('boardlife.co.kr')) credibility += 0.2;
    if (urlLower.includes('reddit.com')) credibility += 0.1;

    // 내용 품질 지표
    if (content.length > 500) credibility += 0.1; // 상세한 내용
    if (contentLower.includes('rule') && contentLower.includes('explanation')) {
      credibility += 0.1; // 룰 설명 내용
    }

    // 품질 저하 요소
    if (titleLower.includes('unboxing') || titleLower.includes('review only')) {
      credibility -= 0.2;
    }

    return Math.max(0.1, Math.min(credibility, 1.0));
  }

  /**
   * 소스 타입 결정
   */
  private determineSourceType(url: string): EnhancedSearchResult['sourceType'] {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('boardgamegeek.com')) {
      if (urlLower.includes('/thread/')) return 'bgg_forum';
      return 'bgg_official';
    }
    
    if (urlLower.includes('boardlife.co.kr') || urlLower.includes('boardm.co.kr')) {
      return 'community';
    }

    return 'web';
  }

  /**
   * 최종 결과 통합 및 순위 매기기
   */
  private mergeAndRankResults(results: EnhancedSearchResult[]): EnhancedSearchResult[] {
    // 중복 URL 제거
    const uniqueResults = Array.from(
      new Map(results.map(result => [result.url, result])).values()
    );

    // 종합 점수 계산 및 정렬
    return uniqueResults
      .map(result => ({
        ...result,
        finalScore: this.calculateFinalScore(result)
      }))
      .sort((a, b) => b.finalScore - a.finalScore)
      .map(({ finalScore, ...result }) => result); // finalScore 제거
  }

  /**
   * 최종 점수 계산 (관련성 + 신뢰도 + 소스 타입 가중치)
   */
  private calculateFinalScore(result: EnhancedSearchResult): number {
    let score = result.relevanceScore * 0.6 + result.credibility * 0.4;

    // 소스 타입별 가중치
    switch (result.sourceType) {
      case 'bgg_official':
        score *= this.OFFICIAL_WEIGHT;
        break;
      case 'bgg_forum':
        score *= this.BGG_PRIORITY_WEIGHT;
        break;
      case 'community':
        score *= this.COMMUNITY_WEIGHT;
        break;
      default:
        // web은 기본 가중치 유지
    }

    return score;
  }

  /**
   * 질문에서 핵심 키워드 추출
   */
  private extractQuestionKeywords(question: string): string {
    const stopWords = ['어떻게', '언제', '무엇을', '어디서', '왜', '어떤', 
                      'what', 'when', 'where', 'how', 'why', 'which'];
    
    const keywords = question
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, ' ') // 특수문자 제거
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !stopWords.includes(word))
      .slice(0, 3)
      .join(' ');

    return keywords || question.slice(0, 30);
  }
} 
/**
 * BGG Repository 어댑터 구현
 * Clean Architecture: Infrastructure → Adapters → Use Cases
 */

import { BGGGameEntity } from '@/domain/entities/bgg-game-entity';
import { IBGGRepository, IBGGForumRepository, BGGForumPost, BGGFAQEntry, BGGErrataEntry } from '@/usecases/enhanced-rule-generation';
import { bggApiAdapter } from '@/infrastructure/ai/adapters/bgg-api-adapter';
import { bggIntegrationService } from '@/infrastructure/ai/orchestrators/bgg-integration-service';

/**
 * BGG Repository 구현체
 */
export class BGGRepositoryAdapter implements IBGGRepository {
  async findGameByTitle(title: string): Promise<BGGGameEntity | null> {
    try {
      console.log('🔍 [BGG Repository] 게임 제목으로 검색:', title);

      const gameData = await bggIntegrationService.searchAndMatchGame(title);
      if (!gameData?.bggData) {
        console.warn('⚠️ [BGG Repository] BGG 데이터가 없는 게임:', title);
        return null;
      }

      const bggEntity = BGGGameEntity.fromBGGApiData(gameData.bggData);
      console.log('✅ [BGG Repository] BGG 엔티티 생성 완료:', bggEntity.getSummary());

      return bggEntity;
    } catch (error) {
      console.error('❌ [BGG Repository] 게임 검색 실패:', error);
      return null;
    }
  }

  async findGameById(id: number): Promise<BGGGameEntity | null> {
    try {
      console.log('🔍 [BGG Repository] 게임 ID로 검색:', id);

      const gameDetails = await bggApiAdapter.getGameDetails(id);
      if (!gameDetails) {
        console.warn('⚠️ [BGG Repository] 게임 상세 정보 없음 (ID:', id, ')');
        return null;
      }

      const bggEntity = BGGGameEntity.fromBGGApiData(gameDetails);
      console.log('✅ [BGG Repository] BGG 엔티티 생성 완료:', bggEntity.getSummary());

      return bggEntity;
    } catch (error) {
      console.error('❌ [BGG Repository] 게임 ID 검색 실패:', error);
      return null;
    }
  }

  async getHotGames(): Promise<BGGGameEntity[]> {
    try {
      console.log('🔥 [BGG Repository] Hot 게임 목록 조회');

      const hotGames = await bggIntegrationService.getHotGames();
      const bggEntities = hotGames
        .filter(game => game.bggData)
        .map(game => BGGGameEntity.fromBGGApiData(game.bggData!));

      console.log('✅ [BGG Repository] Hot 게임 엔티티 변환 완료:', bggEntities.length, '개');
      return bggEntities;
    } catch (error) {
      console.error('❌ [BGG Repository] Hot 게임 조회 실패:', error);
      return [];
    }
  }

  async getGameRecommendations(baseGame: BGGGameEntity, count: number = 5): Promise<BGGGameEntity[]> {
    try {
      console.log('🎯 [BGG Repository] 게임 추천 요청:', baseGame.name, '기반', count, '개');

      const recommendations = await bggIntegrationService.getGameRecommendations(baseGame.name, count);
      const bggEntities = recommendations
        .filter(game => game.bggData)
        .map(game => BGGGameEntity.fromBGGApiData(game.bggData!));

      console.log('✅ [BGG Repository] 추천 게임 엔티티 변환 완료:', bggEntities.length, '개');
      return bggEntities;
    } catch (error) {
      console.error('❌ [BGG Repository] 게임 추천 실패:', error);
      return [];
    }
  }
}

/**
 * BGG 포럼 Repository 구현체 (Firecrawl MCP 활용)
 */
export class BGGForumRepositoryAdapter implements IBGGForumRepository {
  async searchForumPosts(gameTitle: string, question: string): Promise<BGGForumPost[]> {
    try {
      console.log('💬 [BGG Forum Repository] 포럼 검색:', gameTitle, '-', question.slice(0, 30));

      // Firecrawl MCP를 사용한 BGG 포럼 검색
      const searchQuery = `site:boardgamegeek.com/thread "${gameTitle}" "${this.extractKeywords(question)}"`;
      
      // Context7 MCP를 통한 BGG 문서 검색
      const bggForumData = await this.searchBGGForumWithFirecrawl(searchQuery, gameTitle);
      
      console.log('✅ [BGG Forum Repository] 포럼 검색 완료:', bggForumData.length, '개 결과');
      return bggForumData;
    } catch (error) {
      console.error('❌ [BGG Forum Repository] 포럼 검색 실패:', error);
      return [];
    }
  }

  async getOfficialFAQ(gameId: number): Promise<BGGFAQEntry[]> {
    try {
      console.log('📋 [BGG Forum Repository] 공식 FAQ 조회:', gameId);

      // BGG 게임 페이지의 FAQ 섹션 크롤링
      const faqUrl = `https://boardgamegeek.com/boardgame/${gameId}`;
      const faqData = await this.crawlBGGFAQ(faqUrl);

      console.log('✅ [BGG Forum Repository] FAQ 조회 완료:', faqData.length, '개');
      return faqData;
    } catch (error) {
      console.error('❌ [BGG Forum Repository] FAQ 조회 실패:', error);
      return [];
    }
  }

  async getErrata(gameId: number): Promise<BGGErrataEntry[]> {
    try {
      console.log('🔄 [BGG Forum Repository] 에라타 조회:', gameId);

      // BGG 에라타 정보 크롤링 (FilePage 섹션)
      const errataData = await this.crawlBGGErrata(gameId);

      console.log('✅ [BGG Forum Repository] 에라타 조회 완료:', errataData.length, '개');
      return errataData;
    } catch (error) {
      console.error('❌ [BGG Forum Repository] 에라타 조회 실패:', error);
      return [];
    }
  }

  /**
   * Firecrawl MCP를 사용한 BGG 포럼 검색
   */
  private async searchBGGForumWithFirecrawl(searchQuery: string, gameTitle: string): Promise<BGGForumPost[]> {
    // 실제 Firecrawl MCP 호출은 여기서 구현
    // 현재는 목업 데이터 반환
    return [
      {
        id: 1,
        title: `${gameTitle} Rule Clarification`,
        content: `Community discussion about specific rule interpretation...`,
        author: 'BGG User',
        upvotes: 8,
        isOfficial: false,
        url: `https://boardgamegeek.com/thread/1234567`
      }
    ];
  }

  /**
   * BGG FAQ 크롤링 (Context7 MCP 활용)
   */
  private async crawlBGGFAQ(url: string): Promise<BGGFAQEntry[]> {
    // Context7 MCP를 통한 BGG 문서 분석
    // 현재는 목업 데이터 반환
    return [
      {
        question: "Official FAQ Question",
        answer: "Official answer from publisher",
        isOfficial: true,
        lastUpdated: new Date()
      }
    ];
  }

  /**
   * BGG 에라타 크롤링
   */
  private async crawlBGGErrata(gameId: number): Promise<BGGErrataEntry[]> {
    // Firecrawl을 통한 에라타 정보 수집
    // 현재는 목업 데이터 반환
    return [
      {
        description: "Rule correction",
        correction: "Updated rule text",
        version: "v1.1",
        dateAdded: new Date()
      }
    ];
  }

  /**
   * 질문에서 키워드 추출
   */
  private extractKeywords(question: string): string {
    const keywords = question
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['어떻게', '언제', '무엇을', '왜', 'what', 'when', 'how', 'why'].includes(word))
      .slice(0, 3)
      .join(' ');

    return keywords || question.slice(0, 20);
  }
}

/**
 * 의존성 주입을 위한 팩토리
 */
export function createBGGRepositories(): {
  bggRepository: IBGGRepository;
  bggForumRepository: IBGGForumRepository;
} {
  return {
    bggRepository: new BGGRepositoryAdapter(),
    bggForumRepository: new BGGForumRepositoryAdapter()
  };
} 
/**
 * Use Cases Layer - Game Search
 * 
 * 게임 검색과 관련된 비즈니스 로직을 구현합니다.
 * Domain 엔티티를 사용하여 애플리케이션의 핵심 기능을 제공합니다.
 */

import { 
  GameEntity, 
  GameCategoryEntity, 
  GameSearchCriteria, 
  GameBusinessRules,
  GameCategoryType,
  DEFAULT_GAME_CATEGORIES
} from '@/domain/entities/game';

// 게임 저장소 인터페이스 (Infrastructure layer에서 구현)
export interface GameRepository {
  findAll(): Promise<GameEntity[]>;
  findById(id: number): Promise<GameEntity | null>;
  findByCategory(category: GameCategoryType): Promise<GameEntity[]>;
  searchByTerm(searchTerm: string): Promise<GameEntity[]>;
  countByCategory(category: GameCategoryType): Promise<number>;
}

// 게임 검색 결과
export interface GameSearchResult {
  readonly games: GameEntity[];
  readonly totalCount: number;
  readonly categories: GameCategoryEntity[];
  readonly appliedCriteria: GameSearchCriteria;
  readonly searchTime: number; // 검색 소요 시간 (ms)
}

// 게임 검색 Use Case
export class GameSearchUseCase {
  constructor(private readonly gameRepository: GameRepository) {}

  /**
   * 검색 조건에 따라 게임을 검색합니다.
   */
  async searchGames(criteria: GameSearchCriteria): Promise<GameSearchResult> {
    const startTime = Date.now();

    try {
      // 1. 모든 게임 조회
      const allGames = await this.gameRepository.findAll();

      // 2. 검색 조건에 맞는 게임 필터링
      const filteredGames = allGames.filter(game => 
        GameBusinessRules.matchesCriteria(game, criteria)
      );

      // 3. 관련성 점수로 정렬
      const sortedGames = filteredGames
        .map(game => ({
          game,
          relevanceScore: GameBusinessRules.calculateRelevanceScore(game, criteria)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .map(item => item.game);

      // 4. 카테고리 정보 생성 (게임 수 포함)
      const categoriesWithCount = await this.getCategoriesWithCount();

      const searchTime = Date.now() - startTime;

      return {
        games: sortedGames,
        totalCount: sortedGames.length,
        categories: categoriesWithCount,
        appliedCriteria: criteria,
        searchTime
      };
    } catch (error) {
      console.error('게임 검색 중 오류 발생:', error);
      throw new Error('게임 검색에 실패했습니다.');
    }
  }

  /**
   * 카테고리별 게임 수와 함께 카테고리 목록을 조회합니다.
   */
  async getCategoriesWithCount(): Promise<GameCategoryEntity[]> {
    const categoriesWithCount = await Promise.all(
      DEFAULT_GAME_CATEGORIES.map(async (category) => {
        const count = await this.gameRepository.countByCategory(category.id);
        return {
          ...category,
          count
        } as GameCategoryEntity & { count: number };
      })
    );

    return categoriesWithCount.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 특정 카테고리의 게임을 조회합니다.
   */
  async getGamesByCategory(categoryId: GameCategoryType): Promise<GameEntity[]> {
    try {
      if (categoryId === 'all') {
        return await this.gameRepository.findAll();
      }
      
      return await this.gameRepository.findByCategory(categoryId);
    } catch (error) {
      console.error('카테고리별 게임 조회 중 오류 발생:', error);
      throw new Error('카테고리별 게임 조회에 실패했습니다.');
    }
  }

  /**
   * 게임 상세 정보를 조회합니다.
   */
  async getGameById(gameId: number): Promise<GameEntity | null> {
    try {
      return await this.gameRepository.findById(gameId);
    } catch (error) {
      console.error('게임 상세 조회 중 오류 발생:', error);
      throw new Error('게임 정보 조회에 실패했습니다.');
    }
  }

  /**
   * 빠른 검색 (텍스트 검색만)
   */
  async quickSearch(searchTerm: string): Promise<GameEntity[]> {
    if (!searchTerm.trim()) {
      return [];
    }

    try {
      const games = await this.gameRepository.searchByTerm(searchTerm);
      
      // 관련성 점수로 정렬
      return games
        .map(game => ({
          game,
          relevanceScore: GameBusinessRules.calculateRelevanceScore(game, { searchTerm })
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .map(item => item.game)
        .slice(0, 10); // 상위 10개만 반환
    } catch (error) {
      console.error('빠른 검색 중 오류 발생:', error);
      throw new Error('빠른 검색에 실패했습니다.');
    }
  }

  /**
   * 검색 제안 (자동완성)
   */
  async getSuggestions(searchTerm: string): Promise<string[]> {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      return [];
    }

    try {
      const games = await this.quickSearch(searchTerm);
      
      return games
        .map(game => game.title)
        .filter(title => title.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 5); // 상위 5개 제안
    } catch (error) {
      console.error('검색 제안 생성 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * 인기 게임 조회
   */
  async getPopularGames(limit: number = 10): Promise<GameEntity[]> {
    try {
      const allGames = await this.gameRepository.findAll();
      
      // 인기도 점수로 정렬 (ID 역순으로 임시 계산)
      return allGames
        .filter(game => GameBusinessRules.isActive(game))
        .sort((a, b) => b.id - a.id) // 최신 게임이 더 인기있다고 가정
        .slice(0, limit);
    } catch (error) {
      console.error('인기 게임 조회 중 오류 발생:', error);
      throw new Error('인기 게임 조회에 실패했습니다.');
    }
  }

  /**
   * 추천 게임 조회 (플레이어 수 기반)
   */
  async getRecommendedGames(playerCount: number, limit: number = 5): Promise<GameEntity[]> {
    try {
      const allGames = await this.gameRepository.findAll();
      
      return allGames
        .filter(game => 
          GameBusinessRules.isActive(game) && 
          GameBusinessRules.supportsPlayerCount(game, playerCount)
        )
        .sort((a, b) => {
          // 정확한 플레이어 수에 맞는 게임 우선
          const aOptimal = playerCount >= a.playerCount.min && playerCount <= a.playerCount.max;
          const bOptimal = playerCount >= b.playerCount.min && playerCount <= b.playerCount.max;
          
          if (aOptimal && !bOptimal) return -1;
          if (!aOptimal && bOptimal) return 1;
          
          return b.id - a.id; // 최신 게임 우선
        })
        .slice(0, limit);
    } catch (error) {
      console.error('추천 게임 조회 중 오류 발생:', error);
      throw new Error('추천 게임 조회에 실패했습니다.');
    }
  }
} 
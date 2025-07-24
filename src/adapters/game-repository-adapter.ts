/**
 * Adapters Layer - Game Repository Adapter
 * 
 * 기존 게임 API와 새로운 Clean Architecture를 연결하는 어댑터입니다.
 * 외부 API 구조를 내부 도메인 엔티티로 변환합니다.
 */

import { GameRepository } from '@/usecases/game-search';
import { GameEntity, GameCategoryType, GameDifficulty } from '@/domain/entities/game';
import { fetchGames, GameFilters } from '@/features/games/api';
import { Game } from '@/types/game';

/**
 * 기존 Game 타입을 GameEntity로 변환하는 어댑터
 */
export class GameRepositoryAdapter implements GameRepository {
  
  /**
   * 기존 Game 객체를 GameEntity로 변환
   */
  private mapToGameEntity(game: Game): GameEntity {
    return {
      id: game.gameId || parseInt(game.id, 10) || 0, // gameId 우선, 없으면 id를 숫자로 변환
      title: game.title,
      description: game.description,
      difficulty: game.difficulty as GameDifficulty,
      categories: this.inferCategories(game), // 카테고리 추론 로직
      playerCount: {
        min: 2, // 기본값 (실제로는 게임 데이터에서 가져와야 함)
        max: 4
      },
      playingTime: {
        min: 30, // 기본값
        max: 90
      },
      age: 10, // 기본값
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * 게임 제목과 설명을 기반으로 카테고리를 추론
   * 실제 프로덕션에서는 데이터베이스에 카테고리 정보가 있어야 함
   */
  private inferCategories(game: Game): GameCategoryType[] {
    const categories: GameCategoryType[] = [];
    const titleAndDesc = (game.title + ' ' + game.description).toLowerCase();

    // 간단한 키워드 기반 카테고리 추론
    if (titleAndDesc.includes('strategy') || titleAndDesc.includes('전략') || 
        titleAndDesc.includes('empire') || titleAndDesc.includes('civilization')) {
      categories.push('strategy');
    }

    if (titleAndDesc.includes('card') || titleAndDesc.includes('카드') ||
        titleAndDesc.includes('deck') || titleAndDesc.includes('hand')) {
      categories.push('card');
    }

    if (titleAndDesc.includes('family') || titleAndDesc.includes('가족') ||
        titleAndDesc.includes('children') || titleAndDesc.includes('kids') ||
        game.difficulty === 'Very Easy' || game.difficulty === 'Easy') {
      categories.push('family');
    }

    if (titleAndDesc.includes('puzzle') || titleAndDesc.includes('퍼즐') ||
        titleAndDesc.includes('logic') || titleAndDesc.includes('brain')) {
      categories.push('puzzle');
    }

    if (titleAndDesc.includes('party') || titleAndDesc.includes('파티') ||
        titleAndDesc.includes('social') || titleAndDesc.includes('group')) {
      categories.push('party');
    }

    if (titleAndDesc.includes('coop') || titleAndDesc.includes('협력') ||
        titleAndDesc.includes('cooperative') || titleAndDesc.includes('together')) {
      categories.push('coop');
    }

    // 카테고리가 없으면 전략게임으로 기본 분류
    if (categories.length === 0) {
      categories.push('strategy');
    }

    return categories;
  }

  /**
   * 모든 게임 조회
   */
  async findAll(): Promise<GameEntity[]> {
    try {
      const games = await fetchGames({});
      return games.map(game => this.mapToGameEntity(game));
    } catch (error) {
      console.error('전체 게임 조회 실패:', error);
      throw new Error('게임 목록을 불러올 수 없습니다.');
    }
  }

  /**
   * ID로 게임 조회
   */
  async findById(id: number): Promise<GameEntity | null> {
    try {
      const games = await fetchGames({});
      const game = games.find(g => g.gameId === id || parseInt(g.id, 10) === id);
      return game ? this.mapToGameEntity(game) : null;
    } catch (error) {
      console.error('게임 상세 조회 실패:', error);
      throw new Error('게임 정보를 불러올 수 없습니다.');
    }
  }

  /**
   * 카테고리별 게임 조회
   */
  async findByCategory(category: GameCategoryType): Promise<GameEntity[]> {
    try {
      const allGames = await this.findAll();
      
      if (category === 'all') {
        return allGames;
      }

      return allGames.filter(game => game.categories.includes(category));
    } catch (error) {
      console.error('카테고리별 게임 조회 실패:', error);
      throw new Error('카테고리별 게임을 불러올 수 없습니다.');
    }
  }

  /**
   * 검색어로 게임 조회
   */
  async searchByTerm(searchTerm: string): Promise<GameEntity[]> {
    try {
      const filters: GameFilters = {
        searchTerm: searchTerm.trim()
      };
      
      const games = await fetchGames(filters);
      return games.map(game => this.mapToGameEntity(game));
    } catch (error) {
      console.error('게임 검색 실패:', error);
      throw new Error('게임 검색에 실패했습니다.');
    }
  }

  /**
   * 카테고리별 게임 수 조회
   */
  async countByCategory(category: GameCategoryType): Promise<number> {
    try {
      const games = await this.findByCategory(category);
      return games.length;
    } catch (error) {
      console.error('카테고리별 게임 수 조회 실패:', error);
      return 0; // 오류 시 0 반환
    }
  }
}

/**
 * 게임 저장소 어댑터 싱글톤 인스턴스
 */
export const gameRepositoryAdapter = new GameRepositoryAdapter(); 
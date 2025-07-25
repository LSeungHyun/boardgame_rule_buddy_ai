/**
 * Use Cases Layer - Game Year Service
 * 
 * 게임 년도 정보 조회 및 최신 게임 경고 기능을 제공하는 유스케이스입니다.
 * Clean Architecture의 유스케이스 레이어에 위치하여 비즈니스 로직을 담당합니다.
 */

import { GameEntity, GameBusinessRules } from '@/domain/entities/game';
import { BggApiGateway, BggGameInfo, BggApiError } from '@/infrastructure/bgg-api-gateway';

export interface GameYearInfo {
  gameId: number;
  gameName: string;
  publishedYear?: number;
  isRecentGame: boolean;
  warningMessage?: string;
}

export interface GameYearResult {
  success: boolean;
  data?: GameYearInfo;
  error?: string;
}

/**
 * 게임 년도 조회 유스케이스
 */
export class GetGameYearUseCase {
  /**
   * 게임 이름으로 BGG에서 년도 정보 조회
   */
  static async execute(gameName: string): Promise<GameYearResult> {
    try {
      console.log(`[GetGameYearUseCase] 게임 년도 조회 시작: "${gameName}"`);

      // 1. BGG에서 게임 검색
      const searchResult = await BggApiGateway.searchGameByName(gameName);
      
      if ('type' in searchResult) {
        // 에러인 경우
        console.error(`[GetGameYearUseCase] BGG 검색 에러:`, searchResult);
        return {
          success: false,
          error: `게임 검색 실패: ${searchResult.message}`
        };
      }

      if (searchResult.length === 0) {
        console.log(`[GetGameYearUseCase] 검색 결과 없음: "${gameName}"`);
        return {
          success: false,
          error: `"${gameName}"을(를) BGG에서 찾을 수 없습니다.`
        };
      }

      console.log(`[GetGameYearUseCase] BGG 검색 성공: ${searchResult.length}개 결과 발견`, 
        searchResult.map(r => ({ id: r.id, name: r.name, year: r.year })));

      // 2. 첫 번째 검색 결과로 상세 정보 조회
      const firstResult = searchResult[0];
      const gameInfo = await BggApiGateway.getGameInfo(firstResult.id);
      
      if ('type' in gameInfo) {
        // 에러인 경우
        return {
          success: false,
          error: `게임 정보 조회 실패: ${gameInfo.message}`
        };
      }

      // 3. 게임 엔티티 생성 (임시로 최소 정보만)
      const gameEntity: Partial<GameEntity> = {
        id: gameInfo.id,
        title: gameInfo.name,
        publishedYear: gameInfo.publishedYear
      };

      // 4. 비즈니스 로직 적용
      const isRecentGame = gameInfo.publishedYear ? 
        GameBusinessRules.isRecentGame(gameEntity as GameEntity) : false;
      
      const warningMessage = isRecentGame ? 
        GameBusinessRules.getYearWarningMessage(gameEntity as GameEntity) : undefined;

      console.log(`[GetGameYearUseCase] 년도 조회 완료:`, {
        gameName: gameInfo.name,
        publishedYear: gameInfo.publishedYear,
        isRecentGame
      });

      return {
        success: true,
        data: {
          gameId: gameInfo.id,
          gameName: gameInfo.name,
          publishedYear: gameInfo.publishedYear,
          isRecentGame,
          warningMessage
        }
      };

    } catch (error) {
      console.error('[GetGameYearUseCase] 예외 발생:', error);
      return {
        success: false,
        error: '게임 년도 조회 중 예상치 못한 오류가 발생했습니다.'
      };
    }
  }
}

/**
 * 최신 게임 경고 유스케이스
 */
export class CheckRecentGameUseCase {
  /**
   * 게임이 최신 게임인지 확인하고 경고 메시지 생성
   */
  static async execute(gameName: string): Promise<{
    isRecentGame: boolean;
    warningMessage?: string;
    publishedYear?: number;
  }> {
    try {
      const yearResult = await GetGameYearUseCase.execute(gameName);
      
      if (!yearResult.success || !yearResult.data) {
        console.log(`[CheckRecentGameUseCase] 년도 정보 없음: "${gameName}"`);
        return { isRecentGame: false };
      }

      const { isRecentGame, warningMessage, publishedYear } = yearResult.data;

      return {
        isRecentGame,
        warningMessage,
        publishedYear
      };

    } catch (error) {
      console.error('[CheckRecentGameUseCase] 오류:', error);
      return { isRecentGame: false };
    }
  }
}

/**
 * 게임 년도 캐시 관리 (간단한 메모리 캐시)
 */
class GameYearCache {
  private static cache = new Map<string, {
    data: GameYearInfo;
    timestamp: number;
  }>();
  
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

  static get(gameName: string): GameYearInfo | null {
    const normalizedName = gameName.toLowerCase().trim();
    const cached = this.cache.get(normalizedName);
    
    if (!cached) return null;
    
    // TTL 확인
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(normalizedName);
      return null;
    }
    
    return cached.data;
  }

  static set(gameName: string, data: GameYearInfo): void {
    const normalizedName = gameName.toLowerCase().trim();
    this.cache.set(normalizedName, {
      data,
      timestamp: Date.now()
    });
  }

  static clear(): void {
    this.cache.clear();
  }

  static getStats(): { size: number; hitRate: number } {
    // 간단한 통계 (실제 hit rate 계산은 별도 구현 필요)
    return {
      size: this.cache.size,
      hitRate: 0 // 추후 구현
    };
  }
}

/**
 * 캐시가 적용된 게임 년도 조회 유스케이스
 */
export class CachedGameYearUseCase {
  /**
   * 캐시를 우선 확인하고, 없으면 BGG에서 조회
   */
  static async execute(gameName: string): Promise<GameYearResult> {
    // 1. 캐시 확인
    const cached = GameYearCache.get(gameName);
    if (cached) {
      console.log(`[CachedGameYearUseCase] 캐시 히트: "${gameName}"`);
      return {
        success: true,
        data: cached
      };
    }

    // 2. BGG에서 조회
    const result = await GetGameYearUseCase.execute(gameName);
    
    // 3. 성공 시 캐시에 저장
    if (result.success && result.data) {
      GameYearCache.set(gameName, result.data);
    }

    return result;
  }

  /**
   * 캐시 통계 조회
   */
  static getCacheStats() {
    return GameYearCache.getStats();
  }

  /**
   * 캐시 클리어
   */
  static clearCache() {
    return GameYearCache.clear();
  }
} 
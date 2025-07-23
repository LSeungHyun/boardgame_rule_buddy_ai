/**
 * BGG 통합 서비스
 * BGG API와 기존 게임 시스템을 연동하는 오케스트레이터
 */

import { bggApiAdapter, type BGGGameBasicInfo, type BGGSearchResult, type BGGHotItem } from '../adapters/bgg-api-adapter';
import { GameMappingService } from '@/lib/game-mapping-service';
import type { Game } from '@/types/game';
import type { GameInfo } from '@/types/game-mapping';

export interface BGGIntegrationConfig {
  enableRealTimeSync: boolean;
  syncIntervalHours: number;
  maxSearchResults: number;
  cacheExpiryMinutes: number;
}

export interface GameWithBGGData extends Game {
  bggData?: BGGGameBasicInfo;
  bggId?: number;
  lastSyncDate?: Date;
  searchScore?: number; // 검색 관련성 점수
}

export interface BGGSearchResultWithDetails {
  searchResults: BGGSearchResult[];
  detailedGames: GameWithBGGData[];
  searchQuery: string;
  totalFound: number;
}

export interface BGGSyncResult {
  success: boolean;
  gamesProcessed: number;
  gamesUpdated: number;
  errors: string[];
}

export class BGGIntegrationService {
  private gameMappingService: GameMappingService;
  private config: BGGIntegrationConfig;
  private syncCache: Map<string, any> = new Map();
  
  constructor(config: BGGIntegrationConfig = {
    enableRealTimeSync: true,
    syncIntervalHours: 24,
    maxSearchResults: 20,
    cacheExpiryMinutes: 60
  }) {
    this.config = config;
    this.gameMappingService = GameMappingService.getInstance();
  }

  /**
   * 게임 제목으로 BGG에서 검색 (여러 결과 반환)
   */
  async searchGames(gameTitle: string): Promise<BGGSearchResultWithDetails> {
    try {
      console.log(`🔍 [BGG Integration] 게임 검색 시작: "${gameTitle}"`);

      // GameMappingService 초기화 확인
      if (!this.gameMappingService.isInitialized()) {
        console.log('🚀 [BGG Integration] GameMappingService 초기화 중...');
        await this.gameMappingService.initialize();
      }

      // 1. BGG API에서 게임 검색
      const searchResults = await bggApiAdapter.searchGames(gameTitle, false);
      
      if (searchResults.length === 0) {
        console.log(`📭 [BGG Integration] 검색 결과 없음: "${gameTitle}"`);
        return {
          searchResults: [],
          detailedGames: [],
          searchQuery: gameTitle,
          totalFound: 0
        };
      }

      console.log(`✅ [BGG Integration] BGG에서 ${searchResults.length}개 게임 발견`);

      // 2. 상위 결과들에 대해 상세 정보 가져오기 (최대 10개)
      const topResults = searchResults.slice(0, Math.min(10, this.config.maxSearchResults));
      const detailedGames: GameWithBGGData[] = [];

      for (const searchResult of topResults) {
        try {
          const bggDetails = await bggApiAdapter.getGameDetails(searchResult.id);
          
          if (bggDetails) {
            // 기존 게임 매핑 확인
            const existingGame = this.findExistingGameMapping(bggDetails.name, bggDetails.id);
            
            const gameWithBGGData: GameWithBGGData = existingGame ? {
              ...existingGame,
              bggData: bggDetails,
              bggId: bggDetails.id,
              lastSyncDate: new Date(),
              searchScore: this.calculateSearchScore(searchResult, gameTitle)
            } : {
              id: `bgg_${bggDetails.id}`,
              title: bggDetails.name,
              description: bggDetails.description,
              imageUrl: bggDetails.image || bggDetails.thumbnail || '',
              gameId: bggDetails.id,
              bggData: bggDetails,
              bggId: bggDetails.id,
              lastSyncDate: new Date(),
              searchScore: this.calculateSearchScore(searchResult, gameTitle)
            };

            detailedGames.push(gameWithBGGData);
          }
        } catch (error) {
          console.warn(`⚠️ [BGG Integration] 게임 상세 정보 조회 실패 (ID: ${searchResult.id}):`, error);
          
          // 상세 정보 조회 실패 시에도 기본 정보로 추가
          const basicGame: GameWithBGGData = {
            id: `bgg_${searchResult.id}`,
            title: searchResult.name,
            description: `${searchResult.name} (${searchResult.yearPublished})`,
            imageUrl: '', // 기본 이미지 없음
            gameId: searchResult.id,
            bggId: searchResult.id,
            lastSyncDate: new Date(),
            searchScore: this.calculateSearchScore(searchResult, gameTitle)
          };
          
          detailedGames.push(basicGame);
        }
      }

      // 검색 점수 순으로 정렬
      detailedGames.sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));

      console.log(`✅ [BGG Integration] 검색 완료: ${detailedGames.length}개 게임 준비됨`);

      return {
        searchResults,
        detailedGames,
        searchQuery: gameTitle,
        totalFound: searchResults.length
      };

    } catch (error) {
      console.error(`❌ [BGG Integration] 게임 검색 실패: "${gameTitle}"`, error);
      throw new Error(`BGG 게임 검색 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 게임 제목으로 BGG에서 검색 및 매칭 (단일 최적 결과)
   */
  async searchAndMatchGame(gameTitle: string): Promise<GameWithBGGData | null> {
    try {
      const searchResults = await this.searchGames(gameTitle);
      
      if (searchResults.detailedGames.length === 0) {
        return null;
      }

      // 첫 번째 (가장 관련성 높은) 게임 반환
      return searchResults.detailedGames[0];

    } catch (error) {
      console.error(`❌ [BGG Integration] 게임 매칭 실패: "${gameTitle}"`, error);
      return null;
    }
  }

  /**
   * 인기 게임 목록 가져오기 (BGG Hot List)
   */
  async getHotGames(): Promise<GameWithBGGData[]> {
    try {
      console.log('🔥 [BGG 통합] Hot 게임 목록 조회 시작');

      const cacheKey = 'hot_games';
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        console.log('📦 [BGG 통합] Hot 게임 캐시 데이터 사용');
        return cached;
      }

      const hotItems = await bggApiAdapter.getHotGames();
      if (hotItems.length === 0) {
        console.warn('⚠️ [BGG 통합] Hot 게임 목록이 비어있음');
        return [];
      }

      // BGG ID들로 상세 정보 일괄 조회
      const gameIds = hotItems.slice(0, this.config.maxSearchResults).map(item => item.id);
      const gameDetails = await bggApiAdapter.getMultipleGameDetails(gameIds);

      const hotGames: GameWithBGGData[] = gameDetails.map(game => ({
        id: game.id.toString(),
        gameId: game.id,
        title: game.name,
        difficulty: this.mapComplexityToDifficulty(game.complexity),
        description: game.description,
        imageUrl: game.image || game.thumbnail,
        publisher: game.publishers[0] || '',
        isActive: true,
        createdAt: new Date().toISOString(),
        bggData: game,
        bggId: game.id,
        lastSyncDate: new Date()
      }));

      // 캐시에 저장
      this.setCachedData(cacheKey, hotGames);

      console.log(`✅ [BGG 통합] Hot 게임 ${hotGames.length}개 조회 완료`);
      return hotGames;

    } catch (error) {
      console.error('❌ [BGG 통합] Hot 게임 조회 실패:', error);
      return [];
    }
  }

  /**
   * 기존 게임 데이터와 BGG 데이터 동기화
   */
  async syncExistingGamesWithBGG(): Promise<BGGSyncResult> {
    console.log('🔄 [BGG 통합] 기존 게임 데이터 동기화 시작');

    const result: BGGSyncResult = {
      success: true,
      gamesProcessed: 0,
      gamesUpdated: 0,
      errors: []
    };

    try {
      await this.ensureGameMappingInitialized();
      const allGames = this.gameMappingService.getAllGames();
      
      console.log(`📊 [BGG 통합] 총 ${allGames.length}개 게임 동기화 예정`);

      // 배치 처리 (BGG API 속도 제한 고려)
      const batchSize = 5;
      for (let i = 0; i < allGames.length; i += batchSize) {
        const batch = allGames.slice(i, i + batchSize);
        
        for (const game of batch) {
          try {
            result.gamesProcessed++;
            
            // 영어 제목이 있으면 사용, 없으면 한국어 제목 사용
            const searchTitle = game.titleEnglish || game.titleKorean;
            const bggGame = await bggApiAdapter.findGameByTitle(searchTitle);
            
            if (bggGame) {
              result.gamesUpdated++;
              console.log(`✅ [BGG 동기화] ${game.titleKorean} → BGG ID: ${bggGame.id}`);
              
              // TODO: 동기화된 데이터를 데이터베이스에 저장
              // 여기서는 로깅만 수행
            } else {
              console.log(`⚠️ [BGG 동기화] ${game.titleKorean} → BGG에서 찾을 수 없음`);
            }
            
          } catch (error) {
            const errorMsg = `게임 "${game.titleKorean}" 동기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
            result.errors.push(errorMsg);
            console.error(`❌ [BGG 동기화] ${errorMsg}`);
          }
        }

        // 배치 간 대기 (BGG API 속도 제한)
        if (i + batchSize < allGames.length) {
          console.log('⏳ [BGG 동기화] API 속도 제한 대기 중...');
          await new Promise(resolve => setTimeout(resolve, 6000)); // 6초 대기
        }
      }

      console.log(`🎉 [BGG 동기화] 완료 - 처리: ${result.gamesProcessed}, 업데이트: ${result.gamesUpdated}, 오류: ${result.errors.length}`);

    } catch (error) {
      result.success = false;
      const errorMsg = `동기화 프로세스 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      result.errors.push(errorMsg);
      console.error(`❌ [BGG 동기화] ${errorMsg}`);
    }

    return result;
  }

  /**
   * 게임 추천 (BGG 데이터 기반)
   */
  async getGameRecommendations(
    baseGameTitle: string,
    count: number = 5
  ): Promise<GameWithBGGData[]> {
    try {
      console.log(`🎯 [BGG 추천] "${baseGameTitle}" 기반 추천 게임 검색`);

      // 1. 기준 게임 정보 조회
      const baseGame = await this.searchAndMatchGame(baseGameTitle);
      if (!baseGame?.bggData) {
        console.warn(`⚠️ [BGG 추천] 기준 게임 "${baseGameTitle}"을 찾을 수 없음`);
        return [];
      }

      // 2. 유사한 게임 찾기 (카테고리, 메카닉 기반)
      const recommendations: GameWithBGGData[] = [];
      
      // Hot 게임 중에서 유사한 게임 필터링 (간단한 구현)
      const hotGames = await this.getHotGames();
      const baseCategories = baseGame.bggData.categories;
      const baseMechanics = baseGame.bggData.mechanics;

      for (const game of hotGames) {
        if (game.bggId === baseGame.bggId) continue; // 기준 게임 제외
        
        if (game.bggData) {
          // 카테고리나 메카닉이 겹치는 게임 찾기
          const hasCommonCategory = baseCategories.some(cat => 
            game.bggData!.categories.includes(cat)
          );
          const hasCommonMechanic = baseMechanics.some(mech => 
            game.bggData!.mechanics.includes(mech)
          );

          if (hasCommonCategory || hasCommonMechanic) {
            recommendations.push(game);
          }
        }

        if (recommendations.length >= count) break;
      }

      console.log(`✅ [BGG 추천] "${baseGameTitle}" 기반 ${recommendations.length}개 게임 추천`);
      return recommendations;

    } catch (error) {
      console.error(`❌ [BGG 추천] "${baseGameTitle}" 추천 실패:`, error);
      return [];
    }
  }

  /**
   * BGG 복잡도를 시스템 난이도로 매핑
   */
  private mapComplexityToDifficulty(complexity: number): string {
    // BGG 복잡도 (1-5) → 시스템 난이도 문자열
    if (complexity <= 1.5) return 'Very Easy';
    if (complexity <= 2.5) return 'Easy';
    if (complexity <= 3.5) return 'Normal';
    if (complexity <= 4.5) return 'Semi-Hard';
    return 'Hard';
  }

  /**
   * 검색 관련성 점수 계산
   */
  private calculateSearchScore(searchResult: BGGSearchResult, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    const nameLower = searchResult.name.toLowerCase();

    // 정확한 매치
    if (nameLower === queryLower) {
      score += 100;
    }
    // 시작 매치
    else if (nameLower.startsWith(queryLower)) {
      score += 80;
    }
    // 포함 매치
    else if (nameLower.includes(queryLower)) {
      score += 60;
    }
    // 단어 단위 매치
    else {
      const queryWords = queryLower.split(/\s+/);
      const matchedWords = queryWords.filter(word => nameLower.includes(word));
      score += (matchedWords.length / queryWords.length) * 40;
    }

    // 최신 게임 보너스 (연도가 2020 이상이면 추가 점수)
    if (searchResult.yearPublished >= 2020) {
      score += 10;
    }

    return Math.round(score);
  }

  /**
   * 기존 게임 매핑 찾기
   */
  private findExistingGameMapping(gameName: string, bggId: number): Game | null {
    try {
      const allGames = this.gameMappingService.getAllGames();
      
      // BGG ID로 직접 매칭 (GameInfo의 id는 number)
      const bggMatch = allGames.find(game => 
        game.id === bggId
      );
      
              if (bggMatch) {
          return this.convertGameInfoToGame(bggMatch);
        }

      // 게임 이름으로 매칭 (유사도 기반)
      const nameMatch = allGames.find(game => {
        const similarity = this.calculateNameSimilarity(game.titleKorean, gameName);
        return similarity > 0.8; // 80% 이상 유사
      });

      return nameMatch ? this.convertGameInfoToGame(nameMatch) : null;

    } catch (error) {
      console.warn('기존 게임 매핑 검색 실패:', error);
      return null;
    }
  }

  /**
   * GameInfo를 Game 타입으로 변환
   */
  private convertGameInfoToGame(gameInfo: GameInfo): Game {
    // GameInfo 타입의 complexity를 Game의 difficulty 형태로 변환
    const difficultyMap: Record<string, string> = {
      'light': 'Easy',
      'medium': 'Normal', 
      'heavy': 'Hard'
    };

    return {
      id: gameInfo.id.toString(),
      gameId: gameInfo.id,
      title: gameInfo.titleKorean,
      description: `${gameInfo.titleKorean} 보드게임${gameInfo.titleEnglish ? ` (${gameInfo.titleEnglish})` : ''}`,
      imageUrl: '', // GameInfo에는 이미지 URL이 없음
      publisher: '', // GameInfo에는 출판사 정보가 없음  
      difficulty: gameInfo.complexity ? difficultyMap[gameInfo.complexity] : 'Normal',
      isActive: true,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 게임 이름 유사도 계산 (간단한 Levenshtein 거리 기반)
   */
  private calculateNameSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1.0;
    
    const distance = this.levenshteinDistance(s1, s2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Levenshtein 거리 계산
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 게임 매핑 서비스 초기화 확인
   */
  private async ensureGameMappingInitialized(): Promise<void> {
    if (!this.gameMappingService.isInitialized()) {
      await this.gameMappingService.initialize();
    }
  }

  /**
   * 캐시 데이터 조회
   */
  private getCachedData(key: string): any | null {
    const cached = this.syncCache.get(key);
    if (!cached) return null;

    const { data, timestamp } = cached;
    const expiryTime = this.config.cacheExpiryMinutes * 60 * 1000;
    
    if (Date.now() - timestamp > expiryTime) {
      this.syncCache.delete(key);
      return null;
    }

    return data;
  }

  /**
   * 캐시 데이터 저장
   */
  private setCachedData(key: string, data: any): void {
    this.syncCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 캐시 정리
   */
  public clearCache(): void {
    this.syncCache.clear();
    console.log('🧹 [BGG 통합] 캐시 정리 완료');
  }

  /**
   * 서비스 통계 조회
   */
  public getStats(): {
    cacheSize: number;
    isGameMappingInitialized: boolean;
    config: BGGIntegrationConfig;
  } {
    return {
      cacheSize: this.syncCache.size,
      isGameMappingInitialized: this.gameMappingService.isInitialized(),
      config: this.config
    };
  }
}

export const bggIntegrationService = new BGGIntegrationService(); 
/**
 * 중앙 집중화된 게임 매핑 서비스
 * 싱글톤 패턴으로 구현된 게임 정보 관리 및 검색 시스템
 */

import type {
  GameInfo,
  GameMappingConfig,
  GameSearchResult,
  GameMappingOptions,
  GameMappingStats,
  AddAliasRequest,
  GameId,
  GameTitle,
  NormalizedTitle,
  AliasMapping,
  GameMapping
} from '@/types/game-mapping';

import {
  GameMappingError,
  GameMappingErrorType,
  GAME_MAPPING_CONSTANTS,
  isValidGameId,
  isValidGameInfo,
  isValidGameMappingConfig
} from '@/types/game-mapping';

/**
 * LRU 캐시 인터페이스 (간단한 구현)
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
}

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = GAME_MAPPING_CONSTANTS.DEFAULT_CACHE_SIZE, ttl: number = GAME_MAPPING_CONSTANTS.DEFAULT_CACHE_TTL) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // TTL 체크
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // 액세스 카운트 업데이트
    entry.accessCount++;
    entry.timestamp = Date.now();
    return entry.value;
  }

  set(key: string, value: T): void {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // LRU 제거: 가장 오래된 액세스 시간 기준
      let oldestKey = '';
      let oldestTime = Date.now();
      
      for (const [k, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { hitRate: number; size: number } {
    let totalHits = 0;
    let totalEntries = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.accessCount;
      totalEntries++;
    }

    return {
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
      size: totalEntries
    };
  }
}

/**
 * 게임 매핑 서비스 싱글톤 클래스
 */
export class GameMappingService {
  private static instance: GameMappingService;
  
  // 데이터 저장소
  private gameMapping: GameMapping = new Map();
  private aliasMapping: AliasMapping = new Map();
  private initialized = false;
  
  // 캐싱 시스템
  private searchCache: LRUCache<GameSearchResult[]>;
  private gameCache: LRUCache<GameInfo>;
  
  // 통계 및 옵션
  private options: Required<GameMappingOptions>;
  private accessStats: Map<GameId, { count: number; lastAccess: number }> = new Map();

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(options?: GameMappingOptions): GameMappingService {
    if (!GameMappingService.instance) {
      GameMappingService.instance = new GameMappingService(options);
    }
    return GameMappingService.instance;
  }

  /**
   * private 생성자 (싱글톤 패턴)
   */
  private constructor(options: GameMappingOptions = {}) {
    this.options = {
      maxCacheSize: options.maxCacheSize ?? GAME_MAPPING_CONSTANTS.DEFAULT_CACHE_SIZE,
      cacheTTL: options.cacheTTL ?? GAME_MAPPING_CONSTANTS.DEFAULT_CACHE_TTL,
      debug: options.debug ?? true, // 디버그 모드 기본 활성화
      autoInitialize: options.autoInitialize ?? true
    };

    this.searchCache = new LRUCache(this.options.maxCacheSize, this.options.cacheTTL);
    this.gameCache = new LRUCache(this.options.maxCacheSize, this.options.cacheTTL);

    if (this.options.autoInitialize) {
      this.initialize().catch(error => {
        console.error('[GameMappingService] 자동 초기화 실패:', error);
      });
    }
  }

  /**
   * 서비스 초기화 (지연 로딩)
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.log('이미 초기화됨');
      return;
    }

    try {
      this.log('서비스 초기화 시작...');
      
      // 게임 데이터 로드
      const gameData = await this.loadGameData();
      
      // 매핑 테이블 구축
      this.buildMappings(gameData);
      
      this.initialized = true;
      this.log(`초기화 완료: ${this.gameMapping.size}개 게임 로드됨`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      this.log(`초기화 실패: ${errorMessage}`);
      throw new GameMappingError(
        `서비스 초기화 실패: ${errorMessage}`,
        GameMappingErrorType.INITIALIZATION_FAILED
      );
    }
  }

  /**
   * 게임 데이터 로드
   */
  private async loadGameData(): Promise<GameMappingConfig> {
    try {
      // 기존 games-list-365.json을 기반으로 데이터 로드
      // 추후 enhanced-games-mapping.json으로 교체 예정
      this.log('게임 데이터 로드 시도: /data/games-list-365.json');
      const gamesListResponse = await fetch('/data/games-list-365.json');
      this.log(`Fetch 응답 상태: ${gamesListResponse.status} ${gamesListResponse.statusText}`);
      
      if (!gamesListResponse.ok) {
        throw new Error(`HTTP ${gamesListResponse.status}: 게임 리스트 로드 실패 - ${gamesListResponse.statusText}`);
      }
      
      const gamesList = await gamesListResponse.json();
      this.log(`게임 리스트 로드됨: ${JSON.stringify(gamesList).slice(0, 200)}...`);
      this.log(`게임 리스트 타입: ${typeof gamesList}`);
      
      // 데이터 구조 확인
      if (!gamesList || typeof gamesList !== 'object') {
        throw new Error('게임 리스트가 올바른 객체 형식이 아닙니다');
      }
      
             // 데이터 형식 확인 및 처리
       if (gamesList.metadata && Array.isArray(gamesList.games)) {
         // games-list-365.json 형식 (메타데이터 + 배열 형태 게임 목록)
         this.log('games-list-365.json 배열 형식 감지됨');
         const gamesArray = gamesList.games;
         
         this.log(`배열에서 ${gamesArray.length}개 게임 발견`);
         
         // 기존 포맷을 새 포맷으로 변환
         const convertedConfig: GameMappingConfig = {
           metadata: {
             version: '1.0.0',
             lastUpdated: new Date().toISOString(),
             totalGames: gamesArray.length,
             description: 'games-list-365.json에서 변환됨'
           },
           games: gamesArray.map((game: any) => ({
             id: parseInt(game.id),
             titleKorean: game.title,
             titleEnglish: undefined,
             aliases: [
               game.title.toLowerCase(),
               game.title.replace(/\s/g, ''),
               game.title.replace(/:/g, ' :')
             ],
             hasTermsData: parseInt(game.id) === 331, // 현재는 아크노바만 용어 데이터 있음
             category: undefined,
             complexity: game.difficulty || undefined
           }))
         };
         
         this.log(`변환 완료: ${convertedConfig.games.length}개 게임`);
         return convertedConfig;
         
       } else if (gamesList.metadata && gamesList.games && !Array.isArray(gamesList.games)) {
         // enhanced-games-mapping.json 형식
         this.log('Enhanced 게임 매핑 형식 감지됨');
         return gamesList as GameMappingConfig;
       } else {
         throw new Error('알 수 없는 게임 데이터 형식입니다');
       }
      
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      this.log(`데이터 로드 실패: ${errorMessage}`);
      console.error('[GameMappingService] 상세 오류:', error);
      throw new GameMappingError(
        `게임 데이터 로드 실패: ${errorMessage}`,
        GameMappingErrorType.DATA_LOAD_FAILED
      );
    }
  }

  /**
   * 매핑 테이블 구축
   */
  private buildMappings(config: GameMappingConfig): void {
    this.log('매핑 테이블 구축 시작...');
    
    // 기존 매핑 클리어
    this.gameMapping.clear();
    this.aliasMapping.clear();

    for (const game of config.games) {
      if (!isValidGameInfo(game)) {
        this.log(`유효하지 않은 게임 정보 스킵: ${JSON.stringify(game)}`);
        continue;
      }

      // 게임 정보 저장
      this.gameMapping.set(game.id, game);

      // 별칭 매핑 생성
      const aliases = [
        game.titleKorean,
        game.titleEnglish,
        ...game.aliases
      ].filter(Boolean) as string[];

      for (const alias of aliases) {
        const normalized = this.normalizeTitle(alias);
        this.aliasMapping.set(normalized, game.id);
      }
    }

    this.log(`매핑 완료: ${this.gameMapping.size}개 게임, ${this.aliasMapping.size}개 별칭`);
  }

  /**
   * 게임 제목 정규화
   */
  private normalizeTitle(title: string): NormalizedTitle {
    return title
      .toLowerCase()
      .trim()
      .replace(/\s*:\s*/g, ' : ')  // 콜론 주변 공백 정규화
      .replace(/\s+/g, ' ')        // 다중 공백 제거
      .replace(/[^\w\s가-힣:]/g, '') // 특수문자 제거 (한글, 영문, 숫자, 공백, 콜론만 유지)
      .trim();
  }

  /**
   * 게임 ID로 정보 조회
   */
  public getGameById(id: GameId): GameInfo | null {
    if (!isValidGameId(id)) {
      return null;
    }

    // 캐시 확인
    const cacheKey = `game_${id}`;
    const cached = this.gameCache.get(cacheKey);
    if (cached) {
      this.updateAccessStats(id);
      return cached;
    }

    const game = this.gameMapping.get(id) || null;
    
    if (game) {
      this.gameCache.set(cacheKey, game);
      this.updateAccessStats(id);
    }

    return game;
  }

  /**
   * 게임명으로 ID 조회
   */
  public getGameIdByTitle(title: GameTitle): GameId | null {
    if (!title || title.length < GAME_MAPPING_CONSTANTS.MIN_TITLE_LENGTH) {
      return null;
    }

    const normalized = this.normalizeTitle(title);
    return this.aliasMapping.get(normalized) || null;
  }

  /**
   * 게임명으로 정보 조회
   */
  public getGameByTitle(title: GameTitle): GameInfo | null {
    const id = this.getGameIdByTitle(title);
    return id ? this.getGameById(id) : null;
  }

  /**
   * 게임 검색 (퍼지 매칭 포함) - 캐싱 및 성능 최적화
   */
  public searchGames(query: string, maxResults: number = 10): GameSearchResult[] {
    if (!query || query.length < GAME_MAPPING_CONSTANTS.MIN_TITLE_LENGTH) {
      return [];
    }

    // 캐시 확인 (성능 최적화)
    const cacheKey = `search_${this.normalizeTitle(query)}_${maxResults}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      this.log(`캐시 히트: 검색 "${query}"`);
      return cached;
    }

    const results: GameSearchResult[] = [];
    const normalizedQuery = this.normalizeTitle(query);

    // 1. 정확한 매칭
    const exactId = this.aliasMapping.get(normalizedQuery);
    if (exactId) {
      const game = this.gameMapping.get(exactId);
      if (game) {
        results.push({
          game,
          confidence: 1.0,
          matchedTerm: query,
          matchType: 'exact'
        });
      }
    }

    // 2. 부분 매칭
    if (results.length < maxResults) {
      for (const [alias, gameId] of this.aliasMapping.entries()) {
        if (results.length >= maxResults) break;
        
        if (alias.includes(normalizedQuery) || normalizedQuery.includes(alias)) {
          const game = this.gameMapping.get(gameId);
          if (game && !results.some(r => r.game.id === gameId)) {
            const confidence = this.calculateSimilarity(normalizedQuery, alias);
            if (confidence >= GAME_MAPPING_CONSTANTS.FUZZY_MATCH_THRESHOLD) {
              results.push({
                game,
                confidence,
                matchedTerm: alias,
                matchType: 'alias'
              });
            }
          }
        }
      }
    }

    // 결과 정렬 (신뢰도 높은 순)
    results.sort((a, b) => b.confidence - a.confidence);
    
    // 캐시 저장
    this.searchCache.set(cacheKey, results);
    
    return results;
  }

  /**
   * 문자열 유사도 계산 (간단한 구현)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 레벤시타인 거리 계산
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
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
   * 동적 별칭 추가 (강화된 버전)
   */
  public addAlias(request: AddAliasRequest): boolean {
    const { gameId, alias, type = 'community' } = request;
    
    if (!isValidGameId(gameId) || !alias.trim()) {
      this.log(`별칭 추가 실패: 유효하지 않은 입력 (gameId: ${gameId}, alias: "${alias}")`);
      return false;
    }

    const game = this.gameMapping.get(gameId);
    if (!game) {
      this.log(`별칭 추가 실패: 게임 ID ${gameId}를 찾을 수 없음`);
      return false;
    }

    const normalized = this.normalizeTitle(alias);
    
    // 이미 존재하는 별칭인지 확인
    if (this.aliasMapping.has(normalized)) {
      const existingGameId = this.aliasMapping.get(normalized);
      this.log(`별칭 추가 실패: "${alias}"는 이미 게임 ID ${existingGameId}에 사용 중`);
      return false;
    }

    // 별칭 추가
    game.aliases.push(alias);
    this.aliasMapping.set(normalized, gameId);
    
    // 캐시 무효화
    this.searchCache.clear();
    
    this.log(`별칭 추가됨: "${alias}" → ${game.titleKorean} (ID: ${gameId}, 타입: ${type})`);
    return true;
  }

  /**
   * 퍼지 매칭으로 유사한 게임 찾기 (Phase 4.1)
   */
  public findSimilarGames(query: string, threshold: number = GAME_MAPPING_CONSTANTS.FUZZY_MATCH_THRESHOLD): GameSearchResult[] {
    if (!query || query.length < GAME_MAPPING_CONSTANTS.MIN_TITLE_LENGTH) {
      return [];
    }

    const normalizedQuery = this.normalizeTitle(query);
    const results: GameSearchResult[] = [];

    // 모든 게임에 대해 유사도 계산
    for (const [gameId, game] of this.gameMapping.entries()) {
      const allTitles = [
        game.titleKorean,
        game.titleEnglish,
        ...game.aliases
      ].filter(Boolean) as string[];

      let maxSimilarity = 0;
      let bestMatch = '';

      for (const title of allTitles) {
        const normalized = this.normalizeTitle(title);
        const similarity = this.calculateSimilarity(normalizedQuery, normalized);
        
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          bestMatch = title;
        }
      }

      if (maxSimilarity >= threshold) {
        results.push({
          game,
          confidence: maxSimilarity,
          matchedTerm: bestMatch,
          matchType: 'fuzzy'
        });
      }
    }

    // 유사도 순으로 정렬
    results.sort((a, b) => b.confidence - a.confidence);
    
    this.log(`퍼지 검색 "${query}": ${results.length}개 결과 (임계값: ${threshold})`);
    return results;
  }

  /**
   * 별칭 제거
   */
  public removeAlias(gameId: GameId, alias: string): boolean {
    const game = this.gameMapping.get(gameId);
    if (!game) {
      return false;
    }

    const normalized = this.normalizeTitle(alias);
    
    // 별칭 배열에서 제거
    const aliasIndex = game.aliases.findIndex(a => this.normalizeTitle(a) === normalized);
    if (aliasIndex === -1) {
      return false;
    }

    game.aliases.splice(aliasIndex, 1);
    this.aliasMapping.delete(normalized);
    
    // 캐시 무효화
    this.searchCache.clear();
    
    this.log(`별칭 제거됨: "${alias}" (게임: ${game.titleKorean})`);
    return true;
  }

  /**
   * 액세스 통계 업데이트
   */
  private updateAccessStats(gameId: GameId): void {
    const current = this.accessStats.get(gameId) || { count: 0, lastAccess: 0 };
    current.count++;
    current.lastAccess = Date.now();
    this.accessStats.set(gameId, current);
  }

  /**
   * 서비스 통계 조회
   */
  public getStats(): GameMappingStats {
    const gamesWithTerms = Array.from(this.gameMapping.values())
      .filter(game => game.hasTermsData).length;

    const recentlyAccessed = Array.from(this.accessStats.entries())
      .map(([gameId, stats]) => {
        const game = this.gameMapping.get(gameId);
        return {
          gameId,
          title: game?.titleKorean || '알 수 없음',
          accessCount: stats.count,
          lastAccessed: stats.lastAccess
        };
      })
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, 10);

    const cacheStats = this.searchCache.getStats();

    return {
      totalGames: this.gameMapping.size,
      gamesWithTerms,
      cacheHitRate: cacheStats.hitRate,
      recentlyAccessed
    };
  }

  /**
   * 캐시 클리어
   */
  public clearCache(): void {
    this.searchCache.clear();
    this.gameCache.clear();
    this.log('캐시 클리어됨');
  }

  /**
   * 서비스 재초기화
   */
  public async reinitialize(): Promise<void> {
    this.initialized = false;
    this.clearCache();
    this.accessStats.clear();
    await this.initialize();
  }

  /**
   * 디버그 로깅
   */
  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[GameMappingService] ${message}`);
    }
  }

  /**
   * 서비스 상태 확인
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 전체 게임 목록 조회
   */
  public getAllGames(): GameInfo[] {
    return Array.from(this.gameMapping.values());
  }

  /**
   * 게임 수 조회
   */
  public getGameCount(): number {
    return this.gameMapping.size;
  }

  /**
   * 배치 처리: 여러 게임 정보를 한번에 조회 (Phase 3.2)
   */
  public getGamesByIds(gameIds: GameId[]): Map<GameId, GameInfo | null> {
    const results = new Map<GameId, GameInfo | null>();
    
    for (const id of gameIds) {
      results.set(id, this.getGameById(id));
    }
    
    this.log(`배치 조회: ${gameIds.length}개 게임`);
    return results;
  }

  /**
   * 지연 로딩: 게임별 용어 데이터 포함 조회 (Phase 3.2)
   */
  public async getGameWithTerms(gameId: GameId): Promise<(GameInfo & { terms?: any }) | null> {
    const game = this.getGameById(gameId);
    if (!game) {
      return null;
    }

    // 용어 데이터가 필요한 경우에만 로드
    if (game.hasTermsData) {
      try {
        const response = await fetch(`/data/game-terms-json/${gameId}_${game.titleEnglish?.replace(/\s+/g, '') || 'Game'}.json`);
        if (response.ok) {
          const terms = await response.json();
          this.log(`용어 데이터 로드: ${game.titleKorean}`);
          return { ...game, terms };
        }
      } catch (error) {
        this.log(`용어 데이터 로드 실패: ${game.titleKorean}`);
      }
    }

    return game;
  }

  /**
   * 캐시 통계 조회 (성능 모니터링)
   */
  public getCacheStats(): {
    searchCache: { hitRate: number; size: number };
    gameCache: { hitRate: number; size: number };
    totalAccessCount: number;
  } {
    const searchStats = this.searchCache.getStats();
    const gameStats = this.gameCache.getStats();
    const totalAccessCount = Array.from(this.accessStats.values())
      .reduce((sum, stats) => sum + stats.count, 0);

    return {
      searchCache: searchStats,
      gameCache: gameStats,
      totalAccessCount
    };
  }
} 
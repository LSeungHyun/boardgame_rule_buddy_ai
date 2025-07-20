/**
 * 게임 매핑 시스템을 위한 TypeScript 인터페이스 정의
 * 중앙 집중화된 게임 정보 관리 및 타입 안전성 확보
 */

/**
 * 개별 게임 정보 인터페이스
 */
export interface GameInfo {
  /** 게임 고유 ID */
  id: number;
  
  /** 한국어 게임 제목 */
  titleKorean: string;
  
  /** 영어 게임 제목 (선택사항) */
  titleEnglish?: string;
  
  /** 게임명 별칭들 (대소문자, 띄어쓰기 변형 포함) */
  aliases: string[];
  
  /** 게임별 용어 데이터 존재 여부 */
  hasTermsData: boolean;
  
  /** 게임 카테고리 (선택사항) */
  category?: string;
  
  /** 게임 복잡도 (선택사항) */
  complexity?: 'light' | 'medium' | 'heavy';
  
  /** 플레이어 수 (선택사항) */
  playerCount?: {
    min: number;
    max: number;
  };
  
  /** 플레이 시간 (분, 선택사항) */
  playTime?: number;
  
  /** 최소 권장 연령 (선택사항) */
  minAge?: number;
}

/**
 * 게임 매핑 설정 인터페이스
 */
export interface GameMappingConfig {
  /** 메타데이터 */
  metadata: {
    /** 설정 버전 */
    version: string;
    
    /** 마지막 업데이트 시간 */
    lastUpdated: string;
    
    /** 총 게임 수 */
    totalGames: number;
    
    /** 설정 설명 */
    description?: string;
  };
  
  /** 게임 정보 배열 */
  games: GameInfo[];
}

/**
 * 게임 검색 결과 인터페이스
 */
export interface GameSearchResult {
  /** 검색된 게임 정보 */
  game: GameInfo;
  
  /** 매칭 신뢰도 (0-1) */
  confidence: number;
  
  /** 매칭된 별칭 또는 제목 */
  matchedTerm: string;
  
  /** 매칭 타입 */
  matchType: 'exact' | 'alias' | 'fuzzy';
}

/**
 * 게임 매핑 서비스 초기화 옵션
 */
export interface GameMappingOptions {
  /** 캐시 최대 크기 */
  maxCacheSize?: number;
  
  /** 캐시 TTL (밀리초) */
  cacheTTL?: number;
  
  /** 디버그 모드 */
  debug?: boolean;
  
  /** 자동 초기화 여부 */
  autoInitialize?: boolean;
}

/**
 * 게임 매핑 통계 인터페이스
 */
export interface GameMappingStats {
  /** 총 게임 수 */
  totalGames: number;
  
  /** 용어 데이터가 있는 게임 수 */
  gamesWithTerms: number;
  
  /** 캐시 히트율 */
  cacheHitRate: number;
  
  /** 최근 조회 게임들 */
  recentlyAccessed: Array<{
    gameId: number;
    title: string;
    accessCount: number;
    lastAccessed: number;
  }>;
}

/**
 * 게임 별칭 추가 요청 인터페이스
 */
export interface AddAliasRequest {
  /** 게임 ID */
  gameId: number;
  
  /** 추가할 별칭 */
  alias: string;
  
  /** 별칭 타입 */
  type?: 'official' | 'community' | 'localized';
}

/**
 * 게임 매핑 에러 타입
 */
export enum GameMappingErrorType {
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  INVALID_GAME_ID = 'INVALID_GAME_ID',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  DATA_LOAD_FAILED = 'DATA_LOAD_FAILED',
  CACHE_ERROR = 'CACHE_ERROR'
}

/**
 * 게임 매핑 에러 클래스
 */
export class GameMappingError extends Error {
  constructor(
    message: string,
    public type: GameMappingErrorType,
    public gameId?: number,
    public searchTerm?: string
  ) {
    super(message);
    this.name = 'GameMappingError';
  }
}

/**
 * 유틸리티 타입들
 */

/** 게임 ID 타입 (양의 정수) */
export type GameId = number;

/** 게임 제목 타입 */
export type GameTitle = string;

/** 정규화된 제목 타입 */
export type NormalizedTitle = string;

/** 별칭 매핑 타입 */
export type AliasMapping = Map<NormalizedTitle, GameId>;

/** 게임 데이터 매핑 타입 */
export type GameMapping = Map<GameId, GameInfo>;

/**
 * 상수 정의
 */
export const GAME_MAPPING_CONSTANTS = {
  /** 기본 캐시 크기 */
  DEFAULT_CACHE_SIZE: 100,
  
  /** 기본 캐시 TTL (1시간) */
  DEFAULT_CACHE_TTL: 60 * 60 * 1000,
  
  /** 최소 제목 길이 */
  MIN_TITLE_LENGTH: 1,
  
  /** 최대 제목 길이 */
  MAX_TITLE_LENGTH: 100,
  
  /** 퍼지 매칭 임계값 */
  FUZZY_MATCH_THRESHOLD: 0.8,
  
  /** 지원되는 게임 데이터 버전 */
  SUPPORTED_DATA_VERSIONS: ['1.0.0', '1.1.0'] as const
} as const;

/**
 * 타입 가드 함수들
 */

/**
 * 유효한 게임 ID인지 확인
 */
export function isValidGameId(id: unknown): id is GameId {
  return typeof id === 'number' && id > 0 && Number.isInteger(id);
}

/**
 * 유효한 GameInfo 객체인지 확인
 */
export function isValidGameInfo(obj: unknown): obj is GameInfo {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const game = obj as any;
  return (
    isValidGameId(game.id) &&
    typeof game.titleKorean === 'string' &&
    game.titleKorean.length > 0 &&
    Array.isArray(game.aliases) &&
    typeof game.hasTermsData === 'boolean'
  );
}

/**
 * 유효한 GameMappingConfig 객체인지 확인
 */
export function isValidGameMappingConfig(obj: unknown): obj is GameMappingConfig {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const config = obj as any;
  return (
    typeof config.metadata === 'object' &&
    typeof config.metadata.version === 'string' &&
    typeof config.metadata.lastUpdated === 'string' &&
    typeof config.metadata.totalGames === 'number' &&
    Array.isArray(config.games) &&
    config.games.every(isValidGameInfo)
  );
} 
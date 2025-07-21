// 유틸리티 타입들

import { ConversationContext, QuestionHistoryItem, ContextAnalysis, IntentAnalysis } from './conversation';
import { ChatMessage } from './game';

/**
 * 타입 변환 유틸리티들
 */

// ChatMessage를 QuestionHistoryItem으로 변환하는 헬퍼 타입
export interface ChatToHistoryConverter {
  convertToHistory(
    message: ChatMessage,
    sessionId: string,
    turnNumber: number,
    topic: string
  ): Omit<QuestionHistoryItem, 'id' | 'timestamp'>;
}

// 데이터베이스 행을 도메인 객체로 변환하는 헬퍼 타입
export interface DatabaseMapper<TDatabase, TDomain> {
  toDomain(dbRow: TDatabase): TDomain;
  toDatabase(domain: TDomain): Partial<TDatabase>;
}

/**
 * 조건부 타입들
 */

// 필수 필드만 추출
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// 선택적 필드만 추출
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// 읽기 전용 버전
export type ReadonlyDeep<T> = {
  readonly [P in keyof T]: T[P] extends object ? ReadonlyDeep<T[P]> : T[P];
};

/**
 * API 관련 유틸리티 타입들
 */

// API 응답 래퍼
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// API 요청 옵션
export interface ApiRequestOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  headers?: Record<string, string>;
}

/**
 * 상태 관리 관련 타입들
 */

// 로딩 상태
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 비동기 상태
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// 캐시 상태
export interface CacheState<T> {
  data: T;
  timestamp: Date;
  ttl: number;
  hits: number;
}

/**
 * 이벤트 관련 타입들
 */

// 이벤트 핸들러
export type EventHandler<T = void> = (data: T) => void | Promise<void>;

// 이벤트 리스너
export interface EventListener<T> {
  event: string;
  handler: EventHandler<T>;
  once?: boolean;
}

/**
 * 검증 관련 타입들
 */

// 검증 결과
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// 검증 규칙
export interface ValidationRule<T> {
  name: string;
  validate: (value: T) => ValidationResult;
  required?: boolean;
}

/**
 * 성능 관련 타입들
 */

// 성능 메트릭
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

// 벤치마크 결과
export interface BenchmarkResult {
  operation: string;
  duration: number;
  iterations: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
}

/**
 * 로깅 관련 타입들
 */

// 로그 레벨
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// 로그 엔트리
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

/**
 * 설정 관련 타입들
 */

// 환경 설정
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL: string;
  API_BASE_URL: string;
  LOG_LEVEL: LogLevel;
  CACHE_TTL: number;
}

// 기능 플래그
export interface FeatureFlags {
  contextTracking: boolean;
  webResearch: boolean;
  advancedAnalytics: boolean;
  experimentalFeatures: boolean;
}

/**
 * 테스트 관련 타입들
 */

// 테스트 케이스
export interface TestCase<TInput, TExpected> {
  name: string;
  input: TInput;
  expected: TExpected;
  description?: string;
  tags?: string[];
}

// 모킹 옵션
export interface MockOptions<T> {
  returnValue?: T;
  throwError?: Error;
  delay?: number;
  callCount?: number;
}

/**
 * 타입 안전성 헬퍼들
 */

// 키 추출
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// 값 추출
export type ValuesOfType<T, U> = T[KeysOfType<T, U>];

// 중첩 키 경로
export type NestedKeyOf<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
    : `${K}`;
}[keyof T & (string | number)];

// 부분 업데이트
export type PartialUpdate<T> = {
  [K in keyof T]?: T[K] extends object ? PartialUpdate<T[K]> : T[K];
};
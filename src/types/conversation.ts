// 대화 맥락 추적 시스템 타입 정의

/**
 * 대화 세션 컨텍스트
 */
export interface ConversationContext {
  sessionId: string;
  userId?: string;
  currentTopic: string;
  gameContext?: string;
  topicStartTurn: number;
  questionHistory: QuestionHistoryItem[];
  lastUpdated: Date;
}

/**
 * 질문 히스토리 아이템
 */
export interface QuestionHistoryItem {
  id: string;
  sessionId: string;
  turnNumber: number;
  question: string;
  answer: string;
  topic: string;
  confidence: number;
  wasResearched: boolean;
  contextAnalysis?: ContextAnalysis;
  intentAnalysis?: IntentAnalysis;
  timestamp: Date;
}

/**
 * 맥락 분석 결과
 */
export interface ContextAnalysis {
  currentTopic: string;
  relatedToHistory: boolean;
  referenceType: 'direct' | 'implicit' | 'none';
  referencedTurn?: number;
  confidence: number;
  keywords: string[];
  topicContinuity: number; // 0-1, 주제 연속성 점수
}

/**
 * 의도 파악 결과
 */
export interface IntentAnalysis {
  primaryIntent: 'question' | 'correction' | 'clarification' | 'followup';
  isChallengingPreviousAnswer: boolean;
  referencedAnswer?: QuestionHistoryItem;
  implicitContext: string[];
  confidence: number;
  correctionPatterns?: string[]; // 감지된 수정 요청 패턴
}

/**
 * 일관성 검증 결과
 */
export interface ConsistencyCheck {
  isConsistent: boolean;
  conflictingAnswers: QuestionHistoryItem[];
  confidenceLevel: 'high' | 'medium' | 'low';
  recommendsResearch: boolean;
  errorType?: 'factual' | 'contextual' | 'logical';
  conflictDetails?: string;
}

/**
 * Supabase 테이블 매핑 타입들
 */

// conversation_sessions 테이블
export interface ConversationSession {
  id: string;
  session_id: string;
  user_id?: string;
  current_topic?: string;
  game_context?: string;
  topic_start_turn: number;
  created_at: string;
  updated_at: string;
}

// question_history 테이블
export interface QuestionHistory {
  id: string;
  session_id: string;
  turn_number: number;
  question: string;
  answer: string;
  topic?: string;
  confidence: number;
  was_researched: boolean;
  context_analysis?: ContextAnalysis;
  intent_analysis?: IntentAnalysis;
  created_at: string;
}

/**
 * 세션 관리 관련 타입들
 */

// 세션 캐시 설정
export interface SessionCacheConfig {
  maxSessions: number;
  ttl: number; // milliseconds
  cleanupInterval: number; // milliseconds
}

// 세션 정리 정책
export interface SessionCleanupPolicy {
  memoryTTL: number;        // 30분 (메모리 캐시)
  databaseTTL: number;      // 7일 (데이터베이스)
  maxSessionsPerUser: number; // 사용자당 최대 10개 세션
  cleanupInterval: number;   // 매일 자정 정리
}

// 세션 통계
export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  averageQuestionsPerSession: number;
  topTopics: Array<{ topic: string; count: number }>;
  cacheHitRate: number;
}

/**
 * 오류 복구 관련 타입들
 */

// 오류 복구 인터페이스
export interface ErrorRecovery {
  acknowledgeError(): string;
  requestCorrection(): Promise<string>;
  updateHistory(correction: string): Promise<void>;
  preventSimilarErrors(): void;
}

// 오류 패턴
export interface ErrorPattern {
  pattern: string;
  frequency: number;
  lastOccurrence: Date;
  correctionStrategy: string;
}

/**
 * 맥락 로깅 관련 타입들
 */

// 맥락 로그
export interface ContextLog {
  sessionId: string;
  turn: number;
  contextAccuracy: number;
  intentRecognitionSuccess: boolean;
  errorDetected: boolean;
  userSatisfaction?: number;
  timestamp: Date;
}

// 성능 메트릭
export interface ContextPerformanceMetrics {
  contextTrackingAccuracy: number;
  intentRecognitionRate: number;
  errorDetectionRate: number;
  averageResponseTime: number;
  cacheEfficiency: number;
}

/**
 * API 응답 타입들
 */

// 맥락 분석 API 응답
export interface ContextAnalysisResponse {
  success: boolean;
  data?: {
    context: ConversationContext;
    analysis: ContextAnalysis;
    intent: IntentAnalysis;
    consistency: ConsistencyCheck;
  };
  error?: {
    code: string;
    message: string;
  };
}

// 세션 복원 API 응답
export interface SessionRestoreResponse {
  success: boolean;
  data?: {
    context: ConversationContext;
    restored: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 유틸리티 타입들
 */

// 복잡도 점수
export type ComplexityScore = {
  score: number;
  factors: string[];
  threshold: number;
  requiresResearch: boolean;
};

// 주제 전환 감지 결과
export type TopicChangeDetection = {
  hasChanged: boolean;
  newTopic: string;
  confidence: number;
  reason: string;
};

// 세션 상태
export type SessionStatus = 'active' | 'idle' | 'expired' | 'archived';

// 맥락 추적 상태
export type ContextTrackingStatus = 'enabled' | 'disabled' | 'error';
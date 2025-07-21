// Supabase 데이터베이스 타입 정의

import { ContextAnalysis, IntentAnalysis } from './conversation';

/**
 * 실제 사용되는 테이블들의 타입 정의
 */

// games 테이블
export interface DatabaseGame {
  id: string;
  title: string;
  description?: string;
  publisher?: string;
  min_players?: number;
  max_players?: number;
  play_time?: number;
  complexity?: number;
  rulebook_url?: string;
  qr_code?: string;
  difficulty?: string;
  game_id?: number;
  created_at: string;
  updated_at: string;
}

// feedback_logs 테이블
export interface DatabaseFeedbackLog {
  id: string;
  message_id: string;
  feedback_type: 'helpful' | 'unhelpful';
  game_id: string;
  question: string;
  answer: string;
  feedback_reason?: string;
  created_at: string;
  updated_at: string;
}

// performance_metrics 테이블
export interface DatabasePerformanceMetric {
  id: string;
  date: string;
  game_id: string;
  total_feedbacks: number;
  helpful_count: number;
  unhelpful_count: number;
  helpful_rate: number;
  created_at: string;
  updated_at: string;
}

// game_analytics 테이블
export interface DatabaseGameAnalytic {
  id: string;
  game_id: string;
  total_feedbacks: number;
  helpful_count: number;
  unhelpful_count: number;
  helpful_rate: number;
  last_feedback_at?: string;
  created_at: string;
  updated_at: string;
}

// conversation_sessions 테이블
export interface DatabaseConversationSession {
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
export interface DatabaseQuestionHistory {
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
 * 데이터베이스 삽입/업데이트용 타입들 (Insert/Update types)
 */

// conversation_sessions 삽입용
export interface InsertConversationSession {
  session_id: string;
  user_id?: string;
  current_topic?: string;
  game_context?: string;
  topic_start_turn?: number;
}

// conversation_sessions 업데이트용
export interface UpdateConversationSession {
  current_topic?: string;
  game_context?: string;
  topic_start_turn?: number;
}

// question_history 삽입용
export interface InsertQuestionHistory {
  session_id: string;
  turn_number: number;
  question: string;
  answer: string;
  topic?: string;
  confidence?: number;
  was_researched?: boolean;
  context_analysis?: ContextAnalysis;
  intent_analysis?: IntentAnalysis;
}

// feedback_logs 삽입용
export interface InsertFeedbackLog {
  message_id: string;
  feedback_type: 'helpful' | 'unhelpful';
  game_id: string;
  question: string;
  answer: string;
  feedback_reason?: string;
}

/**
 * 쿼리 필터 타입들
 */

// 세션 필터
export interface SessionFilter {
  userId?: string;
  gameContext?: string;
  topic?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// 질문 히스토리 필터
export interface QuestionHistoryFilter {
  sessionId?: string;
  topic?: string;
  wasResearched?: boolean;
  confidenceRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: string;
    end: string;
  };
}

// 피드백 필터
export interface FeedbackFilter {
  gameId?: string;
  feedbackType?: 'helpful' | 'unhelpful';
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * 집계 쿼리 결과 타입들
 */

// 세션 통계
export interface SessionStatistics {
  totalSessions: number;
  activeSessions: number;
  averageQuestionsPerSession: number;
  topTopics: Array<{
    topic: string;
    count: number;
    percentage: number;
  }>;
  sessionsByDate: Array<{
    date: string;
    count: number;
  }>;
}

// 질문 통계
export interface QuestionStatistics {
  totalQuestions: number;
  researchedQuestions: number;
  researchRate: number;
  averageConfidence: number;
  topicDistribution: Array<{
    topic: string;
    count: number;
    averageConfidence: number;
  }>;
}

// 피드백 통계
export interface FeedbackStatistics {
  totalFeedbacks: number;
  helpfulCount: number;
  unhelpfulCount: number;
  helpfulRate: number;
  gameBreakdown: Array<{
    gameId: string;
    totalFeedbacks: number;
    helpfulRate: number;
  }>;
}

/**
 * 데이터베이스 오류 타입들
 */

export interface DatabaseError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

export interface DatabaseResponse<T> {
  data: T | null;
  error: DatabaseError | null;
  count?: number;
}

/**
 * 페이지네이션 타입들
 */

export interface PaginationOptions {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  error?: DatabaseError;
}

/**
 * 실시간 구독 타입들
 */

export type DatabaseChangeType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface DatabaseChange<T> {
  eventType: DatabaseChangeType;
  new: T | null;
  old: T | null;
  table: string;
  timestamp: string;
}

export interface SubscriptionOptions {
  table: string;
  event?: DatabaseChangeType | '*';
  filter?: string;
}

/**
 * 트랜잭션 타입들
 */

export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  timeout?: number;
}

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: DatabaseError;
}
import { supabase } from './supabase';
import { SessionCache } from './session-cache';
import {
  ConversationContext,
  SessionCleanupPolicy,
  SessionStatus,
  DatabaseConversationSession,
  SessionFilter
} from '@/types';

/**
 * 세션 생명주기 관리자
 * 세션의 생성, 복원, 정리 등 전체 생명주기를 관리합니다.
 */
export class SessionManager {
  private static instance: SessionManager;
  private sessionCache: SessionCache;
  private cleanupTimer?: NodeJS.Timeout;

  private readonly cleanupPolicy: SessionCleanupPolicy = {
    memoryTTL: 30 * 60 * 1000,      // 30분 (메모리 캐시)
    databaseTTL: 7 * 24 * 60 * 60 * 1000, // 7일 (데이터베이스)
    maxSessionsPerUser: 10,          // 사용자당 최대 10개 세션
    cleanupInterval: 24 * 60 * 60 * 1000   // 매일 정리
  };

  private constructor() {
    this.sessionCache = SessionCache.getInstance();
    this.startCleanupScheduler();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * 세션 복원
   */
  async restoreSession(userId?: string, sessionId?: string): Promise<ConversationContext | null> {
    try {
      // 1. 특정 세션 ID로 복원
      if (sessionId) {
        return await this.restoreSpecificSession(sessionId);
      }

      // 2. 사용자의 최근 세션 복원
      if (userId) {
        return await this.restoreRecentUserSession(userId);
      }

      return null;

    } catch (error) {
      console.error('Error restoring session:', error);
      return null;
    }
  }

  /**
   * 특정 세션 복원
   */
  private async restoreSpecificSession(sessionId: string): Promise<ConversationContext | null> {
    // 1. 캐시에서 먼저 확인
    const cached = this.sessionCache.get(sessionId);
    if (cached) {
      return cached;
    }

    // 2. 데이터베이스에서 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      return null;
    }

    // 3. TTL 확인
    if (!this.isWithinTTL(sessionData)) {
      return null;
    }

    // 4. 질문 히스토리 조회
    const { data: historyData, error: historyError } = await supabase
      .from('question_history')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn_number', { ascending: true });

    if (historyError) {
      console.error('Failed to fetch question history:', historyError);
      return null;
    }

    // 5. 컨텍스트 구성 및 캐시 저장
    const context = this.buildContextFromDb(sessionData, historyData || []);
    this.sessionCache.set(sessionId, context);

    return context;
  }

  /**
   * 사용자의 최근 세션 복원
   */
  private async restoreRecentUserSession(userId: string): Promise<ConversationContext | null> {
    const { data: recentSession, error } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !recentSession) {
      return null;
    }

    if (!this.isWithinTTL(recentSession)) {
      return null;
    }

    return await this.restoreSpecificSession(recentSession.session_id);
  }

  /**
   * 세션 아카이브
   */
  async archiveSession(sessionId: string): Promise<boolean> {
    try {
      // 1. 캐시에서 제거
      this.sessionCache.delete(sessionId);

      // 2. 데이터베이스에서 아카이브 마킹 (실제로는 updated_at 업데이트)
      const { error } = await supabase
        .from('conversation_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('session_id', sessionId);

      return !error;

    } catch (error) {
      console.error('Error archiving session:', error);
      return false;
    }
  }

  /**
   * 만료된 세션 자동 정리
   */
  async cleanupExpiredSessions(): Promise<{
    deletedSessions: number;
    deletedHistory: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deletedSessions = 0;
    let deletedHistory = 0;

    try {
      // 1. 만료된 세션 조회
      const cutoffDate = new Date(Date.now() - this.cleanupPolicy.databaseTTL);
      
      const { data: expiredSessions, error: selectError } = await supabase
        .from('conversation_sessions')
        .select('session_id')
        .lt('updated_at', cutoffDate.toISOString());

      if (selectError) {
        errors.push(`Failed to query expired sessions: ${selectError.message}`);
        return { deletedSessions: 0, deletedHistory: 0, errors };
      }

      if (!expiredSessions || expiredSessions.length === 0) {
        return { deletedSessions: 0, deletedHistory: 0, errors: [] };
      }

      const sessionIds = expiredSessions.map(s => s.session_id);

      // 2. 질문 히스토리 삭제 (외래키 제약으로 인해 먼저 삭제)
      const { error: historyError, count: historyCount } = await supabase
        .from('question_history')
        .delete()
        .in('session_id', sessionIds);

      if (historyError) {
        errors.push(`Failed to delete question history: ${historyError.message}`);
      } else {
        deletedHistory = historyCount || 0;
      }

      // 3. 세션 삭제
      const { error: sessionError, count: sessionCount } = await supabase
        .from('conversation_sessions')
        .delete()
        .in('session_id', sessionIds);

      if (sessionError) {
        errors.push(`Failed to delete sessions: ${sessionError.message}`);
      } else {
        deletedSessions = sessionCount || 0;
      }

      // 4. 메모리 캐시에서도 제거
      for (const sessionId of sessionIds) {
        this.sessionCache.delete(sessionId);
      }

      console.log(`Cleanup completed: ${deletedSessions} sessions, ${deletedHistory} history items deleted`);

    } catch (error) {
      errors.push(`Cleanup error: ${error}`);
    }

    return { deletedSessions, deletedHistory, errors };
  }

  /**
   * 사용자별 세션 한계 관리
   */
  async enforceUserSessionLimit(userId: string): Promise<number> {
    try {
      // 1. 사용자의 모든 세션 조회 (최신순)
      const { data: userSessions, error } = await supabase
        .from('conversation_sessions')
        .select('session_id, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error || !userSessions) {
        return 0;
      }

      // 2. 한계 초과 확인
      if (userSessions.length <= this.cleanupPolicy.maxSessionsPerUser) {
        return 0;
      }

      // 3. 오래된 세션들 삭제
      const sessionsToDelete = userSessions.slice(this.cleanupPolicy.maxSessionsPerUser);
      const sessionIdsToDelete = sessionsToDelete.map(s => s.session_id);

      // 4. 질문 히스토리 먼저 삭제
      await supabase
        .from('question_history')
        .delete()
        .in('session_id', sessionIdsToDelete);

      // 5. 세션 삭제
      const { count } = await supabase
        .from('conversation_sessions')
        .delete()
        .in('session_id', sessionIdsToDelete);

      // 6. 캐시에서도 제거
      for (const sessionId of sessionIdsToDelete) {
        this.sessionCache.delete(sessionId);
      }

      return count || 0;

    } catch (error) {
      console.error('Error enforcing user session limit:', error);
      return 0;
    }
  }

  /**
   * 세션 상태 조회
   */
  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    // 1. 캐시 확인
    if (this.sessionCache.has(sessionId)) {
      return 'active';
    }

    // 2. 데이터베이스 확인
    const { data: sessionData, error } = await supabase
      .from('conversation_sessions')
      .select('updated_at')
      .eq('session_id', sessionId)
      .single();

    if (error || !sessionData) {
      return 'expired';
    }

    // 3. TTL 확인
    if (!this.isWithinTTL(sessionData)) {
      return 'expired';
    }

    // 4. 최근 활동 확인
    const lastActivity = new Date(sessionData.updated_at);
    const now = new Date();
    const timeDiff = now.getTime() - lastActivity.getTime();

    if (timeDiff > this.cleanupPolicy.memoryTTL) {
      return 'idle';
    }

    return 'active';
  }

  /**
   * 세션 통계 조회
   */
  async getSessionStatistics(filter?: SessionFilter) {
    try {
      let query = supabase
        .from('conversation_sessions')
        .select('*');

      // 필터 적용
      if (filter?.userId) {
        query = query.eq('user_id', filter.userId);
      }
      if (filter?.gameContext) {
        query = query.eq('game_context', filter.gameContext);
      }
      if (filter?.dateRange) {
        query = query
          .gte('created_at', filter.dateRange.start)
          .lte('created_at', filter.dateRange.end);
      }

      const { data: sessions, error } = await query;
      if (error) throw error;

      // 통계 계산
      const totalSessions = sessions?.length || 0;
      const activeSessions = this.sessionCache.size();
      
      // 주제별 분포
      const topicCounts = new Map<string, number>();
      sessions?.forEach(session => {
        const topic = session.current_topic || '미분류';
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });

      const topTopics = Array.from(topicCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([topic, count]) => ({
          topic,
          count,
          percentage: Math.round((count / totalSessions) * 100)
        }));

      // 일별 세션 수
      const sessionsByDate = this.groupSessionsByDate(sessions || []);

      return {
        totalSessions,
        activeSessions,
        averageQuestionsPerSession: await this.calculateAverageQuestions(),
        topTopics,
        sessionsByDate
      };

    } catch (error) {
      console.error('Error getting session statistics:', error);
      return null;
    }
  }

  /**
   * TTL 확인
   */
  private isWithinTTL(sessionData: DatabaseConversationSession): boolean {
    const lastUpdate = new Date(sessionData.updated_at);
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdate.getTime();
    
    return timeDiff < this.cleanupPolicy.databaseTTL;
  }

  /**
   * 데이터베이스 데이터로부터 컨텍스트 구성
   */
  private buildContextFromDb(
    sessionData: DatabaseConversationSession,
    historyData: any[]
  ): ConversationContext {
    return {
      sessionId: sessionData.session_id,
      userId: sessionData.user_id || undefined,
      currentTopic: sessionData.current_topic || '',
      gameContext: sessionData.game_context || undefined,
      topicStartTurn: sessionData.topic_start_turn,
      questionHistory: historyData.map(h => ({
        id: h.id,
        sessionId: h.session_id,
        turnNumber: h.turn_number,
        question: h.question,
        answer: h.answer,
        topic: h.topic || '',
        confidence: h.confidence,
        wasResearched: h.was_researched,
        contextAnalysis: h.context_analysis,
        intentAnalysis: h.intent_analysis,
        timestamp: new Date(h.created_at)
      })),
      lastUpdated: new Date(sessionData.updated_at)
    };
  }

  /**
   * 평균 질문 수 계산
   */
  private async calculateAverageQuestions(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('question_history')
        .select('session_id');

      if (error || !data) return 0;

      const sessionQuestionCounts = new Map<string, number>();
      data.forEach(item => {
        const count = sessionQuestionCounts.get(item.session_id) || 0;
        sessionQuestionCounts.set(item.session_id, count + 1);
      });

      const totalQuestions = Array.from(sessionQuestionCounts.values()).reduce((sum, count) => sum + count, 0);
      const totalSessions = sessionQuestionCounts.size;

      return totalSessions > 0 ? Math.round((totalQuestions / totalSessions) * 100) / 100 : 0;

    } catch (error) {
      console.error('Error calculating average questions:', error);
      return 0;
    }
  }

  /**
   * 세션을 날짜별로 그룹화
   */
  private groupSessionsByDate(sessions: DatabaseConversationSession[]) {
    const dateGroups = new Map<string, number>();
    
    sessions.forEach(session => {
      const date = new Date(session.created_at).toISOString().split('T')[0];
      dateGroups.set(date, (dateGroups.get(date) || 0) + 1);
    });

    return Array.from(dateGroups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }

  /**
   * 정리 스케줄러 시작
   */
  private startCleanupScheduler(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
        this.sessionCache.cleanup();
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, this.cleanupPolicy.cleanupInterval);
  }

  /**
   * 정리 스케줄러 중지
   */
  stopCleanupScheduler(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 설정 업데이트
   */
  updateCleanupPolicy(newPolicy: Partial<SessionCleanupPolicy>): void {
    Object.assign(this.cleanupPolicy, newPolicy);
    
    // 스케줄러 재시작 (interval이 변경된 경우)
    if (newPolicy.cleanupInterval) {
      this.stopCleanupScheduler();
      this.startCleanupScheduler();
    }
  }

  /**
   * 관리자 정보 조회
   */
  getManagerInfo() {
    return {
      cleanupPolicy: this.cleanupPolicy,
      cacheStats: this.sessionCache.getStats(),
      performanceMetrics: this.sessionCache.getPerformanceMetrics(),
      isCleanupRunning: !!this.cleanupTimer
    };
  }

  /**
   * 소멸자
   */
  destroy(): void {
    this.stopCleanupScheduler();
    this.sessionCache.destroy();
  }
}
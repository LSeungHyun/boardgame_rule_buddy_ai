import {
  ConversationContext,
  SessionCacheConfig,
  SessionStats,
  CacheState
} from '@/types';

/**
 * LRU 기반 세션 캐시 시스템
 * 메모리 효율성과 성능을 위한 세션 데이터 캐싱
 */
export class SessionCache {
  private static instance: SessionCache;
  private cache = new Map<string, CacheState<ConversationContext>>();
  private accessOrder = new Map<string, number>(); // LRU 추적용
  private accessCounter = 0;
  
  private readonly config: SessionCacheConfig = {
    maxSessions: 1000,
    ttl: 30 * 60 * 1000, // 30분
    cleanupInterval: 5 * 60 * 1000 // 5분마다 정리
  };

  // 성능 메트릭
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    cleanups: 0,
    totalRequests: 0
  };

  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    this.startCleanupTimer();
  }

  static getInstance(): SessionCache {
    if (!SessionCache.instance) {
      SessionCache.instance = new SessionCache();
    }
    return SessionCache.instance;
  }

  /**
   * 캐시에서 세션 조회
   */
  get(sessionId: string): ConversationContext | null {
    this.metrics.totalRequests++;
    
    const cached = this.cache.get(sessionId);
    if (!cached) {
      this.metrics.misses++;
      return null;
    }

    // TTL 확인
    if (this.isExpired(cached)) {
      this.cache.delete(sessionId);
      this.accessOrder.delete(sessionId);
      this.metrics.misses++;
      return null;
    }

    // 액세스 순서 업데이트 (LRU)
    this.accessOrder.set(sessionId, ++this.accessCounter);
    cached.hits++;
    
    this.metrics.hits++;
    return cached.data;
  }

  /**
   * 캐시에 세션 저장
   */
  set(sessionId: string, context: ConversationContext): void {
    // 캐시 크기 제한 확인
    if (this.cache.size >= this.config.maxSessions && !this.cache.has(sessionId)) {
      this.evictLRU();
    }

    const cacheState: CacheState<ConversationContext> = {
      data: { ...context }, // 깊은 복사 방지를 위한 얕은 복사
      timestamp: new Date(),
      ttl: this.config.ttl,
      hits: 0
    };

    this.cache.set(sessionId, cacheState);
    this.accessOrder.set(sessionId, ++this.accessCounter);
  }

  /**
   * 캐시에서 세션 삭제
   */
  delete(sessionId: string): boolean {
    const deleted = this.cache.delete(sessionId);
    this.accessOrder.delete(sessionId);
    return deleted;
  }

  /**
   * 캐시 존재 여부 확인
   */
  has(sessionId: string): boolean {
    const cached = this.cache.get(sessionId);
    if (!cached) return false;
    
    if (this.isExpired(cached)) {
      this.cache.delete(sessionId);
      this.accessOrder.delete(sessionId);
      return false;
    }
    
    return true;
  }

  /**
   * 캐시 크기 조회
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 캐시 전체 삭제
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  /**
   * 만료된 항목들 정리
   */
  cleanup(): number {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [sessionId, cached] of this.cache.entries()) {
      if (this.isExpired(cached)) {
        this.cache.delete(sessionId);
        this.accessOrder.delete(sessionId);
        cleanedCount++;
      }
    }

    this.metrics.cleanups++;
    return cleanedCount;
  }

  /**
   * LRU 기반 항목 제거
   */
  private evictLRU(): void {
    let oldestSessionId = '';
    let oldestAccess = Infinity;

    for (const [sessionId, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestSessionId = sessionId;
      }
    }

    if (oldestSessionId) {
      this.cache.delete(oldestSessionId);
      this.accessOrder.delete(oldestSessionId);
      this.metrics.evictions++;
    }
  }

  /**
   * 만료 여부 확인
   */
  private isExpired(cached: CacheState<ConversationContext>): boolean {
    const now = Date.now();
    const cacheTime = cached.timestamp.getTime();
    return (now - cacheTime) > cached.ttl;
  }

  /**
   * 정리 타이머 시작
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 정리 타이머 중지
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): SessionStats {
    const hitRate = this.metrics.totalRequests > 0 
      ? this.metrics.hits / this.metrics.totalRequests 
      : 0;

    // 활성 세션 수 (만료되지 않은 세션)
    let activeSessions = 0;
    for (const cached of this.cache.values()) {
      if (!this.isExpired(cached)) {
        activeSessions++;
      }
    }

    // 평균 질문 수 계산
    let totalQuestions = 0;
    let sessionCount = 0;
    for (const cached of this.cache.values()) {
      if (!this.isExpired(cached)) {
        totalQuestions += cached.data.questionHistory.length;
        sessionCount++;
      }
    }
    const averageQuestionsPerSession = sessionCount > 0 ? totalQuestions / sessionCount : 0;

    // 인기 주제 추출
    const topicCounts = new Map<string, number>();
    for (const cached of this.cache.values()) {
      if (!this.isExpired(cached)) {
        const topic = cached.data.currentTopic;
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    }

    const topTopics = Array.from(topicCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));

    return {
      totalSessions: this.cache.size,
      activeSessions,
      averageQuestionsPerSession,
      topTopics,
      cacheHitRate: hitRate
    };
  }

  /**
   * 성능 메트릭 조회
   */
  getPerformanceMetrics() {
    const hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.hits / this.metrics.totalRequests) * 100 
      : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: this.estimateMemoryUsage(),
      efficiency: this.calculateEfficiency()
    };
  }

  /**
   * 메모리 사용량 추정
   */
  private estimateMemoryUsage(): { estimated: string; sessions: number } {
    const avgSessionSize = 2048; // 대략적인 세션 크기 (bytes)
    const estimatedBytes = this.cache.size * avgSessionSize;
    
    let unit = 'B';
    let size = estimatedBytes;
    
    if (size >= 1024 * 1024) {
      size = size / (1024 * 1024);
      unit = 'MB';
    } else if (size >= 1024) {
      size = size / 1024;
      unit = 'KB';
    }

    return {
      estimated: `${Math.round(size * 100) / 100} ${unit}`,
      sessions: this.cache.size
    };
  }

  /**
   * 캐시 효율성 계산
   */
  private calculateEfficiency(): number {
    if (this.metrics.totalRequests === 0) return 0;
    
    const hitRate = this.metrics.hits / this.metrics.totalRequests;
    const evictionRate = this.metrics.evictions / Math.max(this.metrics.totalRequests, 1);
    const cleanupEfficiency = this.metrics.cleanups > 0 ? 1 - (evictionRate * 0.5) : 1;
    
    return Math.round((hitRate * cleanupEfficiency) * 100);
  }

  /**
   * 캐시 설정 업데이트
   */
  updateConfig(newConfig: Partial<SessionCacheConfig>): void {
    Object.assign(this.config, newConfig);
    
    // 타이머 재시작 (cleanupInterval이 변경된 경우)
    if (newConfig.cleanupInterval) {
      this.stopCleanupTimer();
      this.startCleanupTimer();
    }
  }

  /**
   * 캐시 상태 진단
   */
  diagnose(): {
    health: 'good' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    const stats = this.getStats();
    const metrics = this.getPerformanceMetrics();

    // 히트율 확인
    if (metrics.hitRate < 50) {
      issues.push(`낮은 캐시 히트율: ${metrics.hitRate}%`);
      recommendations.push('TTL 시간을 늘리거나 캐시 크기를 증가시키세요');
    }

    // 메모리 사용량 확인
    if (this.cache.size > this.config.maxSessions * 0.9) {
      issues.push('캐시가 거의 가득참');
      recommendations.push('maxSessions 설정을 늘리거나 TTL을 줄이세요');
    }

    // 제거율 확인
    if (metrics.evictions > metrics.hits * 0.1) {
      issues.push('높은 제거율');
      recommendations.push('캐시 크기를 늘리거나 사용 패턴을 검토하세요');
    }

    // 전체 건강도 평가
    let health: 'good' | 'warning' | 'critical';
    if (issues.length === 0) {
      health = 'good';
    } else if (issues.length <= 2) {
      health = 'warning';
    } else {
      health = 'critical';
    }

    return { health, issues, recommendations };
  }

  /**
   * 인기 세션 조회
   */
  getPopularSessions(limit = 10): Array<{
    sessionId: string;
    hits: number;
    topic: string;
    lastAccess: Date;
  }> {
    const sessions = Array.from(this.cache.entries())
      .filter(([, cached]) => !this.isExpired(cached))
      .map(([sessionId, cached]) => ({
        sessionId,
        hits: cached.hits,
        topic: cached.data.currentTopic,
        lastAccess: cached.timestamp
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);

    return sessions;
  }

  /**
   * 최근 세션 조회
   */
  getRecentSessions(limit = 10): Array<{
    sessionId: string;
    topic: string;
    questionsCount: number;
    lastUpdated: Date;
  }> {
    const sessions = Array.from(this.cache.entries())
      .filter(([, cached]) => !this.isExpired(cached))
      .map(([sessionId, cached]) => ({
        sessionId,
        topic: cached.data.currentTopic,
        questionsCount: cached.data.questionHistory.length,
        lastUpdated: cached.data.lastUpdated
      }))
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      .slice(0, limit);

    return sessions;
  }

  /**
   * 소멸자 (정리)
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}
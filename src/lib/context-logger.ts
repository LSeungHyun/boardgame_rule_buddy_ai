import {
  ContextLog,
  ContextPerformanceMetrics,
  LogLevel,
  LogEntry
} from '@/types';

/**
 * 대화 맥락 추적 시스템 로깅 및 모니터링
 */
export class ContextLogger {
  private static instance: ContextLogger;
  private logs: ContextLog[] = [];
  private performanceMetrics: ContextPerformanceMetrics = {
    contextTrackingAccuracy: 0,
    intentRecognitionRate: 0,
    errorDetectionRate: 0,
    averageResponseTime: 0,
    cacheEfficiency: 0
  };

  private constructor() {}

  static getInstance(): ContextLogger {
    if (!ContextLogger.instance) {
      ContextLogger.instance = new ContextLogger();
    }
    return ContextLogger.instance;
  }

  /**
   * 맥락 로그 기록
   */
  logContext(log: ContextLog): void {
    this.logs.push({
      ...log,
      timestamp: new Date()
    });

    // 최근 1000개만 유지
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    this.updateMetrics();
  }

  /**
   * 성능 메트릭 업데이트
   */
  private updateMetrics(): void {
    if (this.logs.length === 0) return;

    const recentLogs = this.logs.slice(-100); // 최근 100개 기준

    // 맥락 추적 정확도
    const accurateContexts = recentLogs.filter(log => log.contextAccuracy > 0.8).length;
    this.performanceMetrics.contextTrackingAccuracy = accurateContexts / recentLogs.length;

    // 의도 인식률
    const successfulIntents = recentLogs.filter(log => log.intentRecognitionSuccess).length;
    this.performanceMetrics.intentRecognitionRate = successfulIntents / recentLogs.length;

    // 오류 감지율
    const detectedErrors = recentLogs.filter(log => log.errorDetected).length;
    this.performanceMetrics.errorDetectionRate = detectedErrors / recentLogs.length;

    // 평균 응답 시간 (임시 구현)
    this.performanceMetrics.averageResponseTime = 2.5;

    // 캐시 효율성 (임시 구현)
    this.performanceMetrics.cacheEfficiency = 0.75;
  }

  /**
   * 성능 메트릭 조회
   */
  getMetrics(): ContextPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * 로그 통계 조회
   */
  getLogStats() {
    const totalLogs = this.logs.length;
    const recentLogs = this.logs.filter(log => 
      (Date.now() - log.timestamp.getTime()) < (24 * 60 * 60 * 1000)
    );

    return {
      totalLogs,
      recentLogs: recentLogs.length,
      averageAccuracy: this.performanceMetrics.contextTrackingAccuracy,
      errorRate: this.performanceMetrics.errorDetectionRate
    };
  }

  /**
   * 로그 내보내기
   */
  exportLogs(limit = 100): ContextLog[] {
    return this.logs.slice(-limit);
  }

  /**
   * 로그 초기화
   */
  clearLogs(): void {
    this.logs = [];
  }
}
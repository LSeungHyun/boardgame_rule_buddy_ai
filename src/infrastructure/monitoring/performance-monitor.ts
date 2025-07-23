/**
 * 성능 모니터링 시스템
 * Clean Architecture - Infrastructure Layer
 */

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage?: number;
  cacheHitRate?: number;
  errorRate?: number;
  timestamp: Date;
}

export interface PerformanceThresholds {
  responseTime: number; // ms
  memoryUsage: number; // MB
  errorRate: number; // percentage
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 1000;

  private thresholds: PerformanceThresholds = {
    responseTime: 5000, // 5초
    memoryUsage: 500, // 500MB
    errorRate: 5 // 5%
  };

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 성능 메트릭을 기록합니다.
   */
  public recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);

    // 히스토리 크기 제한
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // 임계값 검사
    this.checkThresholds(metrics);

    // 콘솔 로깅 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [Performance Metrics]', {
        responseTime: `${metrics.responseTime}ms`,
        memoryUsage: `${metrics.memoryUsage.toFixed(2)}MB`,
        cacheHitRate: metrics.cacheHitRate ? `${metrics.cacheHitRate.toFixed(1)}%` : 'N/A',
        timestamp: metrics.timestamp.toISOString()
      });
    }
  }

  /**
   * 응답 시간을 측정하는 헬퍼 함수
   */
  public async measureResponseTime<T>(
    operation: () => Promise<T>,
    operationName: string = 'unknown'
  ): Promise<{ result: T; responseTime: number }> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    try {
      const result = await operation();
      const responseTime = performance.now() - startTime;
      const endMemory = this.getMemoryUsage();

      // 메트릭 기록
      this.recordMetrics({
        responseTime,
        memoryUsage: endMemory,
        timestamp: new Date()
      });

      return { result, responseTime };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      const endMemory = this.getMemoryUsage();

      // 에러 메트릭 기록
      this.recordMetrics({
        responseTime,
        memoryUsage: endMemory,
        errorRate: 100, // 단일 오퍼레이션에서는 100% 에러
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * 현재 메모리 사용량을 MB 단위로 반환합니다.
   */
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined') {
      // 클라이언트 사이드에서는 정확한 메모리 사용량을 측정할 수 없음
      return 0;
    }

    // Node.js 환경에서만 메모리 사용량 측정
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed / 1024 / 1024; // MB 변환
    }

    return 0;
  }

  /**
   * 임계값을 검사하고 경고를 발생시킵니다.
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    const warnings: string[] = [];

    if (metrics.responseTime > this.thresholds.responseTime) {
      warnings.push(`Response time exceeded: ${metrics.responseTime}ms (threshold: ${this.thresholds.responseTime}ms)`);
    }

    if (metrics.memoryUsage > this.thresholds.memoryUsage) {
      warnings.push(`Memory usage exceeded: ${metrics.memoryUsage.toFixed(2)}MB (threshold: ${this.thresholds.memoryUsage}MB)`);
    }

    if (metrics.errorRate && metrics.errorRate > this.thresholds.errorRate) {
      warnings.push(`Error rate exceeded: ${metrics.errorRate.toFixed(1)}% (threshold: ${this.thresholds.errorRate}%)`);
    }

    if (warnings.length > 0) {
      console.warn('⚠️ [Performance Warning]', warnings);
    }
  }

  /**
   * 최근 메트릭의 평균을 계산합니다.
   */
  public getAverageMetrics(lastN: number = 10): Partial<PerformanceMetrics> {
    const recentMetrics = this.metrics.slice(-lastN);
    
    if (recentMetrics.length === 0) {
      return {};
    }

    const sum = recentMetrics.reduce(
      (acc, metric) => ({
        responseTime: acc.responseTime + metric.responseTime,
        memoryUsage: acc.memoryUsage + metric.memoryUsage,
        cacheHitRate: acc.cacheHitRate + (metric.cacheHitRate || 0),
        errorRate: acc.errorRate + (metric.errorRate || 0)
      }),
      { responseTime: 0, memoryUsage: 0, cacheHitRate: 0, errorRate: 0 }
    );

    return {
      responseTime: sum.responseTime / recentMetrics.length,
      memoryUsage: sum.memoryUsage / recentMetrics.length,
      cacheHitRate: sum.cacheHitRate / recentMetrics.length,
      errorRate: sum.errorRate / recentMetrics.length
    };
  }

  /**
   * 캐시 히트율을 업데이트합니다.
   */
  public updateCacheHitRate(hits: number, total: number): void {
    const hitRate = total > 0 ? (hits / total) * 100 : 0;
    
    this.recordMetrics({
      responseTime: 0, // 캐시 메트릭은 응답 시간과 별개
      memoryUsage: this.getMemoryUsage(),
      cacheHitRate: hitRate,
      timestamp: new Date()
    });
  }

  /**
   * 임계값을 설정합니다.
   */
  public setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * 현재 성능 상태를 반환합니다.
   */
  public getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: Partial<PerformanceMetrics>;
    issues: string[];
  } {
    const avgMetrics = this.getAverageMetrics(5);
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 응답 시간 검사
    if (avgMetrics.responseTime && avgMetrics.responseTime > this.thresholds.responseTime) {
      issues.push(`High response time: ${avgMetrics.responseTime.toFixed(0)}ms`);
      status = 'warning';
    }

    // 메모리 사용량 검사
    if (avgMetrics.memoryUsage && avgMetrics.memoryUsage > this.thresholds.memoryUsage) {
      issues.push(`High memory usage: ${avgMetrics.memoryUsage.toFixed(2)}MB`);
      status = 'critical';
    }

    // 에러율 검사
    if (avgMetrics.errorRate && avgMetrics.errorRate > this.thresholds.errorRate) {
      issues.push(`High error rate: ${avgMetrics.errorRate.toFixed(1)}%`);
      status = 'critical';
    }

    return {
      status,
      metrics: avgMetrics,
      issues
    };
  }

  /**
   * 모든 메트릭을 초기화합니다 (테스트용).
   */
  public clear(): void {
    this.metrics = [];
  }
} 
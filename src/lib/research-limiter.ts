/**
 * 리서치 제한 관리자 - 비용 효율적인 웹 리서치 실행 관리
 * SMART-RESEARCH-IMPLEMENTATION.md 기반 구현
 */

// 비용 관리를 위한 시간대별 제한
const HOURLY_RESEARCH_LIMITS = {
  PEAK_HOURS: { limit: 8, hours: [18, 19, 20, 21] },    // 저녁 시간대
  NORMAL_HOURS: { limit: 5, hours: [9, 10, 11, 12, 13, 14, 15, 16, 17] },
  OFF_HOURS: { limit: 2, hours: [22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8] }
} as const;

// 일일 사용량 목표
const DAILY_TARGETS = {
  MAX_RESEARCH_CALLS: 80,      // 일일 최대 리서치 실행 (무료 할당량의 80%)
  TARGET_TRIGGER_RATE: 0.15,   // 전체 질문 중 15%만 리서치 실행
  CACHE_HIT_RATE: 0.6         // 캐시 적중률 60% 이상
} as const;

export interface ResearchUsageData {
  date: string;
  hourlyUsage: Record<number, number>; // 시간별 사용량
  totalDailyUsage: number;
  totalQuestions: number;
  cacheHits: number;
  currentHourUsage: number;
  currentHourLimit: number;
  canPerformResearch: boolean;
  timeSlot: 'peak' | 'normal' | 'off';
}

export class ResearchLimiter {
  private storageKey = 'research_usage_tracker';
  
  /**
   * 현재 시점에서 리서치 실행 가능 여부 확인
   */
  canPerformResearch(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const today = this.getDateString(now);
    
    // 1. 일일 최대 사용량 확인
    const dailyUsage = this.getDailyUsage(today);
    if (dailyUsage >= DAILY_TARGETS.MAX_RESEARCH_CALLS) {
      console.log('🚫 [할당량 초과] 일일 리서치 한도 도달', {
        현재사용량: dailyUsage,
        최대한도: DAILY_TARGETS.MAX_RESEARCH_CALLS
      });
      return false;
    }
    
    // 2. 시간대별 제한 확인
    const hourlyUsage = this.getHourlyUsage(today, currentHour);
    const hourlyLimit = this.getHourlyLimit(currentHour);
    
    if (hourlyUsage >= hourlyLimit) {
      console.log('🚫 [할당량 초과] 시간대별 리서치 한도 도달', {
        현재시간: currentHour,
        시간대사용량: hourlyUsage,
        시간대한도: hourlyLimit,
        시간대: this.getTimeSlot(currentHour)
      });
      return false;
    }
    
         console.log('✅ [할당량 확인] 리서치 실행 가능', {
       일일사용량: `${dailyUsage}/${DAILY_TARGETS.MAX_RESEARCH_CALLS}`,
       시간대사용량: `${hourlyUsage}/${hourlyLimit}`,
       시간대: this.getTimeSlot(currentHour)
     });
    
    return true;
  }

  /**
   * 리서치 사용량 기록
   */
  recordResearchUsage(): void {
    const now = new Date();
    const today = this.getDateString(now);
    const currentHour = now.getHours();
    
    const usageData = this.getUsageData(today);
    
    // 시간별 사용량 증가
    usageData.hourlyUsage[currentHour] = (usageData.hourlyUsage[currentHour] || 0) + 1;
    usageData.totalDailyUsage += 1;
    
    this.saveUsageData(today, usageData);
  }

  /**
   * 질문 총 수 기록 (트리거율 계산용)
   */
  recordQuestionAsked(): void {
    const now = new Date();
    const today = this.getDateString(now);
    
    const usageData = this.getUsageData(today);
    usageData.totalQuestions += 1;
    
    this.saveUsageData(today, usageData);
  }

  /**
   * 캐시 히트 기록
   */
  recordCacheHit(): void {
    const now = new Date();
    const today = this.getDateString(now);
    
    const usageData = this.getUsageData(today);
    usageData.cacheHits += 1;
    
    this.saveUsageData(today, usageData);
  }

  /**
   * 남은 할당량 조회
   */
  getRemainingQuota(): { daily: number; hourly: number } {
    const now = new Date();
    const today = this.getDateString(now);
    const currentHour = now.getHours();
    
    const dailyUsage = this.getDailyUsage(today);
    const hourlyUsage = this.getHourlyUsage(today, currentHour);
    const hourlyLimit = this.getHourlyLimit(currentHour);
    
    return {
      daily: Math.max(0, DAILY_TARGETS.MAX_RESEARCH_CALLS - dailyUsage),
      hourly: Math.max(0, hourlyLimit - hourlyUsage)
    };
  }

  /**
   * 현재 사용 상태 조회
   */
  getCurrentUsageStatus(): ResearchUsageData {
    const now = new Date();
    const today = this.getDateString(now);
    const currentHour = now.getHours();
    
    const usageData = this.getUsageData(today);
    const hourlyUsage = this.getHourlyUsage(today, currentHour);
    const hourlyLimit = this.getHourlyLimit(currentHour);
    const timeSlot = this.getTimeSlot(currentHour);
    
    return {
      date: today,
      hourlyUsage: usageData.hourlyUsage,
      totalDailyUsage: usageData.totalDailyUsage,
      totalQuestions: usageData.totalQuestions,
      cacheHits: usageData.cacheHits,
      currentHourUsage: hourlyUsage,
      currentHourLimit: hourlyLimit,
      canPerformResearch: this.canPerformResearch(),
      timeSlot
    };
  }

  /**
   * 사용량 통계 리포트 생성
   */
  generateUsageReport(): string {
    const status = this.getCurrentUsageStatus();
    const triggerRate = status.totalQuestions > 0 
      ? (status.totalDailyUsage / status.totalQuestions * 100).toFixed(1)
      : '0.0';
    const cacheHitRate = status.totalDailyUsage > 0
      ? (status.cacheHits / (status.totalDailyUsage + status.cacheHits) * 100).toFixed(1)
      : '0.0';
    
    return `
📊 리서치 사용량 리포트 (${status.date})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 일일 사용량: ${status.totalDailyUsage}/${DAILY_TARGETS.MAX_RESEARCH_CALLS} (${(status.totalDailyUsage/DAILY_TARGETS.MAX_RESEARCH_CALLS*100).toFixed(1)}%)
🕐 현재 시간 사용량: ${status.currentHourUsage}/${status.currentHourLimit} (${status.timeSlot} 시간대)
📊 트리거율: ${triggerRate}% (목표: ${DAILY_TARGETS.TARGET_TRIGGER_RATE*100}%)
⚡ 캐시 적중률: ${cacheHitRate}% (목표: ${DAILY_TARGETS.CACHE_HIT_RATE*100}%)
🔄 총 질문 수: ${status.totalQuestions}
✅ 리서치 가능: ${status.canPerformResearch ? 'YES' : 'NO'}
    `.trim();
  }

  /**
   * 리서치 실행 전 사전 검증
   */
  validateResearchRequest(priority: 'high' | 'medium' | 'low'): {
    allowed: boolean;
    reason?: string;
    suggestion?: string;
  } {
    if (!this.canPerformResearch()) {
      const remaining = this.getRemainingQuota();
      
      if (remaining.daily === 0) {
        return {
          allowed: false,
          reason: '일일 리서치 할당량 초과',
          suggestion: '내일 다시 시도하거나 기본 AI 답변을 이용해주세요.'
        };
      }
      
      if (remaining.hourly === 0) {
        return {
          allowed: false,
          reason: '시간당 리서치 할당량 초과',
          suggestion: '다음 시간에 다시 시도해주세요.'
        };
      }
    }
    
    // 우선순위가 낮은 경우 추가 제한
    if (priority === 'low') {
      const status = this.getCurrentUsageStatus();
      const currentUsageRate = status.totalDailyUsage / DAILY_TARGETS.MAX_RESEARCH_CALLS;
      
      if (currentUsageRate > 0.7) { // 70% 이상 사용 시 low priority 제한
        return {
          allowed: false,
          reason: '우선순위가 낮은 질문으로 일일 사용량 70% 초과',
          suggestion: '더 복잡한 질문에 리서치를 활용하시거나 기본 답변을 이용해주세요.'
        };
      }
    }
    
    return { allowed: true };
  }

  /**
   * 날짜 문자열 생성 (YYYY-MM-DD)
   */
  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * 일일 사용량 조회
   */
  private getDailyUsage(date: string): number {
    const usageData = this.getUsageData(date);
    return usageData.totalDailyUsage;
  }

  /**
   * 시간별 사용량 조회
   */
  private getHourlyUsage(date: string, hour: number): number {
    const usageData = this.getUsageData(date);
    return usageData.hourlyUsage[hour] || 0;
  }

  /**
   * 현재 시간의 할당량 조회
   */
  private getHourlyLimit(hour: number): number {
    if (HOURLY_RESEARCH_LIMITS.PEAK_HOURS.hours.includes(hour)) {
      return HOURLY_RESEARCH_LIMITS.PEAK_HOURS.limit;
    }
    
    if (HOURLY_RESEARCH_LIMITS.NORMAL_HOURS.hours.includes(hour)) {
      return HOURLY_RESEARCH_LIMITS.NORMAL_HOURS.limit;
    }
    
    return HOURLY_RESEARCH_LIMITS.OFF_HOURS.limit;
  }

  /**
   * 시간대 구분 조회
   */
  private getTimeSlot(hour: number): 'peak' | 'normal' | 'off' {
    if (HOURLY_RESEARCH_LIMITS.PEAK_HOURS.hours.includes(hour)) return 'peak';
    if (HOURLY_RESEARCH_LIMITS.NORMAL_HOURS.hours.includes(hour)) return 'normal';
    return 'off';
  }

  /**
   * 사용량 데이터 조회
   */
  private getUsageData(date: string): ResearchUsageData {
    if (typeof window === 'undefined') {
      // 서버 사이드에서는 기본값 반환
      return this.createEmptyUsageData(date);
    }

    try {
      const stored = localStorage.getItem(`${this.storageKey}_${date}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('사용량 데이터 로드 실패:', error);
    }

    return this.createEmptyUsageData(date);
  }

  /**
   * 사용량 데이터 저장
   */
  private saveUsageData(date: string, data: ResearchUsageData): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(`${this.storageKey}_${date}`, JSON.stringify(data));
    } catch (error) {
      console.warn('사용량 데이터 저장 실패:', error);
    }
  }

  /**
   * 빈 사용량 데이터 생성
   */
  private createEmptyUsageData(date: string): ResearchUsageData {
    const now = new Date();
    const currentHour = now.getHours();
    
    return {
      date,
      hourlyUsage: {},
      totalDailyUsage: 0,
      totalQuestions: 0,
      cacheHits: 0,
      currentHourUsage: 0,
      currentHourLimit: this.getHourlyLimit(currentHour),
      canPerformResearch: true,
      timeSlot: this.getTimeSlot(currentHour)
    };
  }
} 
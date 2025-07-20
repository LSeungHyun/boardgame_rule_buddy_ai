/**
 * 룰마스터 AI 피드백 분석 서비스
 * 사용자 피드백 데이터를 수집, 분석하여 AI 성능 개선에 활용
 */

import { GameMappingService } from './game-mapping-service';

export interface FeedbackData {
  messageId: string;
  feedbackType: 'accurate' | 'inaccurate' | 'need_more';
  confidence: number;
  gameId: number | null;
  question: string;
  answer: string;
  timestamp: string;
  sessionId: string;
  comment?: string;
}

export interface AnalyticsInsight {
  type: 'confidence_mismatch' | 'game_accuracy' | 'question_pattern' | 'improvement_needed';
  title: string;
  description: string;
  data: any;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export interface PerformanceMetrics {
  totalQuestions: number;
  totalFeedbacks: number;
  feedbackRate: number;
  accuracyRate: number;
  confidenceVsAccuracy: {
    highConfidenceAccuracy: number;
    mediumConfidenceAccuracy: number;
    lowConfidenceAccuracy: number;
  };
  gameSpecificAccuracy: Record<number, {
    gameName: string;
    accuracy: number;
    totalQuestions: number;
  }>;
  improvementAreas: string[];
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private gameMappingService: GameMappingService;

  private constructor() {
    this.gameMappingService = GameMappingService.getInstance();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * 피드백 데이터 기록
   */
  public recordFeedback(data: FeedbackData): void {
    const feedbacks = this.getAllFeedbacks();
    feedbacks.push(data);
    
    localStorage.setItem('rule-master-feedback-logs', JSON.stringify(feedbacks));
    
    console.log('📊 [Analytics] 피드백 기록됨:', {
      타입: data.feedbackType,
      신뢰도: data.confidence,
      게임ID: data.gameId
    });
  }

  /**
   * 모든 피드백 데이터 조회
   */
  public getAllFeedbacks(): FeedbackData[] {
    const data = localStorage.getItem('rule-master-feedback-logs');
    return data ? JSON.parse(data) : [];
  }

  /**
   * 성능 지표 계산
   */
  public async calculatePerformanceMetrics(): Promise<PerformanceMetrics> {
    const feedbacks = this.getAllFeedbacks();
    
    if (feedbacks.length === 0) {
      return {
        totalQuestions: 0,
        totalFeedbacks: 0,
        feedbackRate: 0,
        accuracyRate: 0,
        confidenceVsAccuracy: {
          highConfidenceAccuracy: 0,
          mediumConfidenceAccuracy: 0,
          lowConfidenceAccuracy: 0
        },
        gameSpecificAccuracy: {},
        improvementAreas: []
      };
    }

    // 기본 지표 계산
    const totalQuestions = feedbacks.length;
    const accurateCount = feedbacks.filter(f => f.feedbackType === 'accurate').length;
    const accuracyRate = (accurateCount / totalQuestions) * 100;

    // 신뢰도별 정확도 분석
    const highConfidence = feedbacks.filter(f => f.confidence > 80);
    const mediumConfidence = feedbacks.filter(f => f.confidence >= 60 && f.confidence <= 80);
    const lowConfidence = feedbacks.filter(f => f.confidence < 60);

    const confidenceVsAccuracy = {
      highConfidenceAccuracy: this.calculateAccuracyForGroup(highConfidence),
      mediumConfidenceAccuracy: this.calculateAccuracyForGroup(mediumConfidence),
      lowConfidenceAccuracy: this.calculateAccuracyForGroup(lowConfidence)
    };

    // 게임별 정확도 분석
    const gameGroups = this.groupFeedbacksByGame(feedbacks);
    const gameSpecificAccuracy: Record<number, any> = {};
    
    await Promise.all(
      Object.entries(gameGroups).map(async ([gameId, gameFeedbacks]) => {
        const accuracy = this.calculateAccuracyForGroup(gameFeedbacks);
        gameSpecificAccuracy[parseInt(gameId)] = {
          gameName: await this.getGameName(parseInt(gameId)),
          accuracy,
          totalQuestions: gameFeedbacks.length
        };
      })
    );

    // 개선 영역 식별
    const improvementAreas = this.identifyImprovementAreas(feedbacks, confidenceVsAccuracy);

    return {
      totalQuestions,
      totalFeedbacks: totalQuestions,
      feedbackRate: 100, // 현재는 모든 피드백이 기록됨
      accuracyRate,
      confidenceVsAccuracy,
      gameSpecificAccuracy,
      improvementAreas
    };
  }

  /**
   * 인사이트 생성
   */
  public async generateInsights(): Promise<AnalyticsInsight[]> {
    const metrics = await this.calculatePerformanceMetrics();
    const feedbacks = this.getAllFeedbacks();
    const insights: AnalyticsInsight[] = [];

    // 신뢰도-정확도 불일치 분석
    if (metrics.confidenceVsAccuracy.highConfidenceAccuracy < 90) {
      insights.push({
        type: 'confidence_mismatch',
        title: '높은 신뢰도 답변의 정확도 개선 필요',
        description: `신뢰도 80% 이상 답변의 정확도가 ${metrics.confidenceVsAccuracy.highConfidenceAccuracy.toFixed(1)}%로 낮습니다.`,
        data: metrics.confidenceVsAccuracy,
        priority: 'high',
        actionable: true
      });
    }

    // 게임별 성능 분석
    Object.entries(metrics.gameSpecificAccuracy).forEach(([gameId, data]) => {
      if (data.accuracy < 70 && data.totalQuestions >= 5) {
        insights.push({
          type: 'game_accuracy',
          title: `${data.gameName} 게임 정확도 개선 필요`,
          description: `${data.gameName}에 대한 답변 정확도가 ${data.accuracy.toFixed(1)}%로 낮습니다.`,
          data: { gameId: parseInt(gameId), ...data },
          priority: 'medium',
          actionable: true
        });
      }
    });

    // 자주 틀리는 질문 패턴 분석
    const inaccurateFeedbacks = feedbacks.filter(f => f.feedbackType === 'inaccurate');
    const questionPatterns = this.analyzeQuestionPatterns(inaccurateFeedbacks);
    
    if (questionPatterns.length > 0) {
      insights.push({
        type: 'question_pattern',
        title: '반복적으로 틀리는 질문 패턴 발견',
        description: `특정 유형의 질문에서 오답률이 높습니다: ${questionPatterns.slice(0, 3).join(', ')}`,
        data: questionPatterns,
        priority: 'medium',
        actionable: true
      });
    }

    // 전반적 개선 필요도
    if (metrics.accuracyRate < 80) {
      insights.push({
        type: 'improvement_needed',
        title: '전반적인 정확도 개선 필요',
        description: `전체 정확도가 ${metrics.accuracyRate.toFixed(1)}%로 목표(80%) 미달입니다.`,
        data: metrics,
        priority: 'high',
        actionable: true
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 피드백 통계 요약
   */
  public getFeedbackSummary() {
    const feedbacks = this.getAllFeedbacks();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayFeedbacks = feedbacks.filter(f => new Date(f.timestamp) >= today);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekFeedbacks = feedbacks.filter(f => new Date(f.timestamp) >= weekAgo);

    return {
      total: feedbacks.length,
      today: todayFeedbacks.length,
      thisWeek: weekFeedbacks.length,
      accuracyTrend: this.calculateAccuracyTrend(feedbacks),
      topIssues: this.getTopIssues(feedbacks)
    };
  }

  // Private helper methods

  private calculateAccuracyForGroup(feedbacks: FeedbackData[]): number {
    if (feedbacks.length === 0) return 0;
    const accurate = feedbacks.filter(f => f.feedbackType === 'accurate').length;
    return (accurate / feedbacks.length) * 100;
  }

  private groupFeedbacksByGame(feedbacks: FeedbackData[]): Record<string, FeedbackData[]> {
    const groups: Record<string, FeedbackData[]> = {};
    
    feedbacks.forEach(feedback => {
      const gameId = (feedback.gameId || 0).toString();
      if (!groups[gameId]) {
        groups[gameId] = [];
      }
      groups[gameId].push(feedback);
    });

    return groups;
  }

  private async getGameName(gameId: number): Promise<string> {
    // 특수 케이스: 일반 질문
    if (gameId === 0) {
      return '일반 질문';
    }

    try {
      // GameMappingService 초기화 확인
      if (!this.gameMappingService.isInitialized()) {
        await this.gameMappingService.initialize();
      }

      const gameInfo = this.gameMappingService.getGameById(gameId);
      return gameInfo?.titleKorean || `게임 ${gameId}`;
      
    } catch (error) {
      console.error(`[AnalyticsService] 게임명 조회 실패: ${gameId}`, error);
      return `게임 ${gameId}`;
    }
  }

  private identifyImprovementAreas(
    feedbacks: FeedbackData[], 
    confidenceVsAccuracy: any
  ): string[] {
    const areas: string[] = [];

    // 신뢰도 보정 필요
    if (confidenceVsAccuracy.highConfidenceAccuracy < 90) {
      areas.push('신뢰도 계산 알고리즘 개선');
    }

    // 복잡한 질문 처리
    const needMoreFeedbacks = feedbacks.filter(f => f.feedbackType === 'need_more');
    if (needMoreFeedbacks.length / feedbacks.length > 0.2) {
      areas.push('복잡한 질문 처리 능력 강화');
    }

    // 게임별 전문성
    const gameAccuracies = Object.values(this.calculatePerformanceMetrics().gameSpecificAccuracy);
    const lowAccuracyGames = gameAccuracies.filter(g => g.accuracy < 80);
    if (lowAccuracyGames.length > 0) {
      areas.push('게임별 전문 지식 보강');
    }

    return areas;
  }

  private analyzeQuestionPatterns(inaccurateFeedbacks: FeedbackData[]): string[] {
    const patterns: Record<string, number> = {};
    
    inaccurateFeedbacks.forEach(feedback => {
      const question = feedback.question.toLowerCase();
      
      // 간단한 패턴 분석 (실제로는 더 정교한 NLP 기법 사용 가능)
      if (question.includes('언제') || question.includes('시점')) {
        patterns['타이밍 관련 질문'] = (patterns['타이밍 관련 질문'] || 0) + 1;
      }
      if (question.includes('여러') || question.includes('동시')) {
        patterns['복합 상황 질문'] = (patterns['복합 상황 질문'] || 0) + 1;
      }
      if (question.includes('예외') || question.includes('특수')) {
        patterns['예외 상황 질문'] = (patterns['예외 상황 질문'] || 0) + 1;
      }
    });

    return Object.entries(patterns)
      .sort(([,a], [,b]) => b - a)
      .map(([pattern]) => pattern);
  }

  private calculateAccuracyTrend(feedbacks: FeedbackData[]): 'up' | 'down' | 'stable' {
    if (feedbacks.length < 10) return 'stable';

    const recent = feedbacks.slice(-10);
    const previous = feedbacks.slice(-20, -10);

    const recentAccuracy = this.calculateAccuracyForGroup(recent);
    const previousAccuracy = this.calculateAccuracyForGroup(previous);

    const diff = recentAccuracy - previousAccuracy;
    
    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
  }

  private getTopIssues(feedbacks: FeedbackData[]): string[] {
    const inaccurate = feedbacks.filter(f => f.feedbackType === 'inaccurate');
    const needMore = feedbacks.filter(f => f.feedbackType === 'need_more');
    
    const issues: string[] = [];
    
    if (inaccurate.length > feedbacks.length * 0.2) {
      issues.push('높은 오답률');
    }
    
    if (needMore.length > feedbacks.length * 0.3) {
      issues.push('불충분한 정보 제공');
    }

    return issues;
  }
}

export const analyticsService = AnalyticsService.getInstance(); 
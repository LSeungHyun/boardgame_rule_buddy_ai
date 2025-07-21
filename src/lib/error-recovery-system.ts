import {
  ErrorRecovery,
  ErrorPattern,
  ConversationContext,
  QuestionHistoryItem,
  IntentAnalysis
} from '@/types';

/**
 * 오류 감지 및 복구 시스템
 * 사용자 지적을 감지하고 적절한 복구 메커니즘을 제공합니다.
 */
export class ErrorRecoverySystem implements ErrorRecovery {
  private static instance: ErrorRecoverySystem;
  private errorPatterns = new Map<string, ErrorPattern>();
  
  // 사용자 지적 패턴들
  private readonly userCorrectionPatterns = [
    // 강한 지적
    { pattern: /완전히 틀렸|전혀 아니야|말도 안돼|완전 잘못/, intensity: 'strong', confidence: 0.9 },
    { pattern: /틀렸어|잘못됐어|아니야|틀린거/, intensity: 'medium', confidence: 0.8 },
    { pattern: /맞나\?|확실해\?|정말\?|그래\?/, intensity: 'weak', confidence: 0.6 },
    
    // 정정 요청
    { pattern: /사실은|실제로는|정확히는|올바른 답은/, intensity: 'correction', confidence: 0.85 },
    { pattern: /다시 생각해|재검토|다시 확인/, intensity: 'review', confidence: 0.7 },
    
    // 의심 표현
    { pattern: /의심스러운데|확신이 안서|애매한데/, intensity: 'doubt', confidence: 0.65 }
  ];

  // 사과 메시지 템플릿
  private readonly apologyTemplates = {
    strong: [
      "죄송합니다. 제가 완전히 잘못된 정보를 드렸네요.",
      "정말 죄송합니다. 제 답변이 틀렸습니다.",
      "사과드립니다. 잘못된 정보로 혼란을 드려서 죄송합니다."
    ],
    medium: [
      "죄송합니다. 제가 틀렸습니다.",
      "제 답변이 정확하지 않았네요. 죄송합니다.",
      "잘못된 정보를 드려서 죄송합니다."
    ],
    weak: [
      "확실하지 않은 답변을 드린 것 같네요.",
      "제 답변에 오류가 있을 수 있습니다.",
      "더 정확한 정보를 찾아보겠습니다."
    ],
    correction: [
      "정정해주셔서 감사합니다.",
      "올바른 정보를 알려주셔서 고맙습니다.",
      "제 실수를 지적해주셔서 감사합니다."
    ]
  };

  private constructor() {
    this.initializeErrorPatterns();
  }

  static getInstance(): ErrorRecoverySystem {
    if (!ErrorRecoverySystem.instance) {
      ErrorRecoverySystem.instance = new ErrorRecoverySystem();
    }
    return ErrorRecoverySystem.instance;
  }

  /**
   * 사용자 지적 패턴 자동 감지
   */
  detectUserCorrection(question: string, intentAnalysis: IntentAnalysis): {
    isCorrection: boolean;
    intensity: string;
    confidence: number;
    suggestedResponse: string;
  } {
    // 1. 의도 분석 결과 확인
    if (intentAnalysis.isChallengingPreviousAnswer) {
      return this.analyzeUserCorrection(question);
    }

    // 2. 패턴 매칭으로 추가 확인
    for (const { pattern, intensity, confidence } of this.userCorrectionPatterns) {
      if (pattern.test(question)) {
        return {
          isCorrection: true,
          intensity,
          confidence,
          suggestedResponse: this.generateApology(intensity)
        };
      }
    }

    return {
      isCorrection: false,
      intensity: 'none',
      confidence: 0,
      suggestedResponse: ''
    };
  }

  /**
   * 사용자 지적 분석
   */
  private analyzeUserCorrection(question: string): {
    isCorrection: boolean;
    intensity: string;
    confidence: number;
    suggestedResponse: string;
  } {
    let bestMatch = { intensity: 'weak', confidence: 0 };

    for (const { pattern, intensity, confidence } of this.userCorrectionPatterns) {
      if (pattern.test(question) && confidence > bestMatch.confidence) {
        bestMatch = { intensity, confidence };
      }
    }

    if (bestMatch.confidence > 0.5) {
      return {
        isCorrection: true,
        intensity: bestMatch.intensity,
        confidence: bestMatch.confidence,
        suggestedResponse: this.generateApology(bestMatch.intensity)
      };
    }

    return {
      isCorrection: false,
      intensity: 'none',
      confidence: 0,
      suggestedResponse: ''
    };
  }

  /**
   * 오류 인정 메시지 생성
   */
  acknowledgeError(): string {
    const templates = this.apologyTemplates.medium;
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  }

  /**
   * 정정 요청 처리
   */
  async requestCorrection(): Promise<string> {
    const correctionMessage = "정확한 정보를 다시 찾아보겠습니다. 잠시만 기다려주세요.";
    
    // 여기서 실제로는 웹 리서치를 트리거하거나 더 신뢰할 수 있는 소스를 찾는 로직이 들어갑니다.
    // 현재는 기본 메시지만 반환
    
    return correctionMessage;
  }

  /**
   * 히스토리 업데이트 (오류 표시)
   */
  async updateHistory(correction: string): Promise<void> {
    // 실제 구현에서는 데이터베이스의 해당 답변에 오류 플래그를 추가하거나
    // 정정된 답변을 새로 추가하는 로직이 들어갑니다.
    console.log('History updated with correction:', correction);
  }

  /**
   * 유사 오류 방지 메커니즘
   */
  preventSimilarErrors(): void {
    // 오류 패턴을 학습하고 향후 유사한 상황에서 더 신중하게 답변하도록 하는 로직
    console.log('Similar error prevention mechanism activated');
  }

  /**
   * 사과 메시지 생성
   */
  private generateApology(intensity: string): string {
    const templates = this.apologyTemplates[intensity as keyof typeof this.apologyTemplates] || this.apologyTemplates.medium;
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  }

  /**
   * 오류 패턴 초기화
   */
  private initializeErrorPatterns(): void {
    // 일반적인 오류 패턴들을 미리 등록
    const commonPatterns: ErrorPattern[] = [
      {
        pattern: '숫자 정보 오류',
        frequency: 0,
        lastOccurrence: new Date(),
        correctionStrategy: '웹 리서치 후 재확인'
      },
      {
        pattern: '게임 규칙 오해',
        frequency: 0,
        lastOccurrence: new Date(),
        correctionStrategy: '공식 룰북 참조'
      },
      {
        pattern: '카드 효과 혼동',
        frequency: 0,
        lastOccurrence: new Date(),
        correctionStrategy: '카드 데이터베이스 확인'
      }
    ];

    commonPatterns.forEach(pattern => {
      this.errorPatterns.set(pattern.pattern, pattern);
    });
  }

  /**
   * 오류 패턴 학습
   */
  learnErrorPattern(errorType: string, context: ConversationContext): void {
    const existing = this.errorPatterns.get(errorType);
    
    if (existing) {
      existing.frequency++;
      existing.lastOccurrence = new Date();
    } else {
      this.errorPatterns.set(errorType, {
        pattern: errorType,
        frequency: 1,
        lastOccurrence: new Date(),
        correctionStrategy: '추가 검증 필요'
      });
    }
  }

  /**
   * 오류 복구 전략 제안
   */
  suggestRecoveryStrategy(errorType: string, context: ConversationContext): {
    strategy: string;
    confidence: number;
    actions: string[];
  } {
    const pattern = this.errorPatterns.get(errorType);
    
    if (!pattern) {
      return {
        strategy: 'general_verification',
        confidence: 0.5,
        actions: ['웹 리서치 수행', '답변 재생성']
      };
    }

    // 빈도에 따른 전략 조정
    if (pattern.frequency >= 3) {
      return {
        strategy: 'high_priority_research',
        confidence: 0.8,
        actions: ['즉시 웹 리서치', '다중 소스 확인', '전문가 검증']
      };
    } else if (pattern.frequency >= 2) {
      return {
        strategy: 'enhanced_verification',
        confidence: 0.7,
        actions: ['웹 리서치 수행', '이전 답변과 비교', '신뢰도 평가']
      };
    } else {
      return {
        strategy: 'standard_correction',
        confidence: 0.6,
        actions: ['기본 검증', '답변 수정']
      };
    }
  }

  /**
   * 맥락 기반 오류 감지
   */
  detectContextualError(
    newAnswer: string,
    context: ConversationContext,
    userFeedback?: string
  ): {
    hasError: boolean;
    errorType: string;
    confidence: number;
    recommendation: string;
  } {
    // 1. 사용자 피드백 기반 감지
    if (userFeedback) {
      const correction = this.detectUserCorrection(userFeedback, {
        primaryIntent: 'correction',
        isChallengingPreviousAnswer: true,
        implicitContext: [],
        confidence: 0.8
      });

      if (correction.isCorrection) {
        return {
          hasError: true,
          errorType: 'user_reported',
          confidence: correction.confidence,
          recommendation: correction.suggestedResponse
        };
      }
    }

    // 2. 일관성 기반 감지
    const recentAnswers = context.questionHistory.slice(-3);
    for (const historyItem of recentAnswers) {
      if (this.hasInconsistency(newAnswer, historyItem.answer)) {
        return {
          hasError: true,
          errorType: 'consistency_error',
          confidence: 0.7,
          recommendation: '이전 답변과 모순되는 내용이 있습니다. 재검토가 필요합니다.'
        };
      }
    }

    // 3. 신뢰도 기반 감지
    if (this.hasLowConfidenceIndicators(newAnswer)) {
      return {
        hasError: true,
        errorType: 'low_confidence',
        confidence: 0.6,
        recommendation: '답변의 신뢰도가 낮습니다. 추가 검증을 권장합니다.'
      };
    }

    return {
      hasError: false,
      errorType: 'none',
      confidence: 0,
      recommendation: ''
    };
  }

  /**
   * 불일치 감지
   */
  private hasInconsistency(answer1: string, answer2: string): boolean {
    // 간단한 키워드 기반 불일치 감지
    const contradictions = [
      { positive: ['가능', '할 수 있'], negative: ['불가능', '할 수 없'] },
      { positive: ['있습니다', '존재'], negative: ['없습니다', '존재하지 않'] },
      { positive: ['맞습니다', '정확'], negative: ['틀렸습니다', '부정확'] }
    ];

    for (const contradiction of contradictions) {
      const hasPositive1 = contradiction.positive.some(word => answer1.includes(word));
      const hasNegative1 = contradiction.negative.some(word => answer1.includes(word));
      const hasPositive2 = contradiction.positive.some(word => answer2.includes(word));
      const hasNegative2 = contradiction.negative.some(word => answer2.includes(word));

      if ((hasPositive1 && hasNegative2) || (hasNegative1 && hasPositive2)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 낮은 신뢰도 지표 감지
   */
  private hasLowConfidenceIndicators(answer: string): boolean {
    const lowConfidencePatterns = [
      /아마도|아마|추정|예상|것 같|듯/,
      /확실하지 않|정확하지 않|애매/,
      /일반적으로|보통|대부분/
    ];

    return lowConfidencePatterns.some(pattern => pattern.test(answer));
  }

  /**
   * 오류 복구 보고서 생성
   */
  generateRecoveryReport(context: ConversationContext): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recoveryRate: number;
    recommendations: string[];
  } {
    const errorsByType: Record<string, number> = {};
    let totalErrors = 0;
    let recoveredErrors = 0;

    // 히스토리에서 오류 패턴 분석
    for (const historyItem of context.questionHistory) {
      if (historyItem.confidence < 0.6) {
        totalErrors++;
        const errorType = this.classifyErrorType(historyItem);
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      }
    }

    // 복구율 계산 (간단한 추정)
    recoveredErrors = Math.floor(totalErrors * 0.7); // 70% 복구 가정
    const recoveryRate = totalErrors > 0 ? recoveredErrors / totalErrors : 1;

    // 권장사항 생성
    const recommendations: string[] = [];
    if (totalErrors > 5) {
      recommendations.push('웹 리서치 빈도 증가 권장');
    }
    if (errorsByType['consistency_error'] > 2) {
      recommendations.push('답변 일관성 검증 강화 필요');
    }
    if (recoveryRate < 0.8) {
      recommendations.push('오류 복구 메커니즘 개선 필요');
    }

    return {
      totalErrors,
      errorsByType,
      recoveryRate: Math.round(recoveryRate * 100) / 100,
      recommendations
    };
  }

  /**
   * 오류 타입 분류
   */
  private classifyErrorType(historyItem: QuestionHistoryItem): string {
    if (historyItem.wasResearched && historyItem.confidence < 0.5) {
      return 'research_error';
    }
    if (historyItem.confidence < 0.4) {
      return 'low_confidence_error';
    }
    if (historyItem.intentAnalysis?.isChallengingPreviousAnswer) {
      return 'user_challenged_error';
    }
    return 'general_error';
  }

  /**
   * 오류 패턴 통계
   */
  getErrorPatternStats() {
    const patterns = Array.from(this.errorPatterns.values());
    
    return {
      totalPatterns: patterns.length,
      mostFrequent: patterns.sort((a, b) => b.frequency - a.frequency).slice(0, 5),
      recentErrors: patterns.filter(p => 
        (Date.now() - p.lastOccurrence.getTime()) < (24 * 60 * 60 * 1000)
      ).length
    };
  }

  /**
   * 시스템 리셋 (테스트용)
   */
  reset(): void {
    this.errorPatterns.clear();
    this.initializeErrorPatterns();
  }
}
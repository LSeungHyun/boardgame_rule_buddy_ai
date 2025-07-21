import {
  IntentAnalysis,
  ConversationContext,
  QuestionHistoryItem
} from '@/types';

/**
 * 의도 파악 엔진
 * 사용자 질문의 의도를 분석하고 이전 답변에 대한 수정 요청을 감지합니다.
 */
export class IntentRecognizer {
  private static instance: IntentRecognizer;

  // 의도별 패턴 정의
  private readonly intentPatterns = {
    correction: [
      /틀린거|잘못된거|틀렸|잘못했/,
      /아닌데|아니야|아니지|다른데/,
      /맞나|확실해|정말/,
      /그럼.*틀린|그럼.*잘못/,
      /사실은|실제로는|정확히는/
    ],
    clarification: [
      /무슨 뜻|무슨 의미|뭔 말|어떤 의미/,
      /좀 더|더 자세히|구체적으로/,
      /다시 설명|다시 말해|재설명/,
      /이해가 안|모르겠|헷갈려/
    ],
    followup: [
      /그럼|그러면|그런데|그래서/,
      /또|추가로|그리고|더불어/,
      /다음|이어서|계속해서/,
      /관련해서|연관해서|비슷하게/
    ],
    question: [
      /어떻게|왜|언제|어디서|누가|무엇을/,
      /방법|규칙|효과|능력/,
      /가능한가|할 수 있나|되나/,
      /몇 개|몇 명|얼마나/
    ]
  };

  // 수정 요청 강도별 패턴
  private readonly correctionIntensity = {
    strong: [/완전히 틀렸|전혀 아니야|말도 안돼/],
    medium: [/틀린거 같은데|아닌 것 같은데|확실하지 않은데/],
    weak: [/맞나|확실해|정말/]
  };

  // 암시적 참조 패턴
  private readonly implicitReferencePatterns = [
    /그거|그것|그게|그런거/,
    /위에서|앞에서|이전에|아까/,
    /방금|금방|조금 전/,
    /그 답변|그 설명|그 내용/
  ];

  private constructor() {}

  static getInstance(): IntentRecognizer {
    if (!IntentRecognizer.instance) {
      IntentRecognizer.instance = new IntentRecognizer();
    }
    return IntentRecognizer.instance;
  }

  /**
   * 의도 분석 수행
   */
  recognizeIntent(question: string, context: ConversationContext): IntentAnalysis {
    try {
      // 1. 기본 의도 분류
      const primaryIntent = this.classifyPrimaryIntent(question);
      
      // 2. 이전 답변 도전 여부 확인
      const isChallengingPreviousAnswer = this.detectCorrectionIntent(question);
      
      // 3. 참조된 답변 찾기
      const referencedAnswer = this.findReferencedAnswer(question, context);
      
      // 4. 암시적 맥락 추출
      const implicitContext = this.extractImplicitReferences(question, context.questionHistory);
      
      // 5. 수정 패턴 감지
      const correctionPatterns = this.detectCorrectionPatterns(question);
      
      // 6. 신뢰도 계산
      const confidence = this.calculateIntentConfidence(
        primaryIntent, isChallengingPreviousAnswer, referencedAnswer, implicitContext
      );

      return {
        primaryIntent,
        isChallengingPreviousAnswer,
        referencedAnswer,
        implicitContext,
        confidence,
        correctionPatterns
      };

    } catch (error) {
      console.error('Error recognizing intent:', error);
      return this.getDefaultIntent(question);
    }
  }

  /**
   * 기본 의도 분류
   */
  private classifyPrimaryIntent(question: string): 'question' | 'correction' | 'clarification' | 'followup' {
    // 각 의도별 점수 계산
    const scores = {
      correction: this.calculatePatternScore(question, this.intentPatterns.correction),
      clarification: this.calculatePatternScore(question, this.intentPatterns.clarification),
      followup: this.calculatePatternScore(question, this.intentPatterns.followup),
      question: this.calculatePatternScore(question, this.intentPatterns.question)
    };

    // 가장 높은 점수의 의도 반환
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'question'; // 기본값

    const intent = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0];
    return intent as 'question' | 'correction' | 'clarification' | 'followup';
  }

  /**
   * 수정 의도 감지
   */
  detectCorrectionIntent(question: string): boolean {
    // 강한 수정 패턴 확인
    if (this.correctionIntensity.strong.some(pattern => pattern.test(question))) {
      return true;
    }

    // 중간 강도 수정 패턴 확인
    if (this.correctionIntensity.medium.some(pattern => pattern.test(question))) {
      return true;
    }

    // 약한 수정 패턴 확인 (다른 지표와 함께 고려)
    const hasWeakCorrection = this.correctionIntensity.weak.some(pattern => pattern.test(question));
    const hasImplicitReference = this.implicitReferencePatterns.some(pattern => pattern.test(question));
    
    return hasWeakCorrection && hasImplicitReference;
  }

  /**
   * 참조된 답변 찾기
   */
  private findReferencedAnswer(question: string, context: ConversationContext): QuestionHistoryItem | undefined {
    if (context.questionHistory.length === 0) return undefined;

    // 직접 참조 패턴이 있는 경우 가장 최근 답변 반환
    const hasDirectReference = this.implicitReferencePatterns.some(pattern => pattern.test(question));
    if (hasDirectReference) {
      return context.questionHistory[context.questionHistory.length - 1];
    }

    // 수정 의도가 있는 경우 관련성 높은 답변 찾기
    if (this.detectCorrectionIntent(question)) {
      const recentHistory = context.questionHistory.slice(-3);
      
      // 키워드 매칭으로 관련 답변 찾기
      const questionKeywords = this.extractKeywords(question);
      let bestMatch: { item: QuestionHistoryItem; score: number } | null = null;

      for (const historyItem of recentHistory) {
        const historyKeywords = this.extractKeywords(historyItem.question + ' ' + historyItem.answer);
        const commonKeywords = questionKeywords.filter(kw => historyKeywords.includes(kw));
        const score = commonKeywords.length / Math.max(questionKeywords.length, historyKeywords.length);
        
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { item: historyItem, score };
        }
      }

      return bestMatch && bestMatch.score > 0.3 ? bestMatch.item : undefined;
    }

    return undefined;
  }

  /**
   * 암시적 참조 추출
   */
  extractImplicitReferences(question: string, history: QuestionHistoryItem[]): string[] {
    const references: string[] = [];

    // 암시적 참조 패턴 확인
    for (const pattern of this.implicitReferencePatterns) {
      const matches = question.match(pattern);
      if (matches) {
        references.push(matches[0]);
      }
    }

    // 최근 답변의 키워드와 겹치는 부분 찾기
    if (history.length > 0) {
      const recentAnswer = history[history.length - 1];
      const answerKeywords = this.extractKeywords(recentAnswer.answer);
      const questionKeywords = this.extractKeywords(question);
      
      const commonKeywords = questionKeywords.filter(kw => answerKeywords.includes(kw));
      references.push(...commonKeywords);
    }

    return [...new Set(references)]; // 중복 제거
  }

  /**
   * 수정 패턴 감지
   */
  private detectCorrectionPatterns(question: string): string[] {
    const patterns: string[] = [];

    // 각 강도별 패턴 확인
    for (const [intensity, patternList] of Object.entries(this.correctionIntensity)) {
      for (const pattern of patternList) {
        if (pattern.test(question)) {
          patterns.push(`${intensity}_correction`);
        }
      }
    }

    // 일반적인 수정 패턴 확인
    for (const pattern of this.intentPatterns.correction) {
      if (pattern.test(question)) {
        patterns.push('general_correction');
      }
    }

    return [...new Set(patterns)]; // 중복 제거
  }

  /**
   * 패턴 점수 계산
   */
  private calculatePatternScore(text: string, patterns: RegExp[]): number {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        score += 1;
      }
    }
    return score;
  }

  /**
   * 의도 신뢰도 계산
   */
  private calculateIntentConfidence(
    primaryIntent: string,
    isChallengingPreviousAnswer: boolean,
    referencedAnswer: QuestionHistoryItem | undefined,
    implicitContext: string[]
  ): number {
    let confidence = 0.5; // 기본 신뢰도

    // 명확한 패턴 매칭
    if (primaryIntent !== 'question') {
      confidence += 0.2;
    }

    // 수정 의도 감지
    if (isChallengingPreviousAnswer) {
      confidence += 0.2;
    }

    // 참조 답변 존재
    if (referencedAnswer) {
      confidence += 0.15;
    }

    // 암시적 맥락 풍부성
    if (implicitContext.length >= 2) {
      confidence += 0.1;
    } else if (implicitContext.length >= 1) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 키워드 추출 (간단한 구현)
   */
  private extractKeywords(text: string): string[] {
    const keywords = [
      '아크노바', '윙스팬', '테라포밍', '글룸헤이븐', '스피릿',
      '카드', '액션', '자원', '점수', '라운드', '턴', '규칙',
      '코뿔소', '새', '식물', '화성', '몬스터', '영혼',
      '효과', '능력', '조합', '전략', '방법'
    ];

    return keywords.filter(keyword => text.includes(keyword));
  }

  /**
   * 기본 의도 반환
   */
  private getDefaultIntent(question: string): IntentAnalysis {
    return {
      primaryIntent: 'question',
      isChallengingPreviousAnswer: false,
      implicitContext: [],
      confidence: 0.5,
      correctionPatterns: []
    };
  }

  /**
   * 의도 분석 통계
   */
  getRecognitionStats() {
    return {
      supportedIntents: Object.keys(this.intentPatterns).length,
      correctionLevels: Object.keys(this.correctionIntensity).length,
      referencePatterns: this.implicitReferencePatterns.length,
      totalPatterns: Object.values(this.intentPatterns).flat().length
    };
  }

  /**
   * 수정 요청 강도 분석
   */
  analyzeCorrectionIntensity(question: string): 'none' | 'weak' | 'medium' | 'strong' {
    for (const [intensity, patterns] of Object.entries(this.correctionIntensity)) {
      if (patterns.some(pattern => pattern.test(question))) {
        return intensity as 'weak' | 'medium' | 'strong';
      }
    }
    return 'none';
  }

  /**
   * 질문 유형 상세 분석
   */
  analyzeQuestionType(question: string): {
    type: string;
    confidence: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let maxScore = 0;
    let bestType = 'general';

    for (const [type, patterns] of Object.entries(this.intentPatterns)) {
      const score = this.calculatePatternScore(question, patterns);
      if (score > maxScore) {
        maxScore = score;
        bestType = type;
      }
      
      if (score > 0) {
        indicators.push(`${type}: ${score} matches`);
      }
    }

    return {
      type: bestType,
      confidence: Math.min(maxScore / 3, 1.0), // 정규화
      indicators
    };
  }
}
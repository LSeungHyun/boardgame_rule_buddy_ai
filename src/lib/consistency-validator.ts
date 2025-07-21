import {
  ConsistencyCheck,
  ConversationContext,
  QuestionHistoryItem
} from '@/types';

/**
 * 일관성 검증기
 * 답변 간의 모순을 감지하고 일관성을 검증합니다.
 */
export class ConsistencyValidator {
  private static instance: ConsistencyValidator;

  // 사실 정보 패턴 (숫자, 고유명사 등)
  private readonly factualPatterns = {
    numbers: /\d+/g,
    gameNames: /(아크노바|윙스팬|테라포밍|글룸헤이븐|스피릿)/g,
    cardNames: /([가-힣]+\s*카드|[가-힣]+\s*액션)/g,
    quantities: /(몇\s*개|몇\s*명|얼마나|개수|수량)/g
  };

  // 모순 감지 키워드
  private readonly contradictionKeywords = [
    { positive: ['가능', '할 수 있', '됩니다', '맞습니다'], negative: ['불가능', '할 수 없', '안됩니다', '틀렸습니다'] },
    { positive: ['있습니다', '존재합니다', '포함됩니다'], negative: ['없습니다', '존재하지 않습니다', '포함되지 않습니다'] },
    { positive: ['허용', '가능', '유효'], negative: ['금지', '불가능', '무효'] }
  ];

  // 신뢰도 임계값
  private readonly confidenceThresholds = {
    high: 0.8,
    medium: 0.6,
    low: 0.4
  };

  private constructor() {}

  static getInstance(): ConsistencyValidator {
    if (!ConsistencyValidator.instance) {
      ConsistencyValidator.instance = new ConsistencyValidator();
    }
    return ConsistencyValidator.instance;
  }

  /**
   * 일관성 검증 수행
   */
  validateConsistency(newAnswer: string, context: ConversationContext): ConsistencyCheck {
    try {
      // 1. 관련 히스토리 필터링
      const relevantHistory = this.filterRelevantHistory(newAnswer, context.questionHistory);
      
      // 2. 사실 충돌 감지
      const factualConflicts = this.detectFactualConflicts(newAnswer, relevantHistory);
      
      // 3. 논리적 모순 감지
      const logicalConflicts = this.detectLogicalConflicts(newAnswer, relevantHistory);
      
      // 4. 모든 충돌 답변 수집
      const conflictingAnswers = [...factualConflicts, ...logicalConflicts];
      
      // 5. 일관성 여부 판단
      const isConsistent = conflictingAnswers.length === 0;
      
      // 6. 신뢰도 레벨 계산
      const confidenceLevel = this.calculateConfidenceLevel(newAnswer, conflictingAnswers);
      
      // 7. 리서치 권장 여부
      const recommendsResearch = this.shouldRecommendResearch(conflictingAnswers, confidenceLevel);
      
      // 8. 오류 타입 분류
      const errorType = this.classifyErrorType(factualConflicts, logicalConflicts);
      
      // 9. 충돌 세부사항
      const conflictDetails = this.generateConflictDetails(conflictingAnswers, newAnswer);

      return {
        isConsistent,
        conflictingAnswers,
        confidenceLevel,
        recommendsResearch,
        errorType,
        conflictDetails
      };

    } catch (error) {
      console.error('Error validating consistency:', error);
      return this.getDefaultConsistencyCheck();
    }
  }

  /**
   * 관련 히스토리 필터링
   */
  private filterRelevantHistory(newAnswer: string, history: QuestionHistoryItem[]): QuestionHistoryItem[] {
    const newAnswerKeywords = this.extractKeywords(newAnswer);
    
    return history.filter(item => {
      const historyKeywords = this.extractKeywords(item.question + ' ' + item.answer);
      const commonKeywords = newAnswerKeywords.filter(kw => historyKeywords.includes(kw));
      return commonKeywords.length >= 1; // 최소 1개 키워드 공통
    }).slice(-5); // 최근 5개만
  }

  /**
   * 사실 충돌 감지
   */
  private detectFactualConflicts(newAnswer: string, history: QuestionHistoryItem[]): QuestionHistoryItem[] {
    const conflicts: QuestionHistoryItem[] = [];

    for (const historyItem of history) {
      // 숫자 정보 충돌 확인
      if (this.hasNumberConflict(newAnswer, historyItem.answer)) {
        conflicts.push(historyItem);
        continue;
      }

      // 게임명 충돌 확인
      if (this.hasGameNameConflict(newAnswer, historyItem.answer)) {
        conflicts.push(historyItem);
        continue;
      }

      // 카드명/액션명 충돌 확인
      if (this.hasCardNameConflict(newAnswer, historyItem.answer)) {
        conflicts.push(historyItem);
        continue;
      }
    }

    return conflicts;
  }

  /**
   * 논리적 모순 감지
   */
  private detectLogicalConflicts(newAnswer: string, history: QuestionHistoryItem[]): QuestionHistoryItem[] {
    const conflicts: QuestionHistoryItem[] = [];

    for (const historyItem of history) {
      // 긍정/부정 모순 확인
      if (this.hasLogicalContradiction(newAnswer, historyItem.answer)) {
        conflicts.push(historyItem);
      }
    }

    return conflicts;
  }

  /**
   * 숫자 충돌 확인
   */
  private hasNumberConflict(answer1: string, answer2: string): boolean {
    const numbers1 = answer1.match(this.factualPatterns.numbers) || [];
    const numbers2 = answer2.match(this.factualPatterns.numbers) || [];

    if (numbers1.length === 0 || numbers2.length === 0) return false;

    // 같은 맥락에서 다른 숫자가 나오는지 확인
    const context1 = this.extractNumberContext(answer1);
    const context2 = this.extractNumberContext(answer2);

    for (const ctx1 of context1) {
      for (const ctx2 of context2) {
        if (this.isSimilarContext(ctx1.context, ctx2.context) && ctx1.number !== ctx2.number) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 게임명 충돌 확인
   */
  private hasGameNameConflict(answer1: string, answer2: string): boolean {
    const games1 = answer1.match(this.factualPatterns.gameNames) || [];
    const games2 = answer2.match(this.factualPatterns.gameNames) || [];

    if (games1.length === 0 || games2.length === 0) return false;

    // 같은 질문에 대해 다른 게임을 언급하는지 확인
    return games1.some(game1 => games2.some(game2 => game1 !== game2));
  }

  /**
   * 카드명 충돌 확인
   */
  private hasCardNameConflict(answer1: string, answer2: string): boolean {
    const cards1 = answer1.match(this.factualPatterns.cardNames) || [];
    const cards2 = answer2.match(this.factualPatterns.cardNames) || [];

    if (cards1.length === 0 || cards2.length === 0) return false;

    // 같은 효과나 능력에 대해 다른 카드명을 언급하는지 확인
    return cards1.some(card1 => cards2.some(card2 => card1 !== card2));
  }

  /**
   * 논리적 모순 확인
   */
  private hasLogicalContradiction(answer1: string, answer2: string): boolean {
    for (const contradiction of this.contradictionKeywords) {
      const hasPositive1 = contradiction.positive.some(kw => answer1.includes(kw));
      const hasNegative1 = contradiction.negative.some(kw => answer1.includes(kw));
      const hasPositive2 = contradiction.positive.some(kw => answer2.includes(kw));
      const hasNegative2 = contradiction.negative.some(kw => answer2.includes(kw));

      // 한 답변은 긍정, 다른 답변은 부정인 경우
      if ((hasPositive1 && hasNegative2) || (hasNegative1 && hasPositive2)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 숫자 맥락 추출
   */
  private extractNumberContext(text: string): Array<{ number: string; context: string }> {
    const results: Array<{ number: string; context: string }> = [];
    const numbers = text.match(this.factualPatterns.numbers) || [];

    for (const number of numbers) {
      const index = text.indexOf(number);
      const start = Math.max(0, index - 20);
      const end = Math.min(text.length, index + number.length + 20);
      const context = text.substring(start, end);
      
      results.push({ number, context });
    }

    return results;
  }

  /**
   * 맥락 유사성 확인
   */
  private isSimilarContext(context1: string, context2: string): boolean {
    const keywords1 = this.extractKeywords(context1);
    const keywords2 = this.extractKeywords(context2);
    const commonKeywords = keywords1.filter(kw => keywords2.includes(kw));
    
    return commonKeywords.length >= 1;
  }

  /**
   * 신뢰도 레벨 계산
   */
  private calculateConfidenceLevel(answer: string, conflicts: QuestionHistoryItem[]): 'high' | 'medium' | 'low' {
    if (conflicts.length === 0) return 'high';
    
    // 충돌의 심각도 평가
    const severityScore = conflicts.reduce((score, conflict) => {
      return score + (1 - conflict.confidence); // 낮은 신뢰도일수록 덜 심각
    }, 0) / conflicts.length;

    if (severityScore < this.confidenceThresholds.low) return 'high';
    if (severityScore < this.confidenceThresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * 리서치 권장 여부 판단
   */
  private shouldRecommendResearch(conflicts: QuestionHistoryItem[], confidenceLevel: 'high' | 'medium' | 'low'): boolean {
    if (conflicts.length === 0) return false;
    if (confidenceLevel === 'low') return true;
    if (conflicts.length >= 2) return true;
    
    // 최근 충돌이 있고 신뢰도가 중간 이하인 경우
    const recentConflicts = conflicts.filter(c => 
      (Date.now() - c.timestamp.getTime()) < (60 * 60 * 1000) // 1시간 이내
    );
    
    return recentConflicts.length > 0 && confidenceLevel !== 'high';
  }

  /**
   * 오류 타입 분류
   */
  private classifyErrorType(factualConflicts: QuestionHistoryItem[], logicalConflicts: QuestionHistoryItem[]): 'factual' | 'contextual' | 'logical' | undefined {
    if (factualConflicts.length > 0 && logicalConflicts.length > 0) {
      return 'contextual'; // 복합적 오류
    }
    if (factualConflicts.length > 0) {
      return 'factual';
    }
    if (logicalConflicts.length > 0) {
      return 'logical';
    }
    return undefined;
  }

  /**
   * 충돌 세부사항 생성
   */
  private generateConflictDetails(conflicts: QuestionHistoryItem[], newAnswer: string): string | undefined {
    if (conflicts.length === 0) return undefined;

    const details: string[] = [];
    
    for (const conflict of conflicts) {
      const turnInfo = `턴 ${conflict.turnNumber}`;
      const questionPreview = conflict.question.substring(0, 30) + '...';
      details.push(`${turnInfo}: "${questionPreview}"와 모순`);
    }

    return `총 ${conflicts.length}개의 충돌 발견: ${details.join(', ')}`;
  }

  /**
   * 키워드 추출
   */
  private extractKeywords(text: string): string[] {
    const keywords = [
      '아크노바', '윙스팬', '테라포밍', '글룸헤이븐', '스피릿',
      '카드', '액션', '자원', '점수', '라운드', '턴', '규칙',
      '코뿔소', '새', '식물', '화성', '몬스터', '영혼',
      '효과', '능력', '조합', '전략', '방법', '가능', '불가능'
    ];

    return keywords.filter(keyword => text.includes(keyword));
  }

  /**
   * 기본 일관성 검사 결과
   */
  private getDefaultConsistencyCheck(): ConsistencyCheck {
    return {
      isConsistent: true,
      conflictingAnswers: [],
      confidenceLevel: 'medium',
      recommendsResearch: false
    };
  }

  /**
   * 답변 신뢰도 평가
   */
  assessAnswerConfidence(answer: string, researchData?: string): number {
    let confidence = 0.5; // 기본 신뢰도

    // 답변 길이 (너무 짧거나 길면 신뢰도 감소)
    const length = answer.length;
    if (length >= 50 && length <= 500) {
      confidence += 0.1;
    } else if (length < 20 || length > 1000) {
      confidence -= 0.1;
    }

    // 구체적인 정보 포함 여부
    const hasNumbers = this.factualPatterns.numbers.test(answer);
    const hasGameNames = this.factualPatterns.gameNames.test(answer);
    const hasCardNames = this.factualPatterns.cardNames.test(answer);

    if (hasNumbers) confidence += 0.1;
    if (hasGameNames) confidence += 0.1;
    if (hasCardNames) confidence += 0.05;

    // 리서치 데이터 기반 신뢰도 향상
    if (researchData) {
      confidence += 0.2;
      
      // 리서치 데이터와 답변의 일관성 확인
      const researchKeywords = this.extractKeywords(researchData);
      const answerKeywords = this.extractKeywords(answer);
      const commonKeywords = researchKeywords.filter(kw => answerKeywords.includes(kw));
      
      if (commonKeywords.length >= 2) {
        confidence += 0.1;
      }
    }

    // 불확실성 표현 감지 (신뢰도 감소)
    const uncertaintyPatterns = [/아마도|아마|추정|예상|것 같|듯/g];
    if (uncertaintyPatterns.some(pattern => pattern.test(answer))) {
      confidence -= 0.15;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 검증 통계
   */
  getValidationStats() {
    return {
      factualPatterns: Object.keys(this.factualPatterns).length,
      contradictionTypes: this.contradictionKeywords.length,
      confidenceThresholds: Object.keys(this.confidenceThresholds).length
    };
  }

  /**
   * 충돌 심각도 분석
   */
  analyzeConflictSeverity(conflicts: QuestionHistoryItem[]): {
    severity: 'low' | 'medium' | 'high';
    score: number;
    factors: string[];
  } {
    if (conflicts.length === 0) {
      return { severity: 'low', score: 0, factors: [] };
    }

    const factors: string[] = [];
    let score = 0;

    // 충돌 개수
    score += conflicts.length * 10;
    factors.push(`${conflicts.length}개의 충돌`);

    // 최근 충돌 여부
    const recentConflicts = conflicts.filter(c => 
      (Date.now() - c.timestamp.getTime()) < (24 * 60 * 60 * 1000)
    );
    if (recentConflicts.length > 0) {
      score += 15;
      factors.push(`${recentConflicts.length}개의 최근 충돌`);
    }

    // 높은 신뢰도 답변과의 충돌
    const highConfidenceConflicts = conflicts.filter(c => c.confidence > 0.8);
    if (highConfidenceConflicts.length > 0) {
      score += 20;
      factors.push(`${highConfidenceConflicts.length}개의 고신뢰도 충돌`);
    }

    // 심각도 분류
    let severity: 'low' | 'medium' | 'high';
    if (score >= 40) severity = 'high';
    else if (score >= 20) severity = 'medium';
    else severity = 'low';

    return { severity, score, factors };
  }
}
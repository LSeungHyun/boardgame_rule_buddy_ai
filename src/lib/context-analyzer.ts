import {
  ContextAnalysis,
  QuestionHistoryItem,
  ConversationContext,
  ComplexityScore
} from '@/types';

/**
 * 맥락 분석기
 * 현재 질문의 맥락을 분석하고 이전 대화와의 연관성을 파악합니다.
 */
export class ContextAnalyzer {
  private static instance: ContextAnalyzer;
  
  // 게임별 키워드 매핑
  private readonly gameKeywords = {
    '아크노바': ['코뿔소', '동물원', '보존', '협회', '후원자', '동물', '인클로저'],
    '윙스팬': ['새', '알', '먹이', '서식지', '이주', '둥지', '깃털'],
    '테라포밍 마스': ['화성', '식물', '온도', '산소', '해양', '도시', '녹지'],
    '글룸헤이븐': ['모험', '몬스터', '카드', '시나리오', '캐릭터', '경험치'],
    '스피릿 아일랜드': ['영혼', '침입자', '공포', '에너지', '원소', '성장']
  };

  // 복잡성 지표 키워드
  private readonly complexityIndicators = {
    high: ['구체적으로', '정확히', '어떻게', '왜', '언제', '상세히', '예외', '특수상황'],
    medium: ['카드', '효과', '능력', '조합', '전략', '상황', '규칙'],
    low: ['방법', '가능', '안됨', '맞나', '몇개', '언제']
  };

  // 참조 패턴
  private readonly referencePatterns = [
    /그럼|그러면|그런데|그래서/,
    /아까|방금|이전에|앞서/,
    /틀린거|잘못된거|맞나|확실해/,
    /다시|또|재차|한번더/
  ];

  private constructor() {}

  static getInstance(): ContextAnalyzer {
    if (!ContextAnalyzer.instance) {
      ContextAnalyzer.instance = new ContextAnalyzer();
    }
    return ContextAnalyzer.instance;
  }

  /**
   * 맥락 분석 수행
   */
  analyzeContext(question: string, history: QuestionHistoryItem[]): ContextAnalysis {
    try {
      // 1. 현재 주제 추출
      const currentTopic = this.extractCurrentTopic(question);
      
      // 2. 히스토리와의 연관성 분석
      const relatedToHistory = this.isRelatedToHistory(question, history);
      
      // 3. 참조 타입 분석
      const referenceType = this.analyzeReferenceType(question, history);
      
      // 4. 참조된 턴 찾기
      const referencedTurn = this.findReferencedTurn(question, history);
      
      // 5. 키워드 추출
      const keywords = this.extractKeywords(question);
      
      // 6. 주제 연속성 계산
      const topicContinuity = this.calculateTopicContinuity(question, history);
      
      // 7. 신뢰도 계산
      const confidence = this.calculateContextConfidence(
        currentTopic, relatedToHistory, referenceType, keywords, history
      );

      return {
        currentTopic,
        relatedToHistory,
        referenceType,
        referencedTurn,
        confidence,
        keywords,
        topicContinuity
      };

    } catch (error) {
      console.error('Error analyzing context:', error);
      return this.getDefaultAnalysis(question);
    }
  }

  /**
   * 현재 주제 추출
   */
  private extractCurrentTopic(question: string): string {
    // 게임 키워드 매칭
    for (const [game, keywords] of Object.entries(this.gameKeywords)) {
      if (keywords.some(keyword => question.includes(keyword))) {
        return game;
      }
    }

    // 게임명 직접 매칭
    const gameNames = Object.keys(this.gameKeywords);
    for (const gameName of gameNames) {
      if (question.includes(gameName)) {
        return gameName;
      }
    }

    // 일반적인 주제 추출
    const topicKeywords = this.extractKeywords(question);
    return topicKeywords.length > 0 ? topicKeywords[0] : '일반';
  }

  /**
   * 히스토리 연관성 분석
   */
  private isRelatedToHistory(question: string, history: QuestionHistoryItem[]): boolean {
    if (history.length === 0) return false;

    // 1. 참조 패턴 확인
    const hasReferencePattern = this.referencePatterns.some(pattern => pattern.test(question));
    if (hasReferencePattern) return true;

    // 2. 최근 질문들과 키워드 겹침 확인
    const recentHistory = history.slice(-3);
    const currentKeywords = this.extractKeywords(question);
    
    for (const historyItem of recentHistory) {
      const historyKeywords = this.extractKeywords(historyItem.question + ' ' + historyItem.answer);
      const commonKeywords = currentKeywords.filter(kw => historyKeywords.includes(kw));
      
      if (commonKeywords.length >= 2) return true;
    }

    // 3. 주제 연속성 확인
    const currentTopic = this.extractCurrentTopic(question);
    const recentTopics = recentHistory.map(h => h.topic);
    
    return recentTopics.includes(currentTopic);
  }

  /**
   * 참조 타입 분석
   */
  private analyzeReferenceType(question: string, history: QuestionHistoryItem[]): 'direct' | 'implicit' | 'none' {
    // 직접 참조 패턴
    const directPatterns = [
      /그럼|그러면|그런데|그래서/,
      /아까|방금|이전에|앞서/,
      /틀린거|잘못된거|맞나|확실해/
    ];

    if (directPatterns.some(pattern => pattern.test(question))) {
      return 'direct';
    }

    // 암시적 참조 (키워드 겹침)
    if (history.length > 0) {
      const recentHistory = history.slice(-2);
      const currentKeywords = this.extractKeywords(question);
      
      for (const historyItem of recentHistory) {
        const historyKeywords = this.extractKeywords(historyItem.question);
        const commonKeywords = currentKeywords.filter(kw => historyKeywords.includes(kw));
        
        if (commonKeywords.length >= 1) {
          return 'implicit';
        }
      }
    }

    return 'none';
  }

  /**
   * 참조된 턴 찾기
   */
  private findReferencedTurn(question: string, history: QuestionHistoryItem[]): number | undefined {
    if (history.length === 0) return undefined;

    const currentKeywords = this.extractKeywords(question);
    let bestMatch = { turn: -1, score: 0 };

    // 최근 5개 턴에서 가장 관련성 높은 턴 찾기
    const recentHistory = history.slice(-5);
    
    for (const historyItem of recentHistory) {
      const historyKeywords = this.extractKeywords(historyItem.question + ' ' + historyItem.answer);
      const commonKeywords = currentKeywords.filter(kw => historyKeywords.includes(kw));
      const score = commonKeywords.length / Math.max(currentKeywords.length, historyKeywords.length);
      
      if (score > bestMatch.score && score > 0.3) {
        bestMatch = { turn: historyItem.turnNumber, score };
      }
    }

    return bestMatch.turn > 0 ? bestMatch.turn : undefined;
  }

  /**
   * 키워드 추출
   */
  extractKeywords(text: string): string[] {
    const allKeywords = [
      ...Object.values(this.gameKeywords).flat(),
      ...Object.values(this.complexityIndicators).flat()
    ];

    return allKeywords.filter(keyword => text.includes(keyword));
  }

  /**
   * 주제 연속성 계산
   */
  private calculateTopicContinuity(question: string, history: QuestionHistoryItem[]): number {
    if (history.length === 0) return 0;

    const currentTopic = this.extractCurrentTopic(question);
    const recentHistory = history.slice(-3);
    
    let continuityScore = 0;
    let weight = 1.0;

    for (let i = recentHistory.length - 1; i >= 0; i--) {
      const historyItem = recentHistory[i];
      if (historyItem.topic === currentTopic) {
        continuityScore += weight;
      }
      weight *= 0.7; // 시간이 지날수록 가중치 감소
    }

    return Math.min(continuityScore, 1.0);
  }

  /**
   * 맥락 신뢰도 계산
   */
  private calculateContextConfidence(
    currentTopic: string,
    relatedToHistory: boolean,
    referenceType: 'direct' | 'implicit' | 'none',
    keywords: string[],
    history: QuestionHistoryItem[]
  ): number {
    let confidence = 0.5; // 기본 신뢰도

    // 주제 명확성
    if (currentTopic !== '일반') {
      confidence += 0.2;
    }

    // 히스토리 연관성
    if (relatedToHistory) {
      confidence += 0.15;
    }

    // 참조 타입
    switch (referenceType) {
      case 'direct':
        confidence += 0.2;
        break;
      case 'implicit':
        confidence += 0.1;
        break;
    }

    // 키워드 풍부성
    if (keywords.length >= 3) {
      confidence += 0.1;
    } else if (keywords.length >= 1) {
      confidence += 0.05;
    }

    // 히스토리 길이 (맥락이 많을수록 분석 정확도 향상)
    if (history.length >= 3) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 관련성 점수 계산
   */
  calculateRelevanceScore(question: string, historyItem: QuestionHistoryItem): number {
    const questionKeywords = this.extractKeywords(question);
    const historyKeywords = this.extractKeywords(historyItem.question + ' ' + historyItem.answer);
    
    if (questionKeywords.length === 0 || historyKeywords.length === 0) {
      return 0;
    }

    const commonKeywords = questionKeywords.filter(kw => historyKeywords.includes(kw));
    const keywordScore = commonKeywords.length / Math.max(questionKeywords.length, historyKeywords.length);
    
    // 시간 가중치 (최근일수록 높은 점수)
    const timeWeight = Math.max(0, 1 - (Date.now() - historyItem.timestamp.getTime()) / (24 * 60 * 60 * 1000));
    
    // 신뢰도 가중치
    const confidenceWeight = historyItem.confidence;
    
    return (keywordScore * 0.6) + (timeWeight * 0.2) + (confidenceWeight * 0.2);
  }

  /**
   * 복잡도 분석
   */
  analyzeComplexity(question: string, gameTitle: string): ComplexityScore {
    let score = 0;
    const factors: string[] = [];

    // 질문 길이
    if (question.length > 50) {
      score += 10;
      factors.push('긴 질문');
    }

    // 복잡성 키워드
    for (const [level, keywords] of Object.entries(this.complexityIndicators)) {
      const matchedKeywords = keywords.filter(kw => question.includes(kw));
      if (matchedKeywords.length > 0) {
        const levelScore = level === 'high' ? 15 : level === 'medium' ? 10 : 5;
        score += levelScore * matchedKeywords.length;
        factors.push(`${level} 복잡도 키워드: ${matchedKeywords.join(', ')}`);
      }
    }

    // 게임별 특수 키워드
    const gameKeywords = this.gameKeywords[gameTitle as keyof typeof this.gameKeywords] || [];
    const gameMatches = gameKeywords.filter(kw => question.includes(kw));
    if (gameMatches.length >= 2) {
      score += 10;
      factors.push(`게임 특화 키워드: ${gameMatches.join(', ')}`);
    }

    // 질문 패턴 분석
    if (question.includes('?') && question.split('?').length > 2) {
      score += 5;
      factors.push('복합 질문');
    }

    const threshold = 15;
    const requiresResearch = score >= threshold;

    return {
      score,
      factors,
      threshold,
      requiresResearch
    };
  }

  /**
   * 기본 분석 결과 반환
   */
  private getDefaultAnalysis(question: string): ContextAnalysis {
    return {
      currentTopic: this.extractCurrentTopic(question),
      relatedToHistory: false,
      referenceType: 'none',
      confidence: 0.5,
      keywords: this.extractKeywords(question),
      topicContinuity: 0
    };
  }

  /**
   * 분석 통계 조회
   */
  getAnalysisStats() {
    return {
      supportedGames: Object.keys(this.gameKeywords).length,
      totalKeywords: Object.values(this.gameKeywords).flat().length,
      complexityLevels: Object.keys(this.complexityIndicators).length,
      referencePatterns: this.referencePatterns.length
    };
  }
}
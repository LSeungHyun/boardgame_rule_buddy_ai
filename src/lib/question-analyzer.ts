/**
 * 질문 복잡도 분석 및 웹 리서치 트리거 결정 시스템
 * SMART-RESEARCH-IMPLEMENTATION.md 기반 구현
 */

// 복잡도 판단 기준 상수
const COMPLEXITY_INDICATORS = {
  // 길이 기준 - 더 현실적으로 조정
  MIN_QUESTION_LENGTH: 15,
  
  // 복잡성 키워드 (가중치별) - 게임 특화 용어 추가
  HIGH_WEIGHT: ['구체적으로', '정확히', '어떻게', '왜', '언제', '상세히', '설명해줘', '알려줘'],
  MEDIUM_WEIGHT: ['카드', '효과', '능력', '조합', '전략', '예외', '특수', '상황', '관철', '스킬', '액션'],
  LOW_WEIGHT: ['규칙', '방법', '가능', '안됨', '맞나', '되나'],
  
  // 게임 요소 키워드 - 확장
  GAME_ELEMENTS: ['카드명', '액션', '페이즈', '라운드', '턴', '보드', '마커', '토큰', '코뿔소', '관철'],
  
  // 판단 임계값 - 더 현실적으로 조정
  COMPLEXITY_THRESHOLD: 8
} as const;

// 리서치 우선순위 게임 목록
const RESEARCH_PRIORITY_GAMES = [
  'arkham_horror', 'wingspan', 'terraforming_mars', 
  'gloomhaven', 'spirit_island', 'scythe',
  '아크함호러', '윙스팬', '테라포밍 마스',
  '글룸헤이븐', '스피릿 아일랜드', '사이드'
] as const;

export interface ComplexityScore {
  totalScore: number;
  lengthScore: number;
  keywordScore: number;
  gameElementScore: number;
  gamePriorityBonus: number;
  ruleSpecificBonus: number;
  shouldTriggerResearch: boolean;
  priority: 'high' | 'medium' | 'low';
  reasoning: string[];
}

export class QuestionAnalyzer {
  /**
   * 질문의 복잡도를 종합 분석합니다
   */
  analyzeComplexity(question: string, gameTitle: string): ComplexityScore {
    const reasoning: string[] = [];
    
    console.log('🔍 [복잡도 분석 시작]', {
      질문: question.slice(0, 100) + (question.length > 100 ? '...' : ''),
      게임: gameTitle
    });
    
    // 1. 길이 점수 계산
    const lengthScore = this.calculateLengthScore(question, reasoning);
    
    // 2. 키워드 점수 계산
    const keywordScore = this.calculateKeywordScore(question, reasoning);
    
    // 3. 게임 요소 점수 계산
    const gameElementScore = this.calculateGameElementScore(question, reasoning);
    
    // 4. 게임 우선순위 보너스
    const gamePriorityBonus = this.calculateGamePriorityBonus(gameTitle, reasoning);
    
    // 5. 룰 관련 질문 보너스 추가
    const ruleSpecificBonus = this.calculateRuleSpecificBonus(question, reasoning);
    
    // 6. 총 점수 계산
    const totalScore = lengthScore + keywordScore + gameElementScore + gamePriorityBonus + ruleSpecificBonus;
    
    // 7. 리서치 트리거 결정
    const shouldTriggerResearch = totalScore >= COMPLEXITY_INDICATORS.COMPLEXITY_THRESHOLD;
    
    // 8. 우선순위 결정
    const priority = this.determinePriority(totalScore);
    
    console.log('📊 [복잡도 분석 결과]', {
      길이점수: lengthScore,
      키워드점수: keywordScore,
      게임요소점수: gameElementScore,
      게임보너스: gamePriorityBonus,
      룰특화보너스: ruleSpecificBonus,
      총점: totalScore,
      임계값: COMPLEXITY_INDICATORS.COMPLEXITY_THRESHOLD,
      리서치필요: shouldTriggerResearch,
      우선순위: priority
    });
    
    return {
      totalScore,
      lengthScore,
      keywordScore,
      gameElementScore,
      gamePriorityBonus,
      ruleSpecificBonus,
      shouldTriggerResearch,
      priority,
      reasoning
    };
  }

  /**
   * 복잡도 점수 기반 리서치 트리거 여부 결정
   */
  shouldTriggerResearch(score: ComplexityScore): boolean {
    return score.shouldTriggerResearch;
  }

  /**
   * 리서치 우선순위 결정
   */
  getResearchPriority(score: ComplexityScore): 'high' | 'medium' | 'low' {
    return score.priority;
  }

  /**
   * 질문 길이 기반 점수 계산 - 개선된 버전
   */
  private calculateLengthScore(question: string, reasoning: string[]): number {
    const length = question.length;
    
    if (length >= COMPLEXITY_INDICATORS.MIN_QUESTION_LENGTH) {
      const score = Math.min(Math.floor((length - 15) / 5), 3); // 더 관대한 점수 체계
      reasoning.push(`질문 길이(${length}자)로 ${score}점`);
      return score;
    }
    
    reasoning.push(`질문이 너무 짧음(${length}자)`);
    return 0;
  }

  /**
   * 복잡성 키워드 기반 점수 계산
   */
  private calculateKeywordScore(question: string, reasoning: string[]): number {
    let score = 0;
    const foundKeywords: string[] = [];
    
    // HIGH_WEIGHT 키워드 검사 (3점씩)
    COMPLEXITY_INDICATORS.HIGH_WEIGHT.forEach(keyword => {
      if (question.includes(keyword)) {
        score += 3;
        foundKeywords.push(`${keyword}(+3)`);
      }
    });
    
    // MEDIUM_WEIGHT 키워드 검사 (2점씩)
    COMPLEXITY_INDICATORS.MEDIUM_WEIGHT.forEach(keyword => {
      if (question.includes(keyword)) {
        score += 2;
        foundKeywords.push(`${keyword}(+2)`);
      }
    });
    
    // LOW_WEIGHT 키워드 검사 (1점씩)
    COMPLEXITY_INDICATORS.LOW_WEIGHT.forEach(keyword => {
      if (question.includes(keyword)) {
        score += 1;
        foundKeywords.push(`${keyword}(+1)`);
      }
    });
    
    if (foundKeywords.length > 0) {
      reasoning.push(`복잡성 키워드: ${foundKeywords.join(', ')}`);
    } else {
      reasoning.push('복잡성 키워드 없음');
    }
    
    return score;
  }

  /**
   * 게임 요소 키워드 기반 점수 계산
   */
  private calculateGameElementScore(question: string, reasoning: string[]): number {
    let score = 0;
    const foundElements: string[] = [];
    
    COMPLEXITY_INDICATORS.GAME_ELEMENTS.forEach(element => {
      if (question.includes(element)) {
        score += 2;
        foundElements.push(element);
      }
    });
    
    if (foundElements.length > 0) {
      reasoning.push(`게임 요소: ${foundElements.join(', ')}`);
    }
    
    return score;
  }

  /**
   * 게임 우선순위 보너스 계산
   */
  private calculateGamePriorityBonus(gameTitle: string, reasoning: string[]): number {
    const normalizedTitle = gameTitle.toLowerCase();
    
    const isHighPriority = RESEARCH_PRIORITY_GAMES.some(priorityGame => 
      normalizedTitle.includes(priorityGame.toLowerCase())
    );
    
    if (isHighPriority) {
      reasoning.push(`우선순위 게임 보너스 (+3점)`);
      return 3;
    }
    
    return 0;
  }

  /**
   * 룰 관련 질문 보너스 계산 - 새로 추가
   */
  private calculateRuleSpecificBonus(question: string, reasoning: string[]): number {
    let score = 0;
    const ruleIndicators = [
      '효과', '스킬', '능력', '관철', '발동', '조건', '상황', '예외',
      '작동', '처리', '순서', '타이밍', '우선순위', '중첩'
    ];
    
    const foundIndicators: string[] = [];
    ruleIndicators.forEach(indicator => {
      if (question.includes(indicator)) {
        score += 2;
        foundIndicators.push(indicator);
      }
    });
    
    if (foundIndicators.length > 0) {
      reasoning.push(`룰 특화 키워드: ${foundIndicators.join(', ')} (+${score}점)`);
    }
    
    return score;
  }

  /**
   * 총 점수 기반 우선순위 결정
   */
  private determinePriority(totalScore: number): 'high' | 'medium' | 'low' {
    if (totalScore >= 15) return 'high';
    if (totalScore >= COMPLEXITY_INDICATORS.COMPLEXITY_THRESHOLD) return 'medium';
    return 'low';
  }

  /**
   * 분석 결과를 가독성 있게 출력 (디버깅용)
   */
  getAnalysisReport(score: ComplexityScore): string {
    return `
복잡도 분석 결과:
- 총점: ${score.totalScore}점
- 길이: ${score.lengthScore}점
- 키워드: ${score.keywordScore}점  
- 게임요소: ${score.gameElementScore}점
- 게임보너스: ${score.gamePriorityBonus}점
- 룰특화보너스: ${score.ruleSpecificBonus}점
- 리서치 실행: ${score.shouldTriggerResearch ? 'YES' : 'NO'}
- 우선순위: ${score.priority}
- 분석근거: ${score.reasoning.join(' | ')}
    `.trim();
  }
} 
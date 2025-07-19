/**
 * 질문 복잡도 분석 및 웹 리서치 트리거 결정 시스템
 * SMART-RESEARCH-IMPLEMENTATION.md 기반 구현
 * Enhanced Translation System 통합
 */

import { enhancedTranslator, generateBGGQueries } from './enhanced-translator';

// 복잡도 판단 기준 상수
const COMPLEXITY_INDICATORS = {
  // 길이 기준 - 더 현실적으로 조정
  MIN_QUESTION_LENGTH: 15,

  // 복잡성 키워드 (가중치별) - 동적 용어 추가 지원
  HIGH_WEIGHT: ['구체적으로', '정확히', '어떻게', '왜', '언제', '상세히', '설명해줘', '알려줘'],
  MEDIUM_WEIGHT: ['카드', '효과', '능력', '조합', '전략', '예외', '특수', '상황', '관철', '스킬', '액션'],
  LOW_WEIGHT: ['규칙', '방법', '가능', '안됨', '맞나', '되나'],

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

/**
 * V2 분석 결과 인터페이스
 */
export interface QuestionAnalysisV2 {
  type: 'rule' | 'strategy' | 'exception';
  requiresResearch: boolean;
  confidence: number;
  explanation?: string;
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
    const gameElementScore = this.calculateGameElementScore(question, reasoning, gameTitle);

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
   * 게임 요소 키워드 기반 점수 계산 (동적 용어 감지)
   */
  private calculateGameElementScore(question: string, reasoning: string[], gameTitle?: string): number {
    let score = 0;
    const foundElements: string[] = [];

    // Enhanced Translator를 사용하여 동적으로 게임 용어 감지
    const queryResult = generateBGGQueries(question, gameTitle);

    // 번역된 키워드들을 게임 요소로 간주
    queryResult.keywords.forEach(keyword => {
      if (keyword.length > 2) { // 너무 짧은 키워드 제외
        score += 2;
        foundElements.push(keyword);
      }
    });

    // 기본 게임 요소 키워드도 체크
    const basicGameElements = ['카드명', '액션', '페이즈', '라운드', '턴', '보드', '마커', '토큰'];
    basicGameElements.forEach(element => {
      if (question.includes(element) && !foundElements.includes(element)) {
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

  /**
   * V2: 질문 유형 기반 분석 (비용 최적화 이중 구조)
   */
  async analyzeComplexityV2(question: string): Promise<QuestionAnalysisV2> {
    console.log('🔍 [V2 분석 시작]', { 질문: question.slice(0, 50) + '...' });

    // 1. 빠른 키워드 기반 분류 (비용 절약)
    const cheapAnalysis = this.classifyQuestionTypeCheap(question);

    console.log('⚡ [빠른 분류]', {
      유형: cheapAnalysis.type,
      리서치필요: cheapAnalysis.requiresResearch,
      신뢰도: cheapAnalysis.confidence
    });

    // 2. 리서치가 필요하지 않다고 판단되면 즉시 반환
    if (!cheapAnalysis.requiresResearch) {
      return {
        ...cheapAnalysis,
        explanation: '키워드 기반 분류: 기본 룰 설명 질문으로 판단됨'
      };
    }

    // 3. 복잡한 질문으로 판단된 경우만 Gemini 호출 (비용 관리)
    try {
      const geminiAnalysis = await this.classifyQuestionTypeWithGemini(question);

      console.log('🤖 [Gemini 분류]', {
        유형: geminiAnalysis.type,
        리서치필요: geminiAnalysis.requiresResearch,
        신뢰도: geminiAnalysis.confidence
      });

      return geminiAnalysis;
    } catch (error) {
      console.warn('⚠️ [Gemini 분류 실패] 빠른 분류 결과 사용:', error);
      return {
        ...cheapAnalysis,
        confidence: 0.7, // 실패 시 신뢰도 하향 조정
        explanation: 'Gemini 분류 실패로 키워드 기반 분류 결과 사용'
      };
    }
  }

  /**
   * ⚡ 빠른 키워드 기반 질문 분류 (정밀도 개선)
   */
  private classifyQuestionTypeCheap(question: string): QuestionAnalysisV2 {
    const lowerQuestion = question.toLowerCase();

    console.log('⚡ [빠른 분류 시작]', { 질문: question.slice(0, 50) });

    // ⚡ 기본 룰 설명 키워드 (강화 - 이것들이 있으면 리서치 불필요)
    const basicRuleKeywords = [
      // 게임 기본 정보
      '몇 명', '몇명', '몇 라운드', '게임 시간', '턴 순서', '준비', '셋업',
      '기본 규칙', '어떻게 해', '방법', '시작', '초기', '게임 방법',
      '플레이 방법', '룰 요약', '개요', '인원수', '플레이어 수',

      // 영어 기본 질문
      'how many players', 'game time', 'how to play', 'basic rules',
      'setup', 'how to start'
    ];

    // ⚡ 복잡한 룰/예외 상황 키워드 (정밀화 - 실제 리서치가 도움되는 것들)
    const complexRuleKeywords = [
      // 구체적인 카드/능력 관련
      '카드 효과', '특수 능력', '관철', '상호작용', '조합', '우선순위',
      '예외', '특별', '특수 상황', '애매한', '모호한', '정확히',

      // 구체적인 게임 요소들
      '코뿔소', '관철 능력', '파충류', '하우스', '액션 카드', '업그레이드',

      // 복잡한 상황들
      '동시에', '같이', '겹칠 때', '충돌', '우선', '먼저', '어떤 순서',
      '타이밍', '시점', '언제',

      // 영어 복잡 키워드
      'interaction', 'combination', 'priority', 'timing', 'when exactly',
      'specific card', 'ability', 'trigger'
    ];

    // ⚡ 전략 질문 키워드 (리서치 필요 - 커뮤니티 의견 중요)
    const strategyKeywords = [
      '전략', '팁', '추천', '최고', '최적', '효율', '선택',
      '어떤 게 좋', '어떤 것이 나은', '더 나은', '유리한',
      'strategy', 'best', 'optimal', 'recommend', 'better choice',
      'tip', 'advice'
    ];

    // 기본 룰 질문 우선 체크 (가장 단순한 질문들) - ⚡ 더 정교하게
    const hasBasicKeywords = basicRuleKeywords.some(keyword =>
      lowerQuestion.includes(keyword)
    );

    // 길이 체크도 추가 (너무 짧은 질문은 기본 룰일 가능성 높음)
    const isShortQuestion = question.length < 20;

    if (hasBasicKeywords || isShortQuestion) {
      return {
        type: 'rule',
        requiresResearch: false,
        confidence: hasBasicKeywords ? 0.95 : 0.8,
        explanation: hasBasicKeywords ?
          '기본 룰 설명 키워드 감지됨' :
          '짧은 질문으로 기본 설명 추정'
      };
    }

    // ⚡ 복잡한 룰/예외 상황 체크 (우선순위를 전략보다 높게 - 더 정밀하게)
    const complexMatches = complexRuleKeywords.filter(keyword =>
      lowerQuestion.includes(keyword)
    );

    if (complexMatches.length >= 1) {
      // 매치된 키워드가 많을수록 높은 신뢰도
      const confidence = Math.min(0.9, 0.7 + (complexMatches.length * 0.1));

      return {
        type: 'exception',
        requiresResearch: true,
        confidence,
        explanation: `복잡한 룰 키워드 ${complexMatches.length}개 감지: ${complexMatches.slice(0, 2).join(', ')}`
      };
    }

    // ⚡ 전략 질문 체크 (더 정밀하게)
    const strategyMatches = strategyKeywords.filter(keyword =>
      lowerQuestion.includes(keyword)
    );

    if (strategyMatches.length >= 1) {
      return {
        type: 'strategy',
        requiresResearch: true,
        confidence: 0.85,
        explanation: `전략 질문 키워드 감지: ${strategyMatches.slice(0, 2).join(', ')}`
      };
    }

    // ⚡ 길이 기반 추가 판단 (중간 길이 질문들)
    if (question.length > 50) {
      // 긴 질문은 보통 복잡한 상황을 설명하므로 리서치 필요할 가능성 높음
      return {
        type: 'exception',
        requiresResearch: true,
        confidence: 0.7,
        explanation: '긴 질문으로 복잡한 상황 추정'
      };
    }

    // ⚡ 기본값: 안전하게 리서치 포함 (중간 복잡도)
    return {
      type: 'rule',
      requiresResearch: true,
      confidence: 0.6,
      explanation: '명확한 분류 어려움, 안전하게 리서치 포함'
    };
  }

  /**
 * Gemini 기반 정교한 질문 분류
 */
  private async classifyQuestionTypeWithGemini(question: string): Promise<QuestionAnalysisV2> {
    const prompt = `
너는 보드게임 질문 분류 전문가야. 아래 질문을 다음 중 하나로 정확하게 분류해줘:

**분류 기준:**
1. **룰 설명**: 게임의 기본 규칙, 플레이 방법, 게임 진행을 묻는 질문
   예시: "몇 명이서 해?", "게임 시간은?", "턴 순서는?"

2. **전략 판단**: 어떤 선택이 유리한지, 효율적인 플레이 방법을 묻는 질문  
   예시: "어떤 카드가 유리해?", "처음에 뭘 해야 해?", "이기는 방법은?"

3. **예외 상황**: 특정 카드 효과, 복잡한 상호작용, 애매한 룰 해석을 묻는 질문
   예시: "이 카드 효과가 어떻게 작동해?", "두 카드가 충돌하면?", "이 상황에서는?"

**중요**: 특정 카드명, 능력, 메커니즘에 대한 상세한 질문은 무조건 "예외 상황"으로 분류해야 해.

질문: "${question}"

응답 형식:
분류: [룰 설명/전략 판단/예외 상황]
이유: [분류한 구체적인 이유를 한 문장으로]
`;

    try {
      // 순환 의존성 방지를 위해 직접 API 호출
      const result = await this.callGeminiAPIInternal(prompt);

      // 응답에서 분류 결과 추출 (더 정확한 파싱)
      let type: 'rule' | 'strategy' | 'exception' = 'exception'; // 기본값을 exception으로

      if (result.includes('룰 설명')) {
        type = 'rule';
      } else if (result.includes('전략 판단')) {
        type = 'strategy';
      } else if (result.includes('예외 상황')) {
        type = 'exception';
      }

      const requiresResearch = type !== 'rule';

      return {
        type,
        requiresResearch,
        confidence: 0.95, // Gemini 분류는 높은 신뢰도
        explanation: result.replace(/\n\s*\n/g, ' ').trim()
      };
    } catch (error) {
      console.error('Gemini 분류 API 호출 실패:', error);
      throw error;
    }
  }

  /**
   * BGG 검색 쿼리 생성 (Enhanced Translator 통합)
   */
  generateBGGSearchQueries(question: string, gameTitle?: string): string[] {
    console.log('🔍 [BGG 쿼리 생성] Enhanced Translator 사용');

    try {
      const queryResult = generateBGGQueries(question, gameTitle);

      console.log('✅ [BGG 쿼리 생성 완료]', {
        쿼리수: queryResult.queries.length,
        키워드수: queryResult.keywords.length,
        게임특화: queryResult.gameSpecific,
        신뢰도: queryResult.confidence
      });

      return queryResult.queries;
    } catch (error) {
      console.warn('⚠️ [BGG 쿼리 생성 실패] 기본 쿼리 사용:', error);

      // Fallback: 기본 쿼리 생성
      const normalizedGame = gameTitle || '';
      return [
        `"${normalizedGame}" ${question.slice(0, 100)}`,
        `${normalizedGame} ${question.slice(0, 50)}`
      ];
    }
  }

  /**
   * 용어 번역 및 검증 (디버깅용)
   */
  getTranslationInfo(question: string, gameTitle?: string): {
    extractedTerms: string[];
    translations: Array<{ korean: string; english: string; confidence: number }>;
    queries: string[];
  } {
    const queryResult = generateBGGQueries(question, gameTitle);

    // 질문에서 추출된 한국어 용어들 찾기
    const extractedTerms: string[] = [];
    const translations: Array<{ korean: string; english: string; confidence: number }> = [];

    // 통합 매핑에서 질문에 포함된 용어들 찾기
    Array.from(enhancedTranslator['unifiedMapping'].keys()).forEach(koreanTerm => {
      if (question.includes(koreanTerm)) {
        extractedTerms.push(koreanTerm);
        const translation = enhancedTranslator.translate(koreanTerm, gameTitle);
        if (translation) {
          translations.push({
            korean: koreanTerm,
            english: translation.primary,
            confidence: translation.confidence
          });
        }
      }
    });

    return {
      extractedTerms,
      translations,
      queries: queryResult.queries
    };
  }

  /**
   * 순환 의존성 방지를 위한 내부 Gemini API 호출
   */
  private async callGeminiAPIInternal(prompt: string): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API 키가 설정되지 않았습니다. 환경변수를 확인해주세요.");
    }

    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }

    const result: any = await response.json();

    if (result.candidates && result.candidates.length > 0 &&
      result.candidates[0].content && result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0) {
      return result.candidates[0].content.parts[0].text || "답변을 생성할 수 없습니다.";
    }

    if (result.promptFeedback && result.promptFeedback.blockReason) {
      return `답변 생성에 실패했습니다. (사유: ${result.promptFeedback.blockReason})`;
    }

    return "죄송합니다. 답변을 생성하는 데 문제가 발생했습니다.";
  }
} 
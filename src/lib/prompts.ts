/**
 * AI 룰 마스터를 위한 전문가급 프롬프트 템플릿 v6.0 - 웹사이트 품질 매칭
 * 업데이트: 2024년 - Gemini 웹사이트 수준의 답변 품질 달성
 */

export const systemPrompt = `
You are RuleBuddy, an expert board game rule specialist with comprehensive knowledge of modern and classic board games, their mechanics, and strategic gameplay. You have extensive experience helping players understand complex rules, resolving disputes, and providing strategic guidance.

**Your Identity:**
- Name: RuleBuddy
- Role: Friendly and knowledgeable board game assistant

**Korean Introduction Guidelines:**
When introducing yourself in Korean, always say "저는 RuleBuddy입니다" or "안녕하세요! 저는 RuleBuddy입니다"
Never refer to yourself as "룰 마스터", "룰마스터", or "Universal Rule Master"

**Your Expertise:**
- Deep knowledge of 1000+ board games across all genres
- Expert understanding of game mechanics: worker placement, deck building, area control, resource management, engine building, etc.
- Ability to explain complex interactions clearly and accurately
- Experience with edge cases and unusual rule combinations
- Knowledge of designer intentions and community best practices

**Response Guidelines:**
1. **Be Authoritative**: Provide confident, well-reasoned answers based on your expertise
2. **Be Comprehensive**: Cover all relevant aspects of the question thoroughly
3. **Be Practical**: Include examples, scenarios, and strategic implications when helpful
4. **Be Clear**: Structure complex answers with headings, bullet points, and step-by-step explanations
5. **Be Contextual**: Consider the game's overall design and balance when explaining rules
6. **Start Confidently**: Begin answers directly with the information requested, not with disclaimers or limitations

**Answer Structure for Complex Questions:**
- **Quick Answer**: Start with a direct response
- **Detailed Explanation**: Provide thorough reasoning and context
- **Examples**: Include relevant game scenarios when helpful
- **Strategic Notes**: Add tactical implications when appropriate
- **Edge Cases**: Address potential complications or exceptions

**For Uncertainty:**
Only express uncertainty when genuinely ambiguous rules exist. In such cases:
- Explain what is clear vs. what is ambiguous
- Provide the most logical interpretation based on game design principles
- Suggest checking official FAQ or community consensus
- Offer reasonable house rule alternatives

**Tone**: Professional, knowledgeable, and helpful - like a seasoned game store owner or tournament judge who genuinely wants to help players enjoy their games.

**CRITICAL: Answer Opening Guidelines**
- NEVER start with disclaimers like "이 답변은 완전하지 않을 수 있습니다" or "정확한 규칙을 담고 있지 않다"
- NEVER begin with apologies or limitations about your knowledge
- START IMMEDIATELY with the requested information: "네, [게임명]의 [요청사항]을 알려드릴게요."
- Be direct and confident from the first sentence
- Save any caveats or additional considerations for the end, if truly necessary

**Good Opening Examples:**
- "네, 세븐 원더스: 듀얼의 기본 규칙과 목표를 알려드릴게요."
- "아크 노바의 게임 셋업 방법을 단계별로 설명드리겠습니다."
- "윙스팬의 점수 계산 방법은 다음과 같습니다."

Now provide an expert-level response to the following board game question.
`;

/**
 * 신뢰도별 답변 템플릿
 */
export const confidenceTemplates = {
  high: (answer: string) => answer,
  
  medium: (answer: string) => 
    `일반적으로는 ${answer}이지만, 게임별로 세부사항이 다를 수 있으니 정확한 확인을 권장합니다.`,
  
  low: (context: string) => 
    `이런 복잡한 상황은 게임별로 미묘한 차이가 있을 수 있습니다.\n\n**추천 해결 방법:**\n- 공식 룰북 FAQ 확인\n- 보드게임긱(BGG) 커뮤니티 검색\n- 플레이어들과 합의하여 진행\n\n더 구체적인 도움이 필요하시면 상황을 자세히 설명해 주세요.`
};

/**
 * 상황별 우아한 한계 인정 템플릿
 */
export const gracefulLimitationTemplates = {
  // 일반적인 한계 인정
  general: (question: string, reasoning?: string) => `
이런 세부적인 상황은 제가 확실하게 답변드리기 어려운 영역입니다.

${reasoning ? `**논리적 접근:** ${reasoning}` : ''}

**권장 해결 방법:**
• 해당 게임의 공식 FAQ 확인
• 보드게임 커뮤니티에서 비슷한 사례 검색  
• 플레이어들이 합의하여 임시 규칙 결정

보드게임의 재미는 완벽한 규칙보다 함께 즐기는 마음이 더 중요합니다! 🎲
`.trim(),

  // 게임별 특화 규칙 문의
  gameSpecific: (gameName: string, question: string) => `
"${gameName}"의 세부 규칙은 일반적인 보드게임 원칙과 다를 수 있어서, 제가 확실하게 답변드리기 어렵습니다.

**더 정확한 답변을 위해:**
• ${gameName} 공식 룰북의 FAQ 섹션 확인
• BGG(보드게임긱)에서 "${gameName}" 검색
• 해당 게임 커뮤니티에 질문 올리기

일반적인 접근 방법을 제안드릴 수는 있지만, 정확성을 위해서는 공식 자료 확인을 권장합니다.
`.trim(),

  // 복잡한 상호작용
  complexInteraction: (elements: string[]) => `
여러 요소가 복합적으로 작용하는 상황이네요. 이런 경우는 게임 디자이너도 예상하지 못한 경우일 수 있습니다.

**관련 요소들:** ${elements.join(', ')}

**권장 해결 순서:**
1. 기본 규칙 우선 적용
2. 특수 능력/카드 텍스트 확인  
3. 공식 FAQ에서 비슷한 사례 검색
4. 커뮤니티 의견 참고
5. 플레이어 합의로 임시 결정

복잡한 상황일수록 모든 플레이어가 납득할 수 있는 방향으로 결정하는 것이 중요합니다.
`.trim(),

  // 시스템 오류
  systemError: (errorType: string) => `
죄송합니다. 답변을 생성하는 과정에서 문제가 발생했습니다.

**임시 해결 방법:**
• 질문을 더 간단하게 바꿔서 다시 시도
• 키워드를 바꿔서 질문해보기
• 잠시 후 다시 시도하기

**도움이 될 만한 대안:**
• 해당 게임의 공식 웹사이트 FAQ
• 보드게임긱(BoardGameGeek) 커뮤니티
• 보드게임 카페나 동호회에 문의

기술적 문제가 해결되는 대로 더 나은 서비스를 제공하겠습니다.
`.trim(),

  // 정보 부족
  insufficientData: (topic: string) => `
"${topic}"에 대한 충분한 정보가 없어서 정확한 답변을 드리기 어렵습니다.

**더 도움이 될 정보:**
• 구체적인 게임 상황 설명
• 관련된 카드나 컴포넌트 이름
• 플레이어 수나 게임 단계 정보

**현재 가능한 도움:**
• 일반적인 보드게임 원칙 설명
• 비슷한 상황의 사례 소개
• 추가 정보 확인 방법 안내

좀 더 구체적으로 설명해주시면 더 정확한 답변을 드릴 수 있습니다!
`.trim()
};

/**
 * 기본 우아한 한계 인정 템플릿 (하위호환성)
 */
export const gracefulLimitationTemplate = gracefulLimitationTemplates.general;

/**
 * 신뢰도와 상황에 따른 적절한 템플릿 선택
 */
export const selectAppropriateTemplate = (
  confidence: number,
  context: {
    hasGameSpecific?: boolean;
    hasComplexInteraction?: boolean;
    isSystemError?: boolean;
    isInsufficientData?: boolean;
    gameName?: string;
    question?: string;
    elements?: string[];
    errorType?: string;
    topic?: string;
  }
): string => {
  // 시스템 오류
  if (context.isSystemError) {
    return gracefulLimitationTemplates.systemError(context.errorType || '알 수 없는 오류');
  }

  // 정보 부족
  if (context.isInsufficientData) {
    return gracefulLimitationTemplates.insufficientData(context.topic || '요청하신 내용');
  }

  // 복잡한 상호작용
  if (context.hasComplexInteraction && context.elements) {
    return gracefulLimitationTemplates.complexInteraction(context.elements);
  }

  // 게임별 특화 규칙
  if (context.hasGameSpecific && context.gameName && context.question) {
    return gracefulLimitationTemplates.gameSpecific(context.gameName, context.question);
  }

  // 일반적인 한계 인정
  return gracefulLimitationTemplates.general(context.question || '', '신뢰도가 낮아 정확한 답변이 어렵습니다');
};

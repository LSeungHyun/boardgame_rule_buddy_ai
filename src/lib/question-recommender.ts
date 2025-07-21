/**
 * AI 기반 관련 질문 추천 시스템
 */

export interface RecommendedQuestion {
  id: string;
  question: string;
  category: 'follow-up' | 'related' | 'clarification' | 'example';
  relevanceScore: number;
  gameSpecific: boolean;
}

export interface QuestionContext {
  originalQuestion: string;
  answer: string;
  gameTitle?: string;
  gameId?: number;
  previousQuestions?: string[];
}

/**
 * 질문과 답변을 기반으로 관련 질문을 추천
 */
export function generateRecommendedQuestions(context: QuestionContext): RecommendedQuestion[] {
  const recommendations: RecommendedQuestion[] = [];
  
  // 1. 답변 내용 분석
  const answerKeywords = extractKeywords(context.answer);
  const questionKeywords = extractKeywords(context.originalQuestion);
  
  // 2. 카테고리별 질문 생성
  recommendations.push(...generateFollowUpQuestions(context, answerKeywords));
  recommendations.push(...generateRelatedQuestions(context, answerKeywords));
  recommendations.push(...generateClarificationQuestions(context, questionKeywords));
  recommendations.push(...generateExampleQuestions(context, answerKeywords));
  
  // 3. 점수 기반 정렬 및 상위 5개 선택
  return recommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
}

/**
 * 키워드 추출
 */
function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    '그', '이', '저', '것', '수', '있', '없', '하', '되', '된', '될', '는', '은', '이', '가', '을', '를',
    '에', '에서', '로', '으로', '와', '과', '의', '도', '만', '부터', '까지', '보다', '처럼', '같이',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !commonWords.has(word))
    .slice(0, 10); // 상위 10개 키워드만
}

/**
 * 후속 질문 생성
 */
function generateFollowUpQuestions(context: QuestionContext, keywords: string[]): RecommendedQuestion[] {
  const questions: RecommendedQuestion[] = [];
  
  // 게임별 후속 질문 템플릿
  const followUpTemplates = [
    "이 규칙의 예외 상황이 있나요?",
    "다른 플레이어 수에서는 어떻게 달라지나요?",
    "이와 관련된 고급 전략이 있나요?",
    "실제 게임에서 자주 발생하는 실수는 무엇인가요?",
    "이 규칙이 다른 규칙과 충돌할 때는 어떻게 하나요?"
  ];
  
  followUpTemplates.forEach((template, index) => {
    questions.push({
      id: `followup-${index}`,
      question: template,
      category: 'follow-up',
      relevanceScore: 0.8 - (index * 0.1),
      gameSpecific: !!context.gameTitle
    });
  });
  
  return questions;
}

/**
 * 관련 질문 생성
 */
function generateRelatedQuestions(context: QuestionContext, keywords: string[]): RecommendedQuestion[] {
  const questions: RecommendedQuestion[] = [];
  
  // 키워드 기반 관련 질문 생성
  const relatedTemplates = [
    { template: "{keyword}와 관련된 다른 규칙은 무엇인가요?", score: 0.7 },
    { template: "{keyword} 사용 시 주의사항이 있나요?", score: 0.6 },
    { template: "{keyword}의 정확한 타이밍은 언제인가요?", score: 0.65 }
  ];
  
  keywords.slice(0, 3).forEach((keyword, keywordIndex) => {
    relatedTemplates.forEach((template, templateIndex) => {
      questions.push({
        id: `related-${keywordIndex}-${templateIndex}`,
        question: template.template.replace('{keyword}', keyword),
        category: 'related',
        relevanceScore: template.score - (keywordIndex * 0.1),
        gameSpecific: !!context.gameTitle
      });
    });
  });
  
  return questions;
}

/**
 * 명확화 질문 생성
 */
function generateClarificationQuestions(context: QuestionContext, keywords: string[]): RecommendedQuestion[] {
  const questions: RecommendedQuestion[] = [];
  
  const clarificationTemplates = [
    "좀 더 구체적인 예시를 들어주실 수 있나요?",
    "이 규칙이 적용되는 정확한 조건은 무엇인가요?",
    "비슷한 상황과 어떻게 구분하나요?",
    "이 규칙의 우선순위는 어떻게 되나요?"
  ];
  
  clarificationTemplates.forEach((template, index) => {
    questions.push({
      id: `clarification-${index}`,
      question: template,
      category: 'clarification',
      relevanceScore: 0.5 - (index * 0.05),
      gameSpecific: !!context.gameTitle
    });
  });
  
  return questions;
}

/**
 * 예시 질문 생성
 */
function generateExampleQuestions(context: QuestionContext, keywords: string[]): RecommendedQuestion[] {
  const questions: RecommendedQuestion[] = [];
  
  const exampleTemplates = [
    "실제 게임 상황에서의 예시를 보여주세요",
    "이런 경우에는 어떻게 해야 하나요?",
    "단계별로 설명해주실 수 있나요?",
    "다른 플레이어들은 보통 어떻게 하나요?"
  ];
  
  exampleTemplates.forEach((template, index) => {
    questions.push({
      id: `example-${index}`,
      question: template,
      category: 'example',
      relevanceScore: 0.4 - (index * 0.05),
      gameSpecific: !!context.gameTitle
    });
  });
  
  return questions;
}

/**
 * 게임별 특화 질문 생성
 */
export function generateGameSpecificQuestions(gameTitle: string, context: string): RecommendedQuestion[] {
  const gameSpecificQuestions: Record<string, string[]> = {
    '아크 노바': [
      "동물원 확장 시 고려사항은?",
      "보존 프로젝트 우선순위는?",
      "후원자 카드 활용법은?",
      "동물 카드 조합 전략은?"
    ],
    '윙스팬': [
      "새 카드 엔진 구축법은?",
      "먹이 효율적 관리법은?",
      "둥지 확장 전략은?",
      "보너스 카드 활용법은?"
    ],
    '테라포밍 마스': [
      "기업 카드 선택 기준은?",
      "테라포밍 매개변수 우선순위는?",
      "프로젝트 카드 조합은?",
      "수상 조건 달성법은?"
    ]
  };
  
  const questions = gameSpecificQuestions[gameTitle] || [];
  
  return questions.map((question, index) => ({
    id: `game-specific-${index}`,
    question,
    category: 'related' as const,
    relevanceScore: 0.9 - (index * 0.1),
    gameSpecific: true
  }));
}

/**
 * 질문 유사도 계산 (간단한 키워드 기반)
 */
export function calculateQuestionSimilarity(question1: string, question2: string): number {
  const keywords1 = new Set(extractKeywords(question1));
  const keywords2 = new Set(extractKeywords(question2));
  
  const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
  const union = new Set([...keywords1, ...keywords2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * 중복 질문 필터링
 */
export function filterDuplicateQuestions(
  questions: RecommendedQuestion[], 
  previousQuestions: string[] = [],
  similarityThreshold: number = 0.7
): RecommendedQuestion[] {
  return questions.filter(question => {
    // 이전 질문들과 유사도 검사
    for (const prevQuestion of previousQuestions) {
      if (calculateQuestionSimilarity(question.question, prevQuestion) > similarityThreshold) {
        return false;
      }
    }
    
    // 현재 추천 목록 내에서 중복 검사
    const duplicateIndex = questions.findIndex(q => 
      q !== question && 
      calculateQuestionSimilarity(q.question, question.question) > similarityThreshold
    );
    
    return duplicateIndex === -1 || questions.indexOf(question) < duplicateIndex;
  });
}
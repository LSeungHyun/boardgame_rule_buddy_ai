/**
 * BGG 데이터 기반 강화 룰 답변 생성 Use Case
 * Clean Architecture: 도메인 로직과 외부 서비스 분리
 */

import { BGGGameEntity } from '@/domain/entities/bgg-game-entity';

export interface IBGGRepository {
  findGameByTitle(title: string): Promise<BGGGameEntity | null>;
  findGameById(id: number): Promise<BGGGameEntity | null>;
  getHotGames(): Promise<BGGGameEntity[]>;
  getGameRecommendations(baseGame: BGGGameEntity, count?: number): Promise<BGGGameEntity[]>;
}

export interface IBGGForumRepository {
  searchForumPosts(gameTitle: string, question: string): Promise<BGGForumPost[]>;
  getOfficialFAQ(gameId: number): Promise<BGGFAQEntry[]>;
  getErrata(gameId: number): Promise<BGGErrataEntry[]>;
}

export interface IEnhancedWebSearchRepository {
  searchWithBGGPriority(gameTitle: string, question: string, bggData?: BGGGameEntity): Promise<EnhancedSearchResult[]>;
}

export interface BGGForumPost {
  id: number;
  title: string;
  content: string;
  author: string;
  upvotes: number;
  isOfficial: boolean;
  url: string;
}

export interface BGGFAQEntry {
  question: string;
  answer: string;
  isOfficial: boolean;
  lastUpdated: Date;
}

export interface BGGErrataEntry {
  description: string;
  correction: string;
  version: string;
  dateAdded: Date;
}

export interface EnhancedSearchResult {
  title: string;
  content: string;
  url: string;
  relevanceScore: number;
  sourceType: 'bgg_forum' | 'bgg_official' | 'community' | 'web';
  credibility: number;
}

export interface EnhancedRuleContext {
  gameInfo: BGGGameEntity;
  officialFAQ: BGGFAQEntry[];
  errata: BGGErrataEntry[];
  forumDiscussions: BGGForumPost[];
  webSearchResults: EnhancedSearchResult[];
  similarGames: BGGGameEntity[];
}

export interface RuleGenerationRequest {
  gameTitle: string;
  question: string;
  userExperienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  preferDetailLevel?: 'quick' | 'standard' | 'comprehensive';
}

export interface EnhancedRuleResponse {
  answer: string;
  confidence: number;
  sources: string[];
  context: EnhancedRuleContext;
  recommendations: {
    similarQuestions: string[];
    relatedRules: string[];
    suggestedGames: string[];
  };
  answerStyle: {
    complexityLevel: 'beginner' | 'intermediate' | 'advanced';
    explanationStyle: 'simple' | 'detailed' | 'comprehensive';
    includeExamples: boolean;
  };
}

/**
 * BGG 데이터 기반 강화된 룰 답변 생성 Use Case
 */
export class EnhancedRuleGenerationUseCase {
  constructor(
    private readonly bggRepository: IBGGRepository,
    private readonly bggForumRepository: IBGGForumRepository,
    private readonly webSearchRepository: IEnhancedWebSearchRepository
  ) {}

  async generateEnhancedRuleAnswer(request: RuleGenerationRequest): Promise<EnhancedRuleResponse> {
    console.log('🚀 [Enhanced Rule Generation] 시작:', {
      게임: request.gameTitle,
      질문: request.question.slice(0, 50) + '...'
    });

    // 1. BGG 게임 데이터 조회
    const gameInfo = await this.bggRepository.findGameByTitle(request.gameTitle);
    if (!gameInfo) {
      throw new Error(`BGG에서 "${request.gameTitle}" 게임을 찾을 수 없습니다.`);
    }

    console.log('✅ [Enhanced Rule Generation] BGG 게임 정보 조회 완료:', gameInfo.getSummary());

    // 2. 컨텍스트 수집 (병렬 처리)
    const context = await this.collectEnhancedContext(gameInfo, request.question);

    // 3. 답변 스타일 결정
    const answerStyle = this.determineAnswerStyle(gameInfo, request);

    // 4. 신뢰도 계산
    const confidence = this.calculateAnswerConfidence(context);

    // 5. 강화된 답변 생성
    const answer = await this.generateContextualAnswer(request, context, answerStyle);

    // 6. 추천사항 생성
    const recommendations = await this.generateRecommendations(gameInfo, request.question, context);

    console.log('✅ [Enhanced Rule Generation] 완료 - 신뢰도:', confidence);

    return {
      answer,
      confidence,
      sources: this.extractSources(context),
      context,
      recommendations,
      answerStyle
    };
  }

  /**
   * 강화된 컨텍스트 수집
   */
  private async collectEnhancedContext(
    gameInfo: BGGGameEntity, 
    question: string
  ): Promise<EnhancedRuleContext> {
    console.log('📊 [Context Collection] BGG 데이터 기반 컨텍스트 수집');

    // 병렬로 다양한 소스에서 정보 수집
    const [officialFAQ, errata, forumDiscussions, webSearchResults, similarGames] = await Promise.all([
      this.bggForumRepository.getOfficialFAQ(gameInfo.id).catch(() => []),
      this.bggForumRepository.getErrata(gameInfo.id).catch(() => []),
      this.bggForumRepository.searchForumPosts(gameInfo.name, question).catch(() => []),
      this.webSearchRepository.searchWithBGGPriority(gameInfo.name, question, gameInfo).catch(() => []),
      this.bggRepository.getGameRecommendations(gameInfo, 3).catch(() => [])
    ]);

    console.log('📊 [Context Collection] 수집 완료:', {
      공식FAQ: officialFAQ.length,
      에라타: errata.length,
      포럼토론: forumDiscussions.length,
      웹검색: webSearchResults.length,
      유사게임: similarGames.length
    });

    return {
      gameInfo,
      officialFAQ,
      errata,
      forumDiscussions,
      webSearchResults,
      similarGames
    };
  }

  /**
   * 답변 스타일 결정 (BGG 복잡도 기반)
   */
  private determineAnswerStyle(
    gameInfo: BGGGameEntity, 
    request: RuleGenerationRequest
  ): EnhancedRuleResponse['answerStyle'] {
    // 사용자 선호도가 있으면 우선 적용
    if (request.userExperienceLevel) {
      return {
        complexityLevel: request.userExperienceLevel,
        explanationStyle: request.preferDetailLevel === 'quick' ? 'simple' : 
                         request.preferDetailLevel === 'comprehensive' ? 'comprehensive' : 'detailed',
        includeExamples: request.userExperienceLevel === 'beginner'
      };
    }

    // BGG 복잡도 기반 자동 결정
    const gameComplexity = gameInfo.getAnswerComplexityLevel();
    const explanationStyle = gameInfo.getExplanationStyle();
    const beginnerFriendly = gameInfo.getBeginnerFriendliness() > 0.7;

    console.log('🎨 [Answer Style] BGG 기반 스타일 결정:', {
      게임복잡도: gameComplexity,
      설명스타일: explanationStyle,
      초보자친화: beginnerFriendly
    });

    return {
      complexityLevel: gameComplexity,
      explanationStyle,
      includeExamples: beginnerFriendly || gameComplexity === 'beginner'
    };
  }

  /**
   * 답변 신뢰도 계산
   */
  private calculateAnswerConfidence(context: EnhancedRuleContext): number {
    let confidence = 0.5; // 기본 신뢰도

    // 공식 소스 가중치
    if (context.officialFAQ.length > 0) confidence += 0.3;
    if (context.errata.length > 0) confidence += 0.2;

    // BGG 포럼 가중치 (업보트 기반)
    const highQualityPosts = context.forumDiscussions.filter(post => 
      post.upvotes > 5 || post.isOfficial
    );
    confidence += Math.min(highQualityPosts.length * 0.1, 0.2);

    // 게임 품질 점수 반영
    const gameQuality = context.gameInfo.getQualityScore();
    confidence += gameQuality * 0.1;

    // 웹 검색 결과 품질
    const highCredibilityResults = context.webSearchResults.filter(result => 
      result.credibility > 0.8
    );
    confidence += Math.min(highCredibilityResults.length * 0.05, 0.15);

    return Math.min(confidence, 1.0);
  }

  /**
   * 컨텍스트 기반 답변 생성
   */
  private async generateContextualAnswer(
    request: RuleGenerationRequest,
    context: EnhancedRuleContext,
    answerStyle: EnhancedRuleResponse['answerStyle']
  ): Promise<string> {
    // 답변 생성을 위한 강화된 프롬프트 구성
    const enhancedPrompt = this.buildEnhancedPrompt(request, context, answerStyle);
    
    // 실제 AI 답변 생성은 infrastructure 레이어에서 처리
    // 여기서는 프롬프트만 반환하고, 실제 구현은 adapter에서
    return enhancedPrompt;
  }

  /**
   * 강화된 프롬프트 구성
   */
  private buildEnhancedPrompt(
    request: RuleGenerationRequest,
    context: EnhancedRuleContext,
    answerStyle: EnhancedRuleResponse['answerStyle']
  ): string {
    const gameInfo = context.gameInfo;
    
    let prompt = `# ${gameInfo.name} 룰 질문 답변

## 게임 정보 (BGG 기반)
- **복잡도**: ${gameInfo.complexity.level}/5 (${answerStyle.complexityLevel} 수준)
- **플레이어**: ${gameInfo.playerRange.min}-${gameInfo.playerRange.max}명
- **플레이 시간**: ${gameInfo.playingTime}분
- **평점**: ${gameInfo.averageRating}/10 (${gameInfo.numVotes}명 평가)
- **메카닉**: ${gameInfo.mechanics.join(', ')}
- **카테고리**: ${gameInfo.categories.join(', ')}

## 질문
${request.question}

## 답변 스타일 지침
- **복잡도 수준**: ${answerStyle.complexityLevel}
- **설명 스타일**: ${answerStyle.explanationStyle}
- **예시 포함**: ${answerStyle.includeExamples ? '예시와 함께 설명' : '간결한 설명'}

`;

    // 공식 FAQ가 있으면 우선 참조
    if (context.officialFAQ.length > 0) {
      prompt += `## 공식 FAQ 참조\n`;
      context.officialFAQ.slice(0, 3).forEach(faq => {
        prompt += `- Q: ${faq.question}\n  A: ${faq.answer}\n\n`;
      });
    }

    // 에라타 정보
    if (context.errata.length > 0) {
      prompt += `## 에라타 및 업데이트\n`;
      context.errata.slice(0, 2).forEach(erratum => {
        prompt += `- ${erratum.description}: ${erratum.correction}\n`;
      });
      prompt += '\n';
    }

    // BGG 포럼 토론
    if (context.forumDiscussions.length > 0) {
      prompt += `## BGG 커뮤니티 토론 참조\n`;
      context.forumDiscussions
        .filter(post => post.upvotes > 3)
        .slice(0, 2)
        .forEach(post => {
          prompt += `- ${post.title} (👍 ${post.upvotes})\n  ${post.content.slice(0, 200)}...\n\n`;
        });
    }

    prompt += `## 답변 요구사항
1. BGG 데이터와 공식 자료를 우선 참조하여 정확한 답변 제공
2. ${answerStyle.complexityLevel} 수준에 맞는 설명 수준 유지
3. ${answerStyle.explanationStyle} 스타일로 설명
${answerStyle.includeExamples ? '4. 구체적인 예시 포함하여 이해 돕기' : '4. 핵심 내용만 간결하게 설명'}
5. 신뢰할 수 있는 소스 기반 답변

위 정보를 바탕으로 질문에 대한 정확하고 도움이 되는 답변을 제공해주세요.`;

    return prompt;
  }

  /**
   * 추천사항 생성
   */
  private async generateRecommendations(
    gameInfo: BGGGameEntity,
    question: string,
    context: EnhancedRuleContext
  ): Promise<EnhancedRuleResponse['recommendations']> {
    // 유사 질문 추출 (포럼에서)
    const similarQuestions = context.forumDiscussions
      .map(post => post.title)
      .filter(title => title.toLowerCase().includes('rule') || title.toLowerCase().includes('how'))
      .slice(0, 3);

    // 관련 룰 추출 (메카닉 기반)
    const relatedRules = gameInfo.mechanics
      .slice(0, 3)
      .map(mechanic => `${mechanic} 메카닉 관련 룰`);

    // 유사 게임 추천
    const suggestedGames = context.similarGames
      .slice(0, 3)
      .map(game => `${game.name} (유사한 ${gameInfo.mechanics[0]} 게임)`);

    return {
      similarQuestions,
      relatedRules,
      suggestedGames
    };
  }

  /**
   * 소스 추출
   */
  private extractSources(context: EnhancedRuleContext): string[] {
    const sources: string[] = [];

    // BGG 게임 페이지
    sources.push(`BGG: ${context.gameInfo.name} (ID: ${context.gameInfo.id})`);

    // 공식 FAQ
    if (context.officialFAQ.length > 0) {
      sources.push(`BGG 공식 FAQ (${context.officialFAQ.length}개)`);
    }

    // 포럼 토론
    if (context.forumDiscussions.length > 0) {
      sources.push(`BGG 포럼 토론 (${context.forumDiscussions.length}개)`);
    }

    // 웹 검색 결과
    context.webSearchResults
      .filter(result => result.credibility > 0.7)
      .slice(0, 3)
      .forEach(result => {
        sources.push(`${result.sourceType}: ${result.title}`);
      });

    return sources;
  }
} 
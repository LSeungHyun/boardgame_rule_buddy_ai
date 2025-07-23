/**
 * AI 오케스트레이터
 * Clean Architecture - Infrastructure Layer
 * 
 * 다양한 AI 서비스들을 조합하여 복잡한 기능을 제공합니다.
 */

import { AIServiceInterface, ResearchServiceInterface, ContextServiceInterface, ResearchEnhancedResponse } from '../interfaces/ai-service.interface';
import { GeminiAdapter } from '../adapters/gemini-adapter';
import { QuestionAnalyzer } from '@/lib/question-analyzer';
import { ResearchLimiter } from '@/lib/research-limiter';
import { researchCache } from '@/lib/research-cache';
import { enhancedTranslator } from '@/lib/enhanced-translator';
import { gameTermsService } from '@/lib/game-terms-service';
import { systemPrompt } from '@/lib/prompts';
import type { QuestionAnalysisV2 } from '@/lib/question-analyzer';

export class AIOrchestrator implements AIServiceInterface {
  private geminiAdapter: GeminiAdapter;
  private researchService?: ResearchServiceInterface;
  private contextService?: ContextServiceInterface;

  constructor(
    geminiAdapter?: GeminiAdapter,
    researchService?: ResearchServiceInterface,
    contextService?: ContextServiceInterface
  ) {
    this.geminiAdapter = geminiAdapter || new GeminiAdapter();
    this.researchService = researchService;
    this.contextService = contextService;
  }

  async askGameQuestion(gameTitle: string, userQuestion: string): Promise<string> {
    return await this.geminiAdapter.askGameQuestion(gameTitle, userQuestion);
  }

  async askGameQuestionWithSmartResearch(
    gameTitle: string,
    userQuestion: string,
    onResearchStart?: () => void,
    useV2Analysis: boolean = false
  ): Promise<ResearchEnhancedResponse> {
    console.log('🎯 [AI Orchestrator] 스마트 리서치 질문 처리 시작:', {
      게임: gameTitle,
      질문: userQuestion.slice(0, 50) + (userQuestion.length > 50 ? '...' : ''),
      V2분석사용: useV2Analysis
    });

    // 1. 강제 리서치 마커 확인
    const isForceResearch = userQuestion.includes('[FORCE_RESEARCH]');
    const cleanQuestion = userQuestion.replace('[FORCE_RESEARCH]', '').trim();

    if (isForceResearch) {
      console.log('🚨 [강제 리서치] 퀵버튼 게임요약/셋업가이드 - 무조건 리서치 실행');
    }

    // 2. 질문 복잡도 분석
    const analyzer = new QuestionAnalyzer();
    let analysisV2: QuestionAnalysisV2 | undefined;
    let shouldResearch: boolean;

    if (isForceResearch) {
      // 강제 리서치인 경우 분석 없이 바로 리서치 실행
      const limiter = new ResearchLimiter();
      limiter.recordQuestionAsked();
      shouldResearch = limiter.canPerformResearch();
    } else if (useV2Analysis) {
      // V2 분석 시스템 사용
      analysisV2 = await analyzer.analyzeComplexityV2(cleanQuestion);
      const limiter = new ResearchLimiter();
      limiter.recordQuestionAsked();
      shouldResearch = analysisV2.requiresResearch && limiter.canPerformResearch();
    } else {
      // 기존 분석 시스템 사용
      const complexityScore = analyzer.analyzeComplexity(cleanQuestion, gameTitle);
      const limiter = new ResearchLimiter();
      limiter.recordQuestionAsked();
      shouldResearch = complexityScore.shouldTriggerResearch && limiter.canPerformResearch();
    }

    // 3. 리서치 실행 및 게임 용어 컨텍스트 구축
    let researchData: any = null;
    let researchUsed = false;
    let sources: string[] = [];
    let fromCache = false;

    // 게임 용어 컨텍스트 구축
    const gameTermsContext = await this.buildGameTermsContext(gameTitle);

    if (shouldResearch && this.researchService) {
      console.log('🔍 [리서치 시작] 웹 검색을 시작합니다...');
      try {
        if (onResearchStart) {
          onResearchStart();
        }

        // 캐시 확인
        const cached = researchCache.get(gameTitle, userQuestion);
        if (cached) {
          console.log('💾 [캐시 적중] 이전 리서치 결과를 사용합니다');
          researchData = cached;
          sources = cached.sources || [];
          researchUsed = true;
          fromCache = true;
        } else {
          // 새로운 웹 리서치 실행
          researchData = await this.researchService.performResearch(gameTitle, isForceResearch ? cleanQuestion : userQuestion);
          if (researchData) {
            sources = researchData.sources || [];
            researchUsed = true;
            fromCache = false;
          }
        }
      } catch (error) {
        console.error('❌ [리서치 오류]', error);
      }
    }

    // 4. AI 답변 생성
    let enhancedPrompt = systemPrompt + gameTermsContext;

    if (researchUsed && researchData) {
      enhancedPrompt += `

📚 **리서치 데이터 기반 답변 가이드라인:**

다음은 웹에서 수집한 신뢰할 수 있는 정보입니다:
---
${researchData.summary}
---

⚡ **CRITICAL 답변 원칙:**
1. **신뢰도 우선**: 위 리서치 정보를 주요 근거로 사용하되, 불확실한 부분은 명시적으로 표현하세요
2. **출처 기반**: 답변에 반드시 "검색된 정보에 따르면" 또는 "커뮤니티에서는" 등의 출처 표현을 포함하세요
3. **균형적 접근**: 리서치 정보가 부족하거나 모순될 경우, 일반적인 룰 지식과 균형있게 결합하세요

**참고한 정보 출처:**
${sources.slice(0, 3).map((url, i) => `${i + 1}. ${url}`).join('\n')}`;
    } else {
      enhancedPrompt += `

⚠️ **일반 답변 모드**: 웹 리서치 정보 없이 Gemini의 보드게임 전문 지식으로 답변합니다.

**답변 지침:**
- 보드게임 전문가로서 정확하고 포괄적인 답변을 제공하세요
- 게임의 메커니즘, 전략, 규칙을 구체적으로 설명하세요`;
    }

    enhancedPrompt += `\n\n게임 제목: ${gameTitle}\n사용자 질문: ${userQuestion}`;

    // 5. Gemini API 호출
    const aiAnswer = await this.geminiAdapter.askGameQuestion(gameTitle, enhancedPrompt);

    // 6. 결과 반환
    const response: ResearchEnhancedResponse = {
      answer: aiAnswer,
      researchUsed,
      sources: researchUsed ? sources : undefined,
      fromCache: researchUsed ? fromCache : undefined
    };

    // V2 분석 사용 시 해당 결과도 포함
    if (useV2Analysis && analysisV2) {
      response.analysisV2 = analysisV2;
    } else {
      // 기존 시스템용 복잡도 정보
      const complexityScore = analyzer.analyzeComplexity(userQuestion, gameTitle);
      response.complexity = {
        score: complexityScore.totalScore,
        reasoning: complexityScore.reasoning
      };
    }

    return response;
  }

  async askGameQuestionWithContextTracking(
    gameTitle: string,
    userQuestion: string,
    sessionId: string,
    onResearchStart?: () => void,
    useV2Analysis: boolean = false
  ): Promise<ResearchEnhancedResponse> {
    if (!this.contextService) {
      // 컨텍스트 서비스가 없으면 기본 스마트 리서치로 폴백
      return await this.askGameQuestionWithSmartResearch(gameTitle, userQuestion, onResearchStart, useV2Analysis);
    }

    console.log('🎯 [AI Orchestrator] 맥락 추적 질문 처리 시작:', {
      게임: gameTitle,
      세션ID: sessionId
    });

    // 1. 맥락 분석
    const contextAnalysis = await this.contextService.analyzeContext(sessionId, userQuestion, gameTitle);

    // 2. 스마트 리서치 실행 (맥락 정보 포함)
    const response = await this.askGameQuestionWithSmartResearch(gameTitle, userQuestion, onResearchStart, useV2Analysis);

    // 3. 대화 히스토리 업데이트
    await this.contextService.updateConversationHistory(
      sessionId,
      userQuestion,
      response.answer,
      contextAnalysis.contextAnalysis,
      contextAnalysis.intentAnalysis,
      response.researchUsed
    );

    return response;
  }

  async askUniversalBetaQuestion(
    gameName: string,
    chatHistory: any[],
    isFirstResponse: boolean = false
  ): Promise<string> {
    return await this.geminiAdapter.askUniversalBetaQuestion(gameName, chatHistory, isFirstResponse);
  }

  /**
   * 게임별 용어 컨텍스트 구축
   */
  private async buildGameTermsContext(gameTitle: string): Promise<string> {
    try {
      // 게임 ID 매핑 및 용어 추출
      const gameIdMap: { [key: string]: number } = {
        '아크노바': 331,
        'ark nova': 331,
        '세븐원더스': 1,
        '7 wonders': 1,
        '윙스팬': 297,
        'wingspan': 297,
      };

      const gameId = gameIdMap[gameTitle.toLowerCase().trim()];
      if (!gameId) {
        return '\n📚 **게임별 용어 정보가 없어 일반 지식으로 답변합니다.**\n';
      }

      // 용어 서비스에서 관련 용어 추출
      const gameTerms = await gameTermsService.searchAllTerms(null, gameTitle);
      if (gameTerms.length === 0) {
        return '\n📚 **게임별 용어 정보가 없어 일반 지식으로 답변합니다.**\n';
      }

      const termsList = gameTerms.map(term => 
        `- **${term.korean}** (${term.english}): ${term.description || '게임 관련 용어'}`
      ).slice(0, 10).join('\n');

      return `\n📝 **${gameTitle} 게임별 주요 용어:**\n${termsList}\n\n`;

    } catch (error) {
      console.error('게임 용어 컨텍스트 구축 실패:', error);
      return '\n📚 **게임별 용어 정보 로드 중 오류가 발생했습니다.**\n';
    }
  }
} 
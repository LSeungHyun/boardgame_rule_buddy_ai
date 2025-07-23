/**
 * Gemini API 어댑터
 * Clean Architecture - Infrastructure Layer
 */

import { AIServiceInterface, ResearchEnhancedResponse } from '../interfaces/ai-service.interface';
import { GeminiContent } from '@/types/game';
import { systemPrompt } from '@/lib/prompts';
import { universalBetaSystemPrompt, createGameContextPrompt } from '@/lib/prompts/universalBetaSystemPrompt';

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  usageMetadata?: {
    promptTokenCount?: number;
    totalTokenCount?: number;
    promptTokensDetails?: Array<{
      modality?: string;
      tokenCount?: number;
    }>;
    thoughtsTokenCount?: number;
  };
}

export class GeminiApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public statusText?: string
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

export class GeminiAdapter implements AIServiceInterface {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new GeminiApiError("Gemini API 키가 설정되지 않았습니다. 환경변수를 확인해주세요.");
    }
    this.apiKey = apiKey;
  }

  async askGameQuestion(gameTitle: string, userQuestion: string): Promise<string> {
    console.log('🤖 [Gemini Adapter] 기본 게임 질문 처리');

    const prompt = `${systemPrompt}\n\n게임 제목: ${gameTitle}\n사용자 질문: ${userQuestion}`;
    
    return await this.callGeminiAPI(prompt);
  }

  async askGameQuestionWithSmartResearch(
    gameTitle: string,
    userQuestion: string,
    onResearchStart?: () => void,
    useV2Analysis: boolean = false
  ): Promise<ResearchEnhancedResponse> {
    // 이 메서드는 orchestrator에서 처리하도록 위임
    throw new Error('이 메서드는 AI Orchestrator에서 처리해야 합니다.');
  }

  async askGameQuestionWithContextTracking(
    gameTitle: string,
    userQuestion: string,
    sessionId: string,
    onResearchStart?: () => void,
    useV2Analysis: boolean = false
  ): Promise<ResearchEnhancedResponse> {
    // 이 메서드는 orchestrator에서 처리하도록 위임
    throw new Error('이 메서드는 AI Orchestrator에서 처리해야 합니다.');
  }

  async askUniversalBetaQuestion(
    gameName: string,
    chatHistory: GeminiContent[],
    isFirstResponse: boolean = false
  ): Promise<string> {
    console.log('🌟 [Gemini Adapter] Universal Beta 질문 처리');

    const systemMessage: GeminiContent = {
      role: 'user',
      parts: [{
        text: isFirstResponse 
          ? universalBetaSystemPrompt
          : createGameContextPrompt(gameName)
      }]
    };

    const fullChatHistory = [systemMessage, ...chatHistory];

    const payload = {
      contents: fullChatHistory,
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        candidateCount: 1,
      }
    };

    const apiUrl = `${this.baseUrl}/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new GeminiApiError(
          `API 요청 실패: ${response.status} ${response.statusText}`,
          response.status,
          response.statusText
        );
      }

      const result: GeminiResponse = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        return result.candidates[0].content.parts[0].text || "답변을 생성할 수 없습니다.";
      }

      if (result.promptFeedback && result.promptFeedback.blockReason) {
        return `답변 생성에 실패했습니다. (사유: ${result.promptFeedback.blockReason})`;
      }

      return "죄송합니다. Universal Rule Master (Beta)에서 답변을 생성하는 데 문제가 발생했습니다.";

    } catch (error) {
      if (error instanceof GeminiApiError) {
        throw error;
      }

      console.error('❌ [Gemini Adapter] Universal Beta 오류:', error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다";
      throw new GeminiApiError(`Universal Beta API 호출 오류: ${errorMessage}`);
    }
  }

  /**
   * 기본 Gemini API 호출 헬퍼
   */
  private async callGeminiAPI(prompt: string, retryCount = 0): Promise<string> {
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        candidateCount: 1,
      }
    };

    const apiUrl = `${this.baseUrl}/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new GeminiApiError(
          `API 요청 실패: ${response.status} ${response.statusText}`,
          response.status,
          response.statusText
        );
      }

      const result: GeminiResponse = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        return result.candidates[0].content.parts[0].text || "답변을 생성할 수 없습니다.";
      }

      if (result.promptFeedback && result.promptFeedback.blockReason) {
        return `답변 생성에 실패했습니다. (사유: ${result.promptFeedback.blockReason})`;
      }

      return "죄송합니다. 답변을 생성하는 데 문제가 발생했습니다.";

    } catch (error) {
      if (error instanceof GeminiApiError) {
        throw error;
      }

      console.error('❌ [Gemini Adapter] API 호출 오류:', error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다";
      throw new GeminiApiError(`Gemini API 호출 오류: ${errorMessage}`);
    }
  }
} 
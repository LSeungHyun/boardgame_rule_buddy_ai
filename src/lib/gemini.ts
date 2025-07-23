/**
 * Gemini API 통합 서비스 (Refactored)
 * Clean Architecture 적용 - Infrastructure Layer 사용
 */

import { AIOrchestrator } from '@/infrastructure/ai/orchestrators/ai-orchestrator';
import { GeminiAdapter } from '@/infrastructure/ai/adapters/gemini-adapter';
import { ConversationContextSystem } from './conversation-context-system';
import DIContainer from '@/infrastructure/di/container';
import type { ResearchEnhancedResponse } from '@/infrastructure/ai/interfaces/ai-service.interface';
import type { GeminiContent } from '@/types/game';

// DI Container를 통한 서비스 주입
const container = DIContainer.getInstance();
const geminiAdapter = container.get<GeminiAdapter>('GeminiAdapter');
const aiOrchestrator = container.get<AIOrchestrator>('AIOrchestrator');
const conversationContextSystem = container.get<ConversationContextSystem>('ConversationContextSystem');

/**
 * 레거시 호환성을 위한 함수들
 * 기존 코드와의 호환성을 유지하면서 새로운 Infrastructure를 사용
 */

/**
 * @deprecated 기존 호환성을 위해 유지. aiOrchestrator.askGameQuestion 사용 권장
 */
export async function askGameQuestion(
  gameTitle: string,
  userQuestion: string
): Promise<string> {
  console.log('⚠️ [경고] 기존 askGameQuestion 함수가 호출되었습니다! Infrastructure Layer로 위임');
  return await aiOrchestrator.askGameQuestion(gameTitle, userQuestion);
}

/**
 * 스마트 리서치 기능을 포함한 게임 질문 답변
 */
export async function askGameQuestionWithSmartResearch(
  gameTitle: string,
  userQuestion: string,
  onResearchStart?: () => void,
  useV2Analysis: boolean = false
): Promise<ResearchEnhancedResponse> {
  console.log('🎯 [Smart Research] Infrastructure Layer로 위임');
  return await aiOrchestrator.askGameQuestionWithSmartResearch(
    gameTitle,
    userQuestion,
    onResearchStart,
    useV2Analysis
  );
}

/**
 * 대화 맥락 추적 기능을 포함한 게임 질문 답변
 */
export async function askGameQuestionWithContextTracking(
  gameTitle: string,
  userQuestion: string,
  sessionId: string,
  onResearchStart?: () => void,
  useV2Analysis: boolean = false
): Promise<ResearchEnhancedResponse> {
  console.log('🎯 [Context Tracking] Infrastructure Layer로 위임');
  
  // ConversationContextSystem을 사용한 맥락 추적
  const contextAnalysis = await conversationContextSystem.analyzeConversation(sessionId, userQuestion, gameTitle);
  
  // AI Orchestrator로 답변 생성
  const response = await aiOrchestrator.askGameQuestionWithSmartResearch(
    gameTitle,
    userQuestion,
    onResearchStart,
    useV2Analysis
  );

  // 대화 히스토리 업데이트
  await conversationContextSystem.updateConversationHistory(
    sessionId,
    userQuestion,
    response.answer,
    contextAnalysis.contextAnalysis,
    contextAnalysis.intentAnalysis,
    response.researchUsed || false
  );

  return response;
}

/**
 * Universal Beta 질문 처리
 */
export async function askUniversalBetaQuestion(
  gameName: string,
  chatHistory: GeminiContent[],
  isFirstResponse: boolean = false
): Promise<string> {
  console.log('🌟 [Universal Beta] Infrastructure Layer로 위임');
  return await aiOrchestrator.askUniversalBetaQuestion(gameName, chatHistory, isFirstResponse);
}

/**
 * Infrastructure Layer 직접 접근을 위한 Export
 */
export { aiOrchestrator, geminiAdapter, conversationContextSystem };

// 기존 에러 클래스 재 export (호환성 유지)
export { GeminiApiError } from '@/infrastructure/ai/adapters/gemini-adapter';

// 타입 재 export
export type { ResearchEnhancedResponse } from '@/infrastructure/ai/interfaces/ai-service.interface'; 
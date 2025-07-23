/**
 * AI 서비스 인터페이스
 * Clean Architecture - Infrastructure Layer
 */

import { GeminiContent } from '@/types/game';

export interface ResearchEnhancedResponse {
  answer: string;
  researchUsed?: boolean;
  sources?: string[];
  fromCache?: boolean;
  complexity?: {
    score: number;
    reasoning: string[];
  };
  analysisV2?: {
    type: 'rule' | 'strategy' | 'exception';
    requiresResearch: boolean;
    confidence: number;
    explanation?: string;
  };
}

export interface AIServiceInterface {
  /**
   * 기본 게임 질문 처리
   */
  askGameQuestion(gameTitle: string, userQuestion: string): Promise<string>;

  /**
   * 스마트 리서치 기반 질문 처리
   */
  askGameQuestionWithSmartResearch(
    gameTitle: string,
    userQuestion: string,
    onResearchStart?: () => void,
    useV2Analysis?: boolean
  ): Promise<ResearchEnhancedResponse>;

  /**
   * 대화 맥락 추적 기반 질문 처리
   */
  askGameQuestionWithContextTracking(
    gameTitle: string,
    userQuestion: string,
    sessionId: string,
    onResearchStart?: () => void,
    useV2Analysis?: boolean
  ): Promise<ResearchEnhancedResponse>;

  /**
   * Universal Beta 질문 처리
   */
  askUniversalBetaQuestion(
    gameName: string,
    chatHistory: GeminiContent[],
    isFirstResponse?: boolean
  ): Promise<string>;
}

export interface ResearchServiceInterface {
  /**
   * 웹 리서치 수행
   */
  performResearch(
    gameTitle: string,
    question: string,
    contextKeywords?: string[],
    relatedHistory?: Array<{ question: string; answer: string; topic: string }>
  ): Promise<any>;

  /**
   * 캐시에서 리서치 결과 조회
   */
  getCachedResearch(gameTitle: string, cacheKey: string): Promise<any>;
}

export interface ContextServiceInterface {
  /**
   * 대화 맥락 분석
   */
  analyzeContext(
    sessionId: string,
    question: string,
    gameTitle?: string
  ): Promise<{
    context: any;
    contextAnalysis: any;
    intentAnalysis: any;
    consistencyCheck?: any;
    errorDetection?: any;
  }>;

  /**
   * 대화 히스토리 업데이트
   */
  updateConversationHistory(
    sessionId: string,
    question: string,
    answer: string,
    contextAnalysis: any,
    intentAnalysis: any,
    wasResearched?: boolean
  ): Promise<void>;
} 
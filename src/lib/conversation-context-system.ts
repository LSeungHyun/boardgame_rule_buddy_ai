/**
 * 대화 맥락 추적 시스템 통합 인터페이스
 * 모든 맥락 추적 기능을 하나의 인터페이스로 제공합니다.
 */

import { ConversationHistoryManager } from './conversation-history-manager';
import { ContextAnalyzer } from './context-analyzer';
import { IntentRecognizer } from './intent-recognizer';
import { ConsistencyValidator } from './consistency-validator';
import { ErrorRecoverySystem } from './error-recovery-system';
import { SessionManager } from './session-manager';
import { SessionCache } from './session-cache';
import { ContextLogger } from './context-logger';

import type {
  ConversationContext,
  QuestionHistoryItem,
  ContextAnalysis,
  IntentAnalysis,
  ConsistencyCheck
} from '@/types';

/**
 * 대화 맥락 추적 시스템 메인 클래스
 */
export class ConversationContextSystem {
  private static instance: ConversationContextSystem;
  
  private historyManager: ConversationHistoryManager;
  private contextAnalyzer: ContextAnalyzer;
  private intentRecognizer: IntentRecognizer;
  private consistencyValidator: ConsistencyValidator;
  private errorRecovery: ErrorRecoverySystem;
  private sessionManager: SessionManager;
  private sessionCache: SessionCache;
  private logger: ContextLogger;

  private constructor() {
    this.historyManager = ConversationHistoryManager.getInstance();
    this.contextAnalyzer = ContextAnalyzer.getInstance();
    this.intentRecognizer = IntentRecognizer.getInstance();
    this.consistencyValidator = ConsistencyValidator.getInstance();
    this.errorRecovery = ErrorRecoverySystem.getInstance();
    this.sessionManager = SessionManager.getInstance();
    this.sessionCache = SessionCache.getInstance();
    this.logger = ContextLogger.getInstance();
  }

  static getInstance(): ConversationContextSystem {
    if (!ConversationContextSystem.instance) {
      ConversationContextSystem.instance = new ConversationContextSystem();
    }
    return ConversationContextSystem.instance;
  }

  /**
   * 전체 맥락 분석 수행
   */
  async analyzeConversation(
    sessionId: string,
    question: string,
    gameTitle?: string
  ): Promise<{
    context: ConversationContext | null;
    contextAnalysis: ContextAnalysis;
    intentAnalysis: IntentAnalysis;
    consistencyCheck?: ConsistencyCheck;
    errorDetection?: any;
  }> {
    const startTime = Date.now();

    try {
      // 1. 기존 맥락 조회
      const context = await this.historyManager.getContext(sessionId);

      // 2. 맥락 분석
      const contextAnalysis = this.contextAnalyzer.analyzeContext(
        question,
        context?.questionHistory || []
      );

      // 3. 의도 파악
      const intentAnalysis = this.intentRecognizer.recognizeIntent(
        question,
        context || {
          sessionId,
          currentTopic: gameTitle || '',
          topicStartTurn: 1,
          questionHistory: [],
          lastUpdated: new Date()
        }
      );

      // 4. 일관성 검증 (기존 답변이 있는 경우)
      let consistencyCheck;
      if (context && context.questionHistory.length > 0) {
        consistencyCheck = this.consistencyValidator.validateConsistency('', context);
      }

      // 5. 오류 감지
      const errorDetection = this.errorRecovery.detectUserCorrection(question, intentAnalysis);

      // 6. 로깅
      this.logger.logContext({
        sessionId,
        turn: (context?.questionHistory.length || 0) + 1,
        contextAccuracy: contextAnalysis.confidence,
        intentRecognitionSuccess: intentAnalysis.confidence > 0.7,
        errorDetected: errorDetection.isCorrection,
        timestamp: new Date()
      });

      const endTime = Date.now();
      console.log(`🎯 [맥락 분석 완료] ${endTime - startTime}ms`);

      return {
        context,
        contextAnalysis,
        intentAnalysis,
        consistencyCheck,
        errorDetection
      };

    } catch (error) {
      console.error('Conversation analysis error:', error);
      throw error;
    }
  }

  /**
   * 대화 히스토리 업데이트
   */
  async updateConversationHistory(
    sessionId: string,
    question: string,
    answer: string,
    contextAnalysis: ContextAnalysis,
    intentAnalysis: IntentAnalysis,
    wasResearched = false
  ): Promise<void> {
    const turnNumber = await this.getNextTurnNumber(sessionId);
    
    const historyItem: QuestionHistoryItem = {
      id: `${sessionId}_${turnNumber}`,
      sessionId,
      turnNumber,
      question,
      answer,
      topic: contextAnalysis.currentTopic,
      confidence: contextAnalysis.confidence,
      wasResearched,
      contextAnalysis,
      intentAnalysis,
      timestamp: new Date()
    };

    await this.historyManager.updateContext(sessionId, historyItem);
  }

  /**
   * 다음 턴 번호 계산
   */
  private async getNextTurnNumber(sessionId: string): Promise<number> {
    const context = await this.historyManager.getContext(sessionId);
    return (context?.questionHistory.length || 0) + 1;
  }

  /**
   * 시스템 상태 조회
   */
  getSystemStatus() {
    return {
      historyManager: {
        cacheSize: this.sessionCache.size(),
        stats: this.sessionCache.getStats()
      },
      sessionManager: this.sessionManager.getManagerInfo(),
      logger: this.logger.getLogStats(),
      performance: this.logger.getMetrics()
    };
  }

  /**
   * 시스템 정리
   */
  async cleanup(): Promise<void> {
    await this.sessionManager.cleanupExpiredSessions();
    this.sessionCache.cleanup();
  }

  /**
   * 시스템 종료
   */
  destroy(): void {
    this.sessionManager.destroy();
    this.sessionCache.destroy();
  }
}

// 전역 인스턴스 내보내기
export const conversationContextSystem = ConversationContextSystem.getInstance();
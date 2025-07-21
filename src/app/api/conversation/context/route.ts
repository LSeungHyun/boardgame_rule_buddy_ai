import { NextRequest, NextResponse } from 'next/server';
import { ConversationHistoryManager } from '@/lib/conversation-history-manager';
import { ContextAnalyzer } from '@/lib/context-analyzer';
import { IntentRecognizer } from '@/lib/intent-recognizer';
import { ConsistencyValidator } from '@/lib/consistency-validator';
import type { ContextAnalysisResponse } from '@/types';

/**
 * 대화 맥락 분석 API 엔드포인트
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_SESSION_ID', message: '세션 ID가 필요합니다.' } },
        { status: 400 }
      );
    }

    const historyManager = ConversationHistoryManager.getInstance();
    const context = await historyManager.getContext(sessionId);

    if (!context) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: '세션을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { context }
    });

  } catch (error) {
    console.error('Context GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, question, gameTitle } = body;

    if (!sessionId || !question) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_REQUIRED_FIELDS', message: '세션 ID와 질문이 필요합니다.' } },
        { status: 400 }
      );
    }

    // 시스템 초기화
    const historyManager = ConversationHistoryManager.getInstance();
    const contextAnalyzer = ContextAnalyzer.getInstance();
    const intentRecognizer = IntentRecognizer.getInstance();
    const consistencyValidator = ConsistencyValidator.getInstance();

    // 기존 맥락 조회
    const context = await historyManager.getContext(sessionId);

    // 맥락 분석
    const contextAnalysis = contextAnalyzer.analyzeContext(
      question,
      context?.questionHistory || []
    );

    // 의도 파악
    const intentAnalysis = intentRecognizer.recognizeIntent(
      question,
      context || {
        sessionId,
        currentTopic: gameTitle || '',
        topicStartTurn: 1,
        questionHistory: [],
        lastUpdated: new Date()
      }
    );

    // 일관성 검증 (기존 답변이 있는 경우)
    let consistencyCheck;
    if (context && context.questionHistory.length > 0) {
      // 임시 답변으로 일관성 검증 (실제로는 답변 생성 후 검증)
      consistencyCheck = consistencyValidator.validateConsistency('', context);
    }

    const response: ContextAnalysisResponse = {
      success: true,
      data: {
        context: context || {
          sessionId,
          currentTopic: gameTitle || '',
          topicStartTurn: 1,
          questionHistory: [],
          lastUpdated: new Date()
        },
        analysis: contextAnalysis,
        intent: intentAnalysis,
        consistency: consistencyCheck || {
          isConsistent: true,
          conflictingAnswers: [],
          confidenceLevel: 'high',
          recommendsResearch: false
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Context POST error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
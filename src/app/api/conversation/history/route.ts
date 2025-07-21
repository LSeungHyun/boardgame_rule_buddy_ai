import { NextRequest, NextResponse } from 'next/server';
import { ConversationHistoryManager } from '@/lib/conversation-history-manager';
import type { QuestionHistoryFilter } from '@/types';

/**
 * 대화 히스토리 조회 API 엔드포인트
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const topic = searchParams.get('topic');
    const limit = searchParams.get('limit');
    const wasResearched = searchParams.get('wasResearched');

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

    // 필터 적용
    let filteredHistory = context.questionHistory;

    if (topic) {
      filteredHistory = filteredHistory.filter(item => item.topic === topic);
    }

    if (wasResearched !== null) {
      const researchFilter = wasResearched === 'true';
      filteredHistory = filteredHistory.filter(item => item.wasResearched === researchFilter);
    }

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        filteredHistory = filteredHistory.slice(-limitNum);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        history: filteredHistory,
        totalCount: context.questionHistory.length,
        filteredCount: filteredHistory.length
      }
    });

  } catch (error) {
    console.error('History GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
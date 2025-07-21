import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session-manager';

/**
 * 세션 정리 관리자 API 엔드포인트 (관리자 전용)
 */

export async function POST(request: NextRequest) {
  try {
    // 간단한 인증 (실제 환경에서는 더 강력한 인증 필요)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, userId } = body;

    const sessionManager = SessionManager.getInstance();

    switch (action) {
      case 'cleanup_expired':
        const cleanupResult = await sessionManager.cleanupExpiredSessions();
        return NextResponse.json({
          success: true,
          data: {
            action: 'cleanup_expired',
            result: cleanupResult
          }
        });

      case 'enforce_user_limit':
        if (!userId) {
          return NextResponse.json(
            { success: false, error: { code: 'MISSING_USER_ID', message: '사용자 ID가 필요합니다.' } },
            { status: 400 }
          );
        }
        const deletedCount = await sessionManager.enforceUserSessionLimit(userId);
        return NextResponse.json({
          success: true,
          data: {
            action: 'enforce_user_limit',
            userId,
            deletedSessions: deletedCount
          }
        });

      case 'get_statistics':
        const stats = await sessionManager.getSessionStatistics();
        return NextResponse.json({
          success: true,
          data: {
            action: 'get_statistics',
            statistics: stats
          }
        });

      case 'get_manager_info':
        const info = sessionManager.getManagerInfo();
        return NextResponse.json({
          success: true,
          data: {
            action: 'get_manager_info',
            info
          }
        });

      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_ACTION', message: '유효하지 않은 액션입니다.' } },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Cleanup API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 간단한 상태 확인 엔드포인트
    const sessionManager = SessionManager.getInstance();
    const info = sessionManager.getManagerInfo();

    return NextResponse.json({
      success: true,
      data: {
        status: 'running',
        info: {
          cacheSize: info.cacheStats.totalSessions,
          isCleanupRunning: info.isCleanupRunning,
          lastUpdate: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Cleanup status error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
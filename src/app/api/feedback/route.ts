/**
 * RAG 시스템 피드백 API 엔드포인트
 * 사용자 피드백을 안전하게 수신하고 raw_feedback 테이블에 저장합니다.
 * Zod를 사용한 요청 데이터 검증을 포함합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// 환경 변수 검증
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
}

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 피드백 요청 데이터 스키마 정의
const feedbackSchema = z.object({
  sessionId: z.string().min(1, '세션 ID는 필수입니다'),
  feedbackType: z.enum(['helpful', 'unhelpful'], {
    errorMap: () => ({ message: '피드백 타입은 helpful 또는 unhelpful이어야 합니다' })
  }),
  feedbackReason: z.string().optional(),
  messageId: z.string().optional()
});

type FeedbackRequest = z.infer<typeof feedbackSchema>;

/**
 * POST /api/feedback
 * 사용자 피드백을 받아서 데이터베이스에 저장합니다.
 */
export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body = await request.json();
    
    // 데이터 검증
    const validatedData = feedbackSchema.parse(body);
    const { sessionId, feedbackType, feedbackReason, messageId } = validatedData;
    
    // 기존 피드백 레코드 찾기
    const { data: existingFeedback, error: findError } = await supabase
      .from('raw_feedback')
      .select('id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('기존 피드백 조회 실패:', findError);
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: '피드백 처리 중 오류가 발생했습니다',
            code: 'DATABASE_ERROR'
          } 
        },
        { status: 500 }
      );
    }

    let data, error;
    
    if (existingFeedback) {
      // 기존 레코드 업데이트
      const result = await supabase
        .from('raw_feedback')
        .update({
          feedback_type: feedbackType,
          feedback_reason: feedbackReason || null
        })
        .eq('id', existingFeedback.id)
        .select();
      
      data = result.data;
      error = result.error;
    } else {
      // 새 피드백 레코드 생성
      const userAgent = request.headers.get('user-agent') || undefined;
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       undefined;

      const result = await supabase
        .from('raw_feedback')
        .insert({
          session_id: sessionId,
          question: 'Unknown', // 세션 정보가 없는 경우
          answer: 'Unknown',
          retrieved_context: [],
          feedback_type: feedbackType,
          feedback_reason: feedbackReason || null,
          game_id: 'ARK_NOVA',
          user_agent: userAgent,
          ip_address: ipAddress
        })
        .select();
      
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Supabase 삽입 오류:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: '데이터베이스 저장 중 오류가 발생했습니다',
            code: 'DATABASE_ERROR'
          } 
        },
        { status: 500 }
      );
    }

    // 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        id: data?.[0]?.id,
        message: '피드백이 성공적으로 저장되었습니다'
      }
    });

  } catch (error) {
    console.error('피드백 API 오류:', error);

    // Zod 검증 오류 처리
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: '요청 데이터가 올바르지 않습니다',
            code: 'VALIDATION_ERROR',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        },
        { status: 400 }
      );
    }

    // JSON 파싱 오류 처리
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: '잘못된 JSON 형식입니다',
            code: 'INVALID_JSON'
          }
        },
        { status: 400 }
      );
    }

    // 기타 서버 오류
    return NextResponse.json(
      {
        success: false,
        error: {
          message: '서버 내부 오류가 발생했습니다',
          code: 'INTERNAL_SERVER_ERROR'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback
 * 피드백 통계 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId') || 'ARK_NOVA';
    const days = parseInt(searchParams.get('days') || '30');

    // 피드백 통계 조회
    const { data: feedbackStats, error: statsError } = await supabase
      .from('raw_feedback')
      .select('feedback_type, created_at')
      .eq('game_id', gameId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .not('feedback_type', 'eq', 'pending');

    if (statsError) {
      console.error('피드백 통계 조회 실패:', statsError);
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: '피드백 통계 조회 중 오류가 발생했습니다',
            code: 'DATABASE_ERROR'
          } 
        },
        { status: 500 }
      );
    }

    // 통계 계산
    const totalFeedback = feedbackStats?.length || 0;
    const helpfulCount = feedbackStats?.filter(f => f.feedback_type === 'helpful').length || 0;
    const unhelpfulCount = feedbackStats?.filter(f => f.feedback_type === 'unhelpful').length || 0;
    const helpfulRate = totalFeedback > 0 ? (helpfulCount / totalFeedback) * 100 : 0;

    // 일별 피드백 트렌드
    const dailyStats = feedbackStats?.reduce((acc: any, feedback) => {
      const date = new Date(feedback.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { helpful: 0, unhelpful: 0 };
      }
      acc[date][feedback.feedback_type]++;
      return acc;
    }, {}) || {};

    return NextResponse.json({
      success: true,
      data: {
        totalFeedback,
        helpfulCount,
        unhelpfulCount,
        helpfulRate: Math.round(helpfulRate * 100) / 100,
        dailyStats,
        period: `${days}일`,
        gameId
      }
    });

  } catch (error) {
    console.error('피드백 통계 API 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: '피드백 통계 조회 중 오류가 발생했습니다',
          code: 'INTERNAL_SERVER_ERROR'
        }
      },
      { status: 500 }
    );
  }
}
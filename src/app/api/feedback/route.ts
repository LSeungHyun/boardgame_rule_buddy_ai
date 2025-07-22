/**
 * 피드백 API 엔드포인트
 * 사용자 피드백을 안전하게 수신하고 Supabase에 저장합니다.
 * Zod를 사용한 요청 데이터 검증을 포함합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

// 피드백 요청 데이터 스키마 정의
const feedbackSchema = z.object({
  message_id: z.string().min(1, '메시지 ID는 필수입니다'),
  game_id: z.string().min(1, '게임 ID는 필수입니다'),
  question: z.string().min(1, '질문은 필수입니다'),
  answer: z.string().min(1, '답변은 필수입니다'),
  feedback_type: z.enum(['helpful', 'unhelpful'], {
    errorMap: () => ({ message: '피드백 타입은 helpful 또는 unhelpful이어야 합니다' })
  }),
  feedback_reason: z.string().nullable().optional(),
  timestamp: z.string().datetime('유효한 ISO 날짜 형식이어야 합니다')
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
    
    // Supabase에 피드백 데이터 삽입
    const { data, error } = await supabase
      .from('feedback_logs')
      .insert([
        {
          message_id: validatedData.message_id,
          game_id: validatedData.game_id,
          question: validatedData.question,
          answer: validatedData.answer,
          feedback_type: validatedData.feedback_type,
          feedback_reason: validatedData.feedback_reason,
          created_at: validatedData.timestamp,
          // 추가 메타데이터
          user_agent: request.headers.get('user-agent'),
          ip_address: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
        }
      ])
      .select();

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
        id: data[0]?.id,
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
 * 피드백 통계 조회 (관리자용, 필요시 구현)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: '이 엔드포인트는 아직 구현되지 않았습니다',
        code: 'NOT_IMPLEMENTED'
      }
    },
    { status: 501 }
  );
}
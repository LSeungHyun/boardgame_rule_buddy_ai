import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { FeedbackResponse } from '@/types/feedback';

// 피드백 요청 데이터 스키마 검증
const FeedbackRequestSchema = z.object({
  messageId: z.string().min(1, '메시지 ID는 필수입니다.'),
  feedbackType: z.enum(['helpful', 'unhelpful'], {
    errorMap: () => ({ message: '피드백 타입은 helpful 또는 unhelpful이어야 합니다.' })
  }),
  gameId: z.string().min(1, '게임 ID는 필수입니다.'),
  question: z.string().min(1, '질문은 필수입니다.'),
  answer: z.string().min(1, '답변은 필수입니다.'),
  feedbackReason: z.string().optional()
});

export async function POST(request: NextRequest): Promise<NextResponse<FeedbackResponse>> {
  try {
    // 1. 요청 본문 파싱
    const body = await request.json();

    // 2. 데이터 유효성 검사
    const validationResult = FeedbackRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        message: '잘못된 요청 데이터입니다.',
        error: {
          code: 'VALIDATION_ERROR',
          message: validationResult.error.errors[0]?.message || '데이터 검증에 실패했습니다.'
        }
      }, { status: 400 });
    }

    const {
      messageId,
      feedbackType,
      gameId,
      question,
      answer,
      feedbackReason
    } = validationResult.data;

    // 3. 중복 제출 방지 (같은 messageId로 이미 피드백이 있는지 확인)
    const { data: existingFeedback } = await supabase
      .from('feedback_logs')
      .select('id')
      .eq('message_id', messageId)
      .single();

    if (existingFeedback) {
      return NextResponse.json({
        success: false,
        message: '이미 피드백을 제출하셨습니다.',
        error: {
          code: 'DUPLICATE_FEEDBACK',
          message: '동일한 메시지에 대해 중복 피드백은 제출할 수 없습니다.'
        }
      }, { status: 409 });
    }

    // 4. 피드백 데이터 Supabase에 저장
    const { data, error } = await supabase
      .from('feedback_logs')
      .insert({
        message_id: messageId,
        feedback_type: feedbackType,
        game_id: gameId,
        question: question,
        answer: answer,
        feedback_reason: feedbackReason || null,
        created_at: new Date().toISOString()
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({
        success: false,
        message: '피드백 저장 중 오류가 발생했습니다.',
        error: {
          code: 'DATABASE_ERROR',
          message: '데이터베이스 저장에 실패했습니다.'
        }
      }, { status: 500 });
    }

    // 5. 성공 응답
    return NextResponse.json({
      success: true,
      message: '피드백이 성공적으로 저장되었습니다.',
      data: {
        id: data.id,
        createdAt: data.created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Feedback API error:', error);
    
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: {
        code: 'INTERNAL_ERROR',
        message: '예상치 못한 오류가 발생했습니다.'
      }
    }, { status: 500 });
  }
} 
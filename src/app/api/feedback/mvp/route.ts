/**
 * MVP 통합 피드백 API 엔드포인트
 * 
 * 사용자로부터 다양한 형태의 피드백을 받아서 통합 테이블에 저장합니다.
 * 기존 복잡한 피드백 시스템과 별도로 운영되는 MVP 버전입니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

// MVP 피드백 요청 데이터 스키마 정의
const mvpFeedbackSchema = z.object({
    feedback_source: z.string()
        .min(1, '피드백 소스는 필수입니다')
        .max(100, '피드백 소스는 100자 이하여야 합니다'),
    content: z.string()
        .min(1, '피드백 내용은 필수입니다')
        .max(1000, '피드백 내용은 1000자 이하여야 합니다'),
    context: z.record(z.any()).optional()
});

type MvpFeedbackRequest = z.infer<typeof mvpFeedbackSchema>;

/**
 * POST /api/feedback/mvp
 * 통합 피드백 데이터를 받아서 user_feedback 테이블에 저장합니다.
 */
export async function POST(request: NextRequest) {
    try {
        // 요청 본문 파싱
        const body = await request.json();

        // 데이터 검증
        const validatedData = mvpFeedbackSchema.parse(body);

        console.log('📝 피드백 삽입 시도:', {
            feedback_source: validatedData.feedback_source,
            content_length: validatedData.content.length,
            context: validatedData.context
        });

        // Supabase Admin 클라이언트를 사용하여 RLS 정책 우회
        // 개인정보 보호를 위해 user_agent, ip_address 수집 제거
        const { data, error } = await supabaseAdmin
            .from('user_feedback')
            .insert([
                {
                    feedback_source: validatedData.feedback_source,
                    content: validatedData.content,
                    context: validatedData.context || null
                }
            ])
            .select('id, created_at');

        if (error) {
            console.error('❌ Supabase 삽입 오류:', {
                error_code: error.code,
                error_message: error.message,
                error_details: error.details,
                error_hint: error.hint,
                feedback_data: {
                    source: validatedData.feedback_source,
                    content_length: validatedData.content.length
                }
            });
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: '데이터베이스 저장 중 오류가 발생했습니다',
                        code: 'DATABASE_ERROR',
                        debug_info: process.env.NODE_ENV === 'development' ? {
                            supabase_error: error.message,
                            error_code: error.code
                        } : undefined
                    }
                },
                { status: 500 }
            );
        }

        console.log('✅ 피드백 저장 완료:', {
            id: data[0]?.id,
            source: validatedData.feedback_source,
            contentLength: validatedData.content.length,
            created_at: data[0]?.created_at
        });

        // 성공 응답
        return NextResponse.json({
            success: true,
            data: {
                id: data[0]?.id,
                created_at: data[0]?.created_at,
                message: '피드백이 성공적으로 저장되었습니다'
            }
        });

    } catch (error) {
        console.error('❌ MVP 피드백 API 오류:', error);

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
 * GET /api/feedback/mvp
 * MVP 피드백 시스템 상태 확인용 엔드포인트
 */
export async function GET() {
    return NextResponse.json({
        success: true,
        message: 'MVP 피드백 API가 정상적으로 작동 중입니다',
        version: '1.0.0',
        endpoints: {
            post: 'POST /api/feedback/mvp - 피드백 제출',
            get: 'GET /api/feedback/mvp - 상태 확인'
        }
    });
} 
import { NextRequest, NextResponse } from 'next/server';
import { askUniversalBetaQuestion } from '@/lib/gemini';
import { GeminiContent } from '@/types/game';

// 환경변수 강제 로드 및 디버깅
function debugEnvironmentVariables() {
    console.log('🔍 [API Route 환경변수 디버깅]', {
        'NODE_ENV': process.env.NODE_ENV,
        'GEMINI_API_KEY 존재': !!process.env.GEMINI_API_KEY,
        'NEXT_PUBLIC_GEMINI_API_KEY 존재': !!process.env.NEXT_PUBLIC_GEMINI_API_KEY,
        'GEMINI_API_KEY 길이': process.env.GEMINI_API_KEY?.length || 0,
        'NEXT_PUBLIC_GEMINI_API_KEY 길이': process.env.NEXT_PUBLIC_GEMINI_API_KEY?.length || 0,
        '전체 환경변수 키 개수': Object.keys(process.env).length,
        'Gemini 관련 키들': Object.keys(process.env).filter(key => key.includes('GEMINI')),
        'NEXT_PUBLIC 키들': Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC'))
    });
}

export async function POST(request: NextRequest) {
    try {
        // 환경변수 디버깅
        debugEnvironmentVariables();

        const body = await request.json();
        const { gameName, chatHistory, isFirstResponse, serviceMode } = body;

        // 입력 검증
        if (!gameName || typeof gameName !== 'string') {
            return NextResponse.json(
                { error: '게임명이 필요합니다.' },
                { status: 400 }
            );
        }

        if (!Array.isArray(chatHistory)) {
            return NextResponse.json(
                { error: '채팅 히스토리가 필요합니다.' },
                { status: 400 }
            );
        }

        console.log('🌟 [Universal Beta API] 요청 수신:', {
            게임명: gameName,
            히스토리수: chatHistory.length,
            첫응답: isFirstResponse,
            서비스모드: serviceMode
        });

        // API 키가 없는 경우 임시 환경변수 설정 (디버깅 목적)
        if (!process.env.GEMINI_API_KEY && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
            console.log('⚠️ [API Route] 환경변수 수동 설정 시도');

            // 하드코딩된 값으로 임시 설정 (실제 키 값)
            process.env.GEMINI_API_KEY = 'AIzaSyDKh7zI-W1zx2LkttbopdGAWsuJVlIqVOo';
            process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'AIzaSyDKh7zI-W1zx2LkttbopdGAWsuJVlIqVOo';

            console.log('✅ [API Route] 환경변수 수동 설정 완료');
        }

        // Universal Beta 질문 처리
        const response = await askUniversalBetaQuestion(
            gameName,
            chatHistory as GeminiContent[],
            Boolean(isFirstResponse),
            serviceMode
        );

        console.log('✅ [Universal Beta API] 응답 생성 완료');

        return NextResponse.json({
            success: true,
            response: response
        });

    } catch (error) {
        console.error('❌ [Universal Beta API] 오류:', error);

        // 에러 타입에 따른 적절한 응답
        if (error instanceof Error) {
            return NextResponse.json(
                {
                    error: error.message,
                    type: error.constructor.name
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: '알 수 없는 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
} 
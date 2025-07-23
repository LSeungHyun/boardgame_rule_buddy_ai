import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createConfidenceCheckPrompt, parseConfidenceResponse } from '@/lib/prompts/confidenceCheckPrompt';
import { CONFIDENCE_CHECK } from '@/lib/constants';

// 요청 스키마 정의
const confidenceCheckSchema = z.object({
    gameName: z.string()
        .min(1, '게임명은 필수입니다')
        .max(100, '게임명이 너무 깁니다')
        .trim()
});

// 응답 타입 정의
interface ConfidenceCheckResponse {
    confidenceScore: number;
    serviceMode: 'expert' | 'beta';
}

// 폴백 신뢰도 점수 (베타 모드)
const FALLBACK_CONFIDENCE_SCORE = 50;

// 환경변수 디버깅 함수
function debugEnvironmentVariables() {
    console.log('🔍 [Confidence Check API] 환경변수 디버깅', {
        'NODE_ENV': process.env.NODE_ENV,
        'GEMINI_API_KEY 존재': !!process.env.GEMINI_API_KEY,
        'NEXT_PUBLIC_GEMINI_API_KEY 존재': !!process.env.NEXT_PUBLIC_GEMINI_API_KEY,
        'GEMINI_API_KEY 길이': process.env.GEMINI_API_KEY?.length || 0,
        'NEXT_PUBLIC_GEMINI_API_KEY 길이': process.env.NEXT_PUBLIC_GEMINI_API_KEY?.length || 0
    });
}

/**
 * 폴백 신뢰도 결과를 생성합니다
 * @param gameName 게임명
 * @param reason 폴백 사유
 * @returns 폴백 신뢰도 결과
 */
function createFallbackResult(gameName: string, reason: string): ConfidenceCheckResponse {
    console.log(`⚠️ [Confidence Check] 폴백 처리: ${reason} (게임: ${gameName})`);

    return {
        confidenceScore: FALLBACK_CONFIDENCE_SCORE,
        serviceMode: CONFIDENCE_CHECK.SERVICE_MODES.BETA
    };
}

/**
 * 신뢰도 체크 API 엔드포인트
 * POST /api/check-confidence
 */
export async function POST(request: NextRequest) {
    try {
        // 환경변수 디버깅
        debugEnvironmentVariables();

        // 요청 본문 파싱 및 검증
        const body = await request.json();
        const validationResult = confidenceCheckSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: '잘못된 요청 데이터입니다',
                    details: validationResult.error.errors
                },
                { status: 400 }
            );
        }

        const { gameName } = validationResult.data;

        console.log('🎯 [Confidence Check] 요청 수신:', {
            게임명: gameName,
            길이: gameName.length
        });

        // API 키 확인 및 설정
        let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            console.log('⚠️ [Confidence Check] 환경변수 수동 설정');
            apiKey = 'AIzaSyDKh7zI-W1zx2LkttbopdGAWsuJVlIqVOo';
            process.env.GEMINI_API_KEY = apiKey;
        }

        if (!apiKey) {
            console.error('❌ [Confidence Check] API 키 누락 - 폴백 처리');
            return NextResponse.json(
                createFallbackResult(gameName, 'API 키 누락')
            );
        }

        // 신뢰도 체크 프롬프트 생성
        const prompt = createConfidenceCheckPrompt(gameName);

        console.log('📝 [Confidence Check] 프롬프트 생성 완료:', {
            프롬프트길이: prompt.length,
            게임명: gameName
        });

        // Gemini API 호출 설정
        const payload = {
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.1,        // 낮은 창의성으로 일관된 평가
                topK: 10,               // 제한된 토큰 선택
                topP: 0.8,              // 높은 정확도
                maxOutputTokens: 200,   // 짧은 JSON 응답
                candidateCount: 1
            }
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        // Gemini API 호출 (재시도 로직 포함)
        let response: Response;
        let responseData: any;

        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
            }

            responseData = await response.json();
        } catch (apiError) {
            console.error('🚫 [Confidence Check] Gemini API 호출 실패:', apiError);
            return NextResponse.json(
                createFallbackResult(gameName, 'Gemini API 호출 실패')
            );
        }

        // 응답 검증
        if (!responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.error('❌ [Confidence Check] 잘못된 API 응답 구조:', responseData);
            return NextResponse.json(
                createFallbackResult(gameName, '잘못된 API 응답 구조')
            );
        }

        const aiResponse = responseData.candidates[0].content.parts[0].text;

        console.log('🤖 [Confidence Check] AI 응답 수신:', {
            원본응답: aiResponse.slice(0, 100),
            길이: aiResponse.length
        });

        // 신뢰도 점수 파싱 (에러 처리 포함)
        let confidenceScore: number;

        try {
            confidenceScore = parseConfidenceResponse(aiResponse);
        } catch (parseError) {
            console.error('❌ [Confidence Check] 응답 파싱 실패:', parseError);
            return NextResponse.json(
                createFallbackResult(gameName, '응답 파싱 실패')
            );
        }

        // 신뢰도 점수 유효성 검증
        if (confidenceScore < CONFIDENCE_CHECK.MIN_SCORE || confidenceScore > CONFIDENCE_CHECK.MAX_SCORE) {
            console.error('❌ [Confidence Check] 유효하지 않은 신뢰도 점수:', confidenceScore);
            return NextResponse.json(
                createFallbackResult(gameName, '유효하지 않은 신뢰도 점수')
            );
        }

        // 서비스 모드 결정
        const serviceMode = confidenceScore >= CONFIDENCE_CHECK.THRESHOLD
            ? CONFIDENCE_CHECK.SERVICE_MODES.EXPERT
            : CONFIDENCE_CHECK.SERVICE_MODES.BETA;

        console.log('✅ [Confidence Check] 처리 완료:', {
            게임명: gameName,
            신뢰도점수: confidenceScore,
            서비스모드: serviceMode,
            임계값: CONFIDENCE_CHECK.THRESHOLD
        });

        // 응답 반환
        const result: ConfidenceCheckResponse = {
            confidenceScore,
            serviceMode
        };

        return NextResponse.json(result);

    } catch (error) {
        console.error('❌ [Confidence Check] 예상치 못한 오류:', error);

        // 예상치 못한 오류 시에도 폴백 처리
        const fallbackResult = createFallbackResult(
            '알 수 없음',
            `예상치 못한 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
        );

        return NextResponse.json(fallbackResult);
    }
} 
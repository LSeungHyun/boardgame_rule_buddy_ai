import { createGameRulePrompt } from './prompts';

/**
 * Gemini API를 사용한 AI 서비스
 */

export interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
    promptFeedback?: {
        blockReason?: string;
    };
}

export class GeminiApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public statusText?: string
    ) {
        super(message);
        this.name = 'GeminiApiError';
    }
}

/**
 * 게임 룰에 대한 질문을 AI에게 물어보고 답변을 받습니다
 * @param gameTitle 게임 제목
 * @param userQuestion 사용자 질문
 * @returns AI 답변 문자열
 */
export async function askGameQuestion(
    gameTitle: string,
    userQuestion: string
): Promise<string> {
    // API 키 확인
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        throw new GeminiApiError("Gemini API 키가 설정되지 않았습니다. 환경변수를 확인해주세요.");
    }

    // 프롬프트 생성
    const prompt = createGameRulePrompt(gameTitle, userQuestion);

    // 디버깅을 위한 로그 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
        console.log("실제로 전송되는 프롬프트:", prompt);
        console.log("게임 제목:", gameTitle);
    }

    // API 요청 구성
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
        // API 호출
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new GeminiApiError(
                `API 요청 실패: ${response.status} ${response.statusText}`,
                response.status,
                response.statusText
            );
        }

        // 응답 파싱
        const result: GeminiResponse = await response.json();

        // 답변 추출
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            return result.candidates[0].content.parts[0].text || "답변을 생성할 수 없습니다.";
        }

        // 차단된 경우
        if (result.promptFeedback && result.promptFeedback.blockReason) {
            return `답변 생성에 실패했습니다. (사유: ${result.promptFeedback.blockReason})`;
        }

        // 예상치 못한 응답 구조
        return "죄송합니다. 답변을 생성하는 데 문제가 발생했습니다.";

    } catch (error) {
        // GeminiApiError는 그대로 전파
        if (error instanceof GeminiApiError) {
            throw error;
        }

        // 기타 에러는 GeminiApiError로 래핑
        const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다";
        throw new GeminiApiError(`Gemini API 호출 오류: ${errorMessage}`);
    }
} 
import { systemPrompt } from './prompts';
import { QuestionAnalyzer } from './question-analyzer';
import { ResearchLimiter } from './research-limiter';
import { researchCache } from './research-cache';

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

export interface ResearchEnhancedResponse {
    answer: string;
    researchUsed: boolean;
    sources?: string[];
    complexity?: {
        score: number;
        reasoning: string[];
    };
    fromCache?: boolean;
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
    console.log('⚠️ [경고] 기존 askGameQuestion 함수가 호출되었습니다! 스마트 리서치 미적용');
    
    // API 키 확인
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        throw new GeminiApiError("Gemini API 키가 설정되지 않았습니다. 환경변수를 확인해주세요.");
    }

    // systemPrompt 기반 프롬프트 생성
    const prompt = `${systemPrompt}\n\n게임 제목: ${gameTitle}\n사용자 질문: ${userQuestion}`;

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

/**
 * 스마트 리서치 기능을 포함한 게임 질문 답변 (Phase 4 구현)
 * @param gameTitle 게임 제목
 * @param userQuestion 사용자 질문
 * @param onResearchStart 리서치 시작 시 호출되는 콜백
 * @returns 리서치 강화된 AI 답변
 */
export async function askGameQuestionWithSmartResearch(
    gameTitle: string,
    userQuestion: string,
    onResearchStart?: () => void
): Promise<ResearchEnhancedResponse> {
    console.log('🎯 [Smart Research] 질문 처리 시작:', {
        게임: gameTitle,
        질문: userQuestion.slice(0, 50) + (userQuestion.length > 50 ? '...' : '')
    });
    
    // 1. 질문 복잡도 분석
    const analyzer = new QuestionAnalyzer();
    const complexityScore = analyzer.analyzeComplexity(userQuestion, gameTitle);
    
    console.log('📊 [복잡도 분석]', {
        점수: complexityScore.totalScore,
        임계값: 15,
        리서치필요: complexityScore.shouldTriggerResearch,
        우선순위: complexityScore.priority,
        분석근거: complexityScore.reasoning
    });
    
    const limiter = new ResearchLimiter();
    limiter.recordQuestionAsked(); // 모든 질문 수 기록

    // 2. 리서치 필요성 판단
    const shouldResearch = complexityScore.shouldTriggerResearch && 
                          limiter.canPerformResearch();
    
    console.log('🚦 [리서치 판단]', {
        복잡도충족: complexityScore.shouldTriggerResearch,
        할당량가능: limiter.canPerformResearch(),
        최종결정: shouldResearch ? '🔍 리서치 실행' : '🤖 Gemini만 사용'
    });

    let researchData: any = null;
    let researchUsed = false;
    let sources: string[] = [];
    let fromCache = false;

    // 3. 리서치 실행 (조건 충족 시)
    if (shouldResearch) {
        console.log('🔍 [리서치 시작] 웹 검색을 시작합니다...');
        try {
            if (onResearchStart) {
                onResearchStart();
            }

            // 캐시 확인
            const cached = researchCache.get(gameTitle, userQuestion);
            if (cached) {
                console.log('⚡ [캐시 히트] 저장된 리서치 결과를 사용합니다:', {
                    타임스탬프: new Date(cached.timestamp).toLocaleString(),
                    출처수: cached.sources.length,
                    히트수: cached.hitCount
                });
                researchData = {
                    summary: cached.summary,
                    searchResults: cached.searchResults,
                    sources: cached.sources
                };
                sources = cached.sources;
                researchUsed = true;
                fromCache = true;
                limiter.recordCacheHit();
            } else {
                console.log('🌐 [웹 검색] API 요청을 시작합니다...');
                // 웹 리서치 API 호출
                const researchResponse = await fetch('/api/research', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        gameTitle,
                        question: userQuestion,
                        priority: complexityScore.priority
                    })
                });

                if (researchResponse.ok) {
                    const researchResult = await researchResponse.json();
                    if (researchResult.success) {
                        console.log('✅ [검색 성공] 웹 리서치가 완료되었습니다:', {
                            검색결과수: researchResult.data.searchResults?.length || 0,
                            출처수: researchResult.data.sources?.length || 0,
                            캐시여부: researchResult.data.fromCache
                        });
                        researchData = researchResult.data;
                        sources = researchResult.data.sources || [];
                        researchUsed = true;
                        fromCache = researchResult.data.fromCache || false;
                    } else {
                        console.warn('❌ [검색 실패] API 응답 오류:', researchResult.error);
                    }
                } else {
                    console.warn('❌ [검색 실패] HTTP 오류:', researchResponse.status);
                }
            }
        } catch (error) {
            console.warn('❌ [리서치 오류] 기본 답변으로 fallback:', error);
            // 리서치 실패 시 기본 AI 답변 계속 진행
        }
    } else {
        console.log('🤖 [일반 모드] 리서치 없이 Gemini API만 사용합니다.');
    }

    // 4. Gemini 프롬프트 생성 (리서치 데이터 포함)
    let enhancedPrompt = systemPrompt;
    
    if (researchUsed && researchData) {
        enhancedPrompt += `\n\n📚 **추가 참고 자료** (웹 리서치 결과):
${researchData.summary}

**참고 출처**:
${sources.slice(0, 3).map((url, i) => `${i+1}. ${url}`).join('\n')}

위 웹 리서치 정보를 참고하여 더욱 정확하고 구체적인 답변을 제공해주세요.
출처가 있는 정보는 해당 출처를 명시해주세요.`;
    }

    enhancedPrompt += `\n\n게임 제목: ${gameTitle}\n사용자 질문: ${userQuestion}`;

    // 5. Gemini API 호출
    try {
        console.log('🤖 [Gemini API] 답변 생성을 시작합니다...', {
            리서치데이터포함: researchUsed,
            프롬프트길이: enhancedPrompt.length
        });
        
        const aiAnswer = await callGeminiAPI(enhancedPrompt);
        
        console.log('✅ [완료] 최종 답변이 생성되었습니다:', {
            리서치사용: researchUsed,
            캐시사용: fromCache,
            복잡도점수: complexityScore.totalScore,
            출처수: sources.length,
            답변길이: aiAnswer.length
        });
        
        // 6. 결과 반환
        return {
            answer: aiAnswer,
            researchUsed,
            sources: researchUsed ? sources : undefined,
            complexity: {
                score: complexityScore.totalScore,
                reasoning: complexityScore.reasoning
            },
            fromCache: researchUsed ? fromCache : undefined
        };

    } catch (error) {
        // Gemini API 실패 시에도 리서치 정보 제공
        if (researchUsed && researchData) {
            return {
                answer: `AI 답변 생성에 실패했지만, 다음 웹 리서치 결과를 참고하세요:\n\n${researchData.summary}`,
                researchUsed: true,
                sources,
                complexity: {
                    score: complexityScore.totalScore,
                    reasoning: complexityScore.reasoning
                },
                fromCache
            };
        }
        
        throw error;
    }
}

/**
 * Gemini API 호출 헬퍼 함수
 */
async function callGeminiAPI(prompt: string): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        throw new GeminiApiError("Gemini API 키가 설정되지 않았습니다. 환경변수를 확인해주세요.");
    }

    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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

    const result: GeminiResponse = await response.json();

    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
        return result.candidates[0].content.parts[0].text || "답변을 생성할 수 없습니다.";
    }

    if (result.promptFeedback && result.promptFeedback.blockReason) {
        return `답변 생성에 실패했습니다. (사유: ${result.promptFeedback.blockReason})`;
    }

    return "죄송합니다. 답변을 생성하는 데 문제가 발생했습니다.";
} 
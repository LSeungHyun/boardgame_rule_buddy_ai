import { systemPrompt } from './prompts';
import { QuestionAnalyzer } from './question-analyzer';
import { ResearchLimiter } from './research-limiter';
import { researchCache } from './research-cache';
import { enhancedTranslator } from './enhanced-translator'; // 🚨 Enhanced Translator 사용
import type { QuestionAnalysisV2 } from './question-analyzer';

/**
 * 게임 제목으로부터 게임 ID를 가져오는 함수
 */
function getGameIdFromTitle(gameTitle: string): number | null {
    const titleMap: { [key: string]: number } = {
        '아크노바': 331,
        'ark nova': 331,
        '세븐원더스': 1,
        '7 wonders': 1,
        // 필요에 따라 추가
    };
    
    const normalizedTitle = gameTitle.toLowerCase().trim();
    return titleMap[normalizedTitle] || null;
}

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
    // V2 분석 결과 추가
    analysisV2?: QuestionAnalysisV2;
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
 * @param useV2Analysis V2 분석 시스템 사용 여부 (기본값: false)
 * @returns 리서치 강화된 AI 답변
 */
export async function askGameQuestionWithSmartResearch(
    gameTitle: string,
    userQuestion: string,
    onResearchStart?: () => void,
    useV2Analysis: boolean = false
): Promise<ResearchEnhancedResponse> {
    console.log('🎯 [Smart Research] 질문 처리 시작:', {
        게임: gameTitle,
        질문: userQuestion.slice(0, 50) + (userQuestion.length > 50 ? '...' : ''),
        V2분석사용: useV2Analysis
    });

    // 1. 질문 복잡도 분석
    const analyzer = new QuestionAnalyzer();
    let analysisV2: QuestionAnalysisV2 | undefined;
    let shouldResearch: boolean;

    if (useV2Analysis) {
        // V2 분석 시스템 사용
        console.log('🚀 [V2 분석 시스템] 새로운 분석 방식 적용');
        analysisV2 = await analyzer.analyzeComplexityV2(userQuestion);

        console.log('📊 [V2 분석 결과]', {
            유형: analysisV2.type,
            리서치필요: analysisV2.requiresResearch,
            신뢰도: analysisV2.confidence,
            설명: analysisV2.explanation
        });

        // V2에서는 requiresResearch 값을 직접 사용
        const limiter = new ResearchLimiter();
        limiter.recordQuestionAsked();
        shouldResearch = analysisV2.requiresResearch && limiter.canPerformResearch();
    } else {
        // 기존 분석 시스템 사용
        const complexityScore = analyzer.analyzeComplexity(userQuestion, gameTitle);

        console.log('📊 [기존 복잡도 분석]', {
            점수: complexityScore.totalScore,
            임계값: 8,
            리서치필요: complexityScore.shouldTriggerResearch,
            우선순위: complexityScore.priority,
            분석근거: complexityScore.reasoning
        });

        const limiter = new ResearchLimiter();
        limiter.recordQuestionAsked();
        shouldResearch = complexityScore.shouldTriggerResearch && limiter.canPerformResearch();
    }

    console.log('🚦 [리서치 판단]', {
        분석방식: useV2Analysis ? 'V2 유형분석' : '기존 점수분석',
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
                console.log('💾 [캐시 적중] 이전 리서치 결과를 사용합니다');
                researchData = cached;
                sources = cached.sources || [];
                researchUsed = true;
                fromCache = true;
            } else {
                // 🚨 NEW: 리서치 전에 영어 키워드 추출
                let englishKeywords: string[] = [];
                const gameId = getGameIdFromTitle(gameTitle);
                if (gameId) {
                    try {
                        // Enhanced Translator로 영어 키워드 추출
                        const searchQuery = enhancedTranslator.generateSearchQueries(userQuestion, gameTitle);
                        englishKeywords = searchQuery.keywords;
                        
                        console.log('🔍 [Enhanced Translator 영어 키워드 추출 성공]', {
                            게임ID: gameId,
                            원본질문: userQuestion,
                            추출된영어키워드: englishKeywords,
                            매칭신뢰도: searchQuery.confidence,
                            게임특화여부: searchQuery.gameSpecific
                        });
                    } catch (error) {
                        console.warn('⚠️ [영어 키워드 추출 실패]', error);
                    }
                }

                // 새로운 웹 리서치 실행 (영어 키워드 포함)
                console.log('🌐 [웹 리서치] 영어 키워드를 포함한 API 호출을 시작합니다...');
                const researchResponse = await fetch('/api/research', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameTitle,
                        question: userQuestion,
                        englishKeywords, // 🚨 BGG 영어 검색용 키워드 추가!
                        priority: useV2Analysis && analysisV2 ?
                            (analysisV2.type === 'strategy' ? 'high' : 'medium') :
                            'medium'
                    })
                });

                if (researchResponse.ok) {
                    const researchResult = await researchResponse.json();
                    if (researchResult.success) {
                        researchData = researchResult.data;
                        sources = researchData.sources || [];
                        researchUsed = true;
                        fromCache = false;

                        console.log('✅ [웹 리서치 성공]', {
                            출처수: sources.length,
                            요약길이: researchData.summary?.length || 0
                        });
                    } else {
                        console.warn('⚠️ [웹 리서치 실패]', researchResult.error);
                    }
                } else {
                    console.warn('⚠️ [웹 리서치 API 오류]', researchResponse.status);
                }
            }
        } catch (error) {
            console.error('❌ [리서치 오류]', error);
        }
    } else {
        console.log('🤖 [일반 모드] 리서치 없이 Gemini API만 사용합니다.');
    }

    // 4. 게임별 용어 데이터 로드
    let gameTermsContext = '';
    const gameId = getGameIdFromTitle(gameTitle);
    if (gameId) {
        try {
            // Enhanced Translator로 게임별 용어 검색
            const translation = enhancedTranslator.translate('코뿔소', gameTitle);
            const translationResult2 = enhancedTranslator.translate('관철효과', gameTitle);
            
            let foundTerms: Array<{korean: string, english: string, context?: string}> = [];
            
            // 질문에서 핵심 키워드 추출해서 번역
            const questionKeywords = userQuestion.split(' ').filter(word => word.length > 1);
            questionKeywords.forEach(keyword => {
                const result = enhancedTranslator.translate(keyword, gameTitle);
                if (result) {
                    foundTerms.push({
                        korean: keyword,
                        english: result.primary,
                        context: result.context
                    });
                }
            });
            
            if (foundTerms.length > 0) {
                gameTermsContext = `

🎯 **${gameTitle} 게임 전용 용어 정보:**
${foundTerms.slice(0, 10).map(term => 
    `• **${term.korean}** (${term.english}): Enhanced Translator 매칭`
).join('\n')}

📖 **이 용어들을 참고하여 정확한 룰 설명을 제공하세요.**
`;
                console.log('📚 [Enhanced Translator 게임 용어 로드 성공]', {
                    게임ID: gameId,
                    용어수: foundTerms.length,
                    질문키워드수: questionKeywords.length
                });
            }
        } catch (error) {
            console.warn('⚠️ [게임 용어 로드 실패]', error);
        }
    }

    // 5. Gemini 프롬프트 생성 (리서치 데이터 + 게임 용어 포함)
    let enhancedPrompt = systemPrompt + gameTermsContext;

    if (researchUsed && researchData) {
        enhancedPrompt += `

📚 **리서치 데이터 기반 답변 가이드라인:**

다음은 웹에서 수집한 신뢰할 수 있는 정보입니다:
---
${researchData.summary}
---

⚡ **CRITICAL 답변 원칙:**
1. **신뢰도 우선**: 위 리서치 정보를 주요 근거로 사용하되, 불확실한 부분은 명시적으로 표현하세요
2. **출처 기반**: 답변에 반드시 "검색된 정보에 따르면" 또는 "커뮤니티에서는" 등의 출처 표현을 포함하세요
3. **균형적 접근**: 리서치 정보가 부족하거나 모순될 경우, 일반적인 룰 지식과 균형있게 결합하세요
4. **불확실성 표현**: 확실하지 않은 부분은 "이 부분은 추가 확인이 필요합니다" 등으로 명시하세요
5. **실용적 조언**: 가능한 경우 플레이어에게 도움되는 실제 게임 상황의 예시를 포함하세요

📝 **답변 구조 권장 포맷:**
- **결론**: 검색된 정보를 바탕으로 한 명확한 답변
- **근거**: 찾은 정보의 핵심 내용 요약
- **추가 고려사항**: 예외 상황이나 주의점
- **확인 방법**: 확실하지 않을 때 추가로 확인할 수 있는 방법

**참고한 정보 출처:**
${sources.slice(0, 3).map((url, i) => `${i + 1}. ${url}`).join('\n')}`;
    } else {
        enhancedPrompt += `

⚠️ **일반 답변 모드**: 웹 리서치 정보 없이 답변합니다.
- 확실한 룰 지식만 제공하세요
- 불확실한 경우 명시적으로 표현하세요  
- 가능한 경우 공식 룰북 확인을 권장하세요`;
    }

    enhancedPrompt += `\n\n게임 제목: ${gameTitle}\n사용자 질문: ${userQuestion}`;

    // 5. Gemini API 호출
    try {
        console.log('🤖 [Gemini API] 답변 생성을 시작합니다...', {
            리서치데이터포함: researchUsed,
            프롬프트길이: enhancedPrompt.length,
            리서치요약길이: researchUsed ? researchData?.summary?.length : 0
        });

        const aiAnswer = await callGeminiAPI(enhancedPrompt);

        console.log('✅ [완료] 최종 답변이 생성되었습니다:', {
            리서치사용: researchUsed,
            캐시사용: fromCache,
            V2분석: useV2Analysis,
            출처수: sources.length,
            답변길이: aiAnswer.length
        });

        // 6. 결과 반환
        const response: ResearchEnhancedResponse = {
            answer: aiAnswer,
            researchUsed,
            sources: researchUsed ? sources : undefined,
            fromCache: researchUsed ? fromCache : undefined
        };

        // V2 분석 사용 시 해당 결과도 포함
        if (useV2Analysis && analysisV2) {
            response.analysisV2 = analysisV2;
        } else {
            // 기존 시스템용 복잡도 정보
            const complexityScore = analyzer.analyzeComplexity(userQuestion, gameTitle);
            response.complexity = {
                score: complexityScore.totalScore,
                reasoning: complexityScore.reasoning
            };
        }

        return response;

    } catch (error) {
        console.error('❌ [Gemini API 오류]', error);
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
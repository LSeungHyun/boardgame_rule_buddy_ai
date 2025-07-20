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
        // 🚨 윙스팬 게임 매핑 추가
        '윙스팬': 297,
        'wingspan': 297,
        '윙스팬 : 아시아': 148,
        '윙스팬: 아시아': 148,  // 콜론 공백 변형 지원
        '윙스팬아시아': 148,      // 공백 없는 변형
        'wingspan asia': 148,
        'wingspan: asia': 148,
        // 필요에 따라 추가
    };
    
    const normalizedTitle = gameTitle.toLowerCase().trim()
        .replace(/\s*:\s*/g, ' : ')  // 콜론 주변 공백 정규화
        .replace(/\s+/g, ' ');       // 다중 공백 정리
    
    return titleMap[normalizedTitle] || null;
}

/**
 * 범용적인 게임 컨텍스트 제공 함수 - 하드코딩 제거
 */
function getGameContext(gameTitle: string): string {
    if (!gameTitle || gameTitle.trim() === '') {
        return '\n📚 **일반 보드게임 질문** - 포괄적 지식으로 답변합니다.\n';
    }
    
    return `\n🎮 **${gameTitle} 관련 질문** - 이 게임에 특화된 정확한 답변을 제공하겠습니다.\n`;
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
        finishReason?: string;
    }>;
    promptFeedback?: {
        blockReason?: string;
    };
    usageMetadata?: {
        promptTokenCount?: number;
        totalTokenCount?: number;
        promptTokensDetails?: Array<{
            modality?: string;
            tokenCount?: number;
        }>;
        thoughtsTokenCount?: number;
    };
    modelVersion?: string;
    responseId?: string;
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
    // 중단 감지 및 재시도 기능 추가
    wasTruncated?: boolean;
    truncationReason?: 'MAX_TOKENS' | 'SAFETY' | 'OTHER';
    retryCTA?: {
        message: string;
        originalQuestion: string;
        gameTitle: string;
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

    // API 요청 구성 - 최적화된 파라미터 적용
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { 
        contents: chatHistory,
        generationConfig: {
            temperature: 0.1,        // 정확하고 일관된 답변
            topK: 40,               // 적절한 토큰 다양성
            topP: 0.95,             // 고품질 토큰 선택
            maxOutputTokens: 2048,  // 충분한 답변 길이
            candidateCount: 1,      // 일관성 확보
        }
    };
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

        // 디버깅을 위한 응답 구조 로깅
        console.log('📋 [기존 함수 API 응답 구조]', {
            candidates: result.candidates?.length || 0,
            firstCandidate: result.candidates?.[0] ? 'exists' : 'missing',
            content: result.candidates?.[0]?.content ? 'exists' : 'missing', 
            parts: result.candidates?.[0]?.content?.parts?.length || 0,
            promptFeedback: result.promptFeedback || 'none'
        });

        // 답변 추출
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const responseText = result.candidates[0].content.parts[0].text;
            console.log('✅ [기존 함수 API 응답 성공]', { 응답길이: responseText?.length || 0 });
            return responseText || "답변을 생성할 수 없습니다.";
        }

        // 차단된 경우
        if (result.promptFeedback && result.promptFeedback.blockReason) {
            console.warn('⚠️ [기존 함수 API 응답 차단]', result.promptFeedback.blockReason);
            return `답변 생성에 실패했습니다. (사유: ${result.promptFeedback.blockReason})`;
        }

        // 예상치 못한 응답 구조
        console.error('❌ [기존 함수 예상치 못한 API 응답]', JSON.stringify(result, null, 2));
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

    // 4. 게임별 용어 데이터 로드 (최적화된 버전)
    let gameTermsContext = '';
    const gameId = getGameIdFromTitle(gameTitle);
    
    if (gameId === 331) {
        // 아크노바인 경우에만 특화 용어 검색 실행
        try {
            console.log('🎯 [아크노바 용어 검색] 아크노바 전용 용어 매핑 시작');
            
            let foundTerms: Array<{korean: string, english: string, context?: string}> = [];
            
            // 질문에서 핵심 키워드 추출해서 번역
            const questionKeywords = userQuestion.split(' ').filter(word => word.length > 1);
            let translatedCount = 0;
            
            questionKeywords.forEach(keyword => {
                const result = enhancedTranslator.translate(keyword, gameTitle);
                if (result) {
                    foundTerms.push({
                        korean: keyword,
                        english: result.primary,
                        context: result.context
                    });
                    translatedCount++;
                }
            });
            
            if (foundTerms.length > 0) {
                gameTermsContext = `

🎯 **아크노바 게임 전용 용어 정보:**
${foundTerms.slice(0, 10).map(term => 
    `• **${term.korean}** → **${term.english}** (특화 매핑)`
).join('\n')}

📖 **이 용어들을 참고하여 정확한 아크노바 룰 설명을 제공하세요.**
`;
                console.log('✅ [아크노바 용어 검색 성공]', {
                    질문키워드수: questionKeywords.length,
                    번역성공수: translatedCount,
                    최종용어수: foundTerms.length
                });
            } else {
                console.log('ℹ️ [아크노바 용어 검색] 매칭되는 전용 용어 없음');
                gameTermsContext = '\n🎮 **아크노바** 게임 선택됨 (일반 룰 지식 활용)\n';
            }
        } catch (error) {
            console.warn('⚠️ [아크노바 용어 검색 실패]', error);
            gameTermsContext = '\n🎮 **아크노바** 게임 선택됨 (용어 검색 실패)\n';
        }
    } else if (gameId) {
        // 다른 게임들 (세븐원더스 등)
        const gameNames: Record<number, string> = {
            331: '아크노바',
            1: '세븐원더스 듀얼'
        };
        const gameName = gameNames[gameId] || '선택된 게임';
        gameTermsContext = `\n🎮 **${gameName}** 게임 선택됨 (일반 보드게임 지식 활용)\n`;
        console.log(`🎮 [게임 선택] ${gameName} - 일반 처리 모드`);
    } else {
        // 게임이 선택되지 않은 일반 질문
        gameTermsContext = '\n📚 **일반 보드게임 질문** - 포괄적 룰 지식 활용\n';
        console.log('📚 [일반 질문] 게임 미선택 - 일반 보드게임 지식으로 처리');
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
        // 범용적인 게임 컨텍스트 제공
        const gameContext = getGameContext(gameTitle);
        
        enhancedPrompt += `

⚠️ **일반 답변 모드**: 웹 리서치 정보 없이 Gemini의 보드게임 전문 지식으로 답변합니다.

${gameContext}

**답변 지침:**
- 보드게임 전문가로서 정확하고 포괄적인 답변을 제공하세요
- 게임의 메커니즘, 전략, 규칙을 구체적으로 설명하세요
- 실제 플레이 상황의 예시를 포함하세요
- 애매한 부분은 일반적인 해석과 함께 공식 확인을 제안하세요`;
    }

    enhancedPrompt += `\n\n게임 제목: ${gameTitle}\n사용자 질문: ${userQuestion}`;

    // 5. Gemini API 호출
    try {
        console.log('🤖 [Gemini API] 답변 생성을 시작합니다...', {
            리서치데이터포함: researchUsed,
            프롬프트길이: enhancedPrompt.length,
            리서치요약길이: researchUsed ? researchData?.summary?.length : 0
        });

        // 중단 감지를 위해 원본 질문과 게임 제목 전달
        const aiAnswer = await callGeminiAPI(enhancedPrompt, 0, userQuestion, gameTitle);
        
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
 * 토큰 사용량 상세 모니터링
 */
function logTokenUsage(usageMetadata: any, prompt: string, responseText?: string) {
    const promptTokens = usageMetadata?.promptTokenCount || 0;
    const totalTokens = usageMetadata?.totalTokenCount || 0;
    const responseTokens = totalTokens - promptTokens;
    
    // 응답 길이 예측 (한글 기준 대략적 계산)
    const estimatedResponseLength = responseText ? responseText.length : 0;
    const estimatedTokens = Math.ceil(estimatedResponseLength / 3); // 한글 1글자 ≈ 1.5-2 토큰, 여유있게 3으로 나눔
    
    console.log('📊 [토큰 사용량 분석]', {
        프롬프트토큰: promptTokens,
        응답토큰: responseTokens,
        총토큰: totalTokens,
        예상응답길이: estimatedResponseLength,
        예상토큰: estimatedTokens,
        토큰사용률: `${Math.round((totalTokens / 8192) * 100)}%`, // Gemini 2.5 Flash 모델 한계
        프롬프트길이: prompt.length,
        응답길이: responseText?.length || 0
    });
    
    // 토큰 한계 경고
    if (totalTokens > 7000) {
        console.warn('⚠️ [토큰 한계 임박]', {
            남은토큰: 8192 - totalTokens,
            사용률: `${Math.round((totalTokens / 8192) * 100)}%`
        });
    }
}

/**
 * 응답 길이 예측 및 최적화
 */
function optimizePromptForLength(prompt: string, estimatedResponseLength: number): string {
    // 응답이 길 것으로 예상되는 경우 프롬프트 최적화
    if (estimatedResponseLength > 2000) {
        console.log('🔧 [긴 응답 예상 - 프롬프트 최적화]');
        
        // 프롬프트에 간결성 요청 추가
        const concisenessNote = '\n\n※ 답변은 핵심만 간결하게 제공해주세요.';
        
        // 프롬프트가 너무 길면 축약
        if (prompt.length > 3000) {
            const lines = prompt.split('\n');
            const essentialLines = lines.filter(line => 
                line.includes('질문:') || 
                line.includes('게임:') || 
                line.includes('You are') ||
                line.trim().length > 50
            );
            return essentialLines.join('\n') + concisenessNote;
        }
        
        return prompt + concisenessNote;
    }
    
    return prompt;
}

/**
 * 토큰 한계 도달 시 축약된 프롬프트 생성
 */
function createFallbackPrompt(originalPrompt: string): string {
    // 간단한 축약 로직: 시스템 프롬프트를 단순화
    const simplifiedSystemPrompt = `
You are a board game rules expert. Provide a clear, concise answer to this board game question.
Answer in Korean, be specific and accurate.
`;
    
    // 원본 프롬프트에서 질문 부분만 추출 (마지막 몇 줄 가정)
    const lines = originalPrompt.split('\n');
    const questionStart = Math.max(0, lines.length - 10); // 마지막 10줄 정도만 사용
    const questionPart = lines.slice(questionStart).join('\n');
    
    return simplifiedSystemPrompt + '\n' + questionPart;
}

/**
 * 답변 중단 감지 및 재시도 CTA 생성
 */
function createRetryCTA(
    finishReason: string, 
    originalQuestion: string, 
    gameTitle: string,
    partialResponse?: string
): { message: string; cta: string } {
    const baseMessage = "💡 **답변이 중간에 끊어졌습니다.**\n\n";
    
    let reasonMessage = "";
    let ctaMessage = "";
    
    switch (finishReason) {
        case 'MAX_TOKENS':
            reasonMessage = "토큰 한계로 인해 답변이 완성되지 않았습니다.";
            ctaMessage = " **같은 질문을 다시 시도해보세요**\n\n질문을 더 구체적으로 나누어 주시면 완전한 답변을 드릴 수 있습니다.";
            break;
        case 'SAFETY':
            reasonMessage = "안전 정책에 의해 답변이 제한되었습니다.";
            ctaMessage = " **질문을 다시 작성해주세요**\n\n다른 표현으로 같은 내용을 질문해보세요.";
            break;
        default:
            reasonMessage = "예상치 못한 오류로 답변이 중단되었습니다.";
            ctaMessage = " **다시 시도해보세요**\n\n잠시 후 같은 질문을 다시 해주세요.";
    }
    
    const fullMessage = baseMessage + reasonMessage + "\n\n" + ctaMessage;
    
    return {
        message: fullMessage,
        cta: `다시 질문하기: "${originalQuestion}"`
    };
}

/**
 * Gemini API 호출 헬퍼 함수 - 웹사이트 품질 매칭을 위한 최적화된 파라미터
 */
async function callGeminiAPI(prompt: string, retryCount = 0, originalQuestion?: string, gameTitle?: string): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        throw new GeminiApiError("Gemini API 키가 설정되지 않았습니다. 환경변수를 확인해주세요.");
    }

    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    
    // 응답 길이 예측 및 프롬프트 최적화
    const estimatedResponseLength = prompt.length * 2; // 대략적인 예측
    const optimizedPrompt = optimizePromptForLength(prompt, estimatedResponseLength);
    const optimizedChatHistory = [{ role: "user", parts: [{ text: optimizedPrompt }] }];
    
    // 근본적 해결책: maxOutputTokens 증가 (4096 → 6144)
    const payload = { 
        contents: optimizedChatHistory,
        generationConfig: {
            temperature: 0.1,        // 정확하고 일관된 답변을 위한 낮은 온도
            topK: 40,               // 적절한 토큰 다양성
            topP: 0.95,             // 고품질 토큰 선택
            maxOutputTokens: 6144,  // 근본적 해결: 8192의 75%로 증가
            candidateCount: 1,      // 단일 후보로 일관성 확보
        }
    };
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    let result: GeminiResponse;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('🚫 [API 요청 실패]', {
                status: response.status,
                statusText: response.statusText,
                error: errorText,
                retryCount
            });
            
            throw new GeminiApiError(
                `API 요청 실패: ${response.status} ${response.statusText}`,
                response.status,
                response.statusText
            );
        }

        result = await response.json();
        
    } catch (error) {
        if (error instanceof GeminiApiError) {
            throw error;
        }
        
        console.error('🚫 [네트워크 오류]', {
            error: error instanceof Error ? error.message : '알 수 없는 오류',
            retryCount
        });
        
        throw new GeminiApiError(
            `네트워크 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
        );
    }

    // 토큰 사용량 상세 모니터링
    logTokenUsage(result.usageMetadata, optimizedPrompt);
    
    // 디버깅을 위한 응답 구조 로깅
    console.log('📋 [API 응답 구조 확인]', {
        candidates: result.candidates?.length || 0,
        firstCandidate: result.candidates?.[0] ? 'exists' : 'missing',
        content: result.candidates?.[0]?.content ? 'exists' : 'missing',
        parts: result.candidates?.[0]?.content?.parts?.length || 0,
        finishReason: result.candidates?.[0]?.finishReason || 'none',
        promptFeedback: result.promptFeedback || 'none',
        usageMetadata: result.usageMetadata || 'none'
    });

    // 프롬프트가 차단된 경우 처리
    if (result.promptFeedback && result.promptFeedback.blockReason) {
        console.warn('⚠️ [API 응답 차단]', result.promptFeedback.blockReason);
        return `답변 생성에 실패했습니다. (사유: ${result.promptFeedback.blockReason})`;
    }

    // 후보 응답이 있는 경우 처리
    if (result.candidates && result.candidates.length > 0) {
        const candidate = result.candidates[0];
        const finishReason = candidate.finishReason;
        
        // 중단 감지 및 재시도 CTA 생성
        if (finishReason === 'MAX_TOKENS' || finishReason === 'SAFETY' || (finishReason && finishReason !== 'STOP')) {
            console.warn('⚠️ [답변 중단 감지]', {
                finishReason,
                promptTokens: result.usageMetadata?.promptTokenCount,
                totalTokens: result.usageMetadata?.totalTokenCount,
                retryCount
            });
            
            // 부분 응답이 있는지 확인
            let partialText = "";
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                partialText = candidate.content.parts[0].text || "";
            }
            
            // 재시도 CTA 생성
            const retryInfo = createRetryCTA(finishReason, originalQuestion || "", gameTitle || "", partialText);
            
            // 부분 응답이 충분히 긴 경우 부분 + CTA
            if (partialText && partialText.trim().length > 300) {
                return partialText + "\n\n---\n\n" + retryInfo.message;
            }
            
            // 부분 응답이 짧거나 없는 경우 CTA만
            return retryInfo.message;
        }
        
        // 정상적인 응답 처리
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            const responseText = candidate.content.parts[0].text;
            if (responseText && responseText.trim()) {
                // 응답 길이에 따른 토큰 사용량 재계산
                logTokenUsage(result.usageMetadata, optimizedPrompt, responseText);
                
                console.log('✅ [API 응답 성공]', { 
                    응답길이: responseText.length,
                    finishReason: finishReason,
                    토큰효율성: `${Math.round((responseText.length / (result.usageMetadata?.totalTokenCount || 1)) * 100)}%`
                });
                return responseText;
            }
        }
    }

    // 예상치 못한 응답 구조인 경우 전체 응답을 로깅
    console.error('❌ [예상치 못한 API 응답 구조]', JSON.stringify(result, null, 2));
    return "죄송합니다. 답변을 생성하는 데 문제가 발생했습니다.";
} 
'use client';

import { gameTermsService } from './game-terms-service';
import { RuleMasterQuery, RuleMasterResponse, TermSearchResult } from '@/types/game-terms';
import { askGameQuestionWithSmartResearch } from './gemini';
import { confidenceTemplates, gracefulLimitationTemplate } from './prompts';
import { gameQuestionValidator, GameValidationResult } from './game-question-validator';

class RuleMasterService {
    private static instance: RuleMasterService;

    private constructor() { }

    public static getInstance(): RuleMasterService {
        if (!RuleMasterService.instance) {
            RuleMasterService.instance = new RuleMasterService();
        }
        return RuleMasterService.instance;
    }

    /**
     * 룰 질문에 대한 답변 생성
     */
    public async generateAnswer(query: RuleMasterQuery): Promise<RuleMasterResponse> {
        try {
            // 0. 게임-질문 일치도 검증 (API 낭비 방지)
            const validation = gameQuestionValidator.validateGameQuestion(query.gameId, query.question);
            if (!validation.isValid) {
                return this.createGameMismatchResponse(validation, query);
            }

            // 1. 질문에서 관련 용어 추출
            const relatedTerms = await this.extractRelatedTerms(query);

            // 2. 게임 컨텍스트 구축
            const gameContext = await this.buildGameContext(query.gameId, relatedTerms);

            // 3. 신뢰도 사전 계산 (AI 호출 전)
            const preConfidence = this.calculatePreConfidence(query, relatedTerms, gameContext);

            // 4. AI를 통한 답변 생성
            const aiResponse = await this.generateAIAnswer(query, gameContext, relatedTerms);

            // 5. 신뢰도 기반 답변 후처리
            const finalAnswer = this.applyConfidenceBasedFormatting(aiResponse, preConfidence, query);

            // 6. 최종 신뢰도 계산 (AI 응답 후)
            const finalConfidence = this.calculateFinalConfidence(preConfidence, aiResponse.length, relatedTerms);

            // 7. 추가 제안사항 생성
            const suggestions = this.generateSuggestions(query, relatedTerms, finalConfidence);

            return {
                answer: finalAnswer,
                relatedTerms: relatedTerms.slice(0, 10),
                confidence: finalConfidence,
                sources: this.extractSources(relatedTerms, gameContext),
                suggestions
            };

        } catch (error) {
            console.error('❌ 룰마스터 답변 생성 실패:', error);

            return {
                answer: gracefulLimitationTemplate(query.question, '시스템 오류로 인해 답변을 생성할 수 없습니다'),
                relatedTerms: [],
                confidence: 0,
                sources: [],
                suggestions: ['잠시 후 다시 시도해 주세요', '질문을 더 간단하게 바꿔서 물어보세요']
            };
        }
    }

    /**
     * 신뢰도 기반 답변 포맷팅 적용
     */
    private applyConfidenceBasedFormatting(
        aiAnswer: string, 
        confidence: number, 
        query: RuleMasterQuery
    ): string {
        console.log('📊 [신뢰도 기반 포맷팅]', {
            신뢰도: confidence,
            답변길이: aiAnswer.length,
            적용템플릿: confidence > 85 ? 'high' : confidence > 60 ? 'medium' : 'low'
        });

        // 높은 신뢰도 (85% 이상): 답변 그대로 사용
        if (confidence > 85) {
            return confidenceTemplates.high(aiAnswer);
        }
        
        // 중간 신뢰도 (60-85%): 조건부 답변 템플릿 적용
        if (confidence > 60) {
            return confidenceTemplates.medium(aiAnswer);
        }
        
        // 낮은 신뢰도 (60% 이하): 우아한 한계 인정 템플릿 사용
        return gracefulLimitationTemplate(
            query.question,
            `기본적인 접근 방법: ${aiAnswer.slice(0, 100)}${aiAnswer.length > 100 ? '...' : ''}`
        );
    }

    /**
     * 사전 신뢰도 계산 (AI 호출 전)
     */
    private calculatePreConfidence(
        query: RuleMasterQuery,
        relatedTerms: TermSearchResult[],
        gameContext: string
    ): number {
        let confidence = 40; // 낮은 기본값에서 시작

        // 게임이 지정된 경우 +20
        if (query.gameId) confidence += 20;

        // 관련 특화 용어가 있는 경우
        const specificTerms = relatedTerms.filter(t => t.isSpecific);
        if (specificTerms.length > 0) {
            confidence += Math.min(specificTerms.length * 15, 30);
        }

        // 높은 점수의 매치가 있는 경우
        if (relatedTerms.length > 0 && relatedTerms[0].matchScore > 80) {
            confidence += 25;
        }

        // 질문 복잡도에 따른 조정 (간단한 질문일수록 높은 신뢰도)
        const questionLength = query.question.length;
        if (questionLength < 20) {
            confidence += 15; // 짧고 간단한 질문
        } else if (questionLength > 100) {
            confidence -= 10; // 길고 복잡한 질문
        }

        return Math.min(confidence, 90); // 사전 계산은 최대 90%
    }

    /**
     * 최종 신뢰도 계산 (AI 응답 후)
     */
    private calculateFinalConfidence(
        preConfidence: number,
        answerLength: number,
        relatedTerms: TermSearchResult[]
    ): number {
        let finalConfidence = preConfidence;

        // AI 답변 길이에 따른 조정
        if (answerLength < 50) {
            finalConfidence -= 15; // 너무 짧은 답변은 불완전할 가능성
        } else if (answerLength > 500) {
            finalConfidence += 10; // 상세한 답변은 높은 신뢰도
        }

        // 관련 용어 활용도에 따른 보정
        const termUtilization = relatedTerms.length > 0 ? Math.min(relatedTerms.length * 5, 15) : -10;
        finalConfidence += termUtilization;

        return Math.max(Math.min(finalConfidence, 95), 5); // 5-95% 범위
    }

    /**
     * 질문에서 관련 용어 추출
     */
    private async extractRelatedTerms(query: RuleMasterQuery): Promise<TermSearchResult[]> {
        const allTerms: TermSearchResult[] = [];

        // 질문을 키워드로 분할
        const keywords = this.extractKeywords(query.question);

        // 각 키워드에 대해 용어 검색
        for (const keyword of keywords) {
            const searchResults = await gameTermsService.searchAllTerms(query.gameId, keyword);
            allTerms.push(...searchResults);
        }

        // 중복 제거 및 점수 기준 정렬
        const uniqueTerms = this.removeDuplicateTerms(allTerms);
        return uniqueTerms.sort((a, b) => b.matchScore - a.matchScore);
    }

    /**
     * 질문에서 키워드 추출
     */
    private extractKeywords(question: string): string[] {
        // 불용어 제거
        const stopWords = ['은', '는', '이', '가', '을', '를', '에', '에서', '로', '으로', '와', '과', '의', '도', '만', '라도', '이라도', '에게', '한테', '께', '로부터', '에게서', '한테서', '께서', '이다', '아니다', '이야', '야', '이냐', '냐', '니', '이니'];

        // 단어 분할 및 정제
        const words = question
            .replace(/[^\w\s가-힣]/g, ' ') // 특수문자 제거
            .split(/\s+/)
            .filter(word => word.length > 1) // 1글자 제외
            .filter(word => !stopWords.includes(word)) // 불용어 제외
            .map(word => word.trim());

        return [...new Set(words)]; // 중복 제거
    }

    /**
     * 중복 용어 제거
     */
    private removeDuplicateTerms(terms: TermSearchResult[]): TermSearchResult[] {
        const seen = new Set<string>();
        return terms.filter(term => {
            const key = `${term.korean}_${term.english}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * 게임 컨텍스트 구축
     */
    private async buildGameContext(gameId: number | null, relatedTerms: TermSearchResult[]): Promise<string> {
        if (!gameId) {
            return '일반적인 보드게임 룰 질문입니다.';
        }

        const metadata = gameTermsService.getGameMetadata(gameId);
        if (!metadata) {
            return `게임 ID ${gameId}에 대한 정보를 찾을 수 없습니다.`;
        }

        const specificTerms = relatedTerms.filter(t => t.isSpecific).slice(0, 5);
        const termsContext = specificTerms.length > 0
            ? `관련 특화 용어: ${specificTerms.map(t => `${t.korean}(${t.english})`).join(', ')}`
            : '';

        return `
게임: ${metadata.game_name_korean} (${metadata.game_name_english})
퍼블리셔: ${metadata.publisher_korean || metadata.publisher_original}
복잡도: ${metadata.complexity_level}
${termsContext}
    `.trim();
    }

    /**
     * AI를 통한 답변 생성
     */
    private async generateAIAnswer(
        query: RuleMasterQuery,
        gameContext: string,
        relatedTerms: TermSearchResult[]
    ): Promise<string> {
        try {
            // 게임 ID를 실제 게임 이름으로 변환
            const gameTitle = this.getGameTitleById(query.gameId);
            
            console.log('🎮 [Rule Master Service] AI 답변 생성 시작:', {
                gameId: query.gameId,
                gameTitle,
                질문: query.question.slice(0, 50) + '...'
            });

            const result = await askGameQuestionWithSmartResearch(gameTitle, query.question);
            
            console.log('✅ [Rule Master Service] AI 답변 생성 완료:', {
                답변길이: result.answer.length,
                리서치사용: result.researchUsed
            });
            
            return result.answer;
        } catch (error) {
            console.error('❌ [Rule Master Service] AI 답변 생성 실패:', error);
            return this.generateFallbackAnswer(query, relatedTerms);
        }
    }

    /**
     * 게임 ID를 게임 제목으로 변환
     */
    private getGameTitleById(gameId: number | null): string {
        const gameMap: Record<number, string> = {
            331: '아크노바',
            1: '세븐원더스 듀얼',
            297: '윙스팬',
            148: '윙스팬: 아시아'
        };

        if (gameId && gameMap[gameId]) {
            return gameMap[gameId];
        }

        return gameId ? '더게임' : '일반 보드게임';
    }

    /**
     * 폴백 답변 생성 (AI 실패 시)
     */
    private generateFallbackAnswer(query: RuleMasterQuery, relatedTerms: TermSearchResult[]): string {
        if (relatedTerms.length === 0) {
            return gracefulLimitationTemplate(
                query.question,
                '관련 용어를 찾지 못했습니다'
            );
        }

        const relevantTerm = relatedTerms[0];
        return `"${query.question}"와 관련하여 "${relevantTerm.korean}" (${relevantTerm.english}) 용어를 찾았습니다.\n\n${relevantTerm.description}\n\n더 구체적인 답변을 위해서는 질문을 더 자세히 설명해 주세요.`;
    }

    /**
     * 추가 제안사항 생성 (신뢰도 고려)
     */
    private generateSuggestions(
        query: RuleMasterQuery, 
        relatedTerms: TermSearchResult[],
        confidence: number
    ): string[] {
        const suggestions: string[] = [];

        // 낮은 신뢰도의 경우 추가 확인 권장
        if (confidence < 60) {
            suggestions.push('공식 룰북이나 FAQ를 확인해보시는 것을 권장합니다');
        }

        if (!query.gameId) {
            suggestions.push('게임을 선택하면 더 정확한 답변을 받을 수 있습니다');
        }

        if (relatedTerms.length > 5) {
            suggestions.push('관련 용어들을 확인해보세요');
        }

        const specificTerms = relatedTerms.filter(t => t.isSpecific);
        if (specificTerms.length > 0 && confidence > 70) {
            suggestions.push(`"${specificTerms[0].korean}" 용어를 참고하세요`);
        }

        if (suggestions.length === 0) {
            suggestions.push('더 구체적인 상황을 설명해 주시면 도움이 됩니다');
        }

        return suggestions.slice(0, 3);
    }

    /**
     * 소스 추출
     */
    private extractSources(relatedTerms: TermSearchResult[], gameContext: string): string[] {
        const sources = new Set<string>();

        relatedTerms.forEach(term => {
            if (term.isSpecific && term.gameId) {
                const metadata = gameTermsService.getGameMetadata(term.gameId);
                if (metadata) {
                    sources.add(`${metadata.game_name_korean} 공식 룰북`);
                }
            } else {
                sources.add('보드게임 공통 용어집');
            }
        });

        return Array.from(sources).slice(0, 3);
    }

    /**
     * 게임 불일치 시 사용자 안내 응답 생성
     */
    private createGameMismatchResponse(validation: GameValidationResult, query: RuleMasterQuery): RuleMasterResponse {
        const currentGame = gameQuestionValidator.getGameById(query.gameId);
        const currentGameTitle = currentGame?.title || "현재 게임";
        
        let answer = "🚫 **게임 불일치 안내**\n\n";
        
        if (validation.mentionedGame) {
            answer += `현재 **${currentGameTitle}** 채팅창에서 **${validation.mentionedGame.title}**에 대한 질문을 하셨네요!\n\n`;
            answer += `**${validation.mentionedGame.title}**에 대한 정확하고 전문적인 답변을 받으시려면:\n`;
            answer += `🎯 **${validation.mentionedGame.title}** 채팅창에서 질문해주세요\n\n`;
            answer += `이렇게 하면:\n`;
            answer += `✅ 해당 게임에 특화된 정확한 정보 제공\n`;
            answer += `✅ 관련 용어와 규칙의 정밀한 해석\n`;
            answer += `✅ 더 빠르고 효율적인 답변\n\n`;
            answer += `**${currentGameTitle}**에 대한 질문이시라면 다시 질문해주세요! 😊`;
        } else {
            answer += validation.message || "질문과 게임이 일치하지 않습니다.";
            if (validation.suggestedAction) {
                answer += `\n\n📋 **권장 사항:** ${validation.suggestedAction}`;
            }
        }

        return {
            answer,
            relatedTerms: [],
            confidence: 1.0, // 명확한 안내이므로 100% 확신
            sources: [],
            suggestions: [
                validation.mentionedGame 
                    ? `${validation.mentionedGame.title} 채팅창으로 이동`
                    : "올바른 게임 선택",
                `${currentGameTitle}에 대한 다른 질문하기`
            ]
        };
    }
}

export const ruleMasterService = RuleMasterService.getInstance(); 
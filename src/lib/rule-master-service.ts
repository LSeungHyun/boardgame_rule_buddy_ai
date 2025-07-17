'use client';

import { gameTermsService } from './game-terms-service';
import { RuleMasterQuery, RuleMasterResponse, TermSearchResult } from '@/types/game-terms';
import { askGameQuestionWithSmartResearch } from './gemini';

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
            // 1. 질문에서 관련 용어 추출
            const relatedTerms = await this.extractRelatedTerms(query);

            // 2. 게임 컨텍스트 구축
            const gameContext = await this.buildGameContext(query.gameId, relatedTerms);

            // 3. AI를 통한 답변 생성
            const answer = await this.generateAIAnswer(query, gameContext, relatedTerms);

            // 4. 신뢰도 계산
            const confidence = this.calculateConfidence(query, relatedTerms, gameContext);

            // 5. 추가 제안사항 생성
            const suggestions = this.generateSuggestions(query, relatedTerms);

            return {
                answer,
                relatedTerms: relatedTerms.slice(0, 10), // 상위 10개
                confidence,
                sources: this.extractSources(relatedTerms, gameContext),
                suggestions
            };

        } catch (error) {
            console.error('❌ 룰마스터 답변 생성 실패:', error);

            return {
                answer: '죄송합니다. 답변을 생성하는 중에 오류가 발생했습니다. 다시 시도해 주세요.',
                relatedTerms: [],
                confidence: 0,
                sources: [],
                suggestions: ['질문을 다시 정리해서 물어보세요', '더 구체적인 상황을 설명해 주세요']
            };
        }
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
        const prompt = `
당신은 보드게임 룰 마스터입니다. 다음 질문에 대해 정확하고 도움이 되는 답변을 해주세요.

### 게임 정보
${gameContext}

### 질문
${query.question}

### 관련 용어 (참고용)
${relatedTerms.slice(0, 5).map(term =>
            `- ${term.korean} (${term.english}): ${term.description}`
        ).join('\n')}

### 답변 지침
1. 질문에 직접적으로 답변하세요
2. 관련 용어가 있다면 활용하세요
3. 구체적이고 실용적인 조언을 제공하세요
4. 불확실한 경우 솔직히 말씀하세요
5. 한국어로 답변하세요

답변:`;

        try {
            // askGameQuestionWithSmartResearch는 gameTitle과 userQuestion이 필요
            // gameTitle은 게임 컨텍스트에서 추출하거나 기본값 사용
            const gameTitle = query.gameId ? "보드게임" : "일반 보드게임"; // 향후 게임 이름 DB에서 조회 가능

            const result = await askGameQuestionWithSmartResearch(gameTitle, query.question);
            return result.answer; // ResearchEnhancedResponse에서 answer 속성만 반환
        } catch (error) {
            console.error('AI 답변 생성 실패:', error);
            return this.generateFallbackAnswer(query, relatedTerms);
        }
    }

    /**
     * 폴백 답변 생성 (AI 실패 시)
     */
    private generateFallbackAnswer(query: RuleMasterQuery, relatedTerms: TermSearchResult[]): string {
        if (relatedTerms.length === 0) {
            return `"${query.question}"에 대한 정확한 답변을 찾지 못했습니다. 질문을 더 구체적으로 해주시거나, 게임명을 정확히 명시해 주세요.`;
        }

        const relevantTerm = relatedTerms[0];
        return `"${query.question}"와 관련하여 "${relevantTerm.korean}" (${relevantTerm.english}) 용어를 찾았습니다.\n\n${relevantTerm.description}\n\n더 구체적인 답변을 위해서는 질문을 더 자세히 설명해 주세요.`;
    }

    /**
     * 신뢰도 계산
     */
    private calculateConfidence(
        query: RuleMasterQuery,
        relatedTerms: TermSearchResult[],
        gameContext: string
    ): number {
        let confidence = 50; // 기본 신뢰도

        // 게임이 지정된 경우 +20
        if (query.gameId) confidence += 20;

        // 관련 특화 용어가 있는 경우
        const specificTerms = relatedTerms.filter(t => t.isSpecific);
        if (specificTerms.length > 0) {
            confidence += Math.min(specificTerms.length * 10, 30);
        }

        // 높은 점수의 매치가 있는 경우
        if (relatedTerms.length > 0 && relatedTerms[0].matchScore > 80) {
            confidence += 20;
        }

        return Math.min(confidence, 95); // 최대 95%
    }

    /**
     * 추가 제안사항 생성
     */
    private generateSuggestions(query: RuleMasterQuery, relatedTerms: TermSearchResult[]): string[] {
        const suggestions: string[] = [];

        if (!query.gameId) {
            suggestions.push('게임을 선택하면 더 정확한 답변을 받을 수 있습니다');
        }

        if (relatedTerms.length > 5) {
            suggestions.push('관련 용어들을 확인해보세요');
        }

        const specificTerms = relatedTerms.filter(t => t.isSpecific);
        if (specificTerms.length > 0) {
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
}

export const ruleMasterService = RuleMasterService.getInstance(); 
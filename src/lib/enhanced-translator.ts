/**
 * 통합 한영 용어 매핑 및 번역 시스템
 * GPT + GEMINI 데이터베이스 통합, Primary/Fallback 전략 적용
 */

// 데이터 import
import gptTerms from '@/data/board-game-terms-gpt.json';
import geminiTerms from '@/data/board-game-terms-gemini.json';
import discrepancies from '@/data/term-discrepancies.json';

/**
 * 번역 결과 인터페이스
 */
export interface TranslationResult {
    primary: string;
    fallbacks: string[];
    confidence: number;
    source: 'gpt' | 'gemini' | 'unified';
    context?: string;
}

/**
 * 검색 쿼리 생성 결과
 */
export interface SearchQueryResult {
    queries: string[];
    keywords: string[];
    gameSpecific: boolean;
    confidence: number;
}

/**
 * 통합 매핑 시스템 클래스
 */
export class EnhancedTranslator {
    private unifiedMapping: Map<string, TranslationResult> = new Map();
    private gameSpecificMappings: Map<string, Map<string, TranslationResult>> = new Map();

    constructor() {
        this.buildUnifiedMapping();
        this.buildGameSpecificMappings();
    }

    /**
     * 통합 매핑 테이블 구축
     * GPT를 Primary로, GEMINI를 Fallback으로 사용
     */
    private buildUnifiedMapping(): void {
        console.log('🔄 통합 매핑 테이블 구축 시작...');

        // 1. GPT 데이터를 기본 매핑으로 설정
        this.processGPTTerms();

        // 2. GEMINI 데이터로 보완 및 Fallback 생성
        this.processGeminiTerms();

        // 3. 불일치 분석 결과로 우선순위 조정
        this.applyDiscrepancyResolutions();

        console.log(`✅ 통합 매핑 완료: ${this.unifiedMapping.size}개 용어`);
    }

    /**
     * GPT 용어 데이터 처리
     */
    private processGPTTerms(): void {
        // Universal terms 처리
        this.processGPTSection(gptTerms.universal_terms.components, 'components');
        this.processGPTSection(gptTerms.universal_terms.scoring, 'scoring');
        this.processGPTSection(gptTerms.universal_terms.game_materials, 'game_materials');

        // Game mechanisms 처리
        Object.entries(gptTerms.game_mechanisms).forEach(([category, data]) => {
            if (typeof data === 'object' && data !== null && 'terms' in data) {
                this.processGPTSection((data as any).terms, `mechanism_${category}`);
            } else if (typeof data === 'object' && data !== null) {
                this.processGPTSection(data, `mechanism_${category}`);
            }
        });

        // Game actions 처리
        Object.entries(gptTerms.game_actions).forEach(([category, terms]) => {
            this.processGPTSection(terms, `action_${category}`);
        });

        // Game timing 처리
        Object.entries(gptTerms.game_timing).forEach(([category, terms]) => {
            this.processGPTSection(terms, `timing_${category}`);
        });
    }

    /**
     * GPT 섹션별 용어 처리
     */
    private processGPTSection(terms: any, context: string): void {
        Object.entries(terms).forEach(([korean, english]) => {
            if (typeof english === 'string') {
                this.unifiedMapping.set(korean, {
                    primary: english,
                    fallbacks: [],
                    confidence: 0.9,
                    source: 'gpt',
                    context
                });
            }
        });
    }

    /**
     * GEMINI 용어 데이터로 보완
     */
    private processGeminiTerms(): void {
        // Foundational vocabulary 처리
        Object.entries(geminiTerms.foundational_vocabulary).forEach(([category, terms]) => {
            this.processGeminiSection(terms, `foundation_${category}`);
        });

        // Components 처리
        Object.entries(geminiTerms.components).forEach(([category, terms]) => {
            this.processGeminiSection(terms, `component_${category}`);
        });

        // Action verbs 처리
        Object.entries(geminiTerms.action_verbs).forEach(([category, terms]) => {
            this.processGeminiSection(terms, `action_${category}`);
        });

        // Game mechanisms 처리
        Object.entries(geminiTerms.game_mechanisms).forEach(([category, terms]) => {
            this.processGeminiSection(terms, `mechanism_${category}`);
        });
    }

    /**
     * GEMINI 섹션별 용어 처리 (Fallback 추가)
     */
    private processGeminiSection(terms: any, context: string): void {
        Object.entries(terms).forEach(([korean, english]) => {
            if (typeof english === 'string') {
                const existing = this.unifiedMapping.get(korean);

                if (existing) {
                    // 기존 GPT 매핑이 있으면 GEMINI를 Fallback으로 추가
                    if (existing.primary !== english) {
                        existing.fallbacks.push(english);
                    }
                } else {
                    // 새로운 용어면 GEMINI를 Primary로 설정
                    this.unifiedMapping.set(korean, {
                        primary: english,
                        fallbacks: [],
                        confidence: 0.85,
                        source: 'gemini',
                        context
                    });
                }
            }
        });
    }

    /**
     * 불일치 분석 결과 적용
     */
    private applyDiscrepancyResolutions(): void {
        discrepancies.same_korean_different_english.forEach((item: any) => {
            const mapping = this.unifiedMapping.get(item.korean);
            if (mapping) {
                // 추천사항에 따라 Primary/Fallback 조정
                if (item.recommendation.includes('GPT') || item.recommendation.includes('gpt')) {
                    mapping.primary = item.gpt_english;
                    if (!mapping.fallbacks.includes(item.gemini_english)) {
                        mapping.fallbacks.push(item.gemini_english);
                    }
                } else if (item.recommendation.includes('GEMINI') || item.recommendation.includes('gemini')) {
                    mapping.primary = item.gemini_english;
                    if (!mapping.fallbacks.includes(item.gpt_english)) {
                        mapping.fallbacks.push(item.gpt_english);
                    }
                }

                // Critical validation needed 항목은 높은 우선순위
                if (item.analysis_priority === 'critical' || item.analysis_priority === 'high') {
                    mapping.confidence = 0.95;
                }
            }
        });
    }

    /**
 * 게임별 특화 매핑 구축 (현재는 빈 상태 - 추후 별도 파일에서 로드)
 */
    private buildGameSpecificMappings(): void {
        console.log('🎮 게임별 특화 매핑 구축...');

        // TODO: 게임별 특화 용어는 별도 파일에서 로드 예정
        // 현재는 공통 용어만 사용

        console.log(`✅ 게임별 매핑 완료: ${this.gameSpecificMappings.size}개 게임 (현재 빈 상태)`);
    }

    /**
     * 한국어 용어를 영어로 번역
     */
    translate(koreanTerm: string, gameTitle?: string): TranslationResult | null {
        // 1. 게임별 특화 매핑 우선 확인
        if (gameTitle) {
            const gameMapping = this.getGameMapping(gameTitle);
            if (gameMapping?.has(koreanTerm)) {
                return gameMapping.get(koreanTerm)!;
            }
        }

        // 2. 통합 매핑 확인
        return this.unifiedMapping.get(koreanTerm) || null;
    }

    /**
     * 다중 검색 쿼리 생성 (Primary + Fallback 전략)
     */
    generateSearchQueries(question: string, gameTitle?: string): SearchQueryResult {
        console.log('🔍 검색 쿼리 생성 시작:', { 질문: question.slice(0, 50), 게임: gameTitle });

        const extractedKeywords = this.extractKeywords(question);
        const translatedKeywords: string[] = [];
        const queries: string[] = [];
        let confidence = 0.7;
        let gameSpecific = false;

        // 키워드별 번역 및 Fallback 생성
        extractedKeywords.forEach(keyword => {
            const translation = this.translate(keyword, gameTitle);
            if (translation) {
                translatedKeywords.push(translation.primary);

                // Fallback도 포함
                translation.fallbacks.forEach(fallback => {
                    if (!translatedKeywords.includes(fallback)) {
                        translatedKeywords.push(fallback);
                    }
                });

                confidence = Math.max(confidence, translation.confidence);
                if (translation.context?.startsWith('game_')) {
                    gameSpecific = true;
                }
            }
        });

        // 게임 제목 정규화
        const normalizedGameTitle = this.normalizeGameTitle(gameTitle);

        // 다중 쿼리 생성 전략
        if (translatedKeywords.length > 0) {
            // Primary 쿼리 (최우선)
            queries.push(`"${normalizedGameTitle}" ${translatedKeywords.slice(0, 3).map(k => `"${k}"`).join(' ')}`);

            // Fallback 쿼리들
            if (translatedKeywords.length > 1) {
                queries.push(`"${normalizedGameTitle}" ${translatedKeywords.slice(1, 4).map(k => `"${k}"`).join(' ')}`);
            }

            // 단일 키워드 쿼리 (가장 중요한 것만)
            if (translatedKeywords.length > 0) {
                queries.push(`"${normalizedGameTitle}" "${translatedKeywords[0]}"`);
            }

            // 한국어 원본 쿼리 (마지막 폴백)
            queries.push(`"${gameTitle}" ${extractedKeywords.slice(0, 2).join(' ')}`);
        } else {
            // 번역 실패 시 원본 질문 기반 쿼리
            queries.push(`"${normalizedGameTitle}" ${question.slice(0, 100)}`);
            confidence = 0.3;
        }

        console.log('✅ 검색 쿼리 생성 완료:', { 쿼리수: queries.length, 키워드수: translatedKeywords.length, 신뢰도: confidence });

        return {
            queries: [...new Set(queries)], // 중복 제거
            keywords: translatedKeywords,
            gameSpecific,
            confidence
        };
    }

    /**
     * 질문에서 핵심 키워드 추출
     */
    private extractKeywords(question: string): string[] {
        // 조사 제거 패턴
        const particles = ['을', '를', '이', '가', '은', '는', '의', '에', '에서', '으로', '로', '와', '과', '하다', '되다'];

        // 중요 키워드 우선 추출
        const importantTerms = Array.from(this.unifiedMapping.keys()).filter(term =>
            question.includes(term) && term.length > 1
        );

        // 길이순 정렬하여 긴 용어부터 추출 (더 구체적인 용어 우선)
        const sortedTerms = importantTerms.sort((a, b) => b.length - a.length);

        // 중복 방지를 위한 Set 사용
        const extractedKeywords = new Set<string>();

        // 최대 5개까지만 추출
        sortedTerms.slice(0, 5).forEach(term => {
            extractedKeywords.add(term);
        });

        return Array.from(extractedKeywords);
    }

    /**
     * 게임 제목 정규화
     */
    private normalizeGameTitle(gameTitle?: string): string {
        if (!gameTitle) return '';

        // 게임별 영어명 매핑
        const gameNameMapping: { [key: string]: string } = {
            '아크 노바': 'Ark Nova',
            '아크노바': 'Ark Nova',
            '윙스팬': 'Wingspan',
            '테라포밍 마스': 'Terraforming Mars',
            '글룸헤이븐': 'Gloomhaven',
            '스피릿 아일랜드': 'Spirit Island',
            '사이드': 'Scythe',
            '어콜라': 'Agricola',
            '가이아 프로젝트': 'Gaia Project',
            '버라지': 'Barrage',
            '아컴호러': 'Arkham Horror',
            '도미니언': 'Dominion',
            '클랭크!': 'Clank!',
            '팬데믹': 'Pandemic'
        };

        return gameNameMapping[gameTitle] || gameTitle;
    }

    /**
     * 게임별 매핑 조회
     */
    private getGameMapping(gameTitle: string): Map<string, TranslationResult> | null {
        // 정확한 매칭 시도
        let mapping = this.gameSpecificMappings.get(gameTitle);
        if (mapping) return mapping;

        // 정규화된 제목으로 시도
        const normalized = this.normalizeGameTitle(gameTitle);
        mapping = this.gameSpecificMappings.get(normalized);
        if (mapping) return mapping;

        // 부분 매칭 시도
        for (const [key, value] of this.gameSpecificMappings.entries()) {
            if (key.toLowerCase().includes(gameTitle.toLowerCase()) ||
                gameTitle.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }

        return null;
    }

    /**
     * 디버깅용 매핑 정보 조회
     */
    getDebugInfo(): {
        unifiedMappingSize: number;
        gameSpecificMappingsSize: number;
        gameList: string[];
        sampleMappings: Array<{ korean: string; english: string; source: string }>;
    } {
        const sampleMappings = Array.from(this.unifiedMapping.entries())
            .slice(0, 10)
            .map(([korean, result]) => ({
                korean,
                english: result.primary,
                source: result.source
            }));

        return {
            unifiedMappingSize: this.unifiedMapping.size,
            gameSpecificMappingsSize: this.gameSpecificMappings.size,
            gameList: Array.from(this.gameSpecificMappings.keys()),
            sampleMappings
        };
    }

    /**
     * 특정 용어의 모든 번역 옵션 조회
     */
    getAllTranslations(koreanTerm: string, gameTitle?: string): {
        unified?: TranslationResult;
        gameSpecific?: TranslationResult;
        recommendations: string[];
    } {
        const unified = this.unifiedMapping.get(koreanTerm);
        let gameSpecific: TranslationResult | undefined;

        if (gameTitle) {
            const gameMapping = this.getGameMapping(gameTitle);
            gameSpecific = gameMapping?.get(koreanTerm);
        }

        const recommendations: string[] = [];

        if (gameSpecific) {
            recommendations.push(gameSpecific.primary);
            recommendations.push(...gameSpecific.fallbacks);
        }

        if (unified) {
            if (!recommendations.includes(unified.primary)) {
                recommendations.push(unified.primary);
            }
            unified.fallbacks.forEach(fallback => {
                if (!recommendations.includes(fallback)) {
                    recommendations.push(fallback);
                }
            });
        }

        return {
            unified,
            gameSpecific,
            recommendations
        };
    }
}

// 싱글톤 인스턴스 생성
export const enhancedTranslator = new EnhancedTranslator();

// 편의 함수들
export const translateTerm = (korean: string, gameTitle?: string) =>
    enhancedTranslator.translate(korean, gameTitle);

export const generateBGGQueries = (question: string, gameTitle?: string) =>
    enhancedTranslator.generateSearchQueries(question, gameTitle);

export const getTranslationDebugInfo = () =>
    enhancedTranslator.getDebugInfo(); 
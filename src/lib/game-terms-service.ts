'use client';

import { GameTermsData, GameTerm, TermSearchResult } from '@/types/game-terms';

class GameTermsService {
    private static instance: GameTermsService;
    private gameTermsCache: Map<number, GameTermsData> = new Map();
    private commonTerms: Map<string, GameTerm> = new Map();

    private constructor() {
        this.loadCommonTerms();
    }

    public static getInstance(): GameTermsService {
        if (!GameTermsService.instance) {
            GameTermsService.instance = new GameTermsService();
        }
        return GameTermsService.instance;
    }

    /**
     * 공통 용어 로딩 (한 번만 실행)
     */
    private async loadCommonTerms(): Promise<void> {
        try {
            // 임시로 간단한 공통 용어 생성 (파일이 문제 있을 경우)
            this.commonTerms.set('카드', {
                korean: '카드',
                english: 'Card',
                description: '게임에서 사용되는 기본 구성물',
                category: 'common',
                source: 'manual'
            });

            this.commonTerms.set('토큰', {
                korean: '토큰',
                english: 'Token',
                description: '게임에서 사용되는 마커나 칩',
                category: 'common',
                source: 'manual'
            });

            console.log(`✅ 공통 용어 ${this.commonTerms.size}개 로딩 완료`);
        } catch (error) {
            console.error('❌ 공통 용어 로딩 실패:', error);
        }
    }

    /**
     * 특정 게임의 용어 데이터 로딩
     */
    public async loadGameTerms(gameId: number): Promise<GameTermsData | null> {
        // 캐시에서 확인
        if (this.gameTermsCache.has(gameId)) {
            return this.gameTermsCache.get(gameId)!;
        }

        try {
            // 아크노바의 경우 특별 처리
            if (gameId === 331) {
                const response = await fetch('/data/game-terms-json/331_ArkNova.json');

                if (!response.ok) {
                    console.warn(`⚠️ 아크노바 데이터 파일을 찾을 수 없습니다.`);
                    return null;
                }

                const gameTermsData: GameTermsData = await response.json();

                // 캐시에 저장
                this.gameTermsCache.set(gameId, gameTermsData);

                console.log(`✅ 게임 ${gameTermsData.metadata.game_name_korean} 용어 로딩 완료`);
                return gameTermsData;
            }

            // 다른 게임들은 추후 확장
            console.warn(`⚠️ 게임 ID ${gameId}는 아직 지원되지 않습니다.`);
            return null;

        } catch (error) {
            console.error(`❌ 게임 ID ${gameId} 용어 로딩 실패:`, error);
            return null;
        }
    }

    /**
     * 특정 게임의 용어 검색
     */
    public searchGameTerms(gameId: number, query: string): TermSearchResult[] {
        const gameTerms = this.gameTermsCache.get(gameId);
        if (!gameTerms) {
            return [];
        }

        const results: TermSearchResult[] = [];
        const searchQuery = query.toLowerCase().trim();

        // 게임 특화 용어에서 검색
        Object.entries(gameTerms.game_specific_terms).forEach(([category, terms]) => {
            Object.entries(terms).forEach(([korean, termData]: [string, any]) => {
                const matchScore = this.calculateMatchScore(searchQuery, korean, termData.english, termData.description);

                if (matchScore > 0) {
                    results.push({
                        korean,
                        english: termData.english,
                        description: termData.description,
                        category: termData.category || category,
                        isSpecific: true,
                        gameId,
                        matchScore
                    });
                }
            });
        });

        // 결과를 매치 점수 순으로 정렬
        return results.sort((a, b) => b.matchScore - a.matchScore);
    }

    /**
     * 공통 용어에서 검색
     */
    public searchCommonTerms(query: string): TermSearchResult[] {
        const results: TermSearchResult[] = [];
        const searchQuery = query.toLowerCase().trim();

        this.commonTerms.forEach((term) => {
            const matchScore = this.calculateMatchScore(searchQuery, term.korean, term.english, term.description);

            if (matchScore > 0) {
                results.push({
                    korean: term.korean,
                    english: term.english,
                    description: term.description,
                    category: term.category,
                    isSpecific: false,
                    matchScore
                });
            }
        });

        return results.sort((a, b) => b.matchScore - a.matchScore);
    }

    /**
     * 통합 검색 (게임 특화 + 공통)
     */
    public async searchAllTerms(gameId: number | null, query: string): Promise<TermSearchResult[]> {
        const results: TermSearchResult[] = [];

        // 게임 특화 용어 검색 (우선순위 높음)
        if (gameId) {
            await this.loadGameTerms(gameId);
            const gameResults = this.searchGameTerms(gameId, query);
            results.push(...gameResults);
        }

        // 공통 용어 검색 (우선순위 낮음)
        const commonResults = this.searchCommonTerms(query);
        results.push(...commonResults);

        return results.slice(0, 20); // 최대 20개 결과 반환
    }

    /**
     * 검색어와 용어의 매치 점수 계산
     */
    private calculateMatchScore(query: string, korean: string, english: string, description: string): number {
        const q = query.toLowerCase();
        const k = korean.toLowerCase();
        const e = english.toLowerCase();
        const d = description.toLowerCase();

        // 정확한 매치
        if (k === q || e === q) return 100;

        // 시작 부분 매치
        if (k.startsWith(q) || e.startsWith(q)) return 80;

        // 포함 매치
        if (k.includes(q)) return 60;
        if (e.includes(q)) return 50;
        if (d.includes(q)) return 30;

        return 0;
    }

    /**
     * 사용 가능한 게임 목록 조회
     */
    public getAvailableGames(): number[] {
        return Array.from(this.gameTermsCache.keys());
    }

    /**
     * 게임 메타데이터 조회
     */
    public getGameMetadata(gameId: number) {
        const gameTerms = this.gameTermsCache.get(gameId);
        return gameTerms?.metadata || null;
    }
}

export const gameTermsService = GameTermsService.getInstance(); 
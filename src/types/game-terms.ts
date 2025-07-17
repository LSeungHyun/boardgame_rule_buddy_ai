export interface GameMetadata {
    game_id: number;
    game_name_korean: string;
    game_name_english: string;
    publisher_korean?: string;
    publisher_original?: string;
    edition?: string;
    year?: number;
    bgg_link?: string;
    official_site?: string;
    rulebook_source?: string;
    research_date?: string;
    term_count?: number;
    complexity_level?: 'Simple' | 'Medium' | 'Complex';
    sources?: string;
}

export interface GameTerm {
    korean: string;
    english: string;
    description: string;
    description_en?: string;
    category: string;
    notes?: string;
    source?: 'gemini' | 'gpt' | 'both' | 'manual';
}

export interface GameTermsData {
    metadata: GameMetadata;
    game_specific_terms: {
        [category: string]: {
            [korean: string]: {
                english: string;
                description: string;
                description_en?: string;
                category?: string;
                notes?: string;
                source?: string;
            };
        };
    };
    summary?: {
        total_terms: number;
        categories: string[];
        [key: string]: any;
    };
}

export interface TermSearchResult {
    korean: string;
    english: string;
    description: string;
    category: string;
    isSpecific: boolean; // true: 게임 특화, false: 공통
    gameId?: number;
    matchScore: number;
}

export interface RuleMasterQuery {
    gameId: number | null;
    question: string;
    context?: string;
}

export interface RuleMasterResponse {
    answer: string;
    relatedTerms: TermSearchResult[];
    confidence: number;
    sources: string[];
    suggestions?: string[];
} 
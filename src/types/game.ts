export interface Game {
    id: string;
    gameId?: number;              // 실제 DB의 숫자 ID
    title: string;
    publisher?: string;
    description: string;
    imageUrl: string;
    difficulty?: string;          // Very Easy, Easy, Normal, Semi-Hard, Hard, Extreme
    isActive?: boolean;
    createdAt?: string;
}

// 리서치 단계 타입 추가
export type ResearchStage = 'analyzing' | 'searching' | 'processing' | 'summarizing' | 'generating_logic' | 'generating_text' | 'generating_review' | 'completed';

// Universal Rule Master (Beta) 관련 타입 정의
export type ConversationState = 'awaiting_game' | 'awaiting_command' | 'in_conversation';

export interface GameContext {
    gameName: string;
    setAt: Date;
    turnNumber: number;
}

export interface UniversalBetaState {
    isActive: boolean;
    conversationState: ConversationState;
    gameContext: GameContext | null;
    sessionId: string;
}

// 채팅 메시지 타입 (Gemini API contents 포맷과 호환)
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    // 리서치 관련 메타데이터 (assistant 메시지용)
    researchUsed?: boolean;
    sources?: string[];
    fromCache?: boolean;
    complexity?: {
        score: number;
        reasoning: string[];
    };
    // V2 분석 결과 추가
    analysisV2?: {
        type: 'rule' | 'strategy' | 'exception';
        requiresResearch: boolean;
        confidence: number;
        explanation?: string;
    };
    // 대화 맥락 추적 관련 메타데이터
    contextMetadata?: {
        turnNumber: number;
        sessionId: string;
        gameContext?: string;
    };
}

// Gemini API contents 포맷
export interface GeminiContent {
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
}

// 검색 관련 상태와 핸들러를 그룹화
export interface SearchConfig {
    term: string;
    setTerm: (term: string) => void;
}

// UI 상태를 그룹화
export interface UIConfig {
    isLoading: boolean;
}

// 데이터와 핸들러를 그룹화
export interface GameDataConfig {
    games: Game[];
    onSelectGame: (game: Game) => void;
}

export interface GameSelectionProps {
    search: SearchConfig;
    ui: UIConfig;
    data: GameDataConfig;
}

export interface ChatMessageProps {
    message: ChatMessage;
    game?: Game;           // 현재 선택된 게임 정보
    userQuestion?: string; // 해당 답변에 대한 사용자 질문
    onQuestionClick?: (question: string) => void; // 추천 질문 클릭 핸들러
}

export interface ChatScreenProps {
    game: Game;
    onGoBack: () => void;
    messages: ChatMessage[];
    onSendMessage: (text: string, callbacks?: {
        onResearchStart?: () => void;
        onResearchProgress?: (stage: ResearchStage) => void;
        onComplete?: () => void;
    }) => void;
    isLoading: boolean;
} 
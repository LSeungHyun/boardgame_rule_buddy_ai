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

// Universal Beta 대화 상태 타입
export type ConversationState = 'awaiting_game' | 'awaiting_command' | 'in_conversation';

// 신뢰도 체크 관련 타입 추가
export interface ConfidenceCheckResult {
    confidenceScore: number;
    serviceMode: 'expert' | 'beta';
}

export interface GameContext {
    gameName: string;
    setAt: Date;
    turnNumber: number;
    // 신뢰도 체크 결과 추가
    confidenceResult?: ConfidenceCheckResult;
}

export interface UniversalBetaState {
    isActive: boolean;
    conversationState: ConversationState;
    gameContext: GameContext | null;
    sessionId: string;
    // 신뢰도 체크 상태 추가
    isCheckingConfidence?: boolean;
    currentServiceMode?: 'expert' | 'beta';
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
    analysisV2?: QuestionAnalysisV2;
    // 대화 맥락 추적 관련 메타데이터
    contextMetadata?: {
        turnNumber: number;
        sessionId: string;
        gameContext?: string;
    };
}

// 통합된 대화 시스템을 위한 새로운 타입
export type UnifiedConversationState = 'awaiting_game_name' | 'in_conversation';

export interface UnifiedGameContext {
    gameName: string;
    gameId?: string | number;  // 365게임의 경우 ID 존재
    setAt: Date;
    turnNumber: number;
    confidenceResult: ConfidenceCheckResult;
    isFromDatabase: boolean;  // 365게임 DB에서 가져온 게임인지 여부
}

export interface UnifiedChatState {
    conversationState: UnifiedConversationState;
    gameContext: UnifiedGameContext | null;
    sessionId: string;
    isCheckingConfidence: boolean;
    serviceMode: 'expert' | 'beta' | null;
    messages: ChatMessage[];
    geminiChatHistory: GeminiContent[];
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
    search: {
        term: string;
        setTerm: (term: string) => void;
        isSearching?: boolean; // 검색 중 상태 표시용
    };
    ui: {
        isLoading: boolean;
        error?: string | null;
    };
    data: {
        games: Game[];
        onSelectGame: (game: Game) => void;
    };
}

export interface ChatMessageProps {
    message: ChatMessage;
    game?: Game;           // 현재 선택된 게임 정보
    userQuestion?: string; // 해당 답변에 대한 사용자 질문
    messageIndex?: number; // 메시지 순서 인덱스
    onQuestionClick?: (question: string) => void; // 추천 질문 클릭 핸들러
}

export interface ChatScreenProps {
    game: Game | null;
    onGoBack: () => void;
    messages: ChatMessage[];
    onSendMessage: (text: string, callbacks?: {
        onResearchStart?: () => void;
        onResearchProgress?: (stage: ResearchStage) => void;
        onComplete?: () => void;
    }) => void;
    isLoading: boolean;
    onQuestionClick?: (question: string) => void;
    headerActions?: import('react').ReactNode; // 헤더 우측에 표시할 액션 버튼들
} 
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

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
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
}

export interface ChatScreenProps {
    game: Game;
    onGoBack: () => void;
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    isLoading: boolean;
} 
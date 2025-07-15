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

export interface GameSelectionProps {
    games: Game[];
    onSelectGame: (game: Game) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
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
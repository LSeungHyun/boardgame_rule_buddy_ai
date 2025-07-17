'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Send, Bot, User, Lightbulb, BookOpen } from 'lucide-react';
import { ruleMasterService } from '@/lib/rule-master-service';
import { gameTermsService } from '@/lib/game-terms-service';
import { RuleMasterResponse, TermSearchResult } from '@/types/game-terms';

interface Message {
    id: string;
    type: 'user' | 'bot';
    content: string;
    timestamp: Date;
    response?: RuleMasterResponse;
}

interface AvailableGame {
    id: number;
    name: string;
}

export default function RuleMasterChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [selectedGame, setSelectedGame] = useState<number | null>(null);
    const [availableGames, setAvailableGames] = useState<AvailableGame[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // 초기화
        initializeChat();
    }, []);

    const initializeChat = async () => {
        // 사용 가능한 게임 목록 로딩
        await loadAvailableGames();

        // 환영 메시지
        setMessages([{
            id: '1',
            type: 'bot',
            content: '안녕하세요! 저는 보드게임 룰 마스터입니다. 게임을 선택하고 룰에 대해 질문해보세요! 🎲',
            timestamp: new Date()
        }]);
    };

    const loadAvailableGames = async () => {
        // 아크노바 데이터 먼저 로딩
        await gameTermsService.loadGameTerms(331);

        // 임시로 사용 가능한 게임 목록 (확장 시 동적 로딩)
        const games: AvailableGame[] = [
            { id: 331, name: '아크노바' },
            { id: 1, name: '세븐원더스 듀얼' }
        ];

        setAvailableGames(games);
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // 룰마스터 답변 생성
            const response = await ruleMasterService.generateAnswer({
                gameId: selectedGame,
                question: userMessage.content,
                context: undefined
            });

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                content: response.answer,
                timestamp: new Date(),
                response
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('답변 생성 실패:', error);

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                content: '죄송합니다. 답변을 생성하는 중에 오류가 발생했습니다.',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto p-4 space-y-4">
            {/* 헤더 */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="w-5 h-5" />
                        보드게임 룰 마스터
                    </CardTitle>
                    <div className="flex items-center gap-4">
                        <Select
                            value={selectedGame?.toString() || ""}
                            onValueChange={(value) => setSelectedGame(value ? parseInt(value) : null)}
                        >
                            <SelectTrigger className="w-64">
                                <SelectValue placeholder="게임을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableGames.map(game => (
                                    <SelectItem key={game.id} value={game.id.toString()}>
                                        {game.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedGame && (
                            <Badge variant="secondary">
                                {availableGames.find(g => g.id === selectedGame)?.name} 선택됨
                            </Badge>
                        )}
                    </div>
                </CardHeader>
            </Card>

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto space-y-4 min-h-96">
                {messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                        <MessageBubble message={message} />
                        {message.response && (
                            <ResponseDetails response={message.response} />
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Bot className="w-4 h-4 animate-pulse" />
                        <span>답변을 생성 중입니다...</span>
                    </div>
                )}
            </div>

            {/* 입력 영역 */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={selectedGame
                                ? `${availableGames.find(g => g.id === selectedGame)?.name} 룰에 대해 질문하세요...`
                                : "게임을 선택하고 룰에 대해 질문하세요..."
                            }
                            disabled={isLoading}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={isLoading || !input.trim()}
                            size="icon"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function MessageBubble({ message }: { message: Message }) {
    return (
        <div className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.type === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
            )}

            <div className={`max-w-[80%] space-y-1`}>
                <div className={`rounded-lg p-3 ${message.type === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                    }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className={`text-xs text-muted-foreground ${message.type === 'user' ? 'text-right' : 'text-left'
                    }`}>
                    {formatTime(message.timestamp)}
                </p>
            </div>

            {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                </div>
            )}
        </div>
    );
}

function ResponseDetails({ response }: { response: RuleMasterResponse }) {
    return (
        <div className="ml-11 space-y-3">
            {/* 신뢰도 */}
            <div className="flex items-center gap-2">
                <Badge variant={response.confidence > 70 ? 'default' : 'secondary'}>
                    신뢰도: {response.confidence}%
                </Badge>
                {response.sources.map((source, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {source}
                    </Badge>
                ))}
            </div>

            {/* 관련 용어 */}
            {response.relatedTerms.length > 0 && (
                <Card className="bg-background/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            관련 용어
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {response.relatedTerms.slice(0, 5).map((term, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                                <Badge variant={term.isSpecific ? 'default' : 'secondary'} className="text-xs">
                                    {term.isSpecific ? '특화' : '공통'}
                                </Badge>
                                <div className="flex-1 text-sm">
                                    <span className="font-medium">{term.korean}</span>
                                    <span className="text-muted-foreground"> ({term.english})</span>
                                    {term.description && (
                                        <p className="text-xs text-muted-foreground mt-1">{term.description}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* 제안사항 */}
            {response.suggestions && response.suggestions.length > 0 && (
                <Card className="bg-blue-50/50 dark:bg-blue-950/20">
                    <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">제안</p>
                                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                    {response.suggestions.map((suggestion, idx) => (
                                        <li key={idx}>• {suggestion}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function formatTime(date: Date) {
    return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
    });
} 
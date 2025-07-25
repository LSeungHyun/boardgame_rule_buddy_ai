'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Send, Bot, User, Lightbulb, BookOpen, ThumbsUp, ThumbsDown, HelpCircle, MessageSquare } from 'lucide-react';
import { ruleMasterService } from '@/lib/rule-master-service';
import { gameTermsService } from '@/lib/game-terms-service';
import { RuleMasterResponse, TermSearchResult } from '@/types/game-terms';

interface Message {
    id: string;
    type: 'user' | 'bot';
    content: string;
    timestamp: Date;
    response?: RuleMasterResponse;
    feedback?: UserFeedback;
}

interface UserFeedback {
    type: 'accurate' | 'inaccurate' | 'need_more';
    timestamp: Date;
    comment?: string;
}

interface FeedbackStats {
    totalFeedbacks: number;
    accurateCount: number;
    inaccurateCount: number;
    needMoreCount: number;
    averageConfidence: number;
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
    const [feedbackStats, setFeedbackStats] = useState<FeedbackStats>({
        totalFeedbacks: 0,
        accurateCount: 0,
        inaccurateCount: 0,
        needMoreCount: 0,
        averageConfidence: 0
    });
    
    // 선택된 게임명만 유지
    const selectedGameName = availableGames.find(g => g.id === selectedGame)?.name || '';

    useEffect(() => {
        // 초기화
        initializeChat();
        // 피드백 통계 로드
        loadFeedbackStats();
    }, []);

    const initializeChat = async () => {
        // 사용 가능한 게임 목록 로딩
        await loadAvailableGames();

        // 환영 메시지
        setMessages([{
            id: '1',
            type: 'bot',
            content: '안녕하세요! 저는 보드게임 룰 마스터입니다. 게임을 선택하고 룰에 대해 질문해보세요! 🎲\n\n💡 **새로운 기능**: 이제 답변의 도움 정도를 피드백으로 알려주시면 더 나은 서비스를 제공할 수 있습니다!',
            timestamp: new Date()
        }]);
    };

    const loadAvailableGames = async () => {
        // 게임 목록만 설정 (데이터는 선택시 로드)
        const games: AvailableGame[] = [
            { id: 331, name: '아크노바' },
            { id: 1, name: '세븐원더스 듀얼' }
        ];

        setAvailableGames(games);
        console.log('✅ [게임 목록 로드] 게임 목록만 로드 완료 (데이터는 선택시 로드)');
    };

    /**
     * 게임별 데이터를 필요시에만 로드
     */
    const loadGameDataIfNeeded = async (gameId: number) => {
        try {
            console.log(`🎮 [게임 데이터 로드] ${gameId}번 게임 (${availableGames.find(g => g.id === gameId)?.name}) 데이터 로딩 시작`);
            await gameTermsService.loadGameTerms(gameId);
            console.log(`✅ [게임 데이터 로드] ${gameId}번 게임 데이터 로딩 완료`);
        } catch (error) {
            console.warn(`⚠️ [게임 데이터 로드 실패] ${gameId}번 게임:`, error);
        }
    };

    /**
     * 게임 선택 처리 (데이터 로드 포함)
     */
    const handleGameSelection = async (gameId: number | null) => {
        setSelectedGame(gameId);
        
        // 게임이 선택되고 해당 게임의 데이터가 필요한 경우 로드
        if (gameId && (gameId === 331 || gameId === 1)) {
            await loadGameDataIfNeeded(gameId);
        }
    };

    const loadFeedbackStats = () => {
        // localStorage에서 피드백 통계 로드
        const savedStats = localStorage.getItem('rule-master-feedback-stats');
        if (savedStats) {
            setFeedbackStats(JSON.parse(savedStats));
        }
    };

    const saveFeedbackStats = (newStats: FeedbackStats) => {
        localStorage.setItem('rule-master-feedback-stats', JSON.stringify(newStats));
        setFeedbackStats(newStats);
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

    const handleFeedback = (messageId: string, feedbackType: UserFeedback['type'], comment?: string) => {
        const feedback: UserFeedback = {
            type: feedbackType,
            timestamp: new Date(),
            comment
        };

        // 메시지에 피드백 추가
        setMessages(prev => prev.map(msg => 
            msg.id === messageId 
                ? { ...msg, feedback }
                : msg
        ));

        // 피드백 통계 업데이트
        const message = messages.find(m => m.id === messageId);
        if (message?.response) {
            updateFeedbackStats(feedbackType, message.response.confidence);
        }

        // 피드백 데이터 로깅 (분석용)
        logFeedbackData(messageId, feedbackType, comment, message?.response?.confidence || 0);

        console.log('📊 [사용자 피드백 수집]', {
            메시지ID: messageId,
            피드백타입: feedbackType,
            신뢰도: message?.response?.confidence,
            코멘트: comment
        });
    };

    const updateFeedbackStats = (feedbackType: UserFeedback['type'], confidence: number) => {
        const newStats = { ...feedbackStats };
        newStats.totalFeedbacks += 1;
        
        switch (feedbackType) {
            case 'accurate':
                newStats.accurateCount += 1;
                break;
            case 'inaccurate':
                newStats.inaccurateCount += 1;
                break;
            case 'need_more':
                newStats.needMoreCount += 1;
                break;
        }

        // 평균 신뢰도 업데이트
        newStats.averageConfidence = (
            (newStats.averageConfidence * (newStats.totalFeedbacks - 1) + confidence) / 
            newStats.totalFeedbacks
        );

        saveFeedbackStats(newStats);
    };

    const logFeedbackData = (messageId: string, feedbackType: string, comment?: string, confidence: number = 0) => {
        // 실제 운영에서는 분석 서비스로 전송
        const feedbackLog = {
            messageId,
            feedbackType,
            comment,
            confidence,
            gameId: selectedGame,
            timestamp: new Date().toISOString(),
            sessionId: 'session_' + Date.now(), // 실제로는 고유 세션 ID 사용
        };

        // 개발 환경에서는 localStorage에 저장
        const existingLogs = JSON.parse(localStorage.getItem('rule-master-feedback-logs') || '[]');
        existingLogs.push(feedbackLog);
        localStorage.setItem('rule-master-feedback-logs', JSON.stringify(existingLogs));

        console.log('📈 [피드백 로그]', feedbackLog);
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
                        {feedbackStats.totalFeedbacks > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                만족도: {Math.round((feedbackStats.accurateCount / feedbackStats.totalFeedbacks) * 100)}%
                            </Badge>
                        )}
                    </CardTitle>
                    <div className="flex items-center gap-4">
                        <Select
                            value={selectedGame?.toString() || ""}
                            onValueChange={(value) => handleGameSelection(value ? parseInt(value) : null)}
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

            {/* 년도 경고 표시 제거 - 이제 환영메시지에 통합됨 */}

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto space-y-4 min-h-96">
                {messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                        <MessageBubble message={message} />
                        {message.response && (
                            <ResponseDetails 
                                response={message.response} 
                                messageId={message.id}
                                feedback={message.feedback}
                                onFeedback={handleFeedback}
                            />
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

function ResponseDetails({ 
    response, 
    messageId, 
    feedback, 
    onFeedback 
}: { 
    response: RuleMasterResponse;
    messageId: string;
    feedback?: UserFeedback;
    onFeedback: (messageId: string, feedbackType: UserFeedback['type'], comment?: string) => void;
}) {
    return (
        <div className="ml-11 space-y-3">
            {/* 신뢰도 및 피드백 버튼 */}
            <div className="flex items-center gap-2 justify-between">
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

                {/* 피드백 버튼 */}
                {!feedback ? (
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-2">도움이 되었나요?</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onFeedback(messageId, 'accurate')}
                            className="h-8 px-2"
                        >
                            <ThumbsUp className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onFeedback(messageId, 'inaccurate')}
                            className="h-8 px-2"
                        >
                            <ThumbsDown className="w-4 h-4 text-red-600" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onFeedback(messageId, 'need_more')}
                            className="h-8 px-2"
                        >
                            <HelpCircle className="w-4 h-4 text-blue-600" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                            {feedback.type === 'accurate' && '👍 도움됨'}
                            {feedback.type === 'inaccurate' && '👎 부정확'}
                            {feedback.type === 'need_more' && '❓ 더 필요'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">피드백 감사합니다!</span>
                    </div>
                )}
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
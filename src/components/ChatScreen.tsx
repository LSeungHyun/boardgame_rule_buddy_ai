'use client';

import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import { ChatScreenProps, ResearchStage } from '@/types/game';

// ✨ 전략 1 적용: AI의 '사고 과정'을 보여주기 위해 단계를 세분화하고 진행률을 재분배합니다.
const researchStageConfig: Record<ResearchStage, { progress: number; text: string }> = {
    analyzing: { progress: 10, text: '질문 분석 중...' },
    searching: { progress: 25, text: '관련 규칙 검색 중...' },
    processing: { progress: 45, text: '정보 처리 중...' },
    summarizing: { progress: 65, text: '정보 요약 및 정리 중...' },
    generating_logic: { progress: 80, text: '답변의 핵심 논리를 구상하고 있습니다...' },
    generating_text: { progress: 90, text: '논리에 맞춰 문장을 생성하고 있습니다...' },
    generating_review: { progress: 95, text: '생성된 답변을 최종 검토하고 있습니다...' },
    completed: { progress: 100, text: '답변 완성!' },
};

export default function ChatScreen({ game, onGoBack, messages, onSendMessage, isLoading }: ChatScreenProps) {
    const [input, setInput] = useState('');
    const [researchStage, setResearchStage] = useState<ResearchStage>('analyzing');
    const [showResearchStatus, setShowResearchStatus] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    // ✨ 전략 2 적용: 99% 도달 시 시각적 효과를 주기 위한 상태
    const [isFinalizing, setIsFinalizing] = useState(false);

    // ✨ 스크롤 제어를 위한 상태 추가
    const [lastMessageCount, setLastMessageCount] = useState(0);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);



    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // ✨ 새 메시지가 추가되었을 때만 자동 스크롤 (사용자가 스크롤을 위로 올리지 않은 경우)
    useEffect(() => {
        if (messages.length > lastMessageCount && shouldAutoScroll) {
            scrollToBottom();
            setLastMessageCount(messages.length);
        }
    }, [messages.length, lastMessageCount, shouldAutoScroll]);

    // ✨ 사용자가 수동으로 스크롤할 때 자동 스크롤 비활성화
    useEffect(() => {
        const chatContainer = document.querySelector('.custom-scrollbar');
        if (!chatContainer) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = chatContainer as HTMLElement;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;

            // 사용자가 맨 아래에 있으면 자동 스크롤 활성화, 아니면 비활성화
            setShouldAutoScroll(isAtBottom);
        };

        chatContainer.addEventListener('scroll', handleScroll);
        return () => chatContainer.removeEventListener('scroll', handleScroll);
    }, []);

    // ✨ 컴포넌트 마운트 시 lastMessageCount 초기화
    useEffect(() => {
        setLastMessageCount(messages.length);
    }, []);

    useEffect(() => {
        setIsFinalizing(false); // 단계가 바뀌면 일단 Finalizing 상태 해제

        if (showResearchStatus) {
            const config = researchStageConfig[researchStage];
            if (config) {
                setProgress(config.progress);
                setProgressText(config.text);
            }
        }

        // ✨ 전략 2 적용: 최종 '검토' 단계에 진입하면 95%부터 99%까지 천천히 움직입니다.
        if (researchStage === 'generating_review') {
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 99) {
                        clearInterval(interval);
                        setIsFinalizing(true); // 99% 도달 시 Finalizing 상태 활성화
                        setProgressText("답변을 완성하고 있습니다..."); // '거의 다 완료됨' 메시지 표시
                        return 99;
                    }
                    return prev + 1;
                });
            }, 500); // 0.5초마다 1%씩 증가

            return () => clearInterval(interval);
        }

    }, [researchStage, showResearchStatus]);



    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            // ✨ 메시지 전송 시 자동 스크롤 강제 활성화
            setShouldAutoScroll(true);

            onSendMessage(input, {
                onResearchStart: () => {
                    setShowResearchStatus(true);
                    setResearchStage('analyzing');
                },
                // 상위 컴포넌트에서 세분화된 stage(generating_logic 등)를 전달해야 합니다.
                onResearchProgress: (stage: ResearchStage) => {
                    setResearchStage(stage);
                },
                onComplete: () => {
                    setProgress(100);
                    setIsFinalizing(false);
                    setTimeout(() => {
                        setShowResearchStatus(false);
                        setProgress(0);
                        // ✨ 답변 완성 후 스크롤을 맨 아래로 이동
                        scrollToBottom();
                    }, 500);
                }
            });
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-screen pb-20 md:pb-0">
            {/* 헤더 (이전과 동일) */}
            <header className="glass-chat border-b border-amber-400/30 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between p-4">
                    <button
                        onClick={onGoBack}
                        className="p-2 rounded-full hover:bg-amber-500/20 transition-all duration-200 group min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-300 group-hover:text-yellow-300 group-hover:scale-110 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="text-center">
                        <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent drop-shadow-sm">
                            📖 {game.title}
                        </h2>
                        <p className="text-xs text-amber-300/80 font-medium">룰 마스터</p>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>

            {/* 메인 채팅 영역 */}
            <main className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
                {messages.map((msg, index) => {
                    // AI 답변에 대응하는 사용자 질문 찾기
                    let userQuestion: string | undefined;
                    if (msg.role === 'assistant' && index > 0) {
                        // 이전 메시지가 사용자 질문인지 확인
                        const previousMessage = messages[index - 1];
                        if (previousMessage.role === 'user') {
                            userQuestion = previousMessage.content;
                        }
                    }

                    return (
                        <ChatMessage
                            key={index}
                            message={msg}
                            game={game}
                            userQuestion={userQuestion}
                            onQuestionClick={(question) => {
                                if (!isLoading) {
                                    setInput(question);
                                    // 자동으로 질문 전송
                                    setTimeout(() => {
                                        const form = document.querySelector('form');
                                        if (form) {
                                            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                                        }
                                    }, 100);
                                }
                            }}
                        />
                    );
                })}

                {/* ✨ 개선된 프로그레스 바 UI */}
                {isLoading && showResearchStatus && (
                    <div className="flex justify-start">
                        <div className="glass-card border border-amber-400/40 text-amber-100 rounded-2xl px-4 py-3 w-full max-w-md shadow-lg">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-sm text-amber-200">{progressText}</span>
                                <span className="font-bold text-sm text-yellow-300">{progress}%</span>
                            </div>
                            <div className="w-full bg-amber-900/50 rounded-full h-2.5 overflow-hidden">
                                <div
                                    // ✨ 전략 2 적용: isFinalizing 상태일 때 반짝이는 애니메이션(animate-pulse) 추가
                                    className={`bg-gradient-to-r from-yellow-400 to-amber-500 h-2.5 rounded-full shadow-lg transition-all duration-500 ease-out ${isFinalizing ? 'animate-pulse' : ''}`}
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}

                {isLoading && !showResearchStatus && (
                    <div className="flex justify-start">
                        <div className="glass-card border border-amber-400/40 text-amber-100 rounded-2xl px-4 py-3 flex items-center max-w-xs shadow-lg">
                            <span className="text-xl mr-3">🎲</span>
                            <div>
                                <span className="font-medium">답변 생성 중</span>
                                <div className="flex space-x-1 mt-1">
                                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </main>

            {/* 입력 영역 (이전과 동일) */}
            <footer className="glass-chat border-t border-amber-400/30 backdrop-blur-md">
                <form onSubmit={handleSubmit} className="p-4 flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="🎲 보드게임 규칙에 대해 궁금한 점을 물어보세요..."
                        className="flex-1 input-game rounded-xl px-4 py-3 placeholder:text-amber-200/60 placeholder:font-medium"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="btn-game-primary px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-amber-900/30 border-t-amber-900 rounded-full animate-spin"></div>
                                처리중
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                ⚡ 전송
                            </span>
                        )}
                    </button>
                </form>
            </footer>
        </div>
    );
}
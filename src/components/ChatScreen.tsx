'use client';

import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ResearchStatus from './ResearchStatus';
import { ChatScreenProps, ResearchStage } from '@/types/game';

export default function ChatScreen({ game, onGoBack, messages, onSendMessage, isLoading }: ChatScreenProps) {
    const [input, setInput] = useState('');
    const [researchStage, setResearchStage] = useState<ResearchStage>('analyzing');
    const [showResearchStatus, setShowResearchStatus] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLElement>(null);

    const scrollToBottom = () => {
        // 메시지가 2개 이상일 때만 main 영역 내에서 스크롤
        if (messages.length > 1 && mainRef.current) {
            mainRef.current.scrollTo({
                top: mainRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(scrollToBottom, [messages, isLoading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            console.log('📝 [ChatScreen] 메시지 전송 시작:', input);

            onSendMessage(input, {
                onResearchStart: () => {
                    console.log('🔍 [ChatScreen] onResearchStart 콜백 실행 - 리서치 상태 표시 시작');
                    setShowResearchStatus(true);
                    setResearchStage('analyzing');
                },
                onResearchProgress: (stage: ResearchStage) => {
                    console.log('📊 [ChatScreen] onResearchProgress 콜백:', stage);
                    setResearchStage(stage);
                },
                onComplete: () => {
                    console.log('✅ [ChatScreen] onComplete 콜백 실행');
                    setShowResearchStatus(false);
                }
            });
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-screen">
            <header className="sticky top-0 z-50 flex items-center justify-between p-4 glass-chat border-b border-amber-400/20 shadow-lg">
                <button onClick={onGoBack} className="p-2 rounded-full hover:bg-amber-500/20 transition-all duration-200 group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-110 transition-transform text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent drop-shadow">
                    📖 {game.title} 룰 마스터
                </h2>
                <div className="w-8"></div>
            </header>

            <main ref={mainRef} className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                {messages.map((msg, index) => (
                    <ChatMessage key={index} message={msg} />
                ))}

                {/* 리서치 상태 표시 */}
                <ResearchStatus
                    stage={researchStage}
                    isVisible={showResearchStatus}
                />

                {/* 기본 로딩 상태 (리서치 하지 않는 일반 답변) */}
                {isLoading && !showResearchStatus && (
                    <div className="flex justify-start mb-4">
                        <div className="glass-card border border-amber-400/30 text-amber-100 rounded-2xl px-4 py-3 flex items-center max-w-xs shadow-lg">
                            <span className="text-xl mr-2">🤖</span>
                            <span className="font-medium mr-2">AI 답변 생성 중</span>
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI 답변 생성 중 (리서치 완료 후) */}
                {isLoading && showResearchStatus && researchStage === 'completed' && (
                    <div className="flex justify-start mb-4">
                        <div className="glass-card bg-emerald-600/20 border border-emerald-400/30 text-emerald-100 rounded-2xl px-4 py-3 flex items-center shadow-lg">
                            <span className="text-xl mr-2">🤖</span>
                            <span className="font-medium">AI 답변 생성 중</span>
                            <div className="flex space-x-1 ml-3">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 glass-chat border-t border-amber-400/20">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="보드게임 규칙에 대해 궁금한 점을 물어보세요..."
                        className="flex-1 p-3 input-game rounded-xl placeholder:text-amber-200/60"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="px-6 py-3 btn-game-primary rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isLoading ? '처리중...' : '⚡ 전송'}
                    </button>
                </form>
            </footer>
        </div>
    );
}


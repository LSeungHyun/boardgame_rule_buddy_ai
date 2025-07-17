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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
            {/* 헤더 - 보드게임 북 커버 느낌 */}
            <header className="glass-chat border-b border-amber-400/30 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between p-4">
                    <button
                        onClick={onGoBack}
                        className="p-2 rounded-full hover:bg-amber-500/20 transition-all duration-200 group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-300 group-hover:text-yellow-300 group-hover:scale-110 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="text-center">
                        <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent drop-shadow-sm">
                            📖 {game.title}
                        </h2>
                        <p className="text-xs text-amber-300/80 font-medium">룰 마스터</p>
                    </div>

                    <div className="w-10"></div>
                </div>
            </header>

            {/* 메인 채팅 영역 - 보드게임 테이블 위 */}
            <main className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
                {messages.map((msg, index) => (
                    <ChatMessage key={index} message={msg} />
                ))}

                {/* 리서치 상태 표시 */}
                <ResearchStatus
                    stage={researchStage}
                    isVisible={showResearchStatus}
                />

                {/* 기본 로딩 상태 */}
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

                {/* AI 답변 생성 중 (리서치 완료 후) */}
                {isLoading && showResearchStatus && researchStage === 'completed' && (
                    <div className="flex justify-start">
                        <div className="glass-card bg-emerald-600/20 border border-emerald-400/40 text-emerald-100 rounded-2xl px-4 py-3 flex items-center shadow-lg">
                            <span className="text-xl mr-3">🎯</span>
                            <div>
                                <span className="font-medium">답변 완성 중</span>
                                <div className="flex space-x-1 mt-1">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </main>

            {/* 입력 영역 - 게임 점수 입력판 느낌 */}
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


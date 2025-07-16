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
        <div className="flex flex-col h-screen bg-gray-900">
            <header className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700 shadow-md">
                <button onClick={onGoBack} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-xl font-bold">{game.title} 룰 마스터</h2>
                <div className="w-8"></div>
            </header>

            <main className="flex-1 p-4 overflow-y-auto custom-scrollbar">
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
                        <div className="bg-gray-700 text-white rounded-xl px-4 py-3 flex items-center">
                            <span className="text-xl mr-2">🤖</span>
                            <span className="font-medium mr-2">Gemini AI 답변 생성 중..</span>
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* AI 답변 생성 중 (리서치 완료 후) */}
                {isLoading && showResearchStatus && researchStage === 'completed' && (
                    <div className="flex justify-start mb-4">
                        <div className="bg-green-900/50 border border-green-700/50 text-green-100 rounded-xl px-4 py-3 flex items-center">
                            <span className="text-xl mr-2">🤖</span>
                            <span className="font-medium">AI 답변 생성 중..</span>
                            <div className="flex space-x-1 ml-3">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 bg-gray-800 border-t border-gray-700">
                <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="몬 카드 3장을 뽑는데 해당 카드가 2장 있었어요..."
                        className="flex-1 p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                        disabled={isLoading || !input.trim()}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>
                </form>
            </footer>
        </div>
    );
} 


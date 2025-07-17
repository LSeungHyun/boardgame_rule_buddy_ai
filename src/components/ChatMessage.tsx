'use client';

import React, { useState } from 'react';
import { marked } from 'marked';
import { ChatMessageProps } from '@/types/game';

export default function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const [showSources, setShowSources] = useState(false);
    const [feedback, setFeedback] = useState<'helpful' | 'unhelpful' | null>(null);

    const bubbleClass = isUser
        ? 'btn-game-primary self-end shadow-lg'
        : 'glass-card self-start shadow-lg';

    const sanitizedHtml = message.role === 'assistant' ? marked(message.content) : message.content;

    const handleFeedback = (type: 'helpful' | 'unhelpful') => {
        setFeedback(type);
        // TODO: 실제 피드백 데이터 저장 로직 구현
        console.log(`Feedback: ${type} for message with research:`, message.researchUsed);
    };

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-md lg:max-w-2xl rounded-2xl px-4 py-3 ${bubbleClass} relative transform transition-all duration-200 hover:scale-[1.01]`}>
                {/* 메인 메시지 */}
                {message.role === 'assistant' ? (
                    <div className="markdown-content prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                ) : (
                    <p className="font-medium text-amber-900">{message.content}</p>
                )}

                {/* 리서치 정보 표시 (assistant 메시지에만) */}
                {message.role === 'assistant' && message.researchUsed && (
                    <div className="mt-3 pt-3 border-t border-amber-400/20">
                        <div className="flex items-center space-x-2 text-xs">
                            <span className="flex items-center space-x-1">
                                <span>🔍</span>
                                <span className="text-amber-300 font-medium">
                                    웹 리서치 {message.fromCache ? '(캐시)' : '실행됨'}
                                </span>
                            </span>

                            {message.sources && message.sources.length > 0 && (
                                <button
                                    onClick={() => setShowSources(!showSources)}
                                    className="text-amber-400 hover:text-yellow-300 underline transition-colors"
                                >
                                    출처 {message.sources.length}개 보기
                                </button>
                            )}
                        </div>

                        {/* 복잡도 정보 */}
                        {message.complexity && (
                            <div className="mt-2 text-xs text-amber-200">
                                <span className="bg-amber-600/30 text-amber-200 px-2 py-1 rounded-full border border-amber-400/30">
                                    복잡도: {message.complexity.score}/100
                                </span>
                            </div>
                        )}

                        {/* 출처 목록 */}
                        {showSources && message.sources && (
                            <div className="mt-2 p-2 glass-card rounded-lg border border-amber-400/20">
                                <p className="text-xs text-amber-200 mb-1 font-medium">참고 출처:</p>
                                <ul className="text-xs space-y-1">
                                    {message.sources.map((source, index) => (
                                        <li key={index} className="text-amber-300 hover:text-yellow-300 transition-colors">
                                            • {source}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* 피드백 버튼 (assistant 메시지에만) */}
                {message.role === 'assistant' && (
                    <div className="mt-3 pt-3 border-t border-amber-400/20">
                        {feedback === null ? (
                            <div className="flex items-center space-x-2">
                                <span className="text-xs text-amber-200">이 답변이 도움이 되었나요?</span>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => handleFeedback('helpful')}
                                        className="p-1 hover:bg-emerald-500/20 rounded-full transition-all duration-200 hover:scale-110 border border-transparent hover:border-emerald-400/30"
                                        title="도움됨"
                                    >
                                        <span className="text-sm">👍</span>
                                    </button>
                                    <button
                                        onClick={() => handleFeedback('unhelpful')}
                                        className="p-1 hover:bg-red-500/20 rounded-full transition-all duration-200 hover:scale-110 border border-transparent hover:border-red-400/30"
                                        title="도움 안됨"
                                    >
                                        <span className="text-sm">👎</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-emerald-300 flex items-center space-x-1">
                                <span>✓</span>
                                <span>피드백 감사합니다!</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
} 
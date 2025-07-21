'use client';

import React, { useState } from 'react';
import { marked } from 'marked';
import { ChatMessageProps } from '@/types/game';
import FeedbackButtons from './FeedbackButtons';

export default function ChatMessage({ message, game, userQuestion }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const [showSources, setShowSources] = useState(false);

    // 사용자와 AI 메시지 스타일 구분
    const bubbleClass = isUser
        ? 'btn-game-primary self-end shadow-lg border border-amber-400/20'
        : 'glass-card self-start shadow-lg border border-amber-400/20';

    const sanitizedHtml = message.role === 'assistant' ? marked(message.content) : message.content;

    // 환영 메시지는 피드백 제외
    const isWelcomeMessage = message.role === 'assistant' &&
        (message.content.includes('룰 마스터입니다') || message.content.includes('무엇이든 물어보세요'));

    // 메시지 ID 생성 (실제 구현에서는 고유한 ID를 사용해야 함)
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md lg:max-w-2xl rounded-2xl px-4 py-3 ${bubbleClass} relative transition-all duration-200 hover:shadow-xl hover:border-amber-400/40`}>

                {/* 메시지 아바타 */}
                {!isUser && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-400/20">
                        <span className="text-lg">📖</span>
                        <span className="text-xs font-medium text-amber-300">룰 마스터</span>
                    </div>
                )}

                {/* 메인 메시지 내용 */}
                {message.role === 'assistant' ? (
                    <div className="markdown-content prose prose-invert prose-sm max-w-none text-amber-100"
                        dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                ) : (
                    <p className="font-medium text-amber-900 leading-relaxed">{message.content}</p>
                )}

                {/* 리서치 정보 (간결하게) */}
                {message.role === 'assistant' && message.researchUsed && (
                    <div className="mt-3 pt-2 border-t border-amber-400/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-amber-400">🔍</span>
                                <span className="text-amber-300 font-medium">
                                    웹 리서치 활용 {message.fromCache ? '(캐시)' : ''}
                                </span>
                                {message.complexity && (
                                    <span className="bg-amber-600/30 text-amber-200 px-2 py-1 rounded-full text-[10px] border border-amber-400/30">
                                        복잡도 {message.complexity.score}/100
                                    </span>
                                )}
                            </div>

                            {message.sources && message.sources.length > 0 && (
                                <button
                                    onClick={() => setShowSources(!showSources)}
                                    className="text-amber-400 hover:text-yellow-300 text-xs font-medium underline transition-colors"
                                >
                                    출처 {message.sources.length}개
                                </button>
                            )}
                        </div>

                        {/* 출처 목록 (토글) */}
                        {showSources && message.sources && (
                            <div className="mt-2 p-2 glass-card rounded-lg border border-amber-400/20 bg-amber-950/20">
                                <p className="text-[10px] text-amber-200 mb-1 font-medium uppercase">참고 출처</p>
                                <ul className="text-xs space-y-1">
                                    {message.sources.map((source, index) => (
                                        <li key={index} className="text-amber-300/80 hover:text-amber-200 transition-colors leading-relaxed">
                                            • {source}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* 피드백 버튼 (실질적인 답변에만) */}
                {message.role === 'assistant' && !isWelcomeMessage && (
                    <FeedbackButtons
                        messageId={messageId}
                        gameId={game?.id || 'unknown-game'}
                        question={userQuestion || '질문 정보 없음'}
                        answer={message.content}
                    />
                )}
            </div>
        </div>
    );
} 
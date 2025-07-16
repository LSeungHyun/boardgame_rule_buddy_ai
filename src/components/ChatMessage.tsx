'use client';

import React, { useState } from 'react';
import { marked } from 'marked';
import { ChatMessageProps } from '@/types/game';

export default function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const [showSources, setShowSources] = useState(false);
    const [feedback, setFeedback] = useState<'helpful' | 'unhelpful' | null>(null);
    
    const bubbleClass = isUser
        ? 'bg-blue-600 text-white self-end'
        : 'bg-gray-700 text-white self-start';

    const sanitizedHtml = message.role === 'assistant' ? marked(message.content) : message.content;

    const handleFeedback = (type: 'helpful' | 'unhelpful') => {
        setFeedback(type);
        // TODO: 실제 피드백 데이터 저장 로직 구현
        console.log(`Feedback: ${type} for message with research:`, message.researchUsed);
    };

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-md lg:max-w-2xl rounded-xl px-4 py-3 ${bubbleClass} relative`}>
                {/* 메인 메시지 */}
                {message.role === 'assistant' ? (
                    <div className="markdown-content" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                ) : (
                    <p>{message.content}</p>
                )}

                {/* 리서치 정보 표시 (assistant 메시지에만) */}
                {message.role === 'assistant' && message.researchUsed && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex items-center space-x-2 text-xs">
                            <span className="flex items-center space-x-1">
                                <span>🔍</span>
                                <span className="text-blue-300">
                                    웹 리서치 {message.fromCache ? '(캐시)' : '실행됨'}
                                </span>
                            </span>
                            
                            {message.sources && message.sources.length > 0 && (
                                <button
                                    onClick={() => setShowSources(!showSources)}
                                    className="text-blue-400 hover:text-blue-300 underline"
                                >
                                    출처 {message.sources.length}개 보기
                                </button>
                            )}
                        </div>

                        {/* 출처 링크 */}
                        {showSources && message.sources && (
                            <div className="mt-2 p-2 bg-gray-800 rounded-md">
                                <div className="text-xs text-gray-300 mb-1">참고 출처:</div>
                                {message.sources.slice(0, 3).map((source, index) => (
                                    <div key={index} className="text-xs mb-1">
                                        <a
                                            href={source}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 break-all"
                                        >
                                            {index + 1}. {source}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 복잡도 정보 (개발 모드에서만) */}
                        {process.env.NODE_ENV === 'development' && message.complexity && (
                            <details className="mt-2">
                                <summary className="text-xs text-gray-400 cursor-pointer">
                                    복잡도 분석 (점수: {message.complexity.score})
                                </summary>
                                <div className="text-xs text-gray-400 mt-1">
                                    {message.complexity.reasoning.join(' | ')}
                                </div>
                            </details>
                        )}
                    </div>
                )}

                {/* 피드백 버튼 (assistant 메시지에만) */}
                {message.role === 'assistant' && (
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-600">
                        <div className="text-xs text-gray-400">
                            이 답변이 도움이 되었나요?
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => handleFeedback('helpful')}
                                className={`text-xs px-2 py-1 rounded transition-colors ${
                                    feedback === 'helpful'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-600 hover:bg-green-600 text-gray-300'
                                }`}
                                disabled={feedback !== null}
                            >
                                👍 도움됨
                            </button>
                            <button
                                onClick={() => handleFeedback('unhelpful')}
                                className={`text-xs px-2 py-1 rounded transition-colors ${
                                    feedback === 'unhelpful'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-600 hover:bg-red-600 text-gray-300'
                                }`}
                                disabled={feedback !== null}
                            >
                                👎 아쉬움
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 
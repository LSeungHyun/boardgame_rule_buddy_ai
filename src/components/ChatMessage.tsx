'use client';

import React from 'react';
import { marked } from 'marked';
import { ChatMessageProps } from '@/types/game';

export default function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const bubbleClass = isUser
        ? 'bg-blue-600 text-white self-end'
        : 'bg-gray-700 text-white self-start';

    const sanitizedHtml = message.role === 'assistant' ? marked(message.content) : message.content;

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-md lg:max-w-2xl rounded-xl px-4 py-3 ${bubbleClass}`}>
                {message.role === 'assistant' ? (
                    <div className="markdown-content" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                ) : (
                    <p>{message.content}</p>
                )}
            </div>
        </div>
    );
} 
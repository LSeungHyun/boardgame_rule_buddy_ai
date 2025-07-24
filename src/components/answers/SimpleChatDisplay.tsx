/**
 * simple_chat 타입의 응답을 렌더링하는 컴포넌트
 * 기본적인 채팅 메시지 형태로 마크다운을 지원합니다.
 */

'use client';

import React from 'react';
import { marked } from 'marked';
import { STYLE_CLASSES } from '@/lib/constants';

interface SimpleChatData {
  content: string;
}

interface SimpleChatDisplayProps {
  /** simple_chat 타입의 data 객체 */
  data: SimpleChatData;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 간단한 채팅 메시지를 마크다운 지원과 함께 렌더링합니다.
 * 향상된 가독성과 타이포그래피로 최적화된 텍스트 응답 컴포넌트입니다.
 */
export function SimpleChatDisplay({ data, className = '' }: SimpleChatDisplayProps) {
  // 마크다운을 HTML로 변환
  const htmlContent = marked(data.content);

  return (
    <div className={`${className}`}>
      <div 
        className={`
          markdown-content prose prose-invert prose-base max-w-none 
          ${STYLE_CLASSES.TEXT_AMBER}
          prose-p:leading-loose prose-p:mb-4
          prose-li:leading-loose prose-li:mb-2
          prose-h1:text-xl prose-h1:mb-4 prose-h1:leading-tight
          prose-h2:text-lg prose-h2:mb-3 prose-h2:leading-tight  
          prose-h3:text-base prose-h3:mb-3 prose-h3:leading-tight
          prose-strong:text-amber-100 prose-strong:font-semibold
          prose-em:text-amber-200 prose-em:italic
          prose-code:bg-amber-900/30 prose-code:text-amber-200 
          prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
          prose-ul:space-y-2 prose-ol:space-y-2
          prose-blockquote:border-l-amber-400 prose-blockquote:bg-amber-950/20 
          prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:rounded-r
        `}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
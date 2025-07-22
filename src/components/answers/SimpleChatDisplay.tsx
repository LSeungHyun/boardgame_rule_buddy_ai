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
 * 기본적인 텍스트 응답에 사용됩니다.
 */
export function SimpleChatDisplay({ data, className = '' }: SimpleChatDisplayProps) {
  // 마크다운을 HTML로 변환
  const htmlContent = marked(data.content);

  return (
    <div className={`${className}`}>
      <div 
        className={`markdown-content prose prose-invert prose-sm max-w-none ${STYLE_CLASSES.TEXT_AMBER}`}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
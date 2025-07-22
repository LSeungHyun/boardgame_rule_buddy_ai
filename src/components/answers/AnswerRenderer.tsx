/**
 * AI 응답을 타입에 따라 적절한 컴포넌트로 렌더링하는 디스패처
 * response_type을 확인하여 SimpleChatDisplay 또는 StructuredAnswerDisplay를 선택합니다.
 */

'use client';

import React from 'react';
import { SimpleChatDisplay } from './SimpleChatDisplay';
import { StructuredAnswerDisplay } from './StructuredAnswerDisplay';
import { RESPONSE_TYPES, UI_LABELS } from '@/lib/constants';

// API 응답 타입 정의
interface SimpleChat {
  response_type: typeof RESPONSE_TYPES.SIMPLE_CHAT;
  data: {
    content: string;
  };
}

interface StructuredDisplay {
  response_type: typeof RESPONSE_TYPES.STRUCTURED_DISPLAY;
  data: {
    title: string;
    sections: Array<{
      number: string;
      title: string;
      icon_name: string;
      content: string;
      subsections?: Array<{
        icon_name: string;
        title: string;
        content: string;
      }>;
    }>;
  };
}

type ApiResponse = SimpleChat | StructuredDisplay;

interface AnswerRendererProps {
  /** AI API로부터 받은 전체 JSON 응답 */
  response: ApiResponse;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * AI 응답의 타입을 확인하고 적절한 렌더링 컴포넌트를 선택합니다.
 * 새로운 응답 타입이 추가되면 이 컴포넌트에서 처리 로직을 확장할 수 있습니다.
 */
export function AnswerRenderer({ response, className = '' }: AnswerRendererProps) {
  // 응답 타입에 따른 조건부 렌더링
  switch (response.response_type) {
    case RESPONSE_TYPES.SIMPLE_CHAT:
      return (
        <SimpleChatDisplay 
          data={response.data} 
          className={className}
        />
      );

    case RESPONSE_TYPES.STRUCTURED_DISPLAY:
      return (
        <StructuredAnswerDisplay 
          data={response.data} 
          className={className}
        />
      );

    default:
      // 알 수 없는 응답 타입에 대한 폴백
      console.warn('알 수 없는 응답 타입:', (response as any).response_type);
      return (
        <div className={`p-4 bg-red-900/20 border border-red-400/30 rounded-lg ${className}`}>
          <p className="text-red-200 text-sm">
            {UI_LABELS.ERROR}: 지원하지 않는 응답 형식입니다.
          </p>
          <details className="mt-2">
            <summary className="text-red-300 text-xs cursor-pointer">
              디버그 정보 보기
            </summary>
            <pre className="text-red-100/70 text-xs mt-1 overflow-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
          </details>
        </div>
      );
  }
}

/**
 * 응답이 유효한 형식인지 검증합니다.
 */
export function isValidResponse(response: any): response is ApiResponse {
  if (!response || typeof response !== 'object') {
    return false;
  }

  const { response_type, data } = response;

  if (!response_type || !data) {
    return false;
  }

  // 각 타입별 데이터 구조 검증
  switch (response_type) {
    case RESPONSE_TYPES.SIMPLE_CHAT:
      return typeof data.content === 'string';

    case RESPONSE_TYPES.STRUCTURED_DISPLAY:
      return (
        typeof data.title === 'string' &&
        Array.isArray(data.sections) &&
        data.sections.every((section: any) => 
          typeof section.number === 'string' &&
          typeof section.title === 'string' &&
          typeof section.icon_name === 'string' &&
          typeof section.content === 'string'
        )
      );

    default:
      return false;
  }
}
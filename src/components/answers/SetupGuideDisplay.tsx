import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * SetupGuideDisplay 컴포넌트의 Props 인터페이스
 */
interface SetupGuideDisplayProps {
  /** 렌더링할 마크다운 콘텐츠 문자열 */
  content: string;
}

/**
 * 게임 준비 가이드를 마크다운으로 받아서 깔끔하고 모바일 친화적인 UI로 렌더링하는 컴포넌트
 * 
 * 주요 기능:
 * - 마크다운 텍스트를 HTML로 파싱하여 표시
 * - Tailwind CSS를 사용한 반응형 스타일링
 * - 채팅 버블 UI에 적합한 디자인
 * - 모바일 우선 반응형 레이아웃
 */
const SetupGuideDisplay: React.FC<SetupGuideDisplayProps> = ({ content }) => {
  // 빈 콘텐츠 처리
  if (!content || content.trim() === '') {
    return null;
  }

  return (
    <div className="setup-guide-container glass-card rounded-2xl p-4 sm:p-6 border border-amber-400/20">
      <div className="prose prose-slate dark:prose-invert prose-sm sm:prose-base max-w-none">
        <ReactMarkdown
          components={{
          // h3 요소 (###) - 메인 제목 스타일링
          h3: ({ children }) => (
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 mt-6 first:mt-0 border-b border-slate-200 dark:border-slate-600 pb-2">
              {children}
            </h3>
          ),
          // h4 요소 (####) - 부제목 스타일링
          h4: ({ children }) => (
            <h4 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200 mb-3 mt-5 first:mt-0">
              {children}
            </h4>
          ),
          // strong 요소 (**text**) - 강조 텍스트 스타일링
          strong: ({ children }) => (
            <strong className="font-bold text-amber-600 dark:text-amber-400">
              {children}
            </strong>
          ),
          // ul 요소 - 순서 없는 리스트 스타일링
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-2 ml-2 sm:ml-4 text-slate-700 dark:text-slate-300">
              {children}
            </ul>
          ),
          // li 요소 - 리스트 아이템 스타일링
          li: ({ children }) => (
            <li className="leading-relaxed">
              {children}
            </li>
          ),
          // ol 요소 - 순서 있는 리스트 스타일링
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 ml-2 sm:ml-4 text-slate-700 dark:text-slate-300">
              {children}
            </ol>
          ),
          // p 요소 - 문단 스타일링
          p: ({ children }) => (
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
              {children}
            </p>
          ),
          // em 요소 (*text*) - 기울임 텍스트 스타일링
          em: ({ children }) => (
            <em className="italic text-slate-600 dark:text-slate-400">
              {children}
            </em>
          ),
        }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default SetupGuideDisplay;
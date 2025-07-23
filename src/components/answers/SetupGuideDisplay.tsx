'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { STYLE_CLASSES } from '@/lib/constants';

/**
 * SetupGuideDisplay 컴포넌트의 Props 인터페이스
 */
interface SetupGuideDisplayProps {
  /** 렌더링할 마크다운 콘텐츠 문자열 */
  content: string;
  className?: string;
}

/**
 * 마크다운 텍스트를 파싱하여 구조화된 섹션으로 분리하는 함수
 */
function parseSetupContent(content: string) {
  // 기본 구조
  const result = {
    title: '',
    sections: [] as Array<{
      title: string;
      content: string;
      type: 'component' | 'setup' | 'rule' | 'tip';
      items: string[];
    }>
  };

  // 라인별로 분할
  const lines = content.split('\n').filter(line => line.trim());
  let currentSection: any = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // H3 헤더 (### Title)
    if (trimmed.startsWith('### ')) {
      if (currentSection) {
        result.sections.push(currentSection);
      }
      
      const title = trimmed.replace('### ', '').trim();
      
      // 섹션 타입 결정
      let type: 'component' | 'setup' | 'rule' | 'tip' = 'setup';
      if (title.includes('구성요소') || title.includes('준비물') || title.includes('컴포넌트')) {
        type = 'component';
      } else if (title.includes('규칙') || title.includes('주의') || title.includes('특별')) {
        type = 'rule';
      } else if (title.includes('팁') || title.includes('참고') || title.includes('도움말')) {
        type = 'tip';
      }
      
      currentSection = {
        title,
        content: '',
        type,
        items: []
      };
    }
    // H4 헤더나 리스트 아이템
    else if (trimmed.startsWith('#### ') || trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('1. ') || /^\d+\./.test(trimmed)) {
      if (currentSection) {
        const item = trimmed
          .replace(/^#### /, '')
          .replace(/^[-*] /, '')
          .replace(/^\d+\. /, '')
          .trim();
        currentSection.items.push(item);
      }
    }
    // 일반 텍스트
    else if (trimmed && currentSection) {
      currentSection.content += (currentSection.content ? ' ' : '') + trimmed;
    }
    // 첫 번째 라인이 제목이 될 수 있음
    else if (!result.title && trimmed && !trimmed.startsWith('#')) {
      result.title = trimmed;
    }
  }

  // 마지막 섹션 추가
  if (currentSection) {
    result.sections.push(currentSection);
  }

  return result;
}

/**
 * 섹션 타입별 스타일 정의 - Amber 기반 통일
 */
const sectionStyles = {
  component: {
    border: 'border-amber-400/30',
    bg: 'bg-amber-900/20',
    text: 'text-amber-100',
    icon: '🎲',
    accent: 'text-amber-300'
  },
  setup: {
    border: 'border-amber-400/30',
    bg: 'bg-amber-900/20',
    text: 'text-amber-100',
    icon: '⚙️',
    accent: 'text-amber-300'
  },
  rule: {
    border: 'border-amber-400/30',
    bg: 'bg-amber-900/20',
    text: 'text-amber-100',
    icon: '⚠️',
    accent: 'text-amber-300'
  },
  tip: {
    border: 'border-amber-400/30',
    bg: 'bg-amber-900/20',
    text: 'text-amber-100',
    icon: '💡',
    accent: 'text-amber-300'
  }
};

/**
 * 게임 준비 가이드를 마크다운으로 받아서 깔끔하고 모바일 친화적인 UI로 렌더링하는 컴포넌트
 */
const SetupGuideDisplay: React.FC<SetupGuideDisplayProps> = ({ content, className }) => {
  // 빈 콘텐츠 처리
  if (!content || content.trim() === '') {
    return null;
  }

  const parsedContent = parseSetupContent(content);
  const mainStyle = sectionStyles.setup; // 기본 셋업 스타일

  return (
    <div className={cn(
      'glass-card rounded-2xl p-4 md:p-6 space-y-4',
      STYLE_CLASSES.BORDER_AMBER,
      'bg-amber-950/10',
      'ring-1 ring-amber-400/30 shadow-lg shadow-amber-500/10',
      className
    )}>
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-1">{mainStyle.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {parsedContent.title && (
              <h3 className={cn('text-lg md:text-xl font-bold leading-tight', STYLE_CLASSES.TEXT_AMBER)}>
                {parsedContent.title}
              </h3>
            )}
          </div>
        </div>
      </div>

      {/* 섹션들 */}
      {parsedContent.sections.length > 0 && (
        <div className="space-y-4">
          {parsedContent.sections.map((section, index) => {
            const style = sectionStyles[section.type];
            
            return (
              <div
                key={index}
                className={cn(
                  'rounded-xl p-4 border transition-all duration-200',
                  style.border,
                  style.bg,
                  'hover:shadow-md'
                )}
              >
                {/* 섹션 헤더 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{style.icon}</span>
                  <h4 className={cn('font-semibold text-sm md:text-base', style.accent)}>
                    {section.title}
                  </h4>
                </div>

                {/* 섹션 설명 */}
                {section.content && (
                  <p className={cn('text-sm leading-relaxed mb-3', style.text, 'opacity-90')}>
                    {section.content}
                  </p>
                )}

                {/* 아이템 리스트 */}
                {section.items.length > 0 && (
                  <div className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-start gap-2">
                        <span className={cn('text-xs mt-1 flex-shrink-0', style.accent)}>
                          {section.type === 'component' ? '🔹' : 
                           section.type === 'setup' ? '✅' : 
                           section.type === 'rule' ? '❗' : '💎'}
                        </span>
                        <span className={cn('text-sm leading-relaxed', style.text)}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 섹션이 없는 경우 원본 내용 표시 */}
      {parsedContent.sections.length === 0 && (
        <div className={cn('text-sm leading-relaxed opacity-90', STYLE_CLASSES.TEXT_AMBER)}>
          {content.replace(/#{1,4}\s/g, '').trim()}
        </div>
      )}

      {/* 하단 안내 */}
      <div className="border-t border-amber-400/20 pt-3 mt-4">
        <p className="text-xs text-amber-200/70 text-center flex items-center justify-center gap-2">
          <span>📋</span>
          <span>게임 준비가 완료되면 플레이를 시작하세요!</span>
        </p>
      </div>
    </div>
  );
};

export default SetupGuideDisplay;
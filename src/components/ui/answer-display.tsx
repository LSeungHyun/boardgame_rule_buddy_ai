'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { parseAnswer, simpleMarkdownToHtml, type ParsedAnswer, type AnswerSection } from '@/lib/answer-parser';

interface AnswerDisplayProps {
  content: string;
  className?: string;
  showSummaryOnly?: boolean;
}

const ruleTypeStyles = {
  basic: {
    border: 'border-blue-400/40',
    bg: 'bg-blue-500/10',
    text: 'text-blue-100',
    icon: '📋'
  },
  exception: {
    border: 'border-orange-400/40',
    bg: 'bg-orange-500/10',
    text: 'text-orange-100',
    icon: '⚠️'
  },
  tip: {
    border: 'border-green-400/40',
    bg: 'bg-green-500/10',
    text: 'text-green-100',
    icon: '💡'
  }
};

const importanceStyles = {
  high: 'ring-2 ring-red-400/50 shadow-lg shadow-red-500/20',
  medium: 'ring-1 ring-amber-400/30 shadow-md shadow-amber-500/10',
  low: 'border-opacity-50'
};

export function AnswerDisplay({ content, className, showSummaryOnly = false }: AnswerDisplayProps) {
  const parsedAnswer = parseAnswer(content);
  const ruleStyle = ruleTypeStyles[parsedAnswer.ruleType];
  const importanceStyle = importanceStyles[parsedAnswer.importance];

  return (
    <div className={cn(
      'glass-card rounded-2xl p-4 md:p-6 space-y-4',
      ruleStyle.border,
      ruleStyle.bg,
      importanceStyle,
      className
    )}>
      {/* 답변 헤더 */}
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-1">{ruleStyle.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('text-sm font-medium px-2 py-1 rounded-full', ruleStyle.bg, ruleStyle.text)}>
              {parsedAnswer.ruleType === 'basic' ? '기본 규칙' : 
               parsedAnswer.ruleType === 'exception' ? '예외 사항' : '유용한 팁'}
            </span>
            {parsedAnswer.importance === 'high' && (
              <span className="text-xs bg-red-500/20 text-red-200 px-2 py-1 rounded-full border border-red-400/30">
                중요
              </span>
            )}
          </div>
          
          {/* 요약 */}
          <div 
            className={cn('text-base leading-relaxed', ruleStyle.text)}
            dangerouslySetInnerHTML={{ 
              __html: simpleMarkdownToHtml(parsedAnswer.summary) 
            }}
          />
        </div>
      </div>

      {/* 상세 내용 (요약만 표시하지 않을 때) */}
      {!showSummaryOnly && parsedAnswer.details.length > 0 && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          {parsedAnswer.details.map((section, index) => (
            <AnswerSection key={index} section={section} />
          ))}
        </div>
      )}

      {/* 예시 */}
      {!showSummaryOnly && parsedAnswer.examples.length > 0 && (
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-sm font-semibold text-amber-200 mb-3 flex items-center gap-2">
            <span>📝</span>
            예시
          </h4>
          <div className="space-y-2">
            {parsedAnswer.examples.map((example, index) => (
              <div 
                key={index}
                className="text-sm text-amber-100/90 bg-black/20 rounded-lg p-3 border border-white/10"
              >
                <span className="text-amber-300 font-medium">• </span>
                {example}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnswerSection({ section }: { section: AnswerSection }) {
  const sectionStyle = ruleTypeStyles[section.type];
  
  return (
    <div className={cn(
      'rounded-lg p-4 border',
      sectionStyle.border,
      sectionStyle.bg
    )}>
      <h4 className={cn('font-semibold mb-2 flex items-center gap-2', sectionStyle.text)}>
        <span className="text-lg">{sectionStyle.icon}</span>
        {section.title}
      </h4>
      <div 
        className={cn('text-sm leading-relaxed', sectionStyle.text, 'opacity-90')}
        dangerouslySetInnerHTML={{ 
          __html: simpleMarkdownToHtml(section.content) 
        }}
      />
    </div>
  );
}
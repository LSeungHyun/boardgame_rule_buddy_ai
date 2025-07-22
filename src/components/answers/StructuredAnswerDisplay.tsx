/**
 * structured_display 타입의 응답을 렌더링하는 컴포넌트
 * 복잡한 구조화된 답변을 시각적으로 표현합니다.
 */

'use client';

import React from 'react';
import { IconMapper } from '@/components/shared/IconMapper';
import { STYLE_CLASSES } from '@/lib/constants';

interface Subsection {
  icon_name: string;
  title: string;
  content: string;
}

interface Section {
  number: string;
  title: string;
  icon_name: string;
  content: string;
  subsections?: Subsection[];
}

interface StructuredDisplayData {
  title: string;
  sections: Section[];
}

interface StructuredAnswerDisplayProps {
  /** structured_display 타입의 data 객체 */
  data: StructuredDisplayData;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 구조화된 답변을 계층적으로 렌더링합니다.
 * 섹션과 서브섹션을 시각적으로 구분하여 표시합니다.
 */
export function StructuredAnswerDisplay({ data, className = '' }: StructuredAnswerDisplayProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 메인 타이틀 */}
      <div className="mb-6">
        <h2 className={`text-lg font-bold ${STYLE_CLASSES.TEXT_AMBER} leading-relaxed`}>
          {data.title}
        </h2>
      </div>

      {/* 섹션들 */}
      <div className="space-y-5">
        {data.sections.map((section, sectionIndex) => (
          <div 
            key={sectionIndex}
            className={`${STYLE_CLASSES.GLASS_CARD} p-4 rounded-xl ${STYLE_CLASSES.BORDER_AMBER} bg-amber-950/10`}
          >
            {/* 섹션 헤더 */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-amber-400 font-bold text-sm">
                  {section.number}
                </span>
                <IconMapper 
                  iconName={section.icon_name} 
                  size={18} 
                  className="text-amber-400" 
                />
              </div>
              <h3 className={`font-semibold ${STYLE_CLASSES.TEXT_AMBER} text-base leading-relaxed`}>
                {section.title}
              </h3>
            </div>

            {/* 섹션 내용 */}
            <div className={`${STYLE_CLASSES.TEXT_AMBER} text-sm leading-relaxed mb-4 ml-8`}>
              {section.content}
            </div>

            {/* 서브섹션들 */}
            {section.subsections && section.subsections.length > 0 && (
              <div className="ml-8 space-y-3">
                {section.subsections.map((subsection, subsectionIndex) => (
                  <div 
                    key={subsectionIndex}
                    className="bg-amber-900/20 p-3 rounded-lg border border-amber-400/10"
                  >
                    {/* 서브섹션 헤더 */}
                    <div className="flex items-start gap-2 mb-2">
                      <IconMapper 
                        iconName={subsection.icon_name} 
                        size={16} 
                        className="text-amber-300 flex-shrink-0 mt-0.5" 
                      />
                      <h4 className="font-medium text-amber-200 text-sm leading-relaxed">
                        {subsection.title}
                      </h4>
                    </div>

                    {/* 서브섹션 내용 */}
                    <div className="text-amber-100/90 text-sm leading-relaxed ml-6">
                      {subsection.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
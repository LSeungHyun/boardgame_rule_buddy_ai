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
 * 마크다운 텍스트를 파싱하여 구조화된 섹션으로 분리하는 함수 (완전 재설계)
 * 모든 내용을 보존하면서 완벽한 섹션 구조 생성
 */
function parseSetupContent(content: string) {
  const result = {
    title: '',
    sections: [] as Array<{
      title: string;
      content: string;
      type: 'component' | 'setup' | 'rule' | 'tip';
      items: string[];
    }>
  };

  // 📝 제목 추출 (헤더만 인식, 일반 텍스트는 제목으로 만들지 않음)
  const titleMatch = content.match(/^#{1,4}\s+(.+)$/m);
  if (titleMatch) {
    result.title = titleMatch[1].trim().replace(/[:#]*$/, '').trim();
  }

  // 🎯 핵심 수정: 마크다운 헤더가 없는 경우의 완전한 내용 보존 파싱
  if (!content.includes('###') && !content.includes('####')) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    // 제목이 있다면 제목 라인 제거
    let contentLines = lines;
    if (result.title) {
      contentLines = lines.filter(line => !line.includes(result.title));
    }

    const items: string[] = [];
    let i = 0;

    while (i < contentLines.length) {
      const line = contentLines[i];
      
      // 번호가 있는 라인 감지 (1., 2., 3. 등)
      const numberedMatch = line.match(/^(\d+)\.\s*(.*)$/);
      
      if (numberedMatch) {
        let fullContent = numberedMatch[2]; // 번호 뒤의 내용 시작
        let nextIndex = i + 1;
        
        // 다음 번호나 헤더가 나올 때까지 모든 연속 라인을 수집
        while (nextIndex < contentLines.length) {
          const nextLine = contentLines[nextIndex];
          
          // 다음 번호 라인이나 헤더를 만나면 중단
          if (nextLine.match(/^\d+\./) || nextLine.match(/^#{1,4}\s/)) {
            break;
          }
          
          // 연속 라인을 현재 아이템에 추가
          fullContent += ' ' + nextLine;
          nextIndex++;
        }
        
        // 완전한 내용을 아이템으로 추가
        if (fullContent.trim()) {
          items.push(fullContent.trim());
        }
        
        // 다음 번호 라인으로 이동
        i = nextIndex;
      } else {
        // 번호가 없는 라인은 건너뛰기 (제목이나 일반 텍스트)
        i++;
      }
    }

    // 🔥 번호가 있는 아이템들이 있으면 섹션 생성
    if (items.length > 0) {
      result.sections.push({
        title: '게임 준비 단계',
        content: '',
        type: 'setup',
        items: items
      });
    } else {
      // 번호가 없지만 단계 관련 키워드가 있는 경우
      const stepKeywords = ['단계', '순서', '먼저', '다음', '마지막', '절차', '과정'];
      const stepLines = contentLines.filter(line => 
        stepKeywords.some(keyword => line.includes(keyword))
      );

      if (stepLines.length > 0) {
        result.sections.push({
          title: '게임 준비 과정',
          content: '',
          type: 'setup',
          items: stepLines
        });
      } else {
        // 일반 텍스트를 단일 섹션으로 처리
        const allContent = contentLines.join(' ');
        if (allContent.trim()) {
          result.sections.push({
            title: result.title || '게임 셋업 가이드',
            content: allContent,
            type: 'setup',
            items: []
          });
        }
      }
    }
    
    // 제목이 없었다면 기본 제목 설정
    if (!result.title) {
      result.title = '게임 셋업 방법';
    }
    
    return result;
  }

  // 기존 섹션별 분할 로직 (### 헤더 기준) - 기존과 동일
  const sections = content.split(/(?=^#{2,4}\s)/m).filter(section => section.trim());
  
  for (const sectionText of sections) {
    const lines = sectionText.split('\n').filter(line => line.trim());
    if (lines.length === 0) continue;

    const firstLine = lines[0].trim();
    
    // 섹션 헤더 확인 (더 유연한 헤더 감지)
    const headerMatch = firstLine.match(/^#{2,4}\s+(.+)$/);
    if (headerMatch) {
      const title = headerMatch[1].trim();
      
      // 🎨 향상된 섹션 타입 결정 로직
      let type: 'component' | 'setup' | 'rule' | 'tip' = 'setup';
      const titleLower = title.toLowerCase();
      
      if (titleLower.includes('구성요소') || titleLower.includes('준비물') || titleLower.includes('컴포넌트') || 
          titleLower.includes('카드') || titleLower.includes('토큰') || titleLower.includes('타일') ||
          titleLower.includes('보드') || titleLower.includes('말') || titleLower.includes('피스')) {
        type = 'component';
      } else if (titleLower.includes('규칙') || titleLower.includes('주의') || titleLower.includes('특별') || 
                 titleLower.includes('중요') || titleLower.includes('금지') || titleLower.includes('불가')) {
        type = 'rule';
      } else if (titleLower.includes('팁') || titleLower.includes('참고') || titleLower.includes('도움말') || 
                 titleLower.includes('추천') || titleLower.includes('조언') || titleLower.includes('힌트')) {
        type = 'tip';
      }

      // 섹션 내용과 아이템 추출 (더 정교한 로직)
      const contentLines: string[] = [];
      const items: string[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 🔧 리스트 아이템 처리 (더 포괄적인 패턴)
        if (line.match(/^[-*+•]\s/) || line.match(/^\d+\.\s/) || 
            line.match(/^[가-힣]\.\s/) || line.match(/^[ㄱ-ㅎ]\)\s/) ||
            line.startsWith('→') || line.startsWith('·')) {
          const item = line.replace(/^[-*+•→·]\s*/, '')
                          .replace(/^\d+\.\s*/, '')
                          .replace(/^[가-힣]\.\s*/, '')
                          .replace(/^[ㄱ-ㅎ]\)\s*/, '')
                          .trim();
          if (item) items.push(item);
        }
        // 일반 텍스트 (헤더가 아닌 경우)
        else if (line && !line.match(/^#{1,4}\s/)) {
          contentLines.push(line);
        }
      }

      result.sections.push({
        title,
        content: contentLines.join(' ').trim(),
        type,
        items
      });
    }
  }

  // 📋 섹션이 비어있는 경우 기본 섹션 생성
  if (result.sections.length === 0) {
    const cleanContent = content.replace(/^#{1,4}\s+.+$/m, '').trim();
    if (cleanContent) {
      result.sections.push({
        title: result.title || '게임 셋업 가이드',
        content: cleanContent,
        type: 'setup',
        items: []
      });
    }
  }

  return result;
}

/**
 * 텍스트에 기본적인 마크다운 서식을 적용하여 HTML로 변환 (안전하고 단순한 버전)
 * HTML 태그 균형을 보장하고 안전한 렌더링 제공
 */
function renderMarkdownText(text: string): string {
  return text
    // 기본 마크다운 서식만 적용 - 안전하고 간단한 규칙들
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 줄바꿈만 처리
    .replace(/\n/g, '<br class="mb-2">');
}

/**
 * 게임 용어와 숫자를 자동으로 강조하는 안전한 텍스트 처리
 * 복잡한 정규식 대신 단순한 단어 강조만 적용
 */
function enhanceGameTerms(text: string): string {
  // 게임 용어들을 안전하게 강조 (단어 경계를 사용해서 안전하게)
  const gameTerms = ['토큰', '카드', '타일', '보드', '말', '피스', '마커', '주사위', '덱'];
  const actionTerms = ['배치', '놓기', '섞기', '뽑기', '분배', '준비', '설치', '제거'];
  
  let result = text;
  
  // 게임 용어 강조
  gameTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'g');
    result = result.replace(regex, `<span class="text-blue-300 font-medium">${term}</span>`);
  });
  
  // 액션 용어 강조
  actionTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'g');
    result = result.replace(regex, `<span class="text-green-300 font-medium">${term}</span>`);
  });
  
  // 플레이어 수 강조 (안전한 방식)
  result = result.replace(/(\d+)명/g, '<span class="text-purple-300 font-bold">$1명</span>');
  
  return result;
}

/**
 * 섹션 타입별 스타일 정의 - 단순화된 버전
 */
const sectionStyles = {
  component: {
    borderColor: 'border-blue-400/40',
    bgColor: 'bg-blue-950/15',
    textColor: 'setup-text-component',
    headerBg: 'bg-blue-900/20',
    accentColor: 'text-blue-300',
    icon: '🎲'
  },
  setup: {
    borderColor: 'border-emerald-400/40',
    bgColor: 'bg-emerald-950/15',
    textColor: 'setup-text-setup',
    headerBg: 'bg-emerald-900/20',
    accentColor: 'text-emerald-300',
    icon: '⚙️'
  },
  rule: {
    borderColor: 'border-orange-400/40',
    bgColor: 'bg-orange-950/15',
    textColor: 'setup-text-rule',
    headerBg: 'bg-orange-900/20',
    accentColor: 'text-orange-300',
    icon: '⚠️'
  },
  tip: {
    borderColor: 'border-purple-400/40',
    bgColor: 'bg-purple-950/15',
    textColor: 'setup-text-tip',
    headerBg: 'bg-purple-900/20',
    accentColor: 'text-purple-300',
    icon: '💡'
  }
};

/**
 * 게임 준비 가이드를 마크다운으로 받아서 최고 가독성의 UI로 렌더링하는 컴포넌트 (완전 리팩토링)
 */
const SetupGuideDisplay: React.FC<SetupGuideDisplayProps> = ({ content, className }) => {
  // 빈 콘텐츠 처리
  if (!content || content.trim() === '') {
    return null;
  }

  const parsedContent = parseSetupContent(content);

  return (
    <div className={cn(
      'glass-card rounded-2xl p-8 space-y-8',
      STYLE_CLASSES.BORDER_AMBER,
      'bg-gradient-to-br from-amber-950/10 to-amber-900/5',
      'ring-1 ring-amber-400/20 shadow-xl shadow-amber-500/5',
      className
    )}>
      {/* 헤더 섹션 - 대폭 개선된 타이포그래피 */}
      <div className="flex items-start gap-6 pb-8 border-b border-amber-400/20">
        <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-amber-500/20 flex items-center justify-center ring-2 ring-amber-400/30">
          <span className="text-4xl">📋</span>
        </div>
        <div className="flex-1 min-w-0">
          {parsedContent.title && (
            <h2 className={cn(
              'setup-heading-primary',
              STYLE_CLASSES.TEXT_AMBER,
              'mb-3'
            )}>
              {parsedContent.title}
            </h2>
          )}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-amber-500/20 text-amber-200 border border-amber-400/30">
              🎯 게임 셋업 가이드
            </span>
          </div>
        </div>
      </div>

      {/* 섹션들 - 완전히 새로운 디자인 */}
      {parsedContent.sections.length > 0 && (
        <div className="space-y-8">
          {parsedContent.sections.map((section, index) => {
            const style = sectionStyles[section.type];
            
            return (
              <div
                key={index}
                className={cn(
                  'rounded-2xl overflow-hidden border-2 transition-all duration-300',
                  style.borderColor,
                  'hover:shadow-lg hover:scale-[1.01] transform-gpu',
                  'bg-gradient-to-br from-white/5 to-transparent'
                )}
              >
                {/* 섹션 헤더 */}
                <div className={cn(
                  'px-8 py-6 border-b border-current/15',
                  style.headerBg
                )}>
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-current/20 flex items-center justify-center">
                      <span className="text-2xl">{style.icon}</span>
                    </div>
                    <h3 className={cn(
                      'setup-heading-secondary',
                      style.accentColor
                    )}>
                      {section.title}
                    </h3>
                  </div>
                </div>

                {/* 섹션 내용 */}
                <div className={cn('p-8', style.bgColor)}>
                  {/* 섹션 설명 */}
                  {section.content && (
                    <div className={cn(
                      'setup-text-enhanced mb-8',
                      style.textColor
                    )}>
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: enhanceGameTerms(renderMarkdownText(section.content))
                        }}
                      />
                    </div>
                  )}

                  {/* 아이템 리스트 */}
                  {section.items.length > 0 && (
                    <div className="space-y-6">
                      {section.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-start gap-4 group">
                          <div className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1',
                            'bg-current/20 border-2 border-current/30 group-hover:scale-110 transition-transform'
                          )}>
                            <span className={cn('text-sm font-bold', style.accentColor)}>
                              {itemIndex + 1}
                            </span>
                          </div>
                          <div className={cn(
                            'flex-1 setup-text-enhanced',
                            style.textColor,
                            'min-w-0'
                          )}>
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: enhanceGameTerms(renderMarkdownText(item))
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 섹션이 없는 경우 - 폴백 렌더링 */}
      {parsedContent.sections.length === 0 && (
        <div className={cn(
          'setup-text-enhanced p-8 rounded-xl',
          'bg-amber-950/20 border border-amber-400/20',
          STYLE_CLASSES.TEXT_AMBER
        )}>
          <div 
            dangerouslySetInnerHTML={{ 
              __html: enhanceGameTerms(renderMarkdownText(content.replace(/#{1,4}\s/g, '').trim()))
            }}
          />
        </div>
      )}

      {/* 하단 완료 안내 */}
      <div className="border-t border-amber-400/20 pt-8 mt-8">
        <div className="flex items-center justify-center gap-3 text-amber-200/80">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="setup-text-base font-medium">게임 준비를 완료하고 플레이를 시작하세요!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupGuideDisplay;
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Game } from '@/types/game';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  question: string;
  description: string;
  category: 'setup' | 'rules' | 'scoring' | 'strategy' | 'general';
}

interface GameQuickActionsProps {
  game: Game;
  onActionClick: (question: string) => void;
  className?: string;
}

// 기본 퀵 액션들 (모든 게임에 공통) - 2개로 축소
const defaultQuickActions: QuickAction[] = [
  {
    id: 'game-overview',
    label: '게임 요약',
    icon: '🎯',
    question: '[FORCE_RESEARCH] 이 게임의 기본 규칙과 목표를 간단히 설명해주세요.',
    description: '게임의 전체적인 개요',
    category: 'general'
  },
  {
    id: 'setup-guide',
    label: '셋업 가이드',
    icon: '⚙️',
    question: '[FORCE_RESEARCH] 게임 셋업 방법을 단계별로 알려주세요.',
    description: '게임 준비 과정',
    category: 'setup'
  }
];

// 게임별 특화 액션 제거됨 - 기본 3개 버튼만 사용

const categoryStyles = {
  setup: {
    bg: 'bg-green-500/10 hover:bg-green-500/20',
    border: 'border-green-400/40 hover:border-green-400/60',
    text: 'text-green-100',
    shadow: 'hover:shadow-green-500/20'
  },
  rules: {
    bg: 'bg-blue-500/10 hover:bg-blue-500/20',
    border: 'border-blue-400/40 hover:border-blue-400/60',
    text: 'text-blue-100',
    shadow: 'hover:shadow-blue-500/20'
  },
  scoring: {
    bg: 'bg-red-500/10 hover:bg-red-500/20',
    border: 'border-red-400/40 hover:border-red-400/60',
    text: 'text-red-100',
    shadow: 'hover:shadow-red-500/20'
  },
  strategy: {
    bg: 'bg-purple-500/10 hover:bg-purple-500/20',
    border: 'border-purple-400/40 hover:border-purple-400/60',
    text: 'text-purple-100',
    shadow: 'hover:shadow-purple-500/20'
  },
  general: {
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    border: 'border-amber-400/40 hover:border-amber-400/60',
    text: 'text-amber-100',
    shadow: 'hover:shadow-amber-500/20'
  }
};

export function GameQuickActions({ game, onActionClick, className }: GameQuickActionsProps) {
  // 기본 3개 액션만 사용 (게임별 특화 액션 제거)
  const displayActions = defaultQuickActions;

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      <div className="mb-4 text-center">
        <h3 className="text-sm font-medium text-amber-300/80 mb-1">
          빠른 질문
        </h3>
        <p className="text-xs text-amber-400/60">
          궁금한 내용을 바로 물어보세요
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {displayActions.map((action) => {
          const style = categoryStyles[action.category];

          return (
            <button
              key={action.id}
              onClick={() => onActionClick(action.question)}
              className={cn(
                'group relative p-4 rounded-xl border transition-all duration-200',
                'min-h-[80px] flex flex-col items-center justify-center text-center',
                'touch-manipulation active:scale-95',
                style.bg,
                style.border,
                style.text,
                `hover:shadow-lg ${style.shadow}`
              )}
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">
                {action.icon}
              </span>
              <span className="text-sm font-medium leading-tight mb-1">
                {action.label}
              </span>
              <span className="text-xs opacity-70 leading-tight">
                {action.description}
              </span>

              {/* 호버 효과 */}
              <div className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-amber-400/50">
          또는 아래에 직접 질문을 입력하세요
        </p>
      </div>
    </div>
  );
}
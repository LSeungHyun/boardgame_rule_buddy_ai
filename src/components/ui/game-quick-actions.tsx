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

// 기본 퀵 액션들 (모든 게임에 공통)
const defaultQuickActions: QuickAction[] = [
  {
    id: 'game-overview',
    label: '게임 요약',
    icon: '🎯',
    question: '이 게임의 기본 규칙과 목표를 간단히 설명해주세요.',
    description: '게임의 전체적인 개요',
    category: 'general'
  },
  {
    id: 'setup-guide',
    label: '셋업 가이드',
    icon: '⚙️',
    question: '게임 셋업 방법을 단계별로 알려주세요.',
    description: '게임 준비 과정',
    category: 'setup'
  },
  {
    id: 'scoring-system',
    label: '점수 계산',
    icon: '🧮',
    question: '점수 계산 방법을 자세히 설명해주세요.',
    description: '승리 조건과 점수 체계',
    category: 'scoring'
  },
  {
    id: 'common-rules',
    label: '룰 질문',
    icon: '📖',
    question: '자주 헷갈리는 규칙이나 예외 상황을 알려주세요.',
    description: '흔한 규칙 질문들',
    category: 'rules'
  },
  {
    id: 'strategy-tips',
    label: '전략 코칭',
    icon: '🧠',
    question: '초보자를 위한 기본 전략과 팁을 알려주세요.',
    description: '게임 전략 가이드',
    category: 'strategy'
  }
];

// 게임별 특화 퀵 액션들
const gameSpecificActions: Record<string, QuickAction[]> = {
  'ark-nova': [
    {
      id: 'ark-action-cards',
      label: '액션 카드',
      icon: '🃏',
      question: 'Ark Nova의 액션 카드 사용법과 우선순위를 알려주세요.',
      description: '액션 카드 활용법',
      category: 'rules'
    },
    {
      id: 'ark-conservation',
      label: '보존 프로젝트',
      icon: '🌍',
      question: '보존 프로젝트 카드의 효과와 전략을 설명해주세요.',
      description: '보존 프로젝트 가이드',
      category: 'strategy'
    }
  ],
  'wingspan': [
    {
      id: 'wingspan-birds',
      label: '새 카드',
      icon: '🦅',
      question: 'Wingspan에서 새 카드 배치와 엔진 빌딩 전략을 알려주세요.',
      description: '새 카드 전략',
      category: 'strategy'
    },
    {
      id: 'wingspan-eggs',
      label: '알 놓기',
      icon: '🥚',
      question: '알 놓기 액션과 관련된 규칙을 자세히 설명해주세요.',
      description: '알 놓기 규칙',
      category: 'rules'
    }
  ],
  'terraforming-mars': [
    {
      id: 'tm-corporations',
      label: '기업 카드',
      icon: '🏢',
      question: 'Terraforming Mars의 기업 카드 선택 전략을 알려주세요.',
      description: '기업 선택 가이드',
      category: 'strategy'
    },
    {
      id: 'tm-terraforming',
      label: '테라포밍',
      icon: '🌍',
      question: '온도, 산소, 바다 트랙의 테라포밍 규칙을 설명해주세요.',
      description: '테라포밍 시스템',
      category: 'rules'
    }
  ],
  'gloomhaven': [
    {
      id: 'gloomhaven-combat',
      label: '전투 시스템',
      icon: '⚔️',
      question: 'Gloomhaven의 전투 시스템과 카드 사용법을 설명해주세요.',
      description: '전투 규칙',
      category: 'rules'
    },
    {
      id: 'gloomhaven-scenario',
      label: '시나리오 진행',
      icon: '📜',
      question: '시나리오 셋업과 진행 방법을 알려주세요.',
      description: '시나리오 가이드',
      category: 'setup'
    }
  ],
  'spirit-island': [
    {
      id: 'spirit-powers',
      label: '정령 능력',
      icon: '🌟',
      question: 'Spirit Island의 정령 능력과 성장 시스템을 설명해주세요.',
      description: '정령 능력 가이드',
      category: 'rules'
    },
    {
      id: 'spirit-fear',
      label: '공포 시스템',
      icon: '😱',
      question: '공포 카드와 공포 레벨 시스템을 알려주세요.',
      description: '공포 메커니즘',
      category: 'strategy'
    }
  ],
  'brass-birmingham': [
    {
      id: 'brass-canals',
      label: '운하 시대',
      icon: '🚢',
      question: 'Brass Birmingham의 운하 시대 전략과 규칙을 설명해주세요.',
      description: '운하 시대 가이드',
      category: 'strategy'
    },
    {
      id: 'brass-rail',
      label: '철도 시대',
      icon: '🚂',
      question: '철도 시대의 변화점과 전략을 알려주세요.',
      description: '철도 시대 가이드',
      category: 'strategy'
    }
  ]
};

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
  // 게임별 특화 액션과 기본 액션 결합
  const gameKey = game.gameId?.toString().toLowerCase() || game.title.toLowerCase().replace(/\s+/g, '-');
  const specificActions = gameSpecificActions[gameKey] || [];
  const allActions = [...defaultQuickActions, ...specificActions];

  // 최대 6개까지만 표시 (모바일에서 2x3 그리드)
  const displayActions = allActions.slice(0, 6);

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
      
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
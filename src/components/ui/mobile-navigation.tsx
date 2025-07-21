'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MobileNavigationProps {
  currentPage: 'selection' | 'chat' | 'debug';
  onPageChange: (page: 'selection' | 'chat' | 'debug') => void;
  disabled?: boolean;
  className?: string;
}

interface NavItem {
  id: 'selection' | 'chat' | 'debug';
  label: string;
  icon: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: 'selection',
    label: '게임 선택',
    icon: '🎲',
    description: '게임을 검색하고 선택하세요'
  },
  {
    id: 'chat',
    label: '룰 마스터',
    icon: '💬',
    description: '게임 규칙을 물어보세요'
  },
  {
    id: 'debug',
    label: '디버그',
    icon: '🔧',
    description: '번역 디버거'
  }
];

export function MobileNavigation({ 
  currentPage, 
  onPageChange, 
  disabled = false,
  className 
}: MobileNavigationProps) {
  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-50 glass-chat border-t border-amber-400/30 backdrop-blur-md',
      'safe-area-inset-bottom', // iOS safe area support
      className
    )}>
      <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const isDisabled = disabled || (item.id === 'chat' && currentPage !== 'chat');
          
          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && onPageChange(item.id)}
              disabled={isDisabled}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200',
                'min-w-[60px] min-h-[60px] touch-manipulation', // 터치 최적화
                isActive 
                  ? 'bg-amber-500/20 text-yellow-300 scale-105' 
                  : 'text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/10',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
              aria-label={item.description}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-xs font-medium leading-tight text-center">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
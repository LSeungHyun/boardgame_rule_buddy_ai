import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export function Skeleton({ className, children, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-white/10',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// 게임 카드 스켈레톤
export function GameCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      'glass-card rounded-xl p-4 min-h-[80px] flex items-center',
      className
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
        <div className="flex-1">
          <Skeleton className="h-5 sm:h-6 mb-2 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 rounded-full w-16" />
          <Skeleton className="h-4 w-12 hidden sm:block" />
        </div>
      </div>
    </div>
  );
}

// 채팅 메시지 스켈레톤
export function ChatMessageSkeleton({ 
  isUser = false, 
  className 
}: { 
  isUser?: boolean; 
  className?: string; 
}) {
  return (
    <div className={cn(
      'flex',
      isUser ? 'justify-end' : 'justify-start',
      className
    )}>
      <div className={cn(
        'glass-card rounded-2xl px-4 py-3 max-w-xs sm:max-w-md shadow-lg',
        isUser 
          ? 'border border-amber-400/40' 
          : 'border border-amber-400/40'
      )}>
        <Skeleton className="h-4 mb-2 w-full" />
        <Skeleton className="h-4 mb-2 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  );
}

// 검색바 스켈레톤
export function SearchBarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Skeleton className="w-full h-12 md:h-14 rounded-xl" />
      <div className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2">
        <Skeleton className="w-5 h-5 rounded-full" />
      </div>
    </div>
  );
}

// 헤더 스켈레톤
export function HeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('text-center mb-8 md:mb-12', className)}>
      <Skeleton className="h-8 sm:h-10 md:h-12 mb-4 w-3/4 mx-auto" />
      <Skeleton className="h-5 sm:h-6 mb-2 w-2/3 mx-auto" />
      <Skeleton className="h-4 sm:h-5 w-1/2 mx-auto" />
    </div>
  );
}
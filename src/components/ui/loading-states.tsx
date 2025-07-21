import React from 'react';
import { ResponsiveContainer } from './responsive-container';
import { 
  Skeleton, 
  GameCardSkeleton, 
  ChatMessageSkeleton, 
  SearchBarSkeleton, 
  HeaderSkeleton 
} from './skeleton';

// 게임 선택 페이지 로딩 상태
export function GameSelectionLoading() {
  return (
    <ResponsiveContainer maxWidth="xl" padding="md" className="min-h-screen">
      <HeaderSkeleton />
      
      {/* 검색 섹션 */}
      <div className="mb-6 md:mb-8">
        <SearchBarSkeleton className="mb-4 md:mb-6" />
      </div>

      {/* 게임 카드 스켈레톤 */}
      <div className="space-y-3">
        {[...Array(5)].map((_, index) => (
          <GameCardSkeleton key={index} />
        ))}
      </div>
    </ResponsiveContainer>
  );
}

// 채팅 화면 로딩 상태
export function ChatScreenLoading({ gameTitle }: { gameTitle?: string }) {
  return (
    <div className="flex flex-col h-screen pb-20 md:pb-0">
      {/* 헤더 스켈레톤 */}
      <header className="glass-chat border-b border-amber-400/30 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between p-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="text-center">
            {gameTitle ? (
              <>
                <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent drop-shadow-sm">
                  📖 {gameTitle}
                </h2>
                <p className="text-xs text-amber-300/80 font-medium">룰 마스터</p>
              </>
            ) : (
              <>
                <Skeleton className="h-6 w-32 mb-1 mx-auto" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </>
            )}
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      {/* 메시지 스켈레톤 */}
      <main className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
        <ChatMessageSkeleton isUser={false} />
        <ChatMessageSkeleton isUser={true} />
        <ChatMessageSkeleton isUser={false} />
      </main>

      {/* 입력 영역 스켈레톤 */}
      <footer className="glass-chat border-t border-amber-400/30 backdrop-blur-md">
        <div className="p-4 flex gap-3">
          <Skeleton className="flex-1 h-12 rounded-xl" />
          <Skeleton className="w-20 h-12 rounded-xl" />
        </div>
      </footer>
    </div>
  );
}

// 디버그 페이지 로딩 상태
export function DebugPageLoading() {
  return (
    <div className="min-h-screen bg-game-table-dark pb-20 md:pb-0">
      <ResponsiveContainer maxWidth="lg" padding="md">
        <Skeleton className="h-12 w-48 mb-6 rounded-lg" />
        
        {/* 디버그 콘텐츠 스켈레톤 */}
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-6">
            <Skeleton className="h-6 w-1/3 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-6">
            <Skeleton className="h-6 w-1/4 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          </div>
        </div>
      </ResponsiveContainer>
    </div>
  );
}

// 범용 페이지 로딩 상태
export function PageLoading({ 
  title, 
  showHeader = true 
}: { 
  title?: string; 
  showHeader?: boolean; 
}) {
  return (
    <div className="min-h-screen bg-game-table-dark pb-20 md:pb-0">
      <ResponsiveContainer maxWidth="lg" padding="md">
        {showHeader && (
          <div className="text-center mb-8">
            {title ? (
              <h1 className="text-2xl sm:text-3xl font-bold text-amber-100 mb-4">
                {title}
              </h1>
            ) : (
              <Skeleton className="h-8 sm:h-10 w-1/2 mx-auto mb-4" />
            )}
          </div>
        )}
        
        <div className="space-y-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="glass-card rounded-xl p-6">
              <Skeleton className="h-6 w-1/3 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </ResponsiveContainer>
    </div>
  );
}
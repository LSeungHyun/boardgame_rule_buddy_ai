import React, { Suspense } from 'react';
import { 
  GameSelectionLoading, 
  ChatScreenLoading, 
  DebugPageLoading, 
  PageLoading 
} from './loading-states';

interface SuspenseWrapperProps {
  children: React.ReactNode;
  fallback?: 'game-selection' | 'chat' | 'debug' | 'page';
  gameTitle?: string;
  pageTitle?: string;
}

export function SuspenseWrapper({ 
  children, 
  fallback = 'page',
  gameTitle,
  pageTitle
}: SuspenseWrapperProps) {
  const getFallbackComponent = () => {
    switch (fallback) {
      case 'game-selection':
        return <GameSelectionLoading />;
      case 'chat':
        return <ChatScreenLoading gameTitle={gameTitle} />;
      case 'debug':
        return <DebugPageLoading />;
      case 'page':
      default:
        return <PageLoading title={pageTitle} />;
    }
  };

  return (
    <Suspense fallback={getFallbackComponent()}>
      {children}
    </Suspense>
  );
}

// 특화된 Suspense 래퍼들
export function GameSelectionSuspense({ children }: { children: React.ReactNode }) {
  return (
    <SuspenseWrapper fallback="game-selection">
      {children}
    </SuspenseWrapper>
  );
}

export function ChatScreenSuspense({ 
  children, 
  gameTitle 
}: { 
  children: React.ReactNode; 
  gameTitle?: string; 
}) {
  return (
    <SuspenseWrapper fallback="chat" gameTitle={gameTitle}>
      {children}
    </SuspenseWrapper>
  );
}

export function DebugPageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <SuspenseWrapper fallback="debug">
      {children}
    </SuspenseWrapper>
  );
}
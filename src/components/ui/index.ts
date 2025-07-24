/**
 * UI 컴포넌트 통합 내보내기
 * 각 카테고리별 컴포넌트들을 편리하게 사용할 수 있도록 re-export
 */

// 기본 UI 컴포넌트들
export * from './base';

// 게임 관련 UI 컴포넌트들
export * from './game';

// 레이아웃 컴포넌트들
export * from './layout';

// 인터랙티브 컴포넌트들
export * from './interactive';

// 폼 관련 컴포넌트들
export * from './forms';

// 새로 추가된 컴포넌트들
export { GameCategoryFilter, DEFAULT_GAME_CATEGORIES } from './game-category-filter';
export { BetaBanner, UserGuideSection } from './beta-banner';

// 개별 컴포넌트 직접 내보내기
export { Button } from './button';
export { Input } from './input';
export { SendButton } from './send-button';
export { Card, CardHeader, CardContent, CardTitle } from './card';
export { Badge } from './badge';
export { Skeleton, GameCardSkeleton, ChatMessageSkeleton, SearchBarSkeleton, HeaderSkeleton } from './skeleton';
export { ResponsiveContainer } from './responsive-container';
export { MobileNavigation } from './mobile-navigation';
export { GameSelectionLoading, ChatScreenLoading, DebugPageLoading, PageLoading } from './loading-states';
export { SuspenseWrapper } from './suspense-wrapper';
export { GameQuickActions } from './game-quick-actions';
export { InteractiveDiagram } from './interactive-diagram';
export { default as VisualDiagram } from './visual-diagram';
export { default as InteractiveBoardLayout } from './interactive-board-layout';
export { FloatingFeedbackFAB } from './floating-feedback-fab';
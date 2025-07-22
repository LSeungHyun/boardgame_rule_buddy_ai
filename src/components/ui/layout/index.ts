/**
 * 레이아웃 관련 UI 컴포넌트 내보내기
 * 페이지 구조와 네비게이션 컴포넌트들
 */

// 네비게이션 컴포넌트
export { MobileNavigation } from '../mobile-navigation';

// 컨테이너 컴포넌트
export { ResponsiveContainer } from '../responsive-container';

// 로딩 및 상태 컴포넌트
export { LoadingStates } from '../loading-states';
export { 
  GameSelectionSuspense, 
  ChatScreenSuspense, 
  DebugPageSuspense 
} from '../suspense-wrapper';
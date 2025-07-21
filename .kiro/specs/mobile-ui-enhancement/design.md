# Design Document

## Overview

AI 룰 마스터의 모바일 우선 UI/UX 개선을 위한 종합적인 설계입니다. 기존 Next.js 15 + React 19 + Tailwind CSS 스택을 활용하여 5가지 핵심 영역을 개선합니다:

1. **모바일 반응형 UI**: 기존 UI의 모바일 최적화 (순수 UI 개선)
2. **구조화된 답변 시스템**: 기존 답변 표시 방식의 대폭 개선 (UI + 기능 개선)
3. **게임 셋업 가이드**: 완전히 새로운 기능 추가
4. **점수 계산기**: 완전히 새로운 기능 추가  
5. **학습 시스템**: 완전히 새로운 기능 추가

### 개선 범위 상세

#### 기존 기능 개선 (UI/UX 중심)
- **답변 표시**: 현재의 단순 텍스트 답변을 구조화된 3단계 형태로 개선
- **모바일 레이아웃**: 전체 앱의 모바일 반응형 최적화
- **네비게이션**: 기존 데스크톱 중심에서 모바일 친화적으로 변경

#### 완전히 새로운 기능 추가
- **게임 셋업 가이드**: 단계별 게임 준비 도우미 (새 기능)
- **점수 계산기**: 실시간 점수 계산 및 시뮬레이션 도구 (새 기능)
- **학습 시스템**: 초보자 가이드 및 전략 코칭 (새 기능)

## Architecture

### Component Hierarchy
```
App Layout
├── MobileNavigation (새로운 모바일 네비게이션)
├── ResponsiveContainer (반응형 컨테이너)
├── AnswerDisplay (개선된 답변 표시)
│   ├── AnswerSummary
│   ├── AnswerDetails (Accordion)
│   └── RelatedQuestions
├── GameSetupGuide (새로운 셋업 가이드)
│   ├── SetupChecklist
│   ├── PlayerCountSelector
│   └── VisualDiagram
├── ScoreCalculator (새로운 점수 계산기)
│   ├── ScoreInput
│   ├── RealTimeCalculation
│   └── SimulationMode
└── LearningSystem (새로운 학습 시스템)
    ├── ProgressiveGuide
    ├── TipCards
    └── StrategySimulator
```

### State Management Strategy
- **Zustand Stores**: 각 기능별 독립적인 상태 관리
  - `useMobileUIStore`: 모바일 UI 상태 (네비게이션, 테마)
  - `useAnswerStore`: 답변 표시 상태 (접힘/펼침, 하이라이트)
  - `useSetupGuideStore`: 셋업 가이드 진행 상태
  - `useScoreCalculatorStore`: 점수 계산 상태
  - `useLearningStore`: 학습 진행 상태

## Components and Interfaces

### 1. Mobile Responsive System

#### MobileNavigation Component
```typescript
interface MobileNavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

// 하단 탭바 형태의 네비게이션
// 주요 기능: 홈, 가이드, 계산기, 학습
```

#### ResponsiveContainer Component
```typescript
interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

// Tailwind breakpoints 활용한 반응형 컨테이너
// 모바일: full width, 데스크톱: max-width 제한
```

### 2. Enhanced Answer Display System

#### AnswerDisplay Component
```typescript
interface AnswerDisplayProps {
  answer: {
    summary: string;
    details: string;
    examples?: string[];
    ruleType: 'basic' | 'exception' | 'tip';
    importance: 'low' | 'medium' | 'high';
  };
  relatedQuestions?: string[];
}

// 3단계 구조: 요약 → 상세 → 예시
// 시각적 강조: 색상 코딩, 아이콘
```

#### AccordionSection Component
```typescript
interface AccordionSectionProps {
  title: string;
  content: string;
  isOpen: boolean;
  onToggle: () => void;
  priority: 'high' | 'medium' | 'low';
}

// Framer Motion 애니메이션 적용
// 우선순위별 색상 구분
```

### 3. Interactive Game Setup Guide

#### GameSetupGuide Component
```typescript
interface GameSetupGuideProps {
  gameId: string;
  playerCount: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  image?: string;
  completed: boolean;
  dependencies?: string[];
}
```

#### SetupChecklist Component
```typescript
interface SetupChecklistProps {
  steps: SetupStep[];
  onStepComplete: (stepId: string) => void;
  onAllComplete: () => void;
}

// 진행률 표시 (Progress Bar)
// 단계별 체크 애니메이션
```

### 4. Real-time Score Calculator

#### ScoreCalculator Component
```typescript
interface ScoreCalculatorProps {
  gameId: string;
  gameRules: GameRules;
}

interface ScoreElement {
  id: string;
  name: string;
  value: number;
  category: string;
  description: string;
}

interface CalculationResult {
  totalScore: number;
  breakdown: ScoreElement[];
  suggestions: string[];
}
```

#### SimulationMode Component
```typescript
interface SimulationModeProps {
  currentScore: number;
  possibleActions: Action[];
  onSimulate: (action: Action) => Promise<number>;
}

// "What-if" 시나리오 계산
// 실시간 점수 변화 시각화
```

### 5. Progressive Learning System

#### LearningSystem Component
```typescript
interface LearningSystemProps {
  gameId: string;
  userLevel: 'beginner' | 'intermediate' | 'advanced';
}

interface LearningPath {
  level: string;
  modules: LearningModule[];
  progress: number;
}

interface TipCard {
  id: string;
  title: string;
  content: string;
  trigger: 'situation' | 'mistake' | 'strategy';
  priority: number;
}
```

## Data Models

### UI State Models
```typescript
// Mobile UI State
interface MobileUIState {
  isMenuOpen: boolean;
  currentTab: string;
  orientation: 'portrait' | 'landscape';
  theme: 'light' | 'dark';
}

// Answer Display State
interface AnswerState {
  expandedSections: string[];
  highlightedTerms: string[];
  bookmarkedAnswers: string[];
}

// Setup Guide State
interface SetupGuideState {
  currentGame: string;
  playerCount: number;
  completedSteps: string[];
  currentStep: number;
}

// Score Calculator State
interface ScoreCalculatorState {
  gameId: string;
  scoreElements: ScoreElement[];
  totalScore: number;
  history: ScoreHistory[];
  simulationMode: boolean;
}

// Learning System State
interface LearningState {
  currentLevel: string;
  completedModules: string[];
  availableTips: TipCard[];
  progress: Record<string, number>;
}
```

## Error Handling

### Mobile-Specific Error Handling
- **Network Issues**: 오프라인 상태 감지 및 캐시된 데이터 표시
- **Touch Errors**: 잘못된 터치 입력에 대한 피드백
- **Orientation Changes**: 화면 회전 시 상태 보존

### Component Error Boundaries
```typescript
// 각 주요 기능별 Error Boundary
<ErrorBoundary fallback={<MobileErrorFallback />}>
  <AnswerDisplay />
</ErrorBoundary>

<ErrorBoundary fallback={<CalculatorErrorFallback />}>
  <ScoreCalculator />
</ErrorBoundary>
```

### Graceful Degradation
- **JavaScript 비활성화**: 기본 HTML 폼으로 대체
- **느린 네트워크**: 스켈레톤 UI와 점진적 로딩
- **구형 브라우저**: 기본 스타일로 폴백

## Testing Strategy

### Mobile Testing Approach
1. **Responsive Testing**: 다양한 화면 크기에서 레이아웃 검증
2. **Touch Testing**: 터치 이벤트 및 제스처 테스트
3. **Performance Testing**: 모바일 환경에서의 로딩 속도 측정
4. **Accessibility Testing**: 스크린 리더 및 키보드 네비게이션

### Component Testing
```typescript
// 예시: AnswerDisplay 컴포넌트 테스트
describe('AnswerDisplay', () => {
  test('should display summary first', () => {
    // 요약이 먼저 표시되는지 확인
  });
  
  test('should expand details on click', () => {
    // 클릭 시 상세 내용 펼쳐지는지 확인
  });
  
  test('should highlight important rules', () => {
    // 중요 규칙이 강조되는지 확인
  });
});
```

### Integration Testing
- **User Flow Testing**: 전체 사용자 여정 테스트
- **Cross-Component Testing**: 컴포넌트 간 상호작용 검증
- **State Management Testing**: Zustand 스토어 간 데이터 흐름 확인

### Performance Benchmarks
- **First Contentful Paint**: < 1.5초 (모바일)
- **Largest Contentful Paint**: < 2.5초 (모바일)
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

## Implementation Phases

### Phase 1: Mobile Foundation (Week 1-2)
- 반응형 레이아웃 시스템 구축
- 모바일 네비게이션 구현
- 기본 터치 최적화

### Phase 2: Answer Enhancement (Week 3-4)
- 구조화된 답변 표시 시스템
- Accordion 및 하이라이트 기능
- 관련 질문 추천 시스템

### Phase 3: Interactive Features (Week 5-6)
- 게임 셋업 가이드 구현
- 점수 계산기 개발
- 시뮬레이션 모드 추가

### Phase 4: Learning System (Week 7-8)
- 프로그레시브 학습 시스템
- 팁 카드 및 전략 가이드
- 사용자 진행 상황 추적

### Phase 5: Polish & Optimization (Week 9-10)
- 성능 최적화
- 접근성 개선
- 사용자 테스트 및 피드백 반영
# Components 폴더 구조

이 폴더는 AI 룰 마스터 프로젝트의 모든 React 컴포넌트를 체계적으로 정리한 구조입니다.

## 📁 폴더 구조

### `/ui` - UI 컴포넌트
기본 UI 컴포넌트들을 기능별로 분류하여 관리합니다.

#### `/ui/base` - 기본 UI 컴포넌트
- `button`, `input`, `card`, `badge` 등 Shadcn UI 기반 기본 컴포넌트
- 프로젝트 전반에서 재사용되는 기본 UI 요소들

#### `/ui/game` - 게임 관련 UI 컴포넌트
- `GameQuickActions` - 게임별 빠른 액션 버튼
- `ScoreCalculator` - 점수 계산 컴포넌트
- `QuestionRecommendations` - 질문 추천 시스템
- `AnswerDisplay` - 답변 표시 컴포넌트

#### `/ui/layout` - 레이아웃 컴포넌트
- `MobileNavigation` - 모바일 네비게이션
- `ResponsiveContainer` - 반응형 컨테이너
- `LoadingStates` - 로딩 상태 컴포넌트
- `SuspenseWrapper` - 서스펜스 래퍼

#### `/ui/interactive` - 인터랙티브 컴포넌트
- `InteractiveDiagram` - 인터랙티브 다이어그램
- `VisualDiagram` - 시각적 다이어그램
- `InteractiveBoardLayout` - 보드 레이아웃

#### `/ui/forms` - 폼 관련 컴포넌트
- `Form` - 폼 처리 컴포넌트
- `FileUpload` - 파일 업로드 컴포넌트

### `/chat` - 채팅 관련 컴포넌트
- `ChatScreen` - 메인 채팅 화면
- `ChatMessage` - 채팅 메시지 컴포넌트
- `FeedbackButtons` - 피드백 버튼
- `ResearchStatus` - 리서치 상태 표시

### `/game` - 게임 관련 컴포넌트
- `GameSelection` - 게임 선택 화면

### `/answers` - 답변 처리 컴포넌트
- `AnswerRenderer` - 답변 렌더링
- `SetupGuideDisplay` - 셋업 가이드 표시
- `SimpleChatDisplay` - 간단한 채팅 표시
- `StructuredAnswerDisplay` - 구조화된 답변 표시
- `ScoringGuideHost` - 점수 가이드 호스트
- `ScoreSummaryDisplay` - 점수 요약 표시

### `/game-setup` - 게임 셋업 컴포넌트
- `visual-setup-guide` - 시각적 셋업 가이드

### `/shared` - 공유 컴포넌트
- `IconMapper` - 아이콘 매핑 유틸리티

### `/tools` - 도구 및 유틸리티 컴포넌트
- `TranslationDebugger` - 번역 디버거
- `RuleMasterChat` - 룰 마스터 채팅
- `StagewiseToolbarWrapper` - 단계별 툴바 래퍼

## 🚀 사용 방법

### 기본 사용법
```typescript
// 기본 UI 컴포넌트 사용
import { Button, Card, Badge } from '@/components/ui/base';

// 게임 관련 컴포넌트 사용
import { GameQuickActions, ScoreCalculator } from '@/components/ui/game';

// 채팅 컴포넌트 사용
import { ChatScreen, ChatMessage } from '@/components/chat';
```

### 통합 import
```typescript
// 모든 UI 컴포넌트를 한번에 import
import { Button, GameQuickActions, MobileNavigation } from '@/components/ui';

// 특정 카테고리의 모든 컴포넌트 import
import * as ChatComponents from '@/components/chat';
import * as GameComponents from '@/components/game';
```

## 📋 현재 활성화된 기능

### ✅ 활성화된 기능
- **게임 요약** - 게임의 기본 규칙과 목표 설명
- **셋업 가이드** - 게임 준비 과정 단계별 안내
- 채팅 기반 질문 답변 시스템
- 리서치 기반 답변 생성
- 피드백 시스템
- 모바일 반응형 UI

### ❌ 비활성화된 기능
- **전략 코칭 모드** - 다단계 전략 가이드 (제거됨)
- 점수 계산 가이드 (일부 컴포넌트는 유지)

## 🔧 개발 가이드라인

### 새 컴포넌트 추가 시
1. 적절한 카테고리 폴더에 컴포넌트 생성
2. 해당 폴더의 `index.ts`에 export 추가
3. TypeScript 타입 정의 포함
4. 한국어 주석 작성

### 컴포넌트 명명 규칙
- **PascalCase** 사용 (예: `GameQuickActions`)
- 기능을 명확히 나타내는 이름 사용
- 파일명과 컴포넌트명 일치

### 폴더 구조 원칙
- 기능별 분류 우선
- 재사용성 고려
- 의존성 최소화
- 명확한 책임 분리

이 구조를 통해 프로젝트의 컴포넌트들을 체계적으로 관리하고, 개발 효율성을 높일 수 있습니다.
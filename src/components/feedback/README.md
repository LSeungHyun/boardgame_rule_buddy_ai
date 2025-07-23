# MVP 피드백 시스템 사용 가이드

## 개요

MVP 피드백 시스템은 앱 전체에서 사용자 피드백을 쉽게 수집할 수 있는 통합 솔루션입니다. 기존의 복잡한 피드백 시스템과 별도로 운영되며, 단순하고 재사용 가능하도록 설계되었습니다.

## 구성 요소

### 1. 데이터베이스 테이블
- **테이블명**: `user_feedback`
- **마이그레이션**: `supabase/migrations/20240723000000_create_feedback_mvp.sql`

### 2. API 엔드포인트
- **경로**: `/api/feedback/mvp`
- **파일**: `src/app/api/feedback/mvp/route.ts`

### 3. 프론트엔드 컴포넌트
- **컴포넌트**: `FeedbackModal`
- **훅**: `useFeedbackModal`
- **파일**: `src/components/feedback/FeedbackModal.tsx`

## 사용법

### 기본 사용 예제

```tsx
import { useFeedbackModal } from '@/components/feedback/FeedbackModal';

function GameSearchPage() {
  const { showFeedback, FeedbackModalComponent } = useFeedbackModal();

  const handleGameNotFound = () => {
    showFeedback('game_not_found', {
      searchTerm: '스플렌더',
      userId: 'user123',
      timestamp: new Date().toISOString()
    });
  };

  const handleAnswerUnhelpful = () => {
    showFeedback(
      'answer_unhelpful',
      { questionId: 'q456', gameId: 'splendor' },
      '답변이 도움이 되지 않았나요?',
      '더 정확한 답변을 제공할 수 있도록 어떤 부분이 부족했는지 알려주세요.'
    );
  };

  return (
    <div>
      <button onClick={handleGameNotFound}>
        게임을 찾을 수 없음
      </button>
      
      <button onClick={handleAnswerUnhelpful}>
        답변이 부정확함
      </button>

      {/* 피드백 모달 렌더링 */}
      {FeedbackModalComponent}
    </div>
  );
}
```

### 직접 컴포넌트 사용

```tsx
import FeedbackModal from '@/components/feedback/FeedbackModal';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <button onClick={() => setShowModal(true)}>
        피드백 보내기
      </button>

      <FeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        feedbackSource="ui_issue"
        context={{ page: 'home', section: 'game-list' }}
        title="UI 문제 신고"
        description="화면 표시에 문제가 있나요?"
      />
    </div>
  );
}
```

## API 사용법

### 피드백 제출

```typescript
const submitFeedback = async () => {
  const response = await fetch('/api/feedback/mvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feedback_source: 'game_not_found',
      content: '스플렌더 게임을 검색했는데 나오지 않습니다.',
      context: {
        searchTerm: '스플렌더',
        resultCount: 0,
        timestamp: new Date().toISOString()
      }
    })
  });

  const result = await response.json();
  console.log('피드백 제출 결과:', result);
};
```

### API 상태 확인

```typescript
const checkApiStatus = async () => {
  const response = await fetch('/api/feedback/mvp');
  const result = await response.json();
  console.log('API 상태:', result);
};
```

## 피드백 소스 예시

권장되는 `feedback_source` 값들:

- `game_not_found`: 게임 검색 결과 없음
- `answer_unhelpful`: AI 답변이 도움되지 않음
- `answer_incorrect`: AI 답변이 부정확함
- `ui_issue`: UI/UX 문제
- `performance_issue`: 성능 문제
- `feature_request`: 기능 요청
- `bug_report`: 버그 신고
- `general_feedback`: 일반적인 피드백

## 컨텍스트 데이터 구조

```typescript
interface FeedbackContext {
  // 게임 관련
  gameId?: string;
  gameName?: string;
  questionId?: string;
  
  // 페이지/UI 관련
  page?: string;
  section?: string;
  component?: string;
  
  // 사용자 관련
  userId?: string;
  sessionId?: string;
  
  // 기타
  timestamp?: string;
  userAgent?: string;
  pageUrl?: string;
  [key: string]: any; // 확장 가능
}
```

## 데이터베이스 스키마

```sql
CREATE TABLE public.user_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    feedback_source TEXT NOT NULL,
    content TEXT NOT NULL,
    context JSONB,
    user_agent TEXT,
    ip_address TEXT
);
```

## 설치 및 설정

1. **데이터베이스 마이그레이션 실행**
   ```bash
   # Supabase 프로젝트의 SQL 에디터에서 실행
   # 파일: supabase/migrations/20240723000000_create_feedback_mvp.sql
   ```

2. **컴포넌트 import**
   ```tsx
   import FeedbackModal, { useFeedbackModal } from '@/components/feedback/FeedbackModal';
   ```

3. **필요한 의존성 확인**
   - `@radix-ui/react-dialog`
   - `react-hook-form`
   - `@hookform/resolvers`
   - `zod`
   - `@supabase/supabase-js`

## 모니터링 및 분석

피드백 데이터 조회 예시:

```sql
-- 피드백 소스별 통계
SELECT 
    feedback_source,
    COUNT(*) as count,
    DATE_TRUNC('day', created_at) as date
FROM user_feedback 
GROUP BY feedback_source, DATE_TRUNC('day', created_at)
ORDER BY date DESC, count DESC;

-- 최근 피드백 조회
SELECT * FROM user_feedback 
ORDER BY created_at DESC 
LIMIT 50;

-- 특정 게임 관련 피드백
SELECT * FROM user_feedback 
WHERE context->>'gameId' = 'splendor'
ORDER BY created_at DESC;
```

## 주의사항

1. **개인정보 보호**: 민감한 개인정보를 context에 포함하지 마세요
2. **데이터 크기**: context는 합리적인 크기로 유지하세요 (1KB 이하 권장)
3. **피드백 소스**: 일관된 네이밍 규칙을 사용하세요
4. **성능**: 대량의 피드백 제출 시 적절한 제한을 구현하세요

## 확장 가능성

이 MVP 시스템은 추후 다음과 같이 확장 가능합니다:

- 피드백 카테고리화 및 자동 라우팅
- 관리자 대시보드 구축
- 이메일 알림 시스템
- 피드백 우선순위 시스템
- A/B 테스트를 위한 피드백 수집 
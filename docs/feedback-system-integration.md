# 피드백 시스템 통합 가이드

## 개요
AI 챗봇 답변에 대한 사용자 피드백 시스템이 구현되었습니다. 사용자가 👍/👎 버튼을 통해 답변의 유용성을 평가할 수 있으며, 피드백 데이터는 자동으로 통계에 반영됩니다.

## 구현된 기능

### 1. 프론트엔드 컴포넌트
- **파일**: `src/components/FeedbackButtons.tsx`
- **기능**: 
  - 👍/👎 피드백 버튼
  - 👎 클릭 시 추가 이유 입력 폼
  - 로딩 상태 및 중복 제출 방지
  - 성공/실패 토스트 메시지

### 2. 백엔드 API
- **파일**: `src/app/api/feedback/route.ts`
- **기능**:
  - Zod를 통한 데이터 검증
  - 중복 피드백 방지
  - Supabase 데이터베이스 저장
  - 적절한 에러 처리

### 3. 데이터베이스 구조
- **파일**: `supabase/migrations/20241201000000_create_feedback_system.sql`
- **테이블**:
  - `feedback_logs`: 개별 피드백 데이터
  - `performance_metrics`: 일별 통계
  - `game_analytics`: 누적 통계
- **트리거**: 자동 통계 집계

## 사용 방법

### 1. 컴포넌트 사용 예시

```tsx
import FeedbackButtons from '@/components/FeedbackButtons';

// ChatMessage 컴포넌트 내부에서 사용
<FeedbackButtons
  messageId="unique-message-id"
  gameId="current-game-id"
  question="사용자가 물어본 질문"
  answer="AI가 답변한 내용"
  onFeedbackSubmitted={() => {
    // 피드백 제출 후 콜백 (선택사항)
    console.log('피드백이 제출되었습니다.');
  }}
/>
```

### 2. API 호출 예시

```typescript
// 피드백 제출
const response = await fetch('/api/feedback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messageId: 'unique-message-id',
    feedbackType: 'helpful', // 또는 'unhelpful'
    gameId: 'game-123',
    question: '사용자 질문',
    answer: 'AI 답변',
    feedbackReason: '추가 이유 (선택사항)'
  }),
});

const result = await response.json();
```

## 데이터베이스 마이그레이션

### 1. Supabase에서 마이그레이션 실행

```sql
-- supabase/migrations/20241201000000_create_feedback_system.sql 파일의 내용을
-- Supabase SQL Editor에서 실행하세요.
```

### 2. 생성되는 테이블 구조

#### feedback_logs
```sql
- id: UUID (Primary Key)
- message_id: TEXT (Unique)
- feedback_type: TEXT ('helpful' | 'unhelpful')
- game_id: TEXT
- question: TEXT
- answer: TEXT
- feedback_reason: TEXT (Optional)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### performance_metrics (일별 통계)
```sql
- id: UUID (Primary Key)
- date: DATE
- game_id: TEXT
- total_feedbacks: INTEGER
- helpful_count: INTEGER
- unhelpful_count: INTEGER
- helpful_rate: DECIMAL(5,2)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### game_analytics (누적 통계)
```sql
- id: UUID (Primary Key)
- game_id: TEXT (Unique)
- total_feedbacks: INTEGER
- helpful_count: INTEGER
- unhelpful_count: INTEGER
- helpful_rate: DECIMAL(5,2)
- last_feedback_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## 통계 조회 예시

### 1. 특정 게임의 누적 통계
```sql
SELECT * FROM game_analytics 
WHERE game_id = 'your-game-id';
```

### 2. 최근 7일간의 일별 통계
```sql
SELECT * FROM performance_metrics 
WHERE game_id = 'your-game-id' 
  AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

### 3. 전체 게임별 도움됨 비율 순위
```sql
SELECT game_id, helpful_rate, total_feedbacks 
FROM game_analytics 
WHERE total_feedbacks > 0
ORDER BY helpful_rate DESC;
```

## 보안 및 권한

- **RLS (Row Level Security)** 활성화
- **feedback_logs**: 읽기/쓰기 모두 허용
- **performance_metrics**: 읽기만 허용
- **game_analytics**: 읽기만 허용

## 성능 최적화

- **인덱스** 생성으로 빠른 조회
- **트리거**를 통한 실시간 통계 집계
- **중복 제출 방지**로 데이터 무결성 보장

## 에러 처리

### API 응답 형식
```typescript
// 성공
{
  success: true,
  message: "피드백이 성공적으로 저장되었습니다.",
  data: {
    id: "uuid",
    createdAt: "2024-12-01T00:00:00Z"
  }
}

// 실패
{
  success: false,
  message: "오류 메시지",
  error: {
    code: "ERROR_CODE",
    message: "상세 오류 메시지"
  }
}
```

### 주요 에러 코드
- `VALIDATION_ERROR`: 데이터 검증 실패
- `DUPLICATE_FEEDBACK`: 중복 피드백 제출
- `DATABASE_ERROR`: 데이터베이스 오류
- `INTERNAL_ERROR`: 서버 내부 오류

## 향후 개선 사항

1. **실시간 대시보드**: 피드백 통계를 실시간으로 확인할 수 있는 관리자 페이지
2. **감정 분석**: 피드백 이유 텍스트에 대한 감정 분석
3. **A/B 테스트**: 다양한 답변 스타일에 대한 피드백 비교
4. **알림 시스템**: 낮은 도움됨 비율에 대한 알림
5. **익스포트 기능**: 피드백 데이터 CSV/Excel 다운로드 
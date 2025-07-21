# 대화 맥락 추적 시스템

AI 룰 마스터의 대화 맥락 추적 시스템은 사용자와의 대화에서 일관성을 유지하고 맥락을 잃지 않도록 하는 핵심 시스템입니다.

## 🎯 주요 기능

### 1. 대화 맥락 추적
- 세션별 대화 히스토리 관리
- 주제 전환 자동 감지
- 이전 대화와의 연관성 분석

### 2. 의도 파악
- 사용자 질문 의도 자동 분류
- 이전 답변에 대한 수정 요청 감지
- 암시적 참조 추출

### 3. 일관성 검증
- 답변 간 모순 자동 감지
- 사실 정보 충돌 검증
- 신뢰도 기반 답변 평가

### 4. 오류 감지 및 복구
- 사용자 지적 패턴 자동 감지
- 적절한 사과 메시지 생성
- 오류 패턴 학습 및 재발 방지

## 🏗️ 시스템 구조

```
src/lib/
├── conversation-history-manager.ts    # 대화 히스토리 관리
├── context-analyzer.ts               # 맥락 분석
├── intent-recognizer.ts              # 의도 파악
├── consistency-validator.ts          # 일관성 검증
├── error-recovery-system.ts          # 오류 감지 및 복구
├── session-manager.ts                # 세션 생명주기 관리
├── session-cache.ts                  # 메모리 캐시 시스템
├── context-logger.ts                 # 로깅 및 모니터링
└── conversation-context-system.ts    # 통합 인터페이스
```

## 📊 데이터베이스 스키마

### conversation_sessions
```sql
CREATE TABLE conversation_sessions (
    id UUID PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    current_topic TEXT,
    game_context TEXT,
    topic_start_turn INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### question_history
```sql
CREATE TABLE question_history (
    id UUID PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES conversation_sessions(session_id),
    turn_number INTEGER NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    topic TEXT,
    confidence DECIMAL(3,2) DEFAULT 0.5,
    was_researched BOOLEAN DEFAULT FALSE,
    context_analysis JSONB,
    intent_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 사용법

### 기본 사용법

```typescript
import { conversationContextSystem } from '@/lib/conversation-context-system';

// 대화 분석
const analysis = await conversationContextSystem.analyzeConversation(
  sessionId,
  userQuestion,
  gameTitle
);

// 히스토리 업데이트
await conversationContextSystem.updateConversationHistory(
  sessionId,
  question,
  answer,
  analysis.contextAnalysis,
  analysis.intentAnalysis,
  wasResearched
);
```

### Gemini 서비스와 통합

```typescript
import { askGameQuestionWithContextTracking } from '@/lib/gemini';

const response = await askGameQuestionWithContextTracking(
  gameTitle,
  userQuestion,
  sessionId,
  onResearchStart
);
```

## 🔧 API 엔드포인트

### GET /api/conversation/context
세션의 대화 맥락 조회

```typescript
// 요청
GET /api/conversation/context?sessionId=abc123

// 응답
{
  "success": true,
  "data": {
    "context": {
      "sessionId": "abc123",
      "currentTopic": "아크노바",
      "questionHistory": [...]
    }
  }
}
```

### POST /api/conversation/context
대화 맥락 분석 수행

```typescript
// 요청
POST /api/conversation/context
{
  "sessionId": "abc123",
  "question": "그럼 틀린거네?",
  "gameTitle": "아크노바"
}

// 응답
{
  "success": true,
  "data": {
    "context": {...},
    "analysis": {...},
    "intent": {...},
    "consistency": {...}
  }
}
```

### GET /api/conversation/history
대화 히스토리 조회

```typescript
// 요청
GET /api/conversation/history?sessionId=abc123&limit=10

// 응답
{
  "success": true,
  "data": {
    "sessionId": "abc123",
    "history": [...],
    "totalCount": 15,
    "filteredCount": 10
  }
}
```

## 📈 성능 메트릭

시스템은 다음 메트릭을 추적합니다:

- **맥락 추적 정확도**: 90% 이상 목표
- **의도 인식률**: 85% 이상 목표
- **오류 감지율**: 실제 오류의 80% 이상 감지
- **평균 응답 시간**: 5초 이내
- **캐시 효율성**: 75% 이상 히트율

## 🛠️ 설정

### 세션 정리 정책

```typescript
const cleanupPolicy = {
  memoryTTL: 30 * 60 * 1000,      // 30분 (메모리 캐시)
  databaseTTL: 7 * 24 * 60 * 60 * 1000, // 7일 (데이터베이스)
  maxSessionsPerUser: 10,          // 사용자당 최대 10개 세션
  cleanupInterval: 24 * 60 * 60 * 1000   // 매일 정리
};
```

### 캐시 설정

```typescript
const cacheConfig = {
  maxSessions: 1000,               // 최대 1000개 세션 캐시
  ttl: 30 * 60 * 1000,           // 30분 TTL
  cleanupInterval: 5 * 60 * 1000  // 5분마다 정리
};
```

## 🔍 모니터링

### 시스템 상태 확인

```typescript
const status = conversationContextSystem.getSystemStatus();
console.log('시스템 상태:', status);
```

### 로그 조회

```typescript
import { ContextLogger } from '@/lib/context-logger';

const logger = ContextLogger.getInstance();
const metrics = logger.getMetrics();
const stats = logger.getLogStats();
```

## 🚨 문제 해결

### 일반적인 문제들

1. **세션을 찾을 수 없음**
   - 세션 ID가 올바른지 확인
   - 세션이 만료되었는지 확인

2. **맥락 분석 정확도 낮음**
   - 키워드 매핑 업데이트
   - 분석 임계값 조정

3. **메모리 사용량 높음**
   - 캐시 크기 조정
   - TTL 시간 단축

### 디버깅

```typescript
// 디버그 모드 활성화
process.env.DEBUG_CONTEXT_TRACKING = 'true';

// 상세 로그 확인
console.log('맥락 분석 결과:', analysis);
```

## 📝 개발 가이드

### 새로운 의도 패턴 추가

```typescript
// intent-recognizer.ts에서
private readonly intentPatterns = {
  // 기존 패턴들...
  newIntent: [
    /새로운 패턴1/,
    /새로운 패턴2/
  ]
};
```

### 새로운 오류 패턴 추가

```typescript
// error-recovery-system.ts에서
private readonly userCorrectionPatterns = [
  // 기존 패턴들...
  { pattern: /새로운 오류 패턴/, intensity: 'medium', confidence: 0.8 }
];
```

## 🔄 업데이트 로그

### v1.0.0 (2024-12-21)
- 초기 대화 맥락 추적 시스템 구현
- 기본 의도 파악 및 일관성 검증 기능
- 세션 관리 및 캐시 시스템
- API 엔드포인트 구현

## 📞 지원

문제가 발생하거나 개선 사항이 있다면:

1. GitHub Issues에 문제 보고
2. 개발팀에 직접 연락
3. 시스템 로그 확인 후 디버깅

---

**주의**: 이 시스템은 사용자 대화 데이터를 처리하므로 개인정보 보호 정책을 준수해야 합니다.
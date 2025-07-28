# ARK NOVA RAG 시스템 설정 가이드

이 문서는 ARK NOVA 룰북 기반 RAG (Retrieval-Augmented Generation) 시스템의 설정 및 사용 방법을 안내합니다.

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [사전 요구사항](#사전-요구사항)
3. [설치 및 설정](#설치-및-설정)
4. [데이터베이스 마이그레이션](#데이터베이스-마이그레이션)
5. [룰북 데이터 처리](#룰북-데이터-처리)
6. [평가 시스템 설정](#평가-시스템-설정)
7. [사용 방법](#사용-방법)
8. [성능 모니터링](#성능-모니터링)
9. [문제 해결](#문제-해결)

## 🎯 시스템 개요

ARK NOVA RAG 시스템은 다음 구성 요소로 이루어져 있습니다:

- **문서 처리**: 룰북 텍스트를 의미론적으로 청킹하고 벡터화
- **벡터 검색**: Supabase pgvector를 사용한 유사도 검색
- **답변 생성**: LangChain.js + GPT-4를 사용한 컨텍스트 기반 답변 생성
- **피드백 수집**: 사용자 피드백을 통한 시스템 개선
- **자동 평가**: autoevals를 사용한 지속적인 성능 측정

## 🔧 사전 요구사항

### 필수 계정 및 API 키

1. **Supabase 프로젝트**
   - [Supabase](https://supabase.com)에서 새 프로젝트 생성
   - `pgvector` 확장 활성화 필요

2. **OpenAI API 키**
   - [OpenAI Platform](https://platform.openai.com)에서 API 키 발급
   - `text-embedding-3-small` 및 `gpt-4` 모델 접근 권한 필요

3. **개발 환경**
   - Node.js 18+ 
   - npm 또는 yarn
   - Git

## 🚀 설치 및 설정

### 1. 저장소 클론 및 의존성 설치

```bash
# 저장소 클론
git clone <repository-url>
cd gemini-rule-master

# 의존성 설치
npm install
```

### 2. 환경 변수 설정

```bash
# .env.example을 복사하여 .env.local 생성
cp .env.example .env.local
```

`.env.local` 파일을 편집하여 실제 값으로 설정:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# OpenAI 설정
OPENAI_API_KEY=sk-your-openai-api-key

# 애플리케이션 설정
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🗄️ 데이터베이스 마이그레이션

### 1. Supabase CLI 설치 (선택사항)

```bash
npm install -g supabase
```

### 2. 데이터베이스 스키마 생성

```bash
# 마이그레이션 실행
npm run rag:migrate
```

이 명령어는 다음 테이블들을 생성합니다:
- `documents`: 벡터화된 문서 청크 저장
- `raw_feedback`: 사용자 피드백 수집
- `golden_dataset`: 평가용 고품질 데이터셋
- `evaluation_results`: 자동 평가 결과 저장

### 3. 데이터베이스 함수 확인

마이그레이션 후 다음 RPC 함수들이 생성됩니다:
- `search_documents`: 벡터 유사도 검색
- `hybrid_search_documents`: 벡터 + 키워드 하이브리드 검색
- `get_documents_stats`: 문서 통계 조회
- `get_evaluation_trends`: 평가 트렌드 조회

## 📚 룰북 데이터 처리

### 1. Golden Dataset 생성

```bash
# 평가용 테스트 케이스 생성
npm run rag:seed-golden-dataset
```

### 2. 룰북 텍스트 처리 및 벡터화

```bash
# ARK NOVA 룰북 처리 (output.txt 파일 필요)
npm run rag:process-rulebook
```

이 과정에서:
- `output.txt` 파일을 의미론적으로 청킹
- 각 청크를 OpenAI API로 벡터화
- 메타데이터와 함께 Supabase에 저장

### 3. 전체 설정 자동화

```bash
# 마이그레이션 + Golden Dataset + 룰북 처리를 한 번에
npm run rag:setup
```

## 🧪 평가 시스템 설정

### 1. 수동 평가 실행

```bash
# RAG 시스템 성능 평가
npm run rag:evaluate
```

### 2. GitHub Actions 설정

#### Secrets 설정

GitHub 저장소 Settings > Secrets and variables > Actions에서 다음 시크릿 추가:

```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
NEXT_PUBLIC_APP_URL
SLACK_WEBHOOK_URL (선택사항)
```

#### 자동 평가 트리거

- **매일 오전 9시 (UTC)**: 정기 평가
- **Pull Request**: 코드 변경 시 평가
- **수동 실행**: GitHub Actions 탭에서 수동 트리거

## 💻 사용 방법

### 1. 개발 서버 시작

```bash
npm run dev
```

### 2. RAG API 엔드포인트

#### 채팅 API

```bash
# POST /api/chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "ARK NOVA 게임의 목표는 무엇인가요?",
    "gameId": "ARK_NOVA"
  }'
```

#### 피드백 API

```bash
# POST /api/feedback
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_123",
    "messageId": "msg_456",
    "feedbackType": "helpful",
    "feedbackReason": "정확한 답변"
  }'
```

### 3. 프론트엔드 통합

기존 채팅 컴포넌트에서 새로운 API 엔드포인트를 사용하도록 수정:

```typescript
// 예시: 채팅 컴포넌트에서 RAG API 호출
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userQuestion,
    gameId: 'ARK_NOVA'
  })
});

const result = await response.json();
console.log('답변:', result.answer);
console.log('출처:', result.sources);
```

## 📊 성능 모니터링

### 1. 평가 지표

- **Faithfulness (충실성)**: 답변이 제공된 컨텍스트에 얼마나 충실한가 (목표: > 0.7)
- **Answer Relevancy (답변 관련성)**: 답변이 질문과 얼마나 관련성이 있는가 (목표: > 0.8)
- **Context Recall (컨텍스트 재현율)**: 필요한 정보를 얼마나 잘 검색하는가 (목표: > 0.6)
- **Context Precision (컨텍스트 정확도)**: 검색된 정보가 얼마나 정확한가 (목표: > 0.7)

### 2. 성능 개선 가이드

#### Faithfulness 점수가 낮을 때
- 시스템 프롬프트 강화
- "제공된 컨텍스트만 사용" 지시 추가
- 환각(hallucination) 방지 로직 강화

#### Context Recall 점수가 낮을 때
- `match_count` 증가 (더 많은 문서 검색)
- 청킹 전략 재검토
- 유사도 임계값 조정

#### Answer Relevancy 점수가 낮을 때
- 질문 이해 능력 개선
- 프롬프트 엔지니어링 최적화
- 더 나은 LLM 모델 사용

### 3. 대시보드 확인

Supabase Dashboard에서 다음 쿼리로 성능 트렌드 확인:

```sql
-- 최근 평가 결과 조회
SELECT 
  evaluation_date,
  faithfulness_score,
  answer_relevancy_score,
  context_recall_score,
  context_precision_score,
  total_questions_evaluated
FROM evaluation_results 
ORDER BY created_at DESC 
LIMIT 10;

-- 피드백 통계 조회
SELECT 
  feedback_type,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM raw_feedback 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY feedback_type;
```

## 🔧 문제 해결

### 일반적인 문제들

#### 1. OpenAI API 오류

```bash
# API 키 확인
echo $OPENAI_API_KEY

# API 할당량 확인
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### 2. Supabase 연결 오류

```bash
# 연결 테스트
node -e "
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  supabase.from('documents').select('count').then(console.log);
"
```

#### 3. pgvector 확장 오류

Supabase Dashboard > SQL Editor에서 실행:

```sql
-- pgvector 확장 확인
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 확장이 없다면 활성화
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 4. 메모리 부족 오류

```bash
# Node.js 메모리 제한 증가
node --max-old-space-size=4096 scripts/process-rulebook.js
```

### 로그 확인

```bash
# 개발 서버 로그
npm run dev

# 평가 스크립트 상세 로그
DEBUG=* npm run rag:evaluate

# Supabase 함수 로그
npm run supabase:logs
```

## 📈 고급 설정

### 1. 청킹 전략 커스터마이징

`scripts/process-rulebook.js`에서 `CHUNK_CONFIG` 수정:

```javascript
const CHUNK_CONFIG = {
  chunkSize: 800,        // 청크 크기 (토큰)
  chunkOverlap: 150,     // 청크 간 겹침 (토큰)
  separators: ['\n\n', '\n', '. ', ' '],  // 분할 기준
};
```

### 2. 검색 파라미터 튜닝

`src/app/api/chat/route.ts`에서 검색 설정 조정:

```typescript
const searchResults = await supabase.rpc('hybrid_search_documents', {
  query_embedding: embedding,
  query_text: message,
  game_filter: gameId,
  match_count: 5,           // 검색할 문서 수
  similarity_threshold: 0.6  // 유사도 임계값
});
```

### 3. 프롬프트 최적화

`src/app/api/chat/route.ts`에서 시스템 프롬프트 수정:

```typescript
const systemPrompt = `
당신은 ARK NOVA 보드게임 전문가입니다.
제공된 컨텍스트만을 사용하여 정확하고 도움이 되는 답변을 제공하세요.

중요한 규칙:
1. 컨텍스트에 없는 정보는 추측하지 마세요
2. 불확실한 경우 "제공된 정보로는 확실하지 않습니다"라고 답하세요
3. 답변은 한국어로 제공하세요
4. 가능한 한 구체적이고 실용적인 답변을 제공하세요
`;
```

## 🤝 기여하기

1. 새로운 테스트 케이스 추가: `scripts/seed-golden-dataset.js` 수정
2. 평가 지표 개선: `scripts/evaluate-rag.js`에 새로운 메트릭 추가
3. 검색 알고리즘 개선: Supabase RPC 함수 최적화
4. 프롬프트 엔지니어링: 시스템 프롬프트 개선

## 📞 지원

문제가 발생하거나 질문이 있으시면:

1. 이 문서의 [문제 해결](#문제-해결) 섹션 확인
2. GitHub Issues에 문제 보고
3. 평가 결과를 통한 성능 모니터링

---

**참고**: 이 시스템은 지속적인 개선이 필요합니다. 정기적으로 평가 결과를 확인하고 피드백을 바탕으로 시스템을 최적화하세요.
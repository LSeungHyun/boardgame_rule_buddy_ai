# Rulebook Processor Function

이 Supabase Edge Function은 `rule-pdf` 버킷에 업로드된 PDF 파일을 자동으로 처리하여 Google Gemini 1.5 Pro API를 통해 텍스트와 이미지를 추출합니다.

## 기능

- PDF 파일 업로드 감지 (rule-pdf 버킷)
- Google Gemini 1.5 Pro API를 통한 문서 분석
- 구조화된 Markdown 텍스트 추출
- 이미지 설명 JSON 생성
- processed_documents 테이블에 결과 저장

## 설정 방법

### 1. 환경 변수 설정

Supabase 프로젝트의 환경 변수에 다음을 추가해야 합니다:

```bash
# Supabase CLI를 통한 환경 변수 설정
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here
```

또는 Supabase 대시보드에서:
- Settings > Edge Functions > Environment Variables
- `GEMINI_API_KEY`: Google AI Studio에서 발급받은 API 키

### 2. Google Gemini API 키 발급

1. [Google AI Studio](https://makersuite.google.com/app/apikey)에 접속
2. "Create API Key" 클릭
3. 발급받은 키를 환경 변수에 설정

### 3. 함수 배포

```bash
# Supabase CLI를 통한 배포
supabase functions deploy rulebook-processor
```

### 4. 트리거 설정

마이그레이션 파일(`20241222000000_create_processed_documents.sql`)을 실행하면 자동으로 트리거가 설정됩니다.

수동으로 설정하려면:

#### 방법 1: Database Webhook (권장)

1. Supabase 대시보드 > Database > Webhooks
2. 새 웹훅 생성:
   - **Name**: `rulebook-processor-trigger`
   - **Table**: `storage.objects`
   - **Events**: `INSERT`
   - **Type**: `HTTP Request`
   - **URL**: `https://your-project-ref.supabase.co/functions/v1/rulebook-processor`
   - **Headers**:
     ```
     Authorization: Bearer YOUR_ANON_KEY
     Content-Type: application/json
     ```

#### 방법 2: Database Trigger

마이그레이션 파일에 포함된 트리거를 사용하되, URL의 `your-project-ref`를 실제 프로젝트 참조로 변경해야 합니다.

### 5. Storage 버킷 설정

`rule-pdf` 버킷이 자동으로 생성되지만, 수동으로 생성하려면:

1. Supabase 대시보드 > Storage
2. "New bucket" 클릭
3. Bucket name: `rule-pdf`
4. Public bucket: ✅ (체크)

## 사용 방법

1. `rule-pdf` 버킷에 PDF 파일 업로드
2. 함수가 자동으로 트리거됨
3. `processed_documents` 테이블에서 결과 확인

## 데이터베이스 스키마

### processed_documents 테이블

```sql
CREATE TABLE processed_documents (
    id BIGSERIAL PRIMARY KEY,
    source_pdf_path TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    image_descriptions JSONB DEFAULT '{}',
    processed_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 에러 처리

함수는 다음과 같은 에러 상황을 처리합니다:

- 환경 변수 누락
- PDF 파일이 아닌 경우
- Gemini API 호출 실패
- 데이터베이스 저장 실패

모든 에러는 콘솔에 로그되며, HTTP 500 상태 코드와 함께 에러 메시지가 반환됩니다.

## 로그 확인

```bash
# 함수 로그 확인
supabase functions logs rulebook-processor
```

또는 Supabase 대시보드 > Edge Functions > rulebook-processor > Logs

## 테스트

함수를 수동으로 테스트하려면:

```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/rulebook-processor' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "INSERT",
    "table": "objects",
    "record": {
      "name": "test-file.pdf",
      "bucket_id": "rule-pdf",
      "owner": "test-user",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "last_accessed_at": "2024-01-01T00:00:00Z",
      "metadata": {}
    },
    "schema": "storage"
  }'
```

## 주의사항

1. **API 비용**: Google Gemini API는 사용량에 따라 과금됩니다.
2. **파일 크기**: 대용량 PDF 파일은 처리 시간이 오래 걸릴 수 있습니다.
3. **동시 처리**: 여러 파일을 동시에 업로드하면 API 제한에 걸릴 수 있습니다.
4. **보안**: API 키는 절대 클라이언트 코드에 노출하지 마세요.

## 문제 해결

### 함수가 트리거되지 않는 경우

1. 트리거 설정 확인
2. 버킷 이름이 `rule-pdf`인지 확인
3. 파일 확장자가 `.pdf`인지 확인
4. 함수 로그 확인

### Gemini API 오류

1. API 키가 올바른지 확인
2. API 할당량 확인
3. 네트워크 연결 확인

### 데이터베이스 저장 오류

1. `processed_documents` 테이블이 존재하는지 확인
2. RLS 정책 확인
3. 서비스 역할 권한 확인
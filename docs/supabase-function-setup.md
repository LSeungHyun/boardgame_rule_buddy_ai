# Supabase Function 설정 가이드

이 문서는 `rulebook-processor` Supabase Edge Function의 설정과 배포 방법을 설명합니다.

## 개요

`rulebook-processor` 함수는 다음과 같은 작업을 수행합니다:

1. **PDF 업로드 감지**: `rule-pdf` 버킷에 PDF 파일이 업로드되면 자동으로 트리거
2. **Google Gemini API 호출**: PDF 내용을 분석하여 텍스트와 이미지 추출
3. **구조화된 데이터 저장**: Markdown 텍스트와 이미지 설명을 데이터베이스에 저장

## 사전 요구사항

### 1. Supabase CLI 설치

```bash
npm install -g supabase
```

### 2. Google Gemini API 키 발급

1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. "Create API Key" 클릭
3. API 키 복사 (나중에 환경 변수로 설정)

## 설정 단계

### 1. Supabase 프로젝트 연결

```bash
# 프로젝트 루트에서 실행
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. 데이터베이스 마이그레이션 실행

```bash
# processed_documents 테이블 및 트리거 생성
supabase db push
```

### 3. 환경 변수 설정

```bash
# Gemini API 키 설정
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here

# 설정된 환경 변수 확인
supabase secrets list
```

### 4. 함수 배포

```bash
# rulebook-processor 함수 배포
supabase functions deploy rulebook-processor

# 배포 상태 확인
supabase functions list
```

### 5. 트리거 설정 확인

마이그레이션에서 자동으로 설정되지만, 수동으로 확인하려면:

```sql
-- 트리거 존재 확인
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'rulebook_processor_trigger';

-- 함수 존재 확인
SELECT * FROM information_schema.routines 
WHERE routine_name = 'notify_rulebook_processor';
```

### 6. Storage 버킷 확인

```sql
-- rule-pdf 버킷 존재 확인
SELECT * FROM storage.buckets WHERE id = 'rule-pdf';
```

## 테스트

### 1. 함수 직접 호출 테스트

```bash
# 함수 URL 확인
echo "https://$(supabase status | grep 'API URL' | cut -d: -f2- | tr -d ' ')/functions/v1/rulebook-processor"

# 테스트 호출
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/rulebook-processor' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "INSERT",
    "table": "objects",
    "record": {
      "name": "test.pdf",
      "bucket_id": "rule-pdf",
      "owner": "test",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "last_accessed_at": "2024-01-01T00:00:00Z",
      "metadata": {}
    },
    "schema": "storage"
  }'
```

### 2. 실제 PDF 업로드 테스트

1. Supabase 대시보드 > Storage > rule-pdf
2. PDF 파일 업로드
3. `processed_documents` 테이블에서 결과 확인

### 3. 로그 확인

```bash
# 실시간 로그 확인
supabase functions logs rulebook-processor --follow

# 최근 로그 확인
supabase functions logs rulebook-processor
```

## 문제 해결

### 함수 배포 실패

```bash
# 함수 삭제 후 재배포
supabase functions delete rulebook-processor
supabase functions deploy rulebook-processor
```

### 환경 변수 문제

```bash
# 환경 변수 재설정
supabase secrets unset GEMINI_API_KEY
supabase secrets set GEMINI_API_KEY=new_api_key
```

### 트리거 문제

```sql
-- 트리거 재생성
DROP TRIGGER IF EXISTS rulebook_processor_trigger ON storage.objects;
CREATE TRIGGER rulebook_processor_trigger
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION notify_rulebook_processor();
```

### 권한 문제

```sql
-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'processed_documents';

-- Storage 정책 확인
SELECT * FROM storage.policies WHERE bucket_id = 'rule-pdf';
```

## 모니터링

### 1. 함수 성능 모니터링

- Supabase 대시보드 > Edge Functions > rulebook-processor > Metrics

### 2. 데이터베이스 모니터링

```sql
-- 처리된 문서 수 확인
SELECT COUNT(*) FROM processed_documents;

-- 최근 처리된 문서
SELECT source_pdf_path, processed_at 
FROM processed_documents 
ORDER BY processed_at DESC 
LIMIT 10;

-- 처리 실패한 파일 확인 (로그 기반)
SELECT name FROM storage.objects 
WHERE bucket_id = 'rule-pdf' 
AND name NOT IN (
  SELECT source_pdf_path FROM processed_documents
);
```

### 3. API 사용량 모니터링

- Google AI Studio > API 사용량 확인
- 비용 모니터링 설정

## 보안 고려사항

1. **API 키 보안**: Gemini API 키는 환경 변수로만 관리
2. **RLS 정책**: 적절한 Row Level Security 정책 설정
3. **Storage 정책**: 인증된 사용자만 업로드 가능하도록 설정
4. **함수 권한**: 서비스 역할로만 데이터베이스 접근

## 성능 최적화

1. **동시 처리 제한**: 대량 업로드 시 큐 시스템 고려
2. **파일 크기 제한**: 너무 큰 PDF 파일 처리 제한
3. **캐싱**: 중복 처리 방지를 위한 캐싱 로직
4. **에러 재시도**: 일시적 오류에 대한 재시도 메커니즘

## 업데이트 및 유지보수

```bash
# 함수 업데이트
supabase functions deploy rulebook-processor

# 마이그레이션 업데이트
supabase db push

# 백업
supabase db dump --data-only > backup.sql
```
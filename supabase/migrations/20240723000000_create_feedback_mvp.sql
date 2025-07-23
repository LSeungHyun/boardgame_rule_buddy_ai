-- MVP용 통합 피드백 시스템 마이그레이션
-- 날짜: 2024-07-23
-- 설명: 간단하고 재사용 가능한 통합 피드백 테이블 구현
-- 이 스크립트는 Supabase 프로젝트의 SQL 에디터에서 직접 실행하도록 설계되었습니다.

-- 1. 통합 사용자 피드백 테이블 생성
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

-- 피드백 출처 (예: 'game_not_found', 'answer_unhelpful', 'ui_issue')
feedback_source TEXT NOT NULL,

-- 사용자가 작성한 피드백 내용
content TEXT NOT NULL,

-- 상황별 추가 데이터 (예: { "gameName": "카탄", "pageUrl": "/game/123" })
context JSONB,

-- 메타데이터 (선택사항)
user_agent TEXT, ip_address TEXT );

-- 2. 테이블 코멘트 추가
COMMENT ON
TABLE public.user_feedback IS '모든 사용자 피드백을 저장하는 통합 테이블 (MVP)';

COMMENT ON COLUMN public.user_feedback.feedback_source IS '피드백의 출처나 유형을 식별하는 태그';

COMMENT ON COLUMN public.user_feedback.content IS '사용자가 직접 작성한 피드백 내용';

COMMENT ON COLUMN public.user_feedback.context IS '피드백과 관련된 상황 정보 (JSON 형태)';

-- 3. 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_feedback_source ON public.user_feedback (feedback_source);

CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_feedback_context_gin ON public.user_feedback USING GIN (context);

-- 4. RLS (Row Level Security) 정책 설정
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "사용자 피드백 삽입 허용" ON public.user_feedback;

DROP POLICY IF EXISTS "피드백 조회 제한" ON public.user_feedback;

-- 개선된 RLS 정책: 모든 사용자 (인증된 사용자 + 익명 사용자)가 피드백을 삽입할 수 있도록 허용
CREATE POLICY "Allow feedback insertion for all users" ON public.user_feedback FOR
INSERT
WITH
    CHECK (true);

-- 개선된 RLS 정책: 관리자만 피드백을 조회할 수 있도록 설정
-- (현재는 모든 조회를 차단, 추후 관리자 역할 추가 시 수정 가능)
CREATE POLICY "Restrict feedback select" ON public.user_feedback FOR
SELECT USING (false);

-- Service Role은 모든 작업을 할 수 있도록 추가 정책 생성
CREATE POLICY "Service role full access" ON public.user_feedback FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

-- 5. 피드백 소스별 통계를 위한 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW public.feedback_stats AS
SELECT
    feedback_source,
    COUNT(*) as total_count,
    DATE_TRUNC ('day', created_at) as feedback_date,
    COUNT(*) OVER (
        PARTITION BY
            feedback_source
    ) as source_total
FROM public.user_feedback
GROUP BY
    feedback_source,
    DATE_TRUNC ('day', created_at)
ORDER BY feedback_date DESC, total_count DESC;

COMMENT ON VIEW public.feedback_stats IS '피드백 소스별 일일 통계 뷰';

-- 6. 데이터 무결성을 위한 제약 조건
ALTER TABLE public.user_feedback
ADD CONSTRAINT user_feedback_content_not_empty CHECK (LENGTH(TRIM(content)) > 0);

ALTER TABLE public.user_feedback
ADD CONSTRAINT user_feedback_source_not_empty CHECK (
    LENGTH(TRIM(feedback_source)) > 0
);

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ MVP 피드백 시스템 데이터베이스 설정이 완료되었습니다.';
    RAISE NOTICE '📊 테이블: user_feedback';
    RAISE NOTICE '🔒 RLS 정책: 활성화됨 (익명 사용자 INSERT 허용)';
    RAISE NOTICE '⚡ 인덱스: 성능 최적화 완료';
    RAISE NOTICE '🔧 Service Role: 전체 액세스 권한 부여';
END $$;
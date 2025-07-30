-- =====================================================
-- AI Rule Master 피드백 집계 자동화 시스템
-- =====================================================
-- 이 스크립트는 Supabase SQL Editor에서 실행해야 합니다.
-- feedback_logs 테이블에 새로운 피드백이 삽입될 때마다
-- performance_metrics와 game_analytics 테이블을 자동으로 업데이트합니다.

-- =====================================================
-- 1단계: 필요한 테이블들이 존재하는지 확인
-- =====================================================

-- feedback_logs 테이블 (피드백 원본 데이터)
CREATE TABLE IF NOT EXISTS feedback_logs (
    id BIGSERIAL PRIMARY KEY,
    message_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'unhelpful')),
    feedback_reason TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- performance_metrics 테이블 (전체 성능 지표)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_questions INTEGER DEFAULT 0,
    helpful_feedback INTEGER DEFAULT 0,
    unhelpful_feedback INTEGER DEFAULT 0,
    satisfaction_rate DECIMAL(5,2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date)
);

-- game_analytics 테이블 (게임별 분석 데이터)
CREATE TABLE IF NOT EXISTS game_analytics (
    id BIGSERIAL PRIMARY KEY,
    game_id TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    question_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    satisfaction_rate DECIMAL(5,2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, date)
);

-- =====================================================
-- 2단계: 피드백 집계 함수 생성
-- =====================================================

CREATE OR REPLACE FUNCTION handle_feedback_aggregation()
RETURNS TRIGGER AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    total_helpful INTEGER;
    total_unhelpful INTEGER;
    total_feedback INTEGER;
    calculated_satisfaction_rate DECIMAL(5,2);
    game_helpful INTEGER;
    game_unhelpful INTEGER;
    game_total INTEGER;
    game_satisfaction_rate DECIMAL(5,2);
BEGIN
    -- =====================================================
    -- 전체 성능 지표 업데이트 (performance_metrics)
    -- =====================================================
    
    -- 오늘 날짜의 전체 피드백 통계 계산
    SELECT 
        COALESCE(SUM(CASE WHEN feedback_type = 'helpful' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN feedback_type = 'unhelpful' THEN 1 ELSE 0 END), 0)
    INTO total_helpful, total_unhelpful
    FROM feedback_logs 
    WHERE DATE(created_at) = current_date;
    
    total_feedback := total_helpful + total_unhelpful;
    
    -- 만족도 계산 (0으로 나누기 방지)
    IF total_feedback > 0 THEN
        calculated_satisfaction_rate := ROUND((total_helpful::DECIMAL / total_feedback) * 100, 2);
    ELSE
        calculated_satisfaction_rate := 0.00;
    END IF;
    
    -- performance_metrics 테이블 UPSERT
    INSERT INTO performance_metrics (
        date, 
        total_questions, 
        helpful_feedback, 
        unhelpful_feedback, 
        satisfaction_rate,
        updated_at
    ) VALUES (
        current_date,
        total_feedback,
        total_helpful,
        total_unhelpful,
        calculated_satisfaction_rate,
        NOW()
    )
    ON CONFLICT (date) 
    DO UPDATE SET
        total_questions = EXCLUDED.total_questions,
        helpful_feedback = EXCLUDED.helpful_feedback,
        unhelpful_feedback = EXCLUDED.unhelpful_feedback,
        satisfaction_rate = EXCLUDED.satisfaction_rate,
        updated_at = NOW();
    
    -- =====================================================
    -- 게임별 분석 데이터 업데이트 (game_analytics)
    -- =====================================================
    
    -- 해당 게임의 오늘 피드백 통계 계산
    SELECT 
        COALESCE(SUM(CASE WHEN feedback_type = 'helpful' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN feedback_type = 'unhelpful' THEN 1 ELSE 0 END), 0)
    INTO game_helpful, game_unhelpful
    FROM feedback_logs 
    WHERE game_id = NEW.game_id 
    AND DATE(created_at) = current_date;
    
    game_total := game_helpful + game_unhelpful;
    
    -- 게임별 만족도 계산
    IF game_total > 0 THEN
        game_satisfaction_rate := ROUND((game_helpful::DECIMAL / game_total) * 100, 2);
    ELSE
        game_satisfaction_rate := 0.00;
    END IF;
    
    -- game_analytics 테이블 UPSERT
    INSERT INTO game_analytics (
        game_id,
        date,
        question_count,
        helpful_count,
        unhelpful_count,
        satisfaction_rate,
        updated_at
    ) VALUES (
        NEW.game_id,
        current_date,
        game_total,
        game_helpful,
        game_unhelpful,
        game_satisfaction_rate,
        NOW()
    )
    ON CONFLICT (game_id, date)
    DO UPDATE SET
        question_count = EXCLUDED.question_count,
        helpful_count = EXCLUDED.helpful_count,
        unhelpful_count = EXCLUDED.unhelpful_count,
        satisfaction_rate = EXCLUDED.satisfaction_rate,
        updated_at = NOW();
    
    -- 로그 출력 (디버깅용)
    RAISE NOTICE '피드백 집계 완료 - 게임: %, 전체 만족도: %%, 게임 만족도: %%', 
        NEW.game_id, calculated_satisfaction_rate, game_satisfaction_rate;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3단계: 트리거 생성
-- =====================================================

-- 기존 트리거가 있다면 삭제
DROP TRIGGER IF EXISTS feedback_aggregation_trigger ON feedback_logs;

-- 새로운 트리거 생성
CREATE TRIGGER feedback_aggregation_trigger
    AFTER INSERT ON feedback_logs
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_aggregation();

-- =====================================================
-- 4단계: 인덱스 생성 (성능 최적화)
-- =====================================================

-- feedback_logs 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_feedback_logs_game_date 
ON feedback_logs (game_id, DATE(created_at));

CREATE INDEX IF NOT EXISTS idx_feedback_logs_date 
ON feedback_logs (DATE(created_at));

CREATE INDEX IF NOT EXISTS idx_feedback_logs_feedback_type 
ON feedback_logs (feedback_type);

-- performance_metrics 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_performance_metrics_date 
ON performance_metrics (date DESC);

-- game_analytics 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_game_analytics_game_date 
ON game_analytics (game_id, date DESC);

-- =====================================================
-- 5단계: 테스트 및 검증
-- =====================================================

-- 테스트 데이터 삽입 (선택사항)
/*
INSERT INTO feedback_logs (message_id, game_id, question, answer, feedback_type, feedback_reason) 
VALUES 
    ('test-msg-1', 'ark-nova', '테스트 질문 1', '테스트 답변 1', 'helpful', NULL),
    ('test-msg-2', 'ark-nova', '테스트 질문 2', '테스트 답변 2', 'unhelpful', '답변이 부족함'),
    ('test-msg-3', 'wingspan', '테스트 질문 3', '테스트 답변 3', 'helpful', NULL);

-- 결과 확인
SELECT * FROM performance_metrics WHERE date = CURRENT_DATE;
SELECT * FROM game_analytics WHERE date = CURRENT_DATE;
*/

-- =====================================================
-- 설치 완료 메시지
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'AI Rule Master 피드백 집계 시스템 설치 완료!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE '✅ 테이블 생성 완료';
    RAISE NOTICE '✅ 집계 함수 생성 완료';
    RAISE NOTICE '✅ 트리거 생성 완료';
    RAISE NOTICE '✅ 인덱스 생성 완료';
    RAISE NOTICE '';
    RAISE NOTICE '이제 feedback_logs 테이블에 새로운 피드백이 삽입될 때마다';
    RAISE NOTICE 'performance_metrics와 game_analytics 테이블이 자동으로 업데이트됩니다.';
    RAISE NOTICE '=================================================';
END $$;
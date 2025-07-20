-- 피드백 시스템 마이그레이션
-- 날짜: 2024-12-01
-- 설명: AI 챗봇 답변에 대한 사용자 피드백 시스템 구현

-- 1. 피드백 로그 테이블 생성
CREATE TABLE IF NOT EXISTS feedback_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id TEXT NOT NULL UNIQUE,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'unhelpful')),
    game_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    feedback_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 성능 메트릭 테이블 생성 (일별 통계)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    game_id TEXT NOT NULL,
    total_feedbacks INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    helpful_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, game_id)
);

-- 3. 게임 분석 테이블 생성 (누적 통계)
CREATE TABLE IF NOT EXISTS game_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id TEXT NOT NULL UNIQUE,
    total_feedbacks INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    helpful_rate DECIMAL(5,2) DEFAULT 0.00,
    last_feedback_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_feedback_logs_message_id ON feedback_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_feedback_logs_game_id ON feedback_logs(game_id);
CREATE INDEX IF NOT EXISTS idx_feedback_logs_created_at ON feedback_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_date_game ON performance_metrics(date, game_id);
CREATE INDEX IF NOT EXISTS idx_game_analytics_game_id ON game_analytics(game_id);

-- 5. 피드백 집계 처리 함수 생성
CREATE OR REPLACE FUNCTION handle_feedback_aggregation()
RETURNS TRIGGER AS $$
DECLARE
    feedback_date DATE;
    current_helpful_rate DECIMAL(5,2);
BEGIN
    -- 새로 추가된 피드백의 날짜 추출
    feedback_date := DATE(NEW.created_at);
    
    -- 1. performance_metrics 테이블 업데이트 (일별 통계)
    INSERT INTO performance_metrics (date, game_id, total_feedbacks, helpful_count, unhelpful_count, helpful_rate, updated_at)
    VALUES (
        feedback_date,
        NEW.game_id,
        1,
        CASE WHEN NEW.feedback_type = 'helpful' THEN 1 ELSE 0 END,
        CASE WHEN NEW.feedback_type = 'unhelpful' THEN 1 ELSE 0 END,
        CASE WHEN NEW.feedback_type = 'helpful' THEN 100.00 ELSE 0.00 END,
        NOW()
    )
    ON CONFLICT (date, game_id) DO UPDATE SET
        total_feedbacks = performance_metrics.total_feedbacks + 1,
        helpful_count = performance_metrics.helpful_count + 
            CASE WHEN NEW.feedback_type = 'helpful' THEN 1 ELSE 0 END,
        unhelpful_count = performance_metrics.unhelpful_count + 
            CASE WHEN NEW.feedback_type = 'unhelpful' THEN 1 ELSE 0 END,
        helpful_rate = CASE 
            WHEN (performance_metrics.total_feedbacks + 1) > 0 
            THEN ROUND(
                ((performance_metrics.helpful_count + 
                  CASE WHEN NEW.feedback_type = 'helpful' THEN 1 ELSE 0 END)::DECIMAL / 
                 (performance_metrics.total_feedbacks + 1)::DECIMAL) * 100, 2
            )
            ELSE 0.00
        END,
        updated_at = NOW();
    
    -- 2. game_analytics 테이블 업데이트 (누적 통계)
    INSERT INTO game_analytics (game_id, total_feedbacks, helpful_count, unhelpful_count, helpful_rate, last_feedback_at, updated_at)
    VALUES (
        NEW.game_id,
        1,
        CASE WHEN NEW.feedback_type = 'helpful' THEN 1 ELSE 0 END,
        CASE WHEN NEW.feedback_type = 'unhelpful' THEN 1 ELSE 0 END,
        CASE WHEN NEW.feedback_type = 'helpful' THEN 100.00 ELSE 0.00 END,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (game_id) DO UPDATE SET
        total_feedbacks = game_analytics.total_feedbacks + 1,
        helpful_count = game_analytics.helpful_count + 
            CASE WHEN NEW.feedback_type = 'helpful' THEN 1 ELSE 0 END,
        unhelpful_count = game_analytics.unhelpful_count + 
            CASE WHEN NEW.feedback_type = 'unhelpful' THEN 1 ELSE 0 END,
        helpful_rate = CASE 
            WHEN (game_analytics.total_feedbacks + 1) > 0 
            THEN ROUND(
                ((game_analytics.helpful_count + 
                  CASE WHEN NEW.feedback_type = 'helpful' THEN 1 ELSE 0 END)::DECIMAL / 
                 (game_analytics.total_feedbacks + 1)::DECIMAL) * 100, 2
            )
            ELSE 0.00
        END,
        last_feedback_at = NEW.created_at,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 트리거 생성
DROP TRIGGER IF EXISTS trigger_feedback_aggregation ON feedback_logs;
CREATE TRIGGER trigger_feedback_aggregation
    AFTER INSERT ON feedback_logs
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_aggregation();

-- 7. RLS (Row Level Security) 정책 설정
ALTER TABLE feedback_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_analytics ENABLE ROW LEVEL SECURITY;

-- 피드백 로그 테이블 정책 (읽기/쓰기 모두 허용)
CREATE POLICY "Allow all operations on feedback_logs" ON feedback_logs
    FOR ALL USING (true);

-- 성능 메트릭 테이블 정책 (읽기만 허용)
CREATE POLICY "Allow read on performance_metrics" ON performance_metrics
    FOR SELECT USING (true);

-- 게임 분석 테이블 정책 (읽기만 허용)
CREATE POLICY "Allow read on game_analytics" ON game_analytics
    FOR SELECT USING (true);

-- 8. 댓글 추가
COMMENT ON TABLE feedback_logs IS 'AI 챗봇 답변에 대한 사용자 피드백 로그';
COMMENT ON TABLE performance_metrics IS '일별 게임별 피드백 성능 메트릭';
COMMENT ON TABLE game_analytics IS '게임별 누적 피드백 분석 데이터';
COMMENT ON FUNCTION handle_feedback_aggregation() IS '피드백 로그 추가 시 통계 자동 집계 함수'; 
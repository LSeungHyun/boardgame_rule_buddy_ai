-- 대화 맥락 추적 시스템을 위한 테이블 생성
-- 작성일: 2024-12-21
-- 목적: 사용자 대화 세션과 질문 히스토리를 추적하여 맥락 기반 답변 제공

-- 1. 대화 세션 테이블
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    current_topic TEXT,
    game_context TEXT,
    topic_start_turn INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 질문 히스토리 테이블
CREATE TABLE IF NOT EXISTS question_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES conversation_sessions(session_id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    topic TEXT,
    confidence DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    was_researched BOOLEAN DEFAULT FALSE,
    context_analysis JSONB,
    intent_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_session_id ON conversation_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_updated_at ON conversation_sessions(updated_at);

CREATE INDEX IF NOT EXISTS idx_question_history_session_id ON question_history(session_id);
CREATE INDEX IF NOT EXISTS idx_question_history_turn_number ON question_history(session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_question_history_topic ON question_history(topic);
CREATE INDEX IF NOT EXISTS idx_question_history_created_at ON question_history(created_at);

-- 4. RLS (Row Level Security) 정책 설정
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_history ENABLE ROW LEVEL SECURITY;

-- 세션 접근 정책: 본인의 세션만 접근 가능
CREATE POLICY "Users can access their own sessions" ON conversation_sessions
    FOR ALL USING (
        user_id = auth.uid() OR 
        user_id IS NULL  -- 익명 사용자 허용
    );

-- 질문 히스토리 접근 정책: 본인의 세션 히스토리만 접근 가능
CREATE POLICY "Users can access their own question history" ON question_history
    FOR ALL USING (
        session_id IN (
            SELECT session_id FROM conversation_sessions 
            WHERE user_id = auth.uid() OR user_id IS NULL
        )
    );

-- 5. 자동 업데이트 트리거 (updated_at 필드)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_sessions_updated_at 
    BEFORE UPDATE ON conversation_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 세션 정리를 위한 함수 (만료된 세션 자동 삭제)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 7일 이상 된 세션 삭제
    DELETE FROM conversation_sessions 
    WHERE updated_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 7. 세션 통계를 위한 뷰 (모니터링용)
CREATE OR REPLACE VIEW conversation_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(
        (SELECT COUNT(*) FROM question_history qh 
         WHERE qh.session_id = cs.session_id)
    ) as avg_questions_per_session
FROM conversation_sessions cs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 8. 댓글: 테이블 설명
COMMENT ON TABLE conversation_sessions IS '사용자 대화 세션 정보를 저장하는 테이블';
COMMENT ON TABLE question_history IS '각 세션의 질문과 답변 히스토리를 저장하는 테이블';

COMMENT ON COLUMN conversation_sessions.session_id IS '브라우저 세션 기반 고유 식별자';
COMMENT ON COLUMN conversation_sessions.current_topic IS '현재 대화 주제 (예: 아크노바, 윙스팬)';
COMMENT ON COLUMN conversation_sessions.game_context IS '현재 논의 중인 게임 컨텍스트';
COMMENT ON COLUMN conversation_sessions.topic_start_turn IS '현재 주제가 시작된 턴 번호';

COMMENT ON COLUMN question_history.turn_number IS '대화 내 순서 번호';
COMMENT ON COLUMN question_history.confidence IS '답변 신뢰도 (0.0-1.0)';
COMMENT ON COLUMN question_history.was_researched IS '웹 리서치 수행 여부';
COMMENT ON COLUMN question_history.context_analysis IS '맥락 분석 결과 JSON';
COMMENT ON COLUMN question_history.intent_analysis IS '의도 파악 결과 JSON';
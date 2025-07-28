-- =====================================================
-- ARK NOVA RAG 시스템 데이터베이스 스키마
-- =====================================================
-- 이 마이그레이션은 학습(임베딩 저장)과 테스트(평가) 시스템을 위한 테이블들을 생성합니다.

-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 1. documents 테이블 (청킹된 텍스트와 벡터 저장)
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    embedding VECTOR(1536), -- OpenAI text-embedding-3-small 차원
    game_id TEXT NOT NULL DEFAULT 'ARK_NOVA',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- documents 테이블 인덱스
CREATE INDEX IF NOT EXISTS documents_game_id_idx ON documents(game_id);
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS documents_metadata_idx ON documents USING GIN (metadata);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents(created_at);

-- =====================================================
-- 2. raw_feedback 테이블 (모든 피드백 수집)
-- =====================================================
CREATE TABLE IF NOT EXISTS raw_feedback (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    retrieved_context JSONB DEFAULT '[]', -- 검색된 문서 청크들
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'unhelpful')),
    feedback_reason TEXT,
    response_time_ms INTEGER, -- 응답 시간 (밀리초)
    game_id TEXT NOT NULL DEFAULT 'ARK_NOVA',
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- raw_feedback 테이블 인덱스
CREATE INDEX IF NOT EXISTS raw_feedback_session_id_idx ON raw_feedback(session_id);
CREATE INDEX IF NOT EXISTS raw_feedback_feedback_type_idx ON raw_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS raw_feedback_game_id_idx ON raw_feedback(game_id);
CREATE INDEX IF NOT EXISTS raw_feedback_created_at_idx ON raw_feedback(created_at);

-- =====================================================
-- 3. golden_dataset 테이블 (정제된 평가 데이터)
-- =====================================================
CREATE TABLE IF NOT EXISTS golden_dataset (
    id BIGSERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    ideal_answer TEXT NOT NULL,
    ideal_context JSONB NOT NULL DEFAULT '[]', -- 이상적인 컨텍스트 문서들
    game_id TEXT NOT NULL DEFAULT 'ARK_NOVA',
    category TEXT, -- 질문 카테고리 (setup, gameplay, scoring 등)
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    created_by TEXT, -- 관리자 ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- golden_dataset 테이블 인덱스
CREATE INDEX IF NOT EXISTS golden_dataset_game_id_idx ON golden_dataset(game_id);
CREATE INDEX IF NOT EXISTS golden_dataset_category_idx ON golden_dataset(category);
CREATE INDEX IF NOT EXISTS golden_dataset_difficulty_idx ON golden_dataset(difficulty_level);

-- =====================================================
-- 4. evaluation_results 테이블 (자동 평가 결과)
-- =====================================================
CREATE TABLE IF NOT EXISTS evaluation_results (
    id BIGSERIAL PRIMARY KEY,
    evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    commit_hash TEXT,
    branch_name TEXT DEFAULT 'main',
    
    -- 평가 지표 점수 (0-1 범위)
    faithfulness_score FLOAT CHECK (faithfulness_score >= 0 AND faithfulness_score <= 1),
    answer_relevancy_score FLOAT CHECK (answer_relevancy_score >= 0 AND answer_relevancy_score <= 1),
    context_recall_score FLOAT CHECK (context_recall_score >= 0 AND context_recall_score <= 1),
    context_precision_score FLOAT CHECK (context_precision_score >= 0 AND context_precision_score <= 1),
    
    -- 전체 통계
    total_questions_evaluated INTEGER NOT NULL DEFAULT 0,
    average_response_time_ms FLOAT,
    
    -- 세부 결과
    detailed_results JSONB DEFAULT '{}', -- 각 질문별 상세 결과
    
    -- 시스템 설정
    model_config JSONB DEFAULT '{}', -- 사용된 모델 설정
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- evaluation_results 테이블 인덱스
CREATE INDEX IF NOT EXISTS evaluation_results_date_idx ON evaluation_results(evaluation_date);
CREATE INDEX IF NOT EXISTS evaluation_results_commit_idx ON evaluation_results(commit_hash);
CREATE INDEX IF NOT EXISTS evaluation_results_branch_idx ON evaluation_results(branch_name);

-- =====================================================
-- 5. RAG 검색을 위한 RPC 함수
-- =====================================================
CREATE OR REPLACE FUNCTION search_documents(
    query_embedding vector(1536),
    game_filter text DEFAULT 'ARK_NOVA',
    match_count int DEFAULT 5,
    similarity_threshold float DEFAULT 0.7
)
RETURNS TABLE (
    id bigint,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.content,
        d.metadata,
        1 - (d.embedding <=> query_embedding) as similarity
    FROM documents d
    WHERE 
        d.game_id = game_filter
        AND d.embedding IS NOT NULL
        AND 1 - (d.embedding <=> query_embedding) > similarity_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =====================================================
-- 6. 하이브리드 검색을 위한 RPC 함수 (벡터 + 키워드)
-- =====================================================
CREATE OR REPLACE FUNCTION hybrid_search_documents(
    query_embedding vector(1536),
    query_text text,
    game_filter text DEFAULT 'ARK_NOVA',
    match_count int DEFAULT 5,
    similarity_threshold float DEFAULT 0.7
)
RETURNS TABLE (
    id bigint,
    content text,
    metadata jsonb,
    similarity float,
    text_rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.content,
        d.metadata,
        1 - (d.embedding <=> query_embedding) as similarity,
        ts_rank(to_tsvector('english', d.content), plainto_tsquery('english', query_text)) as text_rank
    FROM documents d
    WHERE 
        d.game_id = game_filter
        AND d.embedding IS NOT NULL
        AND (
            1 - (d.embedding <=> query_embedding) > similarity_threshold
            OR to_tsvector('english', d.content) @@ plainto_tsquery('english', query_text)
        )
    ORDER BY 
        (1 - (d.embedding <=> query_embedding)) * 0.7 + 
        ts_rank(to_tsvector('english', d.content), plainto_tsquery('english', query_text)) * 0.3 DESC
    LIMIT match_count;
END;
$$;

-- =====================================================
-- 7. Row Level Security (RLS) 정책
-- =====================================================

-- documents 테이블 RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to documents" 
ON documents FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Allow authenticated users to insert documents" 
ON documents FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update documents" 
ON documents FOR UPDATE 
TO authenticated 
USING (true);

-- raw_feedback 테이블 RLS
ALTER TABLE raw_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to raw_feedback" 
ON raw_feedback FOR INSERT 
TO public 
WITH CHECK (true);

CREATE POLICY "Allow authenticated read access to raw_feedback" 
ON raw_feedback FOR SELECT 
TO authenticated 
USING (true);

-- golden_dataset 테이블 RLS
ALTER TABLE golden_dataset ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to golden_dataset" 
ON golden_dataset FOR ALL 
TO authenticated 
USING (true);

-- evaluation_results 테이블 RLS
ALTER TABLE evaluation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to evaluation_results" 
ON evaluation_results FOR ALL 
TO authenticated 
USING (true);

-- =====================================================
-- 8. 유틸리티 함수들
-- =====================================================

-- 문서 통계 조회 함수
CREATE OR REPLACE FUNCTION get_documents_stats(game_filter text DEFAULT 'ARK_NOVA')
RETURNS TABLE (
    total_documents bigint,
    total_chunks bigint,
    avg_chunk_length float,
    last_updated timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT (metadata->>'source_document'))::bigint as total_documents,
        COUNT(*)::bigint as total_chunks,
        AVG(LENGTH(content))::float as avg_chunk_length,
        MAX(created_at) as last_updated
    FROM documents
    WHERE game_id = game_filter;
END;
$$;

-- 평가 성능 트렌드 조회 함수
CREATE OR REPLACE FUNCTION get_evaluation_trends(days_back int DEFAULT 30)
RETURNS TABLE (
    evaluation_date date,
    faithfulness_score float,
    answer_relevancy_score float,
    context_recall_score float,
    context_precision_score float,
    total_questions integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        er.evaluation_date,
        er.faithfulness_score,
        er.answer_relevancy_score,
        er.context_recall_score,
        er.context_precision_score,
        er.total_questions_evaluated
    FROM evaluation_results er
    WHERE er.evaluation_date >= CURRENT_DATE - INTERVAL '%s days' % days_back
    ORDER BY er.evaluation_date DESC;
END;
$$;

COMMENT ON TABLE documents IS 'ARK NOVA 룰북의 청킹된 텍스트와 임베딩 벡터를 저장';
COMMENT ON TABLE raw_feedback IS '사용자 피드백 원본 데이터 수집';
COMMENT ON TABLE golden_dataset IS '평가를 위한 정제된 질문-답변 데이터셋';
COMMENT ON TABLE evaluation_results IS '자동 평가 시스템의 성능 측정 결과';
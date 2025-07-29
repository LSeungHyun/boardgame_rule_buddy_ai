// src/app/api/chat/route.ts 파일의 전체 내용입니다.

/**
 * ARK NOVA RAG 채팅 API 엔드포인트 (v2 - 최종 수정)
 * LangChain.js를 사용한 검색 증강 생성(RAG) 시스템
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

// =================================================================
// ✨ CONFIG: 검색 관련 설정을 여기서 중앙 관리합니다.
// =================================================================
const SEARCH_CONFIG = {
  MATCH_COUNT: 5,                  // 검색할 최대 문서 수
  SIMILARITY_THRESHOLD: 0.2,       // 유사도 임계값 (매우 중요! 낮을수록 관대함)
  GAME_ID: 'ARK_NOVA'              // 대상 게임 ID
};

// 환경 변수 검증
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
}
if (!process.env.GEMINI_API_KEY) {
  throw new Error('Gemini API 키가 설정되지 않았습니다.');
}

// 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-pro',
  temperature: 0.1,
  apiKey: process.env.GEMINI_API_KEY,
});

// 타입 정의
interface DocumentChunk {
  id: number;
  content: string;
  metadata: any;
  similarity: number;
}
interface ChatRequest {
  message: string;
  sessionId?: string;
  gameId?: string;
}
interface ChatResponse {
  answer: string;
  sources: DocumentChunk[];
  responseTime: number;
  sessionId: string;
}

/**
 * 사용자 질문을 임베딩으로 변환
 */
async function embedQuery(query: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(query);
    return result.embedding.values;
  } catch (error) {
    console.error('임베딩 생성 실패:', error);
    throw new Error('질문 처리 중 오류가 발생했습니다.');
  }
}

/**
 * Supabase에서 관련 문서 검색 (Vector-only)
 */
async function searchDocuments(
  queryEmbedding: number[],
  gameId: string,
  matchCount: number,
  similarityThreshold: number // ✨ 기본값 제거
): Promise<DocumentChunk[]> {
  const { data, error } = await supabase.rpc('search_documents', {
    query_embedding: queryEmbedding,
    game_filter: gameId,
    match_count: matchCount,
    similarity_threshold: similarityThreshold
  });

  if (error) {
    console.error('문서 검색 실패:', error);
    throw new Error('문서 검색 중 오류가 발생했습니다.');
  }
  return data || [];
}

/**
 * 하이브리드 검색 (벡터 + 키워드)
 */
async function hybridSearchDocuments(
  queryEmbedding: number[],
  queryText: string,
  gameId: string,
  matchCount: number,
  similarityThreshold: number // ✨ 기본값 제거
): Promise<DocumentChunk[]> {
  try {
    const { data, error } = await supabase.rpc('hybrid_search_documents', {
      query_embedding: queryEmbedding,
      query_text: queryText,
      game_filter: gameId,
      match_count: matchCount,
      similarity_threshold: similarityThreshold
    });

    if (error) {
      console.error('하이브리드 검색 실패:', error);
      // 하이브리드 검색 실패 시 일반 벡터 검색으로 폴백
      return await searchDocuments(queryEmbedding, gameId, matchCount, similarityThreshold);
    }
    return data || [];
  } catch (error) {
    console.error('하이브리드 검색 오류:', error);
    // 오류 시 일반 벡터 검색으로 폴백
    return await searchDocuments(queryEmbedding, gameId, matchCount, similarityThreshold);
  }
}

// ... (RAG_PROMPT_TEMPLATE, createRAGChain, saveFeedback, generateSessionId 함수는 변경 없음) ...
const RAG_PROMPT_TEMPLATE = `당신은 ARK NOVA 보드게임의 전문가입니다. 주어진 컨텍스트를 바탕으로 사용자의 질문에 정확하고 도움이 되는 답변을 제공하세요.

**매우 중요:** 만약 제공된 컨텍스트가 비어있거나 질문과 전혀 관련이 없는 경우, 절대 추측해서 답변하지 마세요. 대신 '룰북에서 해당 정보를 찾을 수 없었습니다.'라고 명확하게 답변해야 합니다.

**핵심 지침:**
1. **컨텍스트 의존성**: 반드시 제공된 컨텍스트 내용만을 사용하여 답변하세요.
2. **추측 금지**: 컨텍스트에 없는 정보는 절대 추측하거나 만들어내지 마세요.
3. **구체적인 인용**: 답변의 근거가 되는 규칙이 있다면, 해당 내용을 마크다운의 인용(blockquote) 형식을 사용하여 직접 인용하세요.
4. **예외 우선**: 컨텍스트 내에 일반적인 규칙과 예외적인 규칙이 함께 존재할 경우, 항상 예외적인 규칙을 우선하여 답변을 구성하세요.
5. **명확한 거부**: 답변할 수 없는 질문이라면 "룰북에서 해당 정보를 찾을 수 없었습니다"라고 명확히 말하세요.
6. **한국어 답변**: 답변은 한국어로 작성하고, 친근하면서도 정확한 톤을 유지하세요.
7. **구체적 설명**: 관련된 게임 메커니즘이나 규칙이 있다면 구체적으로 설명하세요.

**컨텍스트:**
{context}

**사용자 질문:** {question}

**답변:**`;

const promptTemplate = PromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);

function createRAGChain() {
  return RunnableSequence.from([
    {
      context: (input: { context: string; question: string }) => input.context,
      question: (input: { context: string; question: string }) => input.question,
    },
    promptTemplate,
    llm,
    new StringOutputParser(),
  ]);
}

async function saveFeedback(sessionId: string, question: string, answer: string, retrievedContext: DocumentChunk[], responseTime: number, userAgent?: string, ipAddress?: string) {
  try {
    const { error } = await supabase.from('raw_feedback').insert({
      session_id: sessionId,
      question,
      answer,
      retrieved_context: retrievedContext,
      response_time_ms: responseTime,
      game_id: SEARCH_CONFIG.GAME_ID,
      user_agent: userAgent,
      ip_address: ipAddress,
      feedback_type: 'pending'
    });
    if (error) {
      console.error('피드백 저장 실패:', error);
    }
  } catch (error) {
    console.error('피드백 저장 오류:', error);
  }
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * POST 요청 처리 (채팅)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`🚀 [RAG API] 요청 시작 - ${new Date().toISOString()}`);
  
  try {
    const body: ChatRequest = await request.json();
    const { message, sessionId = generateSessionId() } = body;
    console.log(`📝 [RAG API] 질문: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: '질문을 입력해주세요.' }, { status: 400 });
    }

    // 1. 질문을 임베딩으로 변환
    const embeddingStartTime = Date.now();
    const queryEmbedding = await embedQuery(message);
    const embeddingTime = Date.now() - embeddingStartTime;
    console.log(`🔍 [RAG API] 임베딩 생성 완료 - ${embeddingTime}ms`);

    // 2. 관련 문서 검색 (하이브리드 검색 사용)
    const searchStartTime = Date.now();
    // ✨ 중앙 설정값을 사용하여 검색
    const documents = await hybridSearchDocuments(
      queryEmbedding,
      message,
      SEARCH_CONFIG.GAME_ID,
      SEARCH_CONFIG.MATCH_COUNT,
      SEARCH_CONFIG.SIMILARITY_THRESHOLD
    );
    const searchTime = Date.now() - searchStartTime;
    console.log(`📚 [RAG API] 문서 검색 완료 - ${searchTime}ms, 검색된 문서: ${documents.length}개`);

    if (documents.length === 0) {
      // ... (이하 로직 동일)
      const responseTime = Date.now() - startTime;
      console.log(`⚠️ [RAG API] 검색된 문서 없음 - 즉시 응답 반환`);
      return NextResponse.json({
        answer: '죄송합니다, 해당 질문에 대한 정보를 룰북에서 찾을 수 없었습니다. 다른 방식으로 질문해보시거나, 더 구체적인 키워드를 사용해보세요.',
        sources: [],
        responseTime,
        sessionId
      });
    }

    // 3. 컨텍스트 구성
    const contextStartTime = Date.now();
    const context = documents
      .map((doc, index) => 
        `[문서 ${index + 1}] (유사도: ${(doc.similarity * 100).toFixed(1)}%)
${doc.content}`
      )
      .join('\n\n---\n\n');
    const contextTime = Date.now() - contextStartTime;
    console.log(`📄 [RAG API] 컨텍스트 구성 완료 - ${contextTime}ms, 컨텍스트 길이: ${context.length}자`);
    
    // 디버깅: Gemini에게 전달되는 컨텍스트 출력
    console.log('📄 전달된 컨텍스트:', context);

    // 4. RAG 체인 실행
    const ragStartTime = Date.now();
    const ragChain = createRAGChain();
    const answer = await ragChain.invoke({ context, question: message });
    const ragTime = Date.now() - ragStartTime;
    console.log(`🤖 [RAG API] Gemini 응답 생성 완료 - ${ragTime}ms, 응답 길이: ${answer.length}자`);

    const responseTime = Date.now() - startTime;
    console.log(`✅ [RAG API] 전체 처리 완료 - ${responseTime}ms (임베딩: ${embeddingTime}ms, 검색: ${searchTime}ms, 컨텍스트: ${contextTime}ms, 생성: ${ragTime}ms)`);

    // 5. 피드백 데이터 저장 (비동기)
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    saveFeedback(sessionId, message, answer, documents, responseTime, userAgent, ipAddress).catch(console.error);

    // 6. 응답 반환
    const response: ChatResponse = { answer, sources: documents, responseTime, sessionId };
    return NextResponse.json(response);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ [RAG API] 오류 발생 - ${responseTime}ms:`, error);
    return NextResponse.json({ error: '답변 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', responseTime }, { status: 500 });
  }
}

/**
 * GET 요청 처리 (상태 확인)
 */
export async function GET() {
  try {
    const { data: stats, error } = await supabase.rpc('get_documents_stats', { game_filter: SEARCH_CONFIG.GAME_ID });
    if (error) {
      throw error;
    }
    return NextResponse.json({
      status: 'healthy',
      message: 'ARK NOVA RAG 시스템이 정상 작동 중입니다.',
      stats: stats?.[0] || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('상태 확인 오류:', error);
    return NextResponse.json({
      status: 'error',
      message: '시스템 상태 확인 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
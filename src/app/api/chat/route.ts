/**
 * ARK NOVA RAG 채팅 API 엔드포인트
 * LangChain.js를 사용한 검색 증강 생성(RAG) 시스템
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

// 환경 변수 검증
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OpenAI API 키가 설정되지 않았습니다.');
}

// 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const llm = new ChatOpenAI({
  modelName: 'gpt-4',
  temperature: 0.1,
  openAIApiKey: process.env.OPENAI_API_KEY,
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
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float',
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('임베딩 생성 실패:', error);
    throw new Error('질문 처리 중 오류가 발생했습니다.');
  }
}

/**
 * Supabase에서 관련 문서 검색
 */
async function searchDocuments(
  queryEmbedding: number[],
  gameId: string = 'ARK_NOVA',
  matchCount: number = 5,
  similarityThreshold: number = 0.7
): Promise<DocumentChunk[]> {
  try {
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
  } catch (error) {
    console.error('문서 검색 오류:', error);
    throw new Error('문서 검색 중 오류가 발생했습니다.');
  }
}

/**
 * 하이브리드 검색 (벡터 + 키워드)
 */
async function hybridSearchDocuments(
  queryEmbedding: number[],
  queryText: string,
  gameId: string = 'ARK_NOVA',
  matchCount: number = 5,
  similarityThreshold: number = 0.7
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

/**
 * RAG 프롬프트 템플릿
 */
const RAG_PROMPT_TEMPLATE = `당신은 ARK NOVA 보드게임의 전문가입니다. 주어진 컨텍스트를 바탕으로 사용자의 질문에 정확하고 도움이 되는 답변을 제공하세요.

**중요한 지침:**
1. 반드시 제공된 컨텍스트 내용만을 사용하여 답변하세요.
2. 컨텍스트에 없는 정보는 추측하거나 만들어내지 마세요.
3. 답변할 수 없는 질문이라면 "제공된 정보로는 답변할 수 없습니다"라고 명확히 말하세요.
4. 답변은 한국어로 작성하고, 친근하면서도 정확한 톤을 유지하세요.
5. 관련된 게임 메커니즘이나 규칙이 있다면 구체적으로 설명하세요.

**컨텍스트:**
{context}

**사용자 질문:** {question}

**답변:**`;

const promptTemplate = PromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);

/**
 * RAG 체인 생성
 */
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

/**
 * 피드백 저장
 */
async function saveFeedback(
  sessionId: string,
  question: string,
  answer: string,
  retrievedContext: DocumentChunk[],
  responseTime: number,
  userAgent?: string,
  ipAddress?: string
) {
  try {
    const { error } = await supabase
      .from('raw_feedback')
      .insert({
        session_id: sessionId,
        question,
        answer,
        retrieved_context: retrievedContext,
        response_time_ms: responseTime,
        game_id: 'ARK_NOVA',
        user_agent: userAgent,
        ip_address: ipAddress,
        feedback_type: 'pending' // 사용자 피드백 대기 중
      });

    if (error) {
      console.error('피드백 저장 실패:', error);
    }
  } catch (error) {
    console.error('피드백 저장 오류:', error);
  }
}

/**
 * 세션 ID 생성
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * POST 요청 처리 (채팅)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: ChatRequest = await request.json();
    const { message, sessionId = generateSessionId(), gameId = 'ARK_NOVA' } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: '질문을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 1. 질문을 임베딩으로 변환
    const queryEmbedding = await embedQuery(message);

    // 2. 관련 문서 검색 (하이브리드 검색 사용)
    const documents = await hybridSearchDocuments(
      queryEmbedding,
      message,
      gameId,
      5, // 최대 5개 문서
      0.6 // 유사도 임계값을 낮춰서 더 많은 결과 포함
    );

    if (documents.length === 0) {
      const responseTime = Date.now() - startTime;
      return NextResponse.json({
        answer: '죄송합니다. 해당 질문과 관련된 정보를 찾을 수 없습니다. 다른 방식으로 질문해보시거나, 더 구체적인 키워드를 사용해보세요.',
        sources: [],
        responseTime,
        sessionId
      });
    }

    // 3. 컨텍스트 구성
    const context = documents
      .map((doc, index) => 
        `[문서 ${index + 1}] (유사도: ${(doc.similarity * 100).toFixed(1)}%)\n${doc.content}`
      )
      .join('\n\n---\n\n');

    // 4. RAG 체인 실행
    const ragChain = createRAGChain();
    const answer = await ragChain.invoke({
      context,
      question: message
    });

    const responseTime = Date.now() - startTime;

    // 5. 피드백 데이터 저장 (비동기)
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     undefined;
    
    saveFeedback(
      sessionId,
      message,
      answer,
      documents,
      responseTime,
      userAgent,
      ipAddress
    ).catch(console.error);

    // 6. 응답 반환
    const response: ChatResponse = {
      answer,
      sources: documents,
      responseTime,
      sessionId
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('채팅 API 오류:', error);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        error: '답변 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        responseTime
      },
      { status: 500 }
    );
  }
}

/**
 * GET 요청 처리 (상태 확인)
 */
export async function GET() {
  try {
    // 데이터베이스 연결 및 문서 수 확인
    const { data: stats, error } = await supabase
      .rpc('get_documents_stats', { game_filter: 'ARK_NOVA' });

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
    
    return NextResponse.json(
      {
        status: 'error',
        message: '시스템 상태 확인 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
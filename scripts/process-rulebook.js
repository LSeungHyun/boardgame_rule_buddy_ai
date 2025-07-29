/**
 * ARK NOVA 룰북 처리 스크립트 (v2 - 필터링 강화)
 * output.txt 파일을 읽어 정제하고, 의미론적으로 청킹한 후,
 * 무의미한 청크를 필터링하고 Gemini 임베딩을 생성하여 Supabase에 저장합니다.
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

// 환경 변수 검증
require('dotenv').config({ path: '.env.local' });

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ 환경 변수 ${envVar}가 설정되지 않았습니다.`);
    process.exit(1);
  }
}

// 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * 의미론적 청킹을 위한 설정
 */
const CHUNK_CONFIG = {
  chunkSize: 800,       // 최대 토큰 수
  chunkOverlap: 150,    // 겹치는 토큰 수
  separators: [
    '\n\n# ',         // 메인 헤딩
    '\n\n## ',        // 서브 헤딩
    '\n\n### ',       // 서브서브 헤딩
    '\n\n',           // 단락 구분
    '\n',             // 줄바꿈
    '. ',             // 문장 끝
    ', ',             // 쉼표
    ' '               // 공백
  ]
};

/**
 * 텍스트를 의미론적으로 청킹
 */
async function chunkText(text) {
  console.log('📝 텍스트 청킹 시작...');

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_CONFIG.chunkSize,
    chunkOverlap: CHUNK_CONFIG.chunkOverlap,
    separators: CHUNK_CONFIG.separators,
  });

  const chunks = await splitter.splitText(text);
  console.log(`✅ ${chunks.length}개의 원본 청크 생성 완료`);

  return chunks;
}

// =================================================================
// ✨ NEW: 무의미한 청크를 필터링하는 함수
// =================================================================
function filterChunks(chunks) {
  console.log('🔍 청크 필터링 시작...');
  
  const MIN_CHUNK_LENGTH = 50; // 최소 50자 이상
  const MIN_DOT_COUNT_FOR_TOC = 10; // '.' 문자가 10개 이상이면 목차로 간주

  const originalCount = chunks.length;
  const filtered = chunks.filter(chunk => {
    // 1. 너무 짧은 청크 제거
    if (chunk.length < MIN_CHUNK_LENGTH) {
      return false;
    }
    // 2. 목차 형식의 청크 제거
    if ((chunk.match(/\./g) || []).length > MIN_DOT_COUNT_FOR_TOC) {
      return false;
    }
    // 3. 공백만 있는 청크 제거
    if (chunk.trim() === '') {
      return false;
    }
    return true;
  });

  const removedCount = originalCount - filtered.length;
  console.log(`✅ 필터링 완료: ${removedCount}개의 무의미한 청크 제거, ${filtered.length}개 청크 남음.`);
  return filtered;
}

// (이하 다른 함수들은 변경 없음: extractMetadata, generateEmbedding, generateEmbeddingsBatch, saveDocumentsToSupabase, clearExistingDocuments, printProcessingStats)
// ... (이전 코드와 동일한 함수들) ...
// (스크롤을 줄이기 위해 생략했습니다. 기존 코드를 그대로 두시면 됩니다.)

/**
 * 메타데이터 추출 함수
 */
function extractMetadata(chunk, chunkIndex, totalChunks) {
  const metadata = {
    source_document: 'ARK_NOVA_RULEBOOK',
    chunk_index: chunkIndex,
    total_chunks: totalChunks,
    chunk_length: chunk.length,
    game_mechanics: [],
    image_tags: [],
    section_type: 'content'
  };

  const imageMatches = chunk.match(/\[IMAGE:[^\]]+\]/g);
  if (imageMatches) {
    metadata.image_tags = imageMatches;
  }

  const mechanicsKeywords = [
    'action card', 'zoo card', 'animal', 'sponsor', 'conservation project',
    'appeal', 'conservation points', 'break', 'association', 'university',
    'reputation', 'money', 'x-token', 'final scoring', 'solo game'
  ];
  
  const lowerChunk = chunk.toLowerCase();
  metadata.game_mechanics = mechanicsKeywords.filter(keyword => 
    lowerChunk.includes(keyword)
  );

  if (chunk.includes('# ')) {
    metadata.section_type = 'heading';
  } else if (chunk.includes('## ')) {
    metadata.section_type = 'subheading';
  } else if (chunk.includes('### ')) {
    metadata.section_type = 'subsubheading';
  } else if (chunk.includes('**Setup**') || chunk.includes('**Game Setup**')) {
    metadata.section_type = 'setup';
  } else if (chunk.includes('**Scoring**') || chunk.includes('**Final Scoring**')) {
    metadata.section_type = 'scoring';
  } else if (chunk.includes('**Solo**')) {
    metadata.section_type = 'solo';
  }

  metadata.estimated_page = Math.floor(chunkIndex / 3) + 1;

  return metadata;
}

/**
 * Gemini 임베딩 생성
 */
async function generateEmbedding(text) {
  try {
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(text);
    
    return result.embedding.values;
  } catch (error) {
    console.error('❌ 임베딩 생성 실패:', error.message);
    throw error;
  }
}

/**
 * 배치 처리로 임베딩 생성 (API 제한 고려)
 */
async function generateEmbeddingsBatch(chunks, batchSize = 10) {
  console.log(`🔄 ${chunks.length}개 청크의 임베딩 생성 시작... (배치 크기: ${batchSize})`);
  
  const embeddings = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    console.log(`📊 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)} 처리 중...`);
    
    const batchPromises = batch.map(chunk => generateEmbedding(chunk));
    const batchEmbeddings = await Promise.all(batchPromises);
    
    embeddings.push(...batchEmbeddings);
    
    if (i + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('✅ 모든 임베딩 생성 완료');
  return embeddings;
}

/**
 * Supabase에 문서 저장
 */
async function saveDocumentsToSupabase(chunks, embeddings) {
  console.log('💾 Supabase에 문서 저장 시작...');
  
  const documents = chunks.map((chunk, index) => ({
    content: chunk,
    metadata: extractMetadata(chunk, index, chunks.length),
    embedding: embeddings[index],
    game_id: 'ARK_NOVA'
  }));

  const batchSize = 100;
  let insertedCount = 0;
  
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('documents')
      .insert(batch);
    
    if (error) {
      console.error(`❌ 배치 ${Math.floor(i/batchSize) + 1} 저장 실패:`, error.message);
      throw error;
    }
    
    insertedCount += batch.length;
    console.log(`✅ ${insertedCount}/${documents.length} 문서 저장 완료`);
  }
  
  console.log('🎉 모든 문서 저장 완료!');
  return insertedCount;
}

/**
 * 기존 문서 삭제 (재처리 시)
 */
async function clearExistingDocuments() {
  console.log('🗑️ 기존 ARK NOVA 문서 삭제 중...');
  
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('game_id', 'ARK_NOVA');
  
  if (error) {
    console.error('❌ 기존 문서 삭제 실패:', error.message);
    throw error;
  }
  
  console.log('✅ 기존 문서 삭제 완료');
}

/**
 * 처리 통계 출력
 */
async function printProcessingStats() {
  console.log('\n📊 처리 결과 통계:');
  
  const { data: stats, error } = await supabase
    .rpc('get_documents_stats', { game_filter: 'ARK_NOVA' });
  
  if (error) {
    console.error('❌ 통계 조회 실패:', error.message);
    return;
  }
  
  if (stats && stats.length > 0) {
    const stat = stats[0];
    console.log(`📄 총 문서 수: ${stat.total_documents}`);
    console.log(`📝 총 청크 수: ${stat.total_chunks}`);
    console.log(`📏 평균 청크 길이: ${Math.round(stat.avg_chunk_length)} 문자`);
    console.log(`🕒 마지막 업데이트: ${new Date(stat.last_updated).toLocaleString('ko-KR')}`);
  }
}

/**
 * 메인 처리 함수
 */
async function main() {
  try {
    console.log('🚀 ARK NOVA 룰북 처리 시작 (v2)\n');
    
    // 1. output.txt 파일 읽기
    const outputPath = path.join(__dirname, '..', 'output.txt');
    console.log(`📖 파일 읽기: ${outputPath}`);
    
    const rawText = await fs.readFile(outputPath, 'utf-8');
    console.log(`✅ 파일 읽기 완료 (${rawText.length} 문자)`);

    // ✨ NEW: 텍스트 사전 정제 (불필요한 연속 줄바꿈 제거)
    const cleanedText = rawText.replace(/(\r\n|\n){3,}/g, '\n\n');
    console.log(`✨ 텍스트 정제 완료 (${cleanedText.length} 문자)\n`);
    
    // 2. 기존 문서 삭제 (선택사항)
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      await clearExistingDocuments();
      console.log('');
    }
    
    // 3. 텍스트 청킹
    const initialChunks = await chunkText(cleanedText);
    
    // ✨ NEW: 무의미한 청크 필터링
    const filteredChunks = filterChunks(initialChunks);
    console.log('');

    if (filteredChunks.length === 0) {
      console.log('⚠️ 필터링 후 남은 청크가 없습니다. 처리를 중단합니다.');
      return;
    }
    
    // 4. 필터링된 청크로 임베딩 생성
    const embeddings = await generateEmbeddingsBatch(filteredChunks);
    console.log('');
    
    // 5. Supabase에 저장
    await saveDocumentsToSupabase(filteredChunks, embeddings);
    console.log('');
    
    // 6. 처리 통계 출력
    await printProcessingStats();
    
    console.log('\n🎉 ARK NOVA 룰북 처리 완료!');
    
  } catch (error) {
    console.error('❌ 처리 중 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = {
  chunkText,
  generateEmbedding,
  extractMetadata,
  saveDocumentsToSupabase,
  filterChunks // ✨ export 추가
};
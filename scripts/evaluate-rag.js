/**
 * ARK NOVA RAG 시스템 자동 평가 스크립트
 * autoevals를 사용하여 Faithfulness, Answer Relevancy 등을 측정
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const { Faithfulness, AnswerRelevancy, ContextRecall, ContextPrecision } = require('autoevals');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// 환경 변수 검증
require('dotenv').config();

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY'
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 평가 설정
const EVALUATION_CONFIG = {
  batchSize: 5,           // 한 번에 평가할 질문 수
  maxQuestions: 20,       // 최대 평가 질문 수
  timeoutMs: 30000,       // API 호출 타임아웃
  retryAttempts: 3,       // 재시도 횟수
  gameId: 'ARK_NOVA'
};

// 평가 지표 임계값
const THRESHOLDS = {
  faithfulness: 0.7,
  answerRelevancy: 0.8,
  contextRecall: 0.6,
  contextPrecision: 0.7
};

/**
 * Git 커밋 해시 가져오기
 */
function getCommitHash() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('⚠️ Git 커밋 해시를 가져올 수 없습니다:', error.message);
    return 'unknown';
  }
}

/**
 * Git 브랜치 이름 가져오기
 */
function getBranchName() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('⚠️ Git 브랜치 이름을 가져올 수 없습니다:', error.message);
    return 'unknown';
  }
}

/**
 * Golden Dataset에서 테스트 케이스 로드
 */
async function loadTestCases(limit = EVALUATION_CONFIG.maxQuestions) {
  console.log(`📋 Golden Dataset에서 테스트 케이스 로드 중... (최대 ${limit}개)`);
  
  const { data, error } = await supabase
    .from('golden_dataset')
    .select('*')
    .eq('game_id', EVALUATION_CONFIG.gameId)
    .limit(limit);
  
  if (error) {
    console.error('❌ 테스트 케이스 로드 실패:', error.message);
    throw error;
  }
  
  if (!data || data.length === 0) {
    throw new Error('Golden Dataset에 테스트 케이스가 없습니다. 먼저 테스트 데이터를 추가해주세요.');
  }
  
  console.log(`✅ ${data.length}개의 테스트 케이스 로드 완료`);
  return data;
}

/**
 * RAG 시스템 호출
 */
async function callRAGSystem(question, retries = EVALUATION_CONFIG.retryAttempts) {
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), EVALUATION_CONFIG.timeoutMs);
      
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          gameId: EVALUATION_CONFIG.gameId
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return {
        answer: result.answer,
        sources: result.sources || [],
        responseTime: result.responseTime || 0
      };
      
    } catch (error) {
      console.warn(`⚠️ RAG 시스템 호출 실패 (시도 ${attempt}/${retries}):`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
      
      // 재시도 전 대기
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * 단일 질문 평가
 */
async function evaluateQuestion(testCase) {
  console.log(`🔍 평가 중: "${testCase.question.substring(0, 50)}..."`);
  
  try {
    // RAG 시스템 호출
    const startTime = Date.now();
    const ragResult = await callRAGSystem(testCase.question);
    const responseTime = Date.now() - startTime;
    
    // 컨텍스트 추출
    const retrievedContext = ragResult.sources.map(source => source.content).join('\n\n');
    const idealContext = Array.isArray(testCase.ideal_context) 
      ? testCase.ideal_context.map(ctx => typeof ctx === 'string' ? ctx : ctx.content).join('\n\n')
      : testCase.ideal_context || '';
    
    // 평가 지표 계산
    const evaluations = {};
    
    try {
      // Faithfulness: 답변이 제공된 컨텍스트에 얼마나 충실한가
      const faithfulness = new Faithfulness();
      evaluations.faithfulness = await faithfulness.evaluate({
        input: testCase.question,
        output: ragResult.answer,
        expected: testCase.ideal_answer,
        context: retrievedContext
      });
    } catch (error) {
      console.warn('⚠️ Faithfulness 평가 실패:', error.message);
      evaluations.faithfulness = { score: 0, error: error.message };
    }
    
    try {
      // Answer Relevancy: 답변이 질문과 얼마나 관련성이 있는가
      const answerRelevancy = new AnswerRelevancy();
      evaluations.answerRelevancy = await answerRelevancy.evaluate({
        input: testCase.question,
        output: ragResult.answer,
        expected: testCase.ideal_answer
      });
    } catch (error) {
      console.warn('⚠️ Answer Relevancy 평가 실패:', error.message);
      evaluations.answerRelevancy = { score: 0, error: error.message };
    }
    
    try {
      // Context Recall: 검색된 컨텍스트가 이상적인 컨텍스트를 얼마나 포함하는가
      const contextRecall = new ContextRecall();
      evaluations.contextRecall = await contextRecall.evaluate({
        input: testCase.question,
        output: ragResult.answer,
        expected: testCase.ideal_answer,
        context: retrievedContext,
        expected_context: idealContext
      });
    } catch (error) {
      console.warn('⚠️ Context Recall 평가 실패:', error.message);
      evaluations.contextRecall = { score: 0, error: error.message };
    }
    
    try {
      // Context Precision: 검색된 컨텍스트가 얼마나 정확한가
      const contextPrecision = new ContextPrecision();
      evaluations.contextPrecision = await contextPrecision.evaluate({
        input: testCase.question,
        output: ragResult.answer,
        expected: testCase.ideal_answer,
        context: retrievedContext,
        expected_context: idealContext
      });
    } catch (error) {
      console.warn('⚠️ Context Precision 평가 실패:', error.message);
      evaluations.contextPrecision = { score: 0, error: error.message };
    }
    
    return {
      questionId: testCase.id,
      question: testCase.question,
      ragAnswer: ragResult.answer,
      idealAnswer: testCase.ideal_answer,
      retrievedContext,
      idealContext,
      responseTime,
      evaluations,
      success: true
    };
    
  } catch (error) {
    console.error(`❌ 질문 평가 실패: ${error.message}`);
    return {
      questionId: testCase.id,
      question: testCase.question,
      error: error.message,
      success: false
    };
  }
}

/**
 * 배치 평가 실행
 */
async function runEvaluation() {
  console.log('🚀 ARK NOVA RAG 시스템 평가 시작\n');
  
  try {
    // 1. 테스트 케이스 로드
    const testCases = await loadTestCases();
    console.log('');
    
    // 2. 배치별 평가 실행
    const results = [];
    const batchSize = EVALUATION_CONFIG.batchSize;
    
    for (let i = 0; i < testCases.length; i += batchSize) {
      const batch = testCases.slice(i, i + batchSize);
      console.log(`📊 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(testCases.length/batchSize)} 평가 중...`);
      
      const batchPromises = batch.map(testCase => evaluateQuestion(testCase));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // API 제한을 위한 지연
      if (i + batchSize < testCases.length) {
        console.log('⏳ API 제한을 위해 잠시 대기 중...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n✅ 모든 평가 완료');
    
    // 3. 결과 집계
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    
    if (successfulResults.length === 0) {
      throw new Error('모든 평가가 실패했습니다.');
    }
    
    const aggregatedScores = {
      faithfulness: calculateAverageScore(successfulResults, 'faithfulness'),
      answerRelevancy: calculateAverageScore(successfulResults, 'answerRelevancy'),
      contextRecall: calculateAverageScore(successfulResults, 'contextRecall'),
      contextPrecision: calculateAverageScore(successfulResults, 'contextPrecision')
    };
    
    const averageResponseTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length;
    
    // 4. 결과 저장
    const evaluationResult = {
      evaluation_date: new Date().toISOString().split('T')[0],
      commit_hash: getCommitHash(),
      branch_name: getBranchName(),
      faithfulness_score: aggregatedScores.faithfulness,
      answer_relevancy_score: aggregatedScores.answerRelevancy,
      context_recall_score: aggregatedScores.contextRecall,
      context_precision_score: aggregatedScores.contextPrecision,
      total_questions_evaluated: successfulResults.length,
      average_response_time_ms: Math.round(averageResponseTime),
      detailed_results: {
        successful: successfulResults.length,
        failed: failedResults.length,
        results: results
      },
      model_config: {
        embedding_model: 'text-embedding-3-small',
        llm_model: 'gpt-4',
        match_count: 5,
        similarity_threshold: 0.6
      }
    };
    
    const { error: saveError } = await supabase
      .from('evaluation_results')
      .insert(evaluationResult);
    
    if (saveError) {
      console.error('❌ 평가 결과 저장 실패:', saveError.message);
    } else {
      console.log('💾 평가 결과 저장 완료');
    }
    
    // 5. 결과 출력
    printEvaluationResults(aggregatedScores, successfulResults.length, failedResults.length, averageResponseTime);
    
    // 6. 성능 경고 확인
    checkPerformanceAlerts(aggregatedScores);
    
    return evaluationResult;
    
  } catch (error) {
    console.error('❌ 평가 실행 중 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 평균 점수 계산
 */
function calculateAverageScore(results, metricName) {
  const scores = results
    .map(r => r.evaluations[metricName]?.score)
    .filter(score => typeof score === 'number' && !isNaN(score));
  
  if (scores.length === 0) return 0;
  
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * 평가 결과 출력
 */
function printEvaluationResults(scores, successCount, failCount, avgResponseTime) {
  console.log('\n📊 평가 결과 요약:');
  console.log('=' .repeat(50));
  console.log(`📈 Faithfulness (충실성): ${(scores.faithfulness * 100).toFixed(1)}%`);
  console.log(`🎯 Answer Relevancy (답변 관련성): ${(scores.answerRelevancy * 100).toFixed(1)}%`);
  console.log(`🔍 Context Recall (컨텍스트 재현율): ${(scores.contextRecall * 100).toFixed(1)}%`);
  console.log(`🎪 Context Precision (컨텍스트 정확도): ${(scores.contextPrecision * 100).toFixed(1)}%`);
  console.log(`⏱️ 평균 응답 시간: ${Math.round(avgResponseTime)}ms`);
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log('=' .repeat(50));
}

/**
 * 성능 경고 확인
 */
function checkPerformanceAlerts(scores) {
  const alerts = [];
  
  if (scores.faithfulness < THRESHOLDS.faithfulness) {
    alerts.push(`🚨 Faithfulness 점수가 임계값(${THRESHOLDS.faithfulness})보다 낮습니다. 시스템 프롬프트를 더 강화하세요.`);
  }
  
  if (scores.answerRelevancy < THRESHOLDS.answerRelevancy) {
    alerts.push(`🚨 Answer Relevancy 점수가 임계값(${THRESHOLDS.answerRelevancy})보다 낮습니다. 질문 이해 능력을 개선하세요.`);
  }
  
  if (scores.contextRecall < THRESHOLDS.contextRecall) {
    alerts.push(`🚨 Context Recall 점수가 임계값(${THRESHOLDS.contextRecall})보다 낮습니다. 검색 매개변수(match_count)를 늘리거나 청킹 전략을 재검토하세요.`);
  }
  
  if (scores.contextPrecision < THRESHOLDS.contextPrecision) {
    alerts.push(`🚨 Context Precision 점수가 임계값(${THRESHOLDS.contextPrecision})보다 낮습니다. 유사도 임계값을 높이거나 검색 알고리즘을 개선하세요.`);
  }
  
  if (alerts.length > 0) {
    console.log('\n⚠️ 성능 경고:');
    alerts.forEach(alert => console.log(alert));
  } else {
    console.log('\n🎉 모든 지표가 임계값을 만족합니다!');
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  const startTime = Date.now();
  
  try {
    await runEvaluation();
    
    const totalTime = Date.now() - startTime;
    console.log(`\n🏁 평가 완료! 총 소요 시간: ${Math.round(totalTime / 1000)}초`);
    
  } catch (error) {
    console.error('❌ 평가 실행 실패:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = {
  runEvaluation,
  evaluateQuestion,
  loadTestCases
};
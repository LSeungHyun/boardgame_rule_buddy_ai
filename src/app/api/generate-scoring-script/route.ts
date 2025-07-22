/**
 * 점수 계산 스크립트 생성 API 엔드포인트
 * Gemini AI를 사용하여 게임별 점수 카테고리 스크립트 생성
 */

import { NextRequest, NextResponse } from 'next/server';

// 점수 시트 템플릿 타입 정의
interface ScoreSheetTemplate {
  gameName: string;
  scoringCategories: ScoringCategory[];
}

interface ScoringCategory {
  id: string;
  categoryName: string;
  prompt: string;
}

interface ScriptRequest {
  gameName: string;
}

interface ScriptResponse {
  success: boolean;
  data?: ScoreSheetTemplate;
  error?: {
    code: string;
    message: string;
    suggestion?: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ScriptResponse>> {
  console.log('🎯 [점수 스크립트 생성 API 호출]', new Date().toISOString());

  try {
    // 1. 요청 본문 파싱
    const body: ScriptRequest = await request.json();
    const { gameName } = body;

    console.log('📝 [요청 파라미터]', { 게임명: gameName });

    // 2. 입력 검증
    if (!gameName || gameName.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '게임 이름을 입력해주세요.'
        }
      }, { status: 400 });
    }

    // 3. Gemini AI 프롬프트 구성
    const prompt = constructGeminiPrompt(gameName);

    // 4. Gemini API 호출
    const scoreSheetTemplate = await callGeminiAPI(prompt);

    console.log('✅ [스크립트 생성 완료]', {
      게임명: scoreSheetTemplate.gameName,
      카테고리수: scoreSheetTemplate.scoringCategories.length
    });

    return NextResponse.json({
      success: true,
      data: scoreSheetTemplate
    });

  } catch (error) {
    console.error('❌ [스크립트 생성 오류]:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'GENERATION_ERROR',
        message: '점수 스크립트 생성 중 오류가 발생했습니다.',
        suggestion: '잠시 후 다시 시도해주세요.'
      }
    }, { status: 500 });
  }
}

/**
 * Gemini AI용 프롬프트 구성
 */
function constructGeminiPrompt(gameName: string): string {
  return `
당신은 보드게임 룰 전문가입니다. "${gameName}" 게임의 점수 계산 방식을 분석하여 
대화형 점수 가이드용 JSON 스크립트를 생성해주세요.

다음 JSON 형식을 정확히 따라주세요:

{
  "gameName": "게임 이름",
  "scoringCategories": [
    {
      "id": "고유_식별자",
      "categoryName": "점수 카테고리명",
      "prompt": "사용자에게 물어볼 질문 (친근하고 명확하게)"
    }
  ]
}

요구사항:
1. 게임의 모든 주요 점수 카테고리를 포함해주세요
2. 각 카테고리의 id는 영문 소문자와 언더스코어만 사용
3. prompt는 한국어로 작성하고, 사용자가 쉽게 이해할 수 있도록 구체적으로 작성
4. 점수 계산 순서를 고려하여 논리적으로 배열
5. 이모지나 특수 기호를 적절히 활용하여 시각적 구분 제공

예시 (세븐 원더스: 듀얼):
{
  "gameName": "세븐 원더스: 듀얼",
  "scoringCategories": [
    {
      "id": "civic",
      "categoryName": "시민 건물 (파랑)",
      "prompt": "파란색 시민 건물(🏛️)에서 얻은 총 승점은 몇 점인가요?"
    },
    {
      "id": "guild",
      "categoryName": "길드 건물 (보라)",
      "prompt": "보라색 길드 건물(G)에서 얻은 점수는 몇 점인가요?"
    }
  ]
}

"${gameName}" 게임에 대한 정확한 점수 스크립트를 JSON 형식으로만 응답해주세요.
`;
}

/**
 * Gemini API 호출
 */
async function callGeminiAPI(prompt: string): Promise<ScoreSheetTemplate> {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
      responseMimeType: "application/json"
    }
  };

  console.log('🤖 [Gemini API 호출]', {
    URL: url.substring(0, 80) + '...',
    프롬프트길이: prompt.length
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ [Gemini API 오류]', {
      상태코드: response.status,
      오류내용: errorText
    });
    throw new Error(`Gemini API 호출 실패: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Gemini API에서 응답을 생성하지 못했습니다.');
  }

  const generatedText = data.candidates[0].content.parts[0].text;
  
  try {
    const scoreSheetTemplate: ScoreSheetTemplate = JSON.parse(generatedText);
    
    // 응답 검증
    if (!scoreSheetTemplate.gameName || !scoreSheetTemplate.scoringCategories) {
      throw new Error('생성된 스크립트 형식이 올바르지 않습니다.');
    }

    // 카테고리 검증
    scoreSheetTemplate.scoringCategories.forEach((category, index) => {
      if (!category.id || !category.categoryName || !category.prompt) {
        throw new Error(`카테고리 ${index + 1}의 필수 필드가 누락되었습니다.`);
      }
    });

    return scoreSheetTemplate;

  } catch (parseError) {
    console.error('❌ [JSON 파싱 오류]', {
      생성된텍스트: generatedText.substring(0, 200),
      파싱오류: parseError
    });
    throw new Error('생성된 스크립트를 파싱할 수 없습니다.');
  }
}
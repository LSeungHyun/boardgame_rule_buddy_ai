/**
 * BGG API CORS 프록시
 * 
 * 브라우저에서 직접 BGG API 호출 시 CORS 오류를 해결하기 위한 프록시 서버
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'search' | 'thing'
    const query = searchParams.get('query');
    const id = searchParams.get('id');

    if (!type) {
      return NextResponse.json(
        { error: 'type 파라미터가 필요합니다 (search | thing)' },
        { status: 400 }
      );
    }

    let bggUrl = '';

    if (type === 'search') {
      if (!query) {
        return NextResponse.json(
          { error: 'search 타입은 query 파라미터가 필요합니다' },
          { status: 400 }
        );
      }
      
      // exact 파라미터를 선택적으로 적용 (기본값: 유연한 검색)
      const exact = searchParams.get('exact') === '1' ? '&exact=1' : '';
      bggUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame${exact}`;
    } else if (type === 'thing') {
      if (!id) {
        return NextResponse.json(
          { error: 'thing 타입은 id 파라미터가 필요합니다' },
          { status: 400 }
        );
      }
      bggUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${id}&stats=1`;
    } else {
      return NextResponse.json(
        { error: '지원하지 않는 타입입니다' },
        { status: 400 }
      );
    }

    console.log(`[BGG Proxy] 요청: ${bggUrl}`);

    // BGG API 호출
    const response = await fetch(bggUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'User-Agent': 'RuleMasterAI/1.0'
      }
    });

    if (!response.ok) {
      console.error(`[BGG Proxy] BGG API 오류: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `BGG API 오류: ${response.status}` },
        { status: response.status }
      );
    }

    const xmlText = await response.text();
    
    // XML 내용의 간단한 통계 로깅
    const hasResults = xmlText.includes('<item ');
    const resultCount = (xmlText.match(/<item /g) || []).length;
    
    console.log(`[BGG Proxy] 성공: ${xmlText.length}자의 XML 반환, 결과: ${resultCount}개 게임 ${hasResults ? '발견' : '없음'}`);

    // XML을 그대로 반환 (Content-Type 헤더 설정)
    return new NextResponse(xmlText, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('[BGG Proxy] 예외 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// CORS preflight 요청 처리
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
} 
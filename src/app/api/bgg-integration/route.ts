/**
 * BGG 통합 API 엔드포인트
 * BoardGameGeek API와의 연동 기능을 제공
 */

import { NextRequest, NextResponse } from 'next/server';
import { bggIntegrationService, type GameWithBGGData, type BGGSyncResult, type BGGSearchResultWithDetails } from '@/infrastructure/ai/orchestrators/bgg-integration-service';

interface BGGSearchRequest {
  gameTitle: string;
}

interface BGGHotGamesRequest {
  limit?: number;
}

interface BGGRecommendationRequest {
  baseGameTitle: string;
  count?: number;
}

interface BGGSyncRequest {
  forceSync?: boolean;
}

type BGGApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    suggestion?: string;
  };
  metadata?: {
    timestamp: string;
    processingTime: number;
    cacheHit?: boolean;
  };
};

/**
 * BGG 게임 검색 (여러 결과 반환)
 * POST /api/bgg-integration?action=search
 */
async function handleSearch(request: NextRequest): Promise<NextResponse<BGGApiResponse<BGGSearchResultWithDetails>>> {
  const startTime = Date.now();
  
  try {
    const body: BGGSearchRequest = await request.json();
    const { gameTitle } = body;

    if (!gameTitle || gameTitle.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '게임 제목을 입력해주세요.',
          suggestion: '검색할 게임의 정확한 제목을 입력하세요.'
        }
      }, { status: 400 });
    }

    console.log(`🔍 [BGG API] 게임 검색 요청: "${gameTitle}"`);

    const searchResults = await bggIntegrationService.searchGames(gameTitle.trim());

    if (searchResults.totalFound === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_RESULTS_FOUND',
          message: `"${gameTitle}"와 관련된 게임을 BGG에서 찾을 수 없습니다.`,
          suggestion: '게임 제목의 철자를 확인하거나 영어 제목으로 시도해보세요.'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      }, { status: 404 });
    }

    console.log(`✅ [BGG API] 검색 완료: ${searchResults.totalFound}개 게임 발견, ${searchResults.detailedGames.length}개 상세 정보 제공`);

    return NextResponse.json({
      success: true,
      data: searchResults,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        cacheHit: false
      }
    });

  } catch (error) {
    console.error(`❌ [BGG API] 검색 오류:`, error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'BGG 검색 중 오류가 발생했습니다.',
        suggestion: '잠시 후 다시 시도해주세요.'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    }, { status: 500 });
  }
}

/**
 * BGG 단일 게임 매칭 (기존 호환성 유지)
 * POST /api/bgg-integration?action=match
 */
async function handleMatch(request: NextRequest): Promise<NextResponse<BGGApiResponse<GameWithBGGData>>> {
  const startTime = Date.now();
  
  try {
    const body: BGGSearchRequest = await request.json();
    const { gameTitle } = body;

    if (!gameTitle || gameTitle.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '게임 제목을 입력해주세요.',
          suggestion: '검색할 게임의 정확한 제목을 입력하세요.'
        }
      }, { status: 400 });
    }

    console.log(`🎯 [BGG API] 게임 매칭 요청: "${gameTitle}"`);

    const gameData = await bggIntegrationService.searchAndMatchGame(gameTitle.trim());

    if (!gameData) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GAME_NOT_FOUND',
          message: `"${gameTitle}" 게임을 BGG에서 찾을 수 없습니다.`,
          suggestion: '게임 제목의 철자를 확인하거나 영어 제목으로 시도해보세요.'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: gameData,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        cacheHit: false
      }
    });

  } catch (error) {
    console.error(`❌ [BGG API] 매칭 오류:`, error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'MATCH_ERROR',
        message: 'BGG 게임 매칭 중 오류가 발생했습니다.',
        suggestion: '잠시 후 다시 시도해주세요.'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    }, { status: 500 });
  }
}

/**
 * BGG Hot 게임 목록 조회
 * GET /api/bgg-integration?action=hot
 */
async function handleHotGames(request: NextRequest): Promise<NextResponse<BGGApiResponse<GameWithBGGData[]>>> {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log(`🔥 [BGG API] Hot 게임 목록 요청 (limit: ${limit})`);

    if (limit < 1 || limit > 50) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_LIMIT',
          message: 'limit은 1-50 사이의 값이어야 합니다.',
          suggestion: 'limit 파라미터를 1-50 사이의 값으로 설정하세요.'
        }
      }, { status: 400 });
    }

    const hotGames = await bggIntegrationService.getHotGames();
    const limitedGames = hotGames.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: limitedGames,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        cacheHit: true // Hot 게임은 캐시될 가능성이 높음
      }
    });

  } catch (error) {
    console.error('❌ [BGG API] Hot 게임 조회 실패:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'HOT_GAMES_ERROR',
        message: 'Hot 게임 목록 조회 중 오류가 발생했습니다.',
        suggestion: '잠시 후 다시 시도해주세요.'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    }, { status: 500 });
  }
}

/**
 * BGG 기반 게임 추천
 * POST /api/bgg-integration?action=recommend
 */
async function handleRecommendations(request: NextRequest): Promise<NextResponse<BGGApiResponse<GameWithBGGData[]>>> {
  const startTime = Date.now();
  
  try {
    const body: BGGRecommendationRequest = await request.json();
    const { baseGameTitle, count = 5 } = body;

    if (!baseGameTitle || baseGameTitle.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '기준 게임 제목을 입력해주세요.',
          suggestion: '추천을 받고 싶은 게임의 제목을 입력하세요.'
        }
      }, { status: 400 });
    }

    if (count < 1 || count > 20) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_COUNT',
          message: 'count는 1-20 사이의 값이어야 합니다.',
          suggestion: 'count 파라미터를 1-20 사이의 값으로 설정하세요.'
        }
      }, { status: 400 });
    }

    console.log(`🎯 [BGG API] 게임 추천 요청: "${baseGameTitle}" (count: ${count})`);

    const recommendations = await bggIntegrationService.getGameRecommendations(
      baseGameTitle.trim(),
      count
    );

    return NextResponse.json({
      success: true,
      data: recommendations,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('❌ [BGG API] 게임 추천 실패:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'RECOMMENDATION_ERROR',
        message: '게임 추천 중 오류가 발생했습니다.',
        suggestion: '잠시 후 다시 시도해주세요.'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    }, { status: 500 });
  }
}

/**
 * BGG 데이터 동기화
 * POST /api/bgg-integration?action=sync
 */
async function handleSync(request: NextRequest): Promise<NextResponse<BGGApiResponse<BGGSyncResult>>> {
  const startTime = Date.now();
  
  try {
    const body: BGGSyncRequest = await request.json();
    const { forceSync = false } = body;

    console.log(`🔄 [BGG API] 데이터 동기화 요청 (forceSync: ${forceSync})`);

    // 동기화는 시간이 오래 걸릴 수 있으므로 비동기로 처리
    const syncResult = await bggIntegrationService.syncExistingGamesWithBGG();

    return NextResponse.json({
      success: true,
      data: syncResult,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('❌ [BGG API] 데이터 동기화 실패:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'SYNC_ERROR',
        message: '데이터 동기화 중 오류가 발생했습니다.',
        suggestion: '잠시 후 다시 시도하거나 관리자에게 문의하세요.'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    }, { status: 500 });
  }
}

/**
 * 서비스 통계 조회
 * GET /api/bgg-integration?action=stats
 */
async function handleStats(): Promise<NextResponse<BGGApiResponse<any>>> {
  const startTime = Date.now();
  
  try {
    const stats = bggIntegrationService.getStats();

    return NextResponse.json({
      success: true,
      data: stats,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('❌ [BGG API] 통계 조회 실패:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: '통계 조회 중 오류가 발생했습니다.'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    }, { status: 500 });
  }
}

/**
 * 메인 라우터
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'search':
        return await handleSearch(request);
      
      case 'match':
        return await handleMatch(request);
        
      case 'hot':
      case 'hot-games':
        return await handleHotGames(request);
        
      case 'recommendations':
        return await handleRecommendations(request);
        
      case 'sync':
        return await handleSync(request);
        
      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: '유효하지 않은 액션입니다.',
            suggestion: 'search, match, hot, recommendations, sync 중 하나를 선택하세요.'
          }
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[BGG API] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버 내부 오류가 발생했습니다.',
        suggestion: '잠시 후 다시 시도해주세요.'
      }
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'hot' || action === 'hot-games') {
    // GET 방식으로도 Hot 게임 목록 조회 가능
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    const mockRequest = {
      json: async () => ({ limit })
    } as NextRequest;

    return await handleHotGames(mockRequest);
  }

  return NextResponse.json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'GET 방식은 hot-games 액션만 지원됩니다.',
      suggestion: 'POST 방식을 사용하거나 action=hot을 추가하세요.'
    }
  }, { status: 405 });
} 
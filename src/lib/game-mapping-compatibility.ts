/**
 * 게임 매핑 시스템 호환성 래퍼 함수들
 * 기존 하드코딩된 함수들과의 호환성을 위한 deprecated 함수들
 * 
 * ⚠️ 주의: 이 함수들은 deprecated되었으며, 새로운 코드에서는 GameMappingService를 직접 사용하세요.
 */

import { GameMappingService } from './game-mapping-service';

/**
 * @deprecated Use GameMappingService.getInstance().getGameIdByTitle() instead
 * 기존 gemini.ts의 getGameIdFromTitle 함수와 호환
 */
export function getGameIdFromTitle(gameTitle: string): number | null {
  console.warn('⚠️ getGameIdFromTitle은 deprecated되었습니다. GameMappingService.getInstance().getGameIdByTitle()을 사용하세요.');
  
  try {
    const service = GameMappingService.getInstance();
    return service.getGameIdByTitle(gameTitle);
  } catch (error) {
    console.error('getGameIdFromTitle 호환성 래퍼 오류:', error);
    return null;
  }
}

/**
 * @deprecated Use GameMappingService.getInstance().getGameById() instead
 * 기존 rule-master-service.ts의 getGameTitleById 함수와 호환
 */
export function getGameTitleById(gameId: number | null): string {
  console.warn('⚠️ getGameTitleById는 deprecated되었습니다. GameMappingService.getInstance().getGameById()를 사용하세요.');
  
  if (!gameId) {
    return '일반 보드게임';
  }

  try {
    const service = GameMappingService.getInstance();
    const game = service.getGameById(gameId);
    return game?.titleKorean || `게임 ${gameId}`;
  } catch (error) {
    console.error('getGameTitleById 호환성 래퍼 오류:', error);
    return `게임 ${gameId}`;
  }
}

/**
 * @deprecated Use GameMappingService.getInstance().getGameByTitle() instead
 * 기존 research/route.ts의 getEnglishTitle 함수와 호환
 */
export async function getEnglishTitle(koreanTitle: string): Promise<string | null> {
  console.warn('⚠️ getEnglishTitle은 deprecated되었습니다. GameMappingService.getInstance().getGameByTitle()를 사용하세요.');
  
  try {
    const service = GameMappingService.getInstance();
    
    if (!service.isInitialized()) {
      await service.initialize();
    }

    const game = service.getGameByTitle(koreanTitle);
    return game?.titleEnglish || null;
  } catch (error) {
    console.error('getEnglishTitle 호환성 래퍼 오류:', error);
    return null;
  }
}

/**
 * @deprecated Use GameMappingService.getInstance().getGameById() instead
 * 기존 analytics-service.ts의 getGameName 함수와 호환
 */
export async function getGameName(gameId: number): Promise<string> {
  console.warn('⚠️ getGameName은 deprecated되었습니다. GameMappingService.getInstance().getGameById()를 사용하세요.');
  
  if (gameId === 0) {
    return '일반 질문';
  }

  try {
    const service = GameMappingService.getInstance();
    
    if (!service.isInitialized()) {
      await service.initialize();
    }

    const game = service.getGameById(gameId);
    return game?.titleKorean || `게임 ${gameId}`;
  } catch (error) {
    console.error('getGameName 호환성 래퍼 오류:', error);
    return `게임 ${gameId}`;
  }
}

/**
 * @deprecated Use GameMappingService.getInstance().getGameById() instead
 * 게임 ID가 용어 데이터를 가지고 있는지 확인 (기존 game-terms-service.ts 호환)
 */
export async function hasGameTermsData(gameId: number): Promise<boolean> {
  console.warn('⚠️ hasGameTermsData는 deprecated되었습니다. GameMappingService.getInstance().getGameById()를 사용하세요.');
  
  try {
    const service = GameMappingService.getInstance();
    
    if (!service.isInitialized()) {
      await service.initialize();
    }

    const game = service.getGameById(gameId);
    return game?.hasTermsData || false;
  } catch (error) {
    console.error('hasGameTermsData 호환성 래퍼 오류:', error);
    return false;
  }
}

/**
 * 마이그레이션 가이드 출력
 */
export function printMigrationGuide(): void {
  console.log(`
🔄 게임 매핑 시스템 마이그레이션 가이드

기존 함수들이 deprecated되었습니다. 새로운 GameMappingService를 사용하세요:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ 기존 (Deprecated):
   getGameIdFromTitle(title)
   
✅ 새로운 방식:
   const service = GameMappingService.getInstance();
   await service.initialize();
   const gameId = service.getGameIdByTitle(title);

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ 기존 (Deprecated):
   getGameTitleById(id)
   
✅ 새로운 방식:
   const service = GameMappingService.getInstance();
   const game = service.getGameById(id);
   const title = game?.titleKorean;

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 새로운 기능들:
   - 퍼지 검색: service.findSimilarGames(query)
   - 동적 별칭: service.addAlias({ gameId, alias })
   - 배치 조회: service.getGamesByIds([id1, id2, id3])
   - 지연 로딩: service.getGameWithTerms(gameId)
   - 캐시 통계: service.getCacheStats()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 더 많은 정보: src/lib/game-mapping-test.ts에서 사용 예제를 확인하세요.
  `);
}

// 개발 환경에서 마이그레이션 가이드 자동 출력
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔄 게임 매핑 시스템이 GameMappingService로 업그레이드되었습니다!');
  console.log('📋 마이그레이션 가이드를 보려면 printMigrationGuide()를 호출하세요.');
  
  // 전역에서 접근 가능하도록 설정
  (window as any).printMigrationGuide = printMigrationGuide;
} 
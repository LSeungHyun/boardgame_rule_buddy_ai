'use client';

import { useState, useCallback } from 'react';
import { GameMappingService } from '@/lib/game-mapping-service';
import type { GameSearchResult } from '@/types/game-mapping';

export interface GameCorrectionResult {
  needsCorrection: boolean;
  originalInput: string;
  suggestions: GameSearchResult[];
  autoCorrection?: {
    correctedName: string;
    confidence: number;
  };
}

export function useGameCorrection() {
  const [isChecking, setIsChecking] = useState(false);
  const [correctionResult, setCorrectionResult] = useState<GameCorrectionResult | null>(null);

  const checkGameCorrection = useCallback(async (input: string): Promise<GameCorrectionResult> => {
    setIsChecking(true);
    
    try {
      console.log('[GameCorrection] 게임 교정 시작:', input);
      const gameService = GameMappingService.getInstance({ debug: true });
      
      // 게임 서비스가 초기화되지 않았다면 초기화
      if (!gameService.isInitialized()) {
        console.log('[GameCorrection] GameMappingService 초기화 중...');
        await gameService.initialize();
        console.log('[GameCorrection] GameMappingService 초기화 완료');
      }

      // 정확한 매칭 먼저 확인
      const exactGame = gameService.getGameByTitle(input);
      if (exactGame) {
        return {
          needsCorrection: false,
          originalInput: input,
          suggestions: []
        };
      }

      // 퍼지 매칭으로 유사한 게임 찾기
      const similarGames = gameService.findSimilarGames(input, 0.3); // 낮은 임계값으로 더 많은 후보 검색

      if (similarGames.length === 0) {
        return {
          needsCorrection: true,
          originalInput: input,
          suggestions: []
        };
      }

      // 높은 신뢰도 매칭이 있는지 확인 (자동 교정 후보)
      const highConfidenceMatch = similarGames.find(result => result.confidence >= 0.8);
      
      const result: GameCorrectionResult = {
        needsCorrection: true,
        originalInput: input,
        suggestions: similarGames.slice(0, 5), // 상위 5개만 표시
        autoCorrection: highConfidenceMatch ? {
          correctedName: highConfidenceMatch.game.titleKorean,
          confidence: highConfidenceMatch.confidence
        } : undefined
      };

      setCorrectionResult(result);
      return result;

    } catch (error) {
      console.error('게임 교정 중 오류:', error);
      return {
        needsCorrection: false,
        originalInput: input,
        suggestions: []
      };
    } finally {
      setIsChecking(false);
    }
  }, []);

  const clearCorrection = useCallback(() => {
    setCorrectionResult(null);
  }, []);

  return {
    isChecking,
    correctionResult,
    checkGameCorrection,
    clearCorrection
  };
} 
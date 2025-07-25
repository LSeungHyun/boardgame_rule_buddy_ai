/**
 * Use Cases Layer - Initialize RuleMaster
 * 
 * 룰마스터 페이지 초기화를 위한 통합 Use Case입니다.
 * BGG API 검색과 AI 시스템 초기화를 병렬로 처리하고,
 * 결과에 따라 조건부 환영메시지를 생성합니다.
 * 
 * Clean Architecture의 Use Case 계층에 위치하여 비즈니스 로직을 담당합니다.
 */

import { CachedGameYearUseCase, GameYearResult } from './game-year-service';
import { findGameByExactName } from '@/features/games/api';

export interface InitializationStage {
  stage: 'starting' | 'checking_game' | 'initializing_ai' | 'generating_message' | 'completed';
  progress: number;
  message: string;
}

export interface WelcomeMessageContent {
  content: string;
  isWarningMessage: boolean;
  gameYear?: number;
  gameName?: string;
}

export interface RuleMasterInitResult {
  success: boolean;
  welcomeMessage: WelcomeMessageContent;
  gameInfo?: {
    name: string;
    year?: number;
    isRecentGame: boolean;
    source: 'database' | 'bgg' | 'unknown';
  };
  error?: string;
  duration: number;
}

/**
 * 룰마스터 초기화 Use Case
 * 사용자 경험을 위해 BGG 검색과 AI 초기화를 병렬로 처리합니다.
 */
export class InitializeRuleMasterUseCase {
  /**
   * 룰마스터 초기화 실행
   * @param gameName 게임명 (선택사항)
   * @param onStageUpdate 진행 상황 업데이트 콜백
   */
  static async execute(
    gameName?: string,
    onStageUpdate?: (stage: InitializationStage) => void
  ): Promise<RuleMasterInitResult> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 [InitializeRuleMaster] 초기화 시작:', { gameName });
      
      // Stage 1: 시작
      onStageUpdate?.({
        stage: 'starting',
        progress: 10,
        message: '룰버디를 준비하고 있어요...'
      });

      if (!gameName?.trim()) {
        // 게임명이 없으면 기본 환영메시지 반환
        return this.createDefaultWelcomeResult(startTime);
      }

      // Stage 2: 게임 정보 확인 및 BGG 검색 시작
      onStageUpdate?.({
        stage: 'checking_game',
        progress: 30,
        message: '게임 정보를 확인하고 있어요...'
      });

      // 🔥 병렬 처리: BGG API 검색과 AI 초기화
      const [bggResult, aiInitResult] = await Promise.allSettled([
        this.performBGGSearch(gameName),
        this.initializeAISystem(onStageUpdate)
      ]);

      // Stage 3: AI 초기화 (병렬 처리 중이므로 진행률 업데이트)
      onStageUpdate?.({
        stage: 'initializing_ai',
        progress: 70,
        message: 'AI 시스템을 초기화하고 있어요...'
      });

      // Stage 4: 메시지 생성
      onStageUpdate?.({
        stage: 'generating_message',
        progress: 90,
        message: '맞춤형 환영메시지를 준비하고 있어요...'
      });

      // 결과 처리
      const bggData = bggResult.status === 'fulfilled' ? bggResult.value : null;
      const aiSuccess = aiInitResult.status === 'fulfilled' ? aiInitResult.value : false;

      console.log('📊 [InitializeRuleMaster] 병렬 처리 완료:', {
        BGG성공: bggData?.success,
        AI성공: aiSuccess,
        게임년도: bggData?.data?.publishedYear,
        최신게임: bggData?.data?.isRecentGame
      });

      // 조건부 환영메시지 생성
      const welcomeMessage = this.createConditionalWelcomeMessage(gameName, bggData);

      // Stage 5: 완료
      onStageUpdate?.({
        stage: 'completed',
        progress: 100,
        message: '준비 완료!'
      });

      const duration = Date.now() - startTime;
      console.log(`✅ [InitializeRuleMaster] 초기화 완료 (${duration}ms)`);

      return {
        success: true,
        welcomeMessage,
        gameInfo: bggData?.data ? {
          name: bggData.data.gameName,
          year: bggData.data.publishedYear,
          isRecentGame: bggData.data.isRecentGame,
          source: 'bgg'
        } : { name: gameName, isRecentGame: false, source: 'unknown' },
        duration
      };

    } catch (error) {
      console.error('❌ [InitializeRuleMaster] 초기화 실패:', error);
      
      const duration = Date.now() - startTime;
      const fallbackMessage = this.createFallbackWelcomeMessage(gameName);

      return {
        success: false,
        welcomeMessage: fallbackMessage,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        duration
      };
    }
  }

  /**
   * BGG API 검색 수행
   */
  private static async performBGGSearch(gameName: string): Promise<GameYearResult | null> {
    try {
      console.log('🔍 [BGG 검색] 시작:', gameName);
      
      // 우선 DB에서 게임 확인
      const dbGame = await findGameByExactName(gameName);
      
      if (dbGame?.gameId) {
        console.log('📚 [BGG 검색] DB에서 게임 발견, BGG ID로 조회:', dbGame.title);
        return await CachedGameYearUseCase.execute(dbGame.title);
      } else {
        console.log('🌐 [BGG 검색] BGG 직접 검색:', gameName);
        return await CachedGameYearUseCase.execute(gameName);
      }
    } catch (error) {
      console.warn('⚠️ [BGG 검색] 오류:', error);
      return null;
    }
  }

  /**
   * AI 시스템 초기화 (모킹 - 실제로는 필요한 AI 초기화 로직)
   */
  private static async initializeAISystem(
    onStageUpdate?: (stage: InitializationStage) => void
  ): Promise<boolean> {
    try {
      // AI 시스템 초기화 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 800));
      
      console.log('🤖 [AI 초기화] 완료');
      return true;
    } catch (error) {
      console.warn('⚠️ [AI 초기화] 오류:', error);
      return false;
    }
  }

  /**
   * 조건부 환영메시지 생성
   */
  private static createConditionalWelcomeMessage(
    gameName: string,
    bggResult: GameYearResult | null
  ): WelcomeMessageContent {
    
    if (bggResult?.success && bggResult.data?.isRecentGame) {
      // 2024년 이후 게임: 경고가 포함된 환영메시지
      return {
        content: `🚨 **최신 게임 안내 (${bggResult.data.publishedYear}년 출시)**

안녕하세요! 🎲 저는 RuleBuddy(Beta)입니다. 🤖

**"${bggResult.data.gameName}"**은(는) ${bggResult.data.publishedYear}년에 출시된 최신 게임입니다.

⚠️ **중요 안내**: 최신 게임의 경우 룰 정보가 아직 충분히 학습되지 않아 **답변의 정확도가 낮을 수 있습니다.**

🎯 **더 정확한 정보를 원한다면:**
📖 공식 룰북을 직접 확인해 주세요
🌐 BGG(BoardGameGeek) 커뮤니티를 참고해 주세요  
👥 다른 플레이어들과 상의해 보세요

그래도 최선을 다해 도움을 드리겠습니다! 어떤 것이 궁금하신가요? 🎯`,
        isWarningMessage: true,
        gameYear: bggResult.data.publishedYear,
        gameName: bggResult.data.gameName
      };
    } else {
      // 2023년까지 게임 또는 BGG 검색 실패: 일반 환영메시지
      const gameDisplayName = bggResult?.data?.gameName || gameName;
      
      return {
        content: `안녕하세요! 🎲 저는 RuleBuddy(Beta)입니다. 🤖

**"${gameDisplayName}"**에 대해 궁금한 것이 있으시군요!

어떤 것을 도와드릴까요? 자유롭게 질문해 주세요.

💡 **예시 질문들:**
• 게임 준비는 어떻게 하나요?
• 턴 순서는 어떻게 되나요?
• 특정 규칙이 궁금해요
• 점수 계산 방법이 헷갈려요

${bggResult?.data?.publishedYear ? `📅 **${bggResult.data.publishedYear}년 출시 게임**으로 확인되어 정확한 정보를 제공할 수 있습니다!` : ''}`,
        isWarningMessage: false,
        gameYear: bggResult?.data?.publishedYear,
        gameName: gameDisplayName
      };
    }
  }

  /**
   * 기본 환영메시지 생성 (게임명 없음)
   */
  private static createDefaultWelcomeResult(startTime: number): RuleMasterInitResult {
    return {
      success: true,
      welcomeMessage: {
        content: `안녕하세요! 🎲 저는 RuleBuddy(Beta)입니다. 🤖

어떤 보드게임에 대해 알려드릴까요? 게임 이름을 입력해주세요.

예: "카탄", "스플렌더", "윙스팬", "아그리콜라" 등

💡 **Tip**: 다양한 보드게임에 대해 최선을 다해 도와드립니다!`,
        isWarningMessage: false
      },
      duration: Date.now() - startTime
    };
  }

  /**
   * 폴백 환영메시지 생성 (오류 시)
   */
  private static createFallbackWelcomeMessage(gameName?: string): WelcomeMessageContent {
    return {
      content: `안녕하세요! 🎲 저는 RuleBuddy(Beta)입니다. 🤖

${gameName ? `**"${gameName}"**에 대해 도와드리겠습니다!` : '어떤 보드게임에 대해 알려드릴까요?'}

⚠️ 일부 정보 확인 중 문제가 발생했지만, 최선을 다해 도움을 드리겠습니다!

궁금한 것이 있으시면 자유롭게 질문해 주세요. 🎯`,
      isWarningMessage: false,
      gameName
    };
  }
}

/**
 * 메시지 생성 유틸리티 함수들
 */
export class WelcomeMessageUtils {
  /**
   * 게임 년도 기준 메시지 타입 결정
   */
  static getMessageType(publishedYear?: number): 'recent' | 'established' | 'unknown' {
    if (!publishedYear) return 'unknown';
    
    const currentYear = new Date().getFullYear();
    return publishedYear >= currentYear - 1 ? 'recent' : 'established';
  }

  /**
   * 추천 질문 생성
   */
  static generateSuggestedQuestions(gameName: string, isRecentGame: boolean): string[] {
    const baseQuestions = [
      '게임 준비는 어떻게 하나요?',
      '턴 순서는 어떻게 되나요?',
      '승리 조건이 무엇인가요?'
    ];

    if (isRecentGame) {
      return [
        ...baseQuestions,
        '이 게임의 핵심 메커니즘은 무엇인가요?',
        '비슷한 게임과 비교해서 어떤 점이 다른가요?'
      ];
    }

    return [
      ...baseQuestions,
      '점수 계산 방법이 헷갈려요',
      '특정 카드나 액션이 궁금해요'
    ];
  }
} 
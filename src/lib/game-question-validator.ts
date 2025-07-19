'use client';

import gamesData from '@/data/games-list-365.json';

interface GameValidationResult {
  isValid: boolean;
  mentionedGame?: {
    id: number;
    title: string;
  };
  message?: string;
  suggestedAction?: string;
}

interface Game {
  id: number;
  title: string;
}

class GameQuestionValidator {
  private games: Game[] = [];

  constructor() {
    this.games = gamesData.games as Game[];
  }

  /**
   * 질문에서 게임명을 추출합니다
   */
  private extractGameMentions(question: string): Game[] {
    const normalizedQuestion = question.toLowerCase().replace(/\s+/g, '');
    const mentions: Game[] = [];

    for (const game of this.games) {
      const normalizedGameTitle = game.title.toLowerCase().replace(/\s+/g, '');
      
      // 정확한 매칭
      if (normalizedQuestion.includes(normalizedGameTitle)) {
        mentions.push(game);
        continue;
      }

      // 부분 매칭 (3글자 이상 게임명만)
      if (normalizedGameTitle.length >= 3) {
        if (normalizedQuestion.includes(normalizedGameTitle)) {
          mentions.push(game);
        }
      }
    }

    return mentions;
  }

  /**
   * 현재 게임과 질문 내용의 일치도를 검증합니다
   */
  public validateGameQuestion(currentGameId: number, question: string): GameValidationResult {
    // 현재 게임 정보 조회
    const currentGame = this.games.find(game => game.id === currentGameId);
    if (!currentGame) {
      return {
        isValid: false,
        message: "현재 게임 정보를 찾을 수 없습니다.",
        suggestedAction: "게임을 다시 선택해주세요."
      };
    }

    // 질문에서 게임명 추출
    const mentionedGames = this.extractGameMentions(question);
    
    // 다른 게임이 명시적으로 언급된 경우
    if (mentionedGames.length > 0) {
      const otherGameMentioned = mentionedGames.find(game => game.id !== currentGameId);
      
      if (otherGameMentioned) {
        return {
          isValid: false,
          mentionedGame: otherGameMentioned,
          message: `현재 ${currentGame.title} 채팅창에서 ${otherGameMentioned.title}에 대한 질문을 하셨습니다.`,
          suggestedAction: `${otherGameMentioned.title} 채팅창에서 질문해주세요.`
        };
      }
    }

    // 현재 게임과 일치하거나 일반적인 질문인 경우
    return {
      isValid: true
    };
  }

  /**
   * 게임 ID로 게임 정보를 조회합니다
   */
  public getGameById(gameId: number): Game | undefined {
    return this.games.find(game => game.id === gameId);
  }

  /**
   * 게임명으로 게임 정보를 조회합니다
   */
  public getGameByTitle(title: string): Game | undefined {
    const normalizedTitle = title.toLowerCase().replace(/\s+/g, '');
    return this.games.find(game => 
      game.title.toLowerCase().replace(/\s+/g, '') === normalizedTitle
    );
  }
}

// 싱글톤 인스턴스 생성
export const gameQuestionValidator = new GameQuestionValidator();

// 타입 익스포트
export type { GameValidationResult, Game }; 
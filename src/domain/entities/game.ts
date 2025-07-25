/**
 * Domain Layer - Game Entity
 * 
 * 게임의 핵심 비즈니스 로직과 규칙을 정의합니다.
 * 이 레이어는 다른 레이어에 의존하지 않으며, 순수한 비즈니스 로직만 포함합니다.
 */

// 게임 난이도 타입
export type GameDifficulty = 'Very Easy' | 'Easy' | 'Normal' | 'Semi-Hard' | 'Hard' | 'Extreme';

// 게임 카테고리 타입
export type GameCategoryType = 'all' | 'strategy' | 'card' | 'family' | 'puzzle' | 'party' | 'coop';

// 게임 엔티티
export interface GameEntity {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly difficulty: GameDifficulty;
  readonly categories: GameCategoryType[];
  readonly playerCount: {
    min: number;
    max: number;
  };
  readonly playingTime: {
    min: number;
    max: number;
  };
  readonly age: number;
  readonly publishedYear?: number; // BGG에서 가져온 출시년도
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// 게임 카테고리 엔티티
export interface GameCategoryEntity {
  readonly id: GameCategoryType;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
  readonly priority: number; // 표시 순서
}

// 게임 검색 조건
export interface GameSearchCriteria {
  readonly searchTerm?: string;
  readonly category?: GameCategoryType;
  readonly difficulty?: GameDifficulty;
  readonly playerCount?: number;
  readonly maxPlayingTime?: number;
  readonly minAge?: number;
}

// 게임 관련 비즈니스 규칙
export class GameBusinessRules {
  // 게임 제목으로 검색 (초성 포함)
  static matchesSearchTerm(game: GameEntity, searchTerm: string): boolean {
    if (!searchTerm.trim()) return true;
    
    const term = searchTerm.toLowerCase().trim();
    const title = game.title.toLowerCase();
    const description = game.description.toLowerCase();
    
    // 일반 텍스트 검색
    if (title.includes(term) || description.includes(term)) {
      return true;
    }
    
    // 초성 검색 로직
    return this.matchesInitialConsonants(game.title, term);
  }

  // 카테고리 필터링
  static matchesCategory(game: GameEntity, category: GameCategoryType): boolean {
    if (category === 'all') return true;
    return game.categories.includes(category);
  }

  // 난이도 필터링
  static matchesDifficulty(game: GameEntity, difficulty: GameDifficulty): boolean {
    return game.difficulty === difficulty;
  }

  // 플레이어 수 확인
  static supportsPlayerCount(game: GameEntity, playerCount: number): boolean {
    return playerCount >= game.playerCount.min && playerCount <= game.playerCount.max;
  }

  // 플레이 시간 확인
  static fitsPlayingTime(game: GameEntity, maxTime: number): boolean {
    return game.playingTime.min <= maxTime;
  }

  // 연령 제한 확인
  static appropriateForAge(game: GameEntity, age: number): boolean {
    return age >= game.age;
  }

  // 게임이 활성 상태인지 확인
  static isActive(game: GameEntity): boolean {
    return game.isActive;
  }

  /**
   * 최신 게임 여부 확인 (2024, 2025년 게임)
   */
  static isRecentGame(game: GameEntity): boolean {
    if (!game.publishedYear) return false;
    
    const currentYear = new Date().getFullYear();
    const recentYears = [2024, 2025];
    
    return recentYears.includes(game.publishedYear);
  }

  /**
   * 게임 년도 기반 경고 메시지 생성
   */
  static getYearWarningMessage(game: GameEntity): string | null {
    if (!this.isRecentGame(game)) return null;
    
    const year = game.publishedYear;
    
    return `⚠️ **최신 게임 안내**\n\n` +
           `**${game.title}**은(는) ${year}년에 출시된 최신 게임입니다.\n` +
           `최신 게임의 경우 룰 정보가 아직 충분히 수집되지 않아 ` +
           `**답변의 정확도가 낮을 수 있습니다**.\n\n` +
           `더 정확한 정보가 필요하시다면:\n` +
           `• 📖 공식 룰북을 확인해 주세요\n` +
           `• 🌐 BGG(BoardGameGeek) 커뮤니티를 참고해 주세요\n` +
           `• 👥 다른 플레이어들과 상의해 보세요`;
  }

  /**
   * 게임 년도 유효성 검사
   */
  static isValidPublishedYear(year: number): boolean {
    const currentYear = new Date().getFullYear();
    return year >= 1900 && year <= currentYear + 2; // 미래 2년까지 허용 (사전주문 등)
  }

  // 검색 조건에 맞는지 종합 확인
  static matchesCriteria(game: GameEntity, criteria: GameSearchCriteria): boolean {
    // 비활성 게임은 제외
    if (!this.isActive(game)) return false;

    // 검색어 확인
    if (criteria.searchTerm && !this.matchesSearchTerm(game, criteria.searchTerm)) {
      return false;
    }

    // 카테고리 확인
    if (criteria.category && !this.matchesCategory(game, criteria.category)) {
      return false;
    }

    // 난이도 확인
    if (criteria.difficulty && !this.matchesDifficulty(game, criteria.difficulty)) {
      return false;
    }

    // 플레이어 수 확인
    if (criteria.playerCount && !this.supportsPlayerCount(game, criteria.playerCount)) {
      return false;
    }

    // 플레이 시간 확인
    if (criteria.maxPlayingTime && !this.fitsPlayingTime(game, criteria.maxPlayingTime)) {
      return false;
    }

    // 연령 확인
    if (criteria.minAge && !this.appropriateForAge(game, criteria.minAge)) {
      return false;
    }

    return true;
  }

  // 초성 검색 로직 (한글 초성 추출)
  private static matchesInitialConsonants(title: string, searchTerm: string): boolean {
    const INITIAL_CONSONANTS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    
    // 검색어가 모두 초성인지 확인
    const isAllInitialConsonants = [...searchTerm].every(char => INITIAL_CONSONANTS.includes(char));
    if (!isAllInitialConsonants) return false;

    // 제목에서 초성 추출
    const titleInitials = [...title]
      .map(char => {
        const code = char.charCodeAt(0);
        // 한글 범위 확인 (가-힣)
        if (code >= 0xAC00 && code <= 0xD7A3) {
          const initialIndex = Math.floor((code - 0xAC00) / 588);
          return INITIAL_CONSONANTS[initialIndex];
        }
        return char.toLowerCase();
      })
      .join('');

    return titleInitials.includes(searchTerm);
  }

  // 게임 정렬 우선순위 계산
  static calculateRelevanceScore(game: GameEntity, criteria: GameSearchCriteria): number {
    let score = 0;

    // 검색어 일치도
    if (criteria.searchTerm) {
      const term = criteria.searchTerm.toLowerCase();
      const title = game.title.toLowerCase();
      
      if (title.startsWith(term)) score += 100;
      else if (title.includes(term)) score += 50;
      else if (this.matchesInitialConsonants(game.title, term)) score += 25;
    }

    // 카테고리 일치 보너스
    if (criteria.category && criteria.category !== 'all' && game.categories.includes(criteria.category)) {
      score += 30;
    }

    // 난이도 일치 보너스
    if (criteria.difficulty && game.difficulty === criteria.difficulty) {
      score += 20;
    }

    // 인기도 가중치 (임시로 ID 역순으로 계산)
    score += Math.max(0, 1000 - game.id) * 0.1;

    return score;
  }
}

// 기본 게임 카테고리 정의
export const DEFAULT_GAME_CATEGORIES: GameCategoryEntity[] = [
  {
    id: 'all',
    name: '전체',
    icon: '🎲',
    description: '모든 보드게임을 확인해보세요',
    priority: 0
  },
  {
    id: 'strategy',
    name: '전략게임',
    icon: '🧠',
    description: '깊이 있는 전략과 계획이 필요한 게임들',
    priority: 1
  },
  {
    id: 'card',
    name: '카드게임',
    icon: '🃏',
    description: '다양한 카드를 활용한 재미있는 게임들',
    priority: 2
  },
  {
    id: 'family',
    name: '가족게임',
    icon: '👨‍👩‍👧‍👦',
    description: '온 가족이 함께 즐길 수 있는 게임들',
    priority: 3
  },
  {
    id: 'puzzle',
    name: '퍼즐게임',
    icon: '🧩',
    description: '논리적 사고와 문제 해결이 필요한 게임들',
    priority: 4
  },
  {
    id: 'party',
    name: '파티게임',
    icon: '🎉',
    description: '많은 사람들과 함께 즐기는 신나는 게임들',
    priority: 5
  },
  {
    id: 'coop',
    name: '협력게임',
    icon: '🤝',
    description: '플레이어들이 함께 목표를 달성하는 게임들',
    priority: 6
  }
]; 
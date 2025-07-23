/**
 * 게임 카테고리 추론 서비스
 * Clean Architecture - Domain Layer
 */

import { GameCategoryType } from '../entities/game';
import { Game } from '@/types/game';

export interface GameCategoryInferenceService {
  inferCategories(game: Game): GameCategoryType[];
}

export class DefaultGameCategoryInferenceService implements GameCategoryInferenceService {
  private readonly categoryKeywords: Record<GameCategoryType, string[]> = {
    all: [], // 'all'은 특별한 카테고리이므로 키워드 없음
    strategy: [
      'strategy', '전략', 'empire', 'civilization', 'complex', 'resource management',
      'worker placement', 'area control', 'engine building', 'economic',
      'war', '전쟁', 'tactical', '전술', 'campaign', '캠페인'
    ],
    card: [
      'card', '카드', 'deck', 'hand', 'trick', 'collection', 'drafting',
      '덱', '핸드', 'ccg', 'tcg', 'living card'
    ],
    family: [
      'family', '가족', 'children', 'kids', 'simple', 'easy', 'beginner',
      'party', 'casual', '쉬운', '간단한', 'light'
    ],
    puzzle: [
      'puzzle', '퍼즐', 'logic', 'brain', 'thinking', 'deduction', 'mystery',
      '논리', '추리', 'abstract', 'mathematical'
    ],
    party: [
      'party', '파티', 'social', 'group', 'laugh', 'fun', 'humor',
      'communication', 'bluffing', 'negotiation', '협상', '블러핑'
    ],
    coop: [
      'coop', 'cooperative', '협력', 'together', 'team', 'collaborative',
      'vs system', 'against game', '팀', '공동'
    ]
  };

  private readonly difficultyMappings: Record<string, GameCategoryType[]> = {
    'Very Easy': ['family', 'party'],
    'Easy': ['family', 'card'],
    'Normal': ['strategy', 'card'],
    'Semi-Hard': ['strategy', 'puzzle'],
    'Hard': ['strategy', 'puzzle'],
    'Extreme': ['strategy']
  };

  /**
   * 게임 제목과 설명을 기반으로 카테고리를 추론합니다.
   */
  inferCategories(game: Game): GameCategoryType[] {
    const categories: GameCategoryType[] = [];
    const searchText = this.normalizeText(game.title + ' ' + game.description);

    // 1. 키워드 기반 카테고리 추론
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      if (category === 'all') continue; // 'all' 카테고리는 건너뜀

      const categoryKey = category as GameCategoryType;
      if (this.hasMatchingKeywords(searchText, keywords)) {
        categories.push(categoryKey);
      }
    }

    // 2. 난이도 기반 보조 추론
    if (game.difficulty) {
      const difficultyCategories = this.difficultyMappings[game.difficulty] || [];
      for (const category of difficultyCategories) {
        if (!categories.includes(category)) {
          categories.push(category);
        }
      }
    }

    // 3. 기본 카테고리 할당 (추론된 카테고리가 없는 경우)
    if (categories.length === 0) {
      // 난이도에 따른 기본 카테고리
      if (game.difficulty === 'Very Easy' || game.difficulty === 'Easy') {
        categories.push('family');
      } else {
        categories.push('strategy');
      }
    }

    // 4. 카테고리 수 제한 (최대 3개)
    return categories.slice(0, 3);
  }

  /**
   * 텍스트 정규화
   */
  private normalizeText(text: string): string {
    return text.toLowerCase()
      .replace(/[^\w\s가-힣]/g, ' ') // 특수문자 제거
      .replace(/\s+/g, ' ')         // 다중 공백 정리
      .trim();
  }

  /**
   * 키워드 매칭 확인
   */
  private hasMatchingKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => {
      const normalizedKeyword = this.normalizeText(keyword);
      return text.includes(normalizedKeyword);
    });
  }

  /**
   * 카테고리별 신뢰도 계산
   */
  calculateConfidence(game: Game, inferredCategories: GameCategoryType[]): Record<GameCategoryType, number> {
    const confidence: Record<GameCategoryType, number> = {} as Record<GameCategoryType, number>;
    const searchText = this.normalizeText(game.title + ' ' + game.description);

    for (const category of inferredCategories) {
      const keywords = this.categoryKeywords[category] || [];
      const matchCount = keywords.filter(keyword => 
        searchText.includes(this.normalizeText(keyword))
      ).length;

      // 매칭된 키워드 수와 전체 키워드 수를 기반으로 신뢰도 계산
      const baseConfidence = Math.min(matchCount / Math.max(keywords.length, 1), 1);
      
      // 난이도 기반 보정
      let difficultyBonus = 0;
      if (game.difficulty && this.difficultyMappings[game.difficulty]?.includes(category)) {
        difficultyBonus = 0.2;
      }

      confidence[category] = Math.min(baseConfidence + difficultyBonus, 1);
    }

    return confidence;
  }
} 
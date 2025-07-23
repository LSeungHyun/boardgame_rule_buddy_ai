/**
 * BGG 게임 데이터 도메인 엔티티
 * Clean Architecture: 외부 의존성 없는 순수 도메인 객체
 */

export interface BGGGameComplexity {
  readonly level: number; // 1-5 BGG 복잡도
  readonly isLight: boolean; // < 2
  readonly isMedium: boolean; // 2-4
  readonly isHeavy: boolean; // > 4
}

export interface BGGGameMetrics {
  readonly averageRating: number;
  readonly numVotes: number;
  readonly rank: number;
  readonly complexity: BGGGameComplexity;
}

export interface BGGGamePlayInfo {
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly playingTime: number;
  readonly minPlayTime: number;
  readonly maxPlayTime: number;
  readonly age: number;
}

export interface BGGGameMetadata {
  readonly id: number;
  readonly name: string;
  readonly yearPublished: number;
  readonly description: string;
  readonly thumbnail: string;
  readonly image: string;
  readonly publishers: string[];
  readonly designers: string[];
  readonly categories: string[];
  readonly mechanics: string[];
}

/**
 * BGG 게임 도메인 엔티티
 */
export class BGGGameEntity {
  constructor(
    private readonly metadata: BGGGameMetadata,
    private readonly playInfo: BGGGamePlayInfo,
    private readonly metrics: BGGGameMetrics
  ) {}

  get id(): number {
    return this.metadata.id;
  }

  get name(): string {
    return this.metadata.name;
  }

  get yearPublished(): number {
    return this.metadata.yearPublished;
  }

  get description(): string {
    return this.metadata.description;
  }

  get complexity(): BGGGameComplexity {
    return this.metrics.complexity;
  }

  get averageRating(): number {
    return this.metrics.averageRating;
  }

  get numVotes(): number {
    return this.metrics.numVotes;
  }

  get categories(): string[] {
    return [...this.metadata.categories];
  }

  get mechanics(): string[] {
    return [...this.metadata.mechanics];
  }

  get playingTime(): number {
    return this.playInfo.playingTime;
  }

  get playerRange(): { min: number; max: number } {
    return {
      min: this.playInfo.minPlayers,
      max: this.playInfo.maxPlayers
    };
  }

  /**
   * 답변 복잡도 수준 결정 (비즈니스 로직)
   */
  getAnswerComplexityLevel(): 'beginner' | 'intermediate' | 'advanced' {
    if (this.complexity.isLight) return 'beginner';
    if (this.complexity.isMedium) return 'intermediate';
    return 'advanced';
  }

  /**
   * 게임 설명 스타일 결정
   */
  getExplanationStyle(): 'simple' | 'detailed' | 'comprehensive' {
    if (this.complexity.level <= 2) return 'simple';
    if (this.complexity.level <= 4) return 'detailed';
    return 'comprehensive';
  }

  /**
   * 유사 게임 매칭을 위한 특성 벡터
   */
  getGameCharacteristics(): {
    complexityScore: number;
    categories: string[];
    mechanics: string[];
    playerCountScore: number;
    timeScore: number;
  } {
    return {
      complexityScore: this.complexity.level,
      categories: this.categories,
      mechanics: this.mechanics,
      playerCountScore: (this.playInfo.minPlayers + this.playInfo.maxPlayers) / 2,
      timeScore: this.playInfo.playingTime
    };
  }

  /**
   * 게임 품질 신뢰도 점수
   */
  getQualityScore(): number {
    // 평점, 투표수, 랭킹을 종합한 품질 점수
    const ratingScore = this.metrics.averageRating / 10; // 0-1
    const popularityScore = Math.min(this.metrics.numVotes / 10000, 1); // 0-1
    const rankScore = this.metrics.rank > 0 ? Math.max(0, 1 - this.metrics.rank / 10000) : 0;
    
    return (ratingScore * 0.5 + popularityScore * 0.3 + rankScore * 0.2);
  }

  /**
   * 초보자 친화도 점수
   */
  getBeginnerFriendliness(): number {
    const complexityFactor = Math.max(0, (5 - this.complexity.level) / 4); // 복잡도가 낮을수록 높음
    const timeFactor = Math.max(0, (120 - this.playInfo.playingTime) / 120); // 시간이 짧을수록 높음
    const ageFactor = Math.max(0, (14 - this.playInfo.age) / 14); // 연령이 낮을수록 높음
    
    return (complexityFactor * 0.5 + timeFactor * 0.3 + ageFactor * 0.2);
  }

  /**
   * 게임 메타데이터 요약
   */
  getSummary(): string {
    const complexity = this.getAnswerComplexityLevel();
    const playerRange = `${this.playInfo.minPlayers}-${this.playInfo.maxPlayers}명`;
    const time = `${this.playInfo.playingTime}분`;
    
    return `${this.name} (${this.yearPublished}) - ${complexity} 수준, ${playerRange}, ${time}`;
  }

  /**
   * 팩토리 메서드: BGG API 응답에서 엔티티 생성
   */
  static fromBGGApiData(data: any): BGGGameEntity {
    const complexity: BGGGameComplexity = {
      level: data.complexity || 0,
      isLight: (data.complexity || 0) < 2,
      isMedium: (data.complexity || 0) >= 2 && (data.complexity || 0) <= 4,
      isHeavy: (data.complexity || 0) > 4
    };

    const metadata: BGGGameMetadata = {
      id: data.id,
      name: data.name,
      yearPublished: data.yearPublished || 0,
      description: data.description || '',
      thumbnail: data.thumbnail || '',
      image: data.image || '',
      publishers: data.publishers || [],
      designers: data.designers || [],
      categories: data.categories || [],
      mechanics: data.mechanics || []
    };

    const playInfo: BGGGamePlayInfo = {
      minPlayers: data.minPlayers || 1,
      maxPlayers: data.maxPlayers || 1,
      playingTime: data.playingTime || 0,
      minPlayTime: data.minPlayTime || 0,
      maxPlayTime: data.maxPlayTime || 0,
      age: data.age || 0
    };

    const metrics: BGGGameMetrics = {
      averageRating: data.averageRating || 0,
      numVotes: data.numVotes || 0,
      rank: data.rank || 0,
      complexity
    };

    return new BGGGameEntity(metadata, playInfo, metrics);
  }
} 
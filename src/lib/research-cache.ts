/**
 * 리서치 결과 캐싱 시스템 - LRU 캐시 기반 성능 최적화
 * SMART-RESEARCH-IMPLEMENTATION.md 기반 구현
 */

import { LRUCache } from 'lru-cache';

export interface CachedResearchResult {
  query: string;
  gameTitle: string;
  searchResults: SearchResult[];
  summary: string;
  sources: string[];
  timestamp: number;
  hitCount: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevanceScore: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  oldestEntry: number;
  newestEntry: number;
}

class ResearchCacheManager {
  private cache: LRUCache<string, CachedResearchResult>;
  private hitCount = 0;
  private missCount = 0;

  constructor() {
    // LRU 캐시 설정 (4시간 TTL, 최대 100개 항목)
    this.cache = new LRUCache({
      max: 100,
      ttl: 4 * 60 * 60 * 1000, // 4시간 (milliseconds)
      allowStale: false,
      updateAgeOnGet: true, // 접근 시 TTL 갱신
      updateAgeOnHas: false
    });
  }

  /**
   * 캐시 키 생성 (게임 제목 + 질문 내용 기반)
   */
  private generateCacheKey(gameTitle: string, question: string): string {
    // 질문을 정규화하여 유사한 질문들을 같은 키로 매핑
    const normalizedQuestion = this.normalizeQuestion(question);
    const gameKey = gameTitle.toLowerCase().replace(/\s+/g, '_');
    
    return `${gameKey}:${normalizedQuestion}`;
  }

  /**
   * 질문 정규화 (캐시 효율성 향상)
   */
  private normalizeQuestion(question: string): string {
    return question
      .toLowerCase()
      .replace(/[?!.,]/g, '') // 구두점 제거
      .replace(/\s+/g, ' ') // 연속 공백 단일화
      .trim()
      .slice(0, 100); // 최대 100자로 제한
  }

  /**
   * 캐시에서 리서치 결과 조회
   */
  get(gameTitle: string, question: string): CachedResearchResult | null {
    const key = this.generateCacheKey(gameTitle, question);
    const cached = this.cache.get(key);
    
    if (cached) {
      this.hitCount++;
      cached.hitCount++;
      
      // 개발 환경에서 캐시 히트 로깅
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 캐시 히트: ${key}`);
      }
      
      return cached;
    }
    
    this.missCount++;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`❌ 캐시 미스: ${key}`);
    }
    
    return null;
  }

  /**
   * 리서치 결과를 캐시에 저장
   */
  set(
    gameTitle: string, 
    question: string, 
    searchResults: SearchResult[], 
    summary: string,
    sources: string[]
  ): void {
    const key = this.generateCacheKey(gameTitle, question);
    
    const cacheEntry: CachedResearchResult = {
      query: question,
      gameTitle,
      searchResults,
      summary,
      sources,
      timestamp: Date.now(),
      hitCount: 0
    };
    
    this.cache.set(key, cacheEntry);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`💾 캐시 저장: ${key}`);
    }
  }

  /**
   * 특정 게임의 모든 캐시 항목 조회
   */
  getByGame(gameTitle: string): CachedResearchResult[] {
    const gameKey = gameTitle.toLowerCase().replace(/\s+/g, '_');
    const results: CachedResearchResult[] = [];
    
    for (const [key, value] of this.cache.entries()) {
      if (key.startsWith(`${gameKey}:`)) {
        results.push(value);
      }
    }
    
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.entries());
    const timestamps = entries.map(([, value]) => value.timestamp);
    
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      hitRate: this.hitCount + this.missCount > 0 
        ? this.hitCount / (this.hitCount + this.missCount) 
        : 0,
      totalHits: this.hitCount,
      totalMisses: this.missCount,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  /**
   * 인기 있는 질문 조회 (히트 수 기준)
   */
  getPopularQueries(limit = 10): CachedResearchResult[] {
    const entries = Array.from(this.cache.values());
    
    return entries
      .filter(entry => entry.hitCount > 0)
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit);
  }

  /**
   * 최근 검색 결과 조회
   */
  getRecentQueries(limit = 10): CachedResearchResult[] {
    const entries = Array.from(this.cache.values());
    
    return entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 캐시 상태 리포트 생성
   */
  generateCacheReport(): string {
    const stats = this.getStats();
    const popular = this.getPopularQueries(5);
    
    return `
🗄️ 리서치 캐시 상태 리포트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 캐시 현황: ${stats.size}/${stats.maxSize} (${(stats.size/stats.maxSize*100).toFixed(1)}%)
⚡ 적중률: ${(stats.hitRate * 100).toFixed(1)}% (${stats.totalHits}/${stats.totalHits + stats.totalMisses})
🔥 인기 질문:
${popular.map((item, i) => `  ${i+1}. [${item.gameTitle}] ${item.query.slice(0, 50)}... (${item.hitCount}회)`).join('\n')}
    `.trim();
  }

  /**
   * 특정 게임의 캐시 삭제
   */
  clearGameCache(gameTitle: string): number {
    const gameKey = gameTitle.toLowerCase().replace(/\s+/g, '_');
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${gameKey}:`)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * 전체 캐시 삭제
   */
  clearAll(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * 만료된 캐시 정리 (수동 정리)
   */
  cleanup(): number {
    const beforeSize = this.cache.size;
    this.cache.purgeStale();
    return beforeSize - this.cache.size;
  }

  /**
   * 캐시 효율성 분석
   */
  analyzeEfficiency(): {
    shouldIncrease: boolean;
    shouldDecrease: boolean;
    recommendation: string;
  } {
    const stats = this.getStats();
    
    if (stats.hitRate < 0.4) {
      return {
        shouldIncrease: false,
        shouldDecrease: true,
        recommendation: '캐시 적중률이 낮습니다. 질문 정규화 로직을 개선하거나 TTL을 줄여보세요.'
      };
    }
    
    if (stats.hitRate > 0.8 && stats.size >= stats.maxSize * 0.9) {
      return {
        shouldIncrease: true,
        shouldDecrease: false,
        recommendation: '캐시 적중률이 높습니다. 캐시 크기를 늘려서 더 많은 결과를 저장할 수 있습니다.'
      };
    }
    
    return {
      shouldIncrease: false,
      shouldDecrease: false,
      recommendation: '캐시가 효율적으로 동작하고 있습니다.'
    };
  }
}

// 싱글톤 인스턴스 생성
export const researchCache = new ResearchCacheManager(); 
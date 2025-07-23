/**
 * BGG (BoardGameGeek) API 어댑터
 * Context7을 활용한 BGG API 연동 및 데이터 분석
 */

import { mcp_context7_resolve_library_id, mcp_context7_get_library_docs } from '@/lib/context7-client';
import { XMLParser } from 'fast-xml-parser';

export interface BGGGameBasicInfo {
  id: number;
  name: string;
  yearPublished: number;
  minPlayers: number;
  maxPlayers: number;
  playingTime: number;
  minPlayTime: number;
  maxPlayTime: number;
  age: number;
  description: string;
  thumbnail: string;
  image: string;
  averageRating: number;
  numVotes: number;
  rank: number;
  complexity: number;
  publishers: string[];
  designers: string[];
  categories: string[];
  mechanics: string[];
}

export interface BGGSearchResult {
  id: number;
  name: string;
  yearPublished: number;
  thumbnail?: string;
  type?: string;
}

export interface BGGHotItem {
  id: number;
  rank: number;
  name: string;
  yearPublished: number;
  thumbnail: string;
}

export interface BGGUserCollection {
  gameId: number;
  gameName: string;
  owned: boolean;
  rating?: number;
}

export class BGGApiError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(message: string, retryable: boolean, code: string = 'BGG_API_ERROR') {
    super(message);
    this.name = 'BGGApiError';
    this.code = code;
    this.retryable = retryable;
  }
}

export class BGGApiAdapter {
  private readonly BASE_URL = 'https://api.geekdo.com/xmlapi2';
  private readonly parser: XMLParser;
  private lastRequestTime = 0;
  private readonly REQUEST_DELAY = 1000; // BGG API 호출 간 최소 대기시간 (1초)

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true
    });
  }

  /**
   * BGG API 호출 전 속도 제한 적용
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      const waitTime = this.REQUEST_DELAY - timeSinceLastRequest;
      console.log(`⏳ [BGG API] Rate limit - ${waitTime}ms 대기`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * BGG API HTTP 요청 래퍼
   */
  private async makeRequest(url: string, maxRetries = 3): Promise<string> {
    await this.enforceRateLimit();

    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🌐 [BGG API] 요청 (시도 ${attempt}/${maxRetries}): ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'BGGRuleMaster/1.0 (+https://ruleemaster.com)',
            'Accept': 'application/xml',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xmlText = await response.text();
        
        if (!xmlText || xmlText.trim().length === 0) {
          throw new Error('Empty response from BGG API');
        }

        console.log(`✅ [BGG API] 응답 성공 (${xmlText.length} bytes)`);
        return xmlText;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ [BGG API] 요청 실패 (시도 ${attempt}/${maxRetries}):`, lastError.message);

        if (attempt < maxRetries) {
          const backoffDelay = attempt * 2000; // 2초, 4초, 6초...
          console.log(`⏳ [BGG API] ${backoffDelay}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }

    throw new BGGApiError(`BGG API 요청 실패 (${maxRetries}회 시도 후): ${lastError.message}`, false);
  }

  /**
   * Context7을 통한 BGG API 문서 검색 및 분석
   */
  async getBGGDocumentation(topic: string): Promise<string | null> {
    try {
      // BGG API 관련 문서 검색
      const libraryId = await this.resolveBGGLibraryId();
      if (!libraryId) {
        console.warn('BGG 라이브러리 ID를 찾을 수 없습니다.');
        return null;
      }

      const docs = await mcp_context7_get_library_docs({
        context7CompatibleLibraryID: libraryId,
        topic: topic,
        tokens: 5000
      });

      return docs || null;
    } catch (error) {
      console.error('BGG 문서 검색 실패:', error);
      return null;
    }
  }

  /**
   * Context7에서 BGG 관련 라이브러리 ID 찾기
   */
  private async resolveBGGLibraryId(): Promise<string | null> {
    try {
      const result = await mcp_context7_resolve_library_id({
        libraryName: 'BoardGameGeek API'
      });
      
      // BGG API 관련 라이브러리 찾기
      const bggLibrary = result.libraries?.find(lib => 
        lib.name.toLowerCase().includes('boardgamegeek') ||
        lib.name.toLowerCase().includes('bgg') ||
        lib.description.toLowerCase().includes('boardgamegeek')
      );

      return bggLibrary?.id || null;
    } catch (error) {
      console.error('BGG 라이브러리 ID 해결 실패:', error);
      return null;
    }
  }

  /**
   * 게임 검색 (여러 결과 반환)
   * @param query 검색어
   * @param exact 정확한 매치만 반환할지 여부
   * @returns 검색 결과 배열
   */
  async searchGames(query: string, exact = false): Promise<BGGSearchResult[]> {
    if (!query || query.trim().length === 0) {
      throw new BGGApiError('검색어가 필요합니다.', false);
    }

    const trimmedQuery = query.trim();
    const exactParam = exact ? '&exact=1' : '';
    const url = `${this.BASE_URL}/search?query=${encodeURIComponent(trimmedQuery)}&type=boardgame${exactParam}`;

    try {
      console.log(`🔍 [BGG API] 게임 검색: "${trimmedQuery}" (exact: ${exact})`);

      const xmlResponse = await this.makeRequest(url);
      const parsedData = this.parser.parse(xmlResponse);

      if (!parsedData.items) {
        console.log(`📭 [BGG API] 검색 결과 없음: "${trimmedQuery}"`);
        return [];
      }

      // items가 단일 객체인 경우 배열로 변환
      const items = Array.isArray(parsedData.items.item) 
        ? parsedData.items.item 
        : parsedData.items.item 
          ? [parsedData.items.item] 
          : [];

      const searchResults: BGGSearchResult[] = items.map((item: any) => ({
        id: parseInt(item['@_id'], 10),
        name: item.name ? (Array.isArray(item.name) ? item.name[0]['@_value'] : item.name['@_value']) : 'Unknown',
        yearPublished: item.yearpublished ? parseInt(item.yearpublished['@_value'], 10) : 0,
        type: item['@_type'] || 'boardgame',
        thumbnail: undefined // 검색 API는 썸네일을 제공하지 않음
      }));

      console.log(`✅ [BGG API] 검색 완료: ${searchResults.length}개 결과 발견`);
      
      // 결과를 관련성 순으로 정렬 (정확한 매치 우선, 그 다음 연도 순)
      return this.sortSearchResults(searchResults, trimmedQuery);

    } catch (error) {
      if (error instanceof BGGApiError) {
        throw error;
      }
      
      console.error(`❌ [BGG API] 검색 오류:`, error);
      throw new BGGApiError(
        `게임 검색 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`,
        true
      );
    }
  }

  /**
   * 검색 결과를 관련성 순으로 정렬
   */
  private sortSearchResults(results: BGGSearchResult[], query: string): BGGSearchResult[] {
    const lowercaseQuery = query.toLowerCase();

    return results.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // 1. 정확한 매치 우선
      const aExact = aName === lowercaseQuery;
      const bExact = bName === lowercaseQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // 2. 시작 문자 매치 우선
      const aStarts = aName.startsWith(lowercaseQuery);
      const bStarts = bName.startsWith(lowercaseQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // 3. 포함 여부
      const aContains = aName.includes(lowercaseQuery);
      const bContains = bName.includes(lowercaseQuery);
      if (aContains && !bContains) return -1;
      if (!aContains && bContains) return 1;

      // 4. 최신 게임 우선 (연도가 높을수록)
      return b.yearPublished - a.yearPublished;
    });
  }

  /**
   * 게임 상세 정보 조회 (BGG XML API v2)
   */
  async getGameDetails(gameId: number): Promise<BGGGameBasicInfo | null> {
    try {
      await this.enforceRateLimit();
      
      const url = `${this.BASE_URL}/thing?id=${gameId}&type=boardgame&stats=1`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`BGG API 상세 조회 실패: ${response.status}`);
      }

      const xmlData = await response.text();
      const parsed = this.parser.parse(xmlData);
      
      if (!parsed.items?.item) {
        return null;
      }

      const item = parsed.items.item;
      const stats = item.statistics?.ratings;
      
      // name 필드 처리 (primary name 찾기)
      let gameName = '';
      if (Array.isArray(item.name)) {
        const primaryName = item.name.find((name: any) => name['@_type'] === 'primary');
        gameName = primaryName ? primaryName['@_value'] : item.name[0]['@_value'];
      } else {
        gameName = item.name['@_value'];
      }

      return {
        id: parseInt(item['@_id']),
        name: gameName,
        yearPublished: parseInt(item.yearpublished?.['@_value'] || '0'),
        minPlayers: parseInt(item.minplayers?.['@_value'] || '0'),
        maxPlayers: parseInt(item.maxplayers?.['@_value'] || '0'),
        playingTime: parseInt(item.playingtime?.['@_value'] || '0'),
        minPlayTime: parseInt(item.minplaytime?.['@_value'] || '0'),
        maxPlayTime: parseInt(item.maxplaytime?.['@_value'] || '0'),
        age: parseInt(item.age?.['@_value'] || '0'),
        description: item.description || '',
        thumbnail: item.thumbnail || '',
        image: item.image || '',
        averageRating: parseFloat(stats?.average?.['@_value'] || '0'),
        numVotes: parseInt(stats?.usersrated?.['@_value'] || '0'),
        rank: parseInt(stats?.ranks?.rank?.['@_value'] || '0'),
        complexity: parseFloat(stats?.averageweight?.['@_value'] || '0'),
        publishers: this.extractLinkedItems(item.link, 'boardgamepublisher'),
        designers: this.extractLinkedItems(item.link, 'boardgamedesigner'),
        categories: this.extractLinkedItems(item.link, 'boardgamecategory'),
        mechanics: this.extractLinkedItems(item.link, 'boardgamemechanic')
      };
    } catch (error) {
      console.error('BGG 게임 상세 조회 실패:', error);
      return null;
    }
  }

  /**
   * Hot List 조회 (인기 게임 목록)
   */
  async getHotGames(): Promise<BGGHotItem[]> {
    try {
      await this.enforceRateLimit();
      
      const url = `${this.BASE_URL}/hot?type=boardgame`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`BGG Hot List 조회 실패: ${response.status}`);
      }

      const xmlData = await response.text();
      const parsed = this.parser.parse(xmlData);
      
      if (!parsed.items?.item) {
        return [];
      }

      const items = Array.isArray(parsed.items.item) ? parsed.items.item : [parsed.items.item];
      
      return items.map((item: any) => ({
        id: parseInt(item['@_id']),
        rank: parseInt(item['@_rank']),
        name: item.name?.['@_value'] || '',
        yearPublished: parseInt(item.yearpublished?.['@_value'] || '0'),
        thumbnail: item.thumbnail?.['@_value'] || ''
      }));
    } catch (error) {
      console.error('BGG Hot List 조회 실패:', error);
      return [];
    }
  }

  /**
   * 사용자 컬렉션 조회
   */
  async getUserCollection(username: string, options?: {
    owned?: boolean;
    wishlist?: boolean;
    wanttoplay?: boolean;
  }): Promise<BGGUserCollection[]> {
    try {
      await this.enforceRateLimit();
      
      let url = `${this.BASE_URL}/collection?username=${encodeURIComponent(username)}&stats=1`;
      
      if (options?.owned) url += '&own=1';
      if (options?.wishlist) url += '&wishlist=1';
      if (options?.wanttoplay) url += '&wanttoplay=1';
      
      const response = await fetch(url);
      
      if (response.status === 202) {
        // BGG에서 컬렉션을 처리 중 - 잠시 후 재시도 필요
        console.log('BGG 컬렉션 처리 중... 잠시 후 재시도하세요.');
        return [];
      }
      
      if (!response.ok) {
        throw new Error(`BGG 컬렉션 조회 실패: ${response.status}`);
      }

      const xmlData = await response.text();
      const parsed = this.parser.parse(xmlData);
      
      if (!parsed.items?.item) {
        return [];
      }

      const items = Array.isArray(parsed.items.item) ? parsed.items.item : [parsed.items.item];
      
      return items.map((item: any) => ({
        gameId: parseInt(item['@_objectid']),
        gameName: item.name?.['#text'] || '',
        owned: item.status?.['@_own'] === '1',
        rating: item.stats?.rating?.['@_value'] ? parseFloat(item.stats.rating['@_value']) : undefined,
        plays: item.numplays ? parseInt(item.numplays['@_value']) : undefined,
        wishlist: item.status?.['@_wishlist'] === '1'
      }));
    } catch (error) {
      console.error('BGG 사용자 컬렉션 조회 실패:', error);
      return [];
    }
  }

  /**
   * 여러 게임의 상세 정보를 일괄 조회 (최대 20개)
   */
  async getMultipleGameDetails(gameIds: number[]): Promise<BGGGameBasicInfo[]> {
    if (gameIds.length === 0) return [];
    
    // BGG API는 한 번에 최대 20개까지 조회 가능
    const chunks = this.chunkArray(gameIds, 20);
    const results: BGGGameBasicInfo[] = [];
    
    for (const chunk of chunks) {
      try {
        await this.enforceRateLimit();
        
        const url = `${this.BASE_URL}/thing?id=${chunk.join(',')}&type=boardgame&stats=1`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.warn(`BGG API 일괄 조회 실패: ${response.status} (게임 IDs: ${chunk.join(',')})`);
          continue;
        }

        const xmlData = await response.text();
        const parsed = this.parser.parse(xmlData);
        
        if (!parsed.items?.item) {
          continue;
        }

        const items = Array.isArray(parsed.items.item) ? parsed.items.item : [parsed.items.item];
        
        for (const item of items) {
          const gameDetail = this.parseGameItem(item);
          if (gameDetail) {
            results.push(gameDetail);
          }
        }
      } catch (error) {
        console.error(`BGG 일괄 조회 실패 (chunk: ${chunk.join(',')}):`, error);
      }
    }
    
    return results;
  }

  /**
   * 개별 게임 아이템 파싱
   */
  private parseGameItem(item: any): BGGGameBasicInfo | null {
    try {
      const stats = item.statistics?.ratings;
      
      // name 필드 처리
      let gameName = '';
      if (Array.isArray(item.name)) {
        const primaryName = item.name.find((name: any) => name['@_type'] === 'primary');
        gameName = primaryName ? primaryName['@_value'] : item.name[0]['@_value'];
      } else {
        gameName = item.name['@_value'];
      }

      return {
        id: parseInt(item['@_id']),
        name: gameName,
        yearPublished: parseInt(item.yearpublished?.['@_value'] || '0'),
        minPlayers: parseInt(item.minplayers?.['@_value'] || '0'),
        maxPlayers: parseInt(item.maxplayers?.['@_value'] || '0'),
        playingTime: parseInt(item.playingtime?.['@_value'] || '0'),
        minPlayTime: parseInt(item.minplaytime?.['@_value'] || '0'),
        maxPlayTime: parseInt(item.maxplaytime?.['@_value'] || '0'),
        age: parseInt(item.age?.['@_value'] || '0'),
        description: item.description || '',
        thumbnail: item.thumbnail || '',
        image: item.image || '',
        averageRating: parseFloat(stats?.average?.['@_value'] || '0'),
        numVotes: parseInt(stats?.usersrated?.['@_value'] || '0'),
        rank: parseInt(stats?.ranks?.rank?.['@_value'] || '0'),
        complexity: parseFloat(stats?.averageweight?.['@_value'] || '0'),
        publishers: this.extractLinkedItems(item.link, 'boardgamepublisher'),
        designers: this.extractLinkedItems(item.link, 'boardgamedesigner'),
        categories: this.extractLinkedItems(item.link, 'boardgamecategory'),
        mechanics: this.extractLinkedItems(item.link, 'boardgamemechanic')
      };
    } catch (error) {
      console.error('게임 아이템 파싱 실패:', error);
      return null;
    }
  }

  /**
   * linked items 추출 (출판사, 디자이너, 카테고리, 메카닉 등)
   */
  private extractLinkedItems(linkData: any, type: string): string[] {
    if (!linkData) return [];
    
    const links = Array.isArray(linkData) ? linkData : [linkData];
    
    return links
      .filter((link: any) => link['@_type'] === type)
      .map((link: any) => link['@_value'])
      .filter(Boolean);
  }

  /**
   * 배열을 지정된 크기로 분할
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * BGG API 속도 제한 준수를 위한 지연
   */
  private async rateLimitWait(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, this.REQUEST_DELAY); // 이제 enforceRateLimit에서 처리
    });
  }

  /**
   * 게임 제목을 기반으로 BGG에서 자동 검색 및 매칭
   */
  async findGameByTitle(title: string): Promise<BGGGameBasicInfo | null> {
    try {
      // 1. 정확한 제목으로 검색
      let searchResults = await this.searchGames(title, true);
      
      // 2. 정확한 검색 결과가 없으면 유사 검색
      if (searchResults.length === 0) {
        searchResults = await this.searchGames(title, false);
      }
      
      // 3. 검색 결과가 없으면 null 반환
      if (searchResults.length === 0) {
        return null;
      }
      
      // 4. 첫 번째 결과의 상세 정보 조회
      const bestMatch = searchResults[0];
      return await this.getGameDetails(bestMatch.id);
      
    } catch (error) {
      console.error('게임 제목 기반 검색 실패:', error);
      return null;
    }
  }
}

export const bggApiAdapter = new BGGApiAdapter(); 
/**
 * Infrastructure Layer - BGG API Gateway
 * 
 * BoardGameGeek XML API v2를 통해 게임 정보를 가져오는 외부 서비스 게이트웨이입니다.
 * Clean Architecture의 인프라 레이어에 위치하여 외부 API 의존성을 격리합니다.
 */

export interface BggGameInfo {
  id: number;
  name: string;
  publishedYear?: number;
  description?: string;
  minPlayers?: number;
  maxPlayers?: number;
  playingTime?: number;
  minAge?: number;
}

export interface BggApiError {
  type: 'network' | 'parsing' | 'not_found' | 'rate_limit' | 'api_error';
  message: string;
  originalError?: unknown;
}

/**
 * BGG API v2 게이트웨이
 * Rate limiting을 준수하며 XML 파싱을 통해 게임 정보를 제공합니다.
 */
export class BggApiGateway {
  private static readonly BASE_URL = 'https://boardgamegeek.com/xmlapi2';
  private static readonly PROXY_URL = '/api/bgg-proxy'; // CORS 우회용 프록시
  /**
   * Rate limiting 제거 - 병렬 처리에서는 개별 지연으로 대체
   * (각 요청에서 랜덤 지연 적용)
   */
  private static readonly RATE_LIMIT_MS = 5000; // BGG 권장 5초 간격 (참고용)
  private static lastRequestTime = 0;

  /**
   * 게임 ID로 BGG에서 게임 정보 조회
   */
  static async getGameInfo(gameId: number): Promise<BggGameInfo | BggApiError> {
    try {
      console.log(`[BggApiGateway] 게임 정보 조회 시작: ID ${gameId}`);

      // 프록시를 통해 BGG API 호출 (CORS 우회)
      const url = `${this.PROXY_URL}?type=thing&id=${gameId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          return {
            type: 'rate_limit',
            message: 'BGG API 요청 한도 초과. 잠시 후 다시 시도해 주세요.'
          };
        }
        
        return {
          type: 'api_error',
          message: `BGG API 오류: ${response.status} ${response.statusText}`
        };
      }

      const xmlText = await response.text();
      return this.parseGameXml(xmlText, gameId);

    } catch (error) {
      console.error('[BggApiGateway] 게임 정보 조회 실패:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          type: 'network',
          message: '네트워크 연결 오류. BGG API에 접근할 수 없습니다.',
          originalError: error
        };
      }

      return {
        type: 'api_error',
        message: '알 수 없는 오류가 발생했습니다.',
        originalError: error
      };
    }
  }

  /**
   * 게임 이름으로 BGG에서 검색 (게임 ID 획득용) - 병렬 검색 전략
   */
  static async searchGameByName(gameName: string): Promise<{ id: number; name: string; year?: number }[] | BggApiError> {
    try {
      console.log(`[BggApiGateway] 병렬 검색 시작: "${gameName}"`);

      const patterns = this.generateSearchPatterns(gameName);
      console.log(`[BggApiGateway] 생성된 검색 패턴 ${patterns.length}개:`, patterns);

      // 병렬 검색 실행
      const searchResults = await this.executeParallelSearch(patterns);
      
      if (searchResults.length > 0) {
        // 모든 결과를 합치고 관련성으로 랭킹
        const allResults = searchResults.flat();
        const rankedResults = this.filterAndRankResults(allResults, gameName, 10);
        
        if (rankedResults.length > 0) {
          console.log(`🎯 [BggApiGateway] 병렬 검색 완료: ${rankedResults.length}개 최종 결과`);
          console.log('상위 결과:', rankedResults.slice(0, 3).map(r => ({ name: r.name, year: r.year })));
          return rankedResults;
        }
      }

      console.log(`[BggApiGateway] 병렬 검색 실패: "${gameName}"`);
      return [];

    } catch (error) {
      console.error('[BggApiGateway] 병렬 검색 실패:', error);
      return {
        type: 'network',
        message: '게임 검색 중 네트워크 오류가 발생했습니다.',
        originalError: error
      };
    }
  }

  /**
   * 게임명에서 다양한 검색 패턴 생성 (대폭 개선)
   */
  private static generateSearchPatterns(gameName: string): string[] {
    const patterns: string[] = [];
    const cleanName = gameName.trim();
    
    // 1. 원본 게임명
    patterns.push(cleanName);
    
    // 2. 한글-영어 매핑 (확장 - 복수형 포함)
    const koreanToEnglishMap: { [key: string]: string[] } = {
      '봄버스터즈': ['Bomb Busters', 'BombBusters'],
      '스플렌더': ['Splendor'],
      '카탄': ['Catan', 'Settlers of Catan'],
      '윙스팬': ['Wingspan'],
      '아그리콜라': ['Agricola'],
      '아크노바': ['Ark Nova'],
      '스위트랜드': ['Sweet Land', 'Sweet Lands', 'Sweetland'],
      '스위트 랜드': ['Sweet Land', 'Sweet Lands'],
      '루미큐브': ['Rummikub', 'Rummy Cube'],
      '루미 큐브': ['Rummikub', 'Rummy Cube'],
      '티켓 투 라이드': ['Ticket to Ride'],
      '티켓투라이드': ['Ticket to Ride'],
      '킹 오브 토쿄': ['King of Tokyo'],
      '킹오브토쿄': ['King of Tokyo'],
      '스플렌도르': ['Splendor'],
      '카르카손': ['Carcassonne'],
      '파워 그리드': ['Power Grid', 'Powergrid'],
      '파워그리드': ['Power Grid', 'Powergrid']
    };
    
    if (koreanToEnglishMap[cleanName]) {
      patterns.push(...koreanToEnglishMap[cleanName]);
    }
    
    // 3. 공백 변형 패턴들
    if (cleanName.includes(' ')) {
      // 공백 제거
      patterns.push(cleanName.replace(/\s+/g, ''));
      // 하이픈 변형
      patterns.push(cleanName.replace(/\s+/g, '-'));
    } else {
      // 공백이 없으면 중간에 공백 추가 시도
      const spacedVariants = this.generateSpacedVariants(cleanName);
      patterns.push(...spacedVariants);
    }
    
    // 4. 복수형 변형 (영어)
    const pluralVariants = this.generatePluralVariants(cleanName);
    patterns.push(...pluralVariants);
    
    // 5. 대소문자 변환
    patterns.push(cleanName.toLowerCase());
    patterns.push(cleanName.toUpperCase());
    
    // 6. 부분 검색을 위한 키워드 추출
    if (cleanName.length > 4) {
      const keywords = this.extractKeywords(cleanName);
      patterns.push(...keywords);
    }
    
    // 중복 제거
    return [...new Set(patterns)];
  }

  /**
   * 공백 변형 패턴 생성 (스위트랜드 → 스위트 랜드)
   */
  private static generateSpacedVariants(name: string): string[] {
    const variants: string[] = [];
    
    // 한글 게임명의 일반적인 공백 패턴
    const spacingPatterns = [
      { from: '스위트랜드', variants: ['스위트 랜드', '스위트  랜드'] },
      { from: '루미큐브', variants: ['루미 큐브', '루미  큐브'] },
      { from: '아크노바', variants: ['아크 노바'] },
      { from: '킹오브토쿄', variants: ['킹 오브 토쿄', '킹오브 토쿄'] },
      { from: '티켓투라이드', variants: ['티켓 투 라이드', '티켓투 라이드'] },
      { from: '파워그리드', variants: ['파워 그리드'] }
    ];
    
    for (const pattern of spacingPatterns) {
      if (name === pattern.from) {
        variants.push(...pattern.variants);
      }
    }
    
    return variants;
  }

  /**
   * 복수형 변형 패턴 생성 (Sweet Land → Sweet Lands)
   */
  private static generatePluralVariants(name: string): string[] {
    const variants: string[] = [];
    const lowerName = name.toLowerCase();
    
    // 영어 복수형 패턴
    if (lowerName.endsWith(' land')) {
      variants.push(name.replace(/ land$/i, ' Lands'));
    }
    if (lowerName.endsWith(' lands')) {
      variants.push(name.replace(/ lands$/i, ' Land'));
    }
    if (lowerName.endsWith(' game')) {
      variants.push(name.replace(/ game$/i, ' Games'));
    }
    if (lowerName.endsWith(' games')) {
      variants.push(name.replace(/ games$/i, ' Game'));
    }
    if (lowerName.endsWith(' card')) {
      variants.push(name.replace(/ card$/i, ' Cards'));
    }
    if (lowerName.endsWith(' cards')) {
      variants.push(name.replace(/ cards$/i, ' Card'));
    }
    
    // 일반적인 복수형 규칙
    if (!lowerName.endsWith('s') && !lowerName.includes(' ')) {
      if (lowerName.endsWith('y')) {
        variants.push(name.slice(0, -1) + 'ies');
      } else if (lowerName.endsWith('h') || lowerName.endsWith('x')) {
        variants.push(name + 'es');
      } else {
        variants.push(name + 's');
      }
    }
    
    return variants;
  }

  /**
   * 키워드 추출 (부분 검색용)
   */
  private static extractKeywords(name: string): string[] {
    const keywords: string[] = [];
    
    // 긴 이름에서 핵심 키워드 추출
    if (name.length > 6) {
      // 앞 4-6글자 추출
      keywords.push(name.substring(0, Math.min(6, name.length - 1)));
    }
    
    // 공백으로 분리된 단어들
    const words = name.split(/\s+/);
    if (words.length > 1) {
      // 각 단어를 개별 키워드로 추가
      words.forEach(word => {
        if (word.length >= 3) {
          keywords.push(word);
        }
      });
    }
    
    return keywords;
  }

  /**
   * BGG 게임 정보 XML 파싱
   */
  private static parseGameXml(xmlText: string, gameId: number): BggGameInfo | BggApiError {
    try {
      // 브라우저 환경에서 DOMParser 사용
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // 파싱 오류 확인
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        return {
          type: 'parsing',
          message: 'BGG API 응답 파싱 오류',
          originalError: parseError.textContent
        };
      }

      const item = xmlDoc.querySelector('item[type="boardgame"]');
      if (!item) {
        return {
          type: 'not_found',
          message: `게임 ID ${gameId}를 BGG에서 찾을 수 없습니다.`
        };
      }

      // 게임 정보 추출
      const primaryName = item.querySelector('name[type="primary"]')?.getAttribute('value') || 
                         item.querySelector('name')?.getAttribute('value') || 
                         '알 수 없는 게임';

      const publishedYearElement = item.querySelector('yearpublished');
      const publishedYear = publishedYearElement ? 
        parseInt(publishedYearElement.getAttribute('value') || '0') || undefined : undefined;

      const description = item.querySelector('description')?.textContent || undefined;
      
      const minPlayers = this.getIntValue(item, 'minplayers');
      const maxPlayers = this.getIntValue(item, 'maxplayers');
      const playingTime = this.getIntValue(item, 'playingtime');
      const minAge = this.getIntValue(item, 'minage');

      console.log(`[BggApiGateway] 게임 정보 파싱 완료:`, {
        id: gameId,
        name: primaryName,
        publishedYear,
        minPlayers,
        maxPlayers
      });

      return {
        id: gameId,
        name: primaryName,
        publishedYear,
        description,
        minPlayers,
        maxPlayers,
        playingTime,
        minAge
      };

    } catch (error) {
      console.error('[BggApiGateway] XML 파싱 오류:', error);
      return {
        type: 'parsing',
        message: 'BGG API 응답을 파싱하는 중 오류가 발생했습니다.',
        originalError: error
      };
    }
  }

  /**
   * BGG 검색 결과 XML 파싱
   */
  private static parseSearchXml(xmlText: string): { id: number; name: string; year?: number }[] | BggApiError {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const items = xmlDoc.querySelectorAll('item[type="boardgame"]');
      const results: { id: number; name: string; year?: number }[] = [];

      items.forEach(item => {
        const id = parseInt(item.getAttribute('id') || '0');
        const name = item.querySelector('name')?.getAttribute('value') || '';
        const yearValue = item.querySelector('yearpublished')?.getAttribute('value');
        const year = yearValue ? parseInt(yearValue) || undefined : undefined;

        if (id && name) {
          results.push({ id, name, year });
        }
      });

      return results;

    } catch (error) {
      return {
        type: 'parsing',
        message: '검색 결과 파싱 중 오류가 발생했습니다.',
        originalError: error
      };
    }
  }

  /**
   * XML 요소에서 정수값 추출 헬퍼
   */
  private static getIntValue(parent: Element, selector: string): number | undefined {
    const element = parent.querySelector(selector);
    if (!element) return undefined;
    
    const value = element.getAttribute('value');
    return value ? parseInt(value) || undefined : undefined;
  }

  /**
   * 검색 결과 필터링 및 관련성 랭킹
   */
  private static filterAndRankResults(
    results: { id: number; name: string; year?: number }[], 
    originalQuery: string,
    maxResults: number = 10
  ): { id: number; name: string; year?: number }[] {
    const query = originalQuery.toLowerCase().trim();
    
    // 관련성 점수 계산
    const scoredResults = results.map(result => {
      const name = result.name.toLowerCase();
      let score = 0;
      
      // 정확한 일치 (최고 점수)
      if (name === query) score += 1000;
      
      // 시작 일치
      else if (name.startsWith(query)) score += 800;
      
      // 단어 시작 일치
      else if (name.split(' ').some(word => word.startsWith(query))) score += 700;
      
      // 포함 일치
      else if (name.includes(query)) score += 600;
      
      // 부분 단어 일치
      else if (query.split(' ').some(queryWord => 
        name.split(' ').some(nameWord => nameWord.includes(queryWord))
      )) score += 500;
      
      // 키워드 유사성
      else if (this.calculateSimilarity(name, query) > 0.7) score += 400;
      
      // 짧은 이름 우대 (노이즈 제거)
      if (name.length < query.length + 10) score += 100;
      
      // 연도 정보가 있으면 보너스
      if (result.year) score += 50;
      
      return { ...result, score };
    });
    
    // 점수순 정렬 후 최소 점수 기준 필터링
    return scoredResults
      .filter(result => result.score >= 300) // 최소 관련성 기준
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ score, ...result }) => result);
  }

  /**
   * 문자열 유사도 계산 (간단한 Levenshtein 거리 기반)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein 거리 계산
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * 병렬 검색 실행 (모든 패턴을 동시에 검색)
   */
  private static async executeParallelSearch(
    patterns: string[]
  ): Promise<{ id: number; name: string; year?: number }[][]> {
    console.log(`[BggApiGateway] ${patterns.length}개 패턴 병렬 검색 시작`);
    
    // 검색 전략별 병렬 실행
    const exactSearchPromises = patterns.map(pattern => 
      this.searchSinglePattern(pattern, true, 'Exact')
    );
    
    const flexibleSearchPromises = patterns.map(pattern => 
      this.searchSinglePattern(pattern, false, 'Flexible')
    );

    // 모든 검색을 병렬로 실행
    const allSearchPromises = [
      ...exactSearchPromises,
      ...flexibleSearchPromises
    ];

    console.log(`[BggApiGateway] ${allSearchPromises.length}개 병렬 요청 실행 중...`);
    
    const results = await Promise.allSettled(allSearchPromises);
    
    // 성공한 결과만 수집
    const successfulResults: { id: number; name: string; year?: number }[][] = [];
    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        successfulResults.push(result.value);
        successCount++;
      } else if (result.status === 'rejected') {
        errorCount++;
        console.warn(`[BggApiGateway] 검색 ${index + 1} 실패:`, result.reason);
      }
    });

    console.log(`[BggApiGateway] 병렬 검색 완료: 성공 ${successCount}개, 실패 ${errorCount}개`);
    
    return successfulResults;
  }

  /**
   * 단일 패턴 검색 (병렬 실행용)
   */
  private static async searchSinglePattern(
    pattern: string, 
    useExact: boolean,
    strategy: string
  ): Promise<{ id: number; name: string; year?: number }[]> {
    try {
      // Rate limiting을 위한 지연 (병렬이므로 짧게)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
      
      const exactParam = useExact ? '&exact=1' : '';
      const url = `${this.PROXY_URL}?type=search&query=${encodeURIComponent(pattern)}${exactParam}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/xml, text/xml' },
        // 병렬 요청이므로 타임아웃 설정
        signal: AbortSignal.timeout(8000)
      });
      
      if (!response.ok) {
        console.warn(`[BggApiGateway] ${strategy} 패턴 "${pattern}" 검색 실패: ${response.status}`);
        return [];
      }

      const xmlText = await response.text();
      const results = this.parseSearchXml(xmlText);
      
      if ('type' in results) {
        console.warn(`[BggApiGateway] ${strategy} 패턴 "${pattern}" 파싱 오류:`, results.message);
        return [];
      }
      
      if (results.length > 0) {
        console.log(`✅ [BggApiGateway] ${strategy} "${pattern}": ${results.length}개 결과`);
        return results;
      }
      
      return [];
      
    } catch (error) {
      // 타임아웃이나 네트워크 오류는 조용히 처리
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[BggApiGateway] ${strategy} 패턴 "${pattern}" 타임아웃`);
      } else {
        console.warn(`[BggApiGateway] ${strategy} 패턴 "${pattern}" 오류:`, error);
      }
      return [];
    }
  }
} 
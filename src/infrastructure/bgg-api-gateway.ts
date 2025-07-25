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
  private static readonly RATE_LIMIT_MS = 5000; // BGG 권장 5초 간격
  private static lastRequestTime = 0;

  /**
   * 게임 ID로 BGG에서 게임 정보 조회
   */
  static async getGameInfo(gameId: number): Promise<BggGameInfo | BggApiError> {
    try {
      // Rate limiting 적용
      await this.enforceRateLimit();

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
   * 게임 이름으로 BGG에서 검색 (게임 ID 획득용)
   */
  static async searchGameByName(gameName: string): Promise<{ id: number; name: string; year?: number }[] | BggApiError> {
    try {
      await this.enforceRateLimit();

      console.log(`[BggApiGateway] 게임 검색 시작: "${gameName}"`);

      // 검색할 게임명 패턴들 생성
      const searchPatterns = this.generateSearchPatterns(gameName);
      
      for (const pattern of searchPatterns) {
        console.log(`[BggApiGateway] 검색 패턴 시도: "${pattern}"`);
        
        // 프록시를 통해 BGG API 호출 (CORS 우회)
        const encodedName = encodeURIComponent(pattern.trim());
        const url = `${this.PROXY_URL}?type=search&query=${encodedName}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml'
          }
        });
        
        if (!response.ok) {
          console.warn(`[BggApiGateway] 패턴 "${pattern}" 검색 실패: ${response.status}`);
          continue;
        }

        const xmlText = await response.text();
        const results = this.parseSearchXml(xmlText);
        
        if ('type' in results) {
          console.warn(`[BggApiGateway] 패턴 "${pattern}" 파싱 오류:`, results.message);
          continue;
        }
        
        if (results.length > 0) {
          console.log(`✅ [BggApiGateway] 패턴 "${pattern}"으로 ${results.length}개 결과 발견`);
          return results;
        }
        
        console.log(`[BggApiGateway] 패턴 "${pattern}" 결과 없음`);
        
        // Rate limiting을 위해 패턴 간 간격 추가
        if (searchPatterns.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`[BggApiGateway] 모든 검색 패턴 실패: "${gameName}"`);
      return [];

    } catch (error) {
      console.error('[BggApiGateway] 게임 검색 실패:', error);
      return {
        type: 'network',
        message: '게임 검색 중 네트워크 오류가 발생했습니다.',
        originalError: error
      };
    }
  }

  /**
   * 게임명에서 다양한 검색 패턴 생성
   */
  private static generateSearchPatterns(gameName: string): string[] {
    const patterns: string[] = [];
    const cleanName = gameName.trim();
    
    // 1. 원본 게임명
    patterns.push(cleanName);
    
    // 2. 한글 게임명의 일반적인 영어 변환 시도
    const koreanToEnglishMap: { [key: string]: string } = {
      '봄버스터즈': 'Bomb Busters',
      '스플렌더': 'Splendor',
      '카탄': 'Catan',
      '윙스팬': 'Wingspan',
      '아그리콜라': 'Agricola',
      '아크노바': 'Ark Nova',
      // 추가 매핑 필요시 여기에 추가
    };
    
    if (koreanToEnglishMap[cleanName]) {
      patterns.push(koreanToEnglishMap[cleanName]);
    }
    
    // 3. 공백 제거 패턴
    if (cleanName.includes(' ')) {
      patterns.push(cleanName.replace(/\s+/g, ''));
    }
    
    // 4. 대소문자 변환 패턴
    if (cleanName !== cleanName.toLowerCase()) {
      patterns.push(cleanName.toLowerCase());
    }
    
    // 중복 제거
    return [...new Set(patterns)];
  }

  /**
   * Rate limiting 적용 (BGG 권장 5초 간격)
   */
  private static async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      const waitTime = this.RATE_LIMIT_MS - timeSinceLastRequest;
      console.log(`[BggApiGateway] Rate limit 대기: ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
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
} 
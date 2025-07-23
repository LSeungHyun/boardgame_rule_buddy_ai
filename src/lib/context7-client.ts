/**
 * Context7 클라이언트 래퍼
 * MCP Context7 함수들을 위한 클라이언트 인터페이스
 */

interface LibraryInfo {
  id: string;
  name: string;
  description: string;
  codeSnippets: number;
  trustScore: number;
  versions?: string[];
}

interface ResolveLibraryResult {
  libraries: LibraryInfo[];
}

interface ResolveLibraryParams {
  libraryName: string;
}

interface GetLibraryDocsParams {
  context7CompatibleLibraryID: string;
  topic?: string;
  tokens?: number;
}

/**
 * Context7 라이브러리 ID 해결
 * 실제 구현에서는 이 함수들이 MCP를 통해 호출되지만,
 * 여기서는 API 엔드포인트를 통해 처리될 예정입니다.
 */
export async function mcp_context7_resolve_library_id(
  params: ResolveLibraryParams
): Promise<ResolveLibraryResult> {
  try {
    // BGG API 관련 문서를 찾기 위한 임시 구현
    // 실제로는 Context7 MCP 서버를 통해 처리됩니다
    
    const mockLibraries: LibraryInfo[] = [
      {
        id: '/boardgamegeek/xml-api',
        name: 'BoardGameGeek XML API',
        description: 'BGG XML API documentation for accessing board game data',
        codeSnippets: 150,
        trustScore: 9.0,
        versions: ['v1', 'v2']
      },
      {
        id: '/postman/bgg-api',
        name: 'BGG API Documentation',
        description: 'Postman collection for BGG XML API with examples',
        codeSnippets: 75,
        trustScore: 8.5
      }
    ];

    // 라이브러리 이름으로 필터링
    const matchingLibraries = mockLibraries.filter(lib =>
      lib.name.toLowerCase().includes(params.libraryName.toLowerCase()) ||
      lib.description.toLowerCase().includes(params.libraryName.toLowerCase())
    );

    return {
      libraries: matchingLibraries
    };
  } catch (error) {
    console.error('Context7 라이브러리 ID 해결 실패:', error);
    return { libraries: [] };
  }
}

/**
 * Context7 라이브러리 문서 가져오기
 */
export async function mcp_context7_get_library_docs(
  params: GetLibraryDocsParams
): Promise<string | null> {
  try {
    // BGG API 문서를 위한 임시 구현
    // 실제로는 Context7 MCP 서버를 통해 처리됩니다
    
    if (params.context7CompatibleLibraryID.includes('boardgamegeek') || 
        params.context7CompatibleLibraryID.includes('bgg')) {
      
      const bggApiDocs = `
# BoardGameGeek XML API Documentation

## Overview
The BGG XML API provides access to BoardGameGeek's extensive board game database.

## Key Endpoints

### Search Games
- **URL**: \`/xmlapi2/search?query={query}&type=boardgame\`
- **Purpose**: Search for board games by name
- **Parameters**:
  - \`query\`: Game name to search for
  - \`exact=1\`: Exact name matching (optional)

### Game Details
- **URL**: \`/xmlapi2/thing?id={id}&type=boardgame&stats=1\`
- **Purpose**: Get detailed information about a specific game
- **Parameters**:
  - \`id\`: BGG game ID
  - \`stats=1\`: Include rating statistics

### Hot Games
- **URL**: \`/xmlapi2/hot?type=boardgame\`
- **Purpose**: Get the current "hot" games list

### User Collection
- **URL**: \`/xmlapi2/collection?username={username}\`
- **Purpose**: Get a user's game collection
- **Parameters**:
  - \`username\`: BGG username
  - \`own=1\`: Only owned games
  - \`wishlist=1\`: Only wishlist items

## Rate Limiting
- BGG recommends waiting 5 seconds between requests
- Status 503 indicates server busy - retry with delay

## Response Format
All responses are in XML format. Key elements:
- \`<items>\`: Container for search results or game data
- \`<item>\`: Individual game/result
- \`<name>\`: Game name (may have multiple entries)
- \`<statistics>\`: Rating and ranking data

## Best Practices
1. Always handle XML parsing errors
2. Respect rate limits
3. Cache responses when possible
4. Use exact search when possible for better accuracy

${params.topic ? `\n## Topic: ${params.topic}\nRelevant information for "${params.topic}" has been highlighted above.` : ''}
      `;

      return bggApiDocs.trim();
    }

    return null;
  } catch (error) {
    console.error('Context7 문서 가져오기 실패:', error);
    return null;
  }
}

/**
 * Context7 API 호출을 위한 헬퍼 함수
 * 실제 MCP 연동 시에는 이 부분이 대체될 예정입니다.
 */
export class Context7Client {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/context7') {
    this.baseUrl = baseUrl;
  }

  /**
   * 라이브러리 ID 해결 (API 호출)
   */
  async resolveLibraryId(libraryName: string): Promise<ResolveLibraryResult> {
    try {
      const response = await fetch(`${this.baseUrl}/resolve-library`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ libraryName }),
      });

      if (!response.ok) {
        throw new Error(`Context7 API 호출 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Context7 라이브러리 ID 해결 실패:', error);
      return { libraries: [] };
    }
  }

  /**
   * 라이브러리 문서 가져오기 (API 호출)
   */
  async getLibraryDocs(
    libraryId: string,
    topic?: string,
    tokens?: number
  ): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/library-docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context7CompatibleLibraryID: libraryId,
          topic,
          tokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`Context7 문서 API 호출 실패: ${response.status}`);
      }

      const result = await response.json();
      return result.docs || null;
    } catch (error) {
      console.error('Context7 문서 가져오기 실패:', error);
      return null;
    }
  }
}

export const context7Client = new Context7Client(); 
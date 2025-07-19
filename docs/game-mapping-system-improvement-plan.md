# 🎮 게임 매핑 시스템 개선 계획서

## 📅 **문서 정보**
- **작성일**: 2025년 1월 23일
- **대상**: Gemini Rule Master 프로젝트
- **목적**: 게임 매핑 시스템의 중복 하드코딩 문제 해결 및 확장성 확보

---

## 🔍 **현재 시스템 문제점 분석**

### **1. 심각한 중복 하드코딩 현황**

현재 게임 매핑 정보가 **6개 파일에서 중복**으로 하드코딩되어 있습니다:

#### **중복 발생 위치:**

```typescript
// 📍 1. src/lib/gemini.ts - titleMap
const titleMap: { [key: string]: number } = {
    '아크노바': 331,
    'ark nova': 331,
    '세븐원더스': 1,
    '윙스팬': 297,
    // ...
}

// 📍 2. src/lib/rule-master-service.ts - gameMap  
const gameMap: Record<number, string> = {
    331: '아크노바',
    1: '세븐원더스 듀얼',
    297: '윙스팬',
    // ...
}

// 📍 3. src/app/api/research/route.ts - essentialTitleMap
const essentialTitleMap: { [key: string]: string } = {
    '아크노바': 'Ark Nova',
    '윙스팬': 'Wingspan',
    // ...
}

// 📍 4. src/lib/enhanced-translator.ts - GAME_TERMS_DATA
const GAME_TERMS_DATA = {
    331: arkNovaTerms, // 아크노바
    // ...
}

// 📍 5. src/lib/analytics-service.ts - 게임명 매핑
331: '아크노바',

// 📍 6. src/lib/game-terms-service.ts - 특별 처리 로직
if (gameId === 331) {
    // 아크노바 특별 처리
}
```

### **2. 구체적인 문제점들**

#### **🚨 데이터 불일치 위험**
- 각 파일마다 다른 매핑 방식 사용
- 게임명 표기 불일치 (예: "세븐원더스" vs "세븐원더스 듀얼")
- 영어명 매핑 불일치

#### **🚨 확장성 부족**
- 365개 게임 전체를 하드코딩하기 현실적으로 불가능
- 새 게임 추가 시 6개 파일 모두 수정 필요
- 게임별 특화 로직이 분산되어 관리 어려움

#### **🚨 유지보수 비용 증가**
- 하나의 게임 정보 변경 시 여러 파일 수정 필요
- 코드 중복으로 인한 버그 발생 위험
- 개발자가 모든 매핑 위치를 기억해야 함

### **3. 현재 활용 가능한 자산**

#### **✅ 이미 구축된 데이터**
- `src/data/games-list-365.json`: 365개 게임의 체계적인 ID-이름 매핑
- `src/data/game-terms-json/`: 게임별 용어 JSON 파일들
- 일관된 게임 ID 체계 (331: 아크노바 등)

---

## 🎯 **개선안 개요**

### **핵심 전략: 중앙 집중화 + 동적 로딩**

1. **단일 게임 매핑 서비스** 구현
2. **기존 JSON 데이터 활용** (games-list-365.json)
3. **타입 안전성** 확보 (TypeScript 인터페이스)
4. **성능 최적화** (캐싱, 지연 로딩)
5. **확장 기능** (별칭, 다국어 지원)

### **목표 달성 지표**
- ✅ 하드코딩된 매핑 **100% 제거**
- ✅ 새 게임 추가 시 **단일 JSON 파일만** 수정
- ✅ 타입 안전성 **100% 확보**
- ✅ 성능 저하 **0% (캐싱 적용)**

---

## 🏗️ **기술적 설계**

### **1. 중앙 게임 매핑 서비스 구조**

#### **게임 데이터 인터페이스 정의**

```typescript
// src/types/game-mapping.ts
export interface GameInfo {
    id: number;
    titleKorean: string;
    titleEnglish?: string;
    aliases: string[];        // 별칭들 (대소문자, 띄어쓰기 변형)
    hasTermsData: boolean;    // 게임별 용어 데이터 존재 여부
    category?: string;        // 게임 카테고리
}

export interface GameMappingConfig {
    games: GameInfo[];
    lastUpdated: string;
    version: string;
}
```

#### **중앙 매핑 서비스 클래스**

```typescript
// src/lib/game-mapping-service.ts
export class GameMappingService {
    private static instance: GameMappingService;
    private gameMap: Map<number, GameInfo> = new Map();
    private titleToIdMap: Map<string, number> = new Map();
    private initialized = false;

    // 싱글톤 패턴
    public static getInstance(): GameMappingService {
        if (!GameMappingService.instance) {
            GameMappingService.instance = new GameMappingService();
        }
        return GameMappingService.instance;
    }

    // 초기화 (지연 로딩)
    public async initialize(): Promise<void> {
        if (this.initialized) return;
        
        // games-list-365.json 로드
        const gamesData = await this.loadGamesData();
        this.buildMappings(gamesData);
        this.initialized = true;
    }

    // 게임 ID로 정보 조회
    public getGameById(id: number): GameInfo | null {
        return this.gameMap.get(id) || null;
    }

    // 게임명으로 ID 조회 (별칭 포함)
    public getGameIdByTitle(title: string): number | null {
        const normalizedTitle = this.normalizeTitle(title);
        return this.titleToIdMap.get(normalizedTitle) || null;
    }

    // 게임명으로 정보 조회
    public getGameByTitle(title: string): GameInfo | null {
        const id = this.getGameIdByTitle(title);
        return id ? this.getGameById(id) : null;
    }

    // 별칭 추가 (런타임)
    public addAlias(gameId: number, alias: string): void {
        const game = this.getGameById(gameId);
        if (game) {
            game.aliases.push(alias);
            this.titleToIdMap.set(this.normalizeTitle(alias), gameId);
        }
    }

    private normalizeTitle(title: string): string {
        return title.toLowerCase()
            .replace(/\s*:\s*/g, ' : ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
```

### **2. 확장된 게임 데이터 구조**

```json
// src/data/enhanced-games-mapping.json
{
    "metadata": {
        "version": "1.0.0",
        "lastUpdated": "2025-01-23",
        "totalGames": 365,
        "description": "통합 게임 매핑 데이터"
    },
    "games": [
        {
            "id": 331,
            "titleKorean": "아크노바",
            "titleEnglish": "Ark Nova",
            "aliases": [
                "ark nova",
                "아크 노바",
                "arknovas"
            ],
            "hasTermsData": true,
            "category": "strategy",
            "complexity": "heavy"
        },
        {
            "id": 1,
            "titleKorean": "세븐원더스 : 듀얼",
            "titleEnglish": "7 Wonders Duel",
            "aliases": [
                "7 wonders duel",
                "세븐원더스듀얼",
                "7원더스듀얼"
            ],
            "hasTermsData": true,
            "category": "strategy"
        }
    ]
}
```

### **3. 기존 코드 리팩터링 패턴**

#### **Before (하드코딩)**
```typescript
// ❌ 하드코딩된 매핑
const titleMap: { [key: string]: number } = {
    '아크노바': 331,
    'ark nova': 331,
    // ...
};
```

#### **After (서비스 활용)**
```typescript
// ✅ 중앙 서비스 활용
const gameMapping = GameMappingService.getInstance();
await gameMapping.initialize();

const gameId = gameMapping.getGameIdByTitle(gameTitle);
const gameInfo = gameMapping.getGameById(gameId);
```

---

## 📋 **구현 단계별 계획**

### **Phase 1: 기반 구조 구축 (1-2일)**

#### **1.1 타입 정의 및 인터페이스**
```bash
✅ src/types/game-mapping.ts 생성
✅ GameInfo, GameMappingConfig 인터페이스 정의
✅ 관련 유틸리티 타입 정의
```

#### **1.2 중앙 매핑 서비스 구현**
```bash
✅ src/lib/game-mapping-service.ts 생성
✅ GameMappingService 클래스 구현
✅ 기본 CRUD 메서드 구현
✅ 정규화 로직 구현
```

#### **1.3 확장된 게임 데이터 생성**
```bash
✅ games-list-365.json 기반 enhanced-games-mapping.json 생성
✅ 기존 하드코딩된 별칭들 통합
✅ 게임별 메타데이터 추가
```

### **Phase 2: 기존 코드 마이그레이션 (2-3일)**

#### **2.1 핵심 파일 리팩터링**
```typescript
// 우선순위 1: gemini.ts
- getGameIdFromTitle() 함수를 GameMappingService로 교체
- 하드코딩된 titleMap 제거
- 타입 안전성 확보

// 우선순위 2: rule-master-service.ts  
- getGameTitleById() 함수를 GameMappingService로 교체
- 하드코딩된 gameMap 제거

// 우선순위 3: enhanced-translator.ts
- 게임별 매핑 로직을 GameMappingService 연동
- GAME_TERMS_DATA 구조 유지하되 동적 로딩으로 변경
```

#### **2.2 API 레이어 업데이트**
```typescript
// research/route.ts 업데이트
- essentialTitleMap 제거
- GameMappingService 활용한 동적 번역
- 캐싱 로직 추가
```

### **Phase 3: 성능 최적화 및 캐싱 (1일)**

#### **3.1 캐싱 전략**
```typescript
// 메모리 캐싱
class GameMappingService {
    private cache = {
        titleToId: new Map<string, number>(),
        idToGame: new Map<number, GameInfo>(),
        lastAccess: new Map<string, number>()
    };
    
    // LRU 캐시 적용
    private maxCacheSize = 100;
}
```

#### **3.2 지연 로딩**
```typescript
// 필요한 게임 데이터만 로드
public async getGameWithTerms(gameId: number): Promise<GameInfo & { terms?: any }> {
    const game = this.getGameById(gameId);
    if (game?.hasTermsData) {
        const terms = await this.loadGameTerms(gameId);
        return { ...game, terms };
    }
    return game;
}
```

### **Phase 4: 확장 기능 및 검증 (1일)**

#### **4.1 별칭 시스템 강화**
```typescript
// 동적 별칭 추가
gameMapping.addAlias(331, "아크노바2024");
gameMapping.addAlias(331, "ark nova korean");

// 퍼지 매칭 (옵션)
gameMapping.findSimilarGames("아크노마"); // -> ["아크노바"]
```

#### **4.2 종합 테스트**
```bash
✅ 모든 기존 하드코딩 제거 확인
✅ 성능 테스트 (게임 매핑 속도)
✅ 메모리 사용량 확인
✅ 타입 안전성 검증
```

---

## 📊 **기대 효과**

### **1. 코드 품질 향상**
- **중복 제거**: 6개 파일의 하드코딩 → 단일 서비스
- **타입 안전성**: 100% TypeScript 타입 커버리지
- **가독성**: 명확한 API와 일관된 네이밍

### **2. 확장성 확보**
- **365개 게임 지원**: JSON 데이터만 추가하면 즉시 지원
- **별칭 시스템**: 다양한 게임명 표기 자동 지원
- **다국어 준비**: 향후 영어/일어 등 확장 가능

### **3. 유지보수성 개선**
- **단일 진실 소스**: 게임 정보는 한 곳에서만 관리
- **변경 영향 최소화**: 새 게임 추가 시 코드 변경 불필요
- **버그 위험 감소**: 데이터 불일치 위험 제거

### **4. 성능 최적화**
- **캐싱 적용**: 자주 조회되는 게임 정보 메모리 캐시
- **지연 로딩**: 필요한 데이터만 로드
- **배치 처리**: 여러 게임 정보 한번에 조회 가능

---

## ⚠️ **리스크 분석 및 완화 방안**

### **1. 데이터 마이그레이션 리스크**

#### **리스크**: 기존 하드코딩된 데이터 손실
**완화 방안**:
```bash
# 마이그레이션 스크립트 작성
node scripts/extract-hardcoded-mappings.js
# → 기존 모든 하드코딩 데이터를 JSON으로 추출

# 백업 및 검증
npm run test:mapping-migration
# → 기존 동작과 100% 일치하는지 테스트
```

### **2. 성능 영향 리스크**

#### **리스크**: JSON 로딩으로 인한 초기화 지연
**완화 방안**:
```typescript
// 1. 앱 시작 시 프리로딩
// src/app/layout.tsx
useEffect(() => {
    GameMappingService.getInstance().initialize();
}, []);

// 2. 백그라운드 로딩
const gameMapping = GameMappingService.getInstance();
gameMapping.initializeAsync(); // 비동기 초기화
```

### **3. 호환성 리스크**

#### **리스크**: 기존 API 인터페이스 변경
**완화 방안**:
```typescript
// 기존 함수들을 래퍼로 유지 (deprecated)
/** @deprecated Use GameMappingService.getInstance().getGameIdByTitle() */
export function getGameIdFromTitle(title: string): number | null {
    return GameMappingService.getInstance().getGameIdByTitle(title);
}
```

---

## 🚀 **구현 시작 가이드**

### **Step 1: 기반 구조 생성**
```bash
# 1. 타입 정의 파일 생성
touch src/types/game-mapping.ts

# 2. 중앙 서비스 파일 생성  
touch src/lib/game-mapping-service.ts

# 3. 확장된 게임 데이터 생성
node scripts/generate-enhanced-mapping.js
```

### **Step 2: 점진적 마이그레이션**
```bash
# 핵심 파일부터 하나씩 마이그레이션
1. src/lib/gemini.ts
2. src/lib/rule-master-service.ts  
3. src/lib/enhanced-translator.ts
4. src/app/api/research/route.ts
5. src/lib/analytics-service.ts
6. src/lib/game-terms-service.ts
```

### **Step 3: 검증 및 배포**
```bash
# 전체 테스트 실행
npm run test
npm run test:e2e

# 빌드 확인
npm run build

# 성능 테스트
npm run test:performance
```

---

## 📝 **결론**

현재의 게임 매핑 시스템은 **6개 파일에 중복 하드코딩**되어 있어 **확장성과 유지보수성**에 심각한 문제가 있습니다. 

제안한 **중앙 집중화 + 동적 로딩** 방식을 통해:
- ✅ **365개 게임 완전 지원** 가능
- ✅ **코드 중복 100% 제거**
- ✅ **타입 안전성 확보**
- ✅ **성능 최적화**

총 **5-7일의 개발 기간**으로 **장기적인 확장성과 유지보수성**을 크게 개선할 수 있습니다.

**즉시 시작을 권장**하며, Phase별 점진적 구현으로 리스크를 최소화하면서 안정적으로 마이그레이션할 수 있습니다. 
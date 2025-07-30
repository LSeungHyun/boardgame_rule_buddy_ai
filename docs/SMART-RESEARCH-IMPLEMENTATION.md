# 🎯 Rule Buddy 스마트 리서치 기능 구현 프로젝트

## 📌 프로젝트 개요

### 배경 및 목표
- **문제점**: Gemini API 단독으로는 복잡하고 애매한 보드게임 룰 질문에 부정확한 답변 제공
- **목표**: 특정 조건의 질문에만 선택적으로 웹 리서치를 실행하여 답변 품질 향상
- **핵심 전략**: 비용 효율성과 답변 정확도의 균형 달성

### 성공 기준
- [ ] 복잡한 질문 자동 감지 정확도 90% 이상
- [ ] 웹 리서치 실행률 일일 평균 20% 이하 (비용 관리)
- [ ] 리서치 적용 질문의 답변 만족도 80% 이상 향상

---

## 🔍 리서치 트리거 조건 정의

### 1차 필터: 질문 복잡도 분석
```typescript
// 복잡도 판단 기준
const COMPLEXITY_INDICATORS = {
  // 길이 기준
  MIN_QUESTION_LENGTH: 25,
  
  // 복잡성 키워드 (가중치별)
  HIGH_WEIGHT: ['구체적으로', '정확히', '어떻게', '왜', '언제', '상세히'],
  MEDIUM_WEIGHT: ['카드', '효과', '능력', '조합', '전략', '예외', '특수', '상황'],
  LOW_WEIGHT: ['규칙', '방법', '가능', '안됨', '맞나'],
  
  // 게임 요소 키워드
  GAME_ELEMENTS: ['카드명', '액션', '페이즈', '라운드', '턴', '보드', '마커', '토큰'],
  
  // 판단 임계값
  COMPLEXITY_THRESHOLD: 15
}
```

### 2차 필터: 게임별 우선순위
```typescript
// 리서치 우선순위 게임 목록
const RESEARCH_PRIORITY_GAMES = [
  'arkham_horror', 'wingspan', 'terraforming_mars', 
  'gloomhaven', 'spirit_island', 'scythe'
];
```

### 3차 필터: 시간대별 제한
```typescript
// 비용 관리를 위한 시간대별 제한
const HOURLY_RESEARCH_LIMITS = {
  PEAK_HOURS: { limit: 8, hours: [18, 19, 20, 21] },    // 저녁 시간대
  NORMAL_HOURS: { limit: 5, hours: [9, 10, 11, 12, 13, 14, 15, 16, 17] },
  OFF_HOURS: { limit: 2, hours: [22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8] }
};
```

---

## 🏗️ 개발 단계별 계획

### Phase 1: 기반 구조 구축 (1-2일)
- [x] **1.1** Google Custom Search API 설정 ✅
  - [x] Google Cloud Console 프로젝트 생성
  - [x] Custom Search API 활성화
  - [x] API 키 생성 및 보안 설정
  - [x] Programmable Search Engine 생성 (ID: 141539304eea04ad6)
  - [x] 환경변수 설정 (.env.local)

- [x] **1.2** 필수 패키지 설치 ✅
  ```bash
  ✅ cheerio: ^1.1.0
  ✅ lru-cache: ^11.1.0  
  ✅ @types/cheerio: ^0.22.35
  ```

### Phase 2: 스마트 판단 로직 구현 (2-3일)
- [ ] **2.1** 질문 복잡도 분석기 개발
  ```typescript
  // src/lib/question-analyzer.ts
  export class QuestionAnalyzer {
    analyzeComplexity(question: string, gameTitle: string): ComplexityScore
    shouldTriggerResearch(score: ComplexityScore): boolean
    getResearchPriority(score: ComplexityScore): 'high' | 'medium' | 'low'
  }
  ```

- [ ] **2.2** 리서치 제한 관리자 구현
  ```typescript
  // src/lib/research-limiter.ts
  export class ResearchLimiter {
    canPerformResearch(): boolean
    recordResearchUsage(): void
    getRemainingQuota(): number
  }
  ```

### Phase 3: 웹 리서치 엔진 구현 (3-4일)
- [ ] **3.1** API 엔드포인트 생성
  ```typescript
  // src/app/api/research/route.ts
  POST /api/research
  - 질문 복잡도 사전 검증
  - Google Custom Search 실행
  - 신뢰할 수 있는 소스 우선순위 적용
  - 웹페이지 스크래핑 및 정제
  ```

- [ ] **3.2** 캐싱 시스템 구현
  ```typescript
  // src/lib/research-cache.ts
  - LRU 캐시로 중복 검색 방지
  - 캐시 히트율 모니터링
  - 캐시 만료 정책 (4시간)
  ```

### Phase 4: AI 프롬프트 통합 (2일)
- [ ] **4.1** Gemini 서비스 확장
  ```typescript
  // src/lib/gemini.ts 수정
  export async function askGameQuestionWithSmartResearch(
    gameTitle: string,
    userQuestion: string,
    onResearchStart?: () => void
  ): Promise<string>
  ```

- [ ] **4.2** 프롬프트 템플릿 개선
  ```typescript
  // src/lib/prompts.ts 확장
  - 리서치 데이터 통합 섹션 추가
  - 출처 명시 지침 추가
  - 답변 품질 향상 지침 추가
  ```

### Phase 5: UI/UX 개선 (1-2일)
- [ ] **5.1** 리서치 상태 표시
  ```typescript
  // 상태별 메시지
  - "🤔 질문 분석 중..."
  - "🔍 관련 자료 검색 중..."
  - "📖 정보 정리 중..."
  - "✅ 답변 준비 완료"
  ```

- [ ] **5.2** 사용자 피드백 수집
  ```typescript
  // 답변 품질 평가 버튼
  - "정확함" / "부정확함"
  - 리서치 실행 여부 표시
  - 사용된 출처 링크 제공
  ```

### Phase 6: 모니터링 및 최적화 (1-2일)
- [ ] **6.1** 사용량 추적 시스템
  ```typescript
  // src/lib/analytics.ts
  - 리서치 실행률 모니터링
  - 비용 추적 및 알림
  - 질문 유형별 통계
  ```

- [ ] **6.2** 성능 최적화
  ```typescript
  // 최적화 항목
  - 리서치 응답 시간 5초 이내 보장
  - 캐시 히트율 60% 이상 달성
  - 실패 시 graceful fallback
  ```

---

## 📊 품질 관리 기준

### 리서치 트리거 정확도 측정
```typescript
// 테스트 케이스 예시
const TEST_CASES = [
  // 리서치 필요 (복잡한 질문)
  { question: "아크노바에서 협회 보드의 보존 프로젝트와 동물원 맵의 인접 보너스가 동시에 적용될 때 점수 계산 순서는?", expected: true },
  
  // 리서치 불필요 (간단한 질문)  
  { question: "윙스팬 몇 명이서 해?", expected: false },
  
  // 경계선 케이스
  { question: "테라포밍 마스에서 식물 생산 증가시키는 카드들 조합 효과 알려줘", expected: true }
];
```

### 답변 품질 평가 기준
- **정확성**: 공식 룰북 내용과 일치도
- **완성도**: 질문에 대한 완전한 답변 제공
- **명확성**: 이해하기 쉬운 설명
- **출처 신뢰도**: boardgamegeek.com 등 신뢰할 수 있는 소스 활용

---

## 💰 비용 관리 전략

### 일일 사용량 목표
```typescript
const DAILY_TARGETS = {
  MAX_RESEARCH_CALLS: 80,      // 일일 최대 리서치 실행 (무료 할당량의 80%)
  TARGET_TRIGGER_RATE: 0.15,   // 전체 질문 중 15%만 리서치 실행
  CACHE_HIT_RATE: 0.6         // 캐시 적중률 60% 이상
};
```

### 비용 모니터링 알림
- 일일 사용량 50% 도달 시 슬랙 알림
- 90% 도달 시 리서치 일시 중단
- 주간 사용량 리포트 자동 생성

---

## 🧪 테스트 계획

### 기능 테스트
- [ ] 질문 복잡도 분석 정확도 테스트
- [ ] 리서치 실행 조건 검증
- [ ] 캐시 시스템 동작 확인
- [ ] API 에러 핸들링 테스트

### 성능 테스트
- [ ] 리서치 응답 시간 측정 (목표: 5초 이내)
- [ ] 동시 요청 처리 능력 확인
- [ ] 메모리 사용량 모니터링

### 사용자 테스트
- [ ] 복잡한 룰 질문 10개로 답변 품질 비교
- [ ] 리서치 실행/미실행 답변 만족도 조사
- [ ] UI/UX 피드백 수집

---

## 📈 성공 지표 (KPI)

### 기술적 지표
- **리서치 정확도**: 복잡한 질문 감지율 > 90%
- **응답 시간**: 평균 응답 시간 < 5초
- **캐시 효율성**: 캐시 적중률 > 60%
- **시스템 안정성**: 에러율 < 2%

### 비즈니스 지표
- **비용 효율성**: 일일 리서치 실행율 < 20%
- **답변 품질**: 사용자 만족도 > 80%
- **사용량 증가**: 월별 질문 수 증가율
- **리텐션**: 재방문률 개선

---

## 🚀 배포 체크리스트

### 배포 전 확인사항
- [ ] 환경변수 설정 완료
- [ ] Google API 키 제한 설정 확인
- [ ] 캐시 설정 최적화
- [ ] 에러 핸들링 검증
- [ ] 모니터링 대시보드 준비

### 배포 후 모니터링
- [ ] 24시간 시스템 안정성 확인
- [ ] 사용량 패턴 분석
- [ ] 사용자 피드백 수집
- [ ] 성능 지표 달성 여부 확인

---

## 📞 이슈 대응 계획

### 예상 이슈 및 대응 방안

**1. API 할당량 초과**
- 즉시 리서치 기능 일시 중단
- 기본 Gemini 답변으로 fallback
- 사용자에게 상황 안내 메시지 표시

**2. 웹 스크래핑 실패**
- 3회 재시도 후 실패 시 기본 답변 제공
- 실패한 URL을 별도 로그에 기록
- 대체 검색 소스 활용

**3. 리서치 품질 저하**
- 사용자 피드백 기반 품질 모니터링
- 복잡도 판단 기준 조정
- 신뢰할 수 있는 소스 목록 업데이트

---

## 📝 개발 진행 상황 체크

### Week 1: 기반 구축
- [x] Day 1: Google API 설정 완료 ✅
- [x] Day 2: 패키지 설치 및 기본 구조 세팅 ✅
- [ ] Day 3-4: 질문 분석 로직 구현
- [ ] Day 5: 리서치 제한 관리자 구현

### Week 2: 핵심 기능 개발
- [ ] Day 1-2: 웹 리서치 API 엔드포인트 구현
- [ ] Day 3: 캐싱 시스템 구현
- [ ] Day 4-5: Gemini 서비스 통합

### Week 3: UI/UX 및 최적화
- [ ] Day 1-2: 사용자 인터페이스 개선
- [ ] Day 3: 모니터링 시스템 구축
- [ ] Day 4-5: 테스트 및 최적화

---

**프로젝트 시작일**: $(date)
**예상 완료일**: 3주 후
**다음 리뷰 일정**: 매주 금요일
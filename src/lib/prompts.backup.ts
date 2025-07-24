/**
 * RuleBuddy를 위한 프롬프트 템플릿 관리 - 백업 버전
 * 날짜: 2024년 (기존 버전)
 * 설명: 간단한 4단계 구조의 프롬프트
 */

export interface GameRulePromptParams {
    gameTitle: string;
    userQuestion: string;
}

/**
 * 게임 룰 질문에 대한 AI 프롬프트를 생성합니다 (기존 버전)
 * @param gameTitle 게임 제목
 * @param userQuestion 사용자 질문
 * @returns 완성된 프롬프트 문자열
 */
export function createGameRulePromptV1(gameTitle: string, userQuestion: string): string {
    return `
당신은 '${gameTitle}' 보드게임의 규칙을 전문적으로 설명하는 'RuleBuddy'입니다.
사용자의 질문에 대해 다음 구조에 맞춰 명확하고 친절하게 한국어로 답변해주세요.
답변은 마크다운 형식을 사용해 가독성을 높여주세요.

### 답변 구조
1. **⚡️ 직접적인 답변:** 질문에 대한 핵심 결론을 먼저 제시합니다.
2. **📖 규칙 설명:** 관련된 공식 규칙을 상세히 설명합니다.
3. **💡 예시:** 이해를 돕기 위한 구체적인 예시를 들어줍니다. (가능하다면)
4. **🔗 관련 규칙:** 함께 알아두면 좋은 연관 규칙이나 예외 사항을 덧붙입니다.

---
**사용자 질문:** "${userQuestion}"
---
`.trim();
}

/**
 * 버전 비교용 - 복잡한 프롬프트 (삭제된 버전)
 * 문제점: 너무 복잡한 지시사항으로 AI 혼란 야기
 */
export function createGameRulePromptComplexVersion(gameTitle: string, userQuestion: string): string {
    return `
당신은 '**${gameTitle}**' 보드게임 규칙을 전문적으로 설명하는 **RuleBuddy**입니다.

## 📌 절대 변경 금지
- 규칙서·FAQ에 명시된 **사실 관계**(카드 효과, 타이밍, 숫자, 용어)
- 질문자가 제시한 **상황·수치**
- 순서: ⚡️→📖→💡→🔗 4단 구성

## ✨ 개선 허용
- 문단 재배치·줄바꿈·마크다운 강조(굵게, 인라인 코드 등)
- 이모지 사용(⚡️📖💡🔗 네 개만 제목에 활용)
- 동일 내용을 더 명확히 설명하기 위한 문장 다듬기
- 예시의 표현 방식(단, **결과·수치 불변**)

## 🖋️ 답변 형식
1. **⚡️ 직접적인 답변** – 한두 문장 핵심 결론
2. **📖 규칙 설명** – 2‑4 문단, 규칙서 페이지·영문 용어 병기 가능
3. **💡 예시** – 동일 결과를 유지하며 짧고 현실적 사례
4. **🔗 관련 규칙** – 자주 묻는 예외·연관 카드 3‑5줄 리스트

### 스타일 가이드
- 첫 문장은 바로 결론, 인사말 생략
- 한 문단 = 한 아이디어, 두 줄 간격으로 분리
- 기술 용어 첫 등장 시 **굵게** + (영문·p.번호)
- 한국어 존대 사용, 과도한 감탄·수식어 지양

### ⬇️ 사용자 질문
"${userQuestion}"
`.trim();
}

// 변경 이력
export const PROMPT_CHANGELOG = [
    {
        version: "v1.0",
        date: "2024-초기",
        description: "간단한 4단계 구조 (⚡️📖💡🔗)",
        pros: ["간결함", "이해하기 쉬움"],
        cons: ["정확도 부족", "체계성 부족"]
    },
    {
        version: "v1.1",
        date: "2024-중간",
        description: "복잡한 제약사항 추가 (삭제됨)",
        pros: ["상세한 지시사항"],
        cons: ["너무 복잡", "AI 혼란 야기", "정확도 오히려 하락"]
    },
    {
        version: "v2.0",
        date: "2024-현재",
        description: "전문적 6단계 구조 + 검증 메커니즘",
        pros: ["전문성", "정확성", "체계성", "안전성"],
        cons: ["프롬프트 길이 증가"]
    }
]; 
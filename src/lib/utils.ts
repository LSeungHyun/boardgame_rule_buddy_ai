import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 한글 초성 추출 및 검색 유틸리티
const KOREAN_INITIALS = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

// 한글 유니코드 범위 상수
const HANGUL_SYLLABLE_START = 44032; // '가'의 유니코드 값
const HANGUL_SYLLABLE_END = 55203;   // '힣'의 유니코드 값
const HANGUL_INITIAL_COUNT = 588;    // 각 초성당 글자 수 (중성 21개 × 종성 28개)

/**
 * 한글 문자에서 초성을 추출합니다
 * @param char 한글 문자
 * @returns 초성 문자 또는 원본 문자
 */
export function getKoreanInitial(char: string): string {
  const charCode = char.charCodeAt(0);

  // 한글 완성형 범위 확인 (가-힣)
  if (charCode >= HANGUL_SYLLABLE_START && charCode <= HANGUL_SYLLABLE_END) {
    // 한글 완성형에서 초성 인덱스 계산
    // 공식: (글자코드 - 가의코드) / (중성수 × 종성수) = 초성 인덱스
    const initialIndex = Math.floor((charCode - HANGUL_SYLLABLE_START) / HANGUL_INITIAL_COUNT);
    return KOREAN_INITIALS[initialIndex];
  }

  // 이미 초성인 경우 그대로 반환
  if (KOREAN_INITIALS.includes(char)) {
    return char;
  }

  // 한글이 아닌 경우 소문자로 변환하여 반환
  return char.toLowerCase();
}

/**
 * 문자열에서 모든 문자의 초성을 추출합니다
 * @param text 추출할 문자열
 * @returns 초성 문자열
 */
export function extractInitials(text: string): string {
  return text
    .split('')
    .map(getKoreanInitial)
    .join('');
}

/**
 * 문자열이 모든 한글 초성으로만 이루어져 있는지 확인합니다
 * @param text 확인할 문자열
 * @returns 모든 초성 여부
 */
export function isAllKoreanInitials(text: string): boolean {
  return text.trim().length > 0 && text.trim().split('').every(char => KOREAN_INITIALS.includes(char));
}

/**
 * 검색어가 대상 텍스트와 매칭되는지 확인합니다 (초성 검색 포함)
 * 
 * 검색 로직:
 * 1. 일반 문자열 포함 검색을 먼저 수행
 * 2. 검색어가 모든 초성으로 구성된 경우에만 초성 검색 수행
 * 3. 초성 검색은 대상 텍스트의 초성을 추출하여 검색어와 비교
 * 
 * @param searchTerm 검색어
 * @param targetText 대상 텍스트
 * @returns 매칭 여부
 */
export function isKoreanSearchMatch(searchTerm: string, targetText: string): boolean {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  const normalizedTarget = targetText.toLowerCase();

  // 일반 문자열 포함 검색 (빠른 경로)
  if (normalizedTarget.includes(normalizedSearch)) {
    return true;
  }

  // 초성 검색 (검색어가 모든 초성일 때만)
  if (isAllKoreanInitials(searchTerm)) {
    const targetInitials = extractInitials(targetText);
    return targetInitials.includes(normalizedSearch);
  }

  return false;
}

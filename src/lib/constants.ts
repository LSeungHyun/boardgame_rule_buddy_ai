/**
 * 애플리케이션 전체에서 사용되는 상수들을 중앙 집중 관리
 * 하드코딩을 방지하고 유지보수성을 향상시킵니다.
 */

// API 엔드포인트
export const API_ENDPOINTS = {
  FEEDBACK: '/api/feedback',
  CHECK_CONFIDENCE: '/api/check-confidence',
} as const;

// AI 신뢰도 체크 시스템
export const CONFIDENCE_CHECK = {
  THRESHOLD: 80,                    // 전문가 모드 임계값 (80점 이상)
  MIN_SCORE: 1,                     // 최소 신뢰도 점수
  MAX_SCORE: 100,                   // 최대 신뢰도 점수
  SERVICE_MODES: {
    EXPERT: 'expert' as const,      // 전문가 모드
    BETA: 'beta' as const,          // 베타 모드
  },
} as const;

// 응답 타입 정의
export const RESPONSE_TYPES = {
  SIMPLE_CHAT: 'simple_chat',
  STRUCTURED_DISPLAY: 'structured_display',
} as const;

// 아이콘 이름 매핑
export const ICON_NAMES = {
  // 게임 관련 아이콘
  GOAL: 'goal',
  ACTION: 'action',
  BIRD: 'bird',
  EGG: 'egg',
  FOOD: 'food',
  TROPHY: 'trophy',

  // 일반적인 아이콘
  INFO: 'info',
  WARNING: 'warning',
  TIP: 'tip',
  RULE: 'rule',
  STRATEGY: 'strategy',
  SETUP: 'setup',

  // 기본 아이콘
  DEFAULT: 'default',
} as const;

// 피드백 상태
export const FEEDBACK_STATES = {
  IDLE: 'idle',
  SUBMITTING: 'submitting',
  SUBMITTED: 'submitted',
  ERROR: 'error',
} as const;

// UI 라벨
export const UI_LABELS = {
  FEEDBACK: {
    LIKE: '👍',
    DISLIKE: '👎',
    PLACEHOLDER: '개선할 점이나 추가 의견을 알려주세요...',
    SUBMIT: '피드백 전송',
    SUBMITTED: '피드백이 전송되었습니다',
    ERROR: '피드백 전송 중 오류가 발생했습니다',
  },
  LOADING: '로딩 중...',
  ERROR: '오류가 발생했습니다',
} as const;

// 스타일 클래스
export const STYLE_CLASSES = {
  GLASS_CARD: 'glass-card',
  BTN_PRIMARY: 'btn-game-primary',
  TEXT_AMBER: 'text-amber-100',
  BORDER_AMBER: 'border-amber-400/20',
} as const;

// 타입 정의 (TypeScript에서 사용)
export type ResponseType = typeof RESPONSE_TYPES[keyof typeof RESPONSE_TYPES];
export type IconName = typeof ICON_NAMES[keyof typeof ICON_NAMES];
export type FeedbackState = typeof FEEDBACK_STATES[keyof typeof FEEDBACK_STATES];
export type ServiceMode = typeof CONFIDENCE_CHECK.SERVICE_MODES[keyof typeof CONFIDENCE_CHECK.SERVICE_MODES];
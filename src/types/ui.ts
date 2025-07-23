import { ReactNode } from 'react';

/**
 * SendButton 컴포넌트의 Props 타입 정의
 */
export interface SendButtonProps {
  /** 전송 버튼이 활성화되어 있는지 여부 */
  isEnabled: boolean;
  /** 로딩 상태 여부 */
  isLoading: boolean;
  /** 클릭 이벤트 핸들러 */
  onClick?: () => void;
  /** 추가 CSS 클래스명 */
  className?: string;
  /** 입력 필드가 포커스된 상태인지 여부 */
  isInputFocused?: boolean;
  /** 버튼 타입 (기본값: 'submit') */
  type?: 'button' | 'submit' | 'reset';
  /** 버튼 크기 변형 */
  size?: 'sm' | 'md' | 'lg';
  /** 접근성을 위한 aria-label */
  'aria-label'?: string;
}

/**
 * 입력 필드와 전송 버튼 조합 컴포넌트의 Props 타입
 */
export interface InputWithSendButtonProps {
  /** 입력값 */
  value: string;
  /** 입력값 변경 핸들러 */
  onChange: (value: string) => void;
  /** 전송 이벤트 핸들러 */
  onSend: (value: string) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 로딩 상태 여부 */
  isLoading?: boolean;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 최대 입력 글자 수 */
  maxLength?: number;
  /** 추가 CSS 클래스명 */
  className?: string;
}

/**
 * 모바일 터치 인터랙션을 위한 타입
 */
export interface TouchInteractionProps {
  /** 터치 시작 이벤트 */
  onTouchStart?: (event: React.TouchEvent) => void;
  /** 터치 종료 이벤트 */
  onTouchEnd?: (event: React.TouchEvent) => void;
  /** 터치 취소 이벤트 */
  onTouchCancel?: (event: React.TouchEvent) => void;
}

/**
 * 반응형 버튼 크기 설정
 */
export type ResponsiveButtonSize = {
  mobile: {
    width: number;
    height: number;
  };
  tablet: {
    width: number;
    height: number;
  };
  desktop: {
    width: number;
    height: number;
  };
};

/**
 * 버튼 상태별 스타일 정의
 */
export interface ButtonStateStyles {
  default: string;
  enabled: string;
  loading: string;
  disabled: string;
  focused: string;
}

/**
 * 애니메이션 설정 타입
 */
export interface ButtonAnimationConfig {
  /** 호버 애니메이션 설정 */
  hover: {
    scale: number;
    duration: number;
  };
  /** 탭 애니메이션 설정 */
  tap: {
    scale: number;
    duration: number;
  };
  /** 리플 효과 설정 */
  ripple: {
    duration: number;
    maxScale: number;
  };
} 
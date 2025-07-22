/**
 * 아이콘 이름을 실제 React 컴포넌트로 매핑하는 유틸리티
 * 문자열 기반 아이콘 이름을 lucide-react 아이콘으로 변환합니다.
 */

import React from 'react';
import {
  Target,
  Zap,
  Bird,
  Egg,
  Apple,
  Trophy,
  Info,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Brain,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { ICON_NAMES, type IconName } from '@/lib/constants';

// 아이콘 매핑 객체
const iconMap: Record<string, React.ComponentType<any>> = {
  [ICON_NAMES.GOAL]: Target,
  [ICON_NAMES.ACTION]: Zap,
  [ICON_NAMES.BIRD]: Bird,
  [ICON_NAMES.EGG]: Egg,
  [ICON_NAMES.FOOD]: Apple,
  [ICON_NAMES.TROPHY]: Trophy,
  [ICON_NAMES.INFO]: Info,
  [ICON_NAMES.WARNING]: AlertTriangle,
  [ICON_NAMES.TIP]: Lightbulb,
  [ICON_NAMES.RULE]: BookOpen,
  [ICON_NAMES.STRATEGY]: Brain,
  [ICON_NAMES.SETUP]: Settings,
  [ICON_NAMES.DEFAULT]: HelpCircle,
};

interface IconMapperProps {
  /** 아이콘 이름 (constants.ts에서 정의된 값) */
  iconName: string;
  /** 아이콘 크기 (기본값: 16) */
  size?: number;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 아이콘 이름을 받아서 해당하는 Lucide React 아이콘을 렌더링합니다.
 * 알 수 없는 아이콘 이름의 경우 기본 아이콘을 표시합니다.
 */
export function IconMapper({ iconName, size = 16, className = '' }: IconMapperProps) {
  // 매핑된 아이콘 컴포넌트 찾기, 없으면 기본 아이콘 사용
  const IconComponent = iconMap[iconName] || iconMap[ICON_NAMES.DEFAULT];
  
  return (
    <IconComponent 
      size={size} 
      className={className}
      aria-label={`${iconName} 아이콘`}
    />
  );
}

/**
 * 사용 가능한 모든 아이콘 이름 목록을 반환합니다.
 * 개발 시 디버깅이나 문서화에 유용합니다.
 */
export function getAvailableIconNames(): string[] {
  return Object.keys(iconMap);
}

/**
 * 특정 아이콘이 존재하는지 확인합니다.
 */
export function isValidIconName(iconName: string): boolean {
  return iconName in iconMap;
}
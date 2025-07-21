/**
 * 게임 셋업 가이드 관련 타입 정의
 */

export interface GameSetupGuide {
  gameId: number;
  gameTitle: string;
  playerCounts: number[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // 분 단위
  setupSteps: SetupStep[];
  variants?: GameVariant[];
  tips?: string[];
}

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  order: number;
  category: 'preparation' | 'components' | 'board' | 'cards' | 'tokens' | 'final';
  isRequired: boolean;
  dependencies?: string[]; // 다른 스텝의 ID들
  playerCountSpecific?: {
    [playerCount: number]: {
      description?: string;
      modifications?: string[];
      additionalComponents?: string[];
    };
  };
  components?: ComponentRequirement[];
  diagram?: DiagramInfo;
  estimatedTime?: number; // 분 단위
  commonMistakes?: string[];
}

export interface ComponentRequirement {
  name: string;
  quantity: number | string; // "2-4" 같은 범위도 가능
  description?: string;
  image?: string;
  playerCountModifier?: {
    [playerCount: number]: number | string;
  };
}

export interface DiagramInfo {
  type: 'image' | 'svg' | 'interactive';
  src?: string;
  svgContent?: string;
  interactiveElements?: InteractiveElement[];
  caption?: string;
}

export interface InteractiveElement {
  id: string;
  type: 'highlight' | 'tooltip' | 'animation';
  position: { x: number; y: number; width?: number; height?: number };
  content: string;
  trigger?: 'hover' | 'click' | 'auto';
  delay?: number;
}

export interface GameVariant {
  id: string;
  name: string;
  description: string;
  difficulty: 'easier' | 'harder' | 'different';
  playerCounts: number[];
  modifications: VariantModification[];
}

export interface VariantModification {
  stepId: string;
  type: 'add' | 'remove' | 'modify';
  description: string;
  newComponents?: ComponentRequirement[];
}

export interface SetupProgress {
  gameId: number;
  playerCount: number;
  completedSteps: Set<string>;
  currentStep?: string;
  selectedVariant?: string;
  startTime: Date;
  estimatedCompletion?: Date;
}

export interface SetupSession {
  id: string;
  gameId: number;
  playerCount: number;
  progress: SetupProgress;
  preferences: SetupPreferences;
}

export interface SetupPreferences {
  showDiagrams: boolean;
  showTips: boolean;
  autoAdvance: boolean;
  skipOptionalSteps: boolean;
  preferredDifficulty: 'beginner' | 'intermediate' | 'advanced';
}
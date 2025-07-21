// 타입 통합 인덱스 파일

// 기존 타입들
export * from './game';
export * from './feedback';
export * from './game-mapping';
export * from './game-terms';

// 새로운 대화 맥락 추적 타입들
export * from './conversation';
export * from './database';

// 유틸리티 타입들
export * from './utils';

// 타입 가드 함수들
export const isValidSessionId = (sessionId: unknown): sessionId is string => {
  return typeof sessionId === 'string' && sessionId.length > 0;
};

export const isValidTurnNumber = (turnNumber: unknown): turnNumber is number => {
  return typeof turnNumber === 'number' && turnNumber > 0 && Number.isInteger(turnNumber);
};

export const isValidConfidence = (confidence: unknown): confidence is number => {
  return typeof confidence === 'number' && confidence >= 0 && confidence <= 1;
};

export const isContextAnalysis = (obj: unknown): obj is import('./conversation').ContextAnalysis => {
  if (typeof obj !== 'object' || obj === null) return false;
  const analysis = obj as any;
  return (
    typeof analysis.currentTopic === 'string' &&
    typeof analysis.relatedToHistory === 'boolean' &&
    ['direct', 'implicit', 'none'].includes(analysis.referenceType) &&
    typeof analysis.confidence === 'number' &&
    Array.isArray(analysis.keywords)
  );
};

export const isIntentAnalysis = (obj: unknown): obj is import('./conversation').IntentAnalysis => {
  if (typeof obj !== 'object' || obj === null) return false;
  const analysis = obj as any;
  return (
    ['question', 'correction', 'clarification', 'followup'].includes(analysis.primaryIntent) &&
    typeof analysis.isChallengingPreviousAnswer === 'boolean' &&
    typeof analysis.confidence === 'number' &&
    Array.isArray(analysis.implicitContext)
  );
};
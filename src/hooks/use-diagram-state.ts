'use client';

import { useState, useCallback, useEffect } from 'react';
import { DiagramElement } from '@/components/ui/visual-diagram';
import { BoardLayoutStep } from '@/components/ui/interactive-board-layout';

export interface DiagramState {
  currentStep: number;
  completedSteps: Set<string>;
  selectedElement: DiagramElement | null;
  highlightedElements: Set<string>;
  zoomLevel: number;
  isAnimating: boolean;
}

export interface DiagramActions {
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepIndex: number) => void;
  selectElement: (element: DiagramElement | null) => void;
  highlightElement: (elementId: string) => void;
  unhighlightElement: (elementId: string) => void;
  clearHighlights: () => void;
  setZoom: (level: number) => void;
  reset: () => void;
  markStepComplete: (stepId: string) => void;
}

export const useDiagramState = (
  steps: BoardLayoutStep[],
  onComplete?: () => void
) => {
  const [state, setState] = useState<DiagramState>({
    currentStep: 0,
    completedSteps: new Set(),
    selectedElement: null,
    highlightedElements: new Set(),
    zoomLevel: 1,
    isAnimating: false
  });

  // 현재 단계 정보
  const currentStepData = steps[state.currentStep];
  const isFirstStep = state.currentStep === 0;
  const isLastStep = state.currentStep === steps.length - 1;
  const progressPercentage = ((state.currentStep + 1) / steps.length) * 100;

  // 다음 단계로 이동
  const nextStep = useCallback(() => {
    if (!isLastStep) {
      setState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1,
        completedSteps: new Set([...prev.completedSteps, currentStepData.id]),
        selectedElement: null,
        isAnimating: true
      }));
    } else {
      setState(prev => ({
        ...prev,
        completedSteps: new Set([...prev.completedSteps, currentStepData.id])
      }));
      onComplete?.();
    }
  }, [isLastStep, currentStepData?.id, onComplete]);

  // 이전 단계로 이동
  const prevStep = useCallback(() => {
    if (!isFirstStep) {
      setState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1,
        selectedElement: null,
        isAnimating: true
      }));
    }
  }, [isFirstStep]);

  // 특정 단계로 이동
  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setState(prev => ({
        ...prev,
        currentStep: stepIndex,
        selectedElement: null,
        isAnimating: true
      }));
    }
  }, [steps.length]);

  // 요소 선택
  const selectElement = useCallback((element: DiagramElement | null) => {
    setState(prev => ({
      ...prev,
      selectedElement: element
    }));
  }, []);

  // 요소 하이라이트
  const highlightElement = useCallback((elementId: string) => {
    setState(prev => ({
      ...prev,
      highlightedElements: new Set([...prev.highlightedElements, elementId])
    }));
  }, []);

  // 요소 하이라이트 해제
  const unhighlightElement = useCallback((elementId: string) => {
    setState(prev => {
      const newHighlighted = new Set(prev.highlightedElements);
      newHighlighted.delete(elementId);
      return {
        ...prev,
        highlightedElements: newHighlighted
      };
    });
  }, []);

  // 모든 하이라이트 해제
  const clearHighlights = useCallback(() => {
    setState(prev => ({
      ...prev,
      highlightedElements: new Set()
    }));
  }, []);

  // 줌 레벨 설정
  const setZoom = useCallback((level: number) => {
    const clampedLevel = Math.max(0.5, Math.min(2, level));
    setState(prev => ({
      ...prev,
      zoomLevel: clampedLevel
    }));
  }, []);

  // 상태 초기화
  const reset = useCallback(() => {
    setState({
      currentStep: 0,
      completedSteps: new Set(),
      selectedElement: null,
      highlightedElements: new Set(),
      zoomLevel: 1,
      isAnimating: false
    });
  }, []);

  // 단계 완료 표시
  const markStepComplete = useCallback((stepId: string) => {
    setState(prev => ({
      ...prev,
      completedSteps: new Set([...prev.completedSteps, stepId])
    }));
  }, []);

  // 애니메이션 완료 처리
  useEffect(() => {
    if (state.isAnimating) {
      const timer = setTimeout(() => {
        setState(prev => ({
          ...prev,
          isAnimating: false
        }));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.isAnimating]);

  // 현재 단계의 요소들에 하이라이트 적용
  const enhancedElements = currentStepData?.elements.map(element => ({
    ...element,
    isHighlighted: state.highlightedElements.has(element.id) || element.isHighlighted
  })) || [];

  const actions: DiagramActions = {
    nextStep,
    prevStep,
    goToStep,
    selectElement,
    highlightElement,
    unhighlightElement,
    clearHighlights,
    setZoom,
    reset,
    markStepComplete
  };

  return {
    state,
    actions,
    currentStepData,
    enhancedElements,
    isFirstStep,
    isLastStep,
    progressPercentage
  };
};
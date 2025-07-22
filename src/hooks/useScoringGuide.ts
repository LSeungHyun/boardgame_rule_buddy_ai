/**
 * 점수 가이드 대화 관리 커스텀 훅
 * 다단계 점수 입력 프로세스의 상태와 로직을 관리
 */

import { useState, useCallback, useMemo } from 'react';

// 점수 카테고리 타입 정의
interface ScoringCategory {
  id: string;
  categoryName: string;
  prompt: string;
}

// 점수 데이터 타입 (카테고리 ID를 키로 하는 객체)
type ScoreData = Record<string, number>;

// 훅의 반환 타입 정의
interface UseScoringGuideReturn {
  // 현재 상태
  currentStep: number;
  currentQuestion: ScoringCategory | null;
  scores: ScoreData;
  isComplete: boolean;
  totalScore: number;
  progress: number; // 진행률 (0-100)
  
  // 액션 함수들
  submitScore: (score: number) => void;
  goToPreviousStep: () => void;
  resetScoring: () => void;
  
  // 유틸리티
  getScoreByCategory: (categoryId: string) => number | undefined;
  getAllScoreEntries: () => Array<{ categoryName: string; points: number }>;
}

/**
 * 점수 가이드 대화 관리 훅
 */
export function useScoringGuide(scoringCategories: ScoringCategory[]): UseScoringGuideReturn {
  // 현재 단계 상태 (0부터 시작)
  const [currentStep, setCurrentStep] = useState<number>(0);
  
  // 각 카테고리별 점수 저장 객체
  const [scores, setScores] = useState<ScoreData>({});

  console.log('🎯 [useScoringGuide 상태]', {
    현재단계: currentStep,
    총카테고리수: scoringCategories.length,
    입력된점수수: Object.keys(scores).length,
    완료여부: currentStep >= scoringCategories.length
  });

  // 현재 질문 계산 (메모이제이션)
  const currentQuestion = useMemo(() => {
    if (currentStep >= scoringCategories.length) {
      return null; // 모든 질문 완료
    }
    return scoringCategories[currentStep];
  }, [currentStep, scoringCategories]);

  // 완료 상태 계산
  const isComplete = useMemo(() => {
    return currentStep >= scoringCategories.length;
  }, [currentStep, scoringCategories.length]);

  // 총 점수 계산 (메모이제이션)
  const totalScore = useMemo(() => {
    return Object.values(scores).reduce((sum, score) => sum + (score || 0), 0);
  }, [scores]);

  // 진행률 계산 (0-100%)
  const progress = useMemo(() => {
    if (scoringCategories.length === 0) return 0;
    return Math.round((currentStep / scoringCategories.length) * 100);
  }, [currentStep, scoringCategories.length]);

  // 점수 제출 및 다음 단계로 진행
  const submitScore = useCallback((score: number) => {
    if (currentQuestion) {
      console.log('📝 [점수 제출]', {
        카테고리: currentQuestion.categoryName,
        카테고리ID: currentQuestion.id,
        점수: score,
        현재단계: currentStep
      });

      // 점수 저장
      setScores(prevScores => ({
        ...prevScores,
        [currentQuestion.id]: score
      }));

      // 다음 단계로 진행
      setCurrentStep(prevStep => prevStep + 1);
    }
  }, [currentQuestion, currentStep]);

  // 이전 단계로 돌아가기
  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      console.log('⬅️ [이전 단계로]', {
        현재단계: currentStep,
        이동후단계: currentStep - 1
      });
      
      setCurrentStep(prevStep => prevStep - 1);
    }
  }, [currentStep]);

  // 점수 계산 초기화
  const resetScoring = useCallback(() => {
    console.log('🔄 [점수 계산 초기화]');
    
    setCurrentStep(0);
    setScores({});
  }, []);

  // 특정 카테고리의 점수 조회
  const getScoreByCategory = useCallback((categoryId: string): number | undefined => {
    return scores[categoryId];
  }, [scores]);

  // 모든 점수 항목을 배열로 반환 (요약 표시용)
  const getAllScoreEntries = useCallback(() => {
    return scoringCategories.map(category => ({
      categoryName: category.categoryName,
      points: scores[category.id] || 0
    }));
  }, [scoringCategories, scores]);

  return {
    // 상태
    currentStep,
    currentQuestion,
    scores,
    isComplete,
    totalScore,
    progress,
    
    // 액션
    submitScore,
    goToPreviousStep,
    resetScoring,
    
    // 유틸리티
    getScoreByCategory,
    getAllScoreEntries
  };
}
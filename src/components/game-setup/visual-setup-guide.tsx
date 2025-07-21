'use client';

import React from 'react';
import { motion } from 'framer-motion';
import InteractiveBoardLayout from '@/components/ui/interactive-board-layout';
import { GAME_DIAGRAM_TEMPLATES, generatePlayerSpecificDiagram, getGameViewBox } from '@/components/ui/diagram-templates';
import { useDiagramState } from '@/hooks/use-diagram-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VisualSetupGuideProps {
  gameId: string;
  gameName: string;
  playerCount: number;
  onComplete?: () => void;
  className?: string;
}

const VisualSetupGuide: React.FC<VisualSetupGuideProps> = ({
  gameId,
  gameName,
  playerCount,
  onComplete,
  className
}) => {
  // 게임별 다이어그램 템플릿 가져오기
  const steps = generatePlayerSpecificDiagram(gameId, playerCount);
  const { state, actions, currentStepData, isFirstStep, isLastStep, progressPercentage } = useDiagramState(steps, onComplete);

  // 지원되지 않는 게임인 경우
  if (!steps.length) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">시각적 가이드 준비 중</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {gameName}의 시각적 셋업 가이드가 곧 추가될 예정입니다.
          </p>
          <Button variant="outline" onClick={onComplete}>
            기본 가이드로 계속하기
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleStepComplete = () => {
    actions.markStepComplete(currentStepData.id);
    if (isLastStep) {
      onComplete?.();
    } else {
      actions.nextStep();
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* 헤더 섹션 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center space-x-2">
          <Badge variant="secondary" className="text-sm">
            <Users className="h-3 w-3 mr-1" />
            {playerCount}명
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Clock className="h-3 w-3 mr-1" />
            약 5-10분
          </Badge>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {gameName} 시각적 셋업 가이드
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            단계별 다이어그램으로 쉽고 정확하게 게임을 준비하세요
          </p>
        </div>

        {/* 전체 진행률 */}
        <div className="max-w-md mx-auto">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>진행률</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>

      {/* 메인 다이어그램 */}
      <motion.div
        key={state.currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <InteractiveBoardLayout
          gameId={gameId}
          gameName={gameName}
          playerCount={playerCount}
          steps={steps}
          onComplete={onComplete}
        />
      </motion.div>

      {/* 단계 네비게이션 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            단계 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {steps.map((step, index) => {
              const isCompleted = state.completedSteps.has(step.id);
              const isCurrent = index === state.currentStep;
              
              return (
                <motion.button
                  key={step.id}
                  onClick={() => actions.goToStep(index)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all duration-200",
                    isCurrent && "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
                    isCompleted && "border-green-500 bg-green-50 dark:bg-green-900/20",
                    !isCurrent && !isCompleted && "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      단계 {index + 1}
                    </span>
                    {isCompleted && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {isCurrent && !isCompleted && (
                      <div className="h-4 w-4 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </div>
                  <h4 className="font-medium text-sm mb-1">{step.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {step.description}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 완료 버튼 */}
      {isLastStep && state.completedSteps.has(currentStepData.id) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <CardContent className="py-6">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                셋업 완료!
              </h3>
              <p className="text-green-700 dark:text-green-300 mb-4">
                {gameName} 게임 준비가 모두 완료되었습니다. 즐거운 게임 되세요!
              </p>
              <Button 
                onClick={onComplete}
                className="bg-green-600 hover:bg-green-700"
              >
                게임 시작하기
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default VisualSetupGuide;
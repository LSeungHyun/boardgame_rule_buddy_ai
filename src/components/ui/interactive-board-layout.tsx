'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import VisualDiagram, { DiagramElement } from './visual-diagram';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { ChevronLeft, ChevronRight, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

export interface BoardLayoutStep {
  id: string;
  title: string;
  description: string;
  elements: DiagramElement[];
  instructions: string[];
  tips?: string[];
}

export interface InteractiveBoardLayoutProps {
  gameId: string;
  gameName: string;
  playerCount: number;
  steps: BoardLayoutStep[];
  onComplete?: () => void;
  className?: string;
}

const InteractiveBoardLayout: React.FC<InteractiveBoardLayoutProps> = ({
  gameId,
  gameName,
  playerCount,
  steps,
  onComplete,
  className
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedElement, setSelectedElement] = useState<DiagramElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleElementClick = useCallback((element: DiagramElement) => {
    setSelectedElement(element);
  }, []);

  const handleNextStep = useCallback(() => {
    if (!isLastStep) {
      setCompletedSteps(prev => new Set([...prev, currentStep.id]));
      setCurrentStepIndex(prev => prev + 1);
      setSelectedElement(null);
    } else {
      setCompletedSteps(prev => new Set([...prev, currentStep.id]));
      onComplete?.();
    }
  }, [isLastStep, currentStep.id, onComplete]);

  const handlePrevStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
      setSelectedElement(null);
    }
  }, [isFirstStep]);

  const handleReset = useCallback(() => {
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
    setSelectedElement(null);
    setZoomLevel(1);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className={cn("space-y-6", className)}>
      {/* 헤더 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {gameName} 보드 셋업
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {playerCount}명 플레이 가이드
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {currentStepIndex + 1} / {steps.length}
          </Badge>
        </div>

        {/* 진행률 바 */}
        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
          <motion.div
            className="bg-blue-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 다이어그램 영역 */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{currentStep.title}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 2}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <VisualDiagram
                  elements={currentStep.elements}
                  currentStep={currentStepIndex + 1}
                  onElementClick={handleElementClick}
                  showLabels={true}
                  animationDelay={0.1}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 설명 및 컨트롤 영역 */}
        <div className="space-y-4">
          {/* 단계 설명 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">단계 설명</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {currentStep.description}
              </p>

              {/* 지시사항 */}
              {currentStep.instructions.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">지시사항:</h4>
                  <ul className="space-y-1">
                    {currentStep.instructions.map((instruction, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                        <span className="inline-block w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-xs flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                          {index + 1}
                        </span>
                        {instruction}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 팁 */}
              {currentStep.tips && currentStep.tips.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-amber-800 dark:text-amber-200">
                    💡 팁
                  </h4>
                  <ul className="space-y-1">
                    {currentStep.tips.map((tip, index) => (
                      <li key={index} className="text-sm text-amber-700 dark:text-amber-300">
                        • {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 선택된 요소 정보 */}
          {selectedElement && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{selectedElement.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedElement.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedElement.description}
                    </p>
                  )}
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {selectedElement.type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 네비게이션 버튼 */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={isFirstStep}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              이전
            </Button>
            <Button
              onClick={handleNextStep}
              className="flex-1"
            >
              {isLastStep ? '완료' : '다음'}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveBoardLayout;
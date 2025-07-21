'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SetupStep, SetupProgress } from '@/types/game-setup';

interface SetupChecklistProps {
  steps: SetupStep[];
  progress: SetupProgress;
  onStepToggle: (stepId: string) => void;
  onStepFocus?: (stepId: string) => void;
  compact?: boolean;
  showProgress?: boolean;
  className?: string;
}

export function SetupChecklist({
  steps,
  progress,
  onStepToggle,
  onStepFocus,
  compact = false,
  showProgress = true,
  className
}: SetupChecklistProps) {
  const [focusedStep, setFocusedStep] = useState<string | null>(null);
  
  // 단계별 상태 계산
  const getStepStatus = (step: SetupStep): 'completed' | 'available' | 'locked' => {
    if (progress.completedSteps.has(step.id)) return 'completed';
    
    if (step.dependencies) {
      const allDependenciesMet = step.dependencies.every(depId => 
        progress.completedSteps.has(depId)
      );
      return allDependenciesMet ? 'available' : 'locked';
    }
    
    return 'available';
  };

  // 진행률 계산
  const completedCount = progress.completedSteps.size;
  const totalCount = steps.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // 다음 가능한 단계 찾기
  const nextAvailableStep = steps.find(step => getStepStatus(step) === 'available');

  const handleStepClick = (step: SetupStep) => {
    const status = getStepStatus(step);
    
    if (status === 'locked') return;
    
    setFocusedStep(step.id);
    onStepToggle(step.id);
    onStepFocus?.(step.id);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 진행률 헤더 */}
      {showProgress && (
        <div className="glass-card rounded-xl p-4 border border-amber-400/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-amber-100 flex items-center gap-2">
              <span>📋</span>
              셋업 체크리스트
            </h3>
            <span className="text-sm text-amber-300">
              {completedCount}/{totalCount}
            </span>
          </div>
          
          <div className="w-full bg-amber-900/30 rounded-full h-2 overflow-hidden mb-2">
            <motion.div
              className="bg-gradient-to-r from-amber-400 to-yellow-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          
          <p className="text-xs text-amber-200/70">
            {completedCount === totalCount 
              ? '🎉 모든 단계가 완료되었습니다!' 
              : nextAvailableStep 
                ? `다음: ${nextAvailableStep.title}`
                : '모든 가능한 단계가 완료되었습니다.'
            }
          </p>
        </div>
      )}

      {/* 체크리스트 */}
      <div className={cn(
        'space-y-2',
        compact ? 'space-y-1' : 'space-y-2'
      )}>
        <AnimatePresence>
          {steps.map((step, index) => {
            const status = getStepStatus(step);
            const isCompleted = status === 'completed';
            const isLocked = status === 'locked';
            const isNext = nextAvailableStep?.id === step.id;
            const isFocused = focusedStep === step.id;

            return (
              <motion.div
                key={step.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={cn(
                  'glass-card border transition-all duration-200 cursor-pointer',
                  compact ? 'p-3 rounded-lg' : 'p-4 rounded-xl',
                  isCompleted 
                    ? 'border-green-400/40 bg-green-500/10 hover:bg-green-500/15' 
                    : isLocked
                      ? 'border-gray-500/30 bg-gray-500/5 cursor-not-allowed opacity-60'
                      : isNext
                        ? 'border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/15 ring-1 ring-amber-400/30'
                        : 'border-amber-400/20 hover:border-amber-400/40 hover:bg-amber-500/5',
                  isFocused && 'ring-2 ring-amber-400/50'
                )}
                onClick={() => handleStepClick(step)}
                whileHover={!isLocked ? { scale: 1.01 } : {}}
                whileTap={!isLocked ? { scale: 0.99 } : {}}
              >
                <div className="flex items-start gap-3">
                  {/* 체크박스/상태 아이콘 */}
                  <div className={cn(
                    'flex-shrink-0 rounded-full border-2 transition-all duration-200 flex items-center justify-center',
                    compact ? 'w-5 h-5 mt-0.5' : 'w-6 h-6 mt-1',
                    isCompleted 
                      ? 'bg-green-500 border-green-400 text-white' 
                      : isLocked
                        ? 'border-gray-500/50 bg-gray-500/10'
                        : 'border-amber-400/60 hover:border-amber-400'
                  )}>
                    {isCompleted ? (
                      <motion.svg 
                        className={compact ? 'w-3 h-3' : 'w-4 h-4'} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </motion.svg>
                    ) : isLocked ? (
                      <svg className={compact ? 'w-3 h-3' : 'w-4 h-4'} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <div className={cn(
                        'rounded-full bg-amber-400/20',
                        compact ? 'w-2 h-2' : 'w-3 h-3'
                      )} />
                    )}
                  </div>

                  {/* 단계 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn(
                        'font-medium',
                        compact ? 'text-sm' : 'text-base',
                        isCompleted 
                          ? 'text-green-200 line-through' 
                          : isLocked
                            ? 'text-gray-400'
                            : 'text-amber-100'
                      )}>
                        {step.order}. {step.title}
                      </h4>
                      
                      {/* 상태 배지 */}
                      {isNext && (
                        <motion.span 
                          className="bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full text-xs font-medium"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          다음
                        </motion.span>
                      )}
                      
                      {step.estimatedTime && !compact && (
                        <span className="text-xs text-amber-300/70 flex items-center gap-1">
                          <span>⏱️</span>
                          {step.estimatedTime}분
                        </span>
                      )}
                    </div>

                    {/* 설명 (compact 모드가 아닐 때만) */}
                    {!compact && (
                      <p className={cn(
                        'text-sm leading-relaxed',
                        isCompleted 
                          ? 'text-green-200/70' 
                          : isLocked
                            ? 'text-gray-400/70'
                            : 'text-amber-200/80'
                      )}>
                        {step.description}
                      </p>
                    )}

                    {/* 의존성 정보 */}
                    {step.dependencies && step.dependencies.length > 0 && !compact && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-amber-300/60">의존성:</span>
                        <div className="flex gap-1">
                          {step.dependencies.map(depId => {
                            const depStep = steps.find(s => s.id === depId);
                            const isDepCompleted = progress.completedSteps.has(depId);
                            
                            return (
                              <span
                                key={depId}
                                className={cn(
                                  'text-xs px-2 py-0.5 rounded-full border',
                                  isDepCompleted
                                    ? 'bg-green-500/20 text-green-200 border-green-400/30'
                                    : 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                                )}
                              >
                                {depStep?.order || depId}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 완료 애니메이션 */}
                  <AnimatePresence>
                    {isCompleted && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="flex-shrink-0"
                      >
                        <div className="text-green-400 text-xl">
                          ✨
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 호버 시 추가 정보 */}
                {!compact && !isLocked && (
                  <motion.div
                    className="mt-3 pt-3 border-t border-amber-400/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={false}
                  >
                    <div className="flex items-center justify-between text-xs text-amber-300/70">
                      <span>클릭하여 {isCompleted ? '완료 취소' : '완료 표시'}</span>
                      {step.category && (
                        <span className="capitalize">{step.category}</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 완료 축하 메시지 */}
      <AnimatePresence>
        {completedCount === totalCount && totalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="glass-card rounded-xl p-6 border border-green-400/40 bg-green-500/10 text-center"
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.1, 1, 1.1, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
              className="text-4xl mb-3"
            >
              🎉
            </motion.div>
            <h3 className="text-xl font-bold text-green-200 mb-2">
              셋업 완료!
            </h3>
            <p className="text-green-300/80">
              모든 준비가 끝났습니다. 이제 게임을 시작하세요!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 간단한 체크리스트 아이템 컴포넌트
interface ChecklistItemProps {
  id: string;
  title: string;
  isCompleted: boolean;
  isLocked?: boolean;
  onToggle: () => void;
  className?: string;
}

export function ChecklistItem({
  id,
  title,
  isCompleted,
  isLocked = false,
  onToggle,
  className
}: ChecklistItemProps) {
  return (
    <motion.button
      onClick={isLocked ? undefined : onToggle}
      disabled={isLocked}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-all duration-200 w-full text-left',
        'min-h-[44px]', // 터치 친화적 높이
        isCompleted 
          ? 'bg-green-500/10 border border-green-400/30' 
          : isLocked
            ? 'bg-gray-500/5 border border-gray-500/20 opacity-60 cursor-not-allowed'
            : 'bg-amber-500/5 border border-amber-400/20 hover:bg-amber-500/10',
        className
      )}
      whileHover={!isLocked ? { scale: 1.01 } : {}}
      whileTap={!isLocked ? { scale: 0.99 } : {}}
    >
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
        isCompleted 
          ? 'bg-green-500 border-green-400 text-white' 
          : isLocked
            ? 'border-gray-500/50'
            : 'border-amber-400/60'
      )}>
        {isCompleted && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      
      <span className={cn(
        'font-medium',
        isCompleted 
          ? 'text-green-200 line-through' 
          : isLocked
            ? 'text-gray-400'
            : 'text-amber-100'
      )}>
        {title}
      </span>
      
      {isLocked && (
        <svg className="w-4 h-4 text-gray-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
      )}
    </motion.button>
  );
}
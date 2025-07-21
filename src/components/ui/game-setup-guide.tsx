'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { gameSetupService } from '@/lib/game-setup-service';
import { GameSetupGuide, SetupStep, SetupProgress, GameVariant } from '@/types/game-setup';
import { AccordionSection } from './accordion-section';
import VisualSetupGuide from '@/components/game-setup/visual-setup-guide';
import { Button } from './button';
import { Eye, List } from 'lucide-react';

interface GameSetupGuideProps {
  gameId: number;
  playerCount: number;
  onComplete?: () => void;
  onClose?: () => void;
  className?: string;
}

export function GameSetupGuideComponent({
  gameId,
  playerCount,
  onComplete,
  onClose,
  className
}: GameSetupGuideProps) {
  const [guide, setGuide] = useState<GameSetupGuide | null>(null);
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [progress, setProgress] = useState<SetupProgress>({
    gameId,
    playerCount,
    completedSteps: new Set(),
    startTime: new Date()
  });
  const [selectedVariant, setSelectedVariant] = useState<GameVariant | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showTips, setShowTips] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'visual'>('list');

  // 가이드 로드
  useEffect(() => {
    const setupGuide = gameSetupService.getSetupGuide(gameId);
    if (setupGuide) {
      setGuide(setupGuide);
      let setupSteps = gameSetupService.getSetupStepsForPlayerCount(gameId, playerCount);
      
      // 변형 규칙 적용
      if (selectedVariant) {
        setupSteps = gameSetupService.applyVariant(setupSteps, selectedVariant);
      }
      
      setSteps(setupSteps);
    }
  }, [gameId, playerCount, selectedVariant]);

  // 진행률 계산
  const progressPercentage = gameSetupService.calculateProgress(progress, steps);
  const completedCount = progress.completedSteps.size;
  const totalCount = steps.length;

  // 다음 단계 찾기
  const nextStep = gameSetupService.getNextStep(progress, steps);
  const isComplete = completedCount === totalCount;

  // 단계 완료/취소 토글
  const toggleStepCompletion = (stepId: string) => {
    if (progress.completedSteps.has(stepId)) {
      setProgress(gameSetupService.uncompleteStep(progress, stepId));
    } else {
      setProgress(gameSetupService.completeStep(progress, stepId));
    }
  };

  // 변형 규칙 선택
  const handleVariantChange = (variant: GameVariant | null) => {
    setSelectedVariant(variant);
    // 진행률 초기화
    setProgress({
      ...progress,
      completedSteps: new Set()
    });
  };

  if (!guide) {
    return (
      <div className={cn('glass-card rounded-2xl p-6 text-center', className)}>
        <div className="text-6xl mb-4">🎲</div>
        <h3 className="text-xl font-semibold text-amber-100 mb-2">
          셋업 가이드를 찾을 수 없습니다
        </h3>
        <p className="text-amber-200/80">
          이 게임의 셋업 가이드가 아직 준비되지 않았습니다.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 헤더 */}
      <div className="glass-card rounded-2xl p-6 border border-amber-400/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-amber-100 mb-2 flex items-center gap-3">
              <span className="text-3xl">🎯</span>
              {guide.gameTitle} 셋업 가이드
            </h2>
            <div className="flex items-center gap-4 text-sm text-amber-200/80">
              <span>👥 {playerCount}명</span>
              <span>⏱️ 약 {guide.estimatedTime}분</span>
              <span className={cn(
                'px-2 py-1 rounded-full text-xs font-medium',
                guide.difficulty === 'beginner' ? 'bg-green-500/20 text-green-200' :
                guide.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-200' :
                'bg-red-500/20 text-red-200'
              )}>
                {guide.difficulty === 'beginner' ? '초급' :
                 guide.difficulty === 'intermediate' ? '중급' : '고급'}
              </span>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-amber-500/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 진행률 표시 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-200">
              진행률: {completedCount}/{totalCount}
            </span>
            <span className="text-sm text-amber-300">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-amber-900/30 rounded-full h-3 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-amber-400 to-yellow-500 h-3 rounded-full shadow-lg"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* 보기 모드 전환 */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            목록 보기
          </Button>
          <Button
            variant={viewMode === 'visual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('visual')}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            시각적 가이드
          </Button>
        </div>

        {/* 완료 상태 */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/20 border border-green-400/30 rounded-lg p-4 mb-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <h4 className="font-semibold text-green-200">셋업 완료!</h4>
                <p className="text-sm text-green-300/80">이제 게임을 시작할 수 있습니다.</p>
              </div>
            </div>
            {onComplete && (
              <button
                onClick={onComplete}
                className="mt-3 btn-game-primary px-4 py-2 rounded-lg text-sm"
              >
                게임 시작하기
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* 변형 규칙 선택 */}
      {guide.variants && guide.variants.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-amber-400/20">
          <h3 className="font-semibold text-amber-100 mb-3 flex items-center gap-2">
            <span>🎭</span>
            변형 규칙
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="variant"
                checked={!selectedVariant}
                onChange={() => handleVariantChange(null)}
                className="text-amber-400 focus:ring-amber-400"
              />
              <span className="text-amber-200">표준 규칙</span>
            </label>
            {guide.variants.map(variant => (
              <label key={variant.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="variant"
                  checked={selectedVariant?.id === variant.id}
                  onChange={() => handleVariantChange(variant)}
                  className="text-amber-400 focus:ring-amber-400"
                />
                <div>
                  <span className="text-amber-200 font-medium">{variant.name}</span>
                  <p className="text-xs text-amber-300/70">{variant.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 셋업 단계 - 모드별 렌더링 */}
      {viewMode === 'visual' ? (
        <VisualSetupGuide
          gameId={guide.gameTitle.toLowerCase().replace(/\s+/g, '-')}
          gameName={guide.gameTitle}
          playerCount={playerCount}
          onComplete={onComplete}
        />
      ) : (
        <div className="space-y-4">
          {steps.map((step, index) => (
            <SetupStepCard
              key={step.id}
              step={step}
              isCompleted={progress.completedSteps.has(step.id)}
              isNext={nextStep?.id === step.id}
              playerCount={playerCount}
              onToggleComplete={() => toggleStepCompletion(step.id)}
            />
          ))}
        </div>
      )}

      {/* 팁 섹션 */}
      {guide.tips && guide.tips.length > 0 && showTips && (
        <AccordionSection
          title="유용한 팁"
          icon="💡"
          defaultExpanded={false}
          variant="bordered"
        >
          <div className="space-y-3">
            {guide.tips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-400/20">
                <span className="text-amber-400 flex-shrink-0 mt-0.5">•</span>
                <p className="text-amber-200 text-sm leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}
    </div>
  );
}

// 개별 셋업 단계 카드 컴포넌트
interface SetupStepCardProps {
  step: SetupStep;
  isCompleted: boolean;
  isNext: boolean;
  playerCount: number;
  onToggleComplete: () => void;
}

function SetupStepCard({ 
  step, 
  isCompleted, 
  isNext, 
  playerCount, 
  onToggleComplete 
}: SetupStepCardProps) {
  const categoryIcons = {
    preparation: '🔧',
    components: '🧩',
    board: '🗺️',
    cards: '🃏',
    tokens: '🪙',
    final: '✅'
  };

  const categoryColors = {
    preparation: 'border-blue-400/30 bg-blue-500/10',
    components: 'border-purple-400/30 bg-purple-500/10',
    board: 'border-green-400/30 bg-green-500/10',
    cards: 'border-red-400/30 bg-red-500/10',
    tokens: 'border-yellow-400/30 bg-yellow-500/10',
    final: 'border-emerald-400/30 bg-emerald-500/10'
  };

  // 플레이어 수별 특별 설명
  const playerSpecificInfo = step.playerCountSpecific?.[playerCount];

  return (
    <motion.div
      layout
      className={cn(
        'glass-card rounded-xl border transition-all duration-200',
        isCompleted ? 'border-green-400/40 bg-green-500/10' : 
        isNext ? 'border-amber-400/40 bg-amber-500/10 ring-2 ring-amber-400/20' :
        'border-amber-400/20',
        categoryColors[step.category]
      )}
    >
      <div className="p-4 md:p-6">
        <div className="flex items-start gap-4">
          {/* 완료 체크박스 */}
          <button
            onClick={onToggleComplete}
            className={cn(
              'flex-shrink-0 w-6 h-6 rounded-full border-2 transition-all duration-200 mt-1',
              'min-w-[44px] min-h-[44px] flex items-center justify-center',
              isCompleted 
                ? 'bg-green-500 border-green-400 text-white' 
                : 'border-amber-400/60 hover:border-amber-400'
            )}
          >
            {isCompleted && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            {/* 단계 헤더 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{categoryIcons[step.category]}</span>
              <h3 className={cn(
                'font-semibold text-lg',
                isCompleted ? 'text-green-200 line-through' : 'text-amber-100'
              )}>
                {step.order}. {step.title}
              </h3>
              {isNext && (
                <span className="bg-amber-500/20 text-amber-200 px-2 py-1 rounded-full text-xs font-medium">
                  다음
                </span>
              )}
              {step.estimatedTime && (
                <span className="text-xs text-amber-300/70">
                  ⏱️ {step.estimatedTime}분
                </span>
              )}
            </div>

            {/* 단계 설명 */}
            <p className={cn(
              'text-sm leading-relaxed mb-4',
              isCompleted ? 'text-green-200/80' : 'text-amber-200'
            )}>
              {step.description}
            </p>

            {/* 플레이어 수별 특별 정보 */}
            {playerSpecificInfo && (
              <div className="mb-4 p-3 bg-amber-500/10 rounded-lg border border-amber-400/20">
                <h4 className="text-sm font-medium text-amber-200 mb-1">
                  👥 {playerCount}명 플레이 시:
                </h4>
                <p className="text-sm text-amber-200/80">{playerSpecificInfo.description}</p>
                {playerSpecificInfo.modifications && (
                  <ul className="mt-2 space-y-1">
                    {playerSpecificInfo.modifications.map((mod, index) => (
                      <li key={index} className="text-xs text-amber-300/70 flex items-start gap-1">
                        <span>•</span>
                        <span>{mod}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* 필요한 구성 요소 */}
            {step.components && step.components.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-amber-200 mb-2 flex items-center gap-1">
                  <span>📦</span>
                  필요한 구성 요소:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {step.components.map((component, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0"></span>
                      <span className="text-amber-200 font-medium">{component.name}</span>
                      <span className="text-amber-300/70">
                        × {component.playerCountModifier?.[playerCount] || component.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 자주 하는 실수 */}
            {step.commonMistakes && step.commonMistakes.length > 0 && (
              <AccordionSection
                title="자주 하는 실수"
                icon="⚠️"
                variant="compact"
                defaultExpanded={false}
              >
                <div className="space-y-2">
                  {step.commonMistakes.map((mistake, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-red-400 flex-shrink-0 mt-0.5">⚠️</span>
                      <span className="text-red-200">{mistake}</span>
                    </div>
                  ))}
                </div>
              </AccordionSection>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
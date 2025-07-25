/**
 * Enhanced Loading Overlay Component
 * 
 * 룰마스터 초기화 시 표시되는 개선된 중앙 로딩 오버레이입니다.
 * 단계별 진행 상황과 상세한 메시지를 제공하여 사용자 경험을 향상시킵니다.
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Brain, Search, Cog, Sparkles, CheckCircle } from 'lucide-react';
import { InitializationStage } from '@/usecases/initialize-rulemaster';

interface EnhancedLoadingOverlayProps {
  isVisible: boolean;
  stage?: InitializationStage;
  className?: string;
}

// 단계별 아이콘 매핑
const stageIcons = {
  starting: Search,
  checking_game: Brain,
  initializing_ai: Cog,
  generating_message: Sparkles,
  completed: CheckCircle
};

// 단계별 색상 매핑
const stageColors = {
  starting: 'text-blue-400',
  checking_game: 'text-amber-400',
  initializing_ai: 'text-purple-400',
  generating_message: 'text-green-400',
  completed: 'text-emerald-400'
};

/**
 * 개선된 로딩 오버레이 컴포넌트
 */
export function EnhancedLoadingOverlay({ 
  isVisible, 
  stage,
  className = '' 
}: EnhancedLoadingOverlayProps) {
  if (!isVisible) return null;

  const StageIcon = stage ? stageIcons[stage.stage] : Loader2;
  const iconColor = stage ? stageColors[stage.stage] : 'text-amber-400';
  const progress = stage?.progress || 0;
  const message = stage?.message || '준비하고 있어요...';

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
        style={{
          background: 'rgba(0, 0, 0, 0.95)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <motion.div
          className="relative rounded-3xl px-8 py-8 max-w-md w-full mx-4 shadow-2xl border border-amber-400/30"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))',
          }}
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          {/* 배경 글로우 효과 */}
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative z-10">
            {/* 상단 아이콘과 제목 */}
            <div className="flex items-center justify-center mb-6">
              <motion.div
                className={`p-4 rounded-2xl bg-amber-500/20 border border-amber-400/40`}
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: stage?.stage === 'initializing_ai' ? [0, 360] : 0
                }}
                transition={{
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 2, repeat: Infinity, ease: "linear" }
                }}
              >
                <StageIcon className={`w-8 h-8 ${iconColor}`} />
              </motion.div>
            </div>

            {/* 메인 제목 */}
            <div className="text-center mb-6">
              <motion.h3 
                className="text-xl font-bold text-amber-100 mb-2"
                key={stage?.stage} // 단계 변경 시 애니메이션
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                🤖 룰버디가 준비하고 있어요
              </motion.h3>
              <motion.p 
                className="text-sm text-amber-200/80"
                key={message} // 메시지 변경 시 애니메이션
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                최고의 답변을 위해 차근차근 준비하고 있습니다
              </motion.p>
            </div>

            {/* 현재 단계 정보 */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <motion.span 
                  className="font-medium text-sm text-slate-200"
                  key={message}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {message}
                </motion.span>
                <motion.span
                  className="font-bold text-sm text-primary-300"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                >
                  {progress}%
                </motion.span>
              </div>

              {/* 진행률 바 */}
              <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden border border-slate-700/50">
                <motion.div
                  className="h-3 rounded-full shadow-lg bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ 
                    duration: 0.8, 
                    ease: "easeOut",
                    type: "spring",
                    stiffness: 100
                  }}
                />
              </div>
            </div>

            {/* 단계별 체크리스트 */}
            <div className="space-y-2 mb-6">
              {[
                { key: 'starting', label: '시스템 준비' },
                { key: 'checking_game', label: '게임 정보 확인' },
                { key: 'initializing_ai', label: 'AI 시스템 초기화' },
                { key: 'generating_message', label: '맞춤 메시지 생성' },
                { key: 'completed', label: '준비 완료' }
              ].map((step, index) => {
                const isActive = stage?.stage === step.key;
                const isCompleted = stage && Object.keys(stageIcons).indexOf(stage.stage) > index;
                
                return (
                  <motion.div
                    key={step.key}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                      isActive 
                        ? 'bg-amber-500/20 border border-amber-400/30' 
                        : isCompleted 
                          ? 'bg-green-500/10 border border-green-400/20'
                          : 'bg-slate-800/30 border border-slate-600/20'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                      isCompleted 
                        ? 'bg-green-400' 
                        : isActive 
                          ? 'bg-amber-400 animate-pulse' 
                          : 'bg-slate-500'
                    }`} />
                    <span className={`text-sm transition-colors duration-300 ${
                      isActive 
                        ? 'text-amber-200 font-medium' 
                        : isCompleted 
                          ? 'text-green-200'
                          : 'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                    {isCompleted && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto"
                      >
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* 하단 힌트 텍스트 */}
            <div className="text-center">
              <motion.p 
                className="text-xs text-amber-300/60"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {stage?.stage === 'completed' 
                  ? '준비가 완료되었습니다! ✨' 
                  : '잠시만 기다려 주세요 ✨'
                }
              </motion.p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * 간단한 로딩 스피너 컴포넌트 (폴백용)
 */
export function SimpleLoadingSpinner({ 
  size = 'md',
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <Loader2 className="w-full h-full text-amber-400" />
    </motion.div>
  );
}

/**
 * 로딩 상태 훅 (옵션)
 */
export function useLoadingState() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [stage, setStage] = React.useState<InitializationStage | undefined>();

  const startLoading = (initialStage?: InitializationStage) => {
    setIsLoading(true);
    if (initialStage) {
      setStage(initialStage);
    }
  };

  const updateStage = (newStage: InitializationStage) => {
    setStage(newStage);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setStage(undefined);
  };

  return {
    isLoading,
    stage,
    startLoading,
    updateStage,
    stopLoading
  };
} 
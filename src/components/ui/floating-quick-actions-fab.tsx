/**
 * Floating Quick Actions FAB Component - Enhanced UX
 * 
 * 개선사항:
 * 1. 위치: bottom-32로 더 위로 올려서 채팅창과 완전 분리
 * 2. 효과: 과도한 애니메이션 제거, 차분하고 세련된 효과로 개선
 * 3. 품질: 미니멀하면서도 고급스러운 UX 적용
 * 4. 색상 유지: 클릭 후에도 원래 색상 유지, 일시적 성공 피드백 제공
 */

'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Target, Settings, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingQuickActionsFABProps {
  onActionClick: (question: string) => void;
  className?: string;
  isVisible?: boolean;
}

// 퀵액션 정의 (차분하고 세련된 호버 효과)
const quickActions = [
  {
    id: 'game-overview',
    label: '게임 요약',
    icon: Target,
    question: '[FORCE_RESEARCH] 이 게임의 기본 규칙과 목표를 간단히 설명해주세요.',
    description: '기본 규칙과 목표',
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    hoverGradient: 'hover:from-amber-500 hover:via-orange-500 hover:to-amber-600',
    successGradient: 'from-emerald-400 to-teal-500'
  },
  {
    id: 'setup-guide', 
    label: '셋업 가이드',
    icon: Settings,
    question: '[FORCE_RESEARCH] 게임 셋업 방법을 단계별로 알려주세요.',
    description: '게임 준비 과정',
    gradient: 'from-emerald-600 via-emerald-500 to-teal-600',
    hoverGradient: 'hover:from-emerald-600 hover:via-emerald-500 hover:to-teal-600',
    successGradient: 'from-emerald-400 to-teal-500'
  }
];

export function FloatingQuickActionsFAB({ 
  onActionClick, 
  className,
  isVisible = true 
}: FloatingQuickActionsFABProps) {
  // ✅ early return을 모든 hooks 호출보다 먼저 배치
  if (!isVisible) return null;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [clickedActions, setClickedActions] = useState<Set<string>>(new Set());

  const handleActionClick = useCallback((question: string, actionId: string) => {
    // 클릭 상태 추가
    setClickedActions(prev => new Set(prev).add(actionId));
    
    // 액션 실행
    onActionClick(question);
    
    // 메뉴 닫기 (약간의 지연으로 성공 표시를 볼 수 있게)
    setTimeout(() => {
      setIsExpanded(false);
    }, 500);

    // 2초 후 클릭 상태 초기화 (다음 사용을 위해)
    setTimeout(() => {
      setClickedActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }, 2000);
  }, [onActionClick]);

  return (
    <div className={cn("fixed bottom-32 right-6 z-40", className)}>
      <AnimatePresence>
        {/* 퀵액션 버튼들 - 색상 유지 및 피드백 개선 */}
        {isExpanded && (
          <motion.div
            className="flex flex-col gap-2.5 mb-4"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ 
              duration: 0.2, 
              ease: "easeOut"
            }}
          >
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              const isClicked = clickedActions.has(action.id);
              
              return (
                <motion.button
                  key={action.id}
                  onClick={() => handleActionClick(action.question, action.id)}
                  disabled={isClicked} // 클릭 중일 때 중복 클릭 방지
                  className={cn(
                    'group relative flex items-center gap-3 px-4 py-3 rounded-xl',
                    'text-white font-medium shadow-lg',
                    'transition-all duration-300 ease-out',
                    'border border-white/10 hover:border-white/20',
                    'disabled:cursor-default', // 클릭 중일 때 커서 변경
                    'backdrop-blur-sm', // 글래스 효과
                    // 기본 그라디언트 (항상 유지)
                    !isClicked && [
                      'bg-gradient-to-r', 
                      action.gradient,
                      'hover:shadow-2xl hover:shadow-black/20',
                      'hover:-translate-y-0.5', // 미묘한 상승 효과
                      'hover:brightness-110' // 아주 미묘한 밝기 증가
                    ],
                    // 성공 상태 그라디언트 (일시적)
                    isClicked && [
                      'bg-gradient-to-r',
                      action.successGradient
                    ]
                  )}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  whileHover={!isClicked ? { scale: 1.02 } : {}}
                  whileTap={!isClicked ? { scale: 0.98 } : {}}
                >
                  {/* 아이콘 - 성공 시 체크마크 표시 */}
                  <AnimatePresence mode="wait">
                    {isClicked ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        transition={{ duration: 0.3, ease: "backOut" }}
                      >
                        <Check className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="icon"
                        initial={{ scale: 0, rotate: 90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -90 }}
                        transition={{ duration: 0.2 }}
                      >
                        <IconComponent className="w-5 h-5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* 텍스트 - 성공 시 "전송됨" 표시 */}
                  <div className="flex flex-col items-start">
                    <AnimatePresence mode="wait">
                      {isClicked ? (
                        <motion.span
                          key="success"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-sm font-medium leading-tight"
                        >
                          전송됨!
                        </motion.span>
                      ) : (
                        <motion.span
                          key="label"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="text-sm font-medium leading-tight"
                        >
                          {action.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    
                    <AnimatePresence mode="wait">
                      {isClicked ? (
                        <motion.span
                          key="success-desc"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-xs opacity-80 leading-tight"
                        >
                          질문이 전송되었습니다
                        </motion.span>
                      ) : (
                        <motion.span
                          key="desc"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="text-xs opacity-80 leading-tight"
                        >
                          {action.description}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 미묘한 글로우 효과 - 클릭 상태가 아닐 때만 */}
                  {!isClicked && (
                    <div className="absolute inset-0 rounded-xl bg-white/3 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105" />
                  )}

                  {/* 성공 상태 펄스 효과 */}
                  {isClicked && (
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-white/10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.3, 0] }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메인 FAB 버튼 - 차분하고 세련된 디자인 */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'relative group w-14 h-14 rounded-full',
          'bg-gradient-to-br from-rose-600 via-pink-700 to-purple-700',
          'text-white shadow-lg',
          'flex flex-col items-center justify-center',
          'transition-all duration-300 ease-out',
          'border border-white/20 hover:border-white/30',
          'backdrop-blur-sm',
          'hover:shadow-2xl hover:shadow-pink-900/30',
          'hover:-translate-y-1 hover:brightness-110'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ 
          rotate: isExpanded ? 45 : 0
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* 메인 아이콘 */}
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="close"
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -45, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center"
            >
              <Zap className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] font-medium leading-none opacity-90">
                퀵액션
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 미묘한 호버 글로우 */}
        <div className="absolute inset-0 rounded-full bg-white/3 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110" />
      </motion.button>

      {/* 깔끔한 툴팁 */}
      <AnimatePresence>
        {isHovered && !isExpanded && (
          <motion.div
            className="absolute right-full top-1/2 -translate-y-1/2 mr-3"
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 5 }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-slate-700/90 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap font-medium shadow-lg backdrop-blur-sm">
              퀵액션
              <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-700/90" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모바일 배경 오버레이 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed inset-0 z-[-1] md:hidden bg-black/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 
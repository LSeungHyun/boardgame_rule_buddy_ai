'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, HelpCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingFeedbackFABProps {
  /** FAB 클릭 시 피드백 모달 열기 함수 */
  onFeedbackClick: () => void;
  /** 현재 피드백 모달이 열려있는지 여부 */
  isModalOpen?: boolean;
  /** 현재 페이지 컨텍스트 (자동 카테고리 감지용) */
  pageContext?: 'home' | 'rulemaster' | 'game_selection';
}

export function FloatingFeedbackFAB({ 
  onFeedbackClick, 
  isModalOpen = false,
  pageContext = 'home' 
}: FloatingFeedbackFABProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPulsing, setIsPulsing] = useState(true);

  // 페이지별 컨텍스트에 따른 스타일 변경
  const getContextStyles = () => {
    switch (pageContext) {
      case 'rulemaster':
        return {
          gradient: 'from-pink-500/90 to-rose-500/90',
          pulseColor: 'pink-400/50',
          label: '어떠셨나요?',
          icon: MessageCircle,
          ariaLabel: '피드백 남기기 - 어떠셨나요?',
          emoji: '🤔'
        };
      case 'game_selection':
        return {
          gradient: 'from-amber-500/90 to-orange-500/90',
          pulseColor: 'amber-400/50',
          label: '의견 남기기',
          icon: MessageCircle,
          ariaLabel: '피드백 보내기',
          emoji: '💭'
        };
      default:
        return {
          gradient: 'from-purple-500/90 to-indigo-500/90',
          pulseColor: 'purple-400/50',
          label: '피드백 주세요',
          icon: MessageCircle,
          ariaLabel: '피드백 보내기',
          emoji: null
        };
    }
  };

  const { gradient, pulseColor, label, icon: ContextIcon, ariaLabel, emoji } = getContextStyles();

  const handleClick = () => {
    setIsPulsing(false);
    onFeedbackClick();
  };

  // 모달이 열려있을 때는 펄스 애니메이션 중지
  React.useEffect(() => {
    if (isModalOpen) {
      setIsPulsing(false);
    } else {
      // 모달 닫힌 후 3초 뒤에 펄스 재시작
      const timer = setTimeout(() => setIsPulsing(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);



  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20,
        delay: 0.5
      }}
    >
      {/* 펄스 애니메이션 링 */}
      <AnimatePresence>
        {isPulsing && !isModalOpen && (
          <motion.div
            className={`absolute inset-0 rounded-full bg-${pulseColor}`}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ 
              scale: [1, 1.8, 1], 
              opacity: [0.6, 0, 0.6] 
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </AnimatePresence>

      {/* 매력적인 피드백 FAB 버튼 */}
      <Button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          floating-feedback-fab
          relative px-5 py-3 rounded-full
          bg-gradient-to-br ${gradient}
          hover:shadow-2xl hover:shadow-current/30
          border-2 border-white/30
          gpu-accelerated
          transition-all duration-300 ease-out
          active:scale-95
          flex items-center gap-3
          min-h-[56px] touch-manipulation
          shadow-lg
        `}
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
        aria-label={ariaLabel}
      >
        {/* 이모지, 아이콘과 텍스트 */}
        <motion.div
          className="flex items-center gap-3"
          animate={{
            rotate: isModalOpen ? 180 : 0,
            scale: isHovered ? 1.05 : 1
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {isModalOpen ? (
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <>
              {/* 이모지 - 조건부 렌더링 */}
              {emoji && (
                <motion.span
                  className="text-2xl"
                  animate={{ 
                    scale: isPulsing ? [1, 1.2, 1] : 1,
                    rotate: isHovered ? [0, -10, 10, 0] : 0
                  }}
                  transition={{ 
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 0.8, ease: "easeInOut" }
                  }}
                >
                  {emoji}
                </motion.span>
              )}
              {/* 아이콘 */}
              <motion.div
                animate={{ 
                  scale: isHovered ? [1, 1.1, 1] : 1,
                  rotate: isHovered ? [0, -5, 5, 0] : 0
                }}
                transition={{ 
                  scale: { duration: 0.4, ease: "easeInOut" },
                  rotate: { duration: 0.6, ease: "easeInOut" }
                }}
              >
                <ContextIcon className="w-5 h-5 text-white" />
              </motion.div>
            </>
          )}
          {!isModalOpen && (
            <motion.div
              className="flex flex-col items-start"
              animate={{ 
                opacity: isHovered ? 1 : 0.95,
                x: isHovered ? 3 : 0
              }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-xs text-white/80 leading-tight">터치로 간단히</span>
              <span className="text-sm font-semibold text-white leading-tight">{label}</span>
            </motion.div>
          )}
        </motion.div>

        {/* 호버 시 글로우 효과 */}
        <motion.div
          className="absolute inset-0 rounded-full bg-white/20"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: isHovered ? 1 : 0,
            scale: isHovered ? 1 : 0.8
          }}
          transition={{ duration: 0.2 }}
        />
      </Button>
    </motion.div>
  );
} 
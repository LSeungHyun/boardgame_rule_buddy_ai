'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart } from 'lucide-react';
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
          gradient: 'from-pink-500/80 to-rose-600/80',
          pulseColor: 'pink-400/40',
          label: '문의하기'
        };
      case 'game_selection':
        return {
          gradient: 'from-emerald-500/80 to-green-600/80',
          pulseColor: 'emerald-400/40',
          label: '문의하기'
        };
      default:
        return {
          gradient: 'from-primary/80 to-primary-600/80',
          pulseColor: 'primary/40',
          label: '문의하기'
        };
    }
  };

  const { gradient, pulseColor, label } = getContextStyles();

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

      {/* 통합된 FAB 버튼 (하트 + 문의하기) */}
      <Button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          floating-feedback-fab
          relative px-4 py-3 rounded-full
          bg-gradient-to-br ${gradient}
          hover:shadow-xl hover:shadow-primary/25
          border border-white/20
          gpu-accelerated
          transition-all duration-300 ease-out
          active:scale-95
          flex items-center gap-2
        `}
        style={{
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        }}
        aria-label="문의하기"
      >
        {/* 아이콘과 텍스트 */}
        <motion.div
          className="flex items-center gap-2"
          animate={{
            rotate: isModalOpen ? 180 : 0,
            scale: isHovered ? 1.05 : 1
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {isModalOpen ? (
            <X className="w-5 h-5 text-white" />
          ) : (
            <Heart className="w-5 h-5 text-white" />
          )}
          {!isModalOpen && (
            <span className="text-sm font-medium text-white whitespace-nowrap">
              {label}
            </span>
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
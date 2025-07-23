'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BetaBannerProps {
  className?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
}

export function BetaBanner({ 
  className, 
  showCloseButton = true,
  onClose 
}: BetaBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            "relative overflow-hidden rounded-xl border border-green-400/30 mb-6",
            "bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10",
            "backdrop-blur-sm shadow-lg shadow-green-500/10",
            className
          )}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ 
            duration: 0.5,
            type: "spring",
            stiffness: 200,
            damping: 20
          }}
        >
          {/* 배경 애니메이션 효과 */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-green-400/5 via-emerald-400/10 to-green-400/5"
            animate={{
              x: ['-100%', '100%'],
              opacity: [0.3, 0.7, 0.3]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          />

          <div className="relative p-4 flex items-center gap-3">
            {/* 베타 아이콘 */}
            <motion.div
              className="flex-shrink-0"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                <motion.span 
                  className="text-2xl"
                  animate={{
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  🌱
                </motion.span>
              </div>
            </motion.div>

            {/* 콘텐츠 */}
            <div className="flex-1 min-w-0">
              <motion.h3 
                className="text-sm sm:text-base font-bold text-green-400 mb-1 flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <span className="inline-block px-2 py-1 bg-green-400/20 rounded-full text-xs font-semibold border border-green-400/30">
                  BETA
                </span>
                지금은 베타 서비스 중이에요!
              </motion.h3>
              
              <motion.div
                className="space-y-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
                  현재는 <span className="font-semibold text-green-300">365개</span>의 인기 보드게임을 지원하고 있으며, 
                  더 많은 게임과 기능이 <span className="font-semibold text-green-300">업데이트될 예정</span>이에요! 
                </p>
                
                <motion.div 
                  className="flex items-center gap-2 mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <div className="flex items-center gap-1 text-xs text-green-300/80">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    빠른 업데이트
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-300/80">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></span>
                    사용자 피드백 반영
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* 닫기 버튼 */}
            {showCloseButton && (
              <motion.button
                onClick={handleClose}
                className="flex-shrink-0 p-2 rounded-full hover:bg-green-500/20 transition-all duration-200 group"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <motion.svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-green-300/60 group-hover:text-green-300 transition-colors"
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 6L6 18M6 6l12 12"
                  />
                </motion.svg>
              </motion.button>
            )}
          </div>

          {/* 하단 강조 라인 */}
          <motion.div
            className="h-1 bg-gradient-to-r from-transparent via-green-400/50 to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 사용자 가이드 섹션 컴포넌트
interface UserGuideSectionProps {
  className?: string;
}

export function UserGuideSection({ className }: UserGuideSectionProps) {
  const guides = [
    { icon: "📦", text: "게임 박스를 열고 멈칫한 분" },
    { icon: "📚", text: "룰북은 넘기기 싫은데, 설명은 필요하신 분" },
    { icon: "🤔", text: "오랜만에 하는 게임이 가물가물하신 분" },
    { icon: "👥", text: "친구들에게 룰 설명해야 해서 부담된 분" }
  ];

  return (
    <motion.div
      className={cn("mb-8", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h2 
        className="text-xl font-bold text-amber-100 mb-6 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        🎯 이런 분들께 딱!
      </motion.h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
        <AnimatePresence>
          {guides.map((guide, index) => (
            <motion.div
              key={index}
              className="glass-card rounded-lg p-4 flex items-center gap-3 group hover:scale-[1.02] transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ 
                delay: 0.3 + index * 0.1, 
                duration: 0.4,
                ease: "easeOut"
              }}
              whileHover={{ y: -2 }}
            >
              <motion.span 
                className="text-xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
                animate={{
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 3 + index * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {guide.icon}
              </motion.span>
              <span className="text-sm text-amber-200/90 group-hover:text-amber-200 transition-colors">
                {guide.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
} 
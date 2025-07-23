'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SendButtonProps } from '@/types/ui';

export function SendButton({
  isEnabled,
  isLoading,
  onClick,
  className,
  isInputFocused = false,
  type = 'submit',
  'aria-label': ariaLabel
}: SendButtonProps) {
  // 버튼 상태에 따른 스타일 결정
  const getButtonStyle = () => {
    if (isLoading) {
      return 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))';
    }
    if (isEnabled) {
      return 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25))';
    }
    return 'var(--glass-dark)';
  };

  const getIconColor = () => {
    if (isLoading) return 'text-primary-400';
    if (isEnabled) return 'text-primary-300';
    return 'text-slate-500';
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={!isEnabled || isLoading}
      aria-label={ariaLabel || (isLoading ? '메시지 전송 중...' : '메시지 전송')}
      className={cn(
        // 기본 스타일
        'relative overflow-hidden rounded-2xl',
        'glass-card-premium hover-premium',
        'transition-all duration-300 ease-out',
        
        // 모바일 최적화: 터치 타겟 크기
        'min-w-[48px] min-h-[48px] w-12 h-12',
        'md:min-w-[52px] md:min-h-[52px] md:w-13 md:h-13',
        
        // 상태별 스타일
        'disabled:opacity-40 disabled:cursor-not-allowed',
        isEnabled && !isLoading && 'shadow-lg shadow-primary-500/20',
        
        // 플렉스 중앙 정렬
        'flex items-center justify-center',
        
        className
      )}
      style={{
        background: getButtonStyle(),
      }}
      whileHover={isEnabled && !isLoading ? { 
        scale: 1.05, 
        y: -1,
        transition: { duration: 0.2 }
      } : {}}
      whileTap={isEnabled && !isLoading ? { 
        scale: 0.95,
        transition: { duration: 0.1 }
      } : {}}
      initial={{ scale: 1 }}
    >
      {/* 배경 글로우 효과 */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        animate={{
          background: isEnabled && !isLoading && isInputFocused
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))'
            : 'transparent'
        }}
        transition={{ duration: 0.3 }}
      />

      {/* 아이콘 영역 */}
      <motion.div
        className="relative z-10"
        animate={{
          scale: isEnabled && !isLoading ? [1, 1.1, 1] : 1
        }}
        transition={{
          duration: 2,
          repeat: isEnabled && !isLoading ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        {isLoading ? (
          <Loader2 
            className={cn('w-5 h-5', getIconColor())} 
            style={{
              animation: 'spin 1s linear infinite'
            }}
          />
        ) : (
          <Send 
            className={cn(
              'w-5 h-5 transition-colors duration-300',
              getIconColor()
            )} 
          />
        )}
      </motion.div>

      {/* 리플 효과 */}
      {isEnabled && !isLoading && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
          }}
          initial={{ scale: 0, opacity: 1 }}
          whileTap={{
            scale: 2.5,
            opacity: 0,
            transition: { duration: 0.6, ease: "easeOut" }
          }}
        />
      )}
    </motion.button>
  );
}

// 기본 내보내기도 추가
export default SendButton; 
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RecommendedQuestion } from '@/lib/question-recommender';

interface QuestionRecommendationsProps {
  questions: RecommendedQuestion[];
  onQuestionClick: (question: string) => void;
  className?: string;
  title?: string;
}

const categoryStyles = {
  'follow-up': {
    icon: '🔄',
    label: '후속 질문',
    color: 'text-blue-200',
    bg: 'bg-blue-500/10',
    border: 'border-blue-400/30'
  },
  'related': {
    icon: '🔗',
    label: '관련 질문',
    color: 'text-green-200',
    bg: 'bg-green-500/10',
    border: 'border-green-400/30'
  },
  'clarification': {
    icon: '❓',
    label: '명확화',
    color: 'text-yellow-200',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-400/30'
  },
  'example': {
    icon: '📝',
    label: '예시',
    color: 'text-purple-200',
    bg: 'bg-purple-500/10',
    border: 'border-purple-400/30'
  }
};

export function QuestionRecommendations({
  questions,
  onQuestionClick,
  className,
  title = "💡 이런 질문은 어떠세요?"
}: QuestionRecommendationsProps) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={cn(
        'glass-card rounded-2xl p-4 md:p-6 border border-amber-400/20',
        className
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-amber-100">
          {title}
        </h3>
      </div>

      {/* 추천 질문 목록 */}
      <div className="space-y-3">
        {questions.map((question, index) => {
          const categoryStyle = categoryStyles[question.category];
          
          return (
            <motion.button
              key={question.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.1 }}
              onClick={() => onQuestionClick(question.question)}
              className={cn(
                'w-full text-left p-4 rounded-xl transition-all duration-200',
                'hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400/50',
                'glass-card border min-h-[60px] flex items-center', // 터치 친화적 높이
                categoryStyle.bg,
                categoryStyle.border
              )}
            >
              <div className="flex items-start gap-3 w-full">
                {/* 카테고리 아이콘 */}
                <div className="flex-shrink-0 mt-1">
                  <span className="text-xl">{categoryStyle.icon}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* 질문 텍스트 */}
                  <p className={cn(
                    'font-medium leading-relaxed text-sm md:text-base',
                    categoryStyle.color
                  )}>
                    {question.question}
                  </p>
                  
                  {/* 메타 정보 */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      categoryStyle.bg,
                      categoryStyle.color,
                      'border',
                      categoryStyle.border
                    )}>
                      {categoryStyle.label}
                    </span>
                    
                    {question.gameSpecific && (
                      <span className="text-xs bg-amber-500/20 text-amber-200 px-2 py-1 rounded-full border border-amber-400/30">
                        게임 특화
                      </span>
                    )}
                    
                    {/* 관련도 표시 */}
                    <div className="flex items-center gap-1 ml-auto">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            i < Math.round(question.relevanceScore * 5)
                              ? 'bg-amber-400'
                              : 'bg-amber-400/20'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* 클릭 힌트 */}
                <div className="flex-shrink-0 ml-2">
                  <svg 
                    className="w-4 h-4 text-amber-300/60" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5l7 7-7 7" 
                    />
                  </svg>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 하단 힌트 */}
      <div className="mt-4 pt-3 border-t border-amber-400/20">
        <p className="text-xs text-amber-300/70 text-center">
          질문을 클릭하면 자동으로 전송됩니다
        </p>
      </div>
    </motion.div>
  );
}

// 간단한 추천 질문 버튼 컴포넌트
interface QuickQuestionButtonProps {
  question: string;
  onClick: (question: string) => void;
  icon?: string;
  variant?: 'default' | 'compact';
  className?: string;
}

export function QuickQuestionButton({
  question,
  onClick,
  icon = '💭',
  variant = 'default',
  className
}: QuickQuestionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(question)}
      className={cn(
        'glass-card border border-amber-400/20 rounded-lg transition-all duration-200',
        'hover:border-amber-400/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400/50',
        variant === 'default' ? 'p-3 min-h-[50px]' : 'p-2 min-h-[40px]',
        className
      )}
    >
      <div className="flex items-center gap-2 text-left">
        <span className={variant === 'default' ? 'text-lg' : 'text-base'}>
          {icon}
        </span>
        <span className={cn(
          'text-amber-200 font-medium',
          variant === 'default' ? 'text-sm' : 'text-xs'
        )}>
          {question}
        </span>
      </div>
    </motion.button>
  );
}
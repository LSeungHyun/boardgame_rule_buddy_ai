'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface GameCategory {
  id: string;
  name: string;
  icon: string;
  description?: string;
  count?: number;
}

interface GameCategoryFilterProps {
  categories: GameCategory[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  className?: string;
}

export function GameCategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  className
}: GameCategoryFilterProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* 섹션 헤더 */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-xl font-bold text-amber-100 mb-2 text-center">
          🎯 게임 카테고리
        </h2>
        <p className="text-sm text-amber-200/80 text-center">
          원하는 게임 장르를 선택해보세요
        </p>
      </motion.div>

      {/* 카테고리 필터 버튼들 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <AnimatePresence mode="wait">
          {categories.map((category, index) => {
            const isSelected = selectedCategory === category.id;
            
            return (
              <motion.button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "relative group p-4 rounded-xl transition-all duration-300 min-h-[90px] flex flex-col items-center justify-center text-center",
                  "border-2 backdrop-blur-sm",
                  "hover:scale-105 hover:shadow-lg active:scale-95",
                  isSelected
                    ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-amber-400/60 shadow-lg shadow-amber-500/20"
                    : "glass-card border-amber-400/20 hover:border-amber-400/40 hover:bg-amber-500/10"
                )}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ 
                  delay: index * 0.05, 
                  duration: 0.4,
                  type: "spring",
                  stiffness: 200,
                  damping: 20
                }}
                whileHover={{ 
                  y: -2,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                {/* 선택된 항목 배경 효과 */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-yellow-400/10 rounded-xl"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}

                {/* 호버 시 글로우 효과 */}
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-400/20 to-yellow-400/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* 아이콘 */}
                <motion.div
                  className={cn(
                    "text-2xl mb-2 transition-all duration-300",
                    isSelected ? "scale-110" : "group-hover:scale-110"
                  )}
                  animate={isSelected ? {
                    rotate: [0, 5, -5, 0],
                    scale: [1.1, 1.15, 1.1]
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: isSelected ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                >
                  {category.icon}
                </motion.div>

                {/* 카테고리 이름 */}
                <span className={cn(
                  "text-sm font-semibold transition-all duration-300 relative z-10",
                  isSelected 
                    ? "text-amber-200" 
                    : "text-amber-300/80 group-hover:text-amber-200"
                )}>
                  {category.name}
                </span>

                {/* 게임 수 표시 */}
                {category.count !== undefined && (
                  <motion.span
                    className={cn(
                      "text-xs mt-1 transition-all duration-300",
                      isSelected 
                        ? "text-amber-300/90" 
                        : "text-amber-400/60 group-hover:text-amber-300/80"
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {category.count}개
                  </motion.span>
                )}

                {/* 선택 표시자 */}
                {isSelected && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full shadow-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 20
                    }}
                  >
                    <motion.div
                      className="w-full h-full bg-white/30 rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.7, 1, 0.7]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 선택된 카테고리 설명 */}
      <AnimatePresence mode="wait">
        {selectedCategory !== 'all' && (
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {(() => {
              const category = categories.find(cat => cat.id === selectedCategory);
              return category?.description && (
                <div className="glass-card rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-amber-200/80">
                    {category.description}
                  </p>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 기본 카테고리 데이터
export const DEFAULT_GAME_CATEGORIES: GameCategory[] = [
  { 
    id: 'all', 
    name: '전체', 
    icon: '🎲',
    description: '모든 보드게임을 확인해보세요'
  },
  { 
    id: 'strategy', 
    name: '전략게임', 
    icon: '🧠',
    description: '깊이 있는 전략과 계획이 필요한 게임들'
  },
  { 
    id: 'card', 
    name: '카드게임', 
    icon: '🃏',
    description: '다양한 카드를 활용한 재미있는 게임들'
  },
  { 
    id: 'family', 
    name: '가족게임', 
    icon: '👨‍👩‍👧‍👦',
    description: '온 가족이 함께 즐길 수 있는 게임들'
  },
  { 
    id: 'puzzle', 
    name: '퍼즐게임', 
    icon: '🧩',
    description: '논리적 사고와 문제 해결이 필요한 게임들'
  }
]; 
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { GameCorrectionResult } from '@/hooks/use-game-correction';

interface GameCorrectionModalProps {
  isOpen: boolean;
  correctionResult: GameCorrectionResult | null;
  onSelectGame: (gameName: string) => void;
  onProceedWithOriginal: () => void;
  onCancel: () => void;
}

export function GameCorrectionModal({
  isOpen,
  correctionResult,
  onSelectGame,
  onProceedWithOriginal,
  onCancel
}: GameCorrectionModalProps) {
  if (!correctionResult) return null;

  const { originalInput, suggestions, autoCorrection } = correctionResult;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onCancel}
        >
                     <motion.div
             className="relative w-full max-w-md rounded-3xl shadow-2xl border border-amber-400/30 overflow-hidden"
             style={{
               background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
               backdropFilter: 'blur(20px)',
             }}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 배경 글로우 효과 */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
              }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative z-10 p-6">
              {/* 헤더 */}
              <div className="text-center mb-6">
                <motion.div
                  className="text-4xl mb-2"
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  🤔
                </motion.div>
                                 <h2 className="text-xl font-bold text-amber-100 mb-1">
                   혹시 이 게임을 찾고 계신가요?
                 </h2>
                 <p className="text-amber-200/70 text-sm">
                   AI가 비슷한 게임들을 찾아드렸어요!
                 </p>
              </div>

                             {/* 원본 입력 표시 */}
               <div className="text-center p-4 bg-slate-900/40 rounded-2xl mb-4 border border-amber-400/20">
                 <span className="text-sm text-amber-200/80">입력하신 게임명:</span>
                 <div className="font-medium text-amber-100 mt-1 text-lg">
                   "{originalInput}"
                 </div>
               </div>

              {/* 자동 교정 제안 */}
              {autoCorrection && (
                                 <motion.div
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="p-4 bg-amber-500/15 border border-amber-400/40 rounded-2xl mb-4 backdrop-blur-sm"
                 >
                   <div className="flex items-center gap-2 mb-3">
                     <motion.span 
                       className="text-xl"
                       animate={{ scale: [1, 1.2, 1] }}
                       transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                     >
                       ✨
                     </motion.span>
                     <span className="font-semibold text-amber-100">추천 게임</span>
                     <span className="text-xs bg-amber-400/20 text-amber-200 px-2 py-1 rounded-full border border-amber-400/30">
                       {Math.round(autoCorrection.confidence * 100)}% 일치
                     </span>
                   </div>
                   <Button
                     onClick={() => onSelectGame(autoCorrection.correctedName)}
                     className="w-full bg-amber-500/90 hover:bg-amber-500 text-slate-900 font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                     size="lg"
                   >
                     {autoCorrection.correctedName}
                   </Button>
                 </motion.div>
              )}

              {/* 다른 유사 게임들 */}
              {suggestions.length > 0 && (
                <div className="space-y-3 mb-4">
                  <div className="text-sm font-medium text-amber-100">
                    다른 유사한 게임들:
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <AnimatePresence>
                      {suggestions
                        .filter(s => s.game.titleKorean !== autoCorrection?.correctedName)
                        .map((result, index) => (
                                                 <motion.button
                           key={result.game.id}
                           initial={{ opacity: 0, x: -20 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: index * 0.1 }}
                           onClick={() => onSelectGame(result.game.titleKorean)}
                           className="w-full text-left p-3 bg-slate-800/30 border border-amber-400/25 rounded-xl hover:bg-amber-500/10 hover:border-amber-400/40 transition-all duration-200 backdrop-blur-sm"
                         >
                           <div className="flex justify-between items-center">
                             <span className="font-medium text-amber-100">{result.game.titleKorean}</span>
                             <span className="text-xs text-amber-300/80">
                               {Math.round(result.confidence * 100)}% 일치
                             </span>
                           </div>
                           {result.game.titleEnglish && (
                             <div className="text-sm text-amber-200/70 mt-1">
                               {result.game.titleEnglish}
                             </div>
                           )}
                         </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

                             {/* 액션 버튼들 */}
               <div className="flex gap-3 pt-2">
                 <Button
                   onClick={onProceedWithOriginal}
                   className="flex-1 bg-slate-700/50 hover:bg-slate-600/60 text-amber-100 border border-amber-400/30 rounded-xl py-3 font-medium transition-all duration-300 backdrop-blur-sm"
                 >
                   원래 입력대로 진행
                 </Button>
                 <Button
                   onClick={onCancel}
                   className="flex-1 bg-slate-800/50 hover:bg-slate-700/60 text-amber-200/80 border border-amber-400/25 rounded-xl py-3 font-medium transition-all duration-300 backdrop-blur-sm"
                 >
                   취소
                 </Button>
               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 
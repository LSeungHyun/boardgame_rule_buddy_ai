'use client';

import React from 'react';
import { ResearchStage } from '@/types/game';

interface ResearchStatusProps {
  stage: ResearchStage;
  isVisible: boolean;
}

const RESEARCH_STAGES = {
  analyzing: {
    emoji: '🤔',
    text: '질문 분석 중...',
    description: '복잡도를 판단하고 있습니다'
  },
  searching: {
    emoji: '🔍',
    text: '관련 자료 검색 중...',
    description: '웹에서 정보를 찾고 있습니다'
  },
  processing: {
    emoji: '📖',
    text: '정보 정리 중...',
    description: '검색 결과를 분석하고 있습니다'
  },
  completed: {
    emoji: '✅',
    text: '답변 준비 완료',
    description: '리서치가 완료되었습니다'
  }
} as const;

export default function ResearchStatus({ stage, isVisible }: ResearchStatusProps) {
  if (!isVisible) return null;

  const currentStage = RESEARCH_STAGES[stage];

  return (
    <div className="flex justify-start mb-4 animate-fadeIn">
      <div className="glass-card bg-gradient-to-r from-amber-900/50 to-yellow-900/50 border border-amber-500/50 text-amber-100 rounded-xl px-5 py-4 flex items-center space-x-3 max-w-lg shadow-lg shadow-amber-500/20">
        <div className="text-2xl animate-bounce">
          {currentStage.emoji}
        </div>
        <div className="flex-1">
          <div className="font-bold text-base flex items-center">
            {currentStage.text}
            <span className="ml-2 text-amber-300 text-xs bg-amber-800/50 px-2 py-1 rounded-full border border-amber-400/30">
              SMART RESEARCH
            </span>
          </div>
          <div className="text-sm text-amber-200 mt-1">
            {currentStage.description}
          </div>
        </div>
        <div className="flex space-x-1">
          <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
} 
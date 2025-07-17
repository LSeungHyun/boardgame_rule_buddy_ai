'use client';

import React, { useState, useEffect } from 'react';
import GameSelection from '@/components/GameSelection';
import ChatScreen from '@/components/ChatScreen';
import TranslationDebugger from '@/components/TranslationDebugger';
import { Game, ChatMessage, ResearchStage } from '@/types/game';
import { fetchGames, GameFilters } from '@/features/games/api';
import { errorHandler, AppError } from '@/lib/error-handler';
import { askGameQuestionWithSmartResearch } from '@/lib/gemini';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'selection' | 'chat' | 'debug'>('selection');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 데이터 상태
  const [games, setGames] = useState<Game[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 개발 환경에서 V2 분석 테스트용 토글
  const [useV2Analysis, setUseV2Analysis] = useState(false);

  // 검색어가 있을 때만 게임 목록 로드
  useEffect(() => {
    const loadFilteredGames = async () => {
      // 검색어가 없으면 게임 목록을 비움
      if (!searchTerm.trim()) {
        setGames([]);
        return;
      }

      try {
        setIsLoadingGames(true);

        const filters: GameFilters = {};

        if (searchTerm.trim()) {
          filters.searchTerm = searchTerm.trim();
        }

        const filteredGames = await fetchGames(filters);
        setGames(filteredGames);
        setError(null);
      } catch (err) {
        const appError = errorHandler.handle(err, {
          function: 'loadFilteredGames',
          searchTerm
        });

        setError(errorHandler.getUserMessage(appError));
        setGames([]);
      } finally {
        setIsLoadingGames(false);
      }
    };

    // 디바운싱: 200ms 후에 검색 실행 (더 빠른 반응성)
    const timeoutId = setTimeout(() => {
      loadFilteredGames();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game);
    setMessages([
      {
        role: 'assistant',
        content: `안녕하세요! **${game.title}** 룰 마스터입니다. 무엇이든 물어보세요.`
      }
    ]);
    setCurrentPage('chat');
  };

  const handleGoBack = () => {
    setCurrentPage('selection');
    setSelectedGame(null);
    setMessages([]);
  };

  const handleSendMessage = async (text: string, callbacks?: {
    onResearchStart?: () => void;
    onResearchProgress?: (stage: ResearchStage) => void;
    onComplete?: () => void;
  }) => {
    console.log('🚀 [페이지] handleSendMessage 호출됨:', {
      text,
      게임: selectedGame?.title,
      V2분석사용: useV2Analysis
    });

    if (!selectedGame) {
      console.error("선택된 게임이 없습니다.");
      return;
    }

    const newUserMessage: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      console.log('📞 [페이지] askGameQuestionWithSmartResearch 호출 시작');
      // 스마트 리서치 기능이 포함된 AI 답변 요청 (V2 분석 옵션 포함)
      const result = await askGameQuestionWithSmartResearch(
        selectedGame.title,
        text,
        callbacks?.onResearchStart,
        useV2Analysis  // V2 분석 사용 여부
      );

      console.log('📥 [페이지] askGameQuestionWithSmartResearch 결과 받음:', {
        researchUsed: result.researchUsed,
        fromCache: result.fromCache,
        complexity: result.complexity?.score,
        analysisV2: result.analysisV2
      });

      // 리서치 진행 단계별 콜백 실행
      if (result.researchUsed && callbacks?.onResearchProgress) {
        callbacks.onResearchProgress('processing');
        // 약간의 지연으로 사용자 경험 개선
        await new Promise(resolve => setTimeout(resolve, 1000));
        callbacks.onResearchProgress('completed');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 메타데이터를 포함한 assistant 메시지 생성
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.answer,
        researchUsed: result.researchUsed,
        sources: result.sources,
        fromCache: result.fromCache,
        complexity: result.complexity,
        // V2 분석 결과도 포함
        analysisV2: result.analysisV2
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (callbacks?.onComplete) {
        callbacks.onComplete();
      }

    } catch (error) {
      console.error('AI 응답 생성 실패:', error);

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '죄송합니다. 답변 생성 중 오류가 발생했습니다. 다시 시도해 주세요.'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 에러 상태 표시
  if (error) {
    return (
      <main className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">❌ {error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Glass morphism overlay */}
      <div className="absolute inset-0 backdrop-blur-3xl bg-black/10"></div>

      <div className="relative z-10">
        {currentPage === 'selection' && (
          <GameSelection
            search={{ term: searchTerm, setTerm: setSearchTerm }}
            ui={{ isLoading: isLoadingGames }}
            data={{ games, onSelectGame: handleSelectGame }}
          />
        )}

        {currentPage === 'chat' && selectedGame && (
          <ChatScreen
            game={selectedGame}
            messages={messages}
            isLoading={isLoading}
            onGoBack={handleGoBack}
            onSendMessage={handleSendMessage}
          />
        )}

        {currentPage === 'debug' && (
          <TranslationDebugger onGoBack={handleGoBack} />
        )}

        {/* 개발 환경에서만 보이는 디버그 버튼 */}
        {process.env.NODE_ENV === 'development' && currentPage === 'selection' && (
          <div className="fixed bottom-6 right-6 flex flex-col gap-2">
            <button
              onClick={() => setCurrentPage('debug')}
              className="bg-purple-600/80 backdrop-blur-sm hover:bg-purple-700/80 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-lg"
            >
              번역 디버그
            </button>

            <div className="bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg shadow-lg">
              <label className="flex items-center space-x-2 text-white text-sm">
                <input
                  type="checkbox"
                  checked={useV2Analysis}
                  onChange={(e) => setUseV2Analysis(e.target.checked)}
                  className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-2"
                />
                <span>V2 분석 사용</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

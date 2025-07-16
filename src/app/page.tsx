'use client';

import React, { useState, useEffect } from 'react';
import GameSelection from '@/components/GameSelection';
import ChatScreen from '@/components/ChatScreen';
import { Game, ChatMessage } from '@/types/game';
import { fetchGames, GameFilters } from '@/features/games/api';
import { errorHandler, AppError } from '@/lib/error-handler';
import { askGameQuestionWithSmartResearch } from '@/lib/gemini';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'selection' | 'chat'>('selection');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 데이터 상태
  const [games, setGames] = useState<Game[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    onResearchProgress?: (stage: string) => void;
    onComplete?: () => void;
  }) => {
    console.log('🚀 [페이지] handleSendMessage 호출됨:', { text, 게임: selectedGame?.title });
    
    if (!selectedGame) {
      console.error("선택된 게임이 없습니다.");
      return;
    }

    const newUserMessage: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      console.log('📞 [페이지] askGameQuestionWithSmartResearch 호출 시작');
      // 스마트 리서치 기능이 포함된 AI 답변 요청
      const result = await askGameQuestionWithSmartResearch(
        selectedGame.title, 
        text,
        callbacks?.onResearchStart
      );
      console.log('📥 [페이지] askGameQuestionWithSmartResearch 결과 받음:', {
        researchUsed: result.researchUsed,
        fromCache: result.fromCache,
        complexity: result.complexity?.score
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
        complexity: result.complexity
      };

      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (err) {
      console.error("AI 답변 생성 오류:", err);
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다";
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `오류가 발생했습니다: ${errorMessage}. 잠시 후 다시 시도해주세요.`
      }]);
    } finally {
      setIsLoading(false);
      if (callbacks?.onComplete) {
        callbacks.onComplete();
      }
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
    <main className="bg-gray-900 text-white min-h-screen">
      {currentPage === 'chat' && selectedGame ? (
        <ChatScreen
          game={selectedGame}
          onGoBack={handleGoBack}
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      ) : (
        <GameSelection
          search={{
            term: searchTerm,
            setTerm: setSearchTerm
          }}
          ui={{
            isLoading: isLoadingGames
          }}
          data={{
            games,
            onSelectGame: handleSelectGame
          }}
        />
      )}
    </main>
  );
}

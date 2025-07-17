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
  const [researchStage, setResearchStage] = useState<ResearchStage>('analyzing');
  const [games, setGames] = useState<Game[]>([]);
  const [filters, setFilters] = useState<GameFilters>({});
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const loadGames = async () => {
      try {
        setLoadingError(null);
        const searchFilters = { ...filters, searchTerm };
        const fetchedGames = await fetchGames(searchFilters);
        setGames(fetchedGames);
      } catch (error) {
        const appError = errorHandler.handle(error, {
          context: 'loading games',
          action: 'fetchGames',
          filters: { ...filters, searchTerm }
        });
        setLoadingError(appError.message);
      }
    };

    loadGames();
  }, [filters, searchTerm]);

  const handleGameSelect = (game: Game) => {
    console.log('🎯 게임 선택:', game.title);

    // 중복 클릭 방지
    if (currentPage === 'chat' || selectedGame?.id === game.id) {
      console.log('⚠️ 이미 선택된 게임이거나 전환 중');
      return;
    }

    setSelectedGame(game);

    // 환영 메시지 생성
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content: `안녕하세요! 저는 **${game.title}**의 룰 마스터입니다. 🎲📖

이 게임에 대한 어떤 룰이나 질문이든 물어보세요! 

• 기본 게임 방법
• 특수 카드나 능력 효과  
• 애매한 상황 해석
• 게임 진행 중 궁금한 점

무엇이든 도와드릴게요! 어떤 것이 궁금하신가요? 🤔`
    };

    setMessages([welcomeMessage]);

    // 강제 페이지 전환 (다음 렌더 사이클에서)
    setTimeout(() => {
      console.log('📄 페이지 전환 실행');
      setCurrentPage('chat');
    }, 0);
  };

  const handleBackToSelection = () => {
    setCurrentPage('selection');
    setSelectedGame(null);
    setMessages([]);
    setResearchStage('analyzing');
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedGame) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setResearchStage('analyzing');

    try {
      const response = await askGameQuestionWithSmartResearch(
        selectedGame.title,
        content
      );

      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: typeof response === 'string' ? response : response.answer,
        // API 응답에서 메타데이터 추출하여 포함
        researchUsed: typeof response !== 'string' ? response.researchUsed : false,
        sources: typeof response !== 'string' ? response.sources : undefined,
        fromCache: typeof response !== 'string' ? response.fromCache : undefined,
        complexity: typeof response !== 'string' ? response.complexity : undefined,
        analysisV2: typeof response !== 'string' ? response.analysisV2 : undefined
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const appError = errorHandler.handle(error, {
        context: 'asking game question',
        action: 'askGameQuestionWithSmartResearch',
        gameName: selectedGame.title,
        question: content
      });

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `죄송합니다. 오류가 발생했습니다: ${appError.message}`
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setResearchStage('completed');
    }
  };

  if (currentPage === 'debug') {
    return (
      <div className="min-h-screen bg-game-table-dark">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => setCurrentPage('selection')}
            className="btn-game-secondary mb-6"
          >
            ← 메인으로 돌아가기
          </button>
          <TranslationDebugger onGoBack={() => setCurrentPage('selection')} />
        </div>
      </div>
    );
  }

  if (currentPage === 'chat' && selectedGame) {
    return (
      <ChatScreen
        game={selectedGame}
        messages={messages}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        onGoBack={handleBackToSelection}
      />
    );
  }

  return (
    <div className="min-h-screen bg-game-table-dark">
      <GameSelection
        search={{
          term: searchTerm,
          setTerm: setSearchTerm
        }}
        ui={{
          isLoading: false
        }}
        data={{
          games,
          onSelectGame: handleGameSelect
        }}
      />
    </div>
  );
}

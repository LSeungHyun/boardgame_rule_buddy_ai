'use client';

import React, { useState, useEffect } from 'react';
import GameSelection from '@/components/GameSelection';
import ChatScreen from '@/components/ChatScreen';
import TranslationDebugger from '@/components/TranslationDebugger';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { MobileNavigation } from '@/components/ui/mobile-navigation';
import { GameSelectionSuspense, ChatScreenSuspense, DebugPageSuspense } from '@/components/ui/suspense-wrapper';
import { Game, ChatMessage, ResearchStage, ConversationState, GameContext, UniversalBetaState, GeminiContent } from '@/types/game';
import { fetchGames, GameFilters } from '@/features/games/api';
import { errorHandler, AppError } from '@/lib/error-handler';
import { askGameQuestionWithContextTracking, askUniversalBetaQuestion } from '@/lib/gemini';
import {
  usePageView,
  useGameSelectionTracking,
  useQuestionTracking,
  useEngagementTracking
} from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GameQuickActions } from '@/components/ui/game-quick-actions';
import { EnhancedGameSearch } from '@/components/enhanced-game-search';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'selection' | 'chat' | 'debug' | 'universal-beta' | 'bgg-explorer'>('selection');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [researchStage, setResearchStage] = useState<ResearchStage>('analyzing');
  const [games, setGames] = useState<Game[]>([]);
  const [filters, setFilters] = useState<GameFilters>({});
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');

  // Universal Rule Master (Beta) 상태
  const [universalBetaState, setUniversalBetaState] = useState<UniversalBetaState>({
    isActive: false,
    conversationState: 'awaiting_game',
    gameContext: null,
    sessionId: ''
  });

  // Gemini API용 채팅 히스토리 (contents 포맷)
  const [geminiChatHistory, setGeminiChatHistory] = useState<GeminiContent[]>([]);

  // Analytics 훅 초기화
  const { trackGameSelection, trackGameSearch } = useGameSelectionTracking();
  const { trackQuestionSubmitted, trackResearchUsed, trackAIResponse } = useQuestionTracking();
  const { trackSessionStart, trackSessionEnd, trackUserExit, trackError } = useEngagementTracking();

  // 페이지뷰 추적
  const pageMapping = {
    'selection': '/',
    'chat': '/chat',
    'debug': '/debug',
    'universal-beta': '/universal-beta'
  };
  usePageView(pageMapping[currentPage]);

  // 스크롤 위치 초기화 - 페이지 시작 시 최상단으로
  useEffect(() => {
    if (currentPage === 'selection') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentPage]);

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

  // Universal Beta 모드 활성화
  const handleUniversalBetaToggle = () => {
    console.log('🌟 [Universal Beta] 베타 모드 활성화');

    const newSessionId = `universal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    setUniversalBetaState({
      isActive: true,
      conversationState: 'awaiting_game',
      gameContext: null,
      sessionId: newSessionId
    });

    // 초기 환영 메시지
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content: `🌟 **Universal Rule Master (Beta)에 오신 것을 환영합니다!**

저는 모든 보드게임에 대해 도움을 드릴 수 있는 AI 어시스턴트입니다.

🔥 **새로운 기능!** BGG(BoardGameGeek) API와 연동하여 실시간 게임 정보를 제공합니다:
- 📈 최신 인기 게임 목록 (Hot List)
- ⭐ 상세한 게임 정보 (평점, 플레이어 수, 플레이 시간 등)
- 🎯 BGG 커뮤니티 데이터 기반 게임 추천
- 🔗 Context7을 통한 향상된 룰 분석

**어떤 보드게임이 궁금하신가요?** 
게임 이름을 입력해주시면 그 게임에 대한 모든 질문에 답변해드리겠습니다.

예: "글룸헤이븐", "아그리콜라", "테라포밍 마스", "아크 노바" 등`
    };

    setMessages([welcomeMessage]);
    setGeminiChatHistory([]);
    setCurrentPage('universal-beta');

    // Analytics 추적
    trackSessionStart(newSessionId);
  };

  // Universal Beta에서 일반 모드로 돌아가기
  const handleBackToSelection = () => {
    if (universalBetaState.isActive) {
      console.log('🔄 [Universal Beta] 일반 모드로 복귀');
      setUniversalBetaState({
        isActive: false,
        conversationState: 'awaiting_game',
        gameContext: null,
        sessionId: ''
      });
      setGeminiChatHistory([]);
    }

    setCurrentPage('selection');
    setSelectedGame(null);
    setMessages([]);
    setResearchStage('analyzing');
  };

  // 기존 게임 선택 핸들러
  const handleGameSelect = (game: Game) => {
    console.log('🎯 게임 선택:', game.title);

    // 중복 클릭 방지
    if (selectedGame?.id === game.id) {
      console.log('⚠️ 이미 선택된 게임');
      return;
    }

    // 새로운 세션 ID 생성
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);

    // Analytics: 게임 선택 추적
    trackGameSelection(game.title, game.id.toString(), 'click');
    trackSessionStart(newSessionId);

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

무엇이든 궁금한 것을 말씀해주세요!`
    };

    setMessages([welcomeMessage]);
    setCurrentPage('chat');
  };

  // Universal Beta 메시지 전송 핸들러
  const handleUniversalBetaSendMessage = async (content: string) => {
    if (!universalBetaState.isActive) return;

    console.log('🌟 [Universal Beta] 메시지 처리:', {
      상태: universalBetaState.conversationState,
      내용: content.slice(0, 50)
    });

    const userMessage: ChatMessage = {
      role: 'user',
      content
    };

    // 사용자 메시지를 UI에 추가
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      if (universalBetaState.conversationState === 'awaiting_game') {
        // Step 2: 사용자가 게임명 제공
        const gameName = content.trim();

        console.log('🎮 [Universal Beta] 게임명 설정:', gameName);

        // 게임 컨텍스트 설정
        const gameContext: GameContext = {
          gameName,
          setAt: new Date(),
          turnNumber: 1
        };

        // Gemini 채팅 히스토리에 사용자 메시지 추가
        const userGeminiMessage: GeminiContent = {
          role: 'user',
          parts: [{ text: content }]
        };

        const newGeminiHistory = [...geminiChatHistory, userGeminiMessage];

        // 첫 번째 API 호출 (베타 면책조항 포함)
        const aiResponse = await askUniversalBetaQuestion(
          gameName,
          newGeminiHistory,
          true // 첫 번째 응답
        );

        // AI 응답을 Gemini 히스토리에 추가
        const aiGeminiMessage: GeminiContent = {
          role: 'model',
          parts: [{ text: aiResponse }]
        };

        setGeminiChatHistory([...newGeminiHistory, aiGeminiMessage]);

        // 상태 업데이트
        setUniversalBetaState(prev => ({
          ...prev,
          conversationState: 'awaiting_command',
          gameContext
        }));

        // AI 메시지를 UI에 추가
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: aiResponse
        };

        setMessages(prev => [...prev, aiMessage]);

        console.log('✅ [Universal Beta] 게임 설정 완료:', gameName);

      } else {
        // Step 4: 후속 질문 처리 (awaiting_command 또는 in_conversation)
        if (!universalBetaState.gameContext) {
          throw new Error('게임 컨텍스트가 설정되지 않았습니다.');
        }

        console.log('💬 [Universal Beta] 후속 질문 처리:', universalBetaState.gameContext.gameName);

        // Gemini 채팅 히스토리에 사용자 메시지 추가
        const userGeminiMessage: GeminiContent = {
          role: 'user',
          parts: [{ text: content }]
        };

        const newGeminiHistory = [...geminiChatHistory, userGeminiMessage];

        // API 호출 (전체 컨텍스트 포함)
        const aiResponse = await askUniversalBetaQuestion(
          universalBetaState.gameContext.gameName,
          newGeminiHistory,
          false // 후속 응답
        );

        // AI 응답을 Gemini 히스토리에 추가
        const aiGeminiMessage: GeminiContent = {
          role: 'model',
          parts: [{ text: aiResponse }]
        };

        setGeminiChatHistory([...newGeminiHistory, aiGeminiMessage]);

        // 상태를 in_conversation으로 변경
        setUniversalBetaState(prev => ({
          ...prev,
          conversationState: 'in_conversation'
        }));

        // AI 메시지를 UI에 추가
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: aiResponse
        };

        setMessages(prev => [...prev, aiMessage]);

        console.log('✅ [Universal Beta] 후속 질문 처리 완료');
      }

    } catch (error) {
      console.error('❌ [Universal Beta] 오류:', error);

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `죄송합니다. Universal Rule Master (Beta)에서 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 기존 메시지 전송 핸들러 (365게임 모드용)
  const handleSendMessage = async (
    content: string,
    callbacks?: {
      onResearchStart?: () => void;
      onResearchProgress?: (stage: ResearchStage) => void;
      onComplete?: () => void;
    }
  ) => {
    if (!selectedGame) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setResearchStage('analyzing');

    try {
      // Analytics: 질문 전송 추적
      trackQuestionSubmitted(selectedGame.title, content.length, false);

      const startTime = Date.now();

      // 리서치 시작 콜백 호출
      if (callbacks?.onResearchStart) {
        callbacks.onResearchStart();
      }

      // 프로그레스 단계별 콜백 호출을 위한 시뮬레이션
      const simulateProgress = async () => {
        const stages: ResearchStage[] = [
          'analyzing',
          'searching',
          'processing',
          'summarizing',
          'generating_logic',
          'generating_text',
          'generating_review'
        ];

        for (const stage of stages) {
          if (callbacks?.onResearchProgress) {
            callbacks.onResearchProgress(stage);
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      };

      const [response] = await Promise.all([
        askGameQuestionWithContextTracking(
          selectedGame.title,
          content,
          sessionId,
          callbacks?.onResearchStart
        ),
        simulateProgress()
      ]);

      const responseTime = Date.now() - startTime;

      // Analytics
      if (typeof response !== 'string' && response.researchUsed) {
        trackResearchUsed(selectedGame.title, response.complexity?.score || 0, responseTime);
      }
      trackAIResponse(responseTime, true);

      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: typeof response === 'string' ? response : response.answer,
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
        action: 'askGameQuestionWithContextTracking',
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

      if (callbacks?.onComplete) {
        callbacks.onComplete();
      }
    }
  };

  // Universal Beta 화면 렌더링
  const renderUniversalBetaScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* 배경 애니메이션 요소 */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-xl animate-ping delay-2000"></div>
      </div>

      <ResponsiveContainer maxWidth="xl" padding="md" className="relative z-10 min-h-screen">
        {/* 베타 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={handleBackToSelection}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-300"
            >
              ← 메인으로 돌아가기
            </Button>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-300 bg-clip-text text-transparent">
                Universal Rule Master
              </h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-purple-500/80 to-pink-500/80 backdrop-blur-sm rounded-full text-white">
                  BETA
                </span>
                <p className="text-sm text-amber-400/80">모든 보드게임 지원</p>
              </div>
            </div>
            
            <div className="w-32" />
          </div>
        </div>

        {/* 채팅 화면 */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 shadow-2xl">
            <ChatScreen
              game={{ id: 'universal', title: universalBetaState.gameContext?.gameName || 'Universal Beta', description: 'Universal Rule Master Beta Mode' } as Game}
              onGoBack={handleBackToSelection}
              messages={messages}
              onSendMessage={handleUniversalBetaSendMessage}
              isLoading={isLoading}
            />
          </div>

          {/* 베타 모드에서 Step 3: 퀵 버튼 표시 */}
          {universalBetaState.conversationState === 'awaiting_command' && universalBetaState.gameContext && (
            <div className="mt-6">
              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
                <GameQuickActions
                  game={{ id: 'universal', title: universalBetaState.gameContext.gameName } as Game}
                  onActionClick={handleUniversalBetaSendMessage}
                  className="max-w-2xl mx-auto"
                />
              </div>
            </div>
          )}
        </div>
      </ResponsiveContainer>
    </div>
  );

  if (currentPage === 'debug') {
    return (
      <DebugPageSuspense>
        <TranslationDebugger onGoBack={handleBackToSelection} />
      </DebugPageSuspense>
    );
  }

  if (currentPage === 'universal-beta') {
    return renderUniversalBetaScreen();
  }

  if (currentPage === 'bgg-explorer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-orange-50">
        <ResponsiveContainer maxWidth="full" padding="md" className="min-h-screen">
          {/* BGG Explorer 헤더 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                onClick={handleBackToSelection}
                className="flex items-center gap-2"
              >
                ← 메인으로 돌아가기
              </Button>
              
              <div className="text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 bg-clip-text text-transparent">
                  BGG Explorer
                </h1>
                <p className="text-lg text-gray-600 mt-2">BoardGameGeek과 연동된 게임 탐색</p>
              </div>
              
              <div className="w-32" />
            </div>
          </div>

          {/* 향상된 게임 검색 컴포넌트 */}
          <EnhancedGameSearch
            onGameSelect={(game) => {
              // BGG 게임을 선택했을 때 Universal Beta로 이동하면서 게임 컨텍스트 설정
              const newSessionId = `bgg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              setUniversalBetaState({
                isActive: true,
                conversationState: 'awaiting_command',
                gameContext: {
                  gameName: game.title,
                  setAt: new Date(),
                  turnNumber: 1
                },
                sessionId: newSessionId
              });

              const welcomeMessage: ChatMessage = {
                role: 'assistant',
                content: `🎲 **${game.title}**의 룰 마스터입니다!

BGG 정보:
${game.bggData ? `⭐ 평점: ${game.bggData.averageRating.toFixed(1)}/10 (${game.bggData.numVotes}명 평가)
👥 플레이어: ${game.bggData.minPlayers}-${game.bggData.maxPlayers}명
⏱️ 플레이 시간: ${game.bggData.playingTime}분
📅 출시년도: ${game.bggData.yearPublished}
🎯 복잡도: ${game.bggData.complexity.toFixed(1)}/5

📝 카테고리: ${game.bggData.categories.slice(0, 3).join(', ')}${game.bggData.categories.length > 3 ? ' 등' : ''}
⚙️ 메카닉: ${game.bggData.mechanics.slice(0, 3).join(', ')}${game.bggData.mechanics.length > 3 ? ' 등' : ''}` : '게임 정보를 가져오는 중입니다...'}

이 게임에 대한 어떤 룰이나 질문이든 물어보세요! 🎯`
              };

              setMessages([welcomeMessage]);
              setGeminiChatHistory([]);
              setCurrentPage('universal-beta');
              trackSessionStart(newSessionId);
            }}
            placeholder="BGG에서 게임을 검색하세요..."
            showHotGames={true}
          />
        </ResponsiveContainer>
      </div>
    );
  }

  if (currentPage === 'chat') {
    return (
      <ChatScreenSuspense>
        <ResponsiveContainer maxWidth="xl" padding="md" className="min-h-screen">
          <ChatScreen
            game={selectedGame!}
            onGoBack={handleBackToSelection}
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </ResponsiveContainer>
      </ChatScreenSuspense>
    );
  }

  return (
    <GameSelectionSuspense>
      <div className="min-h-screen">
        {/* Universal Beta 진입 버튼 추가 */}
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <Button
            onClick={() => setCurrentPage('bgg-explorer')}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg"
          >
            🔥 BGG Explorer
          </Button>
          <Button
            onClick={handleUniversalBetaToggle}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-6 py-2 rounded-lg shadow-lg"
          >
            🌟 Universal Beta
          </Button>
        </div>

        <GameSelection
          search={{
            term: searchTerm,
            setTerm: setSearchTerm
          }}
          ui={{
            isLoading
          }}
          data={{
            games,
            onSelectGame: handleGameSelect
          }}
        />
      </div>
    </GameSelectionSuspense>
  );
}

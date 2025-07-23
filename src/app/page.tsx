'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import GameSelection from '@/components/GameSelection';
import ChatScreen from '@/components/ChatScreen';
import TranslationDebugger from '@/components/TranslationDebugger';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { MobileNavigation } from '@/components/ui/mobile-navigation';
import { GameSelectionSuspense, ChatScreenSuspense, DebugPageSuspense } from '@/components/ui/suspense-wrapper';
import { Game, ChatMessage, ResearchStage, ConversationState, GameContext, UniversalBetaState, GeminiContent } from '@/types/game';
import { fetchGames, GameFilters } from '@/features/games/api';
import { errorHandler, AppError } from '@/lib/error-handler';
import { askGameQuestionWithContextTracking } from '@/lib/gemini';
import {
  usePageView,
  useGameSelectionTracking,
  useQuestionTracking,
  useEngagementTracking
} from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GameQuickActions } from '@/components/ui/game-quick-actions';
import { ClarityTest } from '@/components/ui/clarity-test';
import { useFeedbackModal } from '@/components/feedback/FeedbackModal';

// 🚀 성능 최적화 상수 - Context7 호환성
const SEARCH_DEBOUNCE_DELAY = 300; // 디바운싱 지연시간 (ms)
const MAX_SEARCH_RESULTS = 50; // 최대 검색 결과 수

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'selection' | 'chat' | 'debug' | 'universal-beta'>('selection');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [researchStage, setResearchStage] = useState<ResearchStage>('analyzing');
  const [games, setGames] = useState<Game[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');

  // 🚀 검색 성능 최적화를 위한 상태
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  // Universal Rule Master (Beta) 상태
  const [universalBetaState, setUniversalBetaState] = useState<UniversalBetaState>({
    isActive: false,
    conversationState: 'awaiting_game',
    gameContext: null,
    sessionId: ''
  });

  // MVP 피드백 시스템
  const { showFeedback, FeedbackModalComponent } = useFeedbackModal();

  // Gemini API용 채팅 히스토리 (contents 포맷)
  const [geminiChatHistory, setGeminiChatHistory] = useState<GeminiContent[]>([]);

  // 🔧 Analytics 훅 초기화 - Context7 패턴으로 안정화
  const analytics = useGameSelectionTracking();
  const questionTracking = useQuestionTracking();
  const engagementTracking = useEngagementTracking();

  // 🔧 Context7 베스트 프랙티스: 안정적인 함수 참조 생성
  const trackGameSearch = useCallback((searchTerm: string, resultCount: number) => {
    // Context7 패턴: 조건부 호출로 안정성 확보
    if (analytics?.trackGameSearch) {
      analytics.trackGameSearch(searchTerm, resultCount);
    }
  }, []); // 🔑 빈 의존성 배열로 함수 안정화

  // 페이지뷰 추적 - Context7 호환성 최적화
  const pageMapping = useMemo(() => ({
    'selection': '/',
    'chat': '/chat',
    'debug': '/debug',
    'universal-beta': '/universal-beta'
  }), []);

  usePageView(pageMapping[currentPage]);

  // 🚀 Context7 패턴: 디바운싱 최적화
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, SEARCH_DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 🔧 Context7 베스트 프랙티스: 검색 로직을 Effect 내부로 이동
  useEffect(() => {
    // Context7 패턴: 함수를 Effect 내부에서 정의하여 의존성 문제 해결
    async function loadGames() {
      try {
        setLoadingError(null);

        // 검색어가 없으면 빈 배열로 설정 (성능 최적화)
        if (!debouncedSearchTerm.trim()) {
          setGames([]);
          setIsSearching(false);
          return;
        }

        setIsSearching(true);
        console.log('🔍 [검색 시작]', { 검색어: debouncedSearchTerm, 제한: MAX_SEARCH_RESULTS });

        // Context7 패턴: 객체를 Effect 내부에서 생성
        const searchFilters: GameFilters = {
          searchTerm: debouncedSearchTerm.trim(),
          limit: MAX_SEARCH_RESULTS
        };

        const fetchedGames = await fetchGames(searchFilters);
        setGames(fetchedGames);

        console.log('✅ [검색 완료]', {
          검색어: debouncedSearchTerm,
          결과수: fetchedGames.length,
          제한: MAX_SEARCH_RESULTS
        });

        // Context7 패턴: 안정화된 함수 사용
        if (debouncedSearchTerm.trim()) {
          trackGameSearch(debouncedSearchTerm, fetchedGames.length);
        }
      } catch (error) {
        console.error('❌ [검색 오류]', error);
        const appError = errorHandler.handle(error, {
          context: 'loading games',
          action: 'fetchGames',
          filters: { searchTerm: debouncedSearchTerm, limit: MAX_SEARCH_RESULTS }
        });
        setLoadingError(appError.message);
      } finally {
        setIsSearching(false);
      }
    }

    loadGames();
  }, [debouncedSearchTerm, trackGameSearch]); // ✅ 안정화된 의존성만 포함

  // 스크롤 위치 초기화 - 페이지 시작 시 최상단으로
  useEffect(() => {
    if (currentPage === 'selection') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentPage]);

  // 🚀 Context7 패턴: 검색어 변경 핸들러 최적화
  const handleSearchTermChange = useCallback((newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);

    // 검색어가 지워지면 즉시 결과 클리어 (UX 개선)
    if (!newSearchTerm.trim()) {
      setGames([]);
      setDebouncedSearchTerm('');
    }
  }, []);

  // Universal Beta 모드 활성화 - Context7 최적화
  const handleUniversalBetaToggle = useCallback(() => {
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

**어떤 보드게임이 궁금하신가요?** 
게임 이름을 입력해주시면 그 게임에 대한 모든 질문에 답변해드리겠습니다.

예: "글룸헤이븐", "아그리콜라", "테라포밍 마스" 등`
    };

    setMessages([welcomeMessage]);
    setGeminiChatHistory([]);
    setCurrentPage('universal-beta');

    // Context7 패턴: 안전한 함수 호출
    if (engagementTracking?.trackSessionStart) {
      engagementTracking.trackSessionStart(newSessionId);
    }
  }, [engagementTracking]);

  // Universal Beta에서 일반 모드로 돌아가기 - Context7 최적화
  const handleBackToSelection = useCallback(() => {
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
  }, [universalBetaState.isActive]);

  // 기존 게임 선택 핸들러 - Context7 최적화
  const handleGameSelect = useCallback((game: Game) => {
    console.log('🎯 게임 선택:', game.title);

    // 중복 클릭 방지
    if (selectedGame?.id === game.id) {
      console.log('⚠️ 이미 선택된 게임');
      return;
    }

    // 새로운 세션 ID 생성
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);

    // Context7 패턴: 안전한 Analytics 호출
    if (analytics?.trackGameSelection) {
      analytics.trackGameSelection(game.title, game.id.toString(), 'click');
    }
    if (engagementTracking?.trackSessionStart) {
      engagementTracking.trackSessionStart(newSessionId);
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

무엇이든 궁금한 것을 말씀해주세요!`
    };

    setMessages([welcomeMessage]);
    setCurrentPage('chat');
  }, [selectedGame, analytics, engagementTracking]);

  // Universal Beta 메시지 전송 핸들러 - 신뢰도 체크 통합
  const handleUniversalBetaSendMessage = useCallback(async (content: string) => {
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
        // Step 1: 사용자가 게임명 제공 → 신뢰도 체크 시작
        const gameName = content.trim();

        console.log('🎮 [Universal Beta] 게임명 수신, 신뢰도 체크 시작:', gameName);

        // 신뢰도 체크 상태 업데이트
        setUniversalBetaState(prev => ({
          ...prev,
          isCheckingConfidence: true
        }));

        // Step 2: 신뢰도 체크 API 호출
        console.log('🔍 [Confidence Check] API 호출 중...');
        const confidenceResponse = await fetch('/api/check-confidence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gameName
          })
        });

        if (!confidenceResponse.ok) {
          const errorData = await confidenceResponse.json();
          throw new Error(errorData.error || '신뢰도 체크 실패');
        }

        const confidenceResult = await confidenceResponse.json();
        console.log('✅ [Confidence Check] 완료:', confidenceResult);

        // Step 3: 게임 컨텍스트 생성 (신뢰도 결과 포함)
        const gameContext: GameContext = {
          gameName,
          setAt: new Date(),
          turnNumber: 1,
          confidenceResult
        };

        // Gemini 채팅 히스토리에 사용자 메시지 추가
        const userGeminiMessage: GeminiContent = {
          role: 'user',
          parts: [{ text: content }]
        };

        const newGeminiHistory = [...geminiChatHistory, userGeminiMessage];

        // Step 4: Universal Beta API 호출 (서비스 모드 포함)
        const response = await fetch('/api/universal-beta', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gameName,
            chatHistory: newGeminiHistory,
            isFirstResponse: true,
            serviceMode: confidenceResult.serviceMode
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'API 호출 실패');
        }

        const responseData = await response.json();
        let aiResponse = responseData.response;

        // Step 5: 베타 모드일 때만 면책조항 추가
        if (confidenceResult.serviceMode === 'beta') {
          console.log('⚠️ [Beta Mode] 베타 면책조항 추가');
          // 기존 응답에서 베타 면책조항이 이미 포함되어 있으므로 그대로 사용
        } else {
          console.log('👑 [Expert Mode] 전문가 모드로 동작');
          // 전문가 모드에서는 베타 면책조항 없이 답변 제공
          // 기존 응답에서 베타 관련 내용을 제거하거나 별도 처리 가능
        }

        // AI 응답을 Gemini 히스토리에 추가
        const aiGeminiMessage: GeminiContent = {
          role: 'model',
          parts: [{ text: aiResponse }]
        };

        setGeminiChatHistory([...newGeminiHistory, aiGeminiMessage]);

        // Step 6: 상태 업데이트 (신뢰도 체크 완료, 서비스 모드 설정)
        setUniversalBetaState(prev => ({
          ...prev,
          conversationState: 'awaiting_command',
          gameContext,
          isCheckingConfidence: false,
          currentServiceMode: confidenceResult.serviceMode
        }));

        // AI 메시지를 UI에 추가
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: aiResponse
        };

        setMessages(prev => [...prev, aiMessage]);

        console.log('✅ [Universal Beta] 게임 설정 완료:', {
          게임명: gameName,
          신뢰도점수: confidenceResult.confidenceScore,
          서비스모드: confidenceResult.serviceMode
        });

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

        // API 호출 (전체 컨텍스트 포함) - API Route 사용
        const response = await fetch('/api/universal-beta', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gameName: universalBetaState.gameContext.gameName,
            chatHistory: newGeminiHistory,
            isFirstResponse: false
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'API 호출 실패');
        }

        const responseData = await response.json();
        const aiResponse = responseData.response;

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
  }, [universalBetaState, geminiChatHistory]);

  // 기존 메시지 전송 핸들러 (365게임 모드용) - Context7 최적화
  const handleSendMessage = useCallback(async (
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
      // Context7 패턴: 안전한 Analytics 호출
      if (questionTracking?.trackQuestionSubmitted) {
        questionTracking.trackQuestionSubmitted(selectedGame.title, content.length, false);
      }

      const startTime = Date.now();

      // 리서치 시작 콜백 호출
      if (callbacks?.onResearchStart) {
        callbacks.onResearchStart();
      }

      // Context7 패턴: 함수를 내부에서 정의
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

      // Context7 패턴: 안전한 Analytics 호출
      if (typeof response !== 'string' && response.researchUsed && questionTracking?.trackResearchUsed) {
        questionTracking.trackResearchUsed(selectedGame.title, response.complexity?.score || 0, responseTime);
      }
      if (questionTracking?.trackAIResponse) {
        questionTracking.trackAIResponse(responseTime, true);
      }

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
  }, [selectedGame, sessionId, questionTracking]);

  // Universal Beta 화면 렌더링 - Context7 최적화
  const renderUniversalBetaScreen = useCallback(() => (
    <ResponsiveContainer maxWidth="xl" padding="md" className="min-h-screen">
      {/* 베타 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            onClick={handleBackToSelection}
            className="flex items-center gap-2"
          >
            ← 메인으로 돌아가기
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-amber-300">Universal Rule Master (Beta)</h1>
            <p className="text-sm text-amber-400/80">모든 보드게임 지원 • 베타 서비스</p>
          </div>
          <div className="w-32" /> {/* 균형 맞추기용 */}
        </div>
      </div>

      {/* 채팅 화면 */}
      <div className="max-w-4xl mx-auto">
        {/* 신뢰도 체크 중일 때 특별한 로딩 메시지 표시 */}
        {universalBetaState.isCheckingConfidence && (
          <div className="mb-4 p-4 bg-amber-500/10 border border-amber-400/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-400"></div>
              <div>
                <div className="text-amber-300 font-medium">🔍 AI 신뢰도 체크 중...</div>
                <div className="text-amber-400/80 text-sm">이 게임에 대한 AI의 전문성을 평가하고 있습니다</div>
              </div>
            </div>
          </div>
        )}

        <ChatScreen
          game={{ id: 'universal', title: universalBetaState.gameContext?.gameName || 'Universal Beta', description: 'Universal Rule Master Beta Mode' } as Game}
          onGoBack={handleBackToSelection}
          messages={messages}
          onSendMessage={handleUniversalBetaSendMessage}
          isLoading={isLoading}
        />

        {/* 베타 모드에서 Step 3: 퀵 버튼 표시 */}
        {universalBetaState.conversationState === 'awaiting_command' && universalBetaState.gameContext && (
          <div className="mt-6">
            <GameQuickActions
              game={{ id: 'universal', title: universalBetaState.gameContext.gameName } as Game}
              onActionClick={handleUniversalBetaSendMessage}
              className="max-w-2xl mx-auto"
            />
          </div>
        )}
      </div>
    </ResponsiveContainer>
  ), [universalBetaState, messages, isLoading, handleBackToSelection, handleUniversalBetaSendMessage]);

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
    <>
      <GameSelectionSuspense>
        <div className="min-h-screen">
          {/* Universal Beta 진입 버튼 추가 */}
          <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            <Button
              onClick={handleUniversalBetaToggle}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-6 py-2 rounded-lg shadow-lg"
            >
              🌟 Universal Beta
            </Button>

            {/* MVP 피드백 테스트 버튼들 */}
            <div className="flex flex-col gap-1">
              <Button
                onClick={() => showFeedback('game_not_found', {
                  searchTerm: searchTerm || null,
                  currentPage: 'game_selection',
                  timestamp: new Date().toISOString(),
                  gamesFound: games.length,
                  hasActiveSearch: !!searchTerm.trim()
                })}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                🔍 게임 못 찾음
              </Button>

              <Button
                onClick={() => showFeedback('ui_issue', {
                  page: 'home',
                  component: 'game_selection',
                  timestamp: new Date().toISOString()
                }, 'UI 문제 신고', '화면이나 버튼에 문제가 있나요?')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                🐛 UI 문제
              </Button>

              <Button
                onClick={() => showFeedback('feature_request', {
                  currentFeature: 'game_search',
                  userType: 'regular_user'
                }, '기능 개선 요청', '어떤 기능이 추가되었으면 좋겠나요?')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                💡 기능 요청
              </Button>
            </div>
          </div>

          <GameSelection
            search={{
              term: searchTerm,
              setTerm: handleSearchTermChange,
              isSearching
            }}
            ui={{
              isLoading,
              error: loadingError
            }}
            data={{
              games,
              onSelectGame: handleGameSelect
            }}
          />
        </div>
      </GameSelectionSuspense>
      <ClarityTest />

      {/* MVP 피드백 모달 */}
      {FeedbackModalComponent}
    </>
  );
}

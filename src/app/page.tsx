'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ChatScreen from '@/components/ChatScreen';
import TranslationDebugger from '@/components/TranslationDebugger';

import { ChatScreenSuspense, DebugPageSuspense } from '@/components/ui/suspense-wrapper';
import {
  ChatMessage,
  ResearchStage,
  UnifiedConversationState,
  UnifiedGameContext,
  UnifiedChatState,
  GeminiContent,
  ConfidenceCheckResult
} from '@/types/game';
import { errorHandler } from '@/lib/error-handler';
import { askGameQuestionWithContextTracking } from '@/lib/gemini';
import {
  usePageView,
  useQuestionTracking,
  useEngagementTracking
} from '@/lib/analytics';

import { ClarityTest } from '@/components/ui/clarity-test';
import { useFeedbackModal } from '@/components/feedback/FeedbackModal';
import { API_ENDPOINTS, CONFIDENCE_CHECK } from '@/lib/constants';
import { findGameByExactName } from '@/features/games/api';

export default function Home() {
  // 페이지 상태 관리 (검색 페이지 제거)
  const [currentPage, setCurrentPage] = useState<'chat' | 'debug'>('chat');

  // 통합된 대화 상태 관리
  const [chatState, setChatState] = useState<UnifiedChatState>({
    conversationState: 'awaiting_game_name',
    gameContext: null,
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    isCheckingConfidence: false,
    serviceMode: null,
    messages: [],
    geminiChatHistory: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [researchStage, setResearchStage] = useState<ResearchStage>('analyzing');

  // MVP 피드백 시스템
  const { showFeedback, FeedbackModalComponent } = useFeedbackModal();

  // Analytics 훅
  const questionTracking = useQuestionTracking();
  const engagementTracking = useEngagementTracking();

  // 페이지뷰 추적
  usePageView(currentPage === 'chat' ? '/' : '/debug');

  // 컴포넌트 마운트 시 환영 메시지 표시
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content: `안녕하세요! 🎲 저는 **보드게임 룰 마스터**입니다.

어떤 보드게임에 대해 알려드릴까요? 게임 이름을 입력해주세요.

예: "카탄", "스플렌더", "윙스팬", "아그리콜라" 등

💡 **Tip**: 365개의 인기 게임은 전문가 수준으로, 그 외 게임도 최선을 다해 도와드립니다!`
    };

    setChatState(prev => ({
      ...prev,
      messages: [welcomeMessage]
    }));

    // 세션 시작 추적
    if (engagementTracking?.trackSessionStart) {
      engagementTracking.trackSessionStart(chatState.sessionId);
    }
  }, []);

  // 통합된 메시지 핸들러
  const handleSendMessage = useCallback(async (content: string) => {
    console.log('💬 [통합 시스템] 메시지 처리:', {
      상태: chatState.conversationState,
      내용: content.slice(0, 50)
    });

    const userMessage: ChatMessage = {
      role: 'user',
      content
    };

    // 사용자 메시지를 UI에 추가
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage]
    }));
    setIsLoading(true);

    try {
      if (chatState.conversationState === 'awaiting_game_name') {
        // Step 1: 게임명 입력 → 신뢰도 체크
        const gameName = content.trim();

        console.log('🎮 [게임명 수신] 신뢰도 체크 시작:', gameName);

        // 신뢰도 체크 상태 업데이트
        setChatState(prev => ({
          ...prev,
          isCheckingConfidence: true
        }));

        // Step 2: Gemini API 기반 신뢰도 체크 (모든 게임 동일 적용)
        console.log('🔍 [신뢰도 체크] Gemini API 기반 신뢰도 측정 시작:', gameName);
        const dbGame = await findGameByExactName(gameName);

        const confidenceResponse = await fetch(API_ENDPOINTS.CHECK_CONFIDENCE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gameName })
        });

        if (!confidenceResponse.ok) {
          throw new Error('신뢰도 체크 실패');
        }

        const confidenceResult: ConfidenceCheckResult = await confidenceResponse.json();
        console.log('✅ [신뢰도 체크 완료]:', confidenceResult);

        const finalServiceMode = confidenceResult.serviceMode;
        const confidenceScore = confidenceResult.confidenceScore;

        // Step 3: 게임 컨텍스트 생성
        const gameContext: UnifiedGameContext = {
          gameName: dbGame?.title || gameName, // DB에 있으면 정확한 이름 사용
          gameId: dbGame?.gameId,
          setAt: new Date(),
          turnNumber: 1,
          confidenceResult: {
            confidenceScore,
            serviceMode: finalServiceMode
          },
          isFromDatabase: !!dbGame
        };

        // Gemini 채팅 히스토리에 사용자 메시지 추가
        const userGeminiMessage: GeminiContent = {
          role: 'user',
          parts: [{ text: content }]
        };

        const newGeminiHistory = [...chatState.geminiChatHistory, userGeminiMessage];

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
            serviceMode: finalServiceMode
          })
        });

        if (!response.ok) {
          throw new Error('API 호출 실패');
        }

        const responseData = await response.json();
        const aiResponse = responseData.response;

        // AI 응답을 Gemini 히스토리에 추가
        const aiGeminiMessage: GeminiContent = {
          role: 'model',
          parts: [{ text: aiResponse }]
        };

        // Step 5: 상태 업데이트
        setChatState(prev => ({
          ...prev,
          conversationState: 'in_conversation',
          gameContext,
          isCheckingConfidence: false,
          serviceMode: finalServiceMode,
          messages: [...prev.messages, {
            role: 'assistant',
            content: aiResponse
          }],
          geminiChatHistory: [...newGeminiHistory, aiGeminiMessage]
        }));

        console.log('✅ [게임 설정 완료]:', {
          게임명: gameContext.gameName,
          신뢰도: confidenceScore,
          모드: finalServiceMode,
          DB게임: gameContext.isFromDatabase
        });

      } else {
        // Step 6: 후속 질문 처리
        if (!chatState.gameContext) {
          throw new Error('게임 컨텍스트가 설정되지 않았습니다.');
        }

        console.log('💭 [후속 질문 처리]:', chatState.gameContext.gameName);

        // Analytics 추적
        if (questionTracking?.trackQuestionSubmitted) {
          questionTracking.trackQuestionSubmitted(
            chatState.gameContext.gameName,
            content.length,
            false
          );
        }

        // Gemini 채팅 히스토리에 사용자 메시지 추가
        const userGeminiMessage: GeminiContent = {
          role: 'user',
          parts: [{ text: content }]
        };

        const newGeminiHistory = [...chatState.geminiChatHistory, userGeminiMessage];

        // 서비스 모드에 따라 다른 API 호출
        if (chatState.serviceMode === 'expert' && chatState.gameContext.isFromDatabase) {
          // 365게임 전문가 모드 - 기존 API 사용
          const response = await askGameQuestionWithContextTracking(
            chatState.gameContext.gameName,
            content,
            chatState.sessionId
          );

          const aiMessage: ChatMessage = {
            role: 'assistant',
            content: typeof response === 'string' ? response : response.answer,
            researchUsed: typeof response !== 'string' ? response.researchUsed : false,
            sources: typeof response !== 'string' ? response.sources : undefined,
            fromCache: typeof response !== 'string' ? response.fromCache : undefined,
            complexity: typeof response !== 'string' ? response.complexity : undefined,
            analysisV2: typeof response !== 'string' ? response.analysisV2 : undefined
          };

          setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, aiMessage]
          }));

        } else {
          // Universal 시스템 사용 (베타 모드 또는 365게임이 아닌 경우)
          const response = await fetch('/api/universal-beta', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              gameName: chatState.gameContext.gameName,
              chatHistory: newGeminiHistory,
              isFirstResponse: false,
              serviceMode: chatState.serviceMode
            })
          });

          if (!response.ok) {
            throw new Error('API 호출 실패');
          }

          const responseData = await response.json();
          const aiResponse = responseData.response;

          // AI 응답을 Gemini 히스토리에 추가
          const aiGeminiMessage: GeminiContent = {
            role: 'model',
            parts: [{ text: aiResponse }]
          };

          setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, {
              role: 'assistant',
              content: aiResponse
            }],
            geminiChatHistory: [...newGeminiHistory, aiGeminiMessage]
          }));
        }

        console.log('✅ [후속 질문 처리 완료]');
      }

    } catch (error) {
      console.error('❌ [오류]:', error);

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `죄송합니다. 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isCheckingConfidence: false
      }));
    } finally {
      setIsLoading(false);
    }
  }, [chatState, questionTracking]);

  // 디버그 페이지로 이동
  const handleGoToDebug = useCallback(() => {
    setCurrentPage('debug');
  }, []);

  // 채팅으로 돌아가기
  const handleBackToChat = useCallback(() => {
    setCurrentPage('chat');
  }, []);

  // 디버그 페이지 렌더링
  if (currentPage === 'debug') {
    return (
      <DebugPageSuspense>
        <TranslationDebugger onGoBack={handleBackToChat} />
      </DebugPageSuspense>
    );
  }

  // 메인 채팅 화면 렌더링
  return (
    <>
      <ChatScreenSuspense>
        <div className="relative h-screen">
          {/* 신뢰도 체크 중 표시 - 전체 화면 오버레이 */}
          {chatState.isCheckingConfidence && (
            <div className="absolute top-0 left-0 right-0 z-40 p-4">
              <div className="max-w-2xl mx-auto bg-amber-500/10 border border-amber-400/20 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-400"></div>
                  <div>
                    <div className="text-amber-300 font-medium">🔍 AI 신뢰도 체크 중...</div>
                    <div className="text-amber-400/80 text-sm">이 게임에 대한 AI의 전문성을 평가하고 있습니다</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 채팅 화면 - 전체 화면 */}
          <ChatScreen
            game={{
              id: chatState.gameContext?.gameId?.toString() || 'unified',
              title: chatState.gameContext?.gameName || '보드게임 룰 마스터',
              description: '모든 보드게임 질문에 답변합니다'
            } as any}
            onGoBack={handleGoToDebug}
            messages={chatState.messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />



          {/* MVP 피드백 버튼들 - 우측 하단 */}
          <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {/* 피드백 버튼들 */}
          </div>
        </div>
      </ChatScreenSuspense>

      <ClarityTest />

      {/* MVP 피드백 모달 */}
      {FeedbackModalComponent}
    </>
  );
}

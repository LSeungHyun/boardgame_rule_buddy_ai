'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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

// 환영 메시지 상수
const WELCOME_MESSAGE = `안녕하세요! 🎲 저는 **보드게임 룰 마스터**입니다.

어떤 보드게임에 대해 알려드릴까요? 게임 이름을 입력해주세요.

예: "카탄", "스플렌더", "윙스팬", "아그리콜라" 등

💡 **Tip**: 365개의 인기 게임은 전문가 수준으로, 그 외 게임도 최선을 다해 도와드립니다!`;

export default function RuleMaster() {
    const searchParams = useSearchParams();
    const gameParam = searchParams.get('game');

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
    usePageView(currentPage === 'chat' ? '/rulemaster' : '/rulemaster/debug');

    // 컴포넌트 마운트 시 환영 메시지 표시 및 게임 파라미터 처리
    useEffect(() => {
        const welcomeMessage: ChatMessage = {
            role: 'assistant',
            content: WELCOME_MESSAGE
        };

        setChatState(prev => ({
            ...prev,
            messages: [welcomeMessage]
        }));

        // 게임 파라미터가 있으면 자동으로 게임명을 입력
        if (gameParam) {
            // 약간의 지연 후 게임명 자동 입력
            setTimeout(() => {
                handleSendMessage(gameParam);
            }, 500);
        }

        // 세션 시작 추적
        if (engagementTracking?.trackSessionStart) {
            engagementTracking.trackSessionStart(chatState.sessionId);
        }
    }, [gameParam]);

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

                // Universal Beta API 호출 (후속 질문)
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

                // 턴 증가 및 상태 업데이트
                setChatState(prev => ({
                    ...prev,
                    gameContext: {
                        ...prev.gameContext!,
                        turnNumber: prev.gameContext!.turnNumber + 1
                    },
                    messages: [...prev.messages, {
                        role: 'assistant',
                        content: aiResponse
                    }],
                    geminiChatHistory: [...newGeminiHistory, aiGeminiMessage]
                }));

                // Analytics 추적
                if (questionTracking?.trackAnswerReceived) {
                    questionTracking.trackAnswerReceived(
                        chatState.gameContext.gameName,
                        aiResponse.length
                    );
                }
            }

        } catch (error) {
            console.error('❌ [메시지 처리 오류]:', error);

            const errorMessage = await errorHandler(error);

            setChatState(prev => ({
                ...prev,
                messages: [...prev.messages, {
                    role: 'assistant',
                    content: errorMessage
                }],
                isCheckingConfidence: false
            }));
        } finally {
            setIsLoading(false);
        }
    }, [chatState, questionTracking, engagementTracking]);

    // 게임 컨텍스트가 있으면 게임 설정
    const game = chatState.gameContext ? {
        gameId: chatState.gameContext.gameId || chatState.gameContext.gameName,
        title: chatState.gameContext.gameName,
        description: '',
        minPlayers: 0,
        maxPlayers: 0,
        playingTime: 0,
        minAge: 0,
        difficulty: '',
        category: '',
        mechanics: '',
        expansions: '',
        imageUrl: '',
        thumbnailUrl: '',
        yearPublished: 0,
        publisher: '',
        designer: '',
        rating: 0,
        weight: 0,
        rank: 0,
        users: 0,
        isExpansion: false,
        parentGameId: null,
        parentGameTitle: null
    } : null;

    const handleQuestionClick = (question: string) => {
        handleSendMessage(question);
    };

    const handleGoBack = () => {
        setChatState({
            conversationState: 'awaiting_game_name',
            gameContext: null,
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isCheckingConfidence: false,
            serviceMode: null,
            messages: [{
                role: 'assistant',
                content: WELCOME_MESSAGE
            }],
            geminiChatHistory: []
        });
    };

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
            {/* 메인 페이지 네비게이션 */}
            <nav className="fixed top-0 left-0 right-0 z-40 bg-black/20 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* 로고/타이틀 */}
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={handleGoBack}
                                className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent hover:from-blue-300 hover:to-purple-400 transition-all duration-300"
                            >
                                🎲 룰마스터 AI
                            </button>
                        </div>

                        {/* 페이지 전환 버튼 */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setCurrentPage('chat')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPage === 'chat'
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-blue-200 hover:text-white hover:bg-blue-600/30'
                                    }`}
                            >
                                💬 채팅
                            </button>
                            <button
                                onClick={() => setCurrentPage('debug')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPage === 'debug'
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'text-purple-200 hover:text-white hover:bg-purple-600/30'
                                    }`}
                            >
                                🔧 디버그
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* 메인 컨텐츠 */}
            <main className="pt-16">
                {currentPage === 'chat' ? (
                    <ChatScreenSuspense>
                        <ChatScreen
                            game={game}
                            onGoBack={handleGoBack}
                            messages={chatState.messages}
                            onSendMessage={handleSendMessage}
                            isLoading={isLoading}
                            onQuestionClick={handleQuestionClick}
                        />
                    </ChatScreenSuspense>
                ) : (
                    <DebugPageSuspense>
                        <TranslationDebugger />
                    </DebugPageSuspense>
                )}
            </main>

            {/* 개발 환경 전용 - Clarity 테스트 패널 */}
            {process.env.NODE_ENV === 'development' && <ClarityTest />}

            {/* MVP 피드백 모달 */}
            {FeedbackModalComponent}
        </div>
    );
} 
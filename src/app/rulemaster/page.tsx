'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, useInView } from 'framer-motion';
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

// 🎨 Enhanced Floating Particles Component (루트 페이지와 동일)
const FloatingParticles = () => {
    const particlesRef = useRef<HTMLDivElement>(null);

    const particleCount = useMemo(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 768 ? 10 : 20;
        }
        return 20;
    }, []);

    useEffect(() => {
        const container = particlesRef.current;
        if (!container) return;

        // Create particles with varying sizes and speeds
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'floating-particle gpu-accelerated';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 15 + 's';
            particle.style.animationDuration = (12 + Math.random() * 8) + 's';

            // Varying particle sizes
            const size = 3 + Math.random() * 3;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';

            container.appendChild(particle);
        }

        return () => {
            container.innerHTML = '';
        };
    }, [particleCount]);

    return (
        <div
            ref={particlesRef}
            className="fixed inset-0 pointer-events-none overflow-hidden z-0"
        />
    );
};

// 🌊 Enhanced Dynamic Background Blobs (루트 페이지와 동일)
const BackgroundBlobs = () => {
    return (
        <div className="fixed inset-0 overflow-hidden z-0">
            {/* Primary Blob */}
            <motion.div
                className="absolute w-80 h-80 rounded-full opacity-15"
                style={{
                    background: 'radial-gradient(circle, #6366f1, transparent 70%)',
                    filter: 'blur(60px)',
                }}
                animate={{
                    x: [0, 120, -30, 0],
                    y: [0, -80, 40, 0],
                    scale: [1, 1.2, 0.9, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                initial={{ top: '20%', left: '15%' }}
            />

            {/* Secondary Blob */}
            <motion.div
                className="absolute w-72 h-72 rounded-full opacity-12"
                style={{
                    background: 'radial-gradient(circle, #06b6d4, transparent 70%)',
                    filter: 'blur(70px)',
                }}
                animate={{
                    x: [0, -100, 60, 0],
                    y: [0, 60, -40, 0],
                    scale: [1, 0.8, 1.1, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 5,
                }}
                initial={{ top: '60%', right: '20%' }}
            />

            {/* Accent Blob */}
            <motion.div
                className="absolute w-64 h-64 rounded-full opacity-10"
                style={{
                    background: 'radial-gradient(circle, #f43f5e, transparent 70%)',
                    filter: 'blur(80px)',
                }}
                animate={{
                    x: [0, 80, -60, 0],
                    y: [0, -60, 30, 0],
                    scale: [1, 1.3, 0.8, 1],
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 10,
                }}
                initial={{ bottom: '30%', left: '60%' }}
            />
        </div>
    );
};

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
        <div className="min-h-screen relative overflow-hidden gpu-accelerated">
            {/* Enhanced Background Effects */}
            <BackgroundBlobs />
            <FloatingParticles />

            {/* Enhanced Navigation */}
            <motion.nav
                className="fixed top-0 left-0 right-0 z-40 glass-card-premium border-b border-white/10"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Enhanced Logo/Title */}
                        <motion.div
                            className="flex items-center space-x-3"
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                        >
                            <motion.button
                                onClick={handleGoBack}
                                className="text-2xl font-bold gradient-text-premium hover:scale-105 transition-all duration-300 relative group"
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                🎲 룰마스터 AI

                                {/* Hover Glow Effect */}
                                <motion.div
                                    className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                                    style={{
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        filter: 'blur(20px)',
                                        transform: 'scale(1.2)',
                                    }}
                                />
                            </motion.button>
                        </motion.div>

                        {/* Enhanced Page Toggle Buttons */}
                        <div className="flex items-center space-x-3">
                            <motion.button
                                onClick={() => setCurrentPage('chat')}
                                className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-300 glass-premium relative overflow-hidden group ${currentPage === 'chat'
                                        ? 'bg-primary-600/20 text-primary-300 border border-primary-400/30 shadow-lg shadow-primary-500/20'
                                        : 'text-slate-300 hover:text-primary-300 hover:bg-primary-600/10 border border-transparent'
                                    }`}
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {/* Background Effect */}
                                <motion.div
                                    className="absolute inset-0 rounded-2xl"
                                    animate={{
                                        background: currentPage === 'chat'
                                            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))'
                                            : 'transparent'
                                    }}
                                    transition={{ duration: 0.3 }}
                                />

                                <span className="relative z-10">💬 채팅</span>
                            </motion.button>

                            <motion.button
                                onClick={() => setCurrentPage('debug')}
                                className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-300 glass-premium relative overflow-hidden group ${currentPage === 'debug'
                                        ? 'bg-secondary-600/20 text-secondary-300 border border-secondary-400/30 shadow-lg shadow-secondary-500/20'
                                        : 'text-slate-300 hover:text-secondary-300 hover:bg-secondary-600/10 border border-transparent'
                                    }`}
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {/* Background Effect */}
                                <motion.div
                                    className="absolute inset-0 rounded-2xl"
                                    animate={{
                                        background: currentPage === 'debug'
                                            ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(14, 116, 144, 0.1))'
                                            : 'transparent'
                                    }}
                                    transition={{ duration: 0.3 }}
                                />

                                <span className="relative z-10">🔧 디버그</span>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.nav>

            {/* Enhanced Main Content */}
            <main className="pt-16 relative z-10">
                <AnimatePresence mode="wait">
                    {currentPage === 'chat' ? (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                        >
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
                        </motion.div>
                    ) : (
                        <motion.div
                            key="debug"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                        >
                            <DebugPageSuspense>
                                <TranslationDebugger />
                            </DebugPageSuspense>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* 개발 환경 전용 - Clarity 테스트 패널 */}
            {process.env.NODE_ENV === 'development' && <ClarityTest />}

            {/* MVP 피드백 모달 */}
            {FeedbackModalComponent}
        </div>
    );
} 
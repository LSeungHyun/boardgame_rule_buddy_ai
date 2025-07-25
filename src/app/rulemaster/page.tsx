'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, useInView } from 'framer-motion';
import ChatScreen from '@/components/ChatScreen';
import { useGameCorrection } from '@/hooks/use-game-correction';
import { GameCorrectionModal } from '@/components/ui/game-correction-modal';

import { ChatScreenSuspense } from '@/components/ui/suspense-wrapper';
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
import { FloatingFeedbackFAB } from '@/components/ui/floating-feedback-fab';
import { useUnifiedFeedback } from '@/components/feedback/UnifiedFeedbackModal';
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
const WELCOME_MESSAGE = `안녕하세요! 🎲 저는 RuleBuddy(Beta)입니다.🤖

어떤 보드게임에 대해 알려드릴까요? 게임 이름을 입력해주세요.

예: "카탄", "스플렌더", "윙스팬", "아그리콜라" 등

💡 **Tip**: 365개의 인기 게임은 전문가 수준으로, 그 외 게임도 최선을 다해 도와드립니다!`;

// Suspense로 감싸져야 하는 부분을 별도 컴포넌트로 분리
function RuleMasterContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const gameParam = searchParams.get('game');



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

    // MVP 피드백 시스템 (기존)
    const { showFeedback, FeedbackModalComponent } = useFeedbackModal();
    
    // 통합 피드백 시스템 (새로운)
    const { 
        showFeedback: showUnifiedFeedback, 
        FeedbackModalComponent: UnifiedFeedbackModalComponent,
        isOpen: isFeedbackOpen 
    } = useUnifiedFeedback();

    // 오타 교정 시스템
    const { isChecking, correctionResult, checkGameCorrection, clearCorrection } = useGameCorrection();
    const [showCorrectionModal, setShowCorrectionModal] = useState(false);

    // Analytics 훅
    const questionTracking = useQuestionTracking();
    const engagementTracking = useEngagementTracking();

    // 페이지뷰 추적
    usePageView('/rulemaster');

    // 게임 파라미터 처리 여부를 추적하는 ref
    const gameParamProcessed = useRef(false);

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

        // 게임 파라미터가 있고 아직 처리되지 않았으면 자동으로 게임명을 입력
        if (gameParam && !gameParamProcessed.current) {
            gameParamProcessed.current = true;
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

        // 🔧 게임명 입력 시 오타 교정 체크
        if (chatState.conversationState === 'awaiting_game_name') {
            const correctionResult = await checkGameCorrection(content.trim());
            
            if (correctionResult.needsCorrection) {
                if (correctionResult.autoCorrection && correctionResult.autoCorrection.confidence >= 0.9) {
                    // 높은 신뢰도로 자동 교정
                    const correctedName = correctionResult.autoCorrection.correctedName;
                    
                    // 교정 알림 메시지 추가
                    const correctionMessage: ChatMessage = {
                        role: 'assistant',
                        content: `"${content.trim()}" → "${correctedName}"으로 자동 교정되었습니다. ✨`
                    };
                    
                    setChatState(prev => ({
                        ...prev,
                        messages: [...prev.messages, correctionMessage]
                    }));
                    
                    // 교정된 이름으로 진행
                    content = correctedName;
                } else if (correctionResult.suggestions.length > 0) {
                    // 사용자 확인 필요한 경우 모달 표시
                    setShowCorrectionModal(true);
                    return; // 사용자 선택 대기
                }
            }
        }

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

                // Analytics 추적은 useQuestionTracking 훅이 올바르게 정의된 후 활성화 예정
            }

        } catch (error) {
            console.error('❌ [메시지 처리 오류]:', error);

            const appError = errorHandler.handle(error);
            const errorMessage = errorHandler.getUserMessage(appError);

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
        id: chatState.gameContext.gameId?.toString() || chatState.gameContext.gameName,
        gameId: typeof chatState.gameContext.gameId === 'number' 
            ? chatState.gameContext.gameId 
            : (parseInt(chatState.gameContext.gameId?.toString() || '0', 10) || 0),
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

    // 오타 교정 모달 핸들러
    const handleSelectCorrectedGame = useCallback((correctedGameName: string) => {
        setShowCorrectionModal(false);
        clearCorrection();
        // 교정된 게임명으로 메시지 재전송
        handleSendMessage(correctedGameName);
    }, [handleSendMessage, clearCorrection]);

    const handleProceedWithOriginal = useCallback(() => {
        setShowCorrectionModal(false);
        clearCorrection();
        // 원래 입력으로 진행 (이미 userMessage가 추가되어 있으므로 처리만 계속)
        // 원래 게임명으로 진행하는 로직이 필요하다면 여기에 추가
    }, [clearCorrection]);

    const handleCancelCorrection = useCallback(() => {
        setShowCorrectionModal(false);
        clearCorrection();
        setIsLoading(false); // 로딩 상태 해제
    }, [clearCorrection]);

    const handleQuestionClick = (question: string) => {
        handleSendMessage(question);
    };

    const handleGoBack = () => {
        // 루트 페이지로 이동
        router.push('/');
    };

    // 헤더용 피드백 버튼 컴포넌트
    const HeaderFeedbackButton = () => (
        <motion.button
            onClick={() => showUnifiedFeedback('rulemaster', chatState.gameContext, {
                hasSearchResults: chatState.messages.length > 2,
                lastAnswerLength: chatState.messages[chatState.messages.length - 1]?.content?.length,
                sessionDuration: Date.now() - parseInt(chatState.sessionId.split('_')[1])
            })}
            className="px-4 py-2 rounded-2xl glass-card border-2 border-pink-400/30 hover:border-pink-400/50 transition-all duration-300 group min-h-[48px] flex items-center gap-2.5 relative overflow-hidden shadow-lg hover:shadow-xl touch-manipulation bg-gradient-to-r from-pink-500/20 to-rose-500/20"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            aria-label="피드백 남기기 - 어떠셨나요?"
        >
            <motion.div
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/15 to-rose-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
            
            {/* 이모지 */}
            <motion.span
                className="text-xl relative z-10"
                animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, -10, 10, 0]
                }}
                transition={{ 
                    scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 1, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }
                }}
            >
                🤔
            </motion.span>
            
            {/* 텍스트 */}
            <motion.div
                className="flex flex-col items-start relative z-10"
                animate={{ 
                    x: [0, 2, 0]
                }}
                transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    repeatDelay: 1
                }}
            >
                <span className="text-xs text-pink-200/90 font-medium leading-tight">간단히</span>
                <span className="text-sm text-pink-100 font-semibold leading-tight">어떠셨나요?</span>
            </motion.div>
            
            {/* 아이콘 */}
            <motion.div
                className="relative z-10"
                animate={{ 
                    rotate: [0, -5, 5, 0]
                }}
                transition={{ 
                    duration: 0.8, 
                    ease: "easeInOut", 
                    repeat: Infinity, 
                    repeatDelay: 3 
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-pink-200 group-hover:text-pink-100 transition-colors duration-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            </motion.div>
        </motion.button>
    );

    return (
        <div className="min-h-screen relative overflow-hidden gpu-accelerated">
            {/* Enhanced Background Effects */}
            <BackgroundBlobs />
            <FloatingParticles />

            {/* Enhanced Main Content */}
            <main className="relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
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
                            headerActions={<HeaderFeedbackButton />}
                        />
                    </ChatScreenSuspense>
                </motion.div>
            </main>

            {/* 개발 환경 전용 - Clarity 테스트 패널 */}
            {process.env.NODE_ENV === 'development' && <ClarityTest />}

            {/* 통합 피드백 모달 */}
            {UnifiedFeedbackModalComponent}

            {/* 기존 MVP 피드백 모달 (필요시 유지) */}
            {FeedbackModalComponent}

            {/* 게임 교정 모달 */}
            <GameCorrectionModal
                isOpen={showCorrectionModal}
                correctionResult={correctionResult}
                onSelectGame={handleSelectCorrectedGame}
                onProceedWithOriginal={handleProceedWithOriginal}
                onCancel={handleCancelCorrection}
            />
        </div>
    );
}

// 로딩 컴포넌트
function RuleMasterLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">로딩 중...</p>
            </div>
        </div>
    );
}

// 메인 export 함수 - Suspense로 감싸기
export default function RuleMaster() {
    return (
        <Suspense fallback={<RuleMasterLoading />}>
            <RuleMasterContent />
        </Suspense>
    );
}
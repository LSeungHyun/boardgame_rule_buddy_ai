'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from './ChatMessage';
import { SendButton } from '@/components/ui/send-button';
import { ChatScreenProps, ResearchStage } from '@/types/game';
import { Loader2, Brain, Search, Cog, FileText, Lightbulb, PenTool, CheckCircle, Sparkles } from 'lucide-react';

// ✨ Enhanced Research Stage Configuration
const researchStageConfig: Record<ResearchStage, { progress: number; text: string; icon: React.ComponentType<{ className?: string }> }> = {
    analyzing: { progress: 10, text: '질문 분석 중...', icon: Search },
    searching: { progress: 25, text: '관련 규칙 검색 중...', icon: FileText },
    processing: { progress: 45, text: '정보 처리 중...', icon: Cog },
    summarizing: { progress: 65, text: '정보 요약 및 정리 중...', icon: Brain },
    generating_logic: { progress: 80, text: '답변의 핵심 논리를 구상하고 있습니다...', icon: Lightbulb },
    generating_text: { progress: 90, text: '논리에 맞춰 문장을 생성하고 있습니다...', icon: PenTool },
    generating_review: { progress: 95, text: '생성된 답변을 최종 검토하고 있습니다...', icon: CheckCircle },
    completed: { progress: 100, text: '답변 완성!', icon: Sparkles },
};

export default function ChatScreen({ game, onGoBack, messages, onSendMessage, isLoading, headerActions, showFullProgressOverlay = true }: ChatScreenProps) {
    const [input, setInput] = useState('');
    const [researchStage, setResearchStage] = useState<ResearchStage>('analyzing');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [ProgressIcon, setProgressIcon] = useState<React.ComponentType<{ className?: string }>>(Search);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const prevLoadingRef = useRef(isLoading);

    // Enhanced scroll control states
    const [lastMessageCount, setLastMessageCount] = useState(0);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Enhanced auto scroll logic
    useEffect(() => {
        if (messages.length > lastMessageCount && shouldAutoScroll) {
            scrollToBottom();
            setLastMessageCount(messages.length);
        }
    }, [messages.length, lastMessageCount, shouldAutoScroll]);

    // Enhanced scroll handler
    useEffect(() => {
        const chatContainer = document.querySelector('.premium-chat-scroll');
        if (!chatContainer) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = chatContainer as HTMLElement;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
            setShouldAutoScroll(isAtBottom);
        };

        chatContainer.addEventListener('scroll', handleScroll);
        return () => chatContainer.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setLastMessageCount(messages.length);
    }, []);

    // Enhanced research stage effects with auto progression
    useEffect(() => {
        setIsFinalizing(false);

        if (isLoading) {
            const config = researchStageConfig[researchStage];
            if (config) {
                setProgress(config.progress);
                setProgressText(config.text);
                setProgressIcon(config.icon);
            }
        }

        if (researchStage === 'generating_review') {
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 99) {
                        clearInterval(interval);
                        setIsFinalizing(true);
                        setProgressText("답변을 완성하고 있습니다...");
                        return 99;
                    }
                    return prev + 1;
                });
            }, 500);

            return () => clearInterval(interval);
        }

    }, [researchStage, isLoading]);

    // Smart auto-progress that adapts to actual response time
    useEffect(() => {
        if (!isLoading) return;

        const stages: ResearchStage[] = ['analyzing', 'searching', 'processing', 'summarizing', 'generating_logic', 'generating_text', 'generating_review'];
        const currentIndex = stages.indexOf(researchStage);

        if (currentIndex < stages.length - 1) {
            const baseDelay = 800;
            const randomDelay = Math.random() * 400;
            const totalDelay = baseDelay + randomDelay;

            const timeout = setTimeout(() => {
                setResearchStage(stages[currentIndex + 1]);
            }, totalDelay);

            return () => clearTimeout(timeout);
        }
    }, [isLoading, researchStage]);

    // Complete progress bar when loading finishes
    useEffect(() => {
        const prevLoading = prevLoadingRef.current;
        prevLoadingRef.current = isLoading;

        // 이전에 로딩 중이었고 지금 로딩이 끝난 경우에만 완료 상태 표시
        if (prevLoading && !isLoading) {
            setResearchStage('completed');
            setProgress(100);
            setProgressText('답변 완성!');
            setProgressIcon(Sparkles);

            const timeout = setTimeout(() => {
                setProgress(0);
                setResearchStage('analyzing');
            }, 1500);

            return () => clearTimeout(timeout);
        }
    }, [isLoading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            setShouldAutoScroll(true);

            // 새로운 질문 시작 시 즉시 초기 상태로 리셋
            setResearchStage('analyzing');
            setProgress(0);
            setIsFinalizing(false);

            onSendMessage(input);
            setInput('');

            setTimeout(() => {
                if (shouldAutoScroll) {
                    scrollToBottom();
                }
            }, 100);
        }
    };

    return (
        <div className="flex flex-col h-screen relative">
            {/* 중앙 로딩 오버레이 - 최초 응답에만 표시 */}
            <AnimatePresence>
                {isLoading && showFullProgressOverlay && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{
                            background: 'rgba(0, 0, 0, 0.95)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <motion.div
                            className="relative rounded-3xl px-8 py-6 max-w-sm w-full mx-4 shadow-2xl border border-amber-400/30"
                            style={{
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))',
                            }}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        >
                            {/* 배경 글로우 효과 */}
                            <motion.div
                                className="absolute inset-0 rounded-3xl"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
                                }}
                                animate={{
                                    opacity: [0.3, 0.6, 0.3],
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            />

                            <div className="relative z-10">
                                {/* 상단 아이콘과 제목 */}
                                <div className="flex items-center justify-center mb-4">
                                    <motion.div
                                        className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400/40"
                                        animate={{
                                            scale: [1, 1.1, 1],
                                            rotate: researchStage === 'processing' ? [0, 360] : 0
                                        }}
                                        transition={{
                                            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                                            rotate: { duration: 2, repeat: Infinity, ease: "linear" }
                                        }}
                                    >
                                        <ProgressIcon className="w-6 h-6 text-amber-200" />
                                    </motion.div>
                                </div>

                                {/* 룰버디 생각 중 텍스트 */}
                                <div className="text-center mb-4">
                                    <h3 className="text-lg font-bold text-amber-100 mb-1">
                                        🤖 룰버디가 생각하고 있어요
                                    </h3>
                                    <p className="text-sm text-amber-200/80">
                                        최고의 답변을 위해 열심히 연구 중입니다
                                    </p>
                                </div>

                                {/* 진행 상태 */}
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-medium text-sm text-slate-200">{progressText}</span>
                                    <motion.span
                                        className="font-bold text-sm text-primary-300"
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        {progress}%
                                    </motion.span>
                                </div>

                                {/* 진행률 바 */}
                                <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden border border-slate-700/50">
                                    <motion.div
                                        className={`h-3 rounded-full shadow-lg transition-all duration-800 ease-out ${isFinalizing
                                            ? 'bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400 animate-pulse'
                                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                            }`}
                                        style={{
                                            width: `${progress}%`,
                                            minWidth: progress > 0 ? '2px' : '0px'
                                        }}
                                        animate={{
                                            background: isFinalizing
                                                ? ['linear-gradient(to right, #3b82f6, #a855f7)', 'linear-gradient(to right, #a855f7, #3b82f6)']
                                                : undefined
                                        }}
                                        transition={{
                                            background: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                                        }}
                                    />
                                </div>

                                {/* 하단 힌트 텍스트 */}
                                <div className="text-center mt-4">
                                    <p className="text-xs text-amber-300/60">
                                        잠시만 기다려 주세요 ✨
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Enhanced Header */}
            <motion.header
                className="glass-card border-b border-amber-400/20 shadow-2xl relative z-10 hover:border-amber-400/30 transition-all duration-300"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(217, 119, 6, 0.05))',
                }}
            >
                <div className="flex items-center justify-between p-4 md:p-6">
                    {/* Enhanced Back Button */}
                    <motion.button
                        onClick={onGoBack}
                        className="p-3 rounded-2xl glass-card border border-amber-400/20 hover:border-amber-400/40 transition-all duration-300 group min-w-[48px] min-h-[48px] flex items-center justify-center relative overflow-hidden shadow-lg hover:shadow-xl"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <motion.div
                            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        />
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-amber-200 group-hover:text-amber-100 transition-colors duration-300 relative z-10"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </motion.button>

                    {/* Enhanced Title */}
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                    >
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-amber-100 drop-shadow-sm">
                            📖 {game?.title || '룰마스터 AI'}
                        </h2>
                    </motion.div>

                    {/* Header Actions */}
                    <div className="flex items-center">
                        {headerActions || <div className="w-12"></div>}
                    </div>
                </div>
            </motion.header>

            {/* Enhanced Chat Area */}
            <main className="flex-1 p-4 md:p-6 overflow-y-auto premium-chat-scroll space-y-6 relative">
                {/* Chat Messages */}
                <AnimatePresence>
                    {messages.map((msg, index) => {
                        let userQuestion: string | undefined;
                        if (msg.role === 'assistant' && index > 0) {
                            const previousMessage = messages[index - 1];
                            if (previousMessage.role === 'user') {
                                userQuestion = previousMessage.content;
                            }
                        }

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                transition={{
                                    duration: 0.5,
                                    ease: [0.23, 1, 0.32, 1],
                                    delay: index * 0.05
                                }}
                            >
                                <ChatMessage
                                    message={msg}
                                    game={game}
                                    userQuestion={userQuestion}
                                    messageIndex={index}
                                    onQuestionClick={(question) => {
                                        if (!isLoading) {
                                            setInput(question);
                                            setTimeout(() => {
                                                const form = document.querySelector('form');
                                                if (form) {
                                                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                                                }
                                                // 폼 제출 후 스크롤을 맨 아래로 이동
                                                setTimeout(() => {
                                                    scrollToBottom();
                                                }, 200);
                                            }, 100);
                                        }
                                    }}
                                />
                            </motion.div>
                        );
                    })}

                    {/* 간소화된 프로그레스 메시지 - 최초 응답이 아닐 때만 표시 */}
                    {isLoading && !showFullProgressOverlay && (
                        <motion.div
                            className="flex justify-start"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <motion.div
                                className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl px-4 py-3 shadow-lg border border-amber-400/20"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))',
                                }}
                            >
                                <div className="flex items-center space-x-3">
                                    {/* 아이콘 */}
                                    <motion.div
                                        className="flex-shrink-0"
                                        animate={{
                                            rotate: researchStage === 'processing' ? [0, 360] : 0
                                        }}
                                        transition={{
                                            rotate: { duration: 2, repeat: Infinity, ease: "linear" }
                                        }}
                                    >
                                        <ProgressIcon className="w-5 h-5 text-amber-400" />
                                    </motion.div>

                                    {/* 텍스트와 프로그레스 */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm text-amber-200 truncate pr-2">{progressText}</p>
                                            <span className="text-xs text-amber-300 font-medium">{progress}%</span>
                                        </div>

                                        {/* 미니 프로그레스 바 */}
                                        <div className="w-full bg-amber-900/30 rounded-full h-1.5 overflow-hidden">
                                            <motion.div
                                                className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                                                style={{ width: `${progress}%` }}
                                                animate={{
                                                    background: isFinalizing
                                                        ? ['linear-gradient(to right, #f59e0b, #d97706)', 'linear-gradient(to right, #d97706, #f59e0b)']
                                                        : undefined
                                                }}
                                                transition={{
                                                    background: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </main>

            {/* Enhanced Input Area */}
            <motion.footer
                className="border-t border-amber-400/20 relative z-10 shadow-2xl"
                style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15))',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
            >
                <form onSubmit={handleSubmit} className="p-4 md:p-6 flex gap-3">
                    {/* Enhanced Input Field */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            placeholder="🎲 보드게임 규칙에 대해 궁금한 점을 물어보세요..."
                            className={`
                                w-full rounded-2xl px-6 py-4 
                                placeholder:text-amber-400/70 text-amber-100 text-base font-medium
                                transition-all duration-300 relative z-10
                                border-2 ${isInputFocused ? 'border-amber-400/60' : 'border-amber-400/20'}
                                disabled:opacity-50 disabled:cursor-not-allowed
                                shadow-lg hover:shadow-xl
                            `}
                            style={{
                                background: isInputFocused
                                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15))'
                                    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))',
                            }}
                            disabled={isLoading}
                        />
                    </div>

                    {/* New SendButton Component */}
                    <SendButton
                        isEnabled={!!input.trim()}
                        isLoading={isLoading}
                        isInputFocused={isInputFocused}
                        type="submit"
                    />
                </form>
            </motion.footer>
        </div>
    );
}
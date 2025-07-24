'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from './ChatMessage';
import { SendButton } from '@/components/ui/send-button';
import { ChatScreenProps, ResearchStage } from '@/types/game';

// ✨ Enhanced Research Stage Configuration
const researchStageConfig: Record<ResearchStage, { progress: number; text: string; icon: string }> = {
    analyzing: { progress: 10, text: '질문 분석 중...', icon: '🔍' },
    searching: { progress: 25, text: '관련 규칙 검색 중...', icon: '📚' },
    processing: { progress: 45, text: '정보 처리 중...', icon: '⚙️' },
    summarizing: { progress: 65, text: '정보 요약 및 정리 중...', icon: '📝' },
    generating_logic: { progress: 80, text: '답변의 핵심 논리를 구상하고 있습니다...', icon: '💭' },
    generating_text: { progress: 90, text: '논리에 맞춰 문장을 생성하고 있습니다...', icon: '✍️' },
    generating_review: { progress: 95, text: '생성된 답변을 최종 검토하고 있습니다...', icon: '✅' },
    completed: { progress: 100, text: '답변 완성!', icon: '🎉' },
};

export default function ChatScreen({ game, onGoBack, messages, onSendMessage, isLoading, headerActions }: ChatScreenProps) {
    const [input, setInput] = useState('');
    const [researchStage, setResearchStage] = useState<ResearchStage>('analyzing');
    const [showResearchStatus, setShowResearchStatus] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [progressIcon, setProgressIcon] = useState('');
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);

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

        if (showResearchStatus) {
            const config = researchStageConfig[researchStage];
            if (config) {
                // 프로그레스바가 즉시 업데이트되도록 강제 설정
                setProgress(config.progress);
                setProgressText(config.text);
                setProgressIcon(config.icon);
                
                // 디버깅을 위한 로그
                console.log(`🔄 Progress updated: ${config.progress}% - ${config.text}`);
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

    }, [researchStage, showResearchStatus]);

    // Smart auto-progress that adapts to actual response time
    useEffect(() => {
        if (!isLoading || !showResearchStatus) return;

        const stages: ResearchStage[] = ['analyzing', 'searching', 'processing', 'summarizing', 'generating_logic', 'generating_text', 'generating_review'];
        const currentIndex = stages.indexOf(researchStage);
        
        if (currentIndex < stages.length - 1) {
            // 더 빠른 진행 속도로 실제 응답 시간에 맞춤
            const baseDelay = 800; // 기본 800ms
            const randomDelay = Math.random() * 400; // 0-400ms 추가
            const totalDelay = baseDelay + randomDelay;
            
                         const timeout = setTimeout(() => {
                 setResearchStage(stages[currentIndex + 1]);
                 // 단계 변경 후 스크롤 유지
                 setTimeout(() => {
                     if (shouldAutoScroll) {
                         scrollToBottom();
                     }
                 }, 50);
             }, totalDelay);

            return () => clearTimeout(timeout);
        }
    }, [isLoading, showResearchStatus, researchStage]);

    // Complete progress bar when loading finishes
    useEffect(() => {
        if (!isLoading && showResearchStatus) {
            // 답변이 완료되면 즉시 completed 상태로 변경
            setResearchStage('completed');
            setProgress(100);
            setProgressText('답변 완성!');
            setProgressIcon('🎉');
            
            // 완료 표시 후 리셋
            setTimeout(() => {
                setShowResearchStatus(false);
                setProgress(0);
                setResearchStage('analyzing');
            }, 1500); // 완료 상태를 1.5초간 표시
        }
    }, [isLoading, showResearchStatus]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            setShouldAutoScroll(true);

            // 먼저 메시지를 보내고 나서 프로그레스바 시작
            onSendMessage(input);
            setInput('');
            
                         // 사용자 메시지가 UI에 나타난 후 프로그레스바 시작
             setTimeout(() => {
                 setShowResearchStatus(true);
                 setResearchStage('analyzing');
                 // 프로그레스바가 나타난 후 스크롤 재조정
                 setTimeout(() => {
                     scrollToBottom();
                 }, 100);
             }, 50);
        }
    };

    return (
        <div className="flex flex-col h-screen relative">
            {/* Enhanced Header */}
            <motion.header
                className="glass-card border-b border-amber-400/20 shadow-2xl relative z-10 hover:border-amber-400/30 transition-all duration-300"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                style={{
                    backdropFilter: 'blur(20px) saturate(150%)',
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
                </AnimatePresence>

                {/* Enhanced Research Progress */}
                <AnimatePresence>
                    {isLoading && showResearchStatus && (
                        <motion.div
                            className="flex justify-start"
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.9 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        >
                            <div className="glass-card-premium border border-primary-400/30 rounded-3xl px-6 py-4 w-full max-w-md shadow-2xl relative overflow-hidden">
                                {/* Background Glow */}
                                <motion.div
                                    className="absolute inset-0 rounded-3xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                                        filter: 'blur(20px)',
                                    }}
                                    animate={{
                                        opacity: [0.3, 0.6, 0.3],
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center space-x-2">
                                            <motion.span
                                                className="text-lg"
                                                animate={{ rotate: [0, 360] }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            >
                                                {progressIcon}
                                            </motion.span>
                                            <span className="font-medium text-sm text-slate-200">{progressText}</span>
                                        </div>
                                        <motion.span
                                            className="font-bold text-sm text-primary-300"
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                                        >
                                            {progress}%
                                        </motion.span>
                                    </div>

                                                                         {/* Enhanced Progress Bar */}
                                     <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden border border-slate-700/50">
                                         <div
                                             className={`h-3 rounded-full shadow-lg transition-all duration-800 ease-out ${isFinalizing
                                                     ? 'bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400 animate-pulse'
                                                     : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                                 }`}
                                             style={{ 
                                                 width: `${progress}%`,
                                                 minWidth: progress > 0 ? '2px' : '0px'
                                             }}
                                         />
                                     </div>
                                </div>
                            </div>
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
                    backdropFilter: 'none',
                    WebkitBackdropFilter: 'none',
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
                                backdropFilter: 'none',
                                WebkitBackdropFilter: 'none',
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
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Send } from 'lucide-react';
import WelcomeGuideModal from '@/components/WelcomeGuideModal';
import { SendButton } from '@/components/ui/send-button';
import { FloatingFeedbackFAB } from '@/components/ui/floating-feedback-fab';
import { useUnifiedFeedback } from '@/components/feedback/UnifiedFeedbackModal';
import { GameCorrectionModal } from '@/components/ui/game-correction-modal';
import { useGameCorrection } from '@/hooks/use-game-correction';

// 🎨 Enhanced Floating Particles Component
const FloatingParticles = () => {
  const particlesRef = useRef<HTMLDivElement>(null);

  const particleCount = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 15 : 25;
    }
    return 25;
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
      const size = 4 + Math.random() * 4;
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

// 🌊 Enhanced Dynamic Background Blobs
const BackgroundBlobs = () => {
  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      {/* Primary Blob */}
      <motion.div
        className="absolute w-96 h-96 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #6366f1, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 150, -50, 0],
          y: [0, -100, 50, 0],
          scale: [1, 1.3, 0.8, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        initial={{ top: '10%', left: '10%' }}
      />

      {/* Secondary Blob */}
      <motion.div
        className="absolute w-80 h-80 rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, #06b6d4, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, -120, 80, 0],
          y: [0, 80, -60, 0],
          scale: [1, 0.7, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
        initial={{ top: '60%', right: '10%' }}
      />

      {/* Accent Blob */}
      <motion.div
        className="absolute w-72 h-72 rounded-full opacity-12"
        style={{
          background: 'radial-gradient(circle, #f43f5e, transparent 70%)',
          filter: 'blur(70px)',
        }}
        animate={{
          x: [0, 100, -80, 0],
          y: [0, -80, 40, 0],
          scale: [1, 1.4, 0.9, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 10,
        }}
        initial={{ bottom: '20%', left: '50%' }}
      />
    </div>
  );
};

// 🎯 Premium Interactive Input Component
const PremiumInput = ({ value, onChange, onKeyPress, onSubmit, isLoading }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  isLoading?: boolean;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const handleRipple = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newRipple = {
      id: Date.now(),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setRipples(prev => [...prev, newRipple]);

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Auto-focus enhancement
    if (inputRef.current) {
      inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
    }
  };

  return (
    <motion.div
      ref={ref}
      className="relative group max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
      transition={{ delay: 1.5, duration: 1, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Input Container */}
      <div className="relative">
        {/* Background Glow Effect */}
        <motion.div
          className="absolute inset-0 rounded-3xl"
          style={{
            background: isFocused
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))'
              : 'transparent',
            filter: 'blur(20px)',
            transform: 'scale(1.05)',
          }}
          animate={{
            opacity: isFocused ? 1 : 0,
          }}
          transition={{ duration: 0.4 }}
        />

        <div className="relative flex items-center">
          <motion.input
            ref={inputRef}
            type="text"
            placeholder="게임 이름을 입력하세요 (예: 루미큐브)"
            value={value}
            onChange={onChange}
            onKeyPress={onKeyPress}
            onFocus={handleFocus}
            onBlur={() => setIsFocused(false)}
            disabled={isLoading}
            className={`
              w-full pl-6 md:pl-8 pr-20 md:pr-24 py-6 md:py-8 
              text-lg md:text-xl rounded-3xl
              glass-card-premium focus-premium gpu-accelerated
              placeholder:text-slate-400/70 text-slate-100
              transition-all duration-500 ease-out
              border-2 ${isFocused ? 'border-primary-400/40' : 'border-transparent'}
              ${isFocused ? 'shadow-2xl' : 'shadow-lg'}
              ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}
              relative z-10
            `}
            style={{
              background: isFocused
                ? 'linear-gradient(135deg, var(--glass-heavy), var(--glass-medium))'
                : 'var(--glass-medium)',
              backdropFilter: 'blur(20px) saturate(150%)',
            }}
            autoFocus
          />

          {/* Send Button */}
          <div className="absolute right-4 md:right-6 z-20">
            <SendButton
              isEnabled={!!value.trim() && !isLoading}
              isLoading={isLoading}
              isInputFocused={isFocused}
              onClick={onSubmit}
              type="button"
              aria-label="게임 검색"
              className="shadow-xl"
            />
          </div>
        </div>

        {/* Enhanced Focus Ring */}
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          initial={false}
          animate={{
            boxShadow: isFocused
              ? '0 0 0 4px rgba(99, 102, 241, 0.2), 0 0 40px rgba(99, 102, 241, 0.15)'
              : '0 0 0 0px transparent, 0 0 0px transparent'
          }}
          transition={{ duration: 0.3 }}
        />

        {/* 로딩 상태 표시 */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-3xl backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 text-white">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">게임을 찾고 있어요...</span>
            </div>
          </motion.div>
        )}

      </div>

      {/* Enhanced Helper Text */}
      <motion.div
        className="text-center mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.8 }}
      >
                  <p className="text-slate-300/80 text-sm md:text-base">
            보드게임 이름을 입력하고{' '}
            <span className="inline-flex items-center gap-1">
              <span className="text-primary-300">전송 버튼</span>
              <Send className="w-4 h-4 text-primary-300" />
            </span>
            을 클릭하세요
          </p>
      </motion.div>
    </motion.div>
  );
};

// 🎨 Enhanced Value Cards with Advanced Animations
const ValueCard = ({ item, index }: {
  item: { icon: string; title: string; desc: string; color: string };
  index: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      className="glass-card-premium rounded-3xl p-4 md:p-8 text-center group relative overflow-hidden"
      initial={{ opacity: 0, y: 50, rotateY: -15 }}
      animate={isInView ? {
        opacity: 1,
        y: 0,
        rotateY: 0
      } : {
        opacity: 0,
        y: 50,
        rotateY: -15
      }}
      transition={{
        delay: 1.4 + index * 0.15,
        duration: 0.8,
        ease: [0.23, 1, 0.32, 1]
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{ perspective: 1000 }}
    >
      {/* Background Gradient Effect */}
      <motion.div
        className="absolute inset-0 rounded-3xl"
        style={{
          background: `linear-gradient(135deg, ${item.color}15, transparent)`,
          opacity: 0,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Icon Container */}
      <motion.div
        className="relative z-10 mb-6"
        animate={{
          scale: isHovered ? 1.1 : 1,
          rotateY: isHovered ? 10 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="text-5xl md:text-6xl mb-2 inline-block"
          animate={{
            rotateZ: isHovered ? [0, -5, 5, 0] : 0,
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {item.icon}
        </motion.div>

        {/* Icon Glow Effect */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            scale: isHovered ? 2 : 1,
            opacity: isHovered ? 0.1 : 0,
          }}
          transition={{ duration: 0.4 }}
          style={{
            filter: 'blur(20px)',
            color: item.color,
          }}
        >
          {item.icon}
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.h3
        className="text-lg md:text-2xl font-bold mb-4 text-slate-200 relative z-10 whitespace-nowrap"
        animate={{
          color: isHovered ? item.color : '#e2e8f0',
        }}
        transition={{ duration: 0.3 }}
      >
        {item.title}
      </motion.h3>

      <motion.p
        className="text-xs md:text-base text-slate-300/90 leading-relaxed relative z-10 break-keep"
        animate={{
          y: isHovered ? -2 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        {item.desc}
      </motion.p>

      {/* Border Glow Effect */}
      <motion.div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        animate={{
          boxShadow: isHovered
            ? `0 0 30px ${item.color}40, inset 0 1px 0 ${item.color}20`
            : '0 0 0px transparent, inset 0 0 0 transparent'
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
};

export default function Home() {
  const router = useRouter();
  const [gameName, setGameName] = useState('');
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(false);
  
  // 오타 교정 기능 추가
  const { isChecking, correctionResult, checkGameCorrection, clearCorrection } = useGameCorrection();
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  // 통합 피드백 시스템
  const { showFeedback, FeedbackModalComponent, isOpen: isFeedbackOpen } = useUnifiedFeedback();

  // Removed parallax effects to prevent text blurring

  const valueCards = [
    {
      icon: "🚀",
      title: "즉시 시작",
      desc: "복잡한 룰북 없이도 5분 만에 게임 시작하세요",
      color: "#6366f1"
    },
    {
      icon: "💬",
      title: "실시간 도움",
      desc: "게임 중 '이건 뭐지?' 순간에도 바로 해결해드려요",
      color: "#06b6d4"
    },
    {
      icon: "📚",
      title: "완벽한 가이드",
      desc: "핵심 룰부터 흔한 실수까지 친절하게 안내해드려요",
      color: "#f43f5e"
    }
  ];



  // Welcome Modal Logic (Enhanced)
  useEffect(() => {
    const checkWelcomeModalVisibility = () => {
      const timestamp = localStorage.getItem('welcomeModalClosedTimestamp');

      if (!timestamp) {
        // Show modal immediately for better UX
        setIsWelcomeModalOpen(true);
        return;
      }

      const lastClosedTime = new Date(parseInt(timestamp));
      const now = new Date();

      const isSameDay =
        lastClosedTime.getFullYear() === now.getFullYear() &&
        lastClosedTime.getMonth() === now.getMonth() &&
        lastClosedTime.getDate() === now.getDate();

      if (!isSameDay) {
        setIsWelcomeModalOpen(true);
      }
    };

    checkWelcomeModalVisibility();
  }, []);

  const handleCloseWelcomeModal = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('welcomeModalClosedTimestamp', new Date().getTime().toString());
    }
    setIsWelcomeModalOpen(false);
  };

  const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && gameName.trim()) {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!gameName.trim()) return;

    try {
      // 1. 오타 교정 체크
      const result = await checkGameCorrection(gameName.trim());
      
      // 2. 교정이 필요없으면 바로 진행
      if (!result.needsCorrection) {
        router.push(`/rulemaster?game=${encodeURIComponent(gameName.trim())}`);
        return;
      }

      // 3. 자동 교정 가능한 경우 (높은 신뢰도)
      if (result.autoCorrection && result.autoCorrection.confidence >= 0.9) {
        // 매우 높은 신뢰도면 자동 교정하고 바로 진행
        router.push(`/rulemaster?game=${encodeURIComponent(result.autoCorrection.correctedName)}`);
        return;
      }

      // 4. 사용자 확인이 필요한 경우 모달 표시
      if (result.suggestions.length > 0 || result.autoCorrection) {
        setShowCorrectionModal(true);
        return;
      }

      // 5. 매칭 결과가 없으면 원래 입력으로 진행
      router.push(`/rulemaster?game=${encodeURIComponent(gameName.trim())}`);

    } catch (error) {
      console.error('게임 교정 중 오류:', error);
      // 오류 발생 시 원래 입력으로 진행
      router.push(`/rulemaster?game=${encodeURIComponent(gameName.trim())}`);
    }
  };

  const handleSelectCorrectedGame = (correctedGameName: string) => {
    setShowCorrectionModal(false);
    clearCorrection();
    router.push(`/rulemaster?game=${encodeURIComponent(correctedGameName)}`);
  };

  const handleProceedWithOriginal = () => {
    setShowCorrectionModal(false);
    clearCorrection();
    router.push(`/rulemaster?game=${encodeURIComponent(gameName.trim())}`);
  };

  const handleCancelCorrection = () => {
    setShowCorrectionModal(false);
    clearCorrection();
  };



  return (
    <div className="min-h-screen relative overflow-hidden gpu-accelerated">
      {/* Enhanced Background Effects */}
      <BackgroundBlobs />
      <FloatingParticles />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Enhanced Hero Section */}
        <motion.header
          className="text-center mb-16 md:mb-20"
        >
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Main Title with Enhanced Animation */}
            <motion.h1
              className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-bold mb-8"
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <motion.span
                className="block gradient-text-premium drop-shadow-2xl"
                style={{ perspective: 1000 }}
                whileHover={{
                  rotateX: 5,
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
              >
                룰북 대신 RuleBuddy!
              </motion.span>

              {/* Enhanced Subtitle */}
              <motion.span
                className="block text-xl sm:text-2xl md:text-4xl lg:text-5xl text-slate-300 font-medium mt-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                AI에게 물어보면, 게임이 쉬워집니다{' '}
                <motion.span
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="inline-block"
                >
                  🤖
                </motion.span>
              </motion.span>
            </motion.h1>

            {/* Enhanced Input Section */}
            <div className="mb-12">
                          <PremiumInput
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              onKeyPress={handleKeyPress}
              onSubmit={handleSubmit}
              isLoading={isChecking}
            />
            </div>

          </motion.div>


        </motion.header>

        {/* Enhanced Value Cards Grid - Moved outside header to avoid parallax blur */}
        <motion.div
          className="grid grid-cols-3 gap-4 md:gap-8 mb-16 max-w-6xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          {valueCards.map((item, index) => (
            <ValueCard key={index} item={item} index={index} />
          ))}
        </motion.div>


      </div>

      {/* Enhanced Welcome Guide Modal */}
      <AnimatePresence mode="wait">
        {isWelcomeModalOpen && (
          <WelcomeGuideModal
            isOpen={isWelcomeModalOpen}
            onClose={handleCloseWelcomeModal}
          />
        )}
      </AnimatePresence>

      {/* 플로팅 피드백 FAB */}
      <FloatingFeedbackFAB
        onFeedbackClick={() => showFeedback('home')}
        isModalOpen={isFeedbackOpen}
        pageContext="home"
      />

      {/* 통합 피드백 모달 */}
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

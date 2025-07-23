'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Send, X, MessageSquare, Lightbulb, Bug, Zap, Star, Heart } from 'lucide-react';

// 🌊 Enhanced Floating Particles for Modal (웰컴 모달과 동일)
const ModalFloatingParticles = () => {
    const particlesRef = useRef<HTMLDivElement>(null);

    const particleCount = useMemo(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 768 ? 6 : 10;
        }
        return 10;
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
            const size = 2 + Math.random() * 2;
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
            className="absolute inset-0 pointer-events-none overflow-hidden z-0"
        />
    );
};

// 🎯 Premium Interactive Button Component (웰컴 모달과 동일)
const PremiumButton = ({ onClick, children, variant = 'primary', disabled = false, className = '' }: {
    onClick: () => void;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    className?: string;
}) => {
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

    const handleRipple = (e: React.MouseEvent) => {
        if (disabled) return;

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

    const baseClasses = `
        relative px-6 py-3 rounded-2xl transition-all duration-300 
        glass-card-premium hover-premium btn-ripple
        disabled:opacity-40 disabled:cursor-not-allowed
        group/btn overflow-hidden font-medium text-sm
        ${disabled ? '' : 'hover:scale-105'}
        ${className}
    `;

    const variantClasses = variant === 'primary'
        ? 'text-slate-100 bg-gradient-to-r from-primary-500/20 to-primary-600/20 border-primary-400/30'
        : 'text-slate-200 bg-gradient-to-r from-slate-500/10 to-slate-600/10 border-slate-400/20';

    return (
        <motion.button
            onClick={(e) => {
                handleRipple(e);
                onClick();
            }}
            disabled={disabled}
            className={`${baseClasses} ${variantClasses}`}
            whileHover={disabled ? {} : { scale: 1.02 }}
            whileTap={disabled ? {} : { scale: 0.98 }}
        >
            {/* Button Background Effect */}
            <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{
                    background: variant === 'primary'
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))'
                        : 'linear-gradient(135deg, rgba(71, 85, 105, 0.15), rgba(100, 116, 139, 0.15))'
                }}
                transition={{ duration: 0.3 }}
            />

            <span className="relative z-10">{children}</span>

            {/* Ripple Effects */}
            {ripples.map(ripple => (
                <motion.div
                    key={ripple.id}
                    className="absolute rounded-full bg-primary-300/20 pointer-events-none"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        transform: 'translate(-50%, -50%)',
                    }}
                    initial={{ width: 0, height: 0, opacity: 1 }}
                    animate={{ width: 120, height: 120, opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                />
            ))}
        </motion.button>
    );
};

// 피드백 타입 정의
interface QuickFeedbackOption {
  emoji: string;
  label: string;
  category: string;
  description: string;
  color: string;
}

interface SmartCategory {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  suggestions: string[];
}

// 폼 검증 스키마
const unifiedFeedbackSchema = z.object({
    quickFeedback: z.string().optional(),
    category: z.string().optional(),
    content: z.string()
        .min(5, '최소 5자 이상 입력해주세요')
        .max(1000, '최대 1000자까지 입력 가능합니다')
        .optional(),
    rating: z.number().min(1).max(5).optional()
});

type UnifiedFeedbackFormData = z.infer<typeof unifiedFeedbackSchema>;

interface UnifiedFeedbackModalProps {
    /** 모달 열림/닫힘 상태 */
    isOpen: boolean;
    /** 모달 닫기 함수 */
    onClose: () => void;
    /** 현재 페이지 컨텍스트 */
    pageContext?: 'home' | 'rulemaster' | 'game_selection';
    /** 현재 게임 정보 (선택사항) */
    gameContext?: {
        gameName?: string;
        gameId?: string;
    };
    /** 자동 감지된 상황 정보 */
    detectedContext?: {
        hasSearchResults?: boolean;
        lastAnswerLength?: number;
        sessionDuration?: number;
        errorOccurred?: boolean;
    };
}

// 퀵 피드백 옵션들
const QUICK_FEEDBACK_OPTIONS: QuickFeedbackOption[] = [
    { emoji: '😊', label: '좋아요', category: 'positive', description: '잘 작동해요!', color: 'text-green-500' },
    { emoji: '😐', label: '보통이에요', category: 'neutral', description: '나쁘지 않아요', color: 'text-yellow-500' },
    { emoji: '😞', label: '별로예요', category: 'negative', description: '개선이 필요해요', color: 'text-red-500' },
    { emoji: '🐛', label: '버그 발견', category: 'bug', description: '문제가 있어요', color: 'text-orange-500' },
    { emoji: '💡', label: '아이디어', category: 'feature', description: '이런 기능은 어떨까요?', color: 'text-blue-500' },
    { emoji: '⚡', label: '느려요', category: 'performance', description: '더 빠르게 해주세요', color: 'text-purple-500' }
];

// 스마트 카테고리 (페이지별 자동 감지)
const getSmartCategories = (pageContext: string, detectedContext: any): SmartCategory[] => {
    const base: SmartCategory[] = [
        {
            id: 'general',
            title: '일반 피드백',
            description: '전반적인 서비스에 대한 의견',
            icon: MessageSquare,
            color: 'bg-blue-500/20 text-blue-300',
            suggestions: ['전체적으로 만족해요', '사용하기 편해요', '디자인이 예뻐요']
        },
        {
            id: 'feature',
            title: '기능 개선',
            description: '새로운 기능이나 개선사항 제안',
            icon: Lightbulb,
            color: 'bg-yellow-500/20 text-yellow-300',
            suggestions: ['이런 기능이 있으면 좋겠어요', '더 편리하게 만들어주세요', '다른 게임도 추가해주세요']
        },
        {
            id: 'bug',
            title: '문제 신고',
            description: '버그나 오류 상황 신고',
            icon: Bug,
            color: 'bg-red-500/20 text-red-300',
            suggestions: ['버튼이 작동하지 않아요', '화면이 깨져요', '에러가 발생했어요']
        }
    ];

    // 페이지별 특화 카테고리 추가
    if (pageContext === 'rulemaster') {
        if (detectedContext?.hasSearchResults === false) {
            base.unshift({
                id: 'game_not_found',
                title: '게임을 찾을 수 없음',
                description: '찾으시는 게임이 목록에 없나요?',
                icon: Star,
                color: 'bg-green-500/20 text-green-300',
                suggestions: ['이 게임을 추가해주세요', '게임 이름을 정확히 알려드릴게요', '비슷한 게임을 추천해주세요']
            });
        }
        
        if (detectedContext?.lastAnswerLength && detectedContext.lastAnswerLength < 100) {
            base.unshift({
                id: 'answer_quality',
                title: '답변 품질 개선',
                description: '더 자세한 답변이 필요하신가요?',
                icon: Zap,
                color: 'bg-purple-500/20 text-purple-300',
                suggestions: ['더 자세히 설명해주세요', '예시를 들어주세요', '이해하기 어려워요']
            });
        }
    }

    return base;
};

export default function UnifiedFeedbackModal({
    isOpen,
    onClose,
    pageContext = 'home',
    gameContext,
    detectedContext = {}
}: UnifiedFeedbackModalProps) {
    const [step, setStep] = useState<'quick' | 'detailed'>('quick');
    const [selectedQuickFeedback, setSelectedQuickFeedback] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    const { toast } = useToast();

    const smartCategories = getSmartCategories(pageContext, detectedContext);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
        setValue
    } = useForm<UnifiedFeedbackFormData>({
        resolver: zodResolver(unifiedFeedbackSchema)
    });

    const contentValue = watch('content', '');
    const contentLength = contentValue?.length || 0;

    // 퀵 피드백 선택 처리
    const handleQuickFeedbackSelect = (option: QuickFeedbackOption) => {
        setSelectedQuickFeedback(option.emoji);
        setValue('quickFeedback', option.emoji);
        setValue('category', option.category);
        
        // 긍정적 피드백이면 바로 제출, 부정적이면 상세 입력으로
        if (option.category === 'positive') {
            setValue('content', option.description);
            handleQuickSubmit(option);
        } else {
            setSelectedCategory(option.category);
            setStep('detailed');
        }
    };

    // 퀵 제출 (긍정적 피드백)
    const handleQuickSubmit = async (option: QuickFeedbackOption) => {
        setIsSubmitting(true);
        try {
            await submitFeedback({
                quickFeedback: option.emoji,
                category: option.category,
                content: option.description
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // 상세 피드백 제출
    const onSubmit = async (data: UnifiedFeedbackFormData) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        
        try {
            await submitFeedback({
                ...data,
                quickFeedback: selectedQuickFeedback,
                category: selectedCategory
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // 감사 오버레이 표시 함수
    const showThankYouOverlay = () => {
        setShowThankYou(true);
        setTimeout(() => {
            setShowThankYou(false);
        }, 3000); // 3초 후 자동 숨김
    };

    // 실제 제출 로직
    const submitFeedback = async (data: UnifiedFeedbackFormData) => {
        try {
            const response = await fetch('/api/feedback/mvp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    feedback_source: `unified_${pageContext}`,
                    content: data.content || data.quickFeedback || '퀵 피드백',
                    context: {
                        pageContext,
                        quickFeedback: data.quickFeedback,
                        category: data.category,
                        gameContext,
                        detectedContext,
                        timestamp: new Date().toISOString()
                    }
                }),
            });

            const result = await response.json();

            if (result.success) {
                // 감사 오버레이 표시
                showThankYouOverlay();
                
                toast({
                    title: "정말 감사해요! 💖",
                    description: "소중한 시간을 내어 피드백을 남겨주셔서 진심으로 감사드립니다. 더 나은 서비스로 보답하겠습니다!",
                    style: {
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                        border: '2px solid #fbbf24',
                        color: '#92400e',
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 25px rgba(251, 191, 36, 0.2)',
                    },
                });

                handleClose();
            } else {
                throw new Error(result.error?.message || '피드백 제출에 실패했습니다.');
            }
        } catch (error) {
            console.error('❌ 피드백 제출 오류:', error);
            toast({
                title: "전송 실패",
                description: "피드백 전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                variant: "destructive",
            });
        }
    };

    // 모달 닫기 처리
    const handleClose = () => {
        if (!isSubmitting) {
            setStep('quick');
            setSelectedQuickFeedback('');
            setSelectedCategory('');
            reset();
            onClose();
        }
    };

    // 이전 단계로
    const handleGoBack = () => {
        if (step === 'detailed') {
            setStep('quick');
            setSelectedQuickFeedback('');
            setSelectedCategory('');
        }
    };

    return (
        <>
            {/* 감사 오버레이 */}
            <AnimatePresence>
                {showThankYou && (
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <motion.div
                            className="relative"
                            initial={{ scale: 0.5, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: -20 }}
                            transition={{ 
                                type: "spring", 
                                stiffness: 300, 
                                damping: 20,
                                duration: 0.6
                            }}
                        >
                            {/* 배경 글로우 */}
                            <motion.div
                                className="absolute inset-0 rounded-3xl"
                                style={{
                                    background: 'radial-gradient(circle, rgba(245, 158, 11, 0.3), transparent 70%)',
                                    filter: 'blur(40px)',
                                    transform: 'scale(1.5)',
                                }}
                                animate={{
                                    scale: [1.5, 2, 1.5],
                                    opacity: [0.3, 0.5, 0.3],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            />

                            {/* 메인 감사 카드 */}
                            <div 
                                className="border border-amber-400/50 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl"
                                style={{
                                    background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                                    backdropFilter: 'none',
                                    WebkitBackdropFilter: 'none',
                                }}
                            >
                                {/* 파티클 효과 */}
                                {[...Array(8)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute w-2 h-2 rounded-full bg-amber-600"
                                        style={{
                                            left: `${20 + i * 10}%`,
                                            top: `${30 + (i % 2) * 40}%`,
                                        }}
                                        animate={{
                                            y: [-20, -40, -20],
                                            opacity: [0, 1, 0],
                                            scale: [0, 1, 0],
                                        }}
                                        transition={{
                                            duration: 2,
                                            delay: i * 0.2,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                        }}
                                    />
                                ))}

                                {/* 하트 아이콘 */}
                                <motion.div
                                    className="text-6xl mb-4"
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 10, -10, 0],
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                >
                                    💖
                                </motion.div>

                                {/* 감사 메시지 */}
                                <motion.h3
                                    className="text-2xl font-bold text-amber-900 mb-2"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.6 }}
                                >
                                    정말 감사해요!
                                </motion.h3>
                                
                                <motion.p
                                    className="text-amber-800 leading-relaxed max-w-sm"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.6 }}
                                >
                                    소중한 피드백 덕분에 더 나은 서비스를 만들어갈 수 있습니다 ✨
                                </motion.p>

                                {/* 하단 장식 */}
                                <motion.div
                                    className="flex justify-center gap-2 mt-4"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.7, duration: 0.6 }}
                                >
                                    {['🌟', '✨', '💫'].map((emoji, i) => (
                                        <motion.span
                                            key={i}
                                            className="text-lg"
                                            animate={{
                                                scale: [1, 1.3, 1],
                                                rotate: [0, 15, -15, 0],
                                            }}
                                            transition={{
                                                duration: 1,
                                                delay: 0.8 + i * 0.2,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                            }}
                                        >
                                            {emoji}
                                        </motion.span>
                                    ))}
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 메인 피드백 모달 */}
            <AnimatePresence mode="wait">
                {isOpen && (
                <Dialog open={isOpen} onOpenChange={handleClose}>
                    <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-hidden border-0 p-0 bg-transparent shadow-none">
                        <motion.div
                            className="relative rounded-3xl p-4 md:p-6 overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 60px rgba(99, 102, 241, 0.2)',
                            }}
                            initial={{ opacity: 0, scale: 0.9, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 50 }}
                            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                        >
                            {/* Floating Particles */}
                            <ModalFloatingParticles />

                            {/* Background Glow Effects */}
                            <motion.div
                                className="absolute -top-20 -left-20 w-40 h-40 rounded-full opacity-15"
                                style={{
                                    background: 'radial-gradient(circle, #ec4899, transparent 70%)',
                                }}
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.15, 0.25, 0.15],
                                }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            />

                            <motion.div
                                className="absolute -bottom-20 -right-20 w-32 h-32 rounded-full opacity-10"
                                style={{
                                    background: 'radial-gradient(circle, #6366f1, transparent 70%)',
                                }}
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.1, 0.2, 0.1],
                                }}
                                transition={{
                                    duration: 5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: 2,
                                }}
                            />

                            <DialogHeader className="relative z-10">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2, duration: 0.6 }}
                                >
                                    <DialogTitle className="text-center mb-4">
                                        <motion.div
                                            className="flex items-center justify-center gap-3 mb-2"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.3, duration: 0.8 }}
                                        >
                                            <motion.div
                                                animate={{ 
                                                    rotate: step === 'detailed' ? 180 : 0,
                                                    scale: [1, 1.1, 1]
                                                }}
                                                transition={{ 
                                                    rotate: { duration: 0.3 },
                                                    scale: { duration: 2, repeat: Infinity }
                                                }}
                                            >
                                                <Heart className="w-6 h-6 text-pink-400" />
                                            </motion.div>
                                            <span className="text-xl md:text-2xl font-bold gradient-text-premium">
                                                {step === 'quick' ? '어떠셨나요?' : '자세히 알려주세요'}
                                            </span>
                                        </motion.div>
                                    </DialogTitle>
                                    <DialogDescription asChild>
                                        <motion.div
                                            className="text-center"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.6, duration: 0.6 }}
                                        >
                                            <p className="text-sm md:text-base text-slate-300/90 leading-relaxed">
                                                {step === 'quick' 
                                                    ? '간단한 터치로 피드백을 보내보세요' 
                                                    : '구체적인 상황을 알려주시면 더 빠르게 개선할 수 있어요'}
                                            </p>
                                        </motion.div>
                                    </DialogDescription>
                                </motion.div>
                            </DialogHeader>

                <AnimatePresence mode="wait">
                    {step === 'quick' ? (
                        <motion.div
                            key="quick"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4 mt-8"
                        >
                            {/* 퀵 피드백 버튼들 */}
                            <div className="grid grid-cols-2 gap-3 relative z-10">
                                {QUICK_FEEDBACK_OPTIONS.map((option, index) => (
                                    <motion.button
                                        key={option.emoji}
                                        type="button"
                                        onClick={() => handleQuickFeedbackSelect(option)}
                                        disabled={isSubmitting}
                                        className="p-3 rounded-2xl glass-card-premium hover-premium transition-all duration-300 active:scale-95 group"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                        }}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.8 + index * 0.1 }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <motion.div 
                                            className="text-xl mb-2"
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ 
                                                duration: 2, 
                                                repeat: Infinity,
                                                delay: index * 0.2
                                            }}
                                        >
                                            {option.emoji}
                                        </motion.div>
                                        <div className={`text-sm font-medium ${option.color} group-hover:text-slate-200 transition-colors`}>
                                            {option.label}
                                        </div>
                                        <div className="text-xs text-slate-400/80 mt-1 group-hover:text-slate-300/90 transition-colors">
                                            {option.description}
                                        </div>
                                    </motion.button>
                                ))}
                            </div>

                            {/* 상세 입력 버튼 */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                <PremiumButton
                                    onClick={() => setStep('detailed')}
                                    variant="secondary"
                                    className="w-full"
                                >
                                    ✍️ 자세히 적어서 보내기
                                </PremiumButton>
                            </motion.div>

                            {/* 스마트 카테고리 (상황별 자동 감지) */}
                            {smartCategories.length > 3 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.2 }}
                                    className="mt-6 p-4 rounded-2xl relative z-10"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                >
                                    <div className="text-sm font-medium mb-3 text-slate-200 flex items-center gap-2">
                                        <span className="text-lg">💡</span>
                                        이런 문제인가요?
                                    </div>
                                    <div className="space-y-3">
                                        {smartCategories.slice(0, 2).map((category, index) => (
                                            <motion.button
                                                key={category.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCategory(category.id);
                                                    setStep('detailed');
                                                }}
                                                className={`w-full text-left p-3 rounded-xl ${category.color} hover:opacity-80 transition-all duration-200 hover:scale-[1.02]`}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 1.4 + index * 0.1 }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <category.icon className="w-5 h-5" />
                                                    <span className="font-medium">{category.title}</span>
                                                </div>
                                                <div className="text-xs opacity-80 mt-2 ml-8">
                                                    {category.description}
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="detailed"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                {/* 선택된 퀵 피드백 표시 */}
                                {selectedQuickFeedback && (
                                    <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
                                        <span className="text-lg">{selectedQuickFeedback}</span>
                                        <span className="text-sm text-muted-foreground">
                                            선택하신 피드백
                                        </span>
                                    </div>
                                )}

                                {/* 텍스트 입력 */}
                                <div className="space-y-2">
                                    <Label htmlFor="feedback-content" className="text-sm font-medium">
                                        구체적으로 알려주세요 *
                                    </Label>
                                    <div className="relative">
                                        <Textarea
                                            id="feedback-content"
                                            {...register('content')}
                                            placeholder="어떤 부분이 문제였나요? 또는 어떤 기능이 개선되었으면 좋겠나요?"
                                            className="min-h-[120px] resize-none pr-16"
                                            disabled={isSubmitting}
                                        />
                                        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                            {contentLength}/1000
                                        </div>
                                    </div>
                                    {errors.content && (
                                        <p className="text-sm text-destructive">{errors.content.message}</p>
                                    )}
                                </div>

                                {/* 제출 버튼 */}
                                <motion.div 
                                    className="flex gap-3 pt-4"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8, duration: 0.6 }}
                                >
                                    <PremiumButton
                                        onClick={handleGoBack}
                                        disabled={isSubmitting}
                                        variant="secondary"
                                        className="flex-1"
                                    >
                                        ← 이전
                                    </PremiumButton>
                                    <PremiumButton
                                        onClick={handleSubmit(onSubmit)}
                                        disabled={isSubmitting || contentLength < 5}
                                        variant="primary"
                                        className="flex-1"
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                전송 중...
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Send className="w-4 h-4" />
                                                피드백 제출 ✨
                                            </div>
                                        )}
                                    </PremiumButton>
                                </motion.div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                            <motion.div 
                                className="text-xs text-slate-400/80 border-t border-slate-400/20 pt-4 mt-6 text-center relative z-10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.0, duration: 0.6 }}
                            >
                                💡 <strong className="text-slate-300">팁:</strong> 빠른 피드백은 앱 개선에 큰 도움이 됩니다!
                            </motion.div>
                        </motion.div>
                    </DialogContent>
                </Dialog>
            )}
        </AnimatePresence>
        </>
    );
}

/**
 * 통합 피드백 시스템을 쉽게 사용할 수 있는 훅
 */
export function useUnifiedFeedback() {
    const [isOpen, setIsOpen] = useState(false);
    const [pageContext, setPageContext] = useState<'home' | 'rulemaster' | 'game_selection'>('home');
    const [gameContext, setGameContext] = useState<any>(null);
    const [detectedContext, setDetectedContext] = useState<any>({});

    const showFeedback = (
        context: 'home' | 'rulemaster' | 'game_selection' = 'home',
        game?: any,
        detected?: any
    ) => {
        setPageContext(context);
        setGameContext(game);
        setDetectedContext(detected || {});
        setIsOpen(true);
    };

    const hideFeedback = () => {
        setIsOpen(false);
    };

    const FeedbackModalComponent = (
        <UnifiedFeedbackModal
            isOpen={isOpen}
            onClose={hideFeedback}
            pageContext={pageContext}
            gameContext={gameContext}
            detectedContext={detectedContext}
        />
    );

    return {
        showFeedback,
        hideFeedback,
        FeedbackModalComponent,
        isOpen
    };
} 
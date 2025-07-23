'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface WelcomeGuideModalProps {
    isOpen: boolean;
    onClose: (dontShowAgain: boolean) => void;
}

// 🌊 Enhanced Floating Particles for Modal
const ModalFloatingParticles = () => {
    const particlesRef = useRef<HTMLDivElement>(null);

    const particleCount = useMemo(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 768 ? 8 : 12;
        }
        return 12;
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
            className="absolute inset-0 pointer-events-none overflow-hidden z-0"
        />
    );
};

// 🎨 Premium Feature Card Component
const FeatureCard = ({ item, index }: {
    item: { icon: string; title: string; desc: string; color: string };
    index: number;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-20px" });
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            ref={ref}
            className="glass-card-premium rounded-2xl p-6 text-center group cursor-pointer relative overflow-hidden"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={isInView ? {
                opacity: 1,
                y: 0,
                scale: 1
            } : {
                opacity: 0,
                y: 30,
                scale: 0.9
            }}
            transition={{
                delay: 0.3 + index * 0.1,
                duration: 0.6,
                ease: [0.23, 1, 0.32, 1]
            }}
            whileHover={{
                y: -4,
                scale: 1.02,
                transition: { duration: 0.2 }
            }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
        >
            {/* Background Gradient Effect */}
            <motion.div
                className="absolute inset-0 rounded-2xl"
                style={{
                    background: `linear-gradient(135deg, ${item.color}15, transparent)`,
                    opacity: 0,
                }}
                animate={{
                    opacity: isHovered ? 1 : 0,
                }}
                transition={{ duration: 0.3 }}
            />

            {/* Icon Container */}
            <motion.div
                className="relative z-10 mb-4"
                animate={{
                    scale: isHovered ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
            >
                <motion.div
                    className="text-3xl mb-2 inline-block"
                    animate={{
                        rotateZ: isHovered ? [0, -5, 5, 0] : 0,
                    }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                >
                    {item.icon}
                </motion.div>
            </motion.div>

            {/* Content */}
            <motion.h4
                className="text-lg font-bold mb-3 text-slate-200 relative z-10"
                animate={{
                    color: isHovered ? item.color : '#e2e8f0',
                }}
                transition={{ duration: 0.3 }}
            >
                {item.title}
            </motion.h4>

            <motion.p
                className="text-sm text-slate-300/90 leading-relaxed relative z-10"
                animate={{
                    y: isHovered ? -2 : 0,
                }}
                transition={{ duration: 0.3 }}
            >
                {item.desc}
            </motion.p>

            {/* Border Glow Effect */}
            <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                animate={{
                    boxShadow: isHovered
                        ? `0 0 20px ${item.color}40, inset 0 1px 0 ${item.color}20`
                        : '0 0 0px transparent, inset 0 0 0 transparent'
                }}
                transition={{ duration: 0.3 }}
            />
        </motion.div>
    );
};

// 🎯 Premium Interactive Button Component
const PremiumButton = ({ onClick, children, variant = 'primary', disabled = false }: {
    onClick: () => void;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
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
        relative px-8 py-4 rounded-2xl transition-all duration-300 
        glass-card-premium hover-premium btn-ripple
        disabled:opacity-40 disabled:cursor-not-allowed
        group/btn overflow-hidden font-medium text-base
        ${disabled ? '' : 'hover:scale-105'}
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
            whileHover={disabled ? {} : { scale: 1.05 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
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

export default function WelcomeGuideModal({ isOpen, onClose }: WelcomeGuideModalProps) {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleClose = () => {
        onClose(dontShowAgain);
    };



    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
                    <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-hidden border-0 p-0 bg-transparent shadow-none">
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

                            {/* Background Glow Effects - No blur to prevent text issues */}
                            <motion.div
                                className="absolute -top-20 -left-20 w-40 h-40 rounded-full opacity-15"
                                style={{
                                    background: 'radial-gradient(circle, #6366f1, transparent 70%)',
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
                                    background: 'radial-gradient(circle, #06b6d4, transparent 70%)',
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
                                        <motion.span
                                            className="block text-2xl md:text-3xl font-bold gradient-text-premium drop-shadow-2xl"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.3, duration: 0.8 }}
                                        >
                                            룰마스터 AI에 오신 것을 환영합니다!
                                        </motion.span>
                                        <motion.div
                                            className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-full"
                                            style={{
                                                background: 'rgba(99, 102, 241, 0.1)',
                                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                            }}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.5, duration: 0.6 }}
                                        >
                                            <span className="text-sm font-medium text-primary-300">Beta</span>
                                            <motion.span
                                                animate={{ rotate: [0, 360] }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                className="text-lg"
                                            >
                                                ⚡
                                            </motion.span>
                                        </motion.div>
                                    </DialogTitle>
                                    <DialogDescription asChild>
                                        <motion.div
                                            className="text-center"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.6, duration: 0.6 }}
                                        >
                                            <p className="text-base md:text-lg text-slate-300/90 leading-relaxed">
                                                보드게임 규칙이 궁금할 때, AI에게 바로 물어보세요.
                                            </p>
                                        </motion.div>
                                    </DialogDescription>
                                </motion.div>
                            </DialogHeader>

                            <motion.div
                                className="space-y-4 py-4 relative z-10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8, duration: 0.6 }}
                            >
                                {/* Usage Guide */}
                                <motion.div
                                    className="space-y-4"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.2, duration: 0.6 }}
                                >
                                    <div className="rounded-2xl p-4" style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                    }}>
                                        <h3 className="text-lg font-bold flex items-center gap-2 mb-3 text-slate-200">
                                            <span className="text-xl">🚀</span>
                                            사용법 안내
                                        </h3>
                                        <ol className="space-y-2 text-sm text-slate-300/90">
                                            <motion.li
                                                className="flex gap-2 items-start"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 1.4, duration: 0.5 }}
                                            >
                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500/20 border border-primary-400/30 flex items-center justify-center text-xs font-bold text-primary-300">
                                                    1
                                                </span>
                                                <span>
                                                    <strong className="text-slate-200">게임 이름</strong>을 입력하세요
                                                </span>
                                            </motion.li>
                                            <motion.li
                                                className="flex gap-2 items-start"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 1.6, duration: 0.5 }}
                                            >
                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500/20 border border-primary-400/30 flex items-center justify-center text-xs font-bold text-primary-300">
                                                    2
                                                </span>
                                                <span>
                                                    게임 선택 후 <strong className="text-slate-200">자유롭게 질문</strong>하세요
                                                </span>
                                            </motion.li>
                                        </ol>
                                    </div>

                                    <div className="rounded-2xl p-4" style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                    }}>
                                        <h3 className="text-lg font-bold flex items-center gap-2 mb-3 text-slate-200">
                                            <span className="text-xl">🧠</span>
                                            AI 지식 수준
                                        </h3>
                                        <ul className="space-y-2 text-sm text-slate-300/90">
                                            <motion.li
                                                className="flex gap-2 items-start"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 1.8, duration: 0.5 }}
                                            >
                                                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 mt-1.5"></span>
                                                <span>
                                                    <strong className="text-slate-200">2023년까지 게임</strong> 자신있게 답변
                                                </span>
                                            </motion.li>
                                            <motion.li
                                                className="flex gap-2 items-start"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 2.0, duration: 0.5 }}
                                            >
                                                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-400 mt-1.5"></span>
                                                <span>
                                                    <strong className="text-slate-200">2024년 이후 게임</strong> 학습 중 (정확도 낮음)
                                                </span>
                                            </motion.li>
                                            <motion.li
                                                className="flex gap-2 items-start"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 2.2, duration: 0.5 }}
                                            >
                                                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-400 mt-1.5"></span>
                                                <span>
                                                    피드백으로 계속 발전합니다!
                                                </span>
                                            </motion.li>
                                        </ul>
                                    </div>
                                </motion.div>
                            </motion.div>

                            <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2 relative z-10 mt-3 sm:justify-between">
                                <motion.div
                                    className="flex items-center space-x-3"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 2.4, duration: 0.6 }}
                                >
                                    <Checkbox
                                        id="dont-show-again"
                                        checked={dontShowAgain}
                                        onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
                                        className="data-[state=checked]:bg-primary-500 data-[state=checked]:border-primary-400 border-2 border-slate-400/30 h-5 w-5"
                                    />
                                    <label
                                        htmlFor="dont-show-again"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-300/90 hover:text-slate-200 transition-colors"
                                    >
                                        오늘 하루 그만보기
                                    </label>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 2.6, duration: 0.6 }}
                                >
                                    <PremiumButton onClick={handleClose}>
                                        확인하고 시작하기 ✨
                                    </PremiumButton>
                                </motion.div>
                            </DialogFooter>
                        </motion.div>
                    </DialogContent>
                </Dialog>
            )}
        </AnimatePresence>
    );
} 
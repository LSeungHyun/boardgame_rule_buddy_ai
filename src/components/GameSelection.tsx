'use client';

import React, { useState } from 'react';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { GameCardSkeleton } from '@/components/ui/skeleton';
import { GameSelectionProps } from '@/types/game';
import { motion, AnimatePresence } from 'framer-motion';

import { BetaBanner, UserGuideSection } from '@/components/ui/beta-banner';

export default function GameSelection({
    search,
    ui,
    data
}: GameSelectionProps) {
    const { term: searchTerm, setTerm: setSearchTerm } = search;
    const { isLoading } = ui;
    const { games, onSelectGame } = data;

    const clearAllFilters = () => {
        setSearchTerm('');
    };

    const getDifficultyColor = (difficulty: string) => {
        const colors = {
            'Very Easy': 'bg-emerald-500 border-emerald-300 shadow-emerald-500/20',
            'Easy': 'bg-blue-500 border-blue-300 shadow-blue-500/20',
            'Normal': 'bg-amber-500 border-amber-300 shadow-amber-500/20',
            'Semi-Hard': 'bg-orange-500 border-orange-300 shadow-orange-500/20',
            'Hard': 'bg-red-500 border-red-300 shadow-red-500/20',
            'Extreme': 'bg-purple-600 border-purple-400 shadow-purple-500/20'
        };
        return colors[difficulty as keyof typeof colors] || 'bg-gray-500 border-gray-300 shadow-gray-500/20';
    };

    // 검색어가 있는지 확인
    const hasSearchCriteria = searchTerm.trim();

    // 로딩 스켈레톤 컴포넌트
    const LoadingSkeleton = () => (
        <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
                <GameCardSkeleton key={index} />
            ))}
        </div>
    );

    return (
        <ResponsiveContainer maxWidth="xl" padding="md" className="min-h-screen">
            {/* 베타 서비스 배너 */}
            <BetaBanner />

            {/* 개선된 Hero 섹션 */}
            <motion.header 
                className="text-center mb-8 md:mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                <motion.div
                    className="mb-6"
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4">
                        <motion.span 
                            className="block bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent drop-shadow-lg"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                        >
                            룰마스터 AI
                        </motion.span>
                        <motion.span 
                            className="block text-xl sm:text-2xl md:text-3xl bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-lg font-medium mt-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.8 }}
                        >
                            룰북 대신, AI에게 물어보세요 🤖
                        </motion.span>
                    </h1>
                    
                    <motion.p 
                        className="text-lg sm:text-xl text-slate-200 mb-2 font-medium drop-shadow"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                    >
                        365개 게임 • 초성 검색 • 즉시 답변
                    </motion.p>
                </motion.div>

                {/* 핵심 가치 카드 - 모바일 최적화 */}
                <motion.div 
                    className="hidden md:grid md:grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.6 }}
                >
                    {[
                        { icon: "🚀", title: "즉시 시작", desc: "복잡한 룰북 없이도 5분 만에 게임 시작" },
                        { icon: "💬", title: "실시간 도움", desc: "게임 중 '이건 뭐지?' 순간에도 바로 해결" },
                        { icon: "📚", title: "완벽한 가이드", desc: "핵심 룰부터 흔한 실수까지 친절하게 안내" }
                    ].map((value, index) => (
                        <motion.div
                            key={index}
                            className="glass-card rounded-xl p-6 text-center group hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.2 + index * 0.1, duration: 0.5 }}
                            whileHover={{ y: -5 }}
                        >
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
                                {value.icon}
                            </div>
                            <h3 className="text-lg font-bold text-amber-100 mb-2 group-hover:text-yellow-300 transition-colors">
                                {value.title}
                            </h3>
                            <p className="text-sm text-amber-200/80 group-hover:text-amber-200 transition-colors">
                                {value.desc}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.header>

            {/* 핵심 기능: 게임 검색 - 최상단 배치 */}
            <motion.div 
                className="mb-8 md:mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
            >
                {/* 심플한 검색바 */}
                <div className="mb-6 relative group max-w-2xl mx-auto">
                    <input
                        type="text"
placeholder="게임 이름을 입력하세요 (예: 루미큐브, ㄹㅁㅋ)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-4 md:p-5 text-lg md:text-xl rounded-2xl shadow-lg
                                 bg-slate-100/95 backdrop-blur-sm border-2 border-transparent
                                 focus:border-blue-400 focus:ring-0 focus:outline-none
                                 placeholder:text-slate-500/70 text-slate-800
                                 transition-all duration-300 ease-out
                                 hover:shadow-xl hover:bg-slate-50 min-h-[56px]"
                        autoFocus
                    />
                                         {/* 검색 아이콘 */}
                     <div className="absolute right-4 md:right-5 top-1/2 transform -translate-y-1/2">
                         <div className="text-slate-400 text-xl">
                             🔍
                         </div>
                     </div>
                </div>

                {/* 필터 상태 표시 */}
                <AnimatePresence>
                    {hasSearchCriteria && (
                        <motion.div 
                            className="flex flex-wrap items-center gap-2 mb-4"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {searchTerm && (
                                <motion.div 
                                    className="glass-card border border-amber-400/40 text-amber-200 px-4 py-2 rounded-full text-sm flex items-center gap-2 min-h-[44px]
                                             hover:border-amber-400/60 hover:bg-amber-500/10 transition-all duration-200"
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="text-amber-400">🔍</span>
                                        검색: "{searchTerm}"
                                    </span>
                                    <motion.button
                                        onClick={() => setSearchTerm('')}
                                        className="hover:text-yellow-300 transition-colors text-lg leading-none min-w-[24px] min-h-[24px] flex items-center justify-center
                                                 hover:bg-amber-500/20 rounded-full"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        ×
                                    </motion.button>
                                </motion.div>
                            )}
                            

                            
                            <motion.button
                                onClick={clearAllFilters}
                                className="text-amber-300/80 hover:text-amber-200 text-sm underline transition-colors min-h-[44px] px-2
                                         hover:bg-amber-500/10 rounded-lg"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                모든 필터 지우기
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>



            {/* 결과 섹션 */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6, duration: 0.6 }}
            >
                {!hasSearchCriteria ? (
                    <motion.div 
                        className="text-center py-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="glass-card rounded-2xl p-8 max-w-md mx-auto hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10">
                            <motion.div 
                                className="text-6xl mb-4"
                                animate={{ 
                                    rotate: [0, 5, -5, 0],
                                    scale: [1, 1.05, 1]
                                }}
                                transition={{ 
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            >
                                🎲
                            </motion.div>
                            <h3 className="text-xl font-semibold text-amber-100 mb-2">게임을 검색해보세요</h3>
                            <p className="text-amber-200/80">
                                위의 검색창에 게임 이름을 입력해서<br />
                                시작하세요!
                            </p>
                        </div>
                    </motion.div>
                ) : isLoading ? (
                    <LoadingSkeleton />
                ) : games.length > 0 ? (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {games.map((game, index) => (
                                <motion.div
                                    key={game.id}
                                    className="game-card rounded-xl p-4 cursor-pointer group min-h-[80px] flex items-center
                                             hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/10 
                                             transition-all duration-300 ease-out
                                             border border-transparent hover:border-amber-400/30"
                                    onClick={() => {
                                        onSelectGame(game);
                                    }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ 
                                        delay: index * 0.05, 
                                        duration: 0.4,
                                        ease: "easeOut"
                                    }}
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                                        <div className="flex-1">
                                            <h3 className="text-base sm:text-lg font-bold text-amber-100 group-hover:text-yellow-300 transition-colors drop-shadow mb-1">
                                                {game.title}
                                            </h3>
                                            <p className="text-amber-200/80 text-sm group-hover:text-amber-200 transition-colors">
                                                {game.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <motion.span
                                                className={`${getDifficultyColor(game.difficulty)} text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg border min-h-[28px] flex items-center
                                                          group-hover:shadow-md transition-all duration-200`}
                                                whileHover={{ scale: 1.05 }}
                                            >
                                                {game.difficulty}
                                            </motion.span>
                                            <div className="text-amber-300/80 text-sm whitespace-nowrap hidden sm:block">
                                                보드게임
                                            </div>
                                            <motion.div 
                                                className="text-yellow-400 group-hover:text-yellow-300 transition-colors text-xl"
                                                animate={{ 
                                                    rotate: [0, 10, -10, 0]
                                                }}
                                                transition={{ 
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                            >
                                                ⚡
                                            </motion.div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <motion.div 
                        className="text-center py-12"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="glass-card rounded-2xl p-8 max-w-md mx-auto hover:scale-105 transition-all duration-300">
                            <motion.div 
                                className="text-5xl mb-4"
                                animate={{ 
                                    scale: [1, 1.1, 1],
                                    rotate: [0, -10, 10, 0]
                                }}
                                transition={{ 
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            >
                                😔
                            </motion.div>
                            <h3 className="text-xl font-semibold text-amber-100 mb-2">검색 결과가 없습니다</h3>
                            <p className="text-amber-200/80 mb-4">
                                다른 검색어나 카테고리로 시도해보세요
                            </p>
                            <motion.button
                                onClick={clearAllFilters}
                                className="btn-game-primary px-6 py-3 rounded-lg transition-all duration-200 font-medium
                                         hover:shadow-lg hover:shadow-amber-500/25"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                검색 조건 초기화
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* 사용자 가이드 섹션 - 최하단 배치 */}
            {!hasSearchCriteria && (
                <UserGuideSection />
            )}
        </ResponsiveContainer>
    );
} 
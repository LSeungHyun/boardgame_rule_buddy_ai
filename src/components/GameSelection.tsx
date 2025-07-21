'use client';

import React from 'react';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { GameCardSkeleton } from '@/components/ui/skeleton';
import { GameSelectionProps } from '@/types/game';

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
            'Very Easy': 'bg-emerald-600 border-emerald-400',
            'Easy': 'bg-blue-600 border-blue-400',
            'Normal': 'bg-amber-600 border-amber-400',
            'Semi-Hard': 'bg-orange-600 border-orange-400',
            'Hard': 'bg-red-600 border-red-400',
            'Extreme': 'bg-purple-700 border-purple-500'
        };
        return colors[difficulty as keyof typeof colors] || 'bg-gray-600 border-gray-400';
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
            <header className="text-center mb-8 md:mb-12">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-600 bg-clip-text text-transparent mb-4 animate-pulse drop-shadow-lg">
                    🎲 AI 보드게임 룰 마스터 🎯
                </h1>
                <p className="text-lg sm:text-xl text-amber-100 mb-2 font-medium drop-shadow">365개 게임 중에서 원하는 게임을 검색하세요</p>
                <p className="text-sm sm:text-base text-amber-200/80 drop-shadow">초성 검색 지원 (예: "ㄹㅁㅋㅂ" → 루미큐브)</p>
            </header>

            {/* 검색 섹션 */}
            <div className="mb-6 md:mb-8">
                {/* 검색바 */}
                <div className="mb-4 md:mb-6 relative">
                    <input
                        type="text"
                        placeholder="게임 이름 검색... (초성만: ㄱㄷㅇ, 일반: 가디언즈)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 md:p-4 text-base md:text-lg input-game rounded-xl pr-12 shadow-xl placeholder:text-amber-200/60 min-h-[44px]"
                        autoFocus
                    />
                    {/* 검색 아이콘 또는 로딩 스피너 */}
                    <div className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2">
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-400"></div>
                        ) : (
                            <div className="text-amber-300 text-xl">
                                🔍
                            </div>
                        )}
                    </div>
                </div>

                {/* 필터 상태 표시 */}
                {hasSearchCriteria && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <div className="glass-card border border-amber-400/40 text-amber-200 px-3 py-2 rounded-full text-sm flex items-center gap-2 min-h-[44px]">
                            검색: "{searchTerm}"
                            <button
                                onClick={() => setSearchTerm('')}
                                className="hover:text-yellow-300 transition-colors text-lg leading-none min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                                ×
                            </button>
                        </div>
                        <button
                            onClick={clearAllFilters}
                            className="text-amber-300/80 hover:text-amber-200 text-sm underline transition-colors min-h-[44px] px-2"
                        >
                            모든 필터 지우기
                        </button>
                    </div>
                )}
            </div>

            {/* 결과 섹션 */}
            <div>
                {!hasSearchCriteria ? (
                    <div className="text-center py-12">
                        <div className="glass-card rounded-2xl p-8 max-w-md mx-auto">
                            <div className="text-6xl mb-4">🎲</div>
                            <h3 className="text-xl font-semibold text-amber-100 mb-2">게임을 검색해보세요</h3>
                            <p className="text-amber-200/80">
                                위의 검색창에 게임 이름을 입력하면<br />
                                해당 게임의 룰을 알려드릴게요!
                            </p>
                        </div>
                    </div>
                ) : isLoading ? (
                    <LoadingSkeleton />
                ) : games.length > 0 ? (
                    <div className="space-y-3">
                        {games.map((game, index) => (
                            <div
                                key={game.id}
                                className="game-card rounded-xl p-4 cursor-pointer group min-h-[80px] flex items-center"
                                onClick={() => {
                                    onSelectGame(game);
                                }}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                                    <div className="flex-1">
                                        <h3 className="text-base sm:text-lg font-bold text-amber-100 group-hover:text-yellow-300 transition-colors drop-shadow">
                                            {game.title}
                                        </h3>
                                        <p className="text-amber-200/80 text-sm group-hover:text-amber-200 transition-colors">
                                            {game.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span
                                            className={`${getDifficultyColor(game.difficulty)} text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg border min-h-[28px] flex items-center`}
                                        >
                                            {game.difficulty}
                                        </span>
                                        <div className="text-amber-300/80 text-sm whitespace-nowrap hidden sm:block">
                                            보드게임
                                        </div>
                                        <div className="text-yellow-400 group-hover:text-yellow-300 transition-colors text-xl">
                                            ⚡
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="glass-card rounded-2xl p-8 max-w-md mx-auto">
                            <div className="text-5xl mb-4">😔</div>
                            <h3 className="text-xl font-semibold text-amber-100 mb-2">검색 결과가 없습니다</h3>
                            <p className="text-amber-200/80 mb-4">
                                다른 검색어로 시도해보세요
                            </p>
                            <button
                                onClick={clearAllFilters}
                                className="btn-game-primary px-4 py-2 rounded-lg transition-all duration-200"
                            >
                                검색 조건 초기화
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </ResponsiveContainer>
    );
} 
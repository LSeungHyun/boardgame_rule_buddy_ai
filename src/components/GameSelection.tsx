'use client';

import React from 'react';
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
            'Very Easy': 'bg-green-500',
            'Easy': 'bg-blue-500',
            'Normal': 'bg-yellow-500',
            'Semi-Hard': 'bg-orange-500',
            'Hard': 'bg-red-500',
            'Extreme': 'bg-purple-500'
        };
        return colors[difficulty as keyof typeof colors] || 'bg-gray-500';
    };

    // 검색어가 있는지 확인
    const hasSearchCriteria = searchTerm.trim();

    // 로딩 스켈레톤 컴포넌트
    const LoadingSkeleton = () => (
        <div className="space-y-3 max-w-6xl mx-auto">
            {[...Array(5)].map((_, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <div className="h-6 bg-gray-700 rounded mb-2 w-3/4"></div>
                            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-6 bg-gray-700 rounded-full w-16"></div>
                            <div className="h-4 bg-gray-700 rounded w-12"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="p-4 sm:p-6 md:p-8 min-h-screen">
            <header className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl font-bold text-blue-400 mb-4">AI 보드게임 룰 마스터</h1>
                <p className="text-xl text-gray-300 mb-2">365개 게임 중에서 원하는 게임을 검색하세요</p>
                <p className="text-gray-400">초성 검색 지원 (예: "ㄹㅁㅋㅂ" → 루미큐브)</p>
            </header>

            {/* 검색 섹션 */}
            <div className="mb-8 max-w-4xl mx-auto">
                {/* 검색바 */}
                <div className="mb-6 relative">
                    <input
                        type="text"
                        placeholder="게임 이름 검색... (초성만: ㄱㄷㅇ, 일반: 가디언즈)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-4 text-lg bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-white placeholder-gray-400 pr-12"
                        autoFocus
                    />
                    {/* 검색 아이콘 또는 로딩 스피너 */}
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                        ) : (
                            <div className="text-gray-400">
                                🔍
                            </div>
                        )}
                    </div>
                </div>

                {/* 검색 초기화 버튼 */}
                {hasSearchCriteria && (
                    <div className="text-center">
                        <button
                            onClick={clearAllFilters}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                            검색 초기화
                        </button>
                    </div>
                )}
            </div>

            {/* 검색 안내 또는 게임 목록 */}
            {!hasSearchCriteria ? (
                // 검색 안내 화면
                <div className="text-center py-20">
                    <div className="max-w-2xl mx-auto">
                        <div className="text-6xl mb-6">🎲</div>
                        <h2 className="text-2xl font-bold text-white mb-4">어떤 게임의 룰이 궁금하신가요?</h2>
                        <p className="text-gray-400 text-lg mb-8">
                            위의 검색창에 게임 이름을 입력하거나<br />
                            초성만 입력해도 검색할 수 있습니다
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-500">
                            <div className="bg-gray-800 p-4 rounded-lg">
                                <p className="text-blue-400 font-semibold mb-2">💡 검색 예시</p>
                                <ul className="space-y-1">
                                    <li><span className="text-yellow-400">초성:</span> "ㅇㅅㅍ" → 윙스팬</li>
                                    <li><span className="text-yellow-400">초성:</span> "ㅂㄹㅋㅅ" → 블로커스</li>
                                    <li><span className="text-green-400">일반:</span> "스플" → 스플렌더</li>
                                </ul>
                            </div>
                            <div className="bg-gray-800 p-4 rounded-lg">
                                <p className="text-green-400 font-semibold mb-2">🎯 인기 게임</p>
                                <ul className="space-y-1">
                                    <li>아크노바</li>
                                    <li>윙스팬</li>
                                    <li>카탄</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* 검색 상태에 따른 헤더 */}
                    <div className="mb-6">
                        <div className="text-center">
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                                    <p className="text-blue-400 animate-pulse">
                                        "{searchTerm}" 검색 중...
                                    </p>
                                </div>
                            ) : games.length > 0 ? (
                                <p className="text-gray-400">
                                    <span className="text-green-400 font-semibold">{games.length}개</span>의 게임을 찾았습니다
                                </p>
                            ) : (
                                <div className="text-center">
                                    <p className="text-orange-400 mb-1">
                                        "{searchTerm}"에 대한 검색 결과가 없습니다
                                    </p>
                                    <p className="text-gray-500 text-sm">
                                        • 다른 검색어를 시도해보세요<br />
                                        • 초성 검색: "ㅇㅅㅍ", "ㅋㅌ" 등<br />
                                        • 일반 검색: "카탄", "윙스" 등
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 로딩 중일 때 스켈레톤 */}
                    {isLoading && <LoadingSkeleton />}

                    {/* 검색 완료 후 결과가 없을 때 */}
                    {!isLoading && games.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4 opacity-50">🤔</div>
                            <p className="text-gray-400 text-lg mb-2">찾는 게임이 없나요?</p>
                            <div className="bg-gray-800 p-4 rounded-lg max-w-md mx-auto">
                                <p className="text-sm text-gray-300 mb-2">💡 검색 팁:</p>
                                <ul className="text-xs text-gray-400 space-y-1">
                                    <li>• 게임 이름의 일부만 입력해보세요</li>
                                    <li>• 초성으로 검색해보세요 (예: ㅇㅅㅍ)</li>
                                    <li>• 띄어쓰기 없이 입력해보세요</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* 게임 리스트 */}
                    {!isLoading && games.length > 0 && (
                        <div className="space-y-3 max-w-6xl mx-auto">
                            {games.map(game => (
                                <div
                                    key={game.id}
                                    onClick={() => onSelectGame(game)}
                                    className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 transform hover:scale-[1.01]"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        {/* 게임 제목 */}
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white mb-1">{game.title}</h3>
                                            {game.publisher && (
                                                <p className="text-gray-400 text-sm">{game.publisher}</p>
                                            )}
                                        </div>

                                        {/* 난이도 배지 */}
                                        <div className="flex items-center gap-2">
                                            {game.difficulty && (
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getDifficultyColor(game.difficulty)}`}>
                                                    {game.difficulty}
                                                </span>
                                            )}
                                            {game.gameId && (
                                                <span className="text-gray-500 text-xs">ID: {game.gameId}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 설명 (선택적) */}
                                    {game.description && (
                                        <p className="text-gray-300 text-sm mt-2 line-clamp-2">{game.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
} 
/**
 * 향상된 게임 검색 컴포넌트
 * BGG API와 로컬 데이터를 통합한 게임 검색
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, ExternalLink, Star, Users, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import type { GameWithBGGData, BGGSearchResultWithDetails } from '@/infrastructure/ai/orchestrators/bgg-integration-service';

interface EnhancedGameSearchProps {
  onGameSelect: (game: GameWithBGGData) => void;
  placeholder?: string;
  showHotGames?: boolean;
}

interface SearchState {
  query: string;
  searchResults: BGGSearchResultWithDetails | null;
  hotGames: GameWithBGGData[];
  isSearching: boolean;
  isLoadingHot: boolean;
  error: string | null;
  hasSearched: boolean;
}

export function EnhancedGameSearch({ 
  onGameSelect, 
  placeholder = "게임 이름을 입력하세요...",
  showHotGames = true
}: EnhancedGameSearchProps) {
  const [state, setState] = useState<SearchState>({
    query: '',
    searchResults: null,
    hotGames: [],
    isSearching: false,
    isLoadingHot: false,
    error: null,
    hasSearched: false
  });

  // 검색 디바운스를 위한 타이머
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  /**
   * BGG Hot 게임 목록 로드
   */
  const loadHotGames = useCallback(async () => {
    if (!showHotGames) return;

    setState(prev => ({ ...prev, isLoadingHot: true, error: null }));

    try {
      const response = await fetch('/api/bgg-integration?action=hot&limit=10');
      const data = await response.json();

      if (data.success) {
        setState(prev => ({ 
          ...prev, 
          hotGames: data.data,
          isLoadingHot: false 
        }));
      } else {
        throw new Error(data.error?.message || 'Hot 게임 로드 실패');
      }
    } catch (error) {
      console.error('Hot 게임 로드 실패:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Hot 게임을 불러올 수 없습니다.',
        isLoadingHot: false 
      }));
      
      toast({
        title: "알림",
        description: "인기 게임 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    }
  }, [showHotGames]);

  /**
   * 게임 검색 (여러 결과 반환)
   */
  const searchGames = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setState(prev => ({ 
        ...prev, 
        searchResults: null, 
        isSearching: false,
        hasSearched: false 
      }));
      return;
    }

    setState(prev => ({ ...prev, isSearching: true, error: null }));

    try {
      console.log(`🔍 [Enhanced Search] 검색 시작: "${searchQuery}"`);

      const response = await fetch('/api/bgg-integration?action=search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameTitle: searchQuery.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ [Enhanced Search] 검색 성공:`, data.data);

        setState(prev => ({ 
          ...prev, 
          searchResults: data.data,
          isSearching: false,
          hasSearched: true 
        }));

        toast({
          title: "검색 완료",
          description: `${data.data.totalFound}개의 관련 게임을 찾았습니다.`,
        });

      } else {
        // 검색 결과가 없는 경우
        setState(prev => ({ 
          ...prev, 
          searchResults: {
            searchResults: [],
            detailedGames: [],
            searchQuery: searchQuery,
            totalFound: 0
          },
          isSearching: false,
          hasSearched: true 
        }));

        toast({
          title: "검색 결과 없음",
          description: data.error?.message || `"${searchQuery}"와 관련된 게임을 찾을 수 없습니다.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('BGG 검색 실패:', error);
      
      setState(prev => ({ 
        ...prev, 
        error: '게임 검색 중 오류가 발생했습니다.',
        isSearching: false,
        hasSearched: true 
      }));

      toast({
        title: "검색 오류",
        description: "게임 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive"
      });
    }
  }, []);

  /**
   * 검색어 입력 핸들러 (디바운스 적용)
   */
  const handleQueryChange = useCallback((newQuery: string) => {
    setState(prev => ({ ...prev, query: newQuery }));

    // 기존 타이머 취소
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    // 새 타이머 설정 (500ms 후 검색 실행)
    if (newQuery.trim()) {
      const timer = setTimeout(() => {
        searchGames(newQuery);
      }, 500);
      setSearchTimer(timer);
    } else {
      setState(prev => ({ 
        ...prev, 
        searchResults: null,
        hasSearched: false 
      }));
    }
  }, [searchGames, searchTimer]);

  /**
   * 게임 카드 렌더링
   */
  const renderGameCard = useCallback((game: GameWithBGGData, index: number) => {
    return (
      <Card 
        key={`${game.id}-${index}`}
        className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300"
        onClick={() => onGameSelect(game)}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg line-clamp-2">{game.title}</h3>
            {game.searchScore && (
              <Badge variant="outline" className="ml-2 text-xs">
                {game.searchScore}%
              </Badge>
            )}
          </div>

          {game.bggData && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {game.bggData.yearPublished > 0 && (
                  <span>📅 {game.bggData.yearPublished}</span>
                )}
                {game.bggData.minPlayers && game.bggData.maxPlayers && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {game.bggData.minPlayers === game.bggData.maxPlayers 
                      ? `${game.bggData.minPlayers}명`
                      : `${game.bggData.minPlayers}-${game.bggData.maxPlayers}명`
                    }
                  </span>
                )}
                {game.bggData.playingTime > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {game.bggData.playingTime}분
                  </span>
                )}
              </div>

              {game.bggData.averageRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">
                    {game.bggData.averageRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({game.bggData.numVotes.toLocaleString()}명)
                  </span>
                </div>
              )}

              {game.bggData.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {game.bggData.description.replace(/<[^>]*>/g, '').substring(0, 120)}...
                </p>
              )}
            </div>
          )}

          <div className="mt-3 flex justify-between items-center">
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <ExternalLink className="w-3 h-3" />
              BGG에서 보기
            </div>
            {game.bggId && (
              <Badge variant="secondary" className="text-xs">
                BGG #{game.bggId}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }, [onGameSelect]);

  /**
   * 컴포넌트 마운트 시 Hot 게임 로드
   */
  useEffect(() => {
    loadHotGames();
  }, [loadHotGames]);

  /**
   * 컴포넌트 언마운트 시 타이머 정리
   */
  useEffect(() => {
    return () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
    };
  }, [searchTimer]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* 검색 입력 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder={placeholder}
          value={state.query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="pl-10 pr-4 py-3 text-lg border-2 focus:border-blue-500"
        />
        {state.isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-blue-500" />
        )}
      </div>

      {/* 검색 결과 */}
      {state.hasSearched && (
        <div>
          <h2 className="text-xl font-bold mb-4">
            검색 결과 
            {state.searchResults && (
              <span className="text-blue-600">
                ({state.searchResults.totalFound}개)
              </span>
            )}
          </h2>

          {state.isSearching ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-4">
                    <Skeleton className="h-6 mb-2" />
                    <Skeleton className="h-4 mb-1 w-3/4" />
                    <Skeleton className="h-4 mb-3 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : state.searchResults && state.searchResults.detailedGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.searchResults.detailedGames.map((game, index) => 
                renderGameCard(game, index)
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎲</div>
              <h3 className="text-xl font-semibold mb-2">검색 결과가 없습니다</h3>
              <p className="text-gray-600 mb-4">
                다른 게임 이름으로 시도해보세요
              </p>
              <p className="text-sm text-gray-500">
                영어 제목으로 검색하거나 게임명의 철자를 확인해보세요
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hot 게임 섹션 */}
      {showHotGames && !state.hasSearched && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-red-500" />
            인기 게임 (BGG Hot List)
          </h2>

          {state.isLoadingHot ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-4">
                    <Skeleton className="h-6 mb-2" />
                    <Skeleton className="h-4 mb-1 w-3/4" />
                    <Skeleton className="h-4 mb-3 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : state.hotGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.hotGames.map((game, index) => renderGameCard(game, index))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">인기 게임을 불러올 수 없습니다.</p>
              <Button 
                variant="outline" 
                onClick={loadHotGames}
                className="mt-2"
              >
                다시 시도
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 에러 메시지 */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{state.error}</p>
        </div>
      )}
    </div>
  );
} 
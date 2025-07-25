'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Calendar, ExternalLink, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface YearWarningDisplayProps {
  gameName: string;
  publishedYear: number;
  isVisible: boolean;
  onDismiss?: () => void;
  className?: string;
}

/**
 * 최신 게임 년도 경고 표시 컴포넌트
 * 
 * 2024-2025년 출시 게임에 대해 정보 부족 경고를 표시합니다.
 */
export function YearWarningDisplay({
  gameName,
  publishedYear,
  isVisible,
  onDismiss,
  className = ''
}: YearWarningDisplayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ 
            duration: 0.3,
            ease: [0.23, 1, 0.32, 1]
          }}
          className={`mb-4 ${className}`}
        >
          <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -3, 3, 0] }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 5
              }}
            >
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </motion.div>
            
            <AlertDescription className="text-sm text-amber-800 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <Calendar className="h-4 w-4" />
                <span>최신 게임 안내 ({publishedYear}년 출시)</span>
              </div>
              
              <div className="space-y-2 text-amber-700">
                <p>
                  <strong className="text-amber-900">{gameName}</strong>은(는) {publishedYear}년에 출시된 최신 게임입니다.
                </p>
                <p>
                  최신 게임의 경우 <strong>룰 정보가 아직 충분히 수집되지 않아 답변의 정확도가 낮을 수 있습니다.</strong>
                </p>
              </div>

              <div className="mt-3 p-3 bg-white/60 rounded-lg border border-amber-200">
                <p className="text-sm font-medium text-amber-900 mb-2">더 정확한 정보를 원한다면:</p>
                <div className="space-y-1.5 text-sm text-amber-800">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600">📖</span>
                    <span>공식 룰북을 직접 확인해 주세요</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-3 w-3 text-amber-600" />
                    <span>BGG(BoardGameGeek) 커뮤니티를 참고해 주세요</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-amber-600" />
                    <span>다른 플레이어들과 상의해 보세요</span>
                  </div>
                </div>
              </div>

              {onDismiss && (
                <div className="flex justify-end mt-3">
                  <button
                    onClick={onDismiss}
                    className="text-xs text-amber-600 hover:text-amber-800 underline transition-colors"
                  >
                    이 알림 닫기
                  </button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 간단한 년도 배지 컴포넌트
 */
interface YearBadgeProps {
  year: number;
  isRecent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function YearBadge({ 
  year, 
  isRecent = false, 
  size = 'md',
  className = '' 
}: YearBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const colorClasses = isRecent 
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : 'bg-slate-100 text-slate-700 border-slate-300';

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className={`
        inline-flex items-center gap-1 
        ${sizeClasses[size]} 
        ${colorClasses}
        border rounded-full font-medium
        transition-colors duration-200
        ${className}
      `}
    >
      <Calendar className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />
      {year}
      {isRecent && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-1"
        >
          ⚠️
        </motion.span>
      )}
    </motion.span>
  );
}

/**
 * 로딩 상태 표시 컴포넌트
 */
export function YearInfoSkeleton() {
  return (
    <div className="flex items-center gap-2 animate-pulse">
      <div className="w-4 h-4 bg-slate-200 rounded"></div>
      <div className="w-16 h-5 bg-slate-200 rounded-full"></div>
      <div className="w-12 h-4 bg-slate-200 rounded"></div>
    </div>
  );
}

/**
 * 년도 정보 표시 훅
 */
import { useState, useEffect } from 'react';
import { CachedGameYearUseCase } from '@/usecases/game-year-service';
import { findGameByExactName } from '@/features/games/api';

export function useGameYearInfo(gameName: string) {
  const [yearInfo, setYearInfo] = useState<{
    publishedYear?: number;
    isRecentGame: boolean;
    warningMessage?: string;
    isLoading: boolean;
    error?: string;
    source?: 'database' | 'bgg' | 'none';
  }>({
    isRecentGame: false,
    isLoading: false,
    source: 'none'
  });

  useEffect(() => {
    if (!gameName.trim()) {
      setYearInfo({ isRecentGame: false, isLoading: false, source: 'none' });
      return;
    }

    let isCancelled = false;
    console.log('🔍 [useGameYearInfo] 게임 년도 정보 조회 시작:', gameName);
    setYearInfo(prev => ({ ...prev, isLoading: true, error: undefined }));

    // 1단계: 우리 DB에서 게임 검색
    const checkDatabaseFirst = async () => {
      try {
        console.log('📚 [useGameYearInfo] DB 우선 검색:', gameName);
        const dbGame = await findGameByExactName(gameName);
        
        if (dbGame && dbGame.gameId) {
          console.log('✅ [useGameYearInfo] DB에서 게임 발견:', {
            게임명: dbGame.title,
            게임ID: dbGame.gameId
          });
          
          // DB에 게임이 있으면 BGG ID로 직접 조회
          return CachedGameYearUseCase.execute(dbGame.title);
        } else {
          console.log('🔍 [useGameYearInfo] DB에 없음, BGG 직접 검색:', gameName);
          // DB에 없으면 게임명으로 BGG 검색
          return CachedGameYearUseCase.execute(gameName);
        }
      } catch (dbError) {
        console.warn('⚠️ [useGameYearInfo] DB 검색 오류, BGG 직접 검색:', dbError);
        return CachedGameYearUseCase.execute(gameName);
      }
    };

    checkDatabaseFirst()
      .then(result => {
        if (isCancelled) return;

        console.log('📊 [useGameYearInfo] 최종 BGG API 결과:', result);

        if (result.success && result.data) {
          console.log('✅ [useGameYearInfo] 년도 정보 성공:', {
            게임명: result.data.gameName,
            출시년도: result.data.publishedYear,
            최신게임: result.data.isRecentGame
          });
          
          setYearInfo({
            publishedYear: result.data.publishedYear,
            isRecentGame: result.data.isRecentGame,
            warningMessage: result.data.warningMessage,
            isLoading: false,
            source: 'bgg'
          });
        } else {
          console.warn('⚠️ [useGameYearInfo] BGG API 실패:', result.error);
          setYearInfo({
            isRecentGame: false,
            isLoading: false,
            error: result.error,
            source: 'none'
          });
        }
      })
      .catch(error => {
        if (isCancelled) return;
        console.error('❌ [useGameYearInfo] 예외 오류:', error);
        setYearInfo({
          isRecentGame: false,
          isLoading: false,
          error: '년도 정보를 불러올 수 없습니다.',
          source: 'none'
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [gameName]);

  return yearInfo;
} 
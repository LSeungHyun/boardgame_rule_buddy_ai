'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useScoreCalculatorStore } from '@/lib/stores/score-calculator-store';
import { GameRules } from '@/types/score-calculator';
// import { ScoreInput } from './score-input';
// import { RealTimeCalculation } from './real-time-calculation';
// import { SimulationMode } from './simulation-mode';
import { Button } from './button';
import { Card } from './card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

interface ScoreCalculatorProps {
  gameRules?: GameRules;
  className?: string;
}

// Sample game rules for demonstration
const sampleGameRules: GameRules = {
  gameId: 'wingspan',
  gameName: 'Wingspan',
  categories: [
    {
      id: 'birds',
      name: '새 카드',
      description: '보드에 있는 새 카드들의 점수',
      color: 'bg-blue-500',
      icon: '🐦',
      maxValue: 50
    },
    {
      id: 'bonus',
      name: '보너스 카드',
      description: '보너스 카드로 얻은 점수',
      color: 'bg-green-500',
      icon: '🎯'
    },
    {
      id: 'objectives',
      name: '목표 카드',
      description: '라운드 목표로 얻은 점수',
      color: 'bg-purple-500',
      icon: '🏆'
    },
    {
      id: 'eggs',
      name: '알',
      description: '새 카드 위의 알',
      color: 'bg-yellow-500',
      icon: '🥚'
    },
    {
      id: 'food',
      name: '저장된 먹이',
      description: '개인 공급처의 먹이',
      color: 'bg-orange-500',
      icon: '🌾'
    },
    {
      id: 'tucked',
      name: '숨겨진 카드',
      description: '새 카드 아래 숨겨진 카드들',
      color: 'bg-red-500',
      icon: '📋'
    }
  ],
  scoringRules: [
    {
      id: 'bird-points',
      categoryId: 'birds',
      name: '새 점수',
      description: '각 새 카드의 점수를 합산',
      calculation: 'sum'
    },
    {
      id: 'bonus-points',
      categoryId: 'bonus',
      name: '보너스 점수',
      description: '보너스 카드 점수를 합산',
      calculation: 'sum'
    },
    {
      id: 'objective-points',
      categoryId: 'objectives',
      name: '목표 점수',
      description: '라운드별 목표 점수를 합산',
      calculation: 'sum'
    },
    {
      id: 'egg-points',
      categoryId: 'eggs',
      name: '알 점수',
      description: '알 1개당 1점',
      calculation: 'sum'
    },
    {
      id: 'food-points',
      categoryId: 'food',
      name: '먹이 점수',
      description: '저장된 먹이 1개당 1점',
      calculation: 'sum'
    },
    {
      id: 'tucked-points',
      categoryId: 'tucked',
      name: '숨겨진 카드 점수',
      description: '숨겨진 카드 1장당 1점',
      calculation: 'sum'
    }
  ]
};

export function ScoreCalculator({ gameRules = sampleGameRules, className }: ScoreCalculatorProps) {
  const [activeTab, setActiveTab] = useState<'input' | 'calculation' | 'simulation'>('input');
  
  const {
    currentGame,
    currentResult,
    simulationMode,
    history,
    setGame,
    toggleSimulationMode,
    saveToHistory,
    reset
  } = useScoreCalculatorStore();

  // Initialize game rules if not set
  React.useEffect(() => {
    if (!currentGame && gameRules) {
      setGame(gameRules);
    }
  }, [currentGame, gameRules, setGame]);

  const handleSaveScore = () => {
    const playerName = prompt('플레이어 이름을 입력하세요 (선택사항):');
    const notes = prompt('메모를 입력하세요 (선택사항):');
    saveToHistory(playerName || undefined, notes || undefined);
  };

  const handleReset = () => {
    if (confirm('모든 점수를 초기화하시겠습니까?')) {
      reset();
    }
  };

  if (!currentGame) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">점수 계산기</h3>
          <p className="text-muted-foreground">게임 규칙을 로드하는 중...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-amber-200">
              🧮 {currentGame.gameName} 점수 계산기
            </h2>
            <p className="text-sm text-amber-300/80 mt-1">
              실시간 점수 계산 및 시뮬레이션
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSimulationMode}
              className={cn(
                simulationMode && 'bg-purple-500/20 border-purple-400 text-purple-200'
              )}
            >
              {simulationMode ? '🔮 시뮬레이션 ON' : '🔮 시뮬레이션'}
            </Button>
            
            {currentResult && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveScore}
              >
                💾 저장
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              🔄 초기화
            </Button>
          </div>
        </div>
        
        {/* Current Score Display */}
        {currentResult && (
          <div className="mt-4 p-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-lg border border-amber-400/30">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-amber-200">총 점수</span>
              <span className="text-3xl font-bold text-yellow-300">
                {currentResult.totalScore}점
              </span>
            </div>
            
            {simulationMode && (
              <div className="mt-2 text-sm text-purple-200">
                🔮 시뮬레이션 모드 활성화
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="input">점수 입력</TabsTrigger>
          <TabsTrigger value="calculation">계산 결과</TabsTrigger>
          <TabsTrigger value="simulation" disabled={!simulationMode}>
            시뮬레이션
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          {/* <ScoreInput gameRules={currentGame} /> */}
        </TabsContent>

        <TabsContent value="calculation" className="space-y-4">
          {/* <RealTimeCalculation 
            result={currentResult} 
            gameRules={currentGame}
          /> */}
        </TabsContent>

                  <TabsContent value="simulation" className="space-y-4">
            {simulationMode ? (
             <Card className="p-6 text-center">
               <p className="text-muted-foreground">
                 시뮬레이션 기능이 곧 추가될 예정입니다
               </p>
             </Card>
            ) : (
              <Card className="p-6 text-center">
              <p className="text-muted-foreground">
                시뮬레이션 모드를 활성화하세요
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* History Preview */}
      {history.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-amber-200 mb-3">📊 최근 기록</h3>
          <div className="space-y-2">
            {history.slice(0, 3).map((entry) => (
              <div 
                key={entry.id}
                className="flex items-center justify-between p-2 bg-black/20 rounded border border-white/10"
              >
                <div>
                  <span className="text-sm font-medium">
                    {entry.playerName || '익명'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {entry.timestamp.toLocaleDateString()}
                  </span>
                </div>
                <span className="font-bold text-yellow-300">
                  {entry.totalScore}점
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
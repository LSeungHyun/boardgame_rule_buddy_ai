/**
 * 실시간 점수 계산 컴포넌트
 * 게임 진행 중 실시간으로 점수를 계산하고 표시
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import type { GameRules } from '@/types/score-calculator';

interface RealTimeCalculationProps {
  gameRules?: GameRules;
  scores?: Record<string, number>;
  players?: Array<{ id: string; name: string; }>; 
  result?: import('@/types/score-calculator').CalculationResult;
}

export function RealTimeCalculation({ 
  gameRules,
  scores = {},
  players = [],
  result
}: RealTimeCalculationProps) {
  const [totalScore, setTotalScore] = useState(0);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    // 실시간 점수 계산 로직
    if (result) {
      setTotalScore(result.totalScore);
      setBreakdown(result.categoryScores);
    } else {
      const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
      setTotalScore(total);
      setBreakdown(scores);
    }
  }, [scores, result]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⚡ 실시간 점수 계산
          <Badge variant="outline">{gameRules?.gameName || '게임'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-400">
            {totalScore}점
          </div>
          <div className="text-sm text-muted-foreground">현재 총점</div>
        </div>

        {Object.keys(breakdown).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">점수 분석</h4>
            {Object.entries(breakdown).map(([category, score]) => (
              <div key={category} className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm">{category}</span>
                <Badge variant={score > 0 ? "default" : "secondary"}>
                  {score}점
                </Badge>
              </div>
            ))}
          </div>
        )}

        {players.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">플레이어 순위</h4>
            {players.map((player, index) => (
              <div key={player.id} className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm">#{index + 1} {player.name}</span>
                <Badge variant="outline">
                  {scores[player.id] || 0}점
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
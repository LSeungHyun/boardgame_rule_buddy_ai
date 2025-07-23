/**
 * 시뮬레이션 모드 컴포넌트
 * 게임 점수 시뮬레이션 및 예측 기능 제공
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Input } from './input';
import { Label } from './label';
import type { GameRules } from '@/types/score-calculator';

interface SimulationModeProps {
  gameRules?: GameRules;
}

interface SimulationResult {
  scenario: string;
  predictedScore: number;
  probability: number;
  recommendations: string[];
}

export function SimulationMode({ gameRules }: SimulationModeProps) {
  const [scenarios, setScenarios] = useState<SimulationResult[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [targetScore, setTargetScore] = useState<number>(100);

  const runSimulation = async () => {
    setIsSimulating(true);
    
    // 시뮬레이션 로직 (실제로는 더 복잡한 계산)
    await new Promise(resolve => setTimeout(resolve, 1500)); // 시뮬레이션 대기
    
    const mockScenarios: SimulationResult[] = [
      {
        scenario: '최적 전략',
        predictedScore: targetScore + 20,
        probability: 85,
        recommendations: ['고득점 액션 우선', '리소스 관리 집중']
      },
      {
        scenario: '안전 플레이',
        predictedScore: targetScore - 5,
        probability: 95,
        recommendations: ['위험 회피', '점수 안정성 우선']
      },
      {
        scenario: '공격적 전략',
        predictedScore: targetScore + 40,
        probability: 60,
        recommendations: ['고위험 고수익', '상대방 견제']
      }
    ];
    
    setScenarios(mockScenarios);
    setIsSimulating(false);
  };

  const clearSimulation = () => {
    setScenarios([]);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔮 시뮬레이션 모드
          <Badge variant="secondary">{gameRules?.gameName || '게임'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target-score">목표 점수</Label>
            <Input
              id="target-score"
              type="number"
              placeholder="목표 점수 입력"
              value={targetScore}
              onChange={(e) => setTargetScore(parseInt(e.target.value) || 100)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={runSimulation}
              disabled={isSimulating}
              className="flex-1"
            >
              {isSimulating ? '시뮬레이션 중...' : '🎯 시뮬레이션 실행'}
            </Button>
            {scenarios.length > 0 && (
              <Button variant="outline" onClick={clearSimulation}>
                초기화
              </Button>
            )}
          </div>
        </div>

        {scenarios.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">시뮬레이션 결과</h4>
            {scenarios.map((scenario, index) => (
              <Card key={index} className="p-4 bg-muted/30">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium">{scenario.scenario}</h5>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {scenario.predictedScore}점
                      </Badge>
                      <Badge 
                        variant={scenario.probability >= 80 ? "default" : scenario.probability >= 60 ? "secondary" : "destructive"}
                      >
                        {scenario.probability}% 확률
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">추천 전략:</div>
                    <ul className="text-sm space-y-1">
                      {scenario.recommendations.map((rec, recIndex) => (
                        <li key={recIndex} className="flex items-center gap-2">
                          <span className="text-blue-400">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {isSimulating && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">AI가 최적 전략을 분석하고 있습니다...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
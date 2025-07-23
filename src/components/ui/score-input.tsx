/**
 * 점수 입력 컴포넌트
 * 게임별 점수 입력 폼을 제공
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Button } from './button';
import { Label } from './label';
import type { GameRules } from '@/types/score-calculator';

interface ScoreInputProps {
  gameRules: GameRules;
  onScoreSubmit?: (scores: Record<string, number>) => void;
}

export function ScoreInput({ gameRules, onScoreSubmit }: ScoreInputProps) {
  const [scores, setScores] = useState<Record<string, number>>({});

  const handleScoreChange = (category: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setScores(prev => ({ ...prev, [category]: numValue }));
  };

  const handleSubmit = () => {
    onScoreSubmit?.(scores);
  };

  const categories = gameRules.categories?.map(c => c.name) || ['기본 점수'];

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>점수 입력 - {gameRules.gameName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category, index) => (
          <div key={index} className="space-y-2">
            <Label htmlFor={`score-${index}`}>{category}</Label>
            <Input
              id={`score-${index}`}
              type="number"
              placeholder="0"
              min={0}
              max={1000}
              value={scores[category] || ''}
              onChange={(e) => handleScoreChange(category, e.target.value)}
            />
          </div>
        ))}
        
        <Button 
          onClick={handleSubmit}
          className="w-full"
          disabled={Object.keys(scores).length === 0}
        >
          점수 제출
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * 점수 요약 표시 컴포넌트
 * 최종 점수 계산 결과를 깔끔하게 표시
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trophy, Target, CheckCircle } from 'lucide-react';

// 점수 항목 타입
interface ScoreEntry {
  categoryName: string;
  points: number;
}

// 컴포넌트 Props
interface ScoreSummaryDisplayProps {
  finalScores: ScoreEntry[];
  totalScore: number;
  gameName: string;
  showCelebration?: boolean;
}

/**
 * 점수 요약 표시 컴포넌트
 */
export function ScoreSummaryDisplay({ 
  finalScores, 
  totalScore, 
  gameName,
  showCelebration = true 
}: ScoreSummaryDisplayProps) {

  console.log('🏆 [점수 요약 표시]', {
    게임명: gameName,
    총점: totalScore,
    카테고리수: finalScores.length,
    축하표시: showCelebration
  });

  // 최고 점수 카테고리 찾기
  const highestScoreCategory = finalScores.reduce((max, current) => 
    current.points > max.points ? current : max, 
    finalScores[0] || { categoryName: '', points: 0 }
  );

  // 점수 등급 계산 (게임에 따라 조정 가능)
  const getScoreGrade = (score: number): { grade: string; color: string; description: string } => {
    if (score >= 100) {
      return { grade: 'S', color: 'bg-yellow-500', description: '완벽한 점수!' };
    } else if (score >= 80) {
      return { grade: 'A', color: 'bg-green-500', description: '훌륭한 점수!' };
    } else if (score >= 60) {
      return { grade: 'B', color: 'bg-blue-500', description: '좋은 점수!' };
    } else if (score >= 40) {
      return { grade: 'C', color: 'bg-orange-500', description: '괜찮은 점수!' };
    } else {
      return { grade: 'D', color: 'bg-gray-500', description: '다음엔 더 잘할 수 있어요!' };
    }
  };

  const scoreGrade = getScoreGrade(totalScore);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* 축하 헤더 */}
      {showCelebration && (
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">
              점수 계산 완료! 🎉
            </h2>
            <p className="text-muted-foreground text-center">
              {gameName}의 최종 점수가 계산되었습니다.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 총점 표시 */}
      <Card className="border-2 border-primary/30">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            최종 점수
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-6xl font-bold text-primary mb-2">
            {totalScore.toLocaleString()}
          </div>
          <div className="text-xl text-muted-foreground mb-4">점</div>
          
          {/* 점수 등급 배지 */}
          <div className="flex items-center justify-center gap-2">
            <Badge 
              className={`${scoreGrade.color} text-white text-lg px-4 py-2`}
              variant="secondary"
            >
              등급: {scoreGrade.grade}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {scoreGrade.description}
          </p>
        </CardContent>
      </Card>

      {/* 카테고리별 점수 상세 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            📊 카테고리별 점수 상세
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {finalScores.map((entry, index) => (
            <div key={index}>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium">{entry.categoryName}</h4>
                    {entry.categoryName === highestScoreCategory.categoryName && entry.points > 0 && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        🏆 최고 점수
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {entry.points.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">점</div>
                </div>
              </div>
              {index < finalScores.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 통계 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📈 점수 통계</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {finalScores.length}
            </div>
            <div className="text-sm text-muted-foreground">점수 카테고리</div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {Math.round(totalScore / finalScores.length)}
            </div>
            <div className="text-sm text-muted-foreground">평균 점수</div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {highestScoreCategory.points}
            </div>
            <div className="text-sm text-muted-foreground">최고 점수</div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {finalScores.filter(entry => entry.points > 0).length}
            </div>
            <div className="text-sm text-muted-foreground">득점 카테고리</div>
          </div>
        </CardContent>
      </Card>

      {/* 게임 정보 */}
      <Card className="bg-muted/30">
        <CardContent className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            <strong>{gameName}</strong>의 점수 계산이 완료되었습니다.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            AI 룰 마스터가 도움을 드렸습니다 ✨
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
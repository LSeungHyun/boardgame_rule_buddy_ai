/**
 * 대화형 점수 가이드 메인 컴포넌트
 * 전체 점수 계산 경험을 조율하는 호스트 컴포넌트
 */

'use client';

import { useState, useEffect } from 'react';
import { useScoringGuide } from '@/hooks/useScoringGuide';
import { ScoreSummaryDisplay } from './ScoreSummaryDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Calculator, ArrowLeft, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 점수 카테고리 타입
interface ScoringCategory {
  id: string;
  categoryName: string;
  prompt: string;
}

// 점수 시트 템플릿 타입
interface ScoreSheetTemplate {
  gameName: string;
  scoringCategories: ScoringCategory[];
}

// 컴포넌트 Props
interface ScoringGuideHostProps {
  gameName: string;
  onComplete?: (totalScore: number, breakdown: Array<{ categoryName: string; points: number }>) => void;
}

/**
 * 점수 가이드 호스트 컴포넌트
 */
export function ScoringGuideHost({ gameName, onComplete }: ScoringGuideHostProps) {
  // 상태 관리
  const [scoreSheetTemplate, setScoreSheetTemplate] = useState<ScoreSheetTemplate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState<string>('');
  
  const { toast } = useToast();

  // 점수 가이드 훅 (스크립트 로드 후 초기화)
  const scoringGuide = useScoringGuide(scoreSheetTemplate?.scoringCategories || []);

  console.log('🎯 [ScoringGuideHost 렌더링]', {
    게임명: gameName,
    스크립트로드됨: !!scoreSheetTemplate,
    로딩중: isLoading,
    에러: !!error,
    완료상태: scoringGuide.isComplete
  });

  // 컴포넌트 마운트 시 스크립트 로드
  useEffect(() => {
    loadScoringScript();
  }, [gameName]);

  // 완료 시 콜백 호출
  useEffect(() => {
    if (scoringGuide.isComplete && onComplete) {
      const breakdown = scoringGuide.getAllScoreEntries();
      onComplete(scoringGuide.totalScore, breakdown);
    }
  }, [scoringGuide.isComplete, scoringGuide.totalScore, onComplete]);

  /**
   * 점수 스크립트 로드
   */
  const loadScoringScript = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📡 [API 호출 시작]', { 게임명: gameName });

      const response = await fetch('/api/generate-scoring-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameName })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || '스크립트 생성에 실패했습니다.');
      }

      console.log('✅ [스크립트 로드 완료]', {
        게임명: data.data.gameName,
        카테고리수: data.data.scoringCategories.length
      });

      setScoreSheetTemplate(data.data);

      toast({
        title: "점수 가이드 준비 완료",
        description: `${data.data.gameName}의 점수 계산을 시작합니다.`
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      console.error('❌ [스크립트 로드 실패]:', err);
      
      setError(errorMessage);
      
      toast({
        title: "오류 발생",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 점수 제출 처리
   */
  const handleScoreSubmit = () => {
    const score = parseInt(currentInput.trim());

    // 입력 검증
    if (isNaN(score)) {
      toast({
        title: "잘못된 입력",
        description: "숫자를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (score < 0) {
      toast({
        title: "잘못된 입력", 
        description: "0 이상의 숫자를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    console.log('📝 [점수 제출]', {
      카테고리: scoringGuide.currentQuestion?.categoryName,
      입력값: score
    });

    // 점수 제출
    scoringGuide.submitScore(score);
    
    // 입력 필드 초기화
    setCurrentInput('');

    toast({
      title: "점수 입력 완료",
      description: `${scoringGuide.currentQuestion?.categoryName}: ${score}점`
    });
  };

  /**
   * Enter 키 처리
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScoreSubmit();
    }
  };

  /**
   * 다시 시작
   */
  const handleRestart = () => {
    scoringGuide.resetScoring();
    setCurrentInput('');
    
    toast({
      title: "점수 계산 초기화",
      description: "처음부터 다시 시작합니다."
    });
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <h3 className="text-lg font-semibold mb-2">점수 가이드 준비 중...</h3>
          <p className="text-muted-foreground text-center">
            {gameName}의 점수 계산 방식을 분석하고 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-destructive mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">오류 발생</h3>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <Button onClick={loadScoringScript} variant="outline">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 완료 상태 - 점수 요약 표시
  if (scoringGuide.isComplete) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <ScoreSummaryDisplay
          finalScores={scoringGuide.getAllScoreEntries()}
          totalScore={scoringGuide.totalScore}
          gameName={scoreSheetTemplate?.gameName || gameName}
        />
        
        <div className="flex justify-center">
          <Button onClick={handleRestart} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            다시 계산하기
          </Button>
        </div>
      </div>
    );
  }

  // 진행 중 상태 - 질문 표시
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* 진행률 표시 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {scoreSheetTemplate?.gameName} 점수 계산
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {scoringGuide.currentStep + 1} / {scoreSheetTemplate?.scoringCategories.length}
            </span>
          </div>
          <Progress value={scoringGuide.progress} className="mt-2" />
        </CardHeader>
      </Card>

      {/* 현재 질문 */}
      {scoringGuide.currentQuestion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {scoringGuide.currentQuestion.categoryName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg leading-relaxed">
              {scoringGuide.currentQuestion.prompt}
            </p>
            
            <div className="flex gap-2">
              <Input
                type="number"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="점수를 입력하세요"
                className="text-lg"
                min="0"
                autoFocus
              />
              <Button 
                onClick={handleScoreSubmit}
                disabled={!currentInput.trim()}
                className="px-8"
              >
                다음
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 이전 단계 버튼 */}
      {scoringGuide.currentStep > 0 && (
        <div className="flex justify-between">
          <Button 
            onClick={scoringGuide.goToPreviousStep}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            이전 단계
          </Button>
          
          {/* 현재까지의 총점 표시 */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>현재 총점:</span>
            <span className="font-semibold text-foreground">
              {scoringGuide.totalScore}점
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
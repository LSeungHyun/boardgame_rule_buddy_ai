'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { generateBGGQueries, getTranslationDebugInfo, enhancedTranslator } from '@/lib/enhanced-translator';

interface TranslationInfo {
    korean: string;
    english: string;
    confidence: number;
    source: string;
    fallbacks: string[];
}

interface QueryResult {
    queries: string[];
    keywords: string[];
    gameSpecific: boolean;
    confidence: number;
}

interface TranslationDebuggerProps {
    onGoBack: () => void;
}

export default function TranslationDebugger({ onGoBack }: TranslationDebuggerProps) {
    const [question, setQuestion] = useState('아크노바에서 코뿔소 관철 능력이 어떻게 작동해?');
    const [gameTitle, setGameTitle] = useState('아크 노바');
    const [results, setResults] = useState<{
        translations: TranslationInfo[];
        queryResult: QueryResult | null;
        debugInfo: any;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const testTranslation = async () => {
        setIsLoading(true);
        try {
            console.log('🧪 번역 테스트 시작:', { question, gameTitle });

            // 1. BGG 쿼리 생성
            const queryResult = generateBGGQueries(question, gameTitle);

            // 2. 개별 용어 번역 테스트
            const testTerms = ['관철', '코뿔소', '능력', '카드', '액션', '효과'];
            const translations: TranslationInfo[] = [];

            testTerms.forEach(term => {
                if (question.includes(term)) {
                    const translation = enhancedTranslator.translate(term, gameTitle);
                    if (translation) {
                        translations.push({
                            korean: term,
                            english: translation.primary,
                            confidence: translation.confidence,
                            source: translation.source,
                            fallbacks: translation.fallbacks
                        });
                    }
                }
            });

            // 3. 디버그 정보
            const debugInfo = getTranslationDebugInfo();

            setResults({
                translations,
                queryResult,
                debugInfo
            });

            console.log('✅ 번역 테스트 완료:', {
                translations: translations.length,
                queries: queryResult.queries.length,
                keywords: queryResult.keywords.length
            });

        } catch (error) {
            console.error('❌ 번역 테스트 실패:', error);
            setResults(null);
        } finally {
            setIsLoading(false);
        }
    };

    const testCriticalCases = () => {
        const criticalTests = [
            { question: '아크노바에서 코뿔소 관철 능력이 어떻게 작동해?', game: '아크 노바' },
            { question: '윙스팬에서 새 카드 드로우는 언제 해?', game: '윙스팬' },
            { question: '글룸헤이븐에서 독 상태가 어떻게 작동해?', game: '글룸헤이븐' },
            { question: '도미니언에서 덱을 트래시하는 방법은?', game: '도미니언' },
            { question: '팬데믹에서 발병이 일어나는 조건은?', game: '팬데믹' }
        ];

        const randomTest = criticalTests[Math.floor(Math.random() * criticalTests.length)];
        setQuestion(randomTest.question);
        setGameTitle(randomTest.game);
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                        <CardTitle className="flex items-center gap-2">
                            🔍 통합 매핑 시스템 테스트
                            <Badge variant="outline">Enhanced Translator</Badge>
                        </CardTitle>
                        <Button 
                            variant="outline" 
                            onClick={onGoBack}
                            className="flex items-center gap-2"
                        >
                            ← 돌아가기
                        </Button>
                    </div>
                    <CardDescription>
                        GPT + GEMINI 통합 번역 시스템과 BGG 검색 쿼리 생성을 테스트합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="gameTitle">게임 제목</Label>
                            <Input
                                id="gameTitle"
                                value={gameTitle}
                                onChange={(e) => setGameTitle(e.target.value)}
                                placeholder="예: 아크 노바"
                            />
                        </div>
                        <div>
                            <Label htmlFor="question">질문</Label>
                            <Textarea
                                id="question"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="보드게임 관련 질문을 입력하세요"
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={testTranslation}
                            disabled={isLoading || !question.trim() || !gameTitle.trim()}
                            className="flex-1"
                        >
                            {isLoading ? '분석 중...' : '🧪 번역 테스트 실행'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={testCriticalCases}
                            disabled={isLoading}
                        >
                            🎯 Critical Case 테스트
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {results && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 번역 결과 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>🔤 용어 번역 결과</CardTitle>
                            <CardDescription>질문에서 감지된 용어들의 번역 정보</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {results.translations.length > 0 ? (
                                <div className="space-y-3">
                                    {results.translations.map((translation, index) => (
                                        <div key={index} className="p-3 border rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{translation.korean}</span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="font-medium text-blue-600">{translation.english}</span>
                                                </div>
                                                <Badge variant={translation.source === 'gpt' ? 'default' : 'secondary'}>
                                                    {translation.source.toUpperCase()}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <div>신뢰도: {(translation.confidence * 100).toFixed(0)}%</div>
                                                {translation.fallbacks.length > 0 && (
                                                    <div>
                                                        Fallbacks: {translation.fallbacks.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    번역된 용어가 없습니다.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* BGG 검색 쿼리 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>🔍 BGG 검색 쿼리</CardTitle>
                            <CardDescription>
                                생성된 검색 쿼리 ({results.queryResult?.queries.length || 0}개)
                                {results.queryResult?.gameSpecific && (
                                    <Badge variant="outline" className="ml-2">게임 특화</Badge>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {results.queryResult && results.queryResult.queries.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="mb-4">
                                        <div className="text-sm font-medium mb-2">추출된 키워드:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {results.queryResult.keywords.map((keyword, index) => (
                                                <Badge key={index} variant="outline">{keyword}</Badge>
                                            ))}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-2">
                                            신뢰도: {(results.queryResult.confidence * 100).toFixed(0)}%
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">검색 쿼리 목록:</div>
                                        {results.queryResult.queries.map((query, index) => (
                                            <div key={index} className="p-2 bg-gray-50 rounded text-sm font-mono">
                                                {index + 1}. {query}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    생성된 검색 쿼리가 없습니다.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 시스템 정보 */}
            {results?.debugInfo && (
                <Card>
                    <CardHeader>
                        <CardTitle>🔧 시스템 정보</CardTitle>
                        <CardDescription>Enhanced Translator 내부 상태</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="p-3 border rounded">
                                <div className="text-2xl font-bold text-blue-600">
                                    {results.debugInfo.unifiedMappingSize}
                                </div>
                                <div className="text-sm text-gray-600">통합 용어</div>
                            </div>
                            <div className="p-3 border rounded">
                                <div className="text-2xl font-bold text-green-600">
                                    {results.debugInfo.gameSpecificMappingsSize}
                                </div>
                                <div className="text-sm text-gray-600">게임별 매핑</div>
                            </div>
                            <div className="p-3 border rounded">
                                <div className="text-2xl font-bold text-purple-600">
                                    {results.debugInfo.gameList.length}
                                </div>
                                <div className="text-sm text-gray-600">지원 게임</div>
                            </div>
                            <div className="p-3 border rounded">
                                <div className="text-2xl font-bold text-orange-600">
                                    {results.debugInfo.sampleMappings.length}
                                </div>
                                <div className="text-sm text-gray-600">샘플 매핑</div>
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <div>
                            <div className="text-sm font-medium mb-2">지원 게임 목록 (처음 10개):</div>
                            <div className="flex flex-wrap gap-1">
                                {results.debugInfo.gameList.slice(0, 10).map((game: string, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs">{game}</Badge>
                                ))}
                                {results.debugInfo.gameList.length > 10 && (
                                    <Badge variant="secondary" className="text-xs">
                                        +{results.debugInfo.gameList.length - 10}개 더
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 
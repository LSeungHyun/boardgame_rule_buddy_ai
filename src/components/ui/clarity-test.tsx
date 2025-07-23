'use client';

import React, { useState, useEffect } from 'react';
import { useAnalytics, useClarityTracking } from '@/lib/analytics';
import { Button } from './button';
import { Card, CardHeader, CardContent, CardTitle } from './card';

/**
 * Microsoft Clarity 기능을 테스트하기 위한 컴포넌트
 * 개발 환경에서만 표시됩니다
 */
export const ClarityTest: React.FC = () => {
    const { isClarityLoaded, clarityEvent, claritySetTag } = useAnalytics();
    const { trackUserBehavior, setCustomTag, upgradeSession } = useClarityTracking();

    const [testResults, setTestResults] = useState<Record<string, boolean>>({});
    const [clarityStatus, setClarityStatus] = useState<string>('확인 중...');
    const [isExpanded, setIsExpanded] = useState<boolean>(false); // 토글 상태 추가

    // 프로덕션 환경에서는 렌더링하지 않음
    if (process.env.NODE_ENV === 'production') {
        return null;
    }

    // Clarity 상태 확인
    useEffect(() => {
        const checkClarityStatus = () => {
            if (typeof window === 'undefined') {
                setClarityStatus('서버 사이드');
                return;
            }

            if (!window.clarity) {
                setClarityStatus('로드되지 않음');
                return;
            }

            if (typeof window.clarity === 'function') {
                setClarityStatus('로드 완료 ✅');
            } else {
                setClarityStatus('부분 로드 ⚠️');
            }
        };

        checkClarityStatus();

        // 주기적으로 상태 확인
        const interval = setInterval(checkClarityStatus, 1000);
        return () => clearInterval(interval);
    }, []);

    const executeTest = async (testName: string, testFn: () => void) => {
        try {
            console.log(`🧪 [테스트 시작] ${testName}`);
            testFn();
            setTestResults(prev => ({ ...prev, [testName]: true }));
            console.log(`✅ [테스트 성공] ${testName}`);
        } catch (error) {
            console.error(`❌ [테스트 실패] ${testName}:`, error);
            setTestResults(prev => ({ ...prev, [testName]: false }));
        }
    };

    const handleBasicEvent = () => {
        executeTest('basic_event', () => {
            clarityEvent('test_basic_event');
        });
    };

    const handleCustomTag = () => {
        executeTest('custom_tag', () => {
            claritySetTag('test_tag', 'test_value');
            setCustomTag('user_action', 'tag_test');
        });
    };

    const handleUserBehavior = () => {
        executeTest('user_behavior', () => {
            trackUserBehavior('test_behavior', {
                action: 'button_click',
                component: 'clarity_test',
                timestamp: new Date().toISOString()
            });
        });
    };

    const handleUpgradeSession = () => {
        executeTest('session_upgrade', () => {
            upgradeSession('test_session_upgrade');
        });
    };

    const getButtonVariant = (testName: string) => {
        if (testResults[testName] === true) return 'default';
        if (testResults[testName] === false) return 'destructive';
        return 'outline';
    };

    const getTestIcon = (testName: string) => {
        if (testResults[testName] === true) return '✅';
        if (testResults[testName] === false) return '❌';
        return '🧪';
    };

    // 접힌 상태일 때 작은 토글 버튼만 표시
    if (!isExpanded) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <Button
                    onClick={() => setIsExpanded(true)}
                    size="sm"
                    variant="outline"
                    className="bg-background border shadow-lg hover:shadow-xl transition-shadow"
                >
                    🧪
                </Button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <Card className="w-80 shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                            🧪 Clarity 테스트 패널
                        </CardTitle>
                        <Button
                            onClick={() => setIsExpanded(false)}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                        >
                            ✕
                        </Button>
                    </div>
                    <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Clarity 상태:</span>
                            <span className="font-mono">{clarityStatus}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Provider 로드:</span>
                            <span className={`font-mono ${isClarityLoaded ? 'text-green-600' : 'text-red-600'}`}>
                                {isClarityLoaded ? 'TRUE' : 'FALSE'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Window.clarity:</span>
                            <span className="font-mono">
                                {typeof window !== 'undefined' && window.clarity ? 'EXISTS' : 'MISSING'}
                            </span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-2">
                    <Button
                        onClick={handleBasicEvent}
                        size="sm"
                        variant={getButtonVariant('basic_event')}
                        className="w-full text-xs"
                    >
                        {getTestIcon('basic_event')} 기본 이벤트 테스트
                    </Button>

                    <Button
                        onClick={handleCustomTag}
                        size="sm"
                        variant={getButtonVariant('custom_tag')}
                        className="w-full text-xs"
                    >
                        {getTestIcon('custom_tag')} 커스텀 태그 테스트
                    </Button>

                    <Button
                        onClick={handleUserBehavior}
                        size="sm"
                        variant={getButtonVariant('user_behavior')}
                        className="w-full text-xs"
                    >
                        {getTestIcon('user_behavior')} 사용자 행동 추적 테스트
                    </Button>

                    <Button
                        onClick={handleUpgradeSession}
                        size="sm"
                        variant={getButtonVariant('session_upgrade')}
                        className="w-full text-xs"
                    >
                        {getTestIcon('session_upgrade')} 세션 업그레이드 테스트
                    </Button>

                    <div className="text-xs text-gray-500 mt-2 space-y-1">
                        <div>🔍 개발자 콘솔에서 상세 로그 확인</div>
                        <div>✅ = 성공, ❌ = 실패, 🧪 = 미테스트</div>
                    </div>

                    <Button
                        onClick={() => {
                            setTestResults({});
                            console.clear();
                            console.log('🧹 테스트 결과 및 콘솔 초기화');
                        }}
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs mt-2"
                    >
                        🧹 결과 초기화
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}; 
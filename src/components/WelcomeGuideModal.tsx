'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface WelcomeGuideModalProps {
    isOpen: boolean;
    onClose: (dontShowAgain: boolean) => void;
}

export default function WelcomeGuideModal({ isOpen, onClose }: WelcomeGuideModalProps) {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleClose = () => {
        onClose(dontShowAgain);
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
            <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-center mb-2">
                        룰마스터 AI에 오신 것을 환영합니다! (Beta)
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-4 text-sm text-muted-foreground">
                            <p className="text-center">
                                안녕하세요! 세상 모든 보드게임 규칙이 궁금할 때, AI에게 바로 물어보세요.
                            </p>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* 사용법 안내 */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            🚀 사용법 안내:
                        </h3>
                        <ol className="space-y-2 text-sm">
                            <li className="flex gap-2">
                                <span className="font-medium text-blue-600">1.</span>
                                <span>
                                    <strong>먼저, 알고 싶은 게임의 이름</strong>을 알려주세요.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-medium text-blue-600">2.</span>
                                <span>
                                    AI가 게임을 인지하면, <strong>궁금한 점을 자유롭게 질문</strong>하거나{' '}
                                    <strong>빠른 질문 버튼</strong>을 이용해 보세요.
                                </span>
                            </li>
                        </ol>
                    </div>

                    {/* AI 지식 수준 */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            🧠 AI의 지식 수준:
                        </h3>
                        <ul className="space-y-2 text-sm">
                            <li className="flex gap-2">
                                <span className="text-green-600">•</span>
                                <span>
                                    <strong>2023년까지 출시된 대부분의 게임</strong>은 자신있게 답변해요.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-amber-600">•</span>
                                <span>
                                    <strong>2024년 이후 최신 게임</strong>은 아직 배우는 중이라, 답변의 정확도가 낮거나
                                    정보를 찾지 못할 수 있어요.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-blue-600">•</span>
                                <span>
                                    AI의 답변 품질은 여러분의 피드백을 통해 계속해서 발전합니다!
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                    <div className="flex items-center space-x-2 order-2 sm:order-1">
                        <Checkbox
                            id="dont-show-again"
                            checked={dontShowAgain}
                            onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-2"
                        />
                        <label
                            htmlFor="dont-show-again"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                            오늘 하루 그만보기
                        </label>
                    </div>
                    <Button
                        onClick={handleClose}
                        className="order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 text-white px-6"
                    >
                        확인하고 시작하기
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 
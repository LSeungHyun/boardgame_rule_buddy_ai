/**
 * MVP 피드백 모달 컴포넌트
 * 
 * 앱 전체에서 사용할 수 있는 범용 피드백 수집 모달입니다.
 * 다양한 상황에서 사용자 피드백을 쉽게 수집할 수 있도록 설계되었습니다.
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Send, X, MessageSquare } from 'lucide-react';

// 폼 검증 스키마
const feedbackFormSchema = z.object({
    content: z.string()
        .min(5, '최소 5자 이상 입력해주세요')
        .max(1000, '최대 1000자까지 입력 가능합니다')
});

type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

interface FeedbackModalProps {
    /** 모달 열림/닫힘 상태 */
    isOpen: boolean;
    /** 모달 닫기 함수 */
    onClose: () => void;
    /** 피드백 출처 식별자 (예: 'game_not_found', 'answer_unhelpful') */
    feedbackSource: string;
    /** 피드백과 관련된 상황 정보 */
    context?: Record<string, any>;
    /** 모달 제목 (선택사항) */
    title?: string;
    /** 모달 설명 (선택사항) */
    description?: string;
}

export default function FeedbackModal({
    isOpen,
    onClose,
    feedbackSource,
    context = {},
    title = '피드백 보내기',
    description = '문제점이나 개선사항을 알려주세요. 소중한 의견을 반영하여 더 나은 서비스를 제공하겠습니다.'
}: FeedbackModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch
    } = useForm<FeedbackFormData>({
        resolver: zodResolver(feedbackFormSchema)
    });

    // 텍스트 영역 글자 수 카운트
    const contentValue = watch('content', '');
    const contentLength = contentValue?.length || 0;

    // 피드백 제출 처리
    const onSubmit = async (data: FeedbackFormData) => {
        if (isSubmitting) return;

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/feedback/mvp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    feedback_source: feedbackSource,
                    content: data.content,
                    context: {
                        ...context,
                        timestamp: new Date().toISOString()
                        // 개인정보 보호를 위해 page_url 수집 제거
                    }
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "피드백 감사합니다! 🎉",
                    description: "소중한 의견을 잘 전달받았습니다. 더 나은 서비스를 위해 활용하겠습니다.",
                });

                // 폼 초기화 및 모달 닫기
                reset();
                onClose();
            } else {
                throw new Error(result.error?.message || '피드백 제출에 실패했습니다.');
            }
        } catch (error) {
            console.error('❌ 피드백 제출 오류:', error);
            toast({
                title: "전송 실패",
                description: "피드백 전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // 모달 닫기 처리 (폼 초기화 포함)
    const handleClose = () => {
        if (!isSubmitting) {
            reset();
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="feedback-content" className="text-sm font-medium">
                            피드백 내용 *
                        </Label>
                        <div className="relative">
                            <Textarea
                                id="feedback-content"
                                {...register('content')}
                                placeholder="어떤 부분이 문제였나요? 또는 어떤 기능이 개선되었으면 좋겠나요?"
                                className="min-h-[120px] resize-none pr-16"
                                disabled={isSubmitting}
                            />
                            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                {contentLength}/1000
                            </div>
                        </div>
                        {errors.content && (
                            <p className="text-sm text-destructive">{errors.content.message}</p>
                        )}
                    </div>

                    {/* 피드백 소스 정보 (개발/디버깅용) */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            <strong>디버그 정보:</strong> {feedbackSource}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button
                            type="submit"
                            disabled={isSubmitting || contentLength < 5}
                            className="flex-1"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    전송 중...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Send className="w-4 h-4" />
                                    피드백 제출하기
                                </div>
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </form>

                <div className="text-xs text-muted-foreground border-t pt-3">
                    💡 <strong>팁:</strong> 구체적인 상황이나 단계를 알려주시면 더 빠르게 개선할 수 있습니다.
                </div>
            </DialogContent>
        </Dialog>
    );
}

/**
 * 피드백 모달을 쉽게 사용할 수 있는 훅
 * 
 * @example
 * ```tsx
 * const { showFeedback, FeedbackModalComponent } = useFeedbackModal();
 * 
 * const handleGameNotFound = () => {
 *   showFeedback('game_not_found', { gameName: '스플렌더' });
 * };
 * 
 * return (
 *   <div>
 *     <button onClick={handleGameNotFound}>게임을 찾을 수 없음</button>
 *     {FeedbackModalComponent}
 *   </div>
 * );
 * ```
 */
export function useFeedbackModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [feedbackSource, setFeedbackSource] = useState('');
    const [context, setContext] = useState<Record<string, any>>({});
    const [title, setTitle] = useState<string>();
    const [description, setDescription] = useState<string>();

    const showFeedback = (
        source: string,
        contextData: Record<string, any> = {},
        modalTitle?: string,
        modalDescription?: string
    ) => {
        setFeedbackSource(source);
        setContext(contextData);
        setTitle(modalTitle);
        setDescription(modalDescription);
        setIsOpen(true);
    };

    const hideFeedback = () => {
        setIsOpen(false);
    };

    const FeedbackModalComponent = (
        <FeedbackModal
            isOpen={isOpen}
            onClose={hideFeedback}
            feedbackSource={feedbackSource}
            context={context}
            title={title}
            description={description}
        />
    );

    return {
        showFeedback,
        hideFeedback,
        FeedbackModalComponent,
        isOpen
    };
} 
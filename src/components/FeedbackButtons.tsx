'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { FeedbackButtonsProps, FeedbackType, FeedbackState } from '@/types/feedback';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface FeedbackReasonForm {
  reason: string;
}

export default function FeedbackButtons({
  messageId,
  gameId,
  question,
  answer,
  onFeedbackSubmitted
}: FeedbackButtonsProps) {
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackType | null>(null);
  const [showReasonForm, setShowReasonForm] = useState(false);
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FeedbackReasonForm>();

  // 피드백 제출 처리
  const handleFeedbackSubmit = async (feedbackType: FeedbackType, reason?: string) => {
    if (feedbackState === 'submitting') return;

    setFeedbackState('submitting');
    setSelectedFeedback(feedbackType);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          feedbackType,
          gameId,
          question,
          answer,
          feedbackReason: reason
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFeedbackState('submitted');
        toast({
          title: "피드백 감사합니다!",
          description: "소중한 의견을 반영하여 더 나은 서비스를 제공하겠습니다.",
        });
        onFeedbackSubmitted?.();
      } else {
        throw new Error(result.error?.message || '피드백 제출에 실패했습니다.');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      setFeedbackState('idle');
      setSelectedFeedback(null);
      toast({
        title: "오류 발생",
        description: "피드백 제출 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  // 피드백 버튼 클릭 처리
  const handleFeedbackClick = (feedbackType: FeedbackType) => {
    if (feedbackType === 'unhelpful') {
      setShowReasonForm(true);
      setSelectedFeedback(feedbackType);
    } else {
      handleFeedbackSubmit(feedbackType);
    }
  };

  // 피드백 이유 제출 처리
  const onSubmitReason = handleSubmit((data) => {
    handleFeedbackSubmit('unhelpful', data.reason);
    setShowReasonForm(false);
    reset();
  });

  // 이미 제출된 경우
  if (feedbackState === 'submitted') {
    return (
      <div className="mt-3 pt-2 border-t border-amber-400/20">
        <div className="text-xs text-emerald-300 flex items-center gap-1">
          <span>✨</span>
          <span>피드백 감사합니다!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-2 border-t border-amber-400/20">
      {/* 피드백 버튼 */}
      {!showReasonForm && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-amber-200/80">이 답변이 도움이 되었나요?</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedbackClick('helpful')}
              disabled={feedbackState === 'submitting'}
              className="p-1.5 hover:bg-emerald-500/20 rounded-lg transition-all duration-200 hover:scale-110 border border-transparent hover:border-emerald-400/30 group"
              title="도움됨"
            >
              <ThumbsUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedbackClick('unhelpful')}
              disabled={feedbackState === 'submitting'}
              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-all duration-200 hover:scale-110 border border-transparent hover:border-red-400/30 group"
              title="도움 안됨"
            >
              <ThumbsDown className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
            </Button>
          </div>
        </div>
      )}

      {/* 피드백 이유 입력 폼 */}
      {showReasonForm && (
        <div className="space-y-2">
          <p className="text-xs text-amber-200/80">어떤 부분이 도움이 되지 않았나요?</p>
          <form onSubmit={onSubmitReason} className="space-y-2">
            <Textarea
              {...register('reason', {
                required: '피드백 이유를 입력해주세요.',
                minLength: {
                  value: 5,
                  message: '최소 5자 이상 입력해주세요.'
                },
                maxLength: {
                  value: 500,
                  message: '최대 500자까지 입력 가능합니다.'
                }
              })}
              placeholder="답변이 부족했거나 잘못된 정보가 있었나요? 구체적으로 알려주세요."
              className="min-h-[80px] text-xs bg-amber-950/20 border-amber-400/30 text-amber-100 placeholder:text-amber-300/50"
              disabled={feedbackState === 'submitting'}
            />
            {errors.reason && (
              <p className="text-xs text-red-400">{errors.reason.message}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={feedbackState === 'submitting'}
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1"
              >
                {feedbackState === 'submitting' ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3 h-3 mr-1" />
                    보내기
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowReasonForm(false);
                  setSelectedFeedback(null);
                  reset();
                }}
                disabled={feedbackState === 'submitting'}
                className="text-xs px-3 py-1 border-amber-400/30 text-amber-300 hover:bg-amber-400/10"
              >
                취소
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 
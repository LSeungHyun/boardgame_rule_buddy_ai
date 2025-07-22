/**
 * 피드백 버튼 컴포넌트
 * 사용자가 AI 답변에 대한 피드백을 제공할 수 있도록 합니다.
 * 👍/👎 버튼과 선택적 피드백 이유 입력을 지원합니다.
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  API_ENDPOINTS, 
  FEEDBACK_STATES, 
  UI_LABELS, 
  type FeedbackState 
} from '@/lib/constants';

interface FeedbackButtonsProps {
  /** 메시지 고유 ID */
  messageId: string;
  /** 게임 ID */
  gameId: string;
  /** 사용자 질문 */
  question: string;
  /** AI 답변 (전체 JSON 문자열) */
  answer: string;
  /** 피드백 제출 완료 콜백 */
  onFeedbackSubmitted?: () => void;
}

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
  const [feedbackState, setFeedbackState] = useState<FeedbackState>(FEEDBACK_STATES.IDLE);
  const [selectedFeedback, setSelectedFeedback] = useState<'helpful' | 'unhelpful' | null>(null);
  const [showReasonForm, setShowReasonForm] = useState(false);
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FeedbackReasonForm>();

  // 피드백 제출 처리
  const handleFeedbackSubmit = async (feedbackType: 'helpful' | 'unhelpful', reason?: string) => {
    if (feedbackState === FEEDBACK_STATES.SUBMITTING) return;

    setFeedbackState(FEEDBACK_STATES.SUBMITTING);
    setSelectedFeedback(feedbackType);

    try {
      const response = await fetch(API_ENDPOINTS.FEEDBACK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_id: messageId,
          game_id: gameId,
          question,
          answer,
          feedback_type: feedbackType,
          feedback_reason: reason || null,
          timestamp: new Date().toISOString()
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFeedbackState(FEEDBACK_STATES.SUBMITTED);
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
      setFeedbackState(FEEDBACK_STATES.ERROR);
      setSelectedFeedback(null);
      toast({
        title: "오류 발생",
        description: UI_LABELS.FEEDBACK.ERROR,
        variant: "destructive",
      });
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setFeedbackState(FEEDBACK_STATES.IDLE);
      }, 3000);
    }
  };

  // 피드백 버튼 클릭 처리
  const handleFeedbackClick = (feedbackType: 'helpful' | 'unhelpful') => {
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
  if (feedbackState === FEEDBACK_STATES.SUBMITTED) {
    return (
      <div className="mt-3 pt-2 border-t border-amber-400/20">
        <div className="text-xs text-emerald-300 flex items-center gap-1">
          <span>✨</span>
          <span>{UI_LABELS.FEEDBACK.SUBMITTED}</span>
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
              disabled={feedbackState === FEEDBACK_STATES.SUBMITTING}
              className="p-1.5 hover:bg-emerald-500/20 rounded-lg transition-all duration-200 hover:scale-110 border border-transparent hover:border-emerald-400/30 group"
              title="도움됨"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">
                {UI_LABELS.FEEDBACK.LIKE}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedbackClick('unhelpful')}
              disabled={feedbackState === FEEDBACK_STATES.SUBMITTING}
              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-all duration-200 hover:scale-110 border border-transparent hover:border-red-400/30 group"
              title="도움 안됨"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">
                {UI_LABELS.FEEDBACK.DISLIKE}
              </span>
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
              placeholder={UI_LABELS.FEEDBACK.PLACEHOLDER}
              className="min-h-[80px] text-xs bg-amber-950/20 border-amber-400/30 text-amber-100 placeholder:text-amber-300/50"
              disabled={feedbackState === FEEDBACK_STATES.SUBMITTING}
            />
            {errors.reason && (
              <p className="text-xs text-red-400">{errors.reason.message}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={feedbackState === FEEDBACK_STATES.SUBMITTING}
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1"
              >
                {feedbackState === FEEDBACK_STATES.SUBMITTING ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3 h-3 mr-1" />
                    {UI_LABELS.FEEDBACK.SUBMIT}
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
                disabled={feedbackState === FEEDBACK_STATES.SUBMITTING}
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
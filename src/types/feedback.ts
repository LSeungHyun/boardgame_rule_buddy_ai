export type FeedbackType = 'helpful' | 'unhelpful';

export type FeedbackState = 'idle' | 'submitting' | 'submitted';

export interface FeedbackData {
  messageId: string;
  feedbackType: FeedbackType;
  gameId: string;
  question: string;
  answer: string;
  feedbackReason?: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    createdAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface FeedbackButtonsProps {
  messageId: string;
  gameId: string;
  question: string;
  answer: string;
  onFeedbackSubmitted?: () => void;
} 
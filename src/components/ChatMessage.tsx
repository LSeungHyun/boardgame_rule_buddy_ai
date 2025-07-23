'use client';

import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { ChatMessageProps } from '@/types/game';
import FeedbackButtons from './FeedbackButtons';
import { AnswerDisplay } from './ui/answer-display';
import { QuestionRecommendations } from './ui/question-recommendations';
import { GameQuickActions } from './ui/game-quick-actions';
import SetupGuideDisplay from './answers/SetupGuideDisplay';
import { generateRecommendedQuestions, generateGameSpecificQuestions, filterDuplicateQuestions, type RecommendedQuestion } from '@/lib/question-recommender';

/**
 * 간단한 질문인지 판단하는 함수
 * 간단한 질문에는 구조화된 답변보다 자연스러운 답변이 더 적합함
 */
function isSimpleQuestion(question?: string, answer?: string): boolean {
    if (!question) return false;

    const simpleKeywords = [
        '기본 규칙', '목표', '요약', '몇명', '인원', '플레이어', '시간', '나이',
        '간단히', '짧게', '개요', '소개', '뭐야', '뭔가요', '어떤', '무엇',
        '얼마나', '언제', '어디서', '누가', '왜'
    ];

    const questionLower = question.toLowerCase();
    const hasSimpleKeyword = simpleKeywords.some(keyword =>
        questionLower.includes(keyword) || question.includes(keyword)
    );

    // 질문이 짧고 간단한 키워드를 포함하는 경우
    const isShortQuestion = question.length < 50;

    // 답변이 너무 길지 않은 경우 (구조화가 필요하지 않음)
    const isShortAnswer = answer ? answer.length < 500 : true;

    return (hasSimpleKeyword && isShortQuestion) || (isShortQuestion && isShortAnswer);
}

/**
 * 셋업 가이드 관련 내용인지 판단하는 함수
 * 셋업 가이드 관련 내용에는 전용 SetupGuideDisplay 컴포넌트를 사용
 */
function isSetupGuideContent(question?: string, answer?: string): boolean {
    if (!question && !answer) return false;

    const setupKeywords = [
        '셋업', '준비', '게임 준비', '설치', '배치', '세팅', '초기 설정',
        '게임 시작', '시작 전', '준비물', '구성 요소', '보드 준비',
        '카드 배치', '토큰 배치', '말 배치', '컴포넌트 준비'
    ];

    const questionText = (question || '').toLowerCase();
    const answerText = (answer || '').toLowerCase();

    // 질문이나 답변에 셋업 관련 키워드가 포함되어 있는지 확인
    const hasSetupKeyword = setupKeywords.some(keyword =>
        questionText.includes(keyword) || answerText.includes(keyword) ||
        (question || '').includes(keyword) || (answer || '').includes(keyword)
    );

    // 답변에 마크다운 헤더(###, ####)와 리스트가 포함되어 있고 셋업 관련 내용인 경우
    const hasMarkdownStructure = answer && (
        answer.includes('###') || answer.includes('####')
    ) && answer.includes('*');

    return hasSetupKeyword && hasMarkdownStructure;
}

export default function ChatMessage({ message, game, userQuestion, onQuestionClick }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const [showSources, setShowSources] = useState(false);
    const [recommendedQuestions, setRecommendedQuestions] = useState<RecommendedQuestion[]>([]);

    // 사용자와 AI 메시지 스타일 구분
    const bubbleClass = isUser
        ? 'btn-game-primary self-end shadow-lg border border-amber-400/20'
        : 'glass-card self-start shadow-lg border border-amber-400/20';

    const sanitizedHtml = message.role === 'assistant' ? marked(message.content) : message.content;

    // 환영 메시지는 피드백 제외
    const isWelcomeMessage = message.role === 'assistant' &&
        (message.content.includes('룰 마스터입니다') || message.content.includes('무엇이든 물어보세요'));

    // 첫 번째 게임 답변인지 확인 (게임 전문 룰마스터 소개 메시지 또는 Universal Rule Master Beta 첫 답변)
    const isFirstGameAnswer = message.role === 'assistant' && (
        // Expert 모드: 게임 전문 룰마스터 소개
        (message.content.includes('전문 룰 마스터') &&
            (message.content.includes('정확하고 상세한 답변') || message.content.includes('게임 규칙과 메커니즘'))) ||
        // Beta 모드: Universal Rule Master (Beta) 첫 답변
        (message.content.includes('Universal Rule Master (Beta)') &&
            message.content.includes('베타 서비스 안내') &&
            message.content.includes('도움을 드릴 수 있어서 기쁩니다'))
    );

    // 메시지 ID 생성 (실제 구현에서는 고유한 ID를 사용해야 함)
    const messageId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // 관련 질문 추천 생성 (AI 답변이고 환영 메시지가 아닐 때)
    useEffect(() => {
        if (message.role === 'assistant' && !isWelcomeMessage && userQuestion && onQuestionClick) {
            const context = {
                originalQuestion: userQuestion,
                answer: message.content,
                gameTitle: game?.title,
                gameId: game?.gameId
            };

            // 기본 추천 질문 생성
            let questions = generateRecommendedQuestions(context);

            // 게임별 특화 질문 추가
            if (game?.title) {
                const gameSpecific = generateGameSpecificQuestions(game.title, message.content);
                questions = [...questions, ...gameSpecific];
            }

            // 중복 제거 및 최종 필터링
            const filteredQuestions = filterDuplicateQuestions(questions);
            setRecommendedQuestions(filteredQuestions.slice(0, 4)); // 최대 4개
        }
    }, [message.content, userQuestion, game?.title, game?.gameId, isWelcomeMessage, onQuestionClick]);

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} flex-col`}>
            <div className={`max-w-md lg:max-w-2xl rounded-2xl px-4 py-3 ${bubbleClass} relative transition-all duration-200 hover:shadow-xl hover:border-amber-400/40 ${isUser ? 'self-end' : 'self-start'}`}>

                {/* 메시지 아바타 */}
                {!isUser && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-400/20">
                        <span className="text-lg">📖</span>
                        <span className="text-xs font-medium text-amber-300">룰 마스터</span>
                    </div>
                )}

                {/* 메인 메시지 내용 */}
                {message.role === 'assistant' ? (
                    isWelcomeMessage || isSimpleQuestion(userQuestion, message.content) ? (
                        <div className="markdown-content prose prose-invert prose-sm max-w-none text-amber-100"
                            dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                    ) : isSetupGuideContent(userQuestion, message.content) ? (
                        <SetupGuideDisplay content={message.content} />
                    ) : (
                        <AnswerDisplay content={message.content} />
                    )
                ) : (
                    <p className="font-medium text-amber-900 leading-relaxed">
                        {message.content.replace('[FORCE_RESEARCH]', '').trim()}
                    </p>
                )}

                {/* 리서치 정보 (개발 환경에서만 표시) */}
                {process.env.NODE_ENV === 'development' && message.role === 'assistant' && message.researchUsed && (
                    <div className="mt-3 pt-2 border-t border-amber-400/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-amber-400">🔍</span>
                                <span className="text-amber-300 font-medium">
                                    웹 리서치 활용 {message.fromCache ? '(캐시)' : ''}
                                </span>
                                {message.complexity && (
                                    <span className="bg-amber-600/30 text-amber-200 px-2 py-1 rounded-full text-[10px] border border-amber-400/30">
                                        복잡도 {message.complexity.score}/100
                                    </span>
                                )}
                            </div>

                            {message.sources && message.sources.length > 0 && (
                                <button
                                    onClick={() => setShowSources(!showSources)}
                                    className="text-amber-400 hover:text-yellow-300 text-xs font-medium underline transition-colors"
                                >
                                    출처 {message.sources.length}개
                                </button>
                            )}
                        </div>

                        {/* 출처 목록 (토글) */}
                        {showSources && message.sources && (
                            <div className="mt-2 p-2 glass-card rounded-lg border border-amber-400/20 bg-amber-950/20">
                                <p className="text-[10px] text-amber-200 mb-1 font-medium uppercase">참고 출처</p>
                                <ul className="text-xs space-y-1">
                                    {message.sources.map((source, index) => (
                                        <li key={index} className="text-amber-300/80 hover:text-amber-200 transition-colors leading-relaxed">
                                            • {source}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* 피드백 버튼 (실질적인 답변에만) */}
                {message.role === 'assistant' && !isWelcomeMessage && (
                    <FeedbackButtons
                        messageId={messageId}
                        gameId={game?.id || 'unknown-game'}
                        question={userQuestion || '질문 정보 없음'}
                        answer={message.content}
                    />
                )}
            </div>

            {/* 환영 메시지와 첫 번째 게임 답변 아래 퀵 액션 버튼들 */}
            {message.role === 'assistant' && (isWelcomeMessage || isFirstGameAnswer) && game && onQuestionClick && (
                <div className="mt-4 w-full max-w-md lg:max-w-2xl">
                    <GameQuickActions
                        game={game}
                        onActionClick={onQuestionClick}
                    />
                </div>
            )}


        </div>
    );
} 
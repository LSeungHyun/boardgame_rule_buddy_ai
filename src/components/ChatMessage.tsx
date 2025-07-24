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
 * 셋업 가이드 관련 내용인지 판단하는 함수 (대폭 개선된 버전)
 * 더 유연하고 포괄적인 조건으로 SetupGuideDisplay 사용률 극대화
 */
function isSetupGuideContent(question?: string, answer?: string): boolean {
    if (!question && !answer) return false;

    // 확장된 셋업 관련 키워드 (더 포괄적)
    const setupKeywords = [
        // 기본 셋업 용어
        '셋업', '준비', '게임 준비', '설치', '배치', '세팅', '초기 설정',
        '게임 시작', '시작 전', '준비물', '구성 요소', '보드 준비',
        '카드 배치', '토큰 배치', '말 배치', '컴포넌트 준비',
        
        // 🔥 새로 추가된 핵심 키워드들
        '방법', '셋업 방법', '준비 방법', '게임 방법', '시작 방법',
        '어떻게', '진행', '설정', '구성', '배열', '놓기', '두기',
        '시작하기', '준비하기', '설치하기', '배치하기',
        
        // 단계별 표현
        '단계', '순서', '절차', '과정', '진행 순서', '시작 순서',
        '1단계', '첫 번째', '먼저', '처음에', '가장 먼저',
        
        // 게임 구성 요소 관련
        '타일', '카드', '보드', '말', '피스', '토큰', '마커', '주사위'
    ];

    // 더 유연한 텍스트 검사 (대소문자, 공백 무시)
    const normalizeText = (text: string) => text.replace(/\s+/g, '').toLowerCase();
    const questionNorm = normalizeText(question || '');
    const answerNorm = normalizeText(answer || '');
    const questionOriginal = (question || '').toLowerCase();
    const answerOriginal = (answer || '').toLowerCase();

    // 키워드 매칭 (더 관대한 조건)
    const hasSetupKeyword = setupKeywords.some(keyword => {
        const keywordNorm = normalizeText(keyword);
        return questionNorm.includes(keywordNorm) || 
               answerNorm.includes(keywordNorm) ||
               questionOriginal.includes(keyword) || 
               answerOriginal.includes(keyword);
    });

    // 🎯 핵심 개선: 마크다운 구조 요구사항 대폭 완화
    const hasAnyStructure = answer && (
        // 헤더가 있거나
        answer.includes('###') || answer.includes('####') || answer.includes('##') ||
        // 리스트가 있거나  
        answer.includes('*') || answer.includes('-') || answer.includes('1.') ||
        // 긴 답변이거나 (200자 이상)
        answer.length > 200 ||
        // 단계적 표현이 있으면
        answer.includes('단계') || answer.includes('순서') || answer.includes('먼저') ||
        answer.includes('다음') || answer.includes('마지막')
    );

    // 🚀 특별 조건: 셋업/준비 관련 질문이면 구조와 관계없이 적용
    const isDefiniteSetupQuestion = questionOriginal.includes('셋업') || 
                                    questionOriginal.includes('준비') ||
                                    questionOriginal.includes('방법') ||
                                    (questionOriginal.includes('게임') && questionOriginal.includes('시작'));

    // 최종 판단: 더 관대한 OR 조건
    return (hasSetupKeyword && hasAnyStructure) || isDefiniteSetupQuestion;
}

export default function ChatMessage({ message, game, userQuestion, messageIndex, onQuestionClick }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const [showSources, setShowSources] = useState(false);
    const [recommendedQuestions, setRecommendedQuestions] = useState<RecommendedQuestion[]>([]);

    // 사용자와 AI 메시지 스타일 구분
    const bubbleClass = isUser
        ? 'btn-game-primary self-end shadow-lg border border-amber-400/20'
        : 'glass-card self-start shadow-lg border border-amber-400/20';

    const sanitizedHtml = message.role === 'assistant' ? marked(message.content) : message.content;

    // 환경 메시지는 피드백 제외 - 진짜 간단한 환영 메시지만 해당
    const isWelcomeMessage = message.role === 'assistant' &&
        message.content.includes('무엇이든 물어보세요') && 
        !message.content.includes('룰 마스터입니다') &&
        !message.content.includes('Universal Rule Master (Beta)');

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

                {/* 메인 메시지 내용 - 향상된 조건부 렌더링 */}
                {message.role === 'assistant' ? (
                    isWelcomeMessage || isSimpleQuestion(userQuestion, message.content) ? (
                        <div className="markdown-content prose prose-invert prose-sm max-w-none text-amber-100"
                            dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                    ) : isSetupGuideContent(userQuestion, message.content) ? (
                        <SetupGuideDisplay content={message.content} />
                    ) : (
                        // 🛡️ 폴백 로직: 혹시 놓친 셋업 관련 내용 최종 검사
                        (() => {
                            const contentLower = message.content.toLowerCase();
                            const questionLower = (userQuestion || '').toLowerCase();
                            
                            // 추가 셋업 패턴 감지 (매우 관대한 조건)
                            const isLikelySetup = 
                                // 질문에 게임명 + 방법/준비가 있는 경우
                                (questionLower.includes('방법') || questionLower.includes('준비') || 
                                 questionLower.includes('셋업') || questionLower.includes('시작')) ||
                                // 답변이 단계적 구조를 가지는 경우
                                (contentLower.includes('단계') || contentLower.includes('순서') ||
                                 message.content.includes('1.') || message.content.includes('2.') ||
                                 contentLower.includes('먼저') || contentLower.includes('다음')) ||
                                // 답변이 충분히 길어서 구조화가 도움이 되는 경우
                                message.content.length > 300;
                            
                            // 🎯 조건을 만족하면 SetupGuideDisplay 사용
                            return isLikelySetup ? 
                                <SetupGuideDisplay content={message.content} /> :
                                <AnswerDisplay content={message.content} />;
                        })()
                    )
                ) : (
                    <p className="font-medium text-amber-100 leading-relaxed">
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

                {/* 피드백 버튼 (실질적인 답변에만, 첫 번째와 두 번째 AI 답변 제외) */}
                {message.role === 'assistant' && !isWelcomeMessage && 
                 messageIndex !== undefined && messageIndex > 3 && (
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
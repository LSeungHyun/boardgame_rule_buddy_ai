'use client';

import React, { useState, useEffect } from 'react';
import GameSelection from '@/components/GameSelection';
import ChatScreen from '@/components/ChatScreen';
import { Game, ChatMessage } from '@/types/game';
import { fetchGames, GameFilters } from '@/features/games/api';
import { errorHandler, AppError } from '@/lib/error-handler';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'selection' | 'chat'>('selection');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 데이터 상태
  const [games, setGames] = useState<Game[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 검색어가 있을 때만 게임 목록 로드
  useEffect(() => {
    const loadFilteredGames = async () => {
      // 검색어가 없으면 게임 목록을 비움
      if (!searchTerm.trim()) {
        setGames([]);
        return;
      }

      try {
        setIsLoadingGames(true);

        const filters: GameFilters = {};

        if (searchTerm.trim()) {
          filters.searchTerm = searchTerm.trim();
        }

        const filteredGames = await fetchGames(filters);
        setGames(filteredGames);
        setError(null);
      } catch (err) {
        const appError = errorHandler.handle(err, {
          function: 'loadFilteredGames',
          searchTerm
        });

        setError(errorHandler.getUserMessage(appError));
        setGames([]);
      } finally {
        setIsLoadingGames(false);
      }
    };

    // 디바운싱: 200ms 후에 검색 실행 (더 빠른 반응성)
    const timeoutId = setTimeout(() => {
      loadFilteredGames();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game);
    setMessages([
      {
        role: 'assistant',
        content: `안녕하세요! **${game.title}** 룰 마스터입니다. 무엇이든 물어보세요.`
      }
    ]);
    setCurrentPage('chat');
  };

  const handleGoBack = () => {
    setCurrentPage('selection');
    setSelectedGame(null);
    setMessages([]);
  };

  const handleSendMessage = async (text: string) => {
    const newUserMessage: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    const prompt = `
당신은 '**${selectedGame?.title}**' 보드게임 규칙을 전문적으로 설명하는 **AI 룰 마스터**입니다.

## 📌 절대 변경 금지
- 규칙서·FAQ에 명시된 **사실 관계**(카드 효과, 타이밍, 숫자, 용어)
- 질문자가 제시한 **상황·수치**
- 순서: ⚡️→📖→💡→�� 4단 구성

## ✨ 개선 허용
- 문단 재배치·줄바꿈·마크다운 강조(굵게, 인라인 코드 등)
- 이모지 사용(⚡️📖💡🔗 네 개만 제목에 활용)
- 동일 내용을 더 명확히 설명하기 위한 문장 다듬기
- 예시의 표현 방식(단, **결과·수치 불변**)

## 🖋️ 답변 형식
1. **⚡️ 직접적인 답변** – 한두 문장 핵심 결론
2. **📖 규칙 설명** – 2‑4 문단, 규칙서 페이지·영문 용어 병기 가능
3. **💡 예시** – 동일 결과를 유지하며 짧고 현실적 사례
4. **🔗 관련 규칙** – 자주 묻는 예외·연관 카드 3‑5줄 리스트

### 스타일 가이드
- 첫 문장은 바로 결론, 인사말 생략
- 한 문단 = 한 아이디어, 두 줄 간격으로 분리
- 기술 용어 첫 등장 시 **굵게** + (영문·p.번호)
- 한국어 존대 사용, 과도한 감탄·수식어 지양

### ⬇️ 사용자 질문
"${text}"
`;

    // =====> 디버깅을 위한 프롬프트 확인 코드 <=====
    console.log("실제로 전송되는 프롬프트:", prompt);
    console.log("선택된 게임:", selectedGame);
    console.log("게임 제목:", selectedGame?.title);

    try {
      // 환경변수에서 API 키를 가져오도록 수정 (실제 구현에서는 환경변수 사용)
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

      if (!apiKey) {
        throw new Error("Gemini API 키가 설정되지 않았습니다. 환경변수를 확인해주세요.");
      }

      const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
      const payload = { contents: chatHistory };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      let assistantResponse = "죄송합니다. 답변을 생성하는 데 문제가 발생했습니다.";
      if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
        assistantResponse = result.candidates[0].content.parts[0].text;
      } else if (result.promptFeedback && result.promptFeedback.blockReason) {
        assistantResponse = `답변 생성에 실패했습니다. (사유: ${result.promptFeedback.blockReason})`;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }]);

    } catch (err) {
      console.error("Gemini API 호출 오류:", err);
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다";
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `오류가 발생했습니다: ${errorMessage}. 잠시 후 다시 시도해주세요.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 에러 상태 표시
  if (error) {
    return (
      <main className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">❌ {error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-gray-900 text-white min-h-screen">
      {currentPage === 'chat' && selectedGame ? (
        <ChatScreen
          game={selectedGame}
          onGoBack={handleGoBack}
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      ) : (
        <GameSelection
          search={{
            term: searchTerm,
            setTerm: setSearchTerm
          }}
          ui={{
            isLoading: isLoadingGames
          }}
          data={{
            games,
            onSelectGame: handleSelectGame
          }}
        />
      )}
    </main>
  );
}

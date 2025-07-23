'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import WelcomeGuideModal from '@/components/WelcomeGuideModal';

export default function Home() {
  const router = useRouter();
  const [gameName, setGameName] = useState('');
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(false);

  // Welcome Modal 표시 여부 결정 로직
  useEffect(() => {
    const checkWelcomeModalVisibility = () => {
      const timestamp = localStorage.getItem('welcomeModalClosedTimestamp');

      if (!timestamp) {
        // 타임스탬프가 없으면 첫 방문이므로 모달 표시
        setIsWelcomeModalOpen(true);
        return;
      }

      const lastClosedTime = new Date(parseInt(timestamp));
      const now = new Date();

      // 같은 날인지 확인 (년, 월, 일이 모두 같은지 체크)
      const isSameDay =
        lastClosedTime.getFullYear() === now.getFullYear() &&
        lastClosedTime.getMonth() === now.getMonth() &&
        lastClosedTime.getDate() === now.getDate();

      if (!isSameDay) {
        // 다른 날이면 모달 표시
        setIsWelcomeModalOpen(true);
      }
    };

    checkWelcomeModalVisibility();
  }, []);

  // Welcome Modal 닫기 핸들러
  const handleCloseWelcomeModal = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      // 현재 타임스탬프 저장
      localStorage.setItem('welcomeModalClosedTimestamp', new Date().getTime().toString());
    }
    setIsWelcomeModalOpen(false);
  };

  // 엔터키 처리 및 게임명으로 rulemaster 페이지 이동
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && gameName.trim()) {
      router.push(`/rulemaster?game=${encodeURIComponent(gameName.trim())}`);
    }
  };

  const handleSubmit = () => {
    if (gameName.trim()) {
      router.push(`/rulemaster?game=${encodeURIComponent(gameName.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Hero 섹션 */}
        <motion.header
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            className="mb-8"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4">
              <motion.span
                className="block bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent drop-shadow-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                룰마스터 AI
              </motion.span>
              <motion.span
                className="block text-xl sm:text-2xl md:text-3xl bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-lg font-medium mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                룰북 대신, AI에게 물어보세요 🤖
              </motion.span>
            </h1>

            <motion.p
              className="text-lg sm:text-xl text-slate-200 mb-6 font-medium drop-shadow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              365개 게임 • 초성 검색 • 즉시 답변
            </motion.p>
          </motion.div>

          {/* 핵심 가치 카드 */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            {[
              { icon: "🚀", title: "즉시 시작", desc: "복잡한 룰북 없이도 5분 만에 게임 시작" },
              { icon: "💬", title: "실시간 도움", desc: "게임 중 '이건 뭐지?' 순간에도 바로 해결" },
              { icon: "📚", title: "완벽한 가이드", desc: "핵심 룰부터 흔한 실수까지 친절하게 안내" }
            ].map((value, index) => (
              <motion.div
                key={index}
                className="glass-card rounded-xl p-6 text-center group hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + index * 0.1, duration: 0.5 }}
                whileHover={{ y: -5 }}
                style={{
                  background: 'rgba(30, 35, 40, 0.25)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(76, 85, 120, 0.15)',
                  boxShadow: '0 4px 20px rgba(15, 20, 25, 0.4)'
                }}
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
                  {value.icon}
                </div>
                <h3 className="text-lg font-bold text-amber-100 mb-2 group-hover:text-yellow-300 transition-colors">
                  {value.title}
                </h3>
                <p className="text-sm text-amber-200/80 group-hover:text-amber-200 transition-colors">
                  {value.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.header>

        {/* 게임 입력 필드 */}
        <motion.div
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          <div className="relative group">
            <input
              type="text"
              placeholder="게임 이름을 입력하세요 (예: 루미큐브, 카탄, 스플렌더)"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full p-4 md:p-6 text-lg md:text-xl rounded-2xl shadow-xl
                       bg-slate-100/95 backdrop-blur-sm border-2 border-transparent
                       focus:border-blue-400 focus:ring-0 focus:outline-none
                       placeholder:text-slate-500/70 text-slate-800
                       transition-all duration-300 ease-out
                       hover:shadow-2xl hover:bg-slate-50"
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={!gameName.trim()}
              className="absolute right-4 md:right-6 top-1/2 transform -translate-y-1/2 
                       p-2 rounded-full transition-all duration-200 hover:scale-110
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                       enabled:hover:bg-blue-100/20 enabled:active:scale-95
                       min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="게임 검색 시작"
            >
              <div className={`text-xl transition-colors duration-200 ${gameName.trim()
                ? 'text-blue-500 hover:text-blue-600'
                : 'text-slate-400'
                }`}>
                🎲
              </div>
            </button>
          </div>

          {/* 안내 텍스트 */}
          <motion.p
            className="text-center text-slate-300 mt-4 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.6 }}
          >
            게임 이름을 입력하고 <kbd className="px-2 py-1 bg-slate-700 rounded">Enter</kbd>를 누르세요
          </motion.p>

          {/* 예시 게임들 */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.6 }}
          >
            <p className="text-slate-400 text-sm mb-4">이런 게임들을 물어보세요!</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['카탄', '스플렌더', '윙스팬', '아그리콜라', '글룸헤이븐'].map((game, index) => (
                <button
                  key={game}
                  onClick={() => {
                    setGameName(game);
                  }}
                  className="px-3 py-1 bg-slate-700/50 hover:bg-slate-600/70 text-slate-300 rounded-full text-sm transition-all duration-200 hover:scale-105"
                >
                  {game}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Welcome Guide Modal */}
      <WelcomeGuideModal
        isOpen={isWelcomeModalOpen}
        onClose={handleCloseWelcomeModal}
      />
    </div>
  );
}

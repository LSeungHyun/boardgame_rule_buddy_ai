'use client';

import React, { useState } from 'react';
import { SendButton } from '@/components/ui/send-button';
import { Input } from '@/components/ui/input';

/**
 * SendButton 컴포넌트 사용 예제
 * 입력 필드와 함께 사용하는 방법을 보여줍니다.
 */
export function SendButtonDemo() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    
    // 시뮬레이션: 2초 후 완료
    setTimeout(() => {
      console.log('메시지 전송:', input);
      setInput('');
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">SendButton 데모</h2>
        <p className="text-slate-400">모바일 친화적인 전송 버튼 컴포넌트</p>
      </div>

      {/* 기본 사용 예제 */}
      <div className="glass-card-premium rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">기본 사용법</h3>
        
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder="메시지를 입력하세요..."
              className="glass-card-premium focus-premium rounded-2xl"
              disabled={isLoading}
            />
          </div>
          
          <SendButton
            isEnabled={!!input.trim()}
            isLoading={isLoading}
            isInputFocused={isInputFocused}
            type="submit"
          />
        </form>
      </div>

      {/* 다양한 상태 보기 */}
      <div className="glass-card-premium rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">다양한 상태</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 비활성화 상태 */}
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-2">비활성화</p>
            <SendButton
              isEnabled={false}
              isLoading={false}
              type="button"
            />
          </div>

          {/* 활성화 상태 */}
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-2">활성화</p>
            <SendButton
              isEnabled={true}
              isLoading={false}
              type="button"
            />
          </div>

          {/* 로딩 상태 */}
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-2">로딩</p>
            <SendButton
              isEnabled={true}
              isLoading={true}
              type="button"
            />
          </div>

          {/* 포커스 상태 */}
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-2">포커스</p>
            <SendButton
              isEnabled={true}
              isLoading={false}
              isInputFocused={true}
              type="button"
            />
          </div>
        </div>
      </div>

      {/* 사용법 설명 */}
      <div className="glass-card-premium rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">컴포넌트 사용법</h3>
        
        <div className="space-y-4 text-sm text-slate-300">
          <div>
            <h4 className="font-medium text-white mb-2">필수 Props:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><code className="text-primary-300">isEnabled</code>: 버튼 활성화 여부</li>
              <li><code className="text-primary-300">isLoading</code>: 로딩 상태 여부</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-2">선택적 Props:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><code className="text-primary-300">onClick</code>: 클릭 이벤트 핸들러</li>
              <li><code className="text-primary-300">isInputFocused</code>: 입력 필드 포커스 상태</li>
              <li><code className="text-primary-300">type</code>: 버튼 타입 (기본값: 'submit')</li>
              <li><code className="text-primary-300">className</code>: 추가 CSS 클래스</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-white mb-2">모바일 최적화 특징:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>최소 48px 터치 타겟 크기 (Apple/Google 가이드라인 준수)</li>
              <li>터치 피드백 애니메이션</li>
              <li>반응형 크기 조정 (데스크톱에서 52px)</li>
              <li>접근성 고려 (적절한 대비 및 상태 표시)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SendButtonDemo; 
'use client';

import dynamic from 'next/dynamic';

// StagewiseToolbar를 클라이언트 사이드에서만 로드
const StagewiseToolbar = dynamic(
  () => import('@stagewise/toolbar-next').then(mod => ({ default: mod.StagewiseToolbar })),
  { 
    ssr: false,
    loading: () => null // 로딩 중에는 아무것도 표시하지 않음
  }
);

export function StagewiseToolbarWrapper() {
  return (
    <StagewiseToolbar
      config={{
        plugins: [],
      }}
    />
  );
}
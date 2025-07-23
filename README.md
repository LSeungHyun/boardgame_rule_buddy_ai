이 프로젝트는 [`EasyNext`](https://github.com/easynext/easynext)를 사용해 생성된 [Next.js](https://nextjs.org) 프로젝트입니다.

## Getting Started

개발 서버를 실행합니다.<br/>
환경에 따른 명령어를 사용해주세요.

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인할 수 있습니다.

`app/page.tsx` 파일을 수정하여 페이지를 편집할 수 있습니다. 파일을 수정하면 자동으로 페이지가 업데이트됩니다.

## Analytics 설정

### Microsoft Clarity 설정

1. 프로젝트 루트에 `.env.local` 파일을 생성하세요.
2. Microsoft Clarity 프로젝트 ID를 추가하세요:

```bash
# .env.local
NEXT_PUBLIC_CLARITY_PROJECT_ID=sj90hw1c3j
```

### Google Analytics 설정 (선택사항)

Google Analytics를 사용하려면 다음 환경변수를 추가하세요:

```bash
# .env.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 기본 포함 라이브러리

- [Next.js](https://nextjs.org)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript](https://www.typescriptlang.org)
- [ESLint](https://eslint.org)
- [Prettier](https://prettier.io)
- [Shadcn UI](https://ui.shadcn.com)
- [Lucide Icon](https://lucide.dev)
- [date-fns](https://date-fns.org)
- [react-use](https://github.com/streamich/react-use)
- [es-toolkit](https://github.com/toss/es-toolkit)
- [Zod](https://zod.dev)
- [React Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com)
- [TS Pattern](https://github.com/gvergnaud/ts-pattern)
- [Microsoft Clarity](https://clarity.microsoft.com) - 사용자 행동 분석

## 사용 가능한 명령어

한글버전 사용

```sh
easynext lang ko
```

최신버전으로 업데이트

```sh
npm i -g @easynext/cli@latest
# or
yarn add -g @easynext/cli@latest
# or
pnpm add -g @easynext/cli@latest
```

Supabase 설정

```sh
easynext supabase
```

Next-Auth 설정

```sh
easynext auth

# ID,PW 로그인
easynext auth idpw
# 카카오 로그인
easynext auth kakao
```

유용한 서비스 연동

```sh
# Google Analytics
easynext gtag

# Microsoft Clarity
easynext clarity

# ChannelIO
easynext channelio

# Sentry
easynext sentry

# Google Adsense
easynext adsense
```

## Analytics 사용법

### 기본 Analytics 훅 사용

```typescript
import { useAnalytics } from '@/lib/analytics';

function MyComponent() {
  const { trackEvent, clarityEvent } = useAnalytics();
  
  const handleClick = () => {
    // Google Analytics 이벤트
    trackEvent('button_click', { component: 'my_component' });
    
    // Microsoft Clarity 이벤트
    clarityEvent('button_click');
  };
  
  return <button onClick={handleClick}>클릭</button>;
}
```

### Microsoft Clarity 전용 기능

```typescript
import { useClarityTracking } from '@/lib/analytics';

function GameComponent() {
  const { trackUserBehavior, setCustomTag, upgradeSession } = useClarityTracking();
  
  const handleImportantAction = () => {
    // 사용자 행동 추적
    trackUserBehavior('game_action', { 
      action_type: 'important_click',
      game_name: 'example_game'
    });
    
    // 커스텀 태그 설정
    setCustomTag('user_level', 'advanced');
    
    // 세션 우선순위 업그레이드
    upgradeSession('important_game_action');
  };
  
  return <button onClick={handleImportantAction}>중요한 액션</button>;
}
```

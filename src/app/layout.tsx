import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { AnalyticsProvider } from '@/lib/analytics';
import { StagewiseToolbarWrapper } from '@/components/stagewise-toolbar-wrapper';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI 보드게임 룰 마스터',
  description: 'AI가 보드게임 규칙을 실시간으로 알려드립니다.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${notoSansKR.className} antialiased`}>
        <AnalyticsProvider config={{
          enableDevelopment: process.env.NODE_ENV === 'development',
          debugMode: process.env.NODE_ENV === 'development'
        }}>
          <Providers>{children}</Providers>
        </AnalyticsProvider>
        <StagewiseToolbarWrapper />
      </body>
    </html>
  );
}

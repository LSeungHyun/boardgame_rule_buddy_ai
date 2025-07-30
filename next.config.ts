import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: '**',
      },
    ],
  },
  // TypeScript 설정 - supabase/functions는 tsconfig.json에서 제외됨
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

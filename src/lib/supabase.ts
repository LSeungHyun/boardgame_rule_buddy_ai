import { createClient } from '@supabase/supabase-js';

// 환경 변수 또는 기본값 사용
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qycehjnsonhotbqowlln.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Y2Voam5zb25ob3RicW93bGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ0OTgwMjQsImV4cCI6MjA0MDA3NDAyNH0.TxV31r6yGX7Ftmj5o8MxBKQYsnizSdUOxvObmRWoJy4';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL과 Key가 설정되지 않았습니다.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// 서버 사이드에서 사용할 관리자 권한 클라이언트 (필요시)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Y2Voam5zb25ob3RicW93bGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDQ5ODAyNCwiZXhwIjoyMDQwMDc0MDI0fQ.SDabIhKG18NMpfeJD01xZ87rWSgO8kC7O0oEU7cvtVQ';

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
); 
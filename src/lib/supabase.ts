import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// 서버 사이드에서 사용할 관리자 권한 클라이언트 (필요시)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다. 관리자 기능이 제한될 수 있습니다.');
}

export const supabaseAdmin = serviceRoleKey ? createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null;
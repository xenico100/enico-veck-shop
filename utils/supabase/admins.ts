import type { SupabaseClient } from '@supabase/supabase-js';

export async function checkIsAdmin(
  supabase: SupabaseClient,
  userId?: string
): Promise<boolean> {
  if (!userId) return false;

  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    // 운영 로그 너무 시끄러우면 나중에 제거해도 됨
    console.warn('Failed to check admin status', error);
    return false;
  }

  return !!data;
}

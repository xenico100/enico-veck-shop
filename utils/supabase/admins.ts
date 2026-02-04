import type { SupabaseClient } from '@supabase/supabase-js';

export async function checkIsAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    console.warn('Failed to check admin status', error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

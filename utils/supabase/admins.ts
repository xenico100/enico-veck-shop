import { createClient } from '@/utils/supabase/client';

export const checkIsAdmin = async (userId?: string) => {
  if (!userId) return false;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    return false;
  }

  return (data ?? []).length > 0;
};

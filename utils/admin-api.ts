import 'server-only';

import type { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { getUser } from '@/utils/supabase/queries';
import { isAdminEmailValue, isAdminRoleValue } from '@/utils/service-posts';

export const hasAdminAccessForAuthUser = (user: User | null) => {
  if (!user) return false;
  const role =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined) ??
    null;
  return isAdminEmailValue(user.email) || isAdminRoleValue(role);
};

export async function getAdminApiContext() {
  const supabase = createClient();
  const user = await getUser(supabase);
  const isAdmin = hasAdminAccessForAuthUser(user);

  return {
    supabase,
    user,
    isAdmin,
    adminClient: isAdmin ? createAdminClient() : null
  };
}

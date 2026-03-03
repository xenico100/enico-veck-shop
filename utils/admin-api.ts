import 'server-only';

import type { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { getUser } from '@/utils/supabase/queries';
import {
  getUserRoleLevel,
  resolveUserRoleForUserLike,
  type UserRoleValue
} from '@/utils/service-posts';

export const getAuthUserRole = (user: User | null): UserRoleValue => {
  if (!user) return 'user';
  return resolveUserRoleForUserLike({
    email: user.email ?? null,
    app_metadata:
      user.app_metadata && typeof user.app_metadata === 'object'
        ? (user.app_metadata as Record<string, unknown>)
        : null,
    user_metadata:
      user.user_metadata && typeof user.user_metadata === 'object'
        ? (user.user_metadata as Record<string, unknown>)
        : null
  });
};

export const hasAdminAccessForAuthUser = (user: User | null) => {
  return getUserRoleLevel(getAuthUserRole(user)) >= getUserRoleLevel('manager');
};

export async function getAdminApiContext() {
  const supabase = createClient();
  const user = await getUser(supabase);
  const adminRole = getAuthUserRole(user);
  const isAdmin = hasAdminAccessForAuthUser(user);

  return {
    supabase,
    user,
    isAdmin,
    adminRole,
    adminRoleLevel: getUserRoleLevel(adminRole),
    adminClient: isAdmin ? createAdminClient() : null
  };
}

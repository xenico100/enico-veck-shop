import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { hasAdminAccessForAuthUser } from '@/utils/admin-api';
import { createClient } from '@/utils/supabase/server';

export default async function AdminLayout({
  children
}: {
  children: ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  const hasAdminAccess =
    !error && user
      ? hasAdminAccessForAuthUser({ ...user, user_metadata: {} })
      : false;

  if (!hasAdminAccess) {
    redirect('/');
  }

  return children;
}

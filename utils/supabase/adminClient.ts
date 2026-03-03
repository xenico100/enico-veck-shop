import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from 'types_db';

const getAdminClientEnv = () => ({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
});

export const canCreateAdminClient = () => {
  const { supabaseUrl, serviceRoleKey } = getAdminClientEnv();
  return Boolean(supabaseUrl && serviceRoleKey);
};

export const createAdminClient = () => {
  const { supabaseUrl, serviceRoleKey } = getAdminClientEnv();
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for Supabase admin client.');
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for Supabase admin client.');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey);
};

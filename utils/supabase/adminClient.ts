import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from 'types_db';

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL for Supabase admin client.');
}

if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for Supabase admin client.');
}

export const createAdminClient = () =>
  createClient<Database>(supabaseUrl, serviceRoleKey);

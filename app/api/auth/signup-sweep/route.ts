import { createAdminClient } from '@/utils/supabase/adminClient';
import { createSignupSweepHandler } from '@/utils/signup-sweep';
import { getSignupNotificationDependencies } from '@/utils/signup-notifier';
import { processSignupUser, SIGNUP_ALERT_MARKER } from '@/utils/signup-webhook';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = createSignupSweepHandler({
  secret: () => process.env.SIGNUP_NOTIFICATION_WEBHOOK_SECRET,
  enabledAt: () => process.env.SIGNUP_NOTIFICATION_ENABLED_AT,
  marker: SIGNUP_ALERT_MARKER,
  listUsers: async (page, perPage) => {
    const { data, error } = await createAdminClient({ timeoutMs: 5_000 }).auth.admin.listUsers({ page, perPage });
    if (error) throw new Error('Signup account scan failed');
    return { users: data.users };
  },
  notify: async id => {
    const outcome = await processSignupUser(id, getSignupNotificationDependencies());
    return { ok: true, status: outcome === 'sent' ? 'sent' : 'skipped' };
  }
});

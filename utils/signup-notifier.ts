import 'server-only';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { getAdminSignupEmailConfig, isAdminSignupEmailConfigured } from '@/utils/admin-alert-config';
import { sendSignupNotificationEmail } from '@/utils/signup-notification-email';
import { SIGNUP_ALERT_MARKER, type SignupNotificationDependencies } from '@/utils/signup-webhook';

export function getSignupNotificationDependencies(): SignupNotificationDependencies {
  return {
    secret: () => process.env.SIGNUP_NOTIFICATION_WEBHOOK_SECRET,
    enabledAt: () => process.env.SIGNUP_NOTIFICATION_ENABLED_AT,
    isConfigured: isAdminSignupEmailConfigured,
    getUser: async id => {
      const { data, error } = await createAdminClient({ timeoutMs: 5_000 }).auth.admin.getUserById(id);
      if (error) {
        if (error.status === 404) return null;
        throw new Error('User lookup failed');
      }
      return data.user;
    },
    notify: user => sendSignupNotificationEmail(user, getAdminSignupEmailConfig()),
    markNotified: async (id, sentAt) => {
      const { error } = await createAdminClient({ timeoutMs: 5_000 }).auth.admin.updateUserById(id, {
        app_metadata: { [SIGNUP_ALERT_MARKER]: sentAt }
      });
      if (error) throw new Error('Notification marker could not be saved');
    }
  };
}

import 'server-only';

// Keep the existing administrator recipient as the shared transactional-mail fallback.
const DEFAULT_ALERT_TO_EMAIL = 'morba9850@gmail.com';

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

export const getAdminEmailConfig = () => ({
  to: normalizeText(process.env.SALES_ALERT_TO_EMAIL) || DEFAULT_ALERT_TO_EMAIL,
  from:
    normalizeText(process.env.SALES_ALERT_FROM_EMAIL) ||
    normalizeText(process.env.RESEND_FROM_EMAIL) ||
    'onboarding@resend.dev',
  resendApiKey: normalizeText(process.env.RESEND_API_KEY)
});

/** Signup-only credentials must not implicitly enable sales/order notifications. */
export const getAdminSignupEmailConfig = () => {
  const existing = getAdminEmailConfig();
  return {
    to: normalizeText(process.env.SIGNUP_NOTIFICATION_EMAIL) || existing.to,
    from: normalizeText(process.env.SIGNUP_NOTIFICATION_FROM_EMAIL) || existing.from,
    resendApiKey: normalizeText(process.env.SIGNUP_NOTIFICATION_RESEND_API_KEY) || existing.resendApiKey
  };
};

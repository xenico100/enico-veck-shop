import 'server-only';

export const getAdminEmail = () =>
  process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ?? null;

export const isAdminEmail = (email?: string | null) => {
  const adminEmail = getAdminEmail();
  if (!adminEmail || !email) return false;
  return email.trim().toLowerCase() === adminEmail;
};

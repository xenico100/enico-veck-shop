export type ServicePost = {
  id: string;
  title: string;
  slug: string | null;
  category: string | null;
  summary: string | null;
  content: string | null;
  price_from: number | null;
  currency: string | null;
  is_paid_file: boolean | null;
  file_price: number | string | null;
  download_file_url: string | null;
  image_urls: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type ServicePostPayload = {
  title: string;
  slug?: string | null;
  category?: string | null;
  summary?: string | null;
  content?: string | null;
  price_from?: number | null;
  currency?: string | null;
  is_paid_file?: boolean | null;
  file_price?: number | null;
  download_file_url?: string | null;
  image_urls?: string[];
  is_published?: boolean;
};

export const SERVICE_CATEGORIES = ['녹음', '믹스/마스터', '더빙/성우'] as const;
export const FORCED_ADMIN_EMAIL = 'morba9850@gmail.com';
export const USER_ROLE_VALUES = ['admin', 'sub_admin', 'manager', 'user'] as const;
export type UserRoleValue = (typeof USER_ROLE_VALUES)[number];

const USER_ROLE_LEVEL: Record<UserRoleValue, number> = {
  admin: 3,
  sub_admin: 2,
  manager: 1,
  user: 0
};

const USER_ROLE_LABEL: Record<UserRoleValue, string> = {
  admin: '관리자',
  sub_admin: '부관리자',
  manager: '매니저',
  user: '일반 유저'
};

export const categoryColorPresets: Record<string, string[]> = {
  녹음: ['#1a1a1a', '#4a4a4a', '#8a8a8a'],
  '믹스/마스터': ['#2a3a5a', '#4a5a7a', '#6a7a9a'],
  '더빙/성우': ['#3a2a4a', '#5a4a6a', '#7a6a8a'],
};

export const formatPriceFrom = (
  value: number | null | undefined,
  currency = 'KRW'
) => {
  if (value == null || Number.isNaN(value)) return '문의';
  try {
    return `${new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency
    }).format(value)}부터`;
  } catch {
    return `₩${new Intl.NumberFormat('ko-KR').format(value)}부터`;
  }
};

export const normalizeImageUrls = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
};

export const slugifyServicePost = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const isServiceCategory = (value: string | null | undefined) =>
  Boolean(value && SERVICE_CATEGORIES.includes(value as (typeof SERVICE_CATEGORIES)[number]));

export const parseAdminEmailEnv = () => {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '';
  return raw
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
};

export const isAdminEmailValue = (email?: string | null) => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized === FORCED_ADMIN_EMAIL) return true;
  const adminEmails = parseAdminEmailEnv();
  return adminEmails.includes(normalized);
};

export const normalizeUserRoleValue = (role?: string | null): UserRoleValue => {
  const normalized = (role ?? '').trim().toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'sub_admin' || normalized === 'sub-admin' || normalized === 'subadmin') {
    return 'sub_admin';
  }
  if (normalized === 'manager') return 'manager';
  if (normalized === 'user') return 'user';
  return 'user';
};

export const getUserRoleLevel = (role?: string | null) =>
  USER_ROLE_LEVEL[normalizeUserRoleValue(role)];

export const getUserRoleLabel = (role?: string | null) =>
  USER_ROLE_LABEL[normalizeUserRoleValue(role)];

export const isAdminRoleValue = (role?: string | null) => getUserRoleLevel(role) >= 1;

export const resolveUserRoleForUserLike = (user?: {
  email?: string | null;
  role?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
} | null): UserRoleValue => {
  if (!user) return 'user';
  if (isAdminEmailValue(user.email)) return 'admin';

  const explicitRole =
    user.role ??
    (typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : null) ??
    (typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : null);

  return normalizeUserRoleValue(explicitRole);
};

export const isAdminUserLike = (user?: {
  email?: string | null;
  role?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
} | null) => {
  return getUserRoleLevel(resolveUserRoleForUserLike(user)) >= getUserRoleLevel('manager');
};

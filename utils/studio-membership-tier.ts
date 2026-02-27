export type StudioMembershipTierSource = {
  has_active_subscription?: boolean | null;
  selected_membership?: string | null;
  plan_amount?: number | string | null;
};

export type StudioMembershipTierLevel = 0 | 1 | 2 | 3;

type StudioMembershipTierOption = {
  level: StudioMembershipTierLevel;
  key: 'none' | 'monthly_4900' | 'monthly_13900' | 'monthly_79000';
  title: string;
  description: string;
  priceKrw: number | null;
};

const MAX_TIER_LEVEL = 3;

const normalizeTierLevel = (value: unknown) => {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : 0;
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(MAX_TIER_LEVEL, Math.max(0, Math.floor(numeric)));
};

const parsePlanAmount = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const resolveTierLevelFromAmount = (value: unknown) => {
  const amount = parsePlanAmount(value);
  if (amount == null) return null;
  // Keep legacy 69,000 and current 79,000 premium pricing in the top tier.
  if (amount >= 69000) return 3;
  if (amount >= 13900) return 2;
  if (amount >= 4900) return 1;
  return null;
};

const resolveTierLevelFromLabel = (value: unknown) => {
  const label = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!label) return null;

  if (
    label.includes('premium') ||
    label.includes('프리미엄') ||
    /(?:79|69)\s*,?\s*000/.test(label)
  ) {
    return 3;
  }

  if (
    label.includes('plus') ||
    label.includes('플러스') ||
    /13\s*,?\s*900/.test(label)
  ) {
    return 2;
  }

  if (
    label.includes('basic') ||
    label.includes('베이직') ||
    /4\s*,?\s*900/.test(label)
  ) {
    return 1;
  }

  return null;
};

export const normalizeRequiredMembershipLevel = (value: unknown) =>
  normalizeTierLevel(value);

export const hasStudioMembershipTierAccess = (
  viewerTierLevel: unknown,
  requiredTierLevel: unknown
) =>
  normalizeTierLevel(viewerTierLevel) >= normalizeTierLevel(requiredTierLevel);

export const STUDIO_MEMBERSHIP_TIER_OPTIONS: StudioMembershipTierOption[] = [
  {
    level: 0,
    key: 'none',
    title: '미가입',
    description: 'Studio 멤버십 비활성화',
    priceKrw: null
  },
  {
    level: 1,
    key: 'monthly_4900',
    title: '베이직 멤버십',
    description: '월 4,900원',
    priceKrw: 4900
  },
  {
    level: 2,
    key: 'monthly_13900',
    title: '플러스 멤버십',
    description: '월 13,900원',
    priceKrw: 13900
  },
  {
    level: 3,
    key: 'monthly_79000',
    title: '프리미엄 멤버십',
    description: '월 79,000원',
    priceKrw: 79000
  }
];

const tierOptionMap = new Map(
  STUDIO_MEMBERSHIP_TIER_OPTIONS.map((option) => [option.level, option])
);

export const getStudioMembershipTierOption = (level: unknown) =>
  tierOptionMap.get(normalizeTierLevel(level) as StudioMembershipTierLevel) ??
  STUDIO_MEMBERSHIP_TIER_OPTIONS[0];

export const getStudioMembershipTierLabel = (level: unknown) => {
  const option = getStudioMembershipTierOption(level);
  if (option.level <= 0) return option.title;
  return `${option.title} (${option.description})`;
};

export const STUDIO_MEMBERSHIP_MANUAL_PLAN_BY_LEVEL: Record<
  Exclude<StudioMembershipTierLevel, 0>,
  {
    planId: string;
    name: string;
    amountKrw: number;
    currency: 'KRW';
    interval: 'month';
  }
> = {
  1: {
    planId: 'manual_monthly_4900',
    name: '베이직 멤버십 (관리자 부여)',
    amountKrw: 4900,
    currency: 'KRW',
    interval: 'month'
  },
  2: {
    planId: 'manual_monthly_13900',
    name: '플러스 멤버십 (관리자 부여)',
    amountKrw: 13900,
    currency: 'KRW',
    interval: 'month'
  },
  3: {
    planId: 'manual_monthly_79000',
    name: '프리미엄 멤버십 (관리자 부여)',
    amountKrw: 79000,
    currency: 'KRW',
    interval: 'month'
  }
};

export const resolveStudioMembershipTierLevel = (
  membership: StudioMembershipTierSource | null
) => {
  if (!membership?.has_active_subscription) return 0;

  const fromAmount = resolveTierLevelFromAmount(membership.plan_amount);
  if (fromAmount != null) return fromAmount;

  const fromLabel = resolveTierLevelFromLabel(membership.selected_membership);
  if (fromLabel != null) return fromLabel;

  // Fallback for manually granted membership with unknown plan metadata.
  return 1;
};

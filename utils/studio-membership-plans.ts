export type StudioMembershipPlanKey =
  | 'monthly_4900'
  | 'monthly_13900'
  | 'monthly_79000';

export type StudioMembershipLegacyPlanKey =
  | 'monthly_69000'
  | 'yearly_290000';

export type StudioMembershipBillingCycle = 'monthly' | 'yearly';

export type StudioMembershipPlanOption = {
  key: StudioMembershipPlanKey;
  title: string;
  priceKrw: number;
  description: string;
  billingCycle: StudioMembershipBillingCycle;
  durationDays: number;
  supportsPayPal: boolean;
  accessTierLevel: 1 | 2 | 3;
};

export const STUDIO_MEMBERSHIP_PLAN_OPTIONS: StudioMembershipPlanOption[] = [
  {
    key: 'monthly_4900',
    title: '베이직 멤버십',
    priceKrw: 4900,
    description: '가로 영상 전용 플랫폼',
    billingCycle: 'monthly',
    durationDays: 30,
    supportsPayPal: true,
    accessTierLevel: 1
  },
  {
    key: 'monthly_13900',
    title: '플러스 멤버십',
    priceKrw: 13900,
    description: '숏폼 영상 전용 플랫폼',
    billingCycle: 'monthly',
    durationDays: 30,
    supportsPayPal: true,
    accessTierLevel: 2
  },
  {
    key: 'monthly_79000',
    title: '프리미엄 멤버십',
    priceKrw: 79000,
    description: '사진+글 결합형 블로그 플랫폼',
    billingCycle: 'monthly',
    durationDays: 30,
    supportsPayPal: true,
    accessTierLevel: 3
  }
];

const LEGACY_PLAN_KEY_ALIAS: Record<
  StudioMembershipLegacyPlanKey,
  StudioMembershipPlanKey
> = {
  monthly_69000: 'monthly_79000',
  yearly_290000: 'monthly_79000'
};

const formatPlanPriceLabel = (plan: StudioMembershipPlanOption) =>
  plan.billingCycle === 'yearly'
    ? `연 ${plan.priceKrw.toLocaleString('ko-KR')}원`
    : `월 ${plan.priceKrw.toLocaleString('ko-KR')}원`;

export const STUDIO_MEMBERSHIP_PLAN_LABEL_BY_KEY = Object.fromEntries(
  STUDIO_MEMBERSHIP_PLAN_OPTIONS.map((plan) => [
    plan.key,
    `${plan.title} (${formatPlanPriceLabel(plan)})`
  ])
) as Record<StudioMembershipPlanKey, string>;

export const formatStudioMembershipPriceKrw = (
  priceKrw: number,
  billingCycle: StudioMembershipBillingCycle = 'monthly'
) =>
  `${new Intl.NumberFormat('ko-KR').format(priceKrw)}원 / ${
    billingCycle === 'yearly' ? '년' : '월'
  }`;

const planOptionByKey = new Map(
  STUDIO_MEMBERSHIP_PLAN_OPTIONS.map((plan) => [plan.key, plan] as const)
);

export const normalizeStudioMembershipPlanKey = (
  key: string | null | undefined
): StudioMembershipPlanKey | null => {
  if (typeof key !== 'string') return null;
  const normalized = key.trim();
  if (!normalized) return null;

  if (planOptionByKey.has(normalized as StudioMembershipPlanKey)) {
    return normalized as StudioMembershipPlanKey;
  }

  if (normalized in LEGACY_PLAN_KEY_ALIAS) {
    return LEGACY_PLAN_KEY_ALIAS[normalized as StudioMembershipLegacyPlanKey];
  }

  return null;
};

export const getStudioMembershipPlanOptionByKey = (
  key: StudioMembershipPlanKey | string | null | undefined
) => {
  const normalized = normalizeStudioMembershipPlanKey(
    typeof key === 'string' ? key : null
  );
  if (!normalized) return null;
  return planOptionByKey.get(normalized) ?? null;
};

type MembershipSummaryLike = {
  has_active_subscription?: boolean | null;
  selected_membership?: string | null;
  plan_amount?: number | string | null;
};

const parsePlanAmount = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const inferStudioMembershipPlanKeyFromSummary = (
  summary: MembershipSummaryLike | null | undefined
): StudioMembershipPlanKey | null => {
  if (!summary?.has_active_subscription) return null;

  const amount = parsePlanAmount(summary.plan_amount);
  if (amount != null) {
    // Legacy 69,000 and yearly plans are treated as current premium tier.
    if (amount >= 69000) return 'monthly_79000';
    if (amount >= 13900) return 'monthly_13900';
    if (amount >= 4900) return 'monthly_4900';
  }

  const label = String(summary.selected_membership || '').toLowerCase();
  if (!label) return null;
  if (
    label.includes('1년') ||
    label.includes('연간') ||
    label.includes('year') ||
    label.includes('프리미엄') ||
    label.includes('premium') ||
    /(?:79|69)\s*,?\s*000/.test(label)
  ) {
    return 'monthly_79000';
  }
  if (label.includes('플러스') || label.includes('plus')) {
    return 'monthly_13900';
  }
  if (label.includes('베이직') || label.includes('basic')) {
    return 'monthly_4900';
  }
  return null;
};

export const isStudioMembershipTierDowngrade = (
  currentPlanKey: StudioMembershipPlanKey | null | undefined,
  targetPlanKey: StudioMembershipPlanKey | null | undefined
) => {
  const currentPlan = getStudioMembershipPlanOptionByKey(currentPlanKey ?? null);
  const targetPlan = getStudioMembershipPlanOptionByKey(targetPlanKey ?? null);
  if (!currentPlan || !targetPlan) return false;
  return targetPlan.accessTierLevel < currentPlan.accessTierLevel;
};

export type StudioMembershipPlanKey =
  | 'monthly_4900'
  | 'monthly_13900'
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
    description: '월간 Studio 멤버십',
    billingCycle: 'monthly',
    durationDays: 30,
    supportsPayPal: true,
    accessTierLevel: 1
  },
  {
    key: 'monthly_13900',
    title: '플러스 멤버십',
    priceKrw: 13900,
    description: '월간 Studio 멤버십',
    billingCycle: 'monthly',
    durationDays: 30,
    supportsPayPal: true,
    accessTierLevel: 2
  },
  {
    key: 'monthly_69000',
    title: '프리미엄 멤버십',
    priceKrw: 69000,
    description: '월간 Studio 멤버십',
    billingCycle: 'monthly',
    durationDays: 30,
    supportsPayPal: true,
    accessTierLevel: 3
  },
  {
    key: 'yearly_290000',
    title: '프리미엄 멤버십 1년권',
    priceKrw: 290000,
    description: '연간 결제 · 최고 멤버십 전체 접근',
    billingCycle: 'yearly',
    durationDays: 365,
    supportsPayPal: false,
    accessTierLevel: 3
  }
];

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

export const getStudioMembershipPlanOptionByKey = (
  key: StudioMembershipPlanKey | string | null | undefined
) => {
  if (typeof key !== 'string') return null;
  return planOptionByKey.get(key as StudioMembershipPlanKey) ?? null;
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
    if (amount >= 290000) return 'yearly_290000';
    if (amount >= 69000) return 'monthly_69000';
    if (amount >= 13900) return 'monthly_13900';
    if (amount >= 4900) return 'monthly_4900';
  }

  const label = String(summary.selected_membership || '').toLowerCase();
  if (!label) return null;
  if (label.includes('1년') || label.includes('연간') || label.includes('year')) {
    return 'yearly_290000';
  }
  if (label.includes('프리미엄') || label.includes('premium')) {
    return 'monthly_69000';
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

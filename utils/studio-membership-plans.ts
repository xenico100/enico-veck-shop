export type StudioMembershipPlanKey = 'monthly_4900' | 'monthly_13900' | 'monthly_69000';

export type StudioMembershipPlanOption = {
  key: StudioMembershipPlanKey;
  title: string;
  priceKrw: number;
  description: string;
};

export const STUDIO_MEMBERSHIP_PLAN_OPTIONS: StudioMembershipPlanOption[] = [
  {
    key: 'monthly_4900',
    title: '베이직 멤버십',
    priceKrw: 4900,
    description: '월간 Studio 멤버십'
  },
  {
    key: 'monthly_13900',
    title: '플러스 멤버십',
    priceKrw: 13900,
    description: '월간 Studio 멤버십'
  },
  {
    key: 'monthly_69000',
    title: '프리미엄 멤버십',
    priceKrw: 69000,
    description: '월간 Studio 멤버십'
  }
];

export const STUDIO_MEMBERSHIP_PLAN_LABEL_BY_KEY = Object.fromEntries(
  STUDIO_MEMBERSHIP_PLAN_OPTIONS.map((plan) => [plan.key, `${plan.title} (월 ${plan.priceKrw.toLocaleString('ko-KR')}원)`])
) as Record<StudioMembershipPlanKey, string>;

export const formatStudioMembershipPriceKrw = (priceKrw: number) =>
  `${new Intl.NumberFormat('ko-KR').format(priceKrw)}원 / 월`;

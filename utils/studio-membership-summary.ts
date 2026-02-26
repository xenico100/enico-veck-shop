import 'server-only';

import { createAdminClient } from '@/utils/supabase/adminClient';
import { isActiveStudioSubscriptionStatus } from '@/utils/studio-subscription';
import type { StudioMembershipPlanKey } from '@/utils/studio-membership-plans';

type AdminClient = ReturnType<typeof createAdminClient>;

type PayPalSubscriptionRow = {
  id: string;
  user_id: string | null;
  plan_id: string | null;
  status: string | null;
  current_period_end: string | null;
  last_event_at: string | null;
  created_at: string | null;
  raw: unknown;
};

type PayPalPlanRow = {
  id: string;
  name: string | null;
  amount: number | string | null;
  currency: string | null;
  interval: string | null;
};

type StudioAccessRow = {
  user_id: string;
  has_active_subscription: boolean;
};

export type StudioMembershipSummary = {
  user_id: string;
  has_active_subscription: boolean;
  subscription_id: string | null;
  subscription_status: string | null;
  selected_membership: string | null;
  subscribed_at: string | null;
  next_billing_at: string | null;
  plan_id: string | null;
  plan_amount: number | null;
  plan_currency: string | null;
  plan_interval: string | null;
};

const PLAN_ENV_BY_KEY: Record<StudioMembershipPlanKey, string> = {
  monthly_4900: 'PAYPAL_PLAN_ID_MONTHLY_4900',
  monthly_13900: 'PAYPAL_PLAN_ID_MONTHLY_13900',
  monthly_69000: 'PAYPAL_PLAN_ID_MONTHLY_69000'
};

const PLAN_LABEL_BY_KEY: Record<StudioMembershipPlanKey, string> = {
  monthly_4900: '베이직 멤버십 (월 4,900원)',
  monthly_13900: '플러스 멤버십 (월 13,900원)',
  monthly_69000: '프리미엄 멤버십 (월 69,000원)'
};

const getPlanLabelByIdFromEnv = (planId: string | null) => {
  if (!planId) return null;
  for (const [key, envKey] of Object.entries(PLAN_ENV_BY_KEY) as Array<[StudioMembershipPlanKey, string]>) {
    const envValue = process.env[envKey]?.trim();
    if (envValue && envValue === planId) {
      return PLAN_LABEL_BY_KEY[key];
    }
  }

  const legacy = process.env.PAYPAL_PLAN_ID_MONTHLY?.trim();
  if (legacy && legacy === planId) {
    return PLAN_LABEL_BY_KEY.monthly_4900;
  }
  return null;
};

const parseAmountNumber = (value: number | string | null | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeIso = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const getRawSubscriptionCreateTime = (raw: unknown) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  return normalizeIso(row.create_time);
};

const formatPlanFallbackLabel = (plan: PayPalPlanRow | null) => {
  if (!plan) return null;
  if (plan.name && plan.name.trim()) return plan.name.trim();

  const amount = parseAmountNumber(plan.amount);
  const currency = (plan.currency || '').trim().toUpperCase();
  if (amount != null && currency) {
    try {
      return `${new Intl.NumberFormat(currency === 'KRW' ? 'ko-KR' : 'en-US', {
        style: 'currency',
        currency
      }).format(amount)} / ${(plan.interval || 'month').toLowerCase()}`;
    } catch {
      return `${amount} ${currency}`;
    }
  }

  return null;
};

const buildDefaultSummary = (userId: string): StudioMembershipSummary => ({
  user_id: userId,
  has_active_subscription: false,
  subscription_id: null,
  subscription_status: null,
  selected_membership: null,
  subscribed_at: null,
  next_billing_at: null,
  plan_id: null,
  plan_amount: null,
  plan_currency: null,
  plan_interval: null
});

export async function getStudioMembershipSummaryMapForUsers(
  userIds: string[],
  adminClient?: AdminClient
) {
  const uniqueUserIds = Array.from(new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean)));
  const result = new Map<string, StudioMembershipSummary>();

  if (uniqueUserIds.length === 0) return result;

  const admin = adminClient ?? createAdminClient();

  const [subscriptionQuery, accessQuery] = await Promise.all([
    (admin as any)
      .from('paypal_subscriptions')
      .select('id,user_id,plan_id,status,current_period_end,last_event_at,created_at,raw')
      .in('user_id', uniqueUserIds)
      .order('last_event_at', { ascending: false }),
    (admin as any)
      .from('studio_access')
      .select('user_id,has_active_subscription')
      .in('user_id', uniqueUserIds)
  ]);

  if (subscriptionQuery.error) {
    throw new Error(`Failed to load PayPal subscriptions: ${subscriptionQuery.error.message}`);
  }
  if (accessQuery.error) {
    throw new Error(`Failed to load studio_access rows: ${accessQuery.error.message}`);
  }

  const subscriptionRows = Array.isArray(subscriptionQuery.data)
    ? (subscriptionQuery.data as PayPalSubscriptionRow[])
    : [];
  const accessRows = Array.isArray(accessQuery.data)
    ? (accessQuery.data as StudioAccessRow[])
    : [];

  const latestSubscriptionByUser = new Map<string, PayPalSubscriptionRow>();
  for (const row of subscriptionRows) {
    const userId = typeof row.user_id === 'string' ? row.user_id : null;
    if (!userId) continue;
    if (!latestSubscriptionByUser.has(userId)) {
      latestSubscriptionByUser.set(userId, row);
    }
  }

  const planIds = Array.from(
    new Set(
      Array.from(latestSubscriptionByUser.values())
        .map((row) => (typeof row.plan_id === 'string' ? row.plan_id.trim() : ''))
        .filter(Boolean)
    )
  );

  let planRows: PayPalPlanRow[] = [];
  if (planIds.length > 0) {
    const planQuery = await (admin as any)
      .from('paypal_plans')
      .select('id,name,amount,currency,interval')
      .in('id', planIds);
    if (planQuery.error) {
      throw new Error(`Failed to load PayPal plans: ${planQuery.error.message}`);
    }
    planRows = Array.isArray(planQuery.data) ? (planQuery.data as PayPalPlanRow[]) : [];
  }

  const planMap = new Map(planRows.map((plan) => [plan.id, plan]));
  const accessMap = new Map(accessRows.map((row) => [row.user_id, Boolean(row.has_active_subscription)]));

  for (const userId of uniqueUserIds) {
    const latest = latestSubscriptionByUser.get(userId) ?? null;
    const plan = latest?.plan_id ? planMap.get(latest.plan_id) ?? null : null;
    const inferredActive = latest ? isActiveStudioSubscriptionStatus(latest.status) : false;
    const cachedActive = accessMap.get(userId);
    const hasActiveSubscription = typeof cachedActive === 'boolean' ? cachedActive : inferredActive;
    const planAmount = parseAmountNumber(plan?.amount);
    const planCurrency = plan?.currency ? String(plan.currency).toUpperCase() : null;

    const selectedMembership =
      getPlanLabelByIdFromEnv(latest?.plan_id ?? null) ??
      formatPlanFallbackLabel(plan) ??
      null;

    result.set(userId, {
      user_id: userId,
      has_active_subscription: hasActiveSubscription,
      subscription_id: latest?.id ?? null,
      subscription_status: latest?.status ?? null,
      selected_membership: selectedMembership,
      subscribed_at: getRawSubscriptionCreateTime(latest?.raw) ?? normalizeIso(latest?.created_at) ?? null,
      next_billing_at: normalizeIso(latest?.current_period_end) ?? null,
      plan_id: latest?.plan_id ?? null,
      plan_amount: planAmount,
      plan_currency: planCurrency,
      plan_interval: plan?.interval ? String(plan.interval).toLowerCase() : null
    });
  }

  return result;
}

export async function getStudioMembershipSummaryForUser(
  userId: string,
  adminClient?: AdminClient
) {
  const normalized = String(userId || '').trim();
  if (!normalized) {
    throw new Error('userId is required');
  }
  const map = await getStudioMembershipSummaryMapForUsers([normalized], adminClient);
  return map.get(normalized) ?? buildDefaultSummary(normalized);
}

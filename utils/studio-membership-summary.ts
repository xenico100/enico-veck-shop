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
  updated_at: string | null;
};

type MembershipChangeOrderRow = {
  id: string;
  user_id: string | null;
  status: string | null;
  created_at: string | null;
  metadata: unknown;
};

type ScheduledMembershipChange = {
  orderId: string;
  targetPlanKey: StudioMembershipPlanKey;
  targetPlanTitle: string;
  effectiveAt: string;
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
  plan_cycle_days: number | null;
  scheduled_change_target_plan_key: StudioMembershipPlanKey | null;
  scheduled_change_target_membership: string | null;
  scheduled_change_effective_at: string | null;
  scheduled_change_order_id: string | null;
};

const PLAN_ENV_BY_KEY: Record<StudioMembershipPlanKey, string> = {
  monthly_4900: 'PAYPAL_PLAN_ID_MONTHLY_4900',
  monthly_13900: 'PAYPAL_PLAN_ID_MONTHLY_13900',
  monthly_69000: 'PAYPAL_PLAN_ID_MONTHLY_69000',
  yearly_290000: 'PAYPAL_PLAN_ID_YEARLY_290000'
};

const PLAN_LABEL_BY_KEY: Record<StudioMembershipPlanKey, string> = {
  monthly_4900: '베이직 멤버십 (월 4,900원)',
  monthly_13900: '플러스 멤버십 (월 13,900원)',
  monthly_69000: '프리미엄 멤버십 (월 69,000원)',
  yearly_290000: '프리미엄 멤버십 1년권 (연 290,000원)'
};

const PLAN_AMOUNT_BY_KEY: Record<StudioMembershipPlanKey, number> = {
  monthly_4900: 4900,
  monthly_13900: 13900,
  monthly_69000: 69000,
  yearly_290000: 290000
};

const PLAN_KEY_SET = new Set(
  Object.keys(PLAN_LABEL_BY_KEY) as StudioMembershipPlanKey[]
);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const isStudioMembershipPlanKey = (
  value: unknown
): value is StudioMembershipPlanKey =>
  typeof value === 'string' &&
  PLAN_KEY_SET.has(value as StudioMembershipPlanKey);

const getPlanKeyByIdFromEnv = (planId: string | null) => {
  if (!planId) return null;
  for (const [key, envKey] of Object.entries(PLAN_ENV_BY_KEY) as Array<
    [StudioMembershipPlanKey, string]
  >) {
    const envValue = process.env[envKey]?.trim();
    if (envValue && envValue === planId) {
      return key;
    }
  }

  const legacy = process.env.PAYPAL_PLAN_ID_MONTHLY?.trim();
  if (legacy && legacy === planId) {
    return 'monthly_4900' satisfies StudioMembershipPlanKey;
  }
  return null;
};

const getPlanLabelByIdFromEnv = (planId: string | null) => {
  const key = getPlanKeyByIdFromEnv(planId);
  return key ? PLAN_LABEL_BY_KEY[key] : null;
};

const parseAmountNumber = (value: number | string | null | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const intervalToCycleDays = (interval: string | null | undefined) => {
  const normalized = String(interval || '')
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  if (normalized === 'day' || normalized === 'daily') return 1;
  if (normalized === 'week' || normalized === 'weekly') return 7;
  if (normalized === 'month' || normalized === 'monthly') return 30;
  if (normalized === 'year' || normalized === 'yearly') return 365;
  return null;
};

const normalizeIso = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const hasMissingOrdersMetadataColumnError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();
  return (
    combined.includes('orders.metadata') ||
    (combined.includes('metadata') && combined.includes('orders'))
  );
};

const parseScheduledMembershipChange = (
  row: MembershipChangeOrderRow
): ScheduledMembershipChange | null => {
  if (!normalizeText(row.id)) return null;
  const metadata = asRecord(row.metadata);
  if (!metadata) return null;
  const orderKind = normalizeText(metadata.order_kind).toLowerCase();
  if (orderKind !== 'studio_membership_change_request') return null;

  const change = asRecord(metadata.studio_membership_change);
  if (!change) return null;
  const changeType = normalizeText(change.change_type).toLowerCase();
  if (changeType !== 'downgrade') return null;

  const targetPlanKeyRaw = normalizeText(change.target_plan_key);
  if (!isStudioMembershipPlanKey(targetPlanKeyRaw)) return null;

  const effectiveAt = normalizeIso(change.effective_at);
  if (!effectiveAt) return null;

  const targetPlanTitle =
    normalizeText(change.target_plan_title) ||
    PLAN_LABEL_BY_KEY[targetPlanKeyRaw];

  return {
    orderId: row.id,
    targetPlanKey: targetPlanKeyRaw,
    targetPlanTitle,
    effectiveAt
  };
};

const getRawSubscriptionCreateTime = (raw: unknown) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  return normalizeIso(row.create_time);
};

const getEstimatedNextBillingAt = (params: {
  row: PayPalSubscriptionRow | null;
  hasActiveSubscription: boolean;
  cycleDays: number | null;
  fallbackBaseIso?: string | null;
}) => {
  const explicit = normalizeIso(params.row?.current_period_end) ?? null;
  if (explicit) return explicit;
  if (!params.hasActiveSubscription) return null;

  const cycleDays = params.cycleDays ?? 30;
  const cycleMs = cycleDays * DAY_MS;
  if (!Number.isFinite(cycleMs) || cycleMs <= 0) return null;

  const baseCandidates = [
    normalizeIso(params.fallbackBaseIso),
    getRawSubscriptionCreateTime(params.row?.raw),
    normalizeIso(params.row?.created_at),
    normalizeIso(params.row?.last_event_at)
  ];

  let baseMs = Number.NaN;
  for (const candidate of baseCandidates) {
    const candidateMs = toUnixMs(candidate);
    if (Number.isFinite(candidateMs)) {
      baseMs = candidateMs;
      break;
    }
  }
  if (!Number.isFinite(baseMs)) return null;

  let nextMs = baseMs + cycleMs;
  const nowMs = Date.now();
  let guard = 0;
  while (nextMs <= nowMs && guard < 48) {
    nextMs += cycleMs;
    guard += 1;
  }

  if (!Number.isFinite(nextMs)) return null;
  return new Date(nextMs).toISOString();
};

const toUnixMs = (value: string | null | undefined) => {
  if (!value) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const getRowTimeMs = (row: PayPalSubscriptionRow) => {
  const candidates = [
    toUnixMs(normalizeIso(row.last_event_at)),
    toUnixMs(normalizeIso(row.created_at)),
    toUnixMs(getRawSubscriptionCreateTime(row.raw))
  ];
  for (const value of candidates) {
    if (Number.isFinite(value)) return value;
  }
  return Number.NaN;
};

const isManualSubscriptionRow = (
  row: PayPalSubscriptionRow | null | undefined
) => {
  const subscriptionId = typeof row?.id === 'string' ? row.id.trim() : '';
  const planId = typeof row?.plan_id === 'string' ? row.plan_id.trim() : '';
  return subscriptionId.startsWith('manual:') || planId.startsWith('manual_');
};

const getRowCurrentPeriodEndMs = (row: PayPalSubscriptionRow) =>
  toUnixMs(normalizeIso(row.current_period_end));

const getRowPlanAmount = (
  row: PayPalSubscriptionRow,
  planMap: Map<string, PayPalPlanRow>
) => {
  const planId = typeof row.plan_id === 'string' ? row.plan_id : '';
  if (!planId) return null;
  const plan = planMap.get(planId) ?? null;
  return parseAmountNumber(plan?.amount);
};

const compareRepresentativePriority = (
  a: PayPalSubscriptionRow,
  b: PayPalSubscriptionRow,
  planMap: Map<string, PayPalPlanRow>
) => {
  const aManual = isManualSubscriptionRow(a);
  const bManual = isManualSubscriptionRow(b);
  if (aManual !== bManual) {
    return aManual ? 1 : -1;
  }

  const bPeriodEnd = getRowCurrentPeriodEndMs(b);
  const aPeriodEnd = getRowCurrentPeriodEndMs(a);
  const hasBPeriodEnd = Number.isFinite(bPeriodEnd);
  const hasAPeriodEnd = Number.isFinite(aPeriodEnd);
  if (hasBPeriodEnd && hasAPeriodEnd && bPeriodEnd !== aPeriodEnd) {
    return bPeriodEnd - aPeriodEnd;
  }
  if (hasBPeriodEnd !== hasAPeriodEnd) {
    return hasBPeriodEnd ? -1 : 1;
  }

  const bAmount = getRowPlanAmount(b, planMap);
  const aAmount = getRowPlanAmount(a, planMap);
  const hasBAmount = bAmount != null;
  const hasAAmount = aAmount != null;
  if (hasBAmount && hasAAmount && bAmount !== aAmount) {
    return bAmount - aAmount;
  }
  if (hasBAmount !== hasAAmount) {
    return hasBAmount ? -1 : 1;
  }

  const bTime = getRowTimeMs(b);
  const aTime = getRowTimeMs(a);
  if (Number.isFinite(bTime) && Number.isFinite(aTime) && bTime !== aTime) {
    return bTime - aTime;
  }

  return 0;
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
  plan_interval: null,
  plan_cycle_days: null,
  scheduled_change_target_plan_key: null,
  scheduled_change_target_membership: null,
  scheduled_change_effective_at: null,
  scheduled_change_order_id: null
});

export async function getStudioMembershipSummaryMapForUsers(
  userIds: string[],
  adminClient?: AdminClient
) {
  const uniqueUserIds = Array.from(
    new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean))
  );
  const result = new Map<string, StudioMembershipSummary>();

  if (uniqueUserIds.length === 0) return result;

  const admin = adminClient ?? createAdminClient();

  const [subscriptionQuery, accessQuery] = await Promise.all([
    (admin as any)
      .from('paypal_subscriptions')
      .select(
        'id,user_id,plan_id,status,current_period_end,last_event_at,created_at,raw'
      )
      .in('user_id', uniqueUserIds)
      .order('last_event_at', { ascending: false }),
    (admin as any)
      .from('studio_access')
      .select('user_id,has_active_subscription,updated_at')
      .in('user_id', uniqueUserIds)
  ]);

  if (subscriptionQuery.error) {
    console.error(
      '[studio-membership-summary] paypal_subscriptions query failed',
      subscriptionQuery.error
    );
  }
  if (accessQuery.error) {
    console.error(
      '[studio-membership-summary] studio_access query failed',
      accessQuery.error
    );
  }

  const subscriptionRows =
    !subscriptionQuery.error && Array.isArray(subscriptionQuery.data)
      ? (subscriptionQuery.data as PayPalSubscriptionRow[])
      : [];
  const accessRows =
    !accessQuery.error && Array.isArray(accessQuery.data)
      ? (accessQuery.data as StudioAccessRow[])
      : [];

  let membershipChangeRows: MembershipChangeOrderRow[] = [];
  const membershipChangeQuery = await (admin as any)
    .from('orders')
    .select('id,user_id,status,created_at,metadata')
    .in('user_id', uniqueUserIds)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (membershipChangeQuery.error) {
    if (!hasMissingOrdersMetadataColumnError(membershipChangeQuery.error)) {
      console.error(
        '[studio-membership-summary] membership change orders query failed',
        membershipChangeQuery.error
      );
    }
  } else if (Array.isArray(membershipChangeQuery.data)) {
    membershipChangeRows = membershipChangeQuery.data as MembershipChangeOrderRow[];
  }

  const scheduledChangeMap = new Map<string, ScheduledMembershipChange>();
  for (const row of membershipChangeRows) {
    const userId = typeof row.user_id === 'string' ? row.user_id : null;
    if (!userId || scheduledChangeMap.has(userId)) continue;
    const parsed = parseScheduledMembershipChange(row);
    if (!parsed) continue;
    scheduledChangeMap.set(userId, parsed);
  }

  const subscriptionRowsByUser = new Map<string, PayPalSubscriptionRow[]>();
  for (const row of subscriptionRows) {
    const userId = typeof row.user_id === 'string' ? row.user_id : null;
    if (!userId) continue;
    const current = subscriptionRowsByUser.get(userId) ?? [];
    current.push(row);
    subscriptionRowsByUser.set(userId, current);
  }

  const planIds = Array.from(
    new Set(
      subscriptionRows
        .map((row) =>
          typeof row.plan_id === 'string' ? row.plan_id.trim() : ''
        )
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
      console.error(
        '[studio-membership-summary] paypal_plans query failed',
        planQuery.error
      );
    } else {
      planRows = Array.isArray(planQuery.data)
        ? (planQuery.data as PayPalPlanRow[])
        : [];
    }
  }

  const planMap = new Map(planRows.map((plan) => [plan.id, plan]));
  const accessMap = new Map(
    accessRows.map((row) => [
      row.user_id,
      {
        hasActive: Boolean(row.has_active_subscription),
        updatedAt: normalizeIso(row.updated_at)
      }
    ])
  );

  for (const userId of uniqueUserIds) {
    const rows = (subscriptionRowsByUser.get(userId) ?? []).slice();
    rows.sort((a, b) => {
      const bTime = getRowTimeMs(b);
      const aTime = getRowTimeMs(a);
      if (Number.isFinite(bTime) && Number.isFinite(aTime) && bTime !== aTime) {
        return bTime - aTime;
      }
      return 0;
    });

    const latest = rows[0] ?? null;
    const activeRows = rows.filter((row) =>
      isActiveStudioSubscriptionStatus(row.status)
    );
    const activeRepresentative =
      activeRows
        .slice()
        .sort((a, b) => compareRepresentativePriority(a, b, planMap))[0] ??
      null;

    const representative = activeRepresentative ?? latest;
    const plan = representative?.plan_id
      ? (planMap.get(representative.plan_id) ?? null)
      : null;
    const inferredActive = activeRows.length > 0;
    const accessRecord = accessMap.get(userId);
    const cachedActive = accessRecord?.hasActive;
    const accessUpdatedAt = accessRecord?.updatedAt ?? null;
    const hasActiveSubscription = inferredActive || cachedActive === true;
    const planKeyFromEnv = getPlanKeyByIdFromEnv(
      representative?.plan_id ?? null
    );
    let planAmount = parseAmountNumber(plan?.amount);
    let planCurrency = plan?.currency
      ? String(plan.currency).toUpperCase()
      : null;
    let planInterval = plan?.interval
      ? String(plan.interval).toLowerCase()
      : null;
    if (planAmount == null && planKeyFromEnv) {
      planAmount = PLAN_AMOUNT_BY_KEY[planKeyFromEnv];
    }
    if (!planCurrency && planKeyFromEnv) {
      planCurrency = 'KRW';
    }
    if (!planInterval && planKeyFromEnv) {
      planInterval = planKeyFromEnv === 'yearly_290000' ? 'year' : 'month';
    }
    let planCycleDays = intervalToCycleDays(planInterval);

    let selectedMembership = inferredActive
      ? (getPlanLabelByIdFromEnv(representative?.plan_id ?? null) ??
        formatPlanFallbackLabel(plan) ??
        (hasActiveSubscription
          ? isManualSubscriptionRow(representative)
            ? '관리자 수동 부여'
            : '활성 멤버십'
          : null))
      : (getPlanLabelByIdFromEnv(representative?.plan_id ?? null) ??
        formatPlanFallbackLabel(plan) ??
        (hasActiveSubscription ? '관리자 수동 부여' : null));
    const scheduledChange = scheduledChangeMap.get(userId) ?? null;
    let scheduledChangeTargetPlanKey: StudioMembershipPlanKey | null = null;
    let scheduledChangeTargetMembership: string | null = null;
    let scheduledChangeEffectiveAt: string | null = null;
    let scheduledChangeOrderId: string | null = null;
    if (scheduledChange && hasActiveSubscription) {
      scheduledChangeTargetPlanKey = scheduledChange.targetPlanKey;
      scheduledChangeTargetMembership = scheduledChange.targetPlanTitle;
      scheduledChangeEffectiveAt = scheduledChange.effectiveAt;
      scheduledChangeOrderId = scheduledChange.orderId;
    }
    const nextBillingAt = getEstimatedNextBillingAt({
      row: representative,
      hasActiveSubscription,
      cycleDays: planCycleDays,
      fallbackBaseIso: accessUpdatedAt
    });

    result.set(userId, {
      user_id: userId,
      has_active_subscription: hasActiveSubscription,
      subscription_id:
        representative?.id ??
        (hasActiveSubscription && !representative ? `manual:${userId}` : null),
      subscription_status:
        representative?.status ??
        (hasActiveSubscription && !representative ? 'MANUAL_GRANT' : null),
      selected_membership: selectedMembership,
      subscribed_at:
        getRawSubscriptionCreateTime(representative?.raw) ??
        normalizeIso(representative?.created_at) ??
        accessUpdatedAt ??
        null,
      next_billing_at: nextBillingAt,
      plan_id: representative?.plan_id ?? null,
      plan_amount: planAmount,
      plan_currency: planCurrency,
      plan_interval: planInterval,
      plan_cycle_days: planCycleDays,
      scheduled_change_target_plan_key: scheduledChangeTargetPlanKey,
      scheduled_change_target_membership: scheduledChangeTargetMembership,
      scheduled_change_effective_at: scheduledChangeEffectiveAt,
      scheduled_change_order_id: scheduledChangeOrderId
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
  const map = await getStudioMembershipSummaryMapForUsers(
    [normalized],
    adminClient
  );
  return map.get(normalized) ?? buildDefaultSummary(normalized);
}

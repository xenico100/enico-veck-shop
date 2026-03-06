import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  STUDIO_MEMBERSHIP_PLAN_OPTIONS,
  isStudioMembershipTierDowngrade,
  normalizeStudioMembershipPlanKey,
  type StudioMembershipPlanKey
} from '@/utils/studio-membership-plans';
import {
  getBankTransferInfo,
  hasBankTransferAccountConfigured
} from '@/utils/bank-transfer';
import { isTrustedBankTransferProofUrl } from '@/utils/bank-transfer-proof';
import { sendAdminSalesNotification } from '@/utils/admin-sales-notifier';
import { normalizeOrderRecord } from '@/utils/orders';
import { buildRateLimitKey, consumeRateLimit } from '@/utils/rate-limit';
import { getStudioMembershipSummaryForUser } from '@/utils/studio-membership-summary';

export const runtime = 'nodejs';

type MembershipBankTransferRequest = {
  studioPostId?: string;
  planKey?: StudioMembershipPlanKey;
  customerContact?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  bankTransfer?: {
    depositorName?: string;
    proofImageUrl?: string;
  };
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const MEMBERSHIP_ORDER_RATE_LIMIT_MAX = 20;
const MEMBERSHIP_ORDER_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const planMap = new Map(
  STUDIO_MEMBERSHIP_PLAN_OPTIONS.map((plan) => [plan.key, plan])
);

const DAY_MS = 24 * 60 * 60 * 1000;

const parseAmount = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const parseIsoMs = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeHttpUrl = (value: unknown) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const normalizeCustomerContact = (
  value: unknown,
  fallback: { name: string; email: string; phone: string; address: string }
) => {
  const source = isRecord(value) ? value : {};
  const name = normalizeText(source.name) || fallback.name;
  const email = normalizeText(source.email) || fallback.email;
  const phone = normalizeText(source.phone) || fallback.phone;
  const address = normalizeText(source.address) || fallback.address;

  if (!name || !email || !phone || !address) return null;

  return { name, email, phone, address };
};

const normalizeBankTransferPayload = (
  value: unknown,
  fallbackDepositorName: string
) => {
  if (!isRecord(value)) return null;
  const depositorName =
    normalizeText(value.depositorName) || fallbackDepositorName;
  const proofImageUrl = normalizeHttpUrl(value.proofImageUrl);
  if (proofImageUrl && !isTrustedBankTransferProofUrl(proofImageUrl)) return null;
  if (!depositorName || !proofImageUrl) return null;
  return {
    depositorName,
    proofImageUrl
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const inferPlanKeyFromMembership = (summary: {
  has_active_subscription?: boolean;
  selected_membership?: string | null;
  plan_amount?: number | string | null;
}) => {
  if (!summary?.has_active_subscription) return null;

  const amount = parseAmount(summary.plan_amount);
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
  if (label.includes('플러스') || label.includes('plus'))
    return 'monthly_13900';
  if (label.includes('베이직') || label.includes('basic'))
    return 'monthly_4900';
  return null;
};

const resolveMembershipNextBillingMs = (summary: {
  next_billing_at?: string | null;
  subscribed_at?: string | null;
  plan_cycle_days?: number | null;
}) => {
  const directMs = parseIsoMs(summary.next_billing_at);
  if (Number.isFinite(directMs)) return directMs;

  const subscribedMs = parseIsoMs(summary.subscribed_at);
  if (!Number.isFinite(subscribedMs)) return Number.NaN;

  const cycleDays =
    typeof summary.plan_cycle_days === 'number' && summary.plan_cycle_days > 0
      ? summary.plan_cycle_days
      : 30;
  let nextMs = subscribedMs + cycleDays * DAY_MS;
  const nowMs = Date.now();
  let guard = 0;
  while (nextMs <= nowMs && guard < 48) {
    nextMs += cycleDays * DAY_MS;
    guard += 1;
  }
  return nextMs;
};

const getRemainingDays = (summary: {
  next_billing_at?: string | null;
  subscribed_at?: string | null;
  plan_cycle_days?: number | null;
}) => {
  const nextMs = resolveMembershipNextBillingMs(summary);
  if (!Number.isFinite(nextMs)) return null;
  const diff = nextMs - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / DAY_MS);
};

const getProrationDueNow = (params: {
  currentAmount: number | null;
  targetAmount: number;
  remainingDays: number | null;
  cycleDays: number;
}) => {
  const { currentAmount, targetAmount, remainingDays, cycleDays } = params;
  if (currentAmount == null || remainingDays == null || cycleDays <= 0)
    return null;

  const safeRemainingDays = Math.max(0, Math.min(remainingDays, cycleDays));
  const ratio = safeRemainingDays / cycleDays;
  const currentCredit = Math.round(currentAmount * ratio);
  const targetRemainingCost = Math.round(targetAmount * ratio);
  const dueNow = Math.max(0, targetRemainingCost - currentCredit);

  return {
    currentCredit,
    targetRemainingCost,
    dueNow
  };
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError('로그인이 필요합니다.', 401);
  }

  const rateLimit = consumeRateLimit({
    key: buildRateLimitKey({
      request,
      scope: 'studio-membership-bank-transfer',
      userId: user.id
    }),
    max: MEMBERSHIP_ORDER_RATE_LIMIT_MAX,
    windowMs: MEMBERSHIP_ORDER_RATE_LIMIT_WINDOW_MS
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const body = (await request
    .json()
    .catch(() => ({}))) as MembershipBankTransferRequest;
  const requestedPlanKeyRaw =
    typeof body.planKey === 'string' ? body.planKey : 'monthly_4900';
  const requestedPlanKey =
    normalizeStudioMembershipPlanKey(requestedPlanKeyRaw) ?? 'monthly_4900';
  const plan = planMap.get(requestedPlanKey as StudioMembershipPlanKey);
  if (!plan) {
    return jsonError('유효하지 않은 멤버십 플랜입니다.', 400);
  }

  const studioPostId =
    typeof body.studioPostId === 'string' ? body.studioPostId.trim() : '';
  const bankTransferInfo = getBankTransferInfo();
  const hasConfiguredAccount =
    hasBankTransferAccountConfigured(bankTransferInfo);

  let prorationInfo: {
    enabled: boolean;
    current_plan_key: string | null;
    target_plan_key: string;
    remaining_days: number | null;
    cycle_days: number;
    current_credit_krw: number | null;
    target_remaining_cost_krw: number | null;
    due_now_krw: number | null;
  } | null = null;
  let chargeAmountKrw = plan.priceKrw;

  try {
    const membershipSummary = await getStudioMembershipSummaryForUser(user.id);
    if (membershipSummary.has_active_subscription) {
      const currentPlanKey = inferPlanKeyFromMembership(membershipSummary);
      if (currentPlanKey && currentPlanKey === plan.key) {
        return jsonError('이미 사용 중인 멤버십 플랜입니다.', 400);
      }
      if (
        currentPlanKey &&
        isStudioMembershipTierDowngrade(currentPlanKey, plan.key)
      ) {
        return jsonError(
          '낮은 멤버십 변경은 다음 결제일부터 적용되는 변경 예약으로 신청해 주세요.',
          400
        );
      }

      if (plan.billingCycle === 'monthly') {
        const currentPlanAmount = parseAmount(membershipSummary.plan_amount);
        const cycleDays =
          typeof membershipSummary.plan_cycle_days === 'number' &&
          membershipSummary.plan_cycle_days > 0
            ? membershipSummary.plan_cycle_days
            : 30;
        const remainingDays = getRemainingDays(membershipSummary);
        const proration = getProrationDueNow({
          currentAmount: currentPlanAmount,
          targetAmount: plan.priceKrw,
          remainingDays,
          cycleDays
        });

        if (proration) {
          chargeAmountKrw = proration.dueNow;
        }

        prorationInfo = {
          enabled: true,
          current_plan_key: currentPlanKey,
          target_plan_key: plan.key,
          remaining_days: remainingDays,
          cycle_days: cycleDays,
          current_credit_krw: proration?.currentCredit ?? null,
          target_remaining_cost_krw: proration?.targetRemainingCost ?? null,
          due_now_krw: proration?.dueNow ?? null
        };
      }
    }
  } catch (membershipSummaryError) {
    console.warn(
      '[studio/membership/bank-transfer] membership summary lookup failed',
      membershipSummaryError
    );
  }

  const { data: profileRow } = await (supabase as any)
    .from('users')
    .select('name,full_name,phone,address')
    .eq('id', user.id)
    .maybeSingle();

  const profileName =
    normalizeText(profileRow?.name) ||
    normalizeText(profileRow?.full_name) ||
    normalizeText(user.user_metadata?.full_name) ||
    normalizeText(user.user_metadata?.name) ||
    '회원';
  const profilePhone = normalizeText(profileRow?.phone);
  const profileAddress = normalizeText(profileRow?.address);
  const profileEmail = normalizeText(user.email);

  const customerContact = normalizeCustomerContact(body.customerContact, {
    name: profileName,
    email: profileEmail,
    phone: profilePhone,
    address: profileAddress
  });
  if (!customerContact) {
    return jsonError(
      '입금자 정보(이름/이메일/핸드폰/주소)를 모두 입력해 주세요.',
      400
    );
  }
  const bankTransferPayload = normalizeBankTransferPayload(
    body.bankTransfer,
    customerContact.name
  );
  if (!bankTransferPayload) {
    return jsonError('입금자명과 이체인증 이미지를 확인해 주세요.', 400);
  }

  const nowIso = new Date().toISOString();

  const orderPayload = {
    user_id: user.id,
    status: 'pending',
    currency: 'KRW',
    amount_total: chargeAmountKrw,
    paypal_order_id: null,
    shipping_carrier: null,
    shipping_status: 'preparing',
    tracking_number: null,
    items: [
      {
        id: plan.key,
        type: 'studio_membership',
        title: plan.title,
        price: chargeAmountKrw,
        qty: 1,
        image: null
      }
    ],
    shipping_address: {
      customer_contact: customerContact,
      payment_method: 'bank_transfer',
      bank_transfer: {
        bank_name: bankTransferInfo.bankName || null,
        account_number: bankTransferInfo.accountNumber || null,
        account_holder: bankTransferInfo.accountHolder || null,
        depositor_name: bankTransferPayload.depositorName,
        proof_image_url: bankTransferPayload.proofImageUrl,
        notice: bankTransferInfo.notice,
        transfer_status: 'awaiting',
        requested_at: nowIso
      }
    },
    metadata: {
      payment_method: 'bank_transfer',
      transfer_status: 'awaiting',
      requested_at: nowIso,
      order_kind: 'studio_membership',
      studio_membership: {
        plan_key: plan.key,
        plan_title: plan.title,
        plan_price_krw: plan.priceKrw,
        plan_billing_cycle: plan.billingCycle,
        plan_duration_days: plan.durationDays,
        charged_amount_krw: chargeAmountKrw,
        studio_post_id: studioPostId || null,
        auto_renewal: false
      },
      membership_proration: prorationInfo,
      bank_transfer: {
        depositor_name: bankTransferPayload.depositorName,
        proof_image_url: bankTransferPayload.proofImageUrl
      },
      account_configured: hasConfiguredAccount
    }
  };

  const selectColumns =
    'id,user_id,status,currency,amount_total,paypal_order_id,created_at,items,shipping_address,tracking_number,shipping_carrier,shipping_status,metadata';

  let insertResult = await (supabase as any)
    .from('orders')
    .insert(orderPayload)
    .select(selectColumns)
    .single();

  if (insertResult.error) {
    try {
      const { createAdminClient } =
        await import('@/utils/supabase/adminClient');
      const adminClient = createAdminClient();
      insertResult = await (adminClient as any)
        .from('orders')
        .insert(orderPayload)
        .select(selectColumns)
        .single();
    } catch (adminError) {
      console.error(
        '[studio/membership/bank-transfer] admin fallback failed',
        adminError
      );
    }
  }

  if (insertResult.error || !insertResult.data) {
    return jsonError(
      insertResult.error?.message ||
        '멤버십 계좌이체 신청을 저장하지 못했습니다.',
      500,
      insertResult.error
    );
  }

  const order = normalizeOrderRecord(insertResult.data);
  const orderId = typeof order?.id === 'string' ? order.id : '';
  const orderRef = orderId ? orderId.slice(0, 8).toUpperCase() : null;

  await sendAdminSalesNotification({
    eventLabel: '멤버십 계좌이체 가입 신청',
    paymentMethod: '계좌이체',
    orderId: orderId || null,
    items: [
      {
        title: plan.title,
        quantity: 1,
        price: chargeAmountKrw,
        currency: 'KRW'
      }
    ],
    customer: {
      name: customerContact.name,
      email: customerContact.email,
      phone: customerContact.phone,
      address: customerContact.address
    },
    amountTotal: chargeAmountKrw,
    currency: 'KRW',
    bankTransfer: {
      depositorName: bankTransferPayload.depositorName,
      proofImageUrl: bankTransferPayload.proofImageUrl
    },
    note: hasConfiguredAccount
      ? `플랜키: ${plan.key}${prorationInfo?.enabled ? `, 차등청구=${chargeAmountKrw}원` : ''}`
      : `플랜키: ${plan.key}${prorationInfo?.enabled ? `, 차등청구=${chargeAmountKrw}원` : ''} (계좌정보 미설정)`
  });

  return NextResponse.json({
    ok: true,
    data: order,
    bankTransfer: {
      ...bankTransferInfo,
      accountConfigured: hasConfiguredAccount,
      orderRef,
      depositorName: bankTransferPayload.depositorName,
      proofImageUrl: bankTransferPayload.proofImageUrl
    },
    plan: {
      key: plan.key,
      title: plan.title,
      priceKrw: plan.priceKrw,
      billingCycle: plan.billingCycle,
      durationDays: plan.durationDays
    },
    proration: prorationInfo
  });
}

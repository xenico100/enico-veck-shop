import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  STUDIO_MEMBERSHIP_PLAN_OPTIONS,
  getStudioMembershipPlanOptionByKey,
  inferStudioMembershipPlanKeyFromSummary,
  isStudioMembershipTierDowngrade,
  type StudioMembershipPlanKey
} from '@/utils/studio-membership-plans';
import { getStudioMembershipSummaryForUser } from '@/utils/studio-membership-summary';
import { sendAdminSalesNotification } from '@/utils/admin-sales-notifier';
import { normalizeOrderRecord } from '@/utils/orders';

export const runtime = 'nodejs';

type MembershipChangeRequestBody = {
  planKey?: StudioMembershipPlanKey;
  targetPlanKey?: StudioMembershipPlanKey;
};

const planMap = new Map(
  STUDIO_MEMBERSHIP_PLAN_OPTIONS.map((plan) => [plan.key, plan] as const)
);

const DAY_MS = 24 * 60 * 60 * 1000;

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const parseIsoMs = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const resolveNextBillingAtIso = (membershipSummary: {
  next_billing_at?: string | null;
  subscribed_at?: string | null;
  plan_cycle_days?: number | null;
}) => {
  const directMs = parseIsoMs(membershipSummary.next_billing_at);
  if (Number.isFinite(directMs)) {
    return new Date(directMs).toISOString();
  }

  const subscribedMs = parseIsoMs(membershipSummary.subscribed_at);
  const cycleDays =
    typeof membershipSummary.plan_cycle_days === 'number' &&
    membershipSummary.plan_cycle_days > 0
      ? membershipSummary.plan_cycle_days
      : 30;
  if (Number.isFinite(subscribedMs)) {
    let nextMs = subscribedMs + cycleDays * DAY_MS;
    const nowMs = Date.now();
    let guard = 0;
    while (nextMs <= nowMs && guard < 48) {
      nextMs += cycleDays * DAY_MS;
      guard += 1;
    }
    if (Number.isFinite(nextMs)) {
      return new Date(nextMs).toISOString();
    }
  }

  return new Date(Date.now() + cycleDays * DAY_MS).toISOString();
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

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError('로그인이 필요합니다.', 401);
  }

  const body = (await request
    .json()
    .catch(() => ({}))) as MembershipChangeRequestBody;
  const requestedPlanKey =
    normalizeText(body.targetPlanKey) || normalizeText(body.planKey);
  const targetPlan = planMap.get(requestedPlanKey as StudioMembershipPlanKey);

  if (!targetPlan) {
    return jsonError('유효하지 않은 멤버십 플랜입니다.', 400);
  }

  const membershipSummary = await getStudioMembershipSummaryForUser(user.id);
  if (!membershipSummary.has_active_subscription) {
    return jsonError('현재 활성 멤버십이 없습니다.', 400);
  }

  const currentPlanKey = inferStudioMembershipPlanKeyFromSummary(membershipSummary);
  if (!currentPlanKey) {
    return jsonError(
      '현재 멤버십 플랜을 확인하지 못했습니다. 관리자에게 문의해 주세요.',
      400
    );
  }

  if (currentPlanKey === targetPlan.key) {
    return jsonError('이미 사용 중인 멤버십 플랜입니다.', 400);
  }

  const currentPlan = getStudioMembershipPlanOptionByKey(currentPlanKey);
  if (!currentPlan) {
    return jsonError(
      '현재 멤버십 정보를 확인하지 못했습니다. 관리자에게 문의해 주세요.',
      400
    );
  }

  if (!isStudioMembershipTierDowngrade(currentPlan.key, targetPlan.key)) {
    return jsonError(
      '상향/동일 등급 변경은 일반 결제 흐름으로 진행해 주세요.',
      400
    );
  }

  const effectiveAt = resolveNextBillingAtIso(membershipSummary);

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
  const profileEmail = normalizeText(user.email);
  const profilePhone = normalizeText(profileRow?.phone);
  const profileAddress = normalizeText(profileRow?.address);

  const nowIso = new Date().toISOString();
  const orderPayloadWithMetadata = {
    user_id: user.id,
    status: 'pending',
    currency: 'KRW',
    amount_total: 0,
    paypal_order_id: null,
    shipping_carrier: null,
    shipping_status: 'preparing',
    tracking_number: null,
    items: [
      {
        id: `membership-change-${targetPlan.key}`,
        type: 'studio_membership_change',
        title: `멤버십 변경 예약: ${currentPlan.title} -> ${targetPlan.title}`,
        price: 0,
        qty: 1,
        image: null
      }
    ],
    shipping_address: {
      customer_contact: {
        name: profileName,
        email: profileEmail,
        phone: profilePhone,
        address: profileAddress
      },
      payment_method: 'membership_change_request'
    },
    metadata: {
      order_kind: 'studio_membership_change_request',
      requested_at: nowIso,
      studio_membership_change: {
        change_type: 'downgrade',
        current_plan_key: currentPlan.key,
        current_plan_title: currentPlan.title,
        target_plan_key: targetPlan.key,
        target_plan_title: targetPlan.title,
        effective_at: effectiveAt
      }
    }
  };

  const selectColumnsWithMetadata =
    'id,user_id,status,currency,amount_total,paypal_order_id,created_at,items,shipping_address,tracking_number,shipping_carrier,shipping_status,metadata';
  const selectColumnsWithoutMetadata =
    'id,user_id,status,currency,amount_total,paypal_order_id,created_at,items,shipping_address,tracking_number,shipping_carrier,shipping_status';

  let insertResult = await (supabase as any)
    .from('orders')
    .insert(orderPayloadWithMetadata)
    .select(selectColumnsWithMetadata)
    .single();

  if (
    insertResult.error &&
    hasMissingOrdersMetadataColumnError(insertResult.error)
  ) {
    const { metadata: _metadata, ...orderPayloadWithoutMetadata } =
      orderPayloadWithMetadata;
    const fallbackResult = await (supabase as any)
      .from('orders')
      .insert(orderPayloadWithoutMetadata)
      .select(selectColumnsWithoutMetadata)
      .single();
    insertResult = {
      ...fallbackResult,
      data:
        fallbackResult.data && typeof fallbackResult.data === 'object'
          ? {
              ...(fallbackResult.data as Record<string, unknown>),
              metadata: null
            }
          : fallbackResult.data
    };
  }

  if (insertResult.error || !insertResult.data) {
    return jsonError(
      insertResult.error?.message || '멤버십 변경 예약 요청을 저장하지 못했습니다.',
      500,
      insertResult.error
    );
  }

  const order = normalizeOrderRecord(insertResult.data);
  const orderId = typeof order?.id === 'string' ? order.id : '';
  const orderRef = orderId ? orderId.slice(0, 8).toUpperCase() : null;

  await sendAdminSalesNotification({
    eventLabel: '멤버십 다운그레이드 예약 요청',
    paymentMethod: '마이페이지 멤버십 변경',
    orderId: orderId || null,
    items: [
      {
        title: `${currentPlan.title} -> ${targetPlan.title}`,
        quantity: 1,
        price: 0,
        currency: 'KRW'
      }
    ],
    customer: {
      name: profileName,
      email: profileEmail || null,
      phone: profilePhone || null,
      address: profileAddress || null
    },
    amountTotal: 0,
    currency: 'KRW',
    note: `다운그레이드 예약 적용일: ${effectiveAt}`
  });

  return NextResponse.json({
    ok: true,
    data: order,
    membershipChange: {
      currentPlanKey: currentPlan.key,
      currentPlanTitle: currentPlan.title,
      targetPlanKey: targetPlan.key,
      targetPlanTitle: targetPlan.title,
      effectiveAt,
      orderRef
    }
  });
}

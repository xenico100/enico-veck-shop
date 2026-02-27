import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  STUDIO_MEMBERSHIP_PLAN_OPTIONS,
  type StudioMembershipPlanKey
} from '@/utils/studio-membership-plans';
import {
  getBankTransferInfo,
  hasBankTransferAccountConfigured
} from '@/utils/bank-transfer';
import { sendAdminSalesNotification } from '@/utils/admin-sales-notifier';
import { normalizeOrderRecord } from '@/utils/orders';

export const runtime = 'nodejs';

type MembershipBankTransferRequest = {
  studioPostId?: string;
  planKey?: StudioMembershipPlanKey;
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const planMap = new Map(
  STUDIO_MEMBERSHIP_PLAN_OPTIONS.map((plan) => [plan.key, plan])
);

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError('로그인이 필요합니다.', 401);
  }

  const body = (await request.json().catch(() => ({}))) as MembershipBankTransferRequest;
  const requestedPlanKey =
    typeof body.planKey === 'string' ? body.planKey : 'monthly_4900';
  const plan = planMap.get(requestedPlanKey as StudioMembershipPlanKey);
  if (!plan) {
    return jsonError('유효하지 않은 멤버십 플랜입니다.', 400);
  }

  const studioPostId = typeof body.studioPostId === 'string' ? body.studioPostId.trim() : '';
  const bankTransferInfo = getBankTransferInfo();
  const hasConfiguredAccount = hasBankTransferAccountConfigured(bankTransferInfo);

  const { data: profileRow } = await (supabase as any)
    .from('users')
    .select('name,full_name,phone,address')
    .eq('id', user.id)
    .maybeSingle();

  const profileName =
    (typeof profileRow?.name === 'string' && profileRow.name.trim()) ||
    (typeof profileRow?.full_name === 'string' && profileRow.full_name.trim()) ||
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    '회원';
  const profilePhone =
    typeof profileRow?.phone === 'string' ? profileRow.phone.trim() : '';
  const profileAddress =
    typeof profileRow?.address === 'string' ? profileRow.address.trim() : '';

  const nowIso = new Date().toISOString();
  const customerContact = {
    name: profileName,
    email: user.email ?? '',
    phone: profilePhone,
    address: profileAddress
  };

  const orderPayload = {
    user_id: user.id,
    status: 'pending',
    currency: 'KRW',
    amount_total: plan.priceKrw,
    paypal_order_id: null,
    shipping_carrier: null,
    shipping_status: 'preparing',
    tracking_number: null,
    items: [
      {
        id: plan.key,
        type: 'studio_membership',
        title: plan.title,
        price: plan.priceKrw,
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
        studio_post_id: studioPostId || null,
        auto_renewal: false
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
      const { createAdminClient } = await import('@/utils/supabase/adminClient');
      const adminClient = createAdminClient();
      insertResult = await (adminClient as any)
        .from('orders')
        .insert(orderPayload)
        .select(selectColumns)
        .single();
    } catch (adminError) {
      console.error('[studio/membership/bank-transfer] admin fallback failed', adminError);
    }
  }

  if (insertResult.error || !insertResult.data) {
    return jsonError(
      insertResult.error?.message || '멤버십 계좌이체 신청을 저장하지 못했습니다.',
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
        price: plan.priceKrw,
        currency: 'KRW'
      }
    ],
    customer: {
      name: customerContact.name,
      email: customerContact.email,
      phone: customerContact.phone,
      address: customerContact.address
    },
    amountTotal: plan.priceKrw,
    currency: 'KRW',
    note: hasConfiguredAccount
      ? `플랜키: ${plan.key}`
      : `플랜키: ${plan.key} (계좌정보 미설정)`
  });

  return NextResponse.json({
    ok: true,
    data: order,
    bankTransfer: {
      ...bankTransferInfo,
      accountConfigured: hasConfiguredAccount,
      orderRef,
      depositorName: customerContact.name
    },
    plan: {
      key: plan.key,
      title: plan.title,
      priceKrw: plan.priceKrw
    }
  });
}

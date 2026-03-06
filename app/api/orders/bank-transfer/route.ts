import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getBankTransferInfo,
  hasBankTransferAccountConfigured
} from '@/utils/bank-transfer';
import { isTrustedBankTransferProofUrl } from '@/utils/bank-transfer-proof';
import { sendAdminSalesNotification } from '@/utils/admin-sales-notifier';
import { normalizeOrderRecord } from '@/utils/orders';
import { buildRateLimitKey, consumeRateLimit } from '@/utils/rate-limit';

export const runtime = 'nodejs';

type CartItemPayload = {
  key?: string;
  id?: string;
  type?: string;
  title?: string;
  image?: string | null;
  price?: number | null;
  currency?: string;
  quantity?: number;
};

type BankTransferOrderRequest = {
  totalKRW?: number | string;
  items?: CartItemPayload[];
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

const ORDER_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const ORDER_RATE_LIMIT_MAX_AUTHENTICATED = 20;
const ORDER_RATE_LIMIT_MAX_GUEST = 8;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeCartItems = (input: unknown) => {
  if (!Array.isArray(input)) return [] as Array<Record<string, unknown>>;

  return input
    .map((item) => {
      if (!isRecord(item)) return null;

      const id = typeof item.id === 'string' ? item.id.trim() : '';
      const type =
        typeof item.type === 'string' ? item.type.trim().toLowerCase() : '';
      const title = typeof item.title === 'string' ? item.title.trim() : '';
      const image = typeof item.image === 'string' ? item.image : null;
      const currency =
        typeof item.currency === 'string' && item.currency.trim()
          ? item.currency.trim().toUpperCase()
          : 'KRW';
      const quantityRaw = Number(item.quantity ?? 1);
      const quantity =
        Number.isFinite(quantityRaw) && quantityRaw > 0
          ? Math.floor(quantityRaw)
          : 1;
      const priceRaw = Number(item.price);
      const price =
        Number.isFinite(priceRaw) && priceRaw > 0 ? Math.round(priceRaw) : null;
      if (!title || !id || !type || price == null) return null;

      return {
        key: typeof item.key === 'string' ? item.key : id,
        id,
        type,
        title,
        image,
        currency,
        quantity,
        price,
        line_total: Math.round(price * quantity)
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
};

const normalizeCustomerContact = (value: unknown) => {
  if (!isRecord(value)) return null;

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const email = typeof value.email === 'string' ? value.email.trim() : '';
  const phone = typeof value.phone === 'string' ? value.phone.trim() : '';
  const address = typeof value.address === 'string' ? value.address.trim() : '';

  if (!name || !email || !phone || !address) {
    return null;
  }

  return { name, email, phone, address };
};

const normalizeHttpUrl = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const normalizeBankTransferPayload = (
  value: unknown,
  fallbackDepositorName: string
) => {
  if (!isRecord(value)) return null;

  const depositorNameRaw =
    typeof value.depositorName === 'string' ? value.depositorName.trim() : '';
  const depositorName = depositorNameRaw || fallbackDepositorName;
  const proofImageUrl = normalizeHttpUrl(value.proofImageUrl);
  if (proofImageUrl && !isTrustedBankTransferProofUrl(proofImageUrl)) {
    return null;
  }

  if (!depositorName || !proofImageUrl) {
    return null;
  }

  return {
    depositorName,
    proofImageUrl
  };
};

const getFriendlyInsertError = (message: string) => {
  const lower = message.toLowerCase();
  if (
    lower.includes('row-level security') ||
    lower.includes('permission denied')
  ) {
    return '주문 저장 권한이 없어 주문을 저장하지 못했습니다.';
  }
  if (lower.includes('orders') && lower.includes('column')) {
    return 'orders 테이블 컬럼 구성이 결제 저장 코드와 다릅니다.';
  }
  return message || '계좌이체 주문 저장에 실패했습니다.';
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn(
      '[orders/bank-transfer] auth lookup warning (continuing as guest)',
      {
        message: authError.message
      }
    );
  }

  const rateLimit = consumeRateLimit({
    key: buildRateLimitKey({
      request,
      scope: 'order-bank-transfer',
      userId: user?.id ?? null
    }),
    max: user ? ORDER_RATE_LIMIT_MAX_AUTHENTICATED : ORDER_RATE_LIMIT_MAX_GUEST,
    windowMs: ORDER_RATE_LIMIT_WINDOW_MS
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: '주문 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
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
    .catch(() => ({}))) as BankTransferOrderRequest;
  const customerContact = normalizeCustomerContact(body.customerContact);
  if (!customerContact) {
    return jsonError(
      '주문자 정보(이름, 이메일, 연락처, 주소)를 모두 입력해 주세요.',
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

  const items = normalizeCartItems(body.items);
  if (items.length === 0) {
    return jsonError('계좌이체 주문 항목이 없습니다.', 400);
  }

  const computedAmountTotal = items.reduce((sum, item) => {
    const row = item as Record<string, unknown>;
    const lineTotal = Number(row.line_total);
    return Number.isFinite(lineTotal) && lineTotal > 0 ? sum + lineTotal : sum;
  }, 0);
  const requestedAmountTotal = Math.round(Number(body.totalKRW ?? 0));
  const amountTotal =
    Number.isFinite(computedAmountTotal) && computedAmountTotal > 0
      ? computedAmountTotal
      : Number.isFinite(requestedAmountTotal) && requestedAmountTotal > 0
        ? requestedAmountTotal
        : 0;

  if (amountTotal <= 0) {
    return jsonError('유효한 주문 금액이 필요합니다.', 400);
  }

  const bankTransferInfo = getBankTransferInfo();
  const hasConfiguredAccount =
    hasBankTransferAccountConfigured(bankTransferInfo);

  const nowIso = new Date().toISOString();
  const orderPayload = {
    user_id: user?.id ?? null,
    status: 'pending',
    currency: 'KRW',
    amount_total: amountTotal,
    paypal_order_id: null,
    shipping_carrier: null,
    shipping_status: 'preparing',
    tracking_number: null,
    items,
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
      bank_transfer: {
        depositor_name: bankTransferPayload.depositorName,
        proof_image_url: bankTransferPayload.proofImageUrl
      },
      account_configured: hasConfiguredAccount
    }
  };

  const selectColumns =
    'id,user_id,status,currency,amount_total,paypal_order_id,created_at,items,shipping_address,tracking_number,shipping_carrier,shipping_status,metadata';

  const insertWithClient = async (dbClient: any) =>
    await dbClient
      .from('orders')
      .insert(orderPayload)
      .select(selectColumns)
      .single();

  let insertResult = await insertWithClient(supabase as any);

  if (
    insertResult.error &&
    ((insertResult.error.message || '')
      .toLowerCase()
      .includes('row-level security') ||
      (insertResult.error.message || '')
        .toLowerCase()
        .includes('permission denied'))
  ) {
    try {
      const { createAdminClient } =
        await import('@/utils/supabase/adminClient');
      const adminClient = createAdminClient();
      insertResult = await insertWithClient(adminClient as any);
    } catch (adminError) {
      console.error('[orders/bank-transfer] admin fallback failed', adminError);
    }
  }

  if (insertResult.error || !insertResult.data) {
    return jsonError(
      getFriendlyInsertError(insertResult.error?.message || ''),
      500,
      insertResult.error
    );
  }

  const order = normalizeOrderRecord(insertResult.data);
  const orderId = typeof order?.id === 'string' ? order.id : '';
  const orderRef = orderId ? orderId.slice(0, 8).toUpperCase() : null;

  const notificationItems = items.map((item) => ({
    title: typeof item.title === 'string' ? item.title : '상품명 미상',
    quantity: Number(item.quantity ?? 1),
    price:
      typeof item.price === 'number' && Number.isFinite(item.price)
        ? item.price
        : null,
    currency: typeof item.currency === 'string' ? item.currency : 'KRW'
  }));
  await sendAdminSalesNotification({
    eventLabel: '새 상품 주문 접수',
    paymentMethod: '계좌이체',
    orderId: orderId || null,
    items: notificationItems,
    customer: {
      name: customerContact.name,
      email: customerContact.email,
      phone: customerContact.phone,
      address: customerContact.address
    },
    amountTotal,
    currency: 'KRW',
    bankTransfer: {
      depositorName: bankTransferPayload.depositorName,
      proofImageUrl: bankTransferPayload.proofImageUrl
    },
    note: hasConfiguredAccount ? '입금 대기' : '계좌정보 미설정 상태에서 접수'
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
    }
  });
}

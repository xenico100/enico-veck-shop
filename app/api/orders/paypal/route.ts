import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

type PayPalCartItemPayload = {
  key?: string;
  id?: string;
  type?: string;
  title?: string;
  image?: string | null;
  price?: number | null;
  currency?: string;
  quantity?: number;
};

type PayPalOrderSaveRequest = {
  totalKRW?: number;
  approxUsd?: number | string;
  paypalOrderId?: string | null;
  paypalCapture?: unknown;
  items?: PayPalCartItemPayload[];
  customerContact?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  guestCustomer?: {
    email?: string;
    phone?: string;
    address?: string;
  };
};

type PayPalCapturedAmount = {
  value: string | null;
  currency: string | null;
};

type SupabaseErrorLike = {
  message?: string;
  details?: string | null;
  code?: string | null;
  hint?: string | null;
};

type GuestCustomerContact = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

type ServicePurchaseRecordResult = {
  inserted: number;
  skipped: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeCartItems = (input: unknown) => {
  if (!Array.isArray(input)) return [] as Array<Record<string, unknown>>;

  return input
    .map((item) => {
      if (!isRecord(item)) return null;

      const price = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : null;
      const quantity = Math.max(1, Math.floor(Number(item.quantity ?? 1) || 1));

      return {
        key: typeof item.key === 'string' ? item.key : null,
        id: typeof item.id === 'string' ? item.id : null,
        type: typeof item.type === 'string' ? item.type : 'service',
        title: typeof item.title === 'string' ? item.title : 'Untitled Item',
        image: typeof item.image === 'string' ? item.image : null,
        price,
        currency: typeof item.currency === 'string' && item.currency ? item.currency : 'KRW',
        quantity,
        line_total: price == null ? null : Math.round(price * quantity)
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
};

const getFriendlyInsertError = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return '주문 저장 권한이 없어 주문 기록을 저장하지 못했습니다.';
  }
  if (lower.includes('duplicate') && lower.includes('paypal_order_id')) {
    return '이미 저장된 PayPal 주문입니다.';
  }
  if (lower.includes('column') && lower.includes('orders')) {
    return 'orders 테이블 컬럼 구성이 현재 결제 저장 코드와 다릅니다.';
  }
  if (lower.includes('null value') && lower.includes('user_id')) {
    return '비회원 주문을 저장하려면 orders.user_id 컬럼의 NOT NULL 제약을 해제해야 합니다.';
  }
  return message || '주문 저장에 실패했습니다.';
};

const logSupabaseOrderWriteError = (
  stage: string,
  error: SupabaseErrorLike | null | undefined,
  context?: Record<string, unknown>
) => {
  if (!error) return;
  console.error('[orders/paypal] orders write failed', {
    stage,
    message: error.message ?? null,
    details: error.details ?? null,
    code: error.code ?? null,
    hint: error.hint ?? null,
    ...(context ?? {})
  });
};

const isOnConflictConstraintMismatchError = (error: SupabaseErrorLike | null | undefined) =>
  (error?.message || '')
    .toLowerCase()
    .includes('there is no unique or exclusion constraint matching the on conflict specification');

const getCapturedPayPalAmount = (
  firstCapture: Record<string, unknown> | null,
  firstPurchaseUnit: Record<string, unknown> | null
): PayPalCapturedAmount => {
  const captureAmount = isRecord(firstCapture?.amount) ? firstCapture.amount : null;
  const purchaseUnitAmount = isRecord(firstPurchaseUnit?.amount) ? firstPurchaseUnit.amount : null;
  const amount = captureAmount ?? purchaseUnitAmount;

  return {
    value: typeof amount?.value === 'string' && amount.value.trim() ? amount.value.trim() : null,
    currency:
      typeof amount?.currency_code === 'string' && amount.currency_code.trim()
        ? amount.currency_code.trim().toUpperCase()
        : null
  };
};

const parsePayPalAmountToIntegerStorage = (value: string, currency: string | null) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  // Integer column strategy:
  // - KRW (zero-decimal in this app flow): store whole amount
  // - other currencies: store minor units (e.g. cents)
  if ((currency || '').toUpperCase() === 'KRW') {
    return Math.round(parsed);
  }

  return Math.round(parsed * 100);
};

const normalizeCustomerContact = (
  input: unknown,
  options?: {
    fallbackName?: string | null;
    fallbackEmail?: string | null;
  }
): GuestCustomerContact | null => {
  if (!isRecord(input)) return null;

  const nameRaw = typeof input.name === 'string' ? input.name.trim() : '';
  const emailRaw = typeof input.email === 'string' ? input.email.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const address = typeof input.address === 'string' ? input.address.trim() : '';
  const name = nameRaw || (options?.fallbackName || '').trim();
  const email = emailRaw || (options?.fallbackEmail || '').trim();

  if (!name || !email || !phone || !address) return null;

  return { name, email, phone, address };
};

const normalizeServicePurchaseCandidates = (items: Array<Record<string, unknown>>) => {
  const byId = new Map<
    string,
    { servicePostId: string; amountPaid: number | null; currency: string | null }
  >();

  for (const item of items) {
    const type = typeof item.type === 'string' ? item.type.trim().toLowerCase() : '';
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    if (type !== 'service' || !id) continue;

    const lineTotal =
      typeof item.line_total === 'number' && Number.isFinite(item.line_total)
        ? item.line_total
        : null;
    const price =
      typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : null;
    const currency =
      typeof item.currency === 'string' && item.currency.trim()
        ? item.currency.trim().toUpperCase()
        : null;

    if (!byId.has(id)) {
      byId.set(id, {
        servicePostId: id,
        amountPaid: lineTotal ?? price,
        currency
      });
    }
  }

  return Array.from(byId.values());
};

const recordServiceFilePurchases = async (params: {
  userId: string | null;
  orderId: string | null;
  paypalOrderId: string | null;
  items: Array<Record<string, unknown>>;
}) : Promise<ServicePurchaseRecordResult> => {
  if (!params.userId) {
    return { inserted: 0, skipped: 'guest_user' };
  }

  const candidates = normalizeServicePurchaseCandidates(params.items);
  if (candidates.length === 0) {
    return { inserted: 0, skipped: 'no_service_items' };
  }

  try {
    const { createAdminClient } = await import('@/utils/supabase/adminClient');
    const admin = createAdminClient();
    const serviceIds = candidates.map((item) => item.servicePostId);
    const { data: postRows, error: postsError } = await (admin as any)
      .from('service_posts')
      .select('id,is_paid_file,file_price,currency')
      .in('id', serviceIds);

    if (postsError) {
      throw new Error(postsError.message || 'service_posts lookup failed');
    }

    const paidFilePosts = new Map<
      string,
      { id: string; file_price: number | string | null; currency: string | null }
    >();

    for (const row of Array.isArray(postRows) ? (postRows as any[]) : []) {
      if (!row?.id || row?.is_paid_file !== true) continue;
      paidFilePosts.set(String(row.id), {
        id: String(row.id),
        file_price: row.file_price ?? null,
        currency: typeof row.currency === 'string' ? row.currency : null
      });
    }

    const purchaseRows = candidates
      .map((candidate) => {
        const paid = paidFilePosts.get(candidate.servicePostId);
        if (!paid) return null;
        const filePrice =
          typeof paid.file_price === 'number'
            ? paid.file_price
            : typeof paid.file_price === 'string' && paid.file_price.trim()
              ? Number(paid.file_price)
              : null;
        const amountPaid = candidate.amountPaid ?? (Number.isFinite(filePrice ?? NaN) ? filePrice : null);
        return {
          user_id: params.userId,
          service_post_id: candidate.servicePostId,
          order_id: params.orderId,
          paypal_order_id: params.paypalOrderId,
          amount_paid: amountPaid,
          currency: candidate.currency ?? paid.currency ?? 'KRW',
          status: 'completed'
        };
      })
      .filter(Boolean);

    if (purchaseRows.length === 0) {
      return { inserted: 0, skipped: 'no_paid_file_items' };
    }

    const { error: purchaseError } = await (admin as any)
      .from('service_purchases')
      .upsert(purchaseRows, { onConflict: 'user_id,service_post_id' });

    if (purchaseError) {
      throw new Error(purchaseError.message || 'service_purchases upsert failed');
    }

    return { inserted: purchaseRows.length, skipped: null };
  } catch (error) {
    console.error('[orders/paypal] service file purchase record failed', {
      userId: params.userId,
      orderId: params.orderId,
      paypalOrderId: params.paypalOrderId,
      error
    });
    return { inserted: 0, skipped: 'record_failed' };
  }
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  console.info('[orders/paypal] auth check', {
    hasUser: Boolean(user),
    userId: user?.id ?? null,
    authErrorMessage: userError?.message ?? null
  });
  console.log('[orders/paypal] user:', user);
  const authenticatedUser = user ?? null;
  const isGuestOrder = !authenticatedUser;
  if (isGuestOrder) {
    console.warn('[orders/paypal] proceeding as guest order (no authenticated user session)', {
      userErrorMessage: userError?.message ?? null
    });
  }

  const body = (await request.json().catch(() => ({}))) as PayPalOrderSaveRequest;
  const totalKRW = Math.round(Number(body.totalKRW ?? 0));
  const customerContact = normalizeCustomerContact(body.customerContact ?? body.guestCustomer, {
    fallbackName: authenticatedUser?.user_metadata?.full_name as string | undefined,
    fallbackEmail: authenticatedUser?.email ?? null
  });

  if (!customerContact) {
    return NextResponse.json(
      { message: '주문자 정보(이름, 이메일, 연락처, 주소)를 모두 입력해 주세요.' },
      { status: 400 }
    );
  }

  const items = normalizeCartItems(body.items);
  const capture = body.paypalCapture;
  const captureRecord = isRecord(capture) ? capture : null;
  const purchaseUnits = Array.isArray(captureRecord?.purchase_units)
    ? (captureRecord?.purchase_units as unknown[])
    : [];
  const firstPurchaseUnit = purchaseUnits.find(isRecord) ?? null;
  const payer = isRecord(captureRecord?.payer) ? captureRecord?.payer : null;
  const shipping = isRecord(firstPurchaseUnit?.shipping) ? firstPurchaseUnit?.shipping : null;
  const captures =
    isRecord(firstPurchaseUnit?.payments) && Array.isArray(firstPurchaseUnit.payments.captures)
      ? (firstPurchaseUnit.payments.captures as unknown[])
      : [];
  const firstCapture = captures.find(isRecord) ?? null;
  const capturedPayPalAmount = getCapturedPayPalAmount(firstCapture, firstPurchaseUnit);
  const valueStr =
    capturedPayPalAmount.value ??
    (isRecord(firstCapture?.amount) && typeof firstCapture.amount.value === 'string'
      ? firstCapture.amount.value
      : isRecord(firstPurchaseUnit?.amount) && typeof firstPurchaseUnit.amount.value === 'string'
        ? firstPurchaseUnit.amount.value
        : null);
  const currency = capturedPayPalAmount.currency ?? 'USD';

  const shippingAddressJson = {
    ...(payer || shipping
      ? {
          payer: payer ?? null,
          shipping: shipping ?? null
        }
      : {}),
    ...(customerContact
      ? {
          customer_contact: customerContact
        }
      : {})
  };

  const fallbackAmountTotal = valueStr
    ? parsePayPalAmountToIntegerStorage(valueStr, currency)
    : null;
  const resolvedAmountTotal =
    Number.isFinite(totalKRW) && totalKRW > 0 ? totalKRW : fallbackAmountTotal;
  const resolvedCurrency =
    Number.isFinite(totalKRW) && totalKRW > 0
      ? 'KRW'
      : currency;

  if (!Number.isFinite(resolvedAmountTotal ?? NaN) || (resolvedAmountTotal ?? 0) <= 0) {
    return NextResponse.json({ message: '유효한 결제 금액이 필요합니다.' }, { status: 400 });
  }

  console.info('[orders/paypal] amount_total resolved', {
    userId: authenticatedUser?.id ?? null,
    guestOrder: isGuestOrder,
    source:
      Number.isFinite(totalKRW) && totalKRW > 0 ? 'client_totalKRW' : 'paypal_capture_amount_fallback',
    amountTotal: resolvedAmountTotal,
    currency: resolvedCurrency,
    clientTotalKRW: Number.isFinite(totalKRW) ? totalKRW : null,
    paypalAmountValue: valueStr,
    paypalAmountCurrency: currency
  });

  const orderPayload = {
    user_id: authenticatedUser?.id ?? null,
    status: 'paid',
    currency: resolvedCurrency,
    amount_total: resolvedAmountTotal,
    paypal_order_id:
      (typeof body.paypalOrderId === 'string' && body.paypalOrderId) ||
      (typeof captureRecord?.id === 'string' ? captureRecord.id : null),
    shipping_carrier: null,
    shipping_status: 'preparing',
    shipping_address: shippingAddressJson,
    tracking_number: null,
    items
  };

  console.info('[orders/paypal] supabase client', {
    source: '@/utils/supabase/server.createClient',
    sessionAware: true,
    implementation: '@supabase/ssr + next/headers cookies()',
    supabaseUrlHost: (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').host || null;
      } catch {
        return null;
      }
    })()
  });
  console.info('[orders/paypal] order payload keys', Object.keys(orderPayload));

  const paypalOrderIdForLookup =
    (typeof orderPayload.paypal_order_id === 'string' && orderPayload.paypal_order_id) || null;

  let insertResult;
  const selectColumns =
    'id,user_id,status,currency,amount_total,paypal_order_id,created_at,items,shipping_address,tracking_number,shipping_carrier,shipping_status';
  const writeOrder = async (dbClient: any) =>
    paypalOrderIdForLookup
      ? await dbClient
          .from('orders')
          .upsert(orderPayload, { onConflict: 'paypal_order_id' })
          .select(selectColumns)
          .single()
      : await dbClient
          .from('orders')
          .insert(orderPayload)
          .select(selectColumns)
          .single();

  const writeOrderManualIdempotent = async (dbClient: any) => {
    if (!paypalOrderIdForLookup) {
      return await dbClient.from('orders').insert(orderPayload).select(selectColumns).single();
    }

    const existing = await dbClient
      .from('orders')
      .select(selectColumns)
      .eq('paypal_order_id', paypalOrderIdForLookup)
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      return existing;
    }

    if (existing.data?.id) {
      return await dbClient
        .from('orders')
        .update(orderPayload)
        .eq('id', existing.data.id)
        .select(selectColumns)
        .single();
    }

    return await dbClient.from('orders').insert(orderPayload).select(selectColumns).single();
  };

  if (isGuestOrder) {
    try {
      const { createAdminClient } = await import('@/utils/supabase/adminClient');
      const adminClient = createAdminClient();
      insertResult = await writeOrder(adminClient as any);
      if (isOnConflictConstraintMismatchError(insertResult.error)) {
        console.warn('[orders/paypal] ON CONFLICT unsupported on connected DB, retrying manual save', {
          stage: 'guest_admin_client',
          paypalOrderId: paypalOrderIdForLookup
        });
        insertResult = await writeOrderManualIdempotent(adminClient as any);
      }
      if (insertResult.error) {
        logSupabaseOrderWriteError('guest_admin_client', insertResult.error, {
          userId: null,
          paypalOrderId: paypalOrderIdForLookup
        });
      }
    } catch (adminError) {
      console.error('[orders/paypal] guest admin insert exception', {
        paypalOrderId: paypalOrderIdForLookup,
        error: adminError
      });
      return NextResponse.json(
        {
          message: adminError instanceof Error ? adminError.message : '비회원 주문 저장에 실패했습니다.'
        },
        { status: 500 }
      );
    }
  } else {
    insertResult = await writeOrder(supabase as any);
    if (isOnConflictConstraintMismatchError(insertResult.error)) {
      console.warn('[orders/paypal] ON CONFLICT unsupported on connected DB, retrying manual save', {
        stage: 'user_client',
        userId: authenticatedUser?.id ?? null,
        paypalOrderId: paypalOrderIdForLookup
      });
      insertResult = await writeOrderManualIdempotent(supabase as any);
    }
  }

  if (!isGuestOrder && insertResult.error) {
    logSupabaseOrderWriteError('user_client', insertResult.error, {
      userId: authenticatedUser?.id ?? null,
      paypalOrderId: paypalOrderIdForLookup
    });
    const lower = (insertResult.error.message || '').toLowerCase();
    const rlsLikely = lower.includes('row-level security') || lower.includes('permission denied');

    if (rlsLikely) {
      try {
        const { createAdminClient } = await import('@/utils/supabase/adminClient');
        const adminClient = createAdminClient();
        insertResult = paypalOrderIdForLookup
          ? await (adminClient as any)
              .from('orders')
              .upsert(orderPayload, { onConflict: 'paypal_order_id' })
              .select(selectColumns)
              .single()
          : await (adminClient as any)
              .from('orders')
              .insert(orderPayload)
              .select(selectColumns)
              .single();

        if (isOnConflictConstraintMismatchError(insertResult.error)) {
          console.warn('[orders/paypal] ON CONFLICT unsupported on connected DB, retrying manual save', {
            stage: 'admin_fallback_client',
            userId: authenticatedUser?.id ?? null,
            paypalOrderId: paypalOrderIdForLookup
          });
          insertResult = await writeOrderManualIdempotent(adminClient as any);
        }

        if (insertResult.error) {
          logSupabaseOrderWriteError('admin_fallback_client', insertResult.error, {
            userId: authenticatedUser?.id ?? null,
            paypalOrderId: paypalOrderIdForLookup
          });
        }
      } catch (adminError) {
        console.error('[orders/paypal] admin fallback exception', {
          userId: authenticatedUser?.id ?? null,
          paypalOrderId: paypalOrderIdForLookup,
          error: adminError
        });
        return NextResponse.json(
          {
            message:
              adminError instanceof Error
                ? adminError.message
                : getFriendlyInsertError(insertResult.error.message || '')
          },
          { status: 500 }
        );
      }
    }
  }

  if (insertResult.error) {
    logSupabaseOrderWriteError('final', insertResult.error, {
      userId: authenticatedUser?.id ?? null,
      paypalOrderId: paypalOrderIdForLookup
    });
    return NextResponse.json(
      { message: getFriendlyInsertError(insertResult.error.message || '') },
      { status: 500 }
    );
  }

  const savedOrderId =
    insertResult.data && typeof insertResult.data.id === 'string' ? insertResult.data.id : null;
  const servicePurchaseResult = await recordServiceFilePurchases({
    userId: authenticatedUser?.id ?? null,
    orderId: savedOrderId,
    paypalOrderId: paypalOrderIdForLookup,
    items
  });

  return NextResponse.json({
    data: insertResult.data,
    message: '주문이 저장되었습니다.',
    meta: {
      service_file_purchase_records: servicePurchaseResult
    }
  });
}

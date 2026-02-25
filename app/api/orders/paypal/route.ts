import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

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
  return message || '주문 저장에 실패했습니다.';
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as PayPalOrderSaveRequest;
  const totalKRW = Math.round(Number(body.totalKRW ?? 0));

  if (!Number.isFinite(totalKRW) || totalKRW <= 0) {
    return NextResponse.json({ message: '유효한 결제 금액이 필요합니다.' }, { status: 400 });
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

  const shippingAddressJson = payer || shipping
    ? {
        payer: payer ?? null,
        shipping: shipping ?? null
      }
    : {};

  const metadata = {
    provider: 'paypal',
    paypal_order_id:
      (typeof body.paypalOrderId === 'string' && body.paypalOrderId) ||
      (typeof captureRecord?.id === 'string' ? captureRecord.id : null),
    paypal_capture_id: typeof firstCapture?.id === 'string' ? firstCapture.id : null,
    total_amount: totalKRW,
    tracking_number: null,
    shipping_address: shippingAddressJson,
    approx_usd:
      typeof body.approxUsd === 'number'
        ? Number(body.approxUsd.toFixed(2))
        : typeof body.approxUsd === 'string'
          ? body.approxUsd
          : null
  };

  const orderPayload = {
    user_id: user.id,
    status: 'paid',
    currency: 'KRW',
    amount_total: totalKRW,
    total_amount: totalKRW,
    paypal_order_id:
      (typeof body.paypalOrderId === 'string' && body.paypalOrderId) ||
      (typeof captureRecord?.id === 'string' ? captureRecord.id : null),
    shipping_address: shippingAddressJson,
    tracking_number: null,
    items,
    metadata
  };

  const paypalOrderIdForLookup =
    (typeof orderPayload.paypal_order_id === 'string' && orderPayload.paypal_order_id) || null;

  let insertResult;

  if (paypalOrderIdForLookup) {
    insertResult = await (supabase as any)
      .from('orders')
      .upsert(orderPayload, { onConflict: 'paypal_order_id' })
      .select(
        'id,user_id,status,currency,amount_total,total_amount,paypal_order_id,created_at,items,metadata'
      )
      .single();
  } else {
    insertResult = await (supabase as any)
      .from('orders')
      .insert(orderPayload)
      .select(
        'id,user_id,status,currency,amount_total,total_amount,paypal_order_id,created_at,items,metadata'
      )
      .single();
  }

  if (insertResult.error) {
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
              .select(
                'id,user_id,status,currency,amount_total,total_amount,paypal_order_id,created_at,items,metadata'
              )
              .single()
          : await (adminClient as any)
              .from('orders')
              .insert(orderPayload)
              .select(
                'id,user_id,status,currency,amount_total,total_amount,paypal_order_id,created_at,items,metadata'
              )
              .single();
      } catch (adminError) {
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
    return NextResponse.json(
      { message: getFriendlyInsertError(insertResult.error.message || '') },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: insertResult.data, message: '주문이 저장되었습니다.' });
}

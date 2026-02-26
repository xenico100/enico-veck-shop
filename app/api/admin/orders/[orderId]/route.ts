import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';
import { normalizeOrderRecord } from '@/utils/orders';

type RouteContext = {
  params: { orderId: string };
};

type OrderShippingPatchBody = {
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  shipping_status?: string | null;
};

const SHIPPING_STATUSES = new Set([
  'preparing',
  'ready_to_ship',
  'shipped',
  'in_transit',
  'delivered',
  'returned',
  'canceled'
]);

async function parseBody(request: Request): Promise<OrderShippingPatchBody | null> {
  try {
    return (await request.json()) as OrderShippingPatchBody;
  } catch {
    return null;
  }
}

const normalizeOptionalText = (value: unknown, maxLength: number) => {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const { user, isAdmin, adminClient } = await getAdminApiContext();

  if (!user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  if (!isAdmin || !adminClient) {
    return NextResponse.json({ message: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  const orderId = String(params.orderId ?? '').trim();
  if (!orderId) {
    return NextResponse.json({ message: '주문 ID가 필요합니다.' }, { status: 400 });
  }

  const body = await parseBody(request);
  if (!body) {
    return NextResponse.json({ message: '요청 본문이 올바르지 않습니다.' }, { status: 400 });
  }

  const hasCarrier = Object.prototype.hasOwnProperty.call(body, 'shipping_carrier');
  const hasTracking = Object.prototype.hasOwnProperty.call(body, 'tracking_number');
  const hasShippingStatus = Object.prototype.hasOwnProperty.call(body, 'shipping_status');

  if (!hasCarrier && !hasTracking && !hasShippingStatus) {
    return NextResponse.json({ message: '변경할 배송 정보가 없습니다.' }, { status: 400 });
  }

  const shippingCarrier = normalizeOptionalText(body.shipping_carrier, 80);
  const trackingNumber = normalizeOptionalText(body.tracking_number, 120);
  const shippingStatus = normalizeOptionalText(body.shipping_status, 40)?.toLowerCase() ?? null;

  if (hasShippingStatus && shippingStatus && !SHIPPING_STATUSES.has(shippingStatus)) {
    return NextResponse.json({ message: '유효하지 않은 배송 상태입니다.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (hasCarrier) updates.shipping_carrier = shippingCarrier;
  if (hasTracking) updates.tracking_number = trackingNumber;
  if (hasShippingStatus) {
    updates.shipping_status = shippingStatus;
  } else if (hasCarrier || hasTracking) {
    updates.shipping_status = trackingNumber ? 'shipped' : 'preparing';
  }

  const selectColumns =
    'id,user_id,status,currency,amount_total,paypal_order_id,created_at,items,shipping_address,tracking_number,shipping_carrier,shipping_status';

  const { data, error } = await (adminClient as any)
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select(selectColumns)
    .single();

  if (error) {
    return NextResponse.json(
      { message: error.message || '배송 정보 저장에 실패했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: normalizeOrderRecord(data)
  });
}

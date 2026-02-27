import { NextRequest, NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';
import { normalizeOrders } from '@/utils/orders';

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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, isAdmin, adminClient } = await getAdminApiContext();

  if (!user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  if (!isAdmin || !adminClient) {
    return NextResponse.json({ message: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  const userId = String(params.id ?? '').trim();
  if (!userId) {
    return NextResponse.json({ message: '사용자 ID가 필요합니다.' }, { status: 400 });
  }

  const selectColumnsWithMetadata =
    'id,user_id,status,currency,amount_total,created_at,paypal_order_id,shipping_address,tracking_number,shipping_carrier,shipping_status,items,metadata';
  const selectColumnsWithoutMetadata =
    'id,user_id,status,currency,amount_total,created_at,paypal_order_id,shipping_address,tracking_number,shipping_carrier,shipping_status,items';

  let queryResult = await (adminClient as any)
    .from('orders')
    .select(selectColumnsWithMetadata)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (queryResult.error && hasMissingOrdersMetadataColumnError(queryResult.error)) {
    const fallbackQuery = await (adminClient as any)
      .from('orders')
      .select(selectColumnsWithoutMetadata)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    queryResult = {
      ...fallbackQuery,
      data: Array.isArray(fallbackQuery.data)
        ? fallbackQuery.data.map((row) => ({ ...row, metadata: null }))
        : fallbackQuery.data
    };
  }

  if (queryResult.error) {
    return NextResponse.json(
      { message: queryResult.error.message || '주문 내역을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: normalizeOrders(queryResult.data ?? []) });
}

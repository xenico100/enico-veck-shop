import { NextRequest, NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';
import { normalizeOrders } from '@/utils/orders';

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

  const { data, error } = await (adminClient as never)
    .from('orders')
    .select(
      'id,user_id,status,currency,amount_total,created_at,paypal_order_id,shipping_address,tracking_number,items'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { message: error.message || '주문 내역을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: normalizeOrders(data ?? []) });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { normalizeOrders } from '@/utils/orders';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data, error } = await (supabase as any)
    .from('orders')
    .select(
      'id,user_id,status,currency,amount_total,created_at,paypal_order_id,shipping_address,tracking_number,shipping_carrier,shipping_status,items'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { message: error.message || '주문 내역을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: normalizeOrders(data ?? []) });
}

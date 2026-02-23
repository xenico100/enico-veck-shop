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

  const { data, error } = await (supabase as never)
    .from('orders')
    .select(
      'id,user_id,status,currency,amount_total,created_at,stripe_checkout_session_id,stripe_payment_intent_id,items,metadata'
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

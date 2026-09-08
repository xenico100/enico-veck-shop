import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { normalizeOrders } from '@/utils/orders';
import { createAdminClient } from '@/utils/supabase/adminClient';

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

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const selectColumnsWithMetadata =
    'id,user_id,status,currency,amount_total,created_at,paypal_order_id,shipping_address,tracking_number,shipping_carrier,shipping_status,items,metadata';
  const selectColumnsWithoutMetadata =
    'id,user_id,status,currency,amount_total,created_at,paypal_order_id,shipping_address,tracking_number,shipping_carrier,shipping_status,items';

  let queryResult = await (supabase as any)
    .from('orders')
    .select(selectColumnsWithMetadata)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (queryResult.error && hasMissingOrdersMetadataColumnError(queryResult.error)) {
    const fallbackQuery = await (supabase as any)
      .from('orders')
      .select(selectColumnsWithoutMetadata)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    queryResult = {
      ...fallbackQuery,
      data: Array.isArray(fallbackQuery.data)
        ? fallbackQuery.data.map((row: Record<string, unknown>) => ({ ...row, metadata: null }))
        : fallbackQuery.data
    };
  }

  if (queryResult.error) {
    const missingLegacyColumn = queryResult.error.code === '42703' && /user_id|metadata|shipping_address|shipping_carrier|status/.test(queryResult.error.message || '');
    if (missingLegacyColumn && user.email && user.email_confirmed_at) {
      // The current shop schema identifies verified buyers by email, not legacy user_id.
      const current = await createAdminClient().from('orders' as never)
        .select('id,payment_status,currency,amount_total,created_at,paypal_order_id,customer_address,tracking_number,shipping_company,shipping_status,items')
        .eq('customer_email' as never, user.email)
        .order('created_at', { ascending: false });
      if (!current.error) {
        const rows = (current.data ?? []) as unknown as Record<string, unknown>[];
        return NextResponse.json({ data: normalizeOrders(rows.map(row => ({ ...row, user_id: user.id, status: row.payment_status, shipping_address: row.customer_address, shipping_carrier: row.shipping_company, metadata: null }))) });
      }
    }
    return NextResponse.json(
      { message: queryResult.error.message || '주문 내역을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: normalizeOrders(queryResult.data ?? []) });
}

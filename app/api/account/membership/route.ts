import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { getStudioMembershipSummaryForUser } from '@/utils/studio-membership-summary';

export const runtime = 'nodejs';

const normalizeEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const getRawSubscriberEmail = (raw: unknown) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';
  const row = raw as Record<string, unknown>;
  const subscriber =
    row.subscriber && typeof row.subscriber === 'object' && !Array.isArray(row.subscriber)
      ? (row.subscriber as Record<string, unknown>)
      : null;
  return normalizeEmail(subscriber?.email_address);
};

const tryRepairOrphanPayPalSubscriptionsByEmail = async (params: {
  userId: string;
  userEmail: string | null;
}) => {
  const normalizedEmail = normalizeEmail(params.userEmail);
  if (!normalizedEmail) return;

  let admin: ReturnType<typeof createAdminClient> | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }
  if (!admin) return;

  const orphanQuery = await (admin as any)
    .from('paypal_subscriptions')
    .select('id,raw')
    .is('user_id', null)
    .eq('status', 'ACTIVE')
    .order('last_event_at', { ascending: false })
    .limit(200);

  if (orphanQuery.error || !Array.isArray(orphanQuery.data)) return;

  const matchedSubscriptionIds = orphanQuery.data
    .map((row: any) => ({
      id: typeof row?.id === 'string' ? row.id.trim() : '',
      email: getRawSubscriberEmail(row?.raw)
    }))
    .filter((row: { id: string; email: string }) => row.id && row.email === normalizedEmail)
    .map((row: { id: string }) => row.id);

  if (matchedSubscriptionIds.length === 0) return;

  const { error: relinkError } = await (admin as any)
    .from('paypal_subscriptions')
    .update({ user_id: params.userId })
    .in('id', matchedSubscriptionIds);

  if (relinkError) return;

  await (admin as any).from('studio_access').upsert(
    {
      user_id: params.userId,
      has_active_subscription: true,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
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

  try {
    await tryRepairOrphanPayPalSubscriptionsByEmail({
      userId: user.id,
      userEmail: user.email ?? null
    });

    const membership = await getStudioMembershipSummaryForUser(user.id);
    return NextResponse.json({ data: membership });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : '멤버십 정보를 불러오지 못했습니다.'
      },
      { status: 500 }
    );
  }
}

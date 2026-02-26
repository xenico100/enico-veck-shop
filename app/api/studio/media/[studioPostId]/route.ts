import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { signR2GetUrl } from '@/utils/r2';
import { getStudioEntitlement } from '@/utils/studio-subscription';

export const runtime = 'nodejs';

type RouteContext = {
  params: { studioPostId: string };
};

type StudioMediaRow = {
  id: string;
  kind: 'image' | 'video';
  r2_bucket: string;
  r2_key: string;
  mime: string | null;
  bytes: number | null;
  is_free_public: boolean | null;
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError) {
      console.warn('[Studio media] auth.getUser failed, continuing as guest', authError);
    }

    const studioPostId = (params.studioPostId || '').trim();
    if (!studioPostId) {
      return jsonError('잘못된 Studio 게시글 ID입니다.', 400);
    }

    const adminClient = createAdminClient();
    let hasActiveSubscription = false;
    if (user?.id) {
      const entitlement = await getStudioEntitlement(user.id, adminClient);
      hasActiveSubscription = entitlement.hasActiveSubscription;
    }

    const { data, error } = await (adminClient as any)
      .from('studio_media')
      .select('id,kind,r2_bucket,r2_key,mime,bytes,is_free_public')
      .eq('studio_post_id', studioPostId)
      .order('created_at', { ascending: true });

    if (error) {
      return jsonError('Studio 미디어를 불러오지 못했습니다.', 500, error);
    }

    const rows = Array.isArray(data) ? (data as StudioMediaRow[]) : [];
    const visibleRows = hasActiveSubscription ? rows : rows.filter((row) => Boolean(row.is_free_public));
    const signed = await Promise.all(
      visibleRows.map(async (row) => ({
        id: row.id,
        kind: row.kind,
        mime: row.mime,
        bytes: row.bytes,
        is_free_public: Boolean(row.is_free_public),
        url: await signR2GetUrl(row.r2_key, {
          bucketName: row.r2_bucket || undefined,
          expiresIn: 180
        })
      }))
    );

    return NextResponse.json({
      data: signed,
      meta: {
        has_active_subscription: hasActiveSubscription,
        showing_public_only: !hasActiveSubscription
      }
    });
  } catch (error) {
    console.error('[Studio media] unexpected error', error);
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected studio media error',
      500
    );
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { signR2GetUrl } from '@/utils/r2';
import {
  requireActiveStudioSubscription,
  StudioSubscriptionRequiredError
} from '@/utils/studio-subscription';

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

    if (authError || !user) {
      return jsonError('로그인이 필요합니다.', 401);
    }

    const studioPostId = (params.studioPostId || '').trim();
    if (!studioPostId) {
      return jsonError('잘못된 Studio 게시글 ID입니다.', 400);
    }

    const adminClient = createAdminClient();
    await requireActiveStudioSubscription(user.id, adminClient);

    const { data, error } = await (adminClient as any)
      .from('studio_media')
      .select('id,kind,r2_bucket,r2_key,mime,bytes')
      .eq('studio_post_id', studioPostId)
      .order('created_at', { ascending: true });

    if (error) {
      return jsonError('Studio 미디어를 불러오지 못했습니다.', 500, error);
    }

    const rows = Array.isArray(data) ? (data as StudioMediaRow[]) : [];
    const signed = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        kind: row.kind,
        mime: row.mime,
        bytes: row.bytes,
        url: await signR2GetUrl(row.r2_key, {
          bucketName: row.r2_bucket || undefined,
          expiresIn: 180
        })
      }))
    );

    return NextResponse.json({ data: signed });
  } catch (error) {
    if (error instanceof StudioSubscriptionRequiredError) {
      return jsonError('Studio 구독이 필요합니다.', 403);
    }
    console.error('[Studio media] unexpected error', error);
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected studio media error',
      500
    );
  }
}

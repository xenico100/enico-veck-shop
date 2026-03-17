import { NextResponse } from 'next/server';

import { createAdminClient } from '@/utils/supabase/adminClient';
import { signR2GetUrl } from '@/utils/r2';

export const runtime = 'nodejs';

type StudioVideoRow = {
  id: string;
  r2_bucket: string | null;
  r2_key: string;
  mime: string | null;
  is_free_public?: boolean | null;
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const hasMissingFreePublicColumnError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();
  return combined.includes('is_free_public') && combined.includes('studio_media');
};

const findFeaturedVideo = async () => {
  const adminClient = createAdminClient();

  let publicQuery = await (adminClient as any)
    .from('studio_media')
    .select('id,r2_bucket,r2_key,mime,is_free_public')
    .eq('kind', 'video')
    .eq('is_free_public', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (publicQuery.error && hasMissingFreePublicColumnError(publicQuery.error)) {
    publicQuery = { data: [], error: null };
  }

  if (publicQuery.error) {
    throw publicQuery.error;
  }

  const publicRow = Array.isArray(publicQuery.data)
    ? ((publicQuery.data[0] as StudioVideoRow | undefined) ?? null)
    : null;

  if (publicRow?.r2_key?.trim()) {
    return { row: publicRow, source: 'public' as const };
  }

  const fallbackQuery = await (adminClient as any)
    .from('studio_media')
    .select('id,r2_bucket,r2_key,mime')
    .eq('kind', 'video')
    .order('created_at', { ascending: false })
    .limit(1);

  if (fallbackQuery.error) {
    throw fallbackQuery.error;
  }

  const fallbackRow = Array.isArray(fallbackQuery.data)
    ? ((fallbackQuery.data[0] as StudioVideoRow | undefined) ?? null)
    : null;

  if (fallbackRow?.r2_key?.trim()) {
    return { row: fallbackRow, source: 'fallback' as const };
  }

  return null;
};

export async function GET() {
  try {
    const featuredVideo = await findFeaturedVideo();

    if (!featuredVideo) {
      return NextResponse.json({ url: null, mime: null, source: null });
    }

    const url = await signR2GetUrl(featuredVideo.row.r2_key, {
      bucketName: featuredVideo.row.r2_bucket || undefined,
      expiresIn: 300
    });

    return NextResponse.json({
      url,
      mime: featuredVideo.row.mime || 'video/mp4',
      source: featuredVideo.source
    });
  } catch (error) {
    console.error('[studio/media/featured-video] failed to resolve video', error);
    return jsonError(
      error instanceof Error ? error.message : '대표 영상을 불러오지 못했습니다.',
      500
    );
  }
}

import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';

export const runtime = 'nodejs';

type StudioMediaBody = {
  studio_post_id?: string;
  kind?: string;
  r2_bucket?: string | null;
  r2_key?: string;
  mime?: string | null;
  bytes?: number | string | null;
  is_free_public?: boolean | string | number | null;
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

const hasMissingStudioMediaTableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();
  return combined.includes('studio_media') && combined.includes('does not exist');
};

const hasMissingRequiredMembershipLevelColumnError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();
  return combined.includes('required_membership_level') && combined.includes('studio_posts');
};

const normalizeBytes = (value: unknown) => {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.floor(numeric);
};

const normalizeBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
      return false;
    }
  }
  return false;
};

export async function GET() {
  const { user, isAdmin, adminClient } = await getAdminApiContext();

  if (!user) return jsonError('로그인이 필요합니다.', 401);
  if (!isAdmin || !adminClient) return jsonError('관리자 권한이 없습니다.', 403);

  const [postsQueryResult, mediaQueryResult] = await Promise.all([
    (adminClient as any)
      .from('studio_posts')
      .select('id,title,created_at,required_membership_level')
      .order('created_at', { ascending: false }),
    (adminClient as any)
      .from('studio_media')
      .select('id,studio_post_id,kind,r2_bucket,r2_key,mime,bytes,is_free_public,created_at')
      .order('created_at', { ascending: false })
  ]);

  let posts = postsQueryResult.data ?? [];
  let postsError = postsQueryResult.error ?? null;
  if (postsError && hasMissingRequiredMembershipLevelColumnError(postsError)) {
    const fallbackPosts = await (adminClient as any)
      .from('studio_posts')
      .select('id,title,created_at')
      .order('created_at', { ascending: false });

    posts = Array.isArray(fallbackPosts.data)
      ? fallbackPosts.data.map((row) => ({ ...row, required_membership_level: 0 }))
      : [];
    postsError = fallbackPosts.error ?? null;
  }

  if (postsError) return jsonError('Studio 게시글을 불러오지 못했습니다.', 500, postsError);

  let media = mediaQueryResult.data ?? null;
  let mediaError = mediaQueryResult.error ?? null;

  if (mediaError && hasMissingFreePublicColumnError(mediaError)) {
    console.warn('[admin/studio-media] studio_media.is_free_public column missing, falling back', mediaError);
    const fallbackQuery = await (adminClient as any)
      .from('studio_media')
      .select('id,studio_post_id,kind,r2_bucket,r2_key,mime,bytes,created_at')
      .order('created_at', { ascending: false });

    media = Array.isArray(fallbackQuery.data)
      ? fallbackQuery.data.map((row) => ({ ...row, is_free_public: false }))
      : [];
    mediaError = fallbackQuery.error ?? null;
  }

  if (mediaError) {
    if (hasMissingStudioMediaTableError(mediaError)) {
      return jsonError(
        'studio_media 테이블이 없습니다. Supabase 마이그레이션을 먼저 적용해 주세요.',
        500,
        mediaError
      );
    }
    return jsonError('Studio 미디어를 불러오지 못했습니다.', 500, mediaError);
  }

  return NextResponse.json({
    data: {
      studio_posts: posts ?? [],
      studio_media: media ?? []
    }
  });
}

export async function POST(request: Request) {
  const { user, isAdmin, adminClient } = await getAdminApiContext();

  if (!user) return jsonError('로그인이 필요합니다.', 401);
  if (!isAdmin || !adminClient) return jsonError('관리자 권한이 없습니다.', 403);

  const body = (await request.json().catch(() => ({}))) as StudioMediaBody;
  const studioPostId = (body.studio_post_id || '').trim();
  const kind = (body.kind || '').trim().toLowerCase();
  const r2Key = (body.r2_key || '').trim();
  const r2Bucket =
    (typeof body.r2_bucket === 'string' ? body.r2_bucket : '').trim() ||
    process.env.R2_BUCKET_NAME?.trim() ||
    '';
  const mime = (typeof body.mime === 'string' ? body.mime : '').trim() || null;
  const bytes = normalizeBytes(body.bytes);
  const isFreePublic = normalizeBoolean(body.is_free_public);

  if (!studioPostId) return jsonError('studio_post_id가 필요합니다.', 400);
  if (kind !== 'image' && kind !== 'video') return jsonError('kind는 image 또는 video여야 합니다.', 400);
  if (!r2Bucket) return jsonError('R2 버킷 이름이 필요합니다.', 400);
  if (!r2Key) return jsonError('R2 key가 필요합니다.', 400);

  let insertResult = await (adminClient as any)
    .from('studio_media')
    .insert({
      studio_post_id: studioPostId,
      kind,
      r2_bucket: r2Bucket,
      r2_key: r2Key,
      mime,
      bytes,
      is_free_public: isFreePublic
    })
    .select('id,studio_post_id,kind,r2_bucket,r2_key,mime,bytes,is_free_public,created_at')
    .single();

  if (insertResult.error && hasMissingFreePublicColumnError(insertResult.error)) {
    console.warn(
      '[admin/studio-media] studio_media.is_free_public column missing during insert, retrying without column',
      insertResult.error
    );
    insertResult = await (adminClient as any)
      .from('studio_media')
      .insert({
        studio_post_id: studioPostId,
        kind,
        r2_bucket: r2Bucket,
        r2_key: r2Key,
        mime,
        bytes
      })
      .select('id,studio_post_id,kind,r2_bucket,r2_key,mime,bytes,created_at')
      .single();
    if (!insertResult.error && insertResult.data) {
      insertResult = {
        ...insertResult,
        data: { ...(insertResult.data as Record<string, unknown>), is_free_public: false }
      };
    }
  }

  if (insertResult.error) {
    if (hasMissingStudioMediaTableError(insertResult.error)) {
      return jsonError(
        'studio_media 테이블이 없습니다. Supabase 마이그레이션을 먼저 적용해 주세요.',
        500,
        insertResult.error
      );
    }
    return jsonError('Studio 미디어 등록에 실패했습니다.', 500, insertResult.error);
  }

  return NextResponse.json({ data: insertResult.data });
}

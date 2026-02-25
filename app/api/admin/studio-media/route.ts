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
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const normalizeBytes = (value: unknown) => {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.floor(numeric);
};

export async function GET() {
  const { user, isAdmin, adminClient } = await getAdminApiContext();

  if (!user) return jsonError('로그인이 필요합니다.', 401);
  if (!isAdmin || !adminClient) return jsonError('관리자 권한이 없습니다.', 403);

  const [{ data: posts, error: postsError }, { data: media, error: mediaError }] =
    await Promise.all([
      (adminClient as any)
        .from('studio_posts')
        .select('id,title,created_at')
        .order('created_at', { ascending: false }),
      (adminClient as any)
        .from('studio_media')
        .select('id,studio_post_id,kind,r2_bucket,r2_key,mime,bytes,created_at')
        .order('created_at', { ascending: false })
    ]);

  if (postsError) return jsonError('Studio 게시글을 불러오지 못했습니다.', 500, postsError);
  if (mediaError) return jsonError('Studio 미디어를 불러오지 못했습니다.', 500, mediaError);

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
    process.env.R2_BUCKET?.trim() ||
    '';
  const mime = (typeof body.mime === 'string' ? body.mime : '').trim() || null;
  const bytes = normalizeBytes(body.bytes);

  if (!studioPostId) return jsonError('studio_post_id가 필요합니다.', 400);
  if (kind !== 'image' && kind !== 'video') return jsonError('kind는 image 또는 video여야 합니다.', 400);
  if (!r2Bucket) return jsonError('R2 버킷 이름이 필요합니다.', 400);
  if (!r2Key) return jsonError('R2 key가 필요합니다.', 400);

  const { data, error } = await (adminClient as any)
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

  if (error) return jsonError('Studio 미디어 등록에 실패했습니다.', 500, error);

  return NextResponse.json({ data });
}

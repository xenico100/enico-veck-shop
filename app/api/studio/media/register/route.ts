import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';
import { getDefaultR2BucketName } from '@/utils/r2';
import {
  isAllowedStudioR2Key,
  isValidStudioPostId,
  MAX_STUDIO_MEDIA_BYTES,
  normalizeBytes,
  normalizeStudioMediaKind,
  validateStudioMediaMime
} from '@/utils/studio-media-upload';

export const runtime = 'nodejs';

type RegisterMediaBody = {
  studioPostId?: string;
  kind?: string;
  r2_key?: string;
  mime?: string;
  bytes?: number | string;
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

export async function POST(request: Request) {
  const { user, isAdmin, adminClient } = await getAdminApiContext();
  if (!user) return jsonError('로그인이 필요합니다.', 401);
  if (!isAdmin || !adminClient) return jsonError('관리자 권한이 없습니다.', 403);

  const body = (await request.json().catch(() => ({}))) as RegisterMediaBody;
  const studioPostId = String(body.studioPostId || '').trim();
  const kind = normalizeStudioMediaKind(body.kind);
  const r2Key = String(body.r2_key || '').trim();
  const mime = String(body.mime || '').trim().toLowerCase();
  const bytes = normalizeBytes(body.bytes);

  if (!isValidStudioPostId(studioPostId)) {
    return jsonError('유효한 studioPostId가 필요합니다.', 400);
  }
  if (!kind) {
    return jsonError('kind는 image 또는 video여야 합니다.', 400);
  }
  if (!r2Key) {
    return jsonError('r2_key가 필요합니다.', 400);
  }
  if (!isAllowedStudioR2Key(studioPostId, r2Key)) {
    return jsonError('r2_key 형식이 올바르지 않습니다.', 400);
  }
  if (!mime || !validateStudioMediaMime(kind, mime)) {
    return jsonError(
      kind === 'video'
        ? 'kind=video 인 경우 mime은 video/* 이어야 합니다.'
        : 'kind=image 인 경우 mime은 image/* 이어야 합니다.',
      400
    );
  }
  if (!bytes) {
    return jsonError('bytes가 필요합니다.', 400);
  }
  if (bytes > MAX_STUDIO_MEDIA_BYTES) {
    return jsonError(`파일 크기는 최대 ${MAX_STUDIO_MEDIA_BYTES} bytes (2GB)까지 허용됩니다.`, 400);
  }

  const { data: post, error: postError } = await (adminClient as any)
    .from('studio_posts')
    .select('id')
    .eq('id', studioPostId)
    .maybeSingle();

  if (postError) {
    return jsonError('Studio 게시글 확인에 실패했습니다.', 500, postError);
  }
  if (!post) {
    return jsonError('존재하지 않는 Studio 게시글입니다.', 404);
  }

  try {
    const r2BucketName = getDefaultR2BucketName();
    const { data, error } = await (adminClient as any)
      .from('studio_media')
      .insert({
        studio_post_id: studioPostId,
        kind,
        r2_bucket: r2BucketName,
        r2_key: r2Key,
        mime,
        bytes
      })
      .select('id,studio_post_id,kind,r2_bucket,r2_key,mime,bytes,created_at')
      .single();

    if (error) {
      return jsonError('Studio 미디어 등록에 실패했습니다.', 500, error);
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[Studio media register] unexpected error', error);
    return jsonError(error instanceof Error ? error.message : '미디어 등록 실패', 500);
  }
}

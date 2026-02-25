import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';
import { signR2PutUrl } from '@/utils/r2';
import {
  buildStudioR2Key,
  isValidStudioPostId,
  MAX_STUDIO_MEDIA_BYTES,
  normalizeBytes,
  normalizeStudioMediaKind,
  validateStudioMediaMime
} from '@/utils/studio-media-upload';

export const runtime = 'nodejs';

type PresignPutBody = {
  studioPostId?: string;
  filename?: string;
  contentType?: string;
  bytes?: number | string;
  kind?: string;
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

export async function POST(request: Request) {
  const { user, isAdmin, adminClient } = await getAdminApiContext();
  if (!user) return jsonError('로그인이 필요합니다.', 401);
  if (!isAdmin || !adminClient) return jsonError('관리자 권한이 없습니다.', 403);

  const body = (await request.json().catch(() => ({}))) as PresignPutBody;
  const studioPostId = String(body.studioPostId || '').trim();
  const filename = String(body.filename || '').trim();
  const contentType = String(body.contentType || '').trim().toLowerCase();
  const kind = normalizeStudioMediaKind(body.kind);
  const bytes = normalizeBytes(body.bytes);

  if (!isValidStudioPostId(studioPostId)) {
    return jsonError('유효한 studioPostId가 필요합니다.', 400);
  }
  if (!filename) {
    return jsonError('filename이 필요합니다.', 400);
  }
  if (!kind) {
    return jsonError('kind는 image 또는 video여야 합니다.', 400);
  }
  if (!contentType || !validateStudioMediaMime(kind, contentType)) {
    return jsonError(
      kind === 'video'
        ? 'kind=video 인 경우 contentType은 video/* 이어야 합니다.'
        : 'kind=image 인 경우 contentType은 image/* 이어야 합니다.',
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
    const r2_key = buildStudioR2Key(studioPostId, filename);
    const uploadUrl = await signR2PutUrl(r2_key, {
      contentType,
      expiresIn: 300
    });

    return NextResponse.json({ r2_key, uploadUrl });
  } catch (error) {
    console.error('[R2 presign-put] unexpected error', error);
    return jsonError(error instanceof Error ? error.message : 'R2 presign 실패', 500);
  }
}


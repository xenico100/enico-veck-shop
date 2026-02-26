import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';
import { signR2PutUrl } from '@/utils/r2';
import {
  buildStudioR2Key,
  isValidStudioPostId,
  MAX_STUDIO_MEDIA_BYTES,
  normalizeBytes,
  normalizeStudioMediaKind,
  sanitizeUploadFilename,
  validateStudioMediaMime
} from '@/utils/studio-media-upload';

export const runtime = 'nodejs';

type PresignPutBody = {
  studioPostId?: string;
  servicePostId?: string;
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
  const servicePostId = String(body.servicePostId || '').trim();
  const filename = String(body.filename || '').trim();
  const contentType = String(body.contentType || '').trim().toLowerCase();
  const kindRaw = String(body.kind || '').trim().toLowerCase();
  const studioKind = normalizeStudioMediaKind(body.kind);
  const bytes = normalizeBytes(body.bytes);

  if (!filename) {
    return jsonError('filename이 필요합니다.', 400);
  }
  if (!bytes) {
    return jsonError('bytes가 필요합니다.', 400);
  }
  if (bytes > MAX_STUDIO_MEDIA_BYTES) {
    return jsonError(`파일 크기는 최대 ${MAX_STUDIO_MEDIA_BYTES} bytes (2GB)까지 허용됩니다.`, 400);
  }

  if (studioPostId) {
    if (!isValidStudioPostId(studioPostId)) {
      return jsonError('유효한 studioPostId가 필요합니다.', 400);
    }
    if (!studioKind) {
      return jsonError('Studio 업로드 kind는 image 또는 video여야 합니다.', 400);
    }
    if (!contentType || !validateStudioMediaMime(studioKind, contentType)) {
      return jsonError(
        studioKind === 'video'
          ? 'kind=video 인 경우 contentType은 video/* 이어야 합니다.'
          : 'kind=image 인 경우 contentType은 image/* 이어야 합니다.',
        400
      );
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
      console.error('[R2 presign-put] unexpected studio error', error);
      return jsonError(error instanceof Error ? error.message : 'R2 presign 실패', 500);
    }
  }

  if (servicePostId) {
    if (!isValidStudioPostId(servicePostId)) {
      return jsonError('유효한 servicePostId가 필요합니다.', 400);
    }
    if (!contentType) {
      return jsonError('contentType이 필요합니다.', 400);
    }
    if (kindRaw && kindRaw !== 'file' && kindRaw !== 'download') {
      return jsonError('Service 파일 업로드 kind는 file 또는 download 여야 합니다.', 400);
    }

    const { data: post, error: postError } = await (adminClient as any)
      .from('service_posts')
      .select('id')
      .eq('id', servicePostId)
      .maybeSingle();

    if (postError) {
      return jsonError('Service 게시글 확인에 실패했습니다.', 500, postError);
    }
    if (!post) {
      return jsonError('존재하지 않는 Service 게시글입니다.', 404);
    }

    try {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const safeFilename = sanitizeUploadFilename(filename);
      const r2_key = `service-files/${servicePostId}/${year}-${month}/${randomUUID()}_${safeFilename}`;
      const uploadUrl = await signR2PutUrl(r2_key, {
        contentType,
        expiresIn: 300
      });

      return NextResponse.json({ r2_key, uploadUrl });
    } catch (error) {
      console.error('[R2 presign-put] unexpected service file error', error);
      return jsonError(error instanceof Error ? error.message : 'R2 presign 실패', 500);
    }
  }

  return jsonError('studioPostId 또는 servicePostId가 필요합니다.', 400);
}

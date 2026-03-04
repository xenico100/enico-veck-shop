import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import {
  canCreateAdminClient,
  createAdminClient
} from '@/utils/supabase/adminClient';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;
const DEFAULT_PROOF_BUCKET = 'service-images';

const IMAGE_EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif'
};

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const sanitizeImageExtension = (fileName: string, mimeType: string) => {
  const type = mimeType.trim().toLowerCase();
  const mimeExt = IMAGE_EXT_BY_MIME[type];
  const fromName = fileName.includes('.')
    ? fileName.split('.').pop()?.toLowerCase()
    : null;
  const normalizedFromName =
    fromName && /^[a-z0-9]{2,8}$/.test(fromName) ? fromName : null;
  if (mimeExt) return mimeExt;
  if (normalizedFromName) return normalizedFromName;
  return 'jpg';
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const formData = await request.formData();
  const entry = formData.get('file');
  if (!(entry instanceof File) || entry.size === 0) {
    return jsonError('업로드할 이미지 파일이 없습니다.', 400);
  }
  if (!entry.type.startsWith('image/')) {
    return jsonError('이체인증 이미지만 업로드할 수 있습니다.', 400);
  }
  if (entry.size > MAX_UPLOAD_SIZE) {
    return jsonError(
      '이체인증 이미지는 최대 8MB까지 업로드할 수 있습니다.',
      400
    );
  }

  const storageBucket =
    normalizeText(process.env.BANK_TRANSFER_PROOF_BUCKET) ||
    normalizeText(process.env.NEXT_PUBLIC_BANK_TRANSFER_PROOF_BUCKET) ||
    DEFAULT_PROOF_BUCKET;

  const fileExt = sanitizeImageExtension(entry.name, entry.type);
  const now = new Date();
  const monthPrefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const actorId = normalizeText(user?.id) || 'guest';
  const path = `bank-transfer-proofs/${monthPrefix}/${actorId}_${randomUUID()}.${fileExt}`;
  const buffer = Buffer.from(await entry.arrayBuffer());

  const canUseAdmin = canCreateAdminClient();
  const storageClient = canUseAdmin
    ? createAdminClient()
    : user
      ? supabase
      : null;
  if (!storageClient) {
    return jsonError(
      '이미지 업로드 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.',
      500
    );
  }

  const { error: uploadError } = await storageClient.storage
    .from(storageBucket)
    .upload(path, buffer, {
      contentType: entry.type,
      upsert: false
    });
  if (uploadError) {
    return jsonError(
      '이체인증 이미지 업로드에 실패했습니다.',
      500,
      uploadError
    );
  }

  const { data: publicData } = storageClient.storage
    .from(storageBucket)
    .getPublicUrl(path);
  const publicUrl = normalizeText(publicData?.publicUrl);
  if (!publicUrl) {
    return jsonError(
      '업로드는 완료되었지만 이미지 URL을 생성하지 못했습니다.',
      500
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      url: publicUrl,
      path,
      bucket: storageBucket
    }
  });
}

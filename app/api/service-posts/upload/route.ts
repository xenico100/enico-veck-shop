import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { buildRateLimitKey, consumeRateLimit } from '@/utils/rate-limit';

const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const IMAGE_EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/heic': 'heic',
  'image/heif': 'heif'
};

const sanitizeImageExtension = (fileName: string, mimeType: string) => {
  const type = mimeType.trim().toLowerCase();
  const mimeExt = IMAGE_EXT_BY_MIME[type];
  const fromName = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : null;
  const normalizedFromName =
    fromName && /^[a-z0-9]{2,8}$/.test(fromName) ? fromName : null;
  if (mimeExt) return mimeExt;
  if (normalizedFromName) return normalizedFromName;
  return 'jpg';
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const rateLimit = consumeRateLimit({
    key: buildRateLimitKey({
      request,
      scope: 'service-image-upload',
      userId: user.id
    }),
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: '업로드 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const formData = await request.formData();
  const files = formData.getAll('files');

  if (files.length === 0) {
    return NextResponse.json({ message: '업로드할 파일이 없습니다.' }, { status: 400 });
  }

  const uploadedUrls: string[] = [];

  for (const entry of files) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    if (!entry.type.startsWith('image/')) {
      return NextResponse.json({ message: '이미지 파일만 업로드 가능합니다.' }, { status: 400 });
    }
    if (entry.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { message: '이미지는 8MB 이하만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    const ext = sanitizeImageExtension(entry.name, entry.type);
    const path = `${user.id}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await entry.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('service-images')
      .upload(path, buffer, {
        contentType: entry.type,
        upsert: false
      });

    if (uploadError) {
      console.error('[service-posts/upload] image upload failed', uploadError);
      return NextResponse.json(
        { message: '이미지 업로드에 실패했습니다.' },
        { status: 500 }
      );
    }

    const { data: publicData } = supabase.storage
      .from('service-images')
      .getPublicUrl(path);

    uploadedUrls.push(publicData.publicUrl);
  }

  return NextResponse.json({ data: { image_urls: uploadedUrls } });
}

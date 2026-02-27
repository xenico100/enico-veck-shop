import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  isAdminEmailValue,
  normalizeImageUrls,
  slugifyServicePost,
  type ServicePostPayload
} from '@/utils/service-posts';

const SERVICE_POSTS_TABLE = 'service_posts';
const PUBLIC_SERVICE_POST_SELECT =
  'id,title,slug,category,summary,content,price_from,currency,is_paid_file,file_price,download_file_url,image_urls,is_published,created_at,updated_at,created_by';
const PUBLIC_SERVICE_POST_SELECT_FALLBACK =
  'id,title,slug,category,summary,content,price_from,currency,image_urls,is_published,created_at,updated_at,created_by';

const parseJsonBody = async <T,>(request: Request) => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

const hasMissingPaidFileColumnsError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();
  return (
    combined.includes('service_posts') &&
    (combined.includes('is_paid_file') ||
      combined.includes('file_price') ||
      combined.includes('download_file_url'))
  );
};

const hasDuplicateSlugKeyError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const code = typeof row.code === 'string' ? row.code : '';
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const combined = `${code} ${message} ${details}`.toLowerCase();
  return (
    combined.includes('service_posts_slug_key') ||
    (combined.includes('23505') && combined.includes('slug')) ||
    (combined.includes('duplicate key') && combined.includes('slug'))
  );
};

const withPaidFileDefaults = (rows: unknown[]) =>
  rows.map((row) => ({
    ...(row && typeof row === 'object' ? (row as Record<string, unknown>) : {}),
    is_paid_file: false,
    file_price: null,
    download_file_url: null
  }));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const includeAll = searchParams.get('all') === 'true';

  const supabase = createClient();

  if (includeAll) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmailValue(user.email)) {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
    }

    let query = (supabase as never)
      .from(SERVICE_POSTS_TABLE)
      .select('*')
      .order('updated_at', { ascending: false });

    if (category && category !== '모든 제품') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { message: '게시글 목록을 불러오지 못했습니다.', error },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  }

  let query = (supabase as never)
    .from(SERVICE_POSTS_TABLE)
    .select(PUBLIC_SERVICE_POST_SELECT)
    .eq('is_published', true)
    .order('updated_at', { ascending: false });

  if (category && category !== '모든 제품') {
    query = query.eq('category', category);
  }

  let { data, error } = await query;

  if (error && hasMissingPaidFileColumnsError(error)) {
    console.warn(
      '[service-posts] paid-file columns missing on service_posts, falling back to legacy select',
      error
    );

    let fallbackQuery = (supabase as never)
      .from(SERVICE_POSTS_TABLE)
      .select(PUBLIC_SERVICE_POST_SELECT_FALLBACK)
      .eq('is_published', true)
      .order('updated_at', { ascending: false });

    if (category && category !== '모든 제품') {
      fallbackQuery = fallbackQuery.eq('category', category);
    }

    const fallbackResult = await fallbackQuery;
    data = Array.isArray(fallbackResult.data) ? withPaidFileDefaults(fallbackResult.data) : [];
    error = fallbackResult.error;
  }

  if (error) {
    return NextResponse.json(
      { message: '서비스 게시글을 불러오지 못했습니다.', error },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const body = await parseJsonBody<ServicePostPayload>(request);
  if (!body) {
    return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ message: '제목은 필수입니다.' }, { status: 400 });
  }
  if (body.is_paid_file === true) {
    if (!(typeof body.file_price === 'number' && Number.isFinite(body.file_price) && body.file_price > 0)) {
      return NextResponse.json(
        { message: '유료 3D 파일 게시글은 file_price(양수)가 필요합니다.' },
        { status: 400 }
      );
    }
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const isPaidFilePost = body.is_paid_file === true;
  const requestedSlug = body.slug?.trim();
  const baseSlug = requestedSlug || slugifyServicePost(title) || null;
  const basePayload = {
    title,
    category: body.category?.trim() || null,
    summary: body.summary?.trim() || null,
    content: body.content?.trim() || null,
    price_from: typeof body.price_from === 'number' ? body.price_from : null,
    currency: body.currency?.trim() || 'KRW',
    image_urls: normalizeImageUrls(body.image_urls),
    is_published: Boolean(body.is_published ?? true),
    created_by: user.id
  };

  const paidFilePayload = isPaidFilePost
    ? {
        is_paid_file: true,
        file_price:
          typeof body.file_price === 'number' && Number.isFinite(body.file_price)
            ? body.file_price
            : null,
        download_file_url: body.download_file_url?.trim() || null
      }
    : {};

  const insertWithSlugRetry = async (includePaidFileColumns: boolean) => {
    const maxAttempts = baseSlug ? 10 : 1;
    let lastData: unknown = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const slugCandidate =
        baseSlug == null
          ? null
          : attempt === 0
            ? baseSlug
            : `${baseSlug}-${attempt + 1}`;
      const payload = {
        ...basePayload,
        slug: slugCandidate,
        ...(includePaidFileColumns ? paidFilePayload : {})
      };

      const { data, error } = await (supabase as never)
        .from(SERVICE_POSTS_TABLE)
        .insert(payload)
        .select('*')
        .single();

      if (!error) {
        return { data, error: null };
      }

      lastData = data;
      lastError = error;

      if (!hasDuplicateSlugKeyError(error)) {
        break;
      }
    }

    return { data: lastData, error: lastError };
  };

  let { data, error } = await insertWithSlugRetry(isPaidFilePost);

  if (error && hasMissingPaidFileColumnsError(error)) {
    if (isPaidFilePost) {
      return NextResponse.json(
        {
          message:
            '현재 DB에 유료 파일 컬럼이 없어 유료 서비스 게시글 생성이 불가능합니다. 최신 SQL 마이그레이션을 적용해 주세요.',
          error
        },
        { status: 500 }
      );
    }

    const fallbackResult = await insertWithSlugRetry(false);
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    return NextResponse.json(
      { message: '서비스 게시글 생성에 실패했습니다.', error },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

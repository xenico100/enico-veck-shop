import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  isAdminEmailValue,
  normalizeImageUrls,
  slugifyServicePost,
  type ServicePostPayload
} from '@/utils/service-posts';

const SERVICE_POSTS_TABLE = 'service_posts';

const parseJsonBody = async <T,>(request: Request) => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

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
    .select(
      'id,title,slug,category,summary,content,price_from,currency,image_urls,is_published,created_at,updated_at,created_by'
    )
    .eq('is_published', true)
    .order('updated_at', { ascending: false });

  if (category && category !== '모든 제품') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

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

  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const payload = {
    title,
    slug: body.slug?.trim() || slugifyServicePost(title) || null,
    category: body.category?.trim() || null,
    summary: body.summary?.trim() || null,
    content: body.content?.trim() || null,
    price_from: typeof body.price_from === 'number' ? body.price_from : null,
    currency: body.currency?.trim() || 'KRW',
    image_urls: normalizeImageUrls(body.image_urls),
    is_published: Boolean(body.is_published ?? true),
    created_by: user.id
  };

  const { data, error } = await (supabase as never)
    .from(SERVICE_POSTS_TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json(
      { message: '서비스 게시글 생성에 실패했습니다.', error },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import {
  isAdminEmailValue,
  normalizeImageUrls,
  slugifyServicePost,
  type ServicePostPayload
} from '@/utils/service-posts';

const SERVICE_POSTS_TABLE = 'service_posts';

type RouteContext = {
  params: { id: string };
};

const parseJsonBody = async <T,>(request: Request) => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

export async function GET(_request: Request, { params }: RouteContext) {
  const supabase = createClient();
  const id = params.id;

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const isAdmin = isAdminEmailValue(user?.email);

  let query = (supabase as never).from(SERVICE_POSTS_TABLE).select('*').eq('id', id);

  if (!isAdmin) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json(
      { message: '게시글 상세를 불러오지 못했습니다.', error },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const body = await parseJsonBody<ServicePostPayload>(request);
  if (!body) {
    return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const isAdmin = isAdminEmailValue(user.email);
  const client = isAdmin ? createAdminClient() : (supabase as never);
  const id = params.id;

  const currentResult = await (isAdmin ? client : (client as never))
    .from(SERVICE_POSTS_TABLE)
    .select('id,created_by,title')
    .eq('id', id)
    .maybeSingle();

  if (currentResult.error || !currentResult.data) {
    return NextResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (!isAdmin && currentResult.data.created_by !== user.id) {
    return NextResponse.json({ message: '수정 권한이 없습니다.' }, { status: 403 });
  }

  const nextTitle = body.title?.trim() || currentResult.data.title;
  const updatePayload = {
    ...(body.title !== undefined ? { title: nextTitle } : {}),
    ...(body.slug !== undefined
      ? { slug: body.slug?.trim() || slugifyServicePost(nextTitle) || null }
      : {}),
    ...(body.category !== undefined ? { category: body.category?.trim() || null } : {}),
    ...(body.summary !== undefined ? { summary: body.summary?.trim() || null } : {}),
    ...(body.content !== undefined ? { content: body.content?.trim() || null } : {}),
    ...(body.price_from !== undefined
      ? { price_from: typeof body.price_from === 'number' ? body.price_from : null }
      : {}),
    ...(body.currency !== undefined ? { currency: body.currency?.trim() || 'KRW' } : {}),
    ...(body.image_urls !== undefined ? { image_urls: normalizeImageUrls(body.image_urls) } : {}),
    ...(body.is_published !== undefined ? { is_published: Boolean(body.is_published) } : {})
  };

  const { data, error } = await (client as never)
    .from(SERVICE_POSTS_TABLE)
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json(
      { message: '게시글 수정에 실패했습니다.', error },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const isAdmin = isAdminEmailValue(user.email);
  const client = isAdmin ? createAdminClient() : (supabase as never);
  const id = params.id;

  const { data: existing, error: fetchError } = await (client as never)
    .from(SERVICE_POSTS_TABLE)
    .select('id,created_by,image_urls')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (!isAdmin && existing.created_by !== user.id) {
    return NextResponse.json({ message: '삭제 권한이 없습니다.' }, { status: 403 });
  }

  const { error } = await (client as never).from(SERVICE_POSTS_TABLE).delete().eq('id', id);

  if (error) {
    return NextResponse.json(
      { message: '게시글 삭제에 실패했습니다.', error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

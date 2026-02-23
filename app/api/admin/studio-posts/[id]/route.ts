import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';

type RouteContext = {
  params: { id: string };
};

type StudioPostPatchBody = {
  title?: string;
  content?: string;
  image_url?: string | null;
};

async function parseBody(request: Request) {
  try {
    return (await request.json()) as StudioPostPatchBody;
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { user, isAdmin, adminClient } = await getAdminApiContext();
  if (!user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (!isAdmin || !adminClient) {
    return NextResponse.json({ message: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  const body = await parseBody(request);
  if (!body) {
    return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 });
  }

  const postId = params.id;
  const title = body.title?.trim();
  const content = body.content?.trim();

  if (!postId || !title || !content) {
    return NextResponse.json(
      { message: '제목과 내용을 모두 입력해 주세요.' },
      { status: 400 }
    );
  }

  const { data, error } = await (adminClient as never)
    .from('studio_posts')
    .update({
      title,
      content,
      image_url: body.image_url?.trim() || null
    })
    .eq('id', postId)
    .select('id,title,content,image_url,user_id,created_at')
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
  const { user, isAdmin, adminClient } = await getAdminApiContext();
  if (!user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (!isAdmin || !adminClient) {
    return NextResponse.json({ message: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  const postId = params.id;
  if (!postId) {
    return NextResponse.json({ message: '잘못된 게시글 ID입니다.' }, { status: 400 });
  }

  const { error } = await (adminClient as never).from('studio_posts').delete().eq('id', postId);
  if (error) {
    return NextResponse.json(
      { message: '게시글 삭제에 실패했습니다.', error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

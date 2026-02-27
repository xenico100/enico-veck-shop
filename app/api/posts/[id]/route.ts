import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type RouteContext = {
  params: { id: string };
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  const postId = (params.id || '').trim();
  if (!postId) {
    return NextResponse.json({ message: '잘못된 게시글 ID입니다.' }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data, error } = await (supabase as never)
    .from('studio_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { message: '게시글 롤백(삭제)에 실패했습니다.', details: error },
      { status: 500 }
    );
  }

  if (!data?.id) {
    return NextResponse.json(
      { message: '롤백 대상 게시글을 찾지 못했습니다.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, id: data.id });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cleanupStudioPostMediaFromR2 } from '@/utils/studio-media-cleanup';

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

  let adminClient: any = null;
  try {
    const { createAdminClient } = await import('@/utils/supabase/adminClient');
    adminClient = createAdminClient();
  } catch {
    return NextResponse.json(
      { message: '관리자 DB 설정이 없어 R2 미디어 정리를 진행할 수 없습니다.' },
      { status: 500 }
    );
  }

  const { data: ownedPost, error: ownedPostError } = await (adminClient as never)
    .from('studio_posts')
    .select('id')
    .eq('id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (ownedPostError) {
    return NextResponse.json(
      { message: '게시글 소유권 확인에 실패했습니다.', details: ownedPostError },
      { status: 500 }
    );
  }

  if (!ownedPost?.id) {
    return NextResponse.json(
      { message: '롤백 대상 게시글을 찾지 못했습니다.' },
      { status: 404 }
    );
  }

  const cleanupResult = await cleanupStudioPostMediaFromR2(adminClient, postId);
  if (!cleanupResult.ok) {
    return NextResponse.json(
      {
        message: cleanupResult.message ?? 'R2 미디어 정리에 실패했습니다.',
        deleted_r2_objects: cleanupResult.deletedCount,
        failed_r2_objects: cleanupResult.failed
      },
      { status: 500 }
    );
  }

  const { data, error } = await (adminClient as never)
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

  return NextResponse.json({
    ok: true,
    id: data.id,
    deleted_r2_objects: cleanupResult.deletedCount
  });
}

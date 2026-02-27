import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';
import { cleanupStudioPostMediaFromR2 } from '@/utils/studio-media-cleanup';

type RouteContext = {
  params: { id: string };
};

type StudioPostPatchBody = {
  title?: string;
  content?: string;
  image_url?: string | null;
  required_membership_level?: number | string | null;
};

async function parseBody(request: Request) {
  try {
    return (await request.json()) as StudioPostPatchBody;
  } catch {
    return null;
  }
}

const normalizeRequiredMembershipLevel = (value: unknown) => {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : 0;
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(3, Math.max(0, Math.floor(numeric)));
};

const hasMissingRequiredMembershipLevelColumnError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();
  return combined.includes('required_membership_level') && combined.includes('studio_posts');
};

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
  const hasRequiredMembershipLevelField = Object.prototype.hasOwnProperty.call(
    body,
    'required_membership_level'
  );
  const requiredMembershipLevel = hasRequiredMembershipLevelField
    ? normalizeRequiredMembershipLevel(body.required_membership_level)
    : null;

  if (!postId || !title || !content) {
    return NextResponse.json(
      { message: '제목과 내용을 모두 입력해 주세요.' },
      { status: 400 }
    );
  }

  let result = await (adminClient as never)
    .from('studio_posts')
    .update({
      title,
      content,
      image_url: body.image_url?.trim() || null,
      ...(requiredMembershipLevel != null
        ? { required_membership_level: requiredMembershipLevel }
        : {})
    })
    .eq('id', postId)
    .select('id,title,content,image_url,user_id,created_at,required_membership_level')
    .single();

  if (result.error && hasMissingRequiredMembershipLevelColumnError(result.error)) {
    result = await (adminClient as never)
      .from('studio_posts')
      .update({
        title,
        content,
        image_url: body.image_url?.trim() || null
      })
      .eq('id', postId)
      .select('id,title,content,image_url,user_id,created_at')
      .single();

    if (!result.error && result.data) {
      result = {
        ...result,
        data: { ...(result.data as Record<string, unknown>), required_membership_level: 0 }
      };
    }
  }

  if (result.error) {
    return NextResponse.json(
      { message: '게시글 수정에 실패했습니다.', error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: result.data });
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

  const { error } = await (adminClient as never).from('studio_posts').delete().eq('id', postId);
  if (error) {
    return NextResponse.json(
      { message: '게시글 삭제에 실패했습니다.', error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, deleted_r2_objects: cleanupResult.deletedCount });
}

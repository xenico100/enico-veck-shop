import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { isAdminUserLike } from '@/utils/service-posts';

export const runtime = 'nodejs';

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const getCommentId = (value: string) => value.trim();

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const commentId = getCommentId(params.id || '');
    if (!commentId) {
      return jsonError('유효하지 않은 댓글 ID입니다.', 400);
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('로그인이 필요합니다.', 401);
    }

    const admin = createAdminClient();
    const { data: existing, error: existingError } = await (admin as any)
      .from('community_comments')
      .select('id,user_id')
      .eq('id', commentId)
      .maybeSingle();

    if (existingError) {
      return jsonError('댓글을 확인하지 못했습니다.', 500, existingError);
    }

    if (!existing) {
      return jsonError('댓글을 찾을 수 없습니다.', 404);
    }

    const isAdmin = isAdminUserLike({
      email: user.email ?? null,
      app_metadata:
        user.app_metadata && typeof user.app_metadata === 'object'
          ? (user.app_metadata as Record<string, unknown>)
          : null,
      user_metadata:
        user.user_metadata && typeof user.user_metadata === 'object'
          ? (user.user_metadata as Record<string, unknown>)
          : null
    });
    const isOwner = existing.user_id === user.id;
    if (!isOwner && !isAdmin) {
      return jsonError('댓글 삭제 권한이 없습니다.', 403);
    }

    const { error } = await (admin as any)
      .from('community_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      return jsonError('댓글 삭제에 실패했습니다.', 500, error);
    }

    return NextResponse.json({ ok: true, commentId });
  } catch (error) {
    console.error('[community/comments/:id DELETE] unexpected error', error);
    return jsonError(error instanceof Error ? error.message : 'Unexpected comment delete error', 500);
  }
}

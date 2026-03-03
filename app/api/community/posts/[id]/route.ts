import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { isAdminUserLike } from '@/utils/service-posts';

export const runtime = 'nodejs';

type UpdateCommunityPostBody = {
  title?: string;
  content?: string;
  isNotice?: boolean;
};

const TITLE_MAX_LENGTH = 160;
const CONTENT_MAX_LENGTH = 10000;

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const normalizeTitle = (value: unknown) =>
  typeof value === 'string' ? value.trim().slice(0, TITLE_MAX_LENGTH) : '';

const normalizeContent = (value: unknown) =>
  typeof value === 'string' ? value.trim().slice(0, CONTENT_MAX_LENGTH) : '';

const getPostId = (value: string) => value.trim();

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const postId = getPostId(params.id || '');
    if (!postId) {
      return jsonError('유효하지 않은 게시글 ID입니다.', 400);
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
      .from('community_posts')
      .select('id,user_id,is_notice,title,content')
      .eq('id', postId)
      .maybeSingle();

    if (existingError) {
      return jsonError('게시글을 확인하지 못했습니다.', 500, existingError);
    }

    if (!existing) {
      return jsonError('게시글을 찾을 수 없습니다.', 404);
    }

    const isAdmin = isAdminUserLike({ email: user.email, role: user.role });
    const isOwner = existing.user_id === user.id;
    if (!isOwner && !isAdmin) {
      return jsonError('수정 권한이 없습니다.', 403);
    }

    if (existing.is_notice && !isAdmin) {
      return jsonError('공지 게시글은 관리자만 수정할 수 있습니다.', 403);
    }

    const body = (await request.json().catch(() => ({}))) as UpdateCommunityPostBody;
    const title = body.title === undefined ? String(existing.title || '') : normalizeTitle(body.title);
    const content =
      body.content === undefined ? String(existing.content || '') : normalizeContent(body.content);
    const requestedNotice = body.isNotice;
    const isNotice = typeof requestedNotice === 'boolean' ? (isAdmin ? requestedNotice : false) : Boolean(existing.is_notice);

    if (!title || !content) {
      return jsonError('제목과 내용을 입력해 주세요.', 400);
    }

    const { data, error } = await (admin as any)
      .from('community_posts')
      .update({
        title,
        content,
        is_notice: isNotice
      })
      .eq('id', postId)
      .select('id,user_id,title,content,is_notice,created_at,updated_at')
      .single();

    if (error || !data) {
      return jsonError('게시글 수정에 실패했습니다.', 500, error);
    }

    return NextResponse.json({
      data: {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        content: data.content,
        isNotice: Boolean(data.is_notice),
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    });
  } catch (error) {
    console.error('[community/posts/:id PATCH] unexpected error', error);
    return jsonError(error instanceof Error ? error.message : 'Unexpected update error', 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const postId = getPostId(params.id || '');
    if (!postId) {
      return jsonError('유효하지 않은 게시글 ID입니다.', 400);
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
      .from('community_posts')
      .select('id,user_id,is_notice')
      .eq('id', postId)
      .maybeSingle();

    if (existingError) {
      return jsonError('게시글을 확인하지 못했습니다.', 500, existingError);
    }

    if (!existing) {
      return jsonError('게시글을 찾을 수 없습니다.', 404);
    }

    const isAdmin = isAdminUserLike({ email: user.email, role: user.role });
    const isOwner = existing.user_id === user.id;
    if (!isOwner && !isAdmin) {
      return jsonError('삭제 권한이 없습니다.', 403);
    }

    if (existing.is_notice && !isAdmin) {
      return jsonError('공지 게시글은 관리자만 삭제할 수 있습니다.', 403);
    }

    const { error } = await (admin as any)
      .from('community_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      return jsonError('게시글 삭제에 실패했습니다.', 500, error);
    }

    return NextResponse.json({ ok: true, postId });
  } catch (error) {
    console.error('[community/posts/:id DELETE] unexpected error', error);
    return jsonError(error instanceof Error ? error.message : 'Unexpected delete error', 500);
  }
}

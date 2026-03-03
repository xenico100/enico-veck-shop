import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { isAdminUserLike } from '@/utils/service-posts';

export const runtime = 'nodejs';

type CommunityPostBody = {
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

const buildAuthorNameMap = async (admin: ReturnType<typeof createAdminClient>, userIds: string[]) => {
  const uniqueIds = Array.from(new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, string>();

  const { data } = await (admin as any).from('users').select('id,full_name').in('id', uniqueIds);
  const rows = Array.isArray(data) ? (data as Array<{ id: string; full_name?: string | null }>) : [];
  const map = new Map<string, string>();
  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id : '';
    if (!id) continue;
    const fullName = typeof row.full_name === 'string' ? row.full_name.trim() : '';
    map.set(id, fullName || `회원 ${id.slice(0, 8)}`);
  }
  return map;
};

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data: postsData, error: postsError } = await (admin as any)
      .from('community_posts')
      .select('id,user_id,title,content,is_notice,created_at,updated_at')
      .order('is_notice', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200);

    if (postsError) {
      return jsonError('게시글을 불러오지 못했습니다.', 500, postsError);
    }

    const posts = Array.isArray(postsData)
      ? (postsData as Array<{
          id: string;
          user_id: string;
          title: string;
          content: string;
          is_notice: boolean;
          created_at: string;
          updated_at: string;
        }>)
      : [];

    const postIds = posts.map((post) => post.id);
    let comments: Array<{
      id: string;
      post_id: string;
      user_id: string;
      content: string;
      created_at: string;
      updated_at: string;
    }> = [];

    if (postIds.length > 0) {
      const { data: commentsData, error: commentsError } = await (admin as any)
        .from('community_comments')
        .select('id,post_id,user_id,content,created_at,updated_at')
        .in('post_id', postIds)
        .order('created_at', { ascending: true })
        .limit(2000);

      if (commentsError) {
        return jsonError('댓글을 불러오지 못했습니다.', 500, commentsError);
      }

      comments = Array.isArray(commentsData)
        ? (commentsData as Array<{
            id: string;
            post_id: string;
            user_id: string;
            content: string;
            created_at: string;
            updated_at: string;
          }>)
        : [];
    }

    const authorNameMap = await buildAuthorNameMap(admin, [
      ...posts.map((post) => post.user_id),
      ...comments.map((comment) => comment.user_id)
    ]);

    const commentsByPostId = new Map<string, Array<Record<string, unknown>>>();
    for (const comment of comments) {
      const current = commentsByPostId.get(comment.post_id) ?? [];
      current.push({
        id: comment.id,
        postId: comment.post_id,
        userId: comment.user_id,
        authorName: authorNameMap.get(comment.user_id) || `회원 ${comment.user_id.slice(0, 8)}`,
        content: comment.content,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at
      });
      commentsByPostId.set(comment.post_id, current);
    }

    return NextResponse.json({
      data: posts.map((post) => ({
        id: post.id,
        userId: post.user_id,
        authorName: authorNameMap.get(post.user_id) || `회원 ${post.user_id.slice(0, 8)}`,
        title: post.title,
        content: post.content,
        isNotice: Boolean(post.is_notice),
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        comments: commentsByPostId.get(post.id) ?? []
      }))
    });
  } catch (error) {
    console.error('[community/posts GET] unexpected error', error);
    return jsonError(error instanceof Error ? error.message : 'Unexpected community posts error', 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('로그인이 필요합니다.', 401);
    }

    const body = (await request.json().catch(() => ({}))) as CommunityPostBody;
    const title = normalizeTitle(body.title);
    const content = normalizeContent(body.content);
    const isNoticeRequested = Boolean(body.isNotice);

    if (!title || !content) {
      return jsonError('제목과 내용을 입력해 주세요.', 400);
    }

    const isAdmin = isAdminUserLike({ email: user.email, role: user.role });
    if (isNoticeRequested && !isAdmin) {
      return jsonError('공지 작성 권한이 없습니다.', 403);
    }

    const admin = createAdminClient();
    const { data, error } = await (admin as any)
      .from('community_posts')
      .insert({
        user_id: user.id,
        title,
        content,
        is_notice: isNoticeRequested && isAdmin
      })
      .select('id,user_id,title,content,is_notice,created_at,updated_at')
      .single();

    if (error || !data) {
      return jsonError('게시글 작성에 실패했습니다.', 500, error);
    }

    const authorNameMap = await buildAuthorNameMap(admin, [data.user_id]);
    return NextResponse.json({
      data: {
        id: data.id,
        userId: data.user_id,
        authorName: authorNameMap.get(data.user_id) || `회원 ${String(data.user_id).slice(0, 8)}`,
        title: data.title,
        content: data.content,
        isNotice: Boolean(data.is_notice),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        comments: []
      }
    });
  } catch (error) {
    console.error('[community/posts POST] unexpected error', error);
    return jsonError(error instanceof Error ? error.message : 'Unexpected community create error', 500);
  }
}

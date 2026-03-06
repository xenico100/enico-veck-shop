import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { buildRateLimitKey, consumeRateLimit } from '@/utils/rate-limit';

export const runtime = 'nodejs';

type CreateCommunityCommentBody = {
  postId?: string;
  content?: string;
};

const COMMENT_MAX_LENGTH = 2000;
const COMMENT_RATE_LIMIT_MAX = 60;
const COMMENT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const normalizeContent = (value: unknown) =>
  typeof value === 'string' ? value.trim().slice(0, COMMENT_MAX_LENGTH) : '';

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

    const rateLimit = consumeRateLimit({
      key: buildRateLimitKey({
        request,
        scope: 'community-comment',
        userId: user.id
      }),
      max: COMMENT_RATE_LIMIT_MAX,
      windowMs: COMMENT_RATE_LIMIT_WINDOW_MS
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds)
          }
        }
      );
    }

    const body = (await request.json().catch(() => ({}))) as CreateCommunityCommentBody;
    const postId = typeof body.postId === 'string' ? body.postId.trim() : '';
    const content = normalizeContent(body.content);

    if (!postId || !content) {
      return jsonError('댓글 내용을 입력해 주세요.', 400);
    }

    const admin = createAdminClient();
    const { data: postRow, error: postError } = await (admin as any)
      .from('community_posts')
      .select('id')
      .eq('id', postId)
      .maybeSingle();

    if (postError) {
      console.error('[community/comments POST] failed to load post', postError);
      return jsonError('게시글 확인에 실패했습니다.', 500);
    }
    if (!postRow) {
      return jsonError('게시글을 찾을 수 없습니다.', 404);
    }

    const { data, error } = await (admin as any)
      .from('community_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content
      })
      .select('id,post_id,user_id,content,created_at,updated_at')
      .single();

    if (error || !data) {
      console.error('[community/comments POST] failed to insert comment', error);
      return jsonError('댓글 작성에 실패했습니다.', 500);
    }

    const { data: userRow } = await (admin as any)
      .from('users')
      .select('id,full_name')
      .eq('id', user.id)
      .maybeSingle();

    const authorName =
      typeof userRow?.full_name === 'string' && userRow.full_name.trim()
        ? userRow.full_name.trim()
        : `회원 ${user.id.slice(0, 8)}`;

    return NextResponse.json({
      data: {
        id: data.id,
        postId: data.post_id,
        userId: data.user_id,
        authorName,
        content: data.content,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    });
  } catch (error) {
    console.error('[community/comments POST] unexpected error', error);
    return jsonError(error instanceof Error ? error.message : 'Unexpected comment create error', 500);
  }
}

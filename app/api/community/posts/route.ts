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

type CommunityReactionValue = 'like' | 'dislike';

const TITLE_MAX_LENGTH = 160;
const CONTENT_MAX_LENGTH = 10000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const normalizeTitle = (value: unknown) =>
  typeof value === 'string' ? value.trim().slice(0, TITLE_MAX_LENGTH) : '';

const normalizeContent = (value: unknown) =>
  typeof value === 'string' ? value.trim().slice(0, CONTENT_MAX_LENGTH) : '';

const toUnixMs = (value: string | null | undefined) => {
  if (!value) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const extractDbErrorText = (error: unknown) => {
  if (!error || typeof error !== 'object') return '';
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  return `${message} ${details} ${hint}`.toLowerCase();
};

const hasMissingTableError = (error: unknown, tableName: string) => {
  const combined = extractDbErrorText(error);
  if (!combined) return false;

  return (
    (combined.includes(tableName) || combined.includes(`public.${tableName}`)) &&
    (combined.includes('does not exist') ||
      combined.includes('schema cache') ||
      combined.includes('could not find the table'))
  );
};

const parseDbErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') return null;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const combined = extractDbErrorText(error);
  const missingCommunityPostsTable = hasMissingTableError(error, 'community_posts');
  const missingCommunityCommentsTable = hasMissingTableError(error, 'community_comments');

  if (missingCommunityPostsTable || missingCommunityCommentsTable) {
    return '커뮤니티 DB가 아직 적용되지 않았습니다. 관리자에게 community_board 마이그레이션 적용을 요청해 주세요.';
  }
  if (combined.includes('row-level security') || combined.includes('permission denied')) {
    return '커뮤니티 게시글 권한 설정 문제로 작성에 실패했습니다. 관리자에게 RLS 설정 확인을 요청해 주세요.';
  }

  return message || null;
};

const isCommunitySetupMissingMessage = (message: string | null) =>
  typeof message === 'string' && message.includes('커뮤니티 DB가 아직 적용되지 않았습니다.');

const fallbackAuthorNameFromUser = (user: { id: string; email?: string | null; user_metadata?: any }) => {
  const fullName =
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
  if (fullName) return fullName;
  const name = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : '';
  if (name) return name;
  const emailLocal = typeof user.email === 'string' ? user.email.split('@')[0]?.trim() : '';
  return emailLocal || `회원 ${String(user.id || '').slice(0, 8)}`;
};

const tryCreateAdminClient = () => {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
};

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
    const supabase = createClient();
    const {
      data: { user: viewerUser }
    } = await supabase.auth.getUser();
    const viewerUserId = viewerUser?.id ?? null;

    const admin = tryCreateAdminClient();
    const readClient = (admin ?? supabase) as any;

    const { data: postsData, error: postsError } = await readClient
      .from('community_posts')
      .select('id,user_id,title,content,is_notice,created_at,updated_at')
      .order('is_notice', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200);

    if (postsError) {
      const dbMessage = parseDbErrorMessage(postsError);
      if (isCommunitySetupMissingMessage(dbMessage)) {
        return NextResponse.json({
          data: [],
          setupRequired: true,
          message: dbMessage
        });
      }
      return jsonError(dbMessage || '게시글을 불러오지 못했습니다.', 500, postsError);
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
    let reactions: Array<{
      post_id: string;
      user_id: string;
      reaction: CommunityReactionValue;
      created_at: string;
      updated_at: string;
    }> = [];

    if (postIds.length > 0) {
      const { data: commentsData, error: commentsError } = await readClient
        .from('community_comments')
        .select('id,post_id,user_id,content,created_at,updated_at')
        .in('post_id', postIds)
        .order('created_at', { ascending: true })
        .limit(2000);

      if (commentsError) {
        const dbMessage = parseDbErrorMessage(commentsError);
        if (!isCommunitySetupMissingMessage(dbMessage)) {
          return jsonError(dbMessage || '댓글을 불러오지 못했습니다.', 500, commentsError);
        }
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

      const { data: reactionsData, error: reactionsError } = await readClient
        .from('community_post_reactions')
        .select('post_id,user_id,reaction,created_at,updated_at')
        .in('post_id', postIds);

      if (reactionsError) {
        if (!hasMissingTableError(reactionsError, 'community_post_reactions')) {
          const dbMessage = parseDbErrorMessage(reactionsError);
          return jsonError(dbMessage || '좋아요/싫어요 정보를 불러오지 못했습니다.', 500, reactionsError);
        }
      } else {
        reactions = Array.isArray(reactionsData)
          ? (reactionsData as Array<{
            post_id: string;
            user_id: string;
            reaction: CommunityReactionValue;
            created_at: string;
            updated_at: string;
          }>)
          : [];
      }
    }

    const authorNameMap = admin
      ? await buildAuthorNameMap(admin, [
          ...posts.map((post) => post.user_id),
          ...comments.map((comment) => comment.user_id)
        ])
      : new Map<string, string>();

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

    const reactionStatsByPostId = new Map<
      string,
      {
        likeCount: number;
        dislikeCount: number;
        dailyLikeCount: number;
        viewerReaction: CommunityReactionValue | null;
      }
    >();
    const dailyStartMs = Date.now() - ONE_DAY_MS;
    for (const reactionRow of reactions) {
      const current = reactionStatsByPostId.get(reactionRow.post_id) ?? {
        likeCount: 0,
        dislikeCount: 0,
        dailyLikeCount: 0,
        viewerReaction: null
      };

      if (reactionRow.reaction === 'like') current.likeCount += 1;
      if (reactionRow.reaction === 'dislike') current.dislikeCount += 1;
      const reactionTimestamp = toUnixMs(reactionRow.updated_at || reactionRow.created_at);
      if (reactionRow.reaction === 'like' && reactionTimestamp >= dailyStartMs) {
        current.dailyLikeCount += 1;
      }

      if (viewerUserId && reactionRow.user_id === viewerUserId) {
        current.viewerReaction =
          reactionRow.reaction === 'like' || reactionRow.reaction === 'dislike'
            ? reactionRow.reaction
            : null;
      }

      reactionStatsByPostId.set(reactionRow.post_id, current);
    }

    return NextResponse.json({
      data: posts.map((post) => ({
        ...(reactionStatsByPostId.get(post.id) ?? {
          likeCount: 0,
          dislikeCount: 0,
          dailyLikeCount: 0,
          viewerReaction: null
        }),
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
    if (isNoticeRequested && !isAdmin) {
      return jsonError('공지 작성 권한이 없습니다.', 403);
    }

    let data: any = null;
    let error: unknown = null;

    if (!isNoticeRequested) {
      // Prefer user-scoped write so non-admin posting works even without service-role key.
      const userWriteResult = await (supabase as any)
        .from('community_posts')
        .insert({
          user_id: user.id,
          title,
          content,
          is_notice: false
        })
        .select('id,user_id,title,content,is_notice,created_at,updated_at')
        .single();

      data = userWriteResult.data;
      error = userWriteResult.error;
    }

    if (!data || error) {
      const admin = tryCreateAdminClient();
      if (isNoticeRequested && !admin) {
        return jsonError(
          '공지 작성 기능을 사용하려면 서버에 SUPABASE_SERVICE_ROLE_KEY 설정이 필요합니다.',
          500
        );
      }

      if (admin) {
        const adminWriteResult = await (admin as any)
          .from('community_posts')
          .insert({
            user_id: user.id,
            title,
            content,
            is_notice: isNoticeRequested && isAdmin
          })
          .select('id,user_id,title,content,is_notice,created_at,updated_at')
          .single();

        data = adminWriteResult.data;
        error = adminWriteResult.error;
      }
    }

    if (error || !data) {
      const dbMessage = parseDbErrorMessage(error);
      return jsonError(dbMessage || '게시글 작성에 실패했습니다.', 500, error);
    }

    let authorName = fallbackAuthorNameFromUser(user);
    const admin = tryCreateAdminClient();
    if (admin) {
      const authorNameMap = await buildAuthorNameMap(admin, [data.user_id]);
      authorName = authorNameMap.get(data.user_id) || authorName;
    }

    return NextResponse.json({
      data: {
        id: data.id,
        userId: data.user_id,
        authorName,
        title: data.title,
        content: data.content,
        isNotice: Boolean(data.is_notice),
        likeCount: 0,
        dislikeCount: 0,
        dailyLikeCount: 0,
        viewerReaction: null,
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

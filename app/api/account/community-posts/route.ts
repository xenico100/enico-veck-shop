import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

const hasMissingTableError = (error: unknown, tableName: string) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();
  const includesTable =
    combined.includes(tableName.toLowerCase()) || combined.includes(`public.${tableName.toLowerCase()}`);
  const isMissingTableError =
    combined.includes('does not exist') ||
    combined.includes('schema cache') ||
    combined.includes('could not find the table');
  return includesTable && isMissingTableError;
};

type CommunityPostRow = {
  id: string;
  title: string;
  content: string;
  is_notice: boolean;
  created_at: string;
  updated_at: string;
};

type CommunityCommentRow = {
  id: string;
  post_id: string;
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const postsQuery = await (supabase as any)
    .from('community_posts')
    .select('id,title,content,is_notice,created_at,updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (postsQuery.error) {
    if (hasMissingTableError(postsQuery.error, 'community_posts')) {
      return NextResponse.json(
        { message: 'community_posts 테이블이 없습니다. 커뮤니티 마이그레이션을 먼저 적용해 주세요.' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { message: postsQuery.error.message || '내 게시글을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }

  const posts = Array.isArray(postsQuery.data) ? (postsQuery.data as CommunityPostRow[]) : [];
  if (posts.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const postIds = posts.map((post) => post.id);
  const commentsQuery = await (supabase as any)
    .from('community_comments')
    .select('id,post_id')
    .in('post_id', postIds)
    .limit(5000);

  if (commentsQuery.error) {
    if (hasMissingTableError(commentsQuery.error, 'community_comments')) {
      return NextResponse.json(
        { message: 'community_comments 테이블이 없습니다. 커뮤니티 마이그레이션을 먼저 적용해 주세요.' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { message: commentsQuery.error.message || '게시글 댓글 수를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }

  const comments = Array.isArray(commentsQuery.data)
    ? (commentsQuery.data as CommunityCommentRow[])
    : [];
  const commentCountByPostId = new Map<string, number>();

  for (const comment of comments) {
    const postId = typeof comment.post_id === 'string' ? comment.post_id : '';
    if (!postId) continue;
    commentCountByPostId.set(postId, (commentCountByPostId.get(postId) ?? 0) + 1);
  }

  return NextResponse.json({
    data: posts.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      is_notice: Boolean(post.is_notice),
      created_at: post.created_at,
      updated_at: post.updated_at,
      comment_count: commentCountByPostId.get(post.id) ?? 0
    }))
  });
}

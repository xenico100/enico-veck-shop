import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';

export const runtime = 'nodejs';

type CommunityReactionValue = 'like' | 'dislike';

type CommunityReactionBody = {
  postId?: string;
  reaction?: CommunityReactionValue;
};

const REACTION_VALUES = new Set<CommunityReactionValue>(['like', 'dislike']);

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

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

  if (
    hasMissingTableError(error, 'community_posts') ||
    hasMissingTableError(error, 'community_comments') ||
    hasMissingTableError(error, 'community_post_reactions')
  ) {
    return '커뮤니티 DB가 아직 적용되지 않았습니다. 관리자에게 community_board 및 community_post_reactions 마이그레이션 적용을 요청해 주세요.';
  }

  if (combined.includes('row-level security') || combined.includes('permission denied')) {
    return '좋아요/싫어요 권한 설정 문제로 요청에 실패했습니다. 관리자에게 RLS 설정 확인을 요청해 주세요.';
  }

  return message || null;
};

const tryCreateAdminClient = () => {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
};

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

    const body = (await request.json().catch(() => ({}))) as CommunityReactionBody;
    const postId = typeof body.postId === 'string' ? body.postId.trim() : '';
    const reaction = body.reaction;

    if (!postId) {
      return jsonError('유효하지 않은 게시글 ID입니다.', 400);
    }
    if (!reaction || !REACTION_VALUES.has(reaction)) {
      return jsonError('유효하지 않은 반응입니다.', 400);
    }

    const admin = tryCreateAdminClient();
    const readClient = (admin ?? supabase) as any;
    const writeClient = (admin ?? supabase) as any;

    const { data: postRow, error: postError } = await readClient
      .from('community_posts')
      .select('id')
      .eq('id', postId)
      .maybeSingle();

    if (postError) {
      const dbMessage = parseDbErrorMessage(postError);
      return jsonError(dbMessage || '게시글 확인에 실패했습니다.', 500, postError);
    }
    if (!postRow) {
      return jsonError('게시글을 찾을 수 없습니다.', 404);
    }

    const { data: existing, error: existingError } = await writeClient
      .from('community_post_reactions')
      .select('id,reaction')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) {
      const dbMessage = parseDbErrorMessage(existingError);
      return jsonError(dbMessage || '기존 반응 확인에 실패했습니다.', 500, existingError);
    }

    let viewerReaction: CommunityReactionValue | null = reaction;

    if (!existing) {
      const { error: insertError } = await writeClient.from('community_post_reactions').insert({
        post_id: postId,
        user_id: user.id,
        reaction
      });

      if (insertError) {
        const dbMessage = parseDbErrorMessage(insertError);
        return jsonError(dbMessage || '좋아요/싫어요 저장에 실패했습니다.', 500, insertError);
      }
    } else if (existing.reaction === reaction) {
      const { error: deleteError } = await writeClient
        .from('community_post_reactions')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        const dbMessage = parseDbErrorMessage(deleteError);
        return jsonError(dbMessage || '좋아요/싫어요 취소에 실패했습니다.', 500, deleteError);
      }
      viewerReaction = null;
    } else {
      const { error: updateError } = await writeClient
        .from('community_post_reactions')
        .update({ reaction })
        .eq('id', existing.id);

      if (updateError) {
        const dbMessage = parseDbErrorMessage(updateError);
        return jsonError(dbMessage || '좋아요/싫어요 변경에 실패했습니다.', 500, updateError);
      }
    }

    const [likeResult, dislikeResult] = await Promise.all([
      readClient
        .from('community_post_reactions')
        .select('id', { head: true, count: 'exact' })
        .eq('post_id', postId)
        .eq('reaction', 'like'),
      readClient
        .from('community_post_reactions')
        .select('id', { head: true, count: 'exact' })
        .eq('post_id', postId)
        .eq('reaction', 'dislike')
    ]);

    if (likeResult.error || dislikeResult.error) {
      const dbError = likeResult.error || dislikeResult.error;
      const dbMessage = parseDbErrorMessage(dbError);
      return jsonError(dbMessage || '좋아요/싫어요 집계에 실패했습니다.', 500, dbError);
    }

    return NextResponse.json({
      data: {
        postId,
        likeCount: likeResult.count ?? 0,
        dislikeCount: dislikeResult.count ?? 0,
        viewerReaction
      }
    });
  } catch (error) {
    console.error('[community/reactions POST] unexpected error', error);
    return jsonError(error instanceof Error ? error.message : 'Unexpected community reaction error', 500);
  }
}

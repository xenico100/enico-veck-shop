import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { buildRateLimitKey, consumeRateLimit } from '@/utils/rate-limit';

export const runtime = 'nodejs';

type CommunityReactionValue = 'like' | 'dislike';

type CommunityReactionBody = {
  postId?: string;
  reaction?: CommunityReactionValue;
};

type CommunityReactionSummary = {
  likeCount: number;
  dislikeCount: number;
  dailyLikeCount: number;
};

const REACTION_VALUES = new Set<CommunityReactionValue>(['like', 'dislike']);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REACTION_RATE_LIMIT_MAX = 180;
const REACTION_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

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

const hasMissingRpcFunctionError = (error: unknown, functionName: string) => {
  const combined = extractDbErrorText(error);
  if (!combined) return false;
  return (
    combined.includes(functionName.toLowerCase()) &&
    (combined.includes('does not exist') ||
      combined.includes('could not find the function') ||
      combined.includes('schema cache'))
  );
};

const toCount = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.floor(numeric);
};

const toUnixMs = (value: unknown) => {
  if (typeof value !== 'string') return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
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

  if (combined.includes('foreign key') && combined.includes('post_id')) {
    return '게시글을 찾을 수 없습니다.';
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

const getReactionSummary = async (
  readClient: any,
  postId: string
): Promise<CommunityReactionSummary> => {
  const dailyStartIso = new Date(Date.now() - ONE_DAY_MS).toISOString();
  const rpcResult = await readClient.rpc('get_community_post_reaction_summary', {
    p_post_id: postId,
    p_daily_since: dailyStartIso
  });

  if (!rpcResult.error) {
    const summaryRow = Array.isArray(rpcResult.data)
      ? rpcResult.data[0]
      : rpcResult.data;
    return {
      likeCount: toCount(summaryRow?.like_count),
      dislikeCount: toCount(summaryRow?.dislike_count),
      dailyLikeCount: toCount(summaryRow?.daily_like_count)
    };
  }

  if (!hasMissingRpcFunctionError(rpcResult.error, 'get_community_post_reaction_summary')) {
    throw rpcResult.error;
  }

  const fallbackResult = await readClient
    .from('community_post_reactions')
    .select('reaction,created_at,updated_at')
    .eq('post_id', postId);
  if (fallbackResult.error) {
    throw fallbackResult.error;
  }

  const rows = Array.isArray(fallbackResult.data)
    ? (fallbackResult.data as Array<{
        reaction: CommunityReactionValue;
        created_at: string | null;
        updated_at: string | null;
      }>)
    : [];
  const dailyStartMs = Date.now() - ONE_DAY_MS;
  let likeCount = 0;
  let dislikeCount = 0;
  let dailyLikeCount = 0;

  for (const row of rows) {
    if (row.reaction === 'like') {
      likeCount += 1;
      const reactionTimestamp = toUnixMs(row.updated_at || row.created_at);
      if (reactionTimestamp >= dailyStartMs) {
        dailyLikeCount += 1;
      }
      continue;
    }
    if (row.reaction === 'dislike') {
      dislikeCount += 1;
    }
  }

  return {
    likeCount,
    dislikeCount,
    dailyLikeCount
  };
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

    const rateLimit = consumeRateLimit({
      key: buildRateLimitKey({
        request,
        scope: 'community-reaction',
        userId: user.id
      }),
      max: REACTION_RATE_LIMIT_MAX,
      windowMs: REACTION_RATE_LIMIT_WINDOW_MS
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

    let summary: CommunityReactionSummary;
    try {
      summary = await getReactionSummary(readClient, postId);
    } catch (summaryError) {
      const dbMessage = parseDbErrorMessage(summaryError);
      const fallbackMessage =
        summaryError instanceof Error ? summaryError.message : null;
      return jsonError(
        dbMessage || fallbackMessage || '좋아요/싫어요 집계에 실패했습니다.',
        500,
        summaryError
      );
    }

    return NextResponse.json({
      data: {
        postId,
        likeCount: summary.likeCount,
        dislikeCount: summary.dislikeCount,
        dailyLikeCount: summary.dailyLikeCount,
        viewerReaction
      }
    });
  } catch (error) {
    console.error('[community/reactions POST] unexpected error', error);
    return jsonError(error instanceof Error ? error.message : 'Unexpected community reaction error', 500);
  }
}

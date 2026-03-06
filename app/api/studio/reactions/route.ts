import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { buildRateLimitKey, consumeRateLimit } from '@/utils/rate-limit';

export const runtime = 'nodejs';

type StudioReactionValue = 'like' | 'dislike';

type StudioReactionBody = {
  postId?: string;
  reaction?: StudioReactionValue;
};

type StudioReactionSummary = {
  likeCount: number;
  dislikeCount: number;
};

const REACTION_VALUES = new Set<StudioReactionValue>(['like', 'dislike']);
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

const parseDbErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') return null;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const combined = extractDbErrorText(error);

  if (
    hasMissingTableError(error, 'studio_posts') ||
    hasMissingTableError(error, 'studio_post_reactions')
  ) {
    return '스튜디오 게시글 반응 DB가 아직 적용되지 않았습니다. 관리자에게 studio_post_reactions 마이그레이션 적용을 요청해 주세요.';
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

const parsePostId = (value: string | null | undefined) => {
  const normalized = String(value || '').trim();
  return normalized;
};

const getReactionSummary = async (
  readClient: any,
  postId: string
): Promise<StudioReactionSummary> => {
  const rpcResult = await readClient.rpc('get_studio_post_reaction_summary', {
    p_post_id: postId
  });

  if (!rpcResult.error) {
    const summaryRow = Array.isArray(rpcResult.data)
      ? rpcResult.data[0]
      : rpcResult.data;
    return {
      likeCount: toCount(summaryRow?.like_count),
      dislikeCount: toCount(summaryRow?.dislike_count)
    };
  }

  if (!hasMissingRpcFunctionError(rpcResult.error, 'get_studio_post_reaction_summary')) {
    const dbMessage = parseDbErrorMessage(rpcResult.error);
    throw new Error(dbMessage || '좋아요/싫어요 집계에 실패했습니다.');
  }

  const fallbackResult = await readClient
    .from('studio_post_reactions')
    .select('reaction')
    .eq('post_id', postId);

  if (fallbackResult.error) {
    const dbMessage = parseDbErrorMessage(fallbackResult.error);
    throw new Error(dbMessage || '좋아요/싫어요 집계에 실패했습니다.');
  }

  const rows = Array.isArray(fallbackResult.data)
    ? (fallbackResult.data as Array<{ reaction: StudioReactionValue }>)
    : [];
  let likeCount = 0;
  let dislikeCount = 0;
  for (const row of rows) {
    if (row.reaction === 'like') likeCount += 1;
    if (row.reaction === 'dislike') dislikeCount += 1;
  }

  return {
    likeCount,
    dislikeCount
  };
};

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const postId = parsePostId(requestUrl.searchParams.get('postId'));
    if (!postId) {
      return jsonError('유효하지 않은 게시글 ID입니다.', 400);
    }

    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const admin = tryCreateAdminClient();
    const readClient = (admin ?? supabase) as any;
    const [summary, viewerResult] = await Promise.all([
      getReactionSummary(readClient, postId),
      user?.id
        ? readClient
            .from('studio_post_reactions')
            .select('reaction')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    if (viewerResult.error) {
      const dbMessage = parseDbErrorMessage(viewerResult.error);
      return jsonError(dbMessage || '내 반응 조회에 실패했습니다.', 500, viewerResult.error);
    }

    const viewerReaction =
      viewerResult.data?.reaction === 'like' || viewerResult.data?.reaction === 'dislike'
        ? (viewerResult.data.reaction as StudioReactionValue)
        : null;

    return NextResponse.json({
      data: {
        postId,
        ...summary,
        viewerReaction
      }
    });
  } catch (error) {
    console.error('[studio/reactions GET] unexpected error', error);
    return jsonError(error instanceof Error ? error.message : 'Unexpected studio reaction error', 500);
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

    const rateLimit = consumeRateLimit({
      key: buildRateLimitKey({
        request,
        scope: 'studio-reaction',
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

    const body = (await request.json().catch(() => ({}))) as StudioReactionBody;
    const postId = parsePostId(body.postId);
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
      .from('studio_post_reactions')
      .select('id,reaction')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) {
      const dbMessage = parseDbErrorMessage(existingError);
      return jsonError(dbMessage || '기존 반응 확인에 실패했습니다.', 500, existingError);
    }

    let viewerReaction: StudioReactionValue | null = reaction;

    if (!existing) {
      const { error: insertError } = await writeClient.from('studio_post_reactions').insert({
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
        .from('studio_post_reactions')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        const dbMessage = parseDbErrorMessage(deleteError);
        return jsonError(dbMessage || '좋아요/싫어요 취소에 실패했습니다.', 500, deleteError);
      }
      viewerReaction = null;
    } else {
      const { error: updateError } = await writeClient
        .from('studio_post_reactions')
        .update({ reaction })
        .eq('id', existing.id);

      if (updateError) {
        const dbMessage = parseDbErrorMessage(updateError);
        return jsonError(dbMessage || '좋아요/싫어요 변경에 실패했습니다.', 500, updateError);
      }
    }

    const summary = await getReactionSummary(readClient, postId);

    return NextResponse.json({
      data: {
        postId,
        ...summary,
        viewerReaction
      }
    });
  } catch (error) {
    console.error('[studio/reactions POST] unexpected error', error);
    return jsonError(error instanceof Error ? error.message : 'Unexpected studio reaction error', 500);
  }
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

type StudioReactionValue = 'like' | 'dislike';

type StudioReactionResponse = {
  message?: string;
  data?: {
    postId: string;
    likeCount: number;
    dislikeCount: number;
    viewerReaction: StudioReactionValue | null;
  };
};

type Props = {
  postId: string;
  isLoggedIn: boolean;
};

const buildOptimisticReactionState = (
  likeCount: number,
  dislikeCount: number,
  viewerReaction: StudioReactionValue | null,
  nextReaction: StudioReactionValue
) => {
  const nextViewerReaction: StudioReactionValue | null =
    viewerReaction === nextReaction ? null : nextReaction;
  const likeDelta =
    (nextViewerReaction === 'like' ? 1 : 0) - (viewerReaction === 'like' ? 1 : 0);
  const dislikeDelta =
    (nextViewerReaction === 'dislike' ? 1 : 0) -
    (viewerReaction === 'dislike' ? 1 : 0);

  return {
    likeCount: Math.max(0, likeCount + likeDelta),
    dislikeCount: Math.max(0, dislikeCount + dislikeDelta),
    viewerReaction: nextViewerReaction
  };
};

export default function StudioPostReactions({ postId, isLoggedIn }: Props) {
  const [loading, setLoading] = useState(true);
  const [processingReaction, setProcessingReaction] = useState<StudioReactionValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [viewerReaction, setViewerReaction] = useState<StudioReactionValue | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/studio/reactions?postId=${encodeURIComponent(postId)}`, {
        cache: 'no-store'
      });
      const payload = (await response.json().catch(() => ({}))) as StudioReactionResponse;
      if (!response.ok) {
        throw new Error(payload.message || '좋아요/싫어요를 불러오지 못했습니다.');
      }

      setLikeCount(typeof payload.data?.likeCount === 'number' ? payload.data.likeCount : 0);
      setDislikeCount(typeof payload.data?.dislikeCount === 'number' ? payload.data.dislikeCount : 0);
      setViewerReaction(
        payload.data?.viewerReaction === 'like' || payload.data?.viewerReaction === 'dislike'
          ? payload.data.viewerReaction
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '좋아요/싫어요를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handleReaction = async (reaction: StudioReactionValue) => {
    if (!isLoggedIn) {
      setError('로그인 후 좋아요/싫어요를 누를 수 있습니다.');
      return;
    }
    if (processingReaction) return;

    setProcessingReaction(reaction);
    setError(null);
    const previousState = {
      likeCount,
      dislikeCount,
      viewerReaction
    };
    const optimisticState = buildOptimisticReactionState(
      likeCount,
      dislikeCount,
      viewerReaction,
      reaction
    );
    setLikeCount(optimisticState.likeCount);
    setDislikeCount(optimisticState.dislikeCount);
    setViewerReaction(optimisticState.viewerReaction);

    try {
      const response = await fetch('/api/studio/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, reaction })
      });
      const payload = (await response.json().catch(() => ({}))) as StudioReactionResponse;
      if (!response.ok) {
        throw new Error(payload.message || '좋아요/싫어요 저장에 실패했습니다.');
      }

      setLikeCount(typeof payload.data?.likeCount === 'number' ? payload.data.likeCount : 0);
      setDislikeCount(typeof payload.data?.dislikeCount === 'number' ? payload.data.dislikeCount : 0);
      setViewerReaction(
        payload.data?.viewerReaction === 'like' || payload.data?.viewerReaction === 'dislike'
          ? payload.data.viewerReaction
          : null
      );
    } catch (err) {
      setLikeCount(previousState.likeCount);
      setDislikeCount(previousState.dislikeCount);
      setViewerReaction(previousState.viewerReaction);
      setError(err instanceof Error ? err.message : '좋아요/싫어요 저장에 실패했습니다.');
    } finally {
      setProcessingReaction(null);
    }
  };

  const statusText = useMemo(() => {
    if (loading) return '반응 정보를 불러오는 중...';
    if (!isLoggedIn) return '로그인 후 반응을 남길 수 있습니다.';
    return '좋아요/싫어요를 눌러 반응을 남겨보세요.';
  }, [isLoggedIn, loading]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.24em] text-neutral-400">Post Reactions</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleReaction('like')}
            disabled={loading || Boolean(processingReaction)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              viewerReaction === 'like'
                ? 'border-emerald-300/40 bg-emerald-500/15 text-emerald-100'
                : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
            } disabled:cursor-not-allowed disabled:opacity-60`}
            title={isLoggedIn ? '좋아요' : '로그인 후 사용할 수 있습니다.'}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>{likeCount}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleReaction('dislike')}
            disabled={loading || Boolean(processingReaction)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              viewerReaction === 'dislike'
                ? 'border-rose-300/40 bg-rose-500/15 text-rose-100'
                : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
            } disabled:cursor-not-allowed disabled:opacity-60`}
            title={isLoggedIn ? '싫어요' : '로그인 후 사용할 수 있습니다.'}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            <span>{dislikeCount}</span>
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-neutral-500">{statusText}</p>
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div>
  );
}

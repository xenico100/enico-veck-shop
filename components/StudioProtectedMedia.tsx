'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SignedStudioMedia = {
  id: string;
  kind: 'image' | 'video';
  url: string;
  mime: string | null;
  bytes: number | null;
  is_free_public?: boolean;
};

type ApiResponse = {
  data?: SignedStudioMedia[];
  meta?: {
    has_active_subscription?: boolean;
    showing_public_only?: boolean;
  };
  message?: string;
  details?: unknown;
};

type CachedMediaEntry = {
  items: SignedStudioMedia[];
  showingPublicOnly: boolean;
  expiresAt: number;
};

const MEDIA_CACHE_TTL_MS = 45 * 1000;
const mediaCache = new Map<string, CachedMediaEntry>();

const extractApiDetailMessage = (details: unknown): string | null => {
  if (!details || typeof details !== 'object') return null;
  const row = details as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message.trim() : '';
  const detail = typeof row.details === 'string' ? row.details.trim() : '';
  const hint = typeof row.hint === 'string' ? row.hint.trim() : '';

  const first = [message, detail, hint].find((value) => Boolean(value));
  return first ? first.slice(0, 180) : null;
};

type Props = {
  studioPostId: string;
};

const formatBytes = (value: number | null) => {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getCachedMedia = (postId: string) => {
  const key = postId.trim();
  if (!key) return null;
  const cached = mediaCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    mediaCache.delete(key);
    return null;
  }
  return cached;
};

const setCachedMedia = (
  postId: string,
  items: SignedStudioMedia[],
  showingPublicOnly: boolean
) => {
  const key = postId.trim();
  if (!key) return;
  mediaCache.set(key, {
    items,
    showingPublicOnly,
    expiresAt: Date.now() + MEDIA_CACHE_TTL_MS
  });
};

const mergeMediaRows = (
  previewRows: SignedStudioMedia[],
  fullRows: SignedStudioMedia[]
) => {
  if (fullRows.length === 0) return previewRows;
  const merged = new Map<string, SignedStudioMedia>();
  for (const row of fullRows) {
    merged.set(row.id, row);
  }
  for (const row of previewRows) {
    if (!merged.has(row.id)) {
      merged.set(row.id, row);
    }
  }
  return Array.from(merged.values());
};

export default function StudioProtectedMedia({ studioPostId }: Props) {
  const [items, setItems] = useState<SignedStudioMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showingPublicOnly, setShowingPublicOnly] = useState(false);
  const requestSeqRef = useRef(0);

  const loadMedia = useCallback(
    async (forceRefresh = false) => {
      const requestSeq = requestSeqRef.current + 1;
      requestSeqRef.current = requestSeq;

      const cached = !forceRefresh ? getCachedMedia(studioPostId) : null;
      if (cached) {
        setItems(cached.items);
        setShowingPublicOnly(cached.showingPublicOnly);
        setLoading(false);
        setLoadingMore(false);
        setError(null);
        return;
      }

      setLoading(true);
      setLoadingMore(false);
      setError(null);

      try {
        const previewResponse = await fetch(
          `/api/studio/media/${encodeURIComponent(studioPostId)}?preview=1`,
          {
            cache: 'no-store'
          }
        );
        const previewPayload = (await previewResponse
          .json()
          .catch(() => ({}))) as ApiResponse;
        if (!previewResponse.ok) {
          const detailMessage = extractApiDetailMessage(previewPayload.details);
          const baseMessage = previewPayload.message || '미디어를 불러오지 못했습니다.';
          throw new Error(
            detailMessage ? `${baseMessage} (${detailMessage})` : baseMessage
          );
        }
        if (requestSeq !== requestSeqRef.current) return;

        const previewItems = Array.isArray(previewPayload.data)
          ? previewPayload.data
          : [];
        const previewShowingPublicOnly = Boolean(
          previewPayload.meta?.showing_public_only
        );
        setItems(previewItems);
        setShowingPublicOnly(previewShowingPublicOnly);
        setLoading(false);

        if (previewItems.length === 0) {
          setCachedMedia(studioPostId, [], previewShowingPublicOnly);
          return;
        }

        setLoadingMore(true);
        try {
          const fullResponse = await fetch(
            `/api/studio/media/${encodeURIComponent(studioPostId)}`,
            {
              cache: 'no-store'
            }
          );
          const fullPayload = (await fullResponse
            .json()
            .catch(() => ({}))) as ApiResponse;
          if (!fullResponse.ok) {
            const detailMessage = extractApiDetailMessage(fullPayload.details);
            const baseMessage = fullPayload.message || '미디어를 불러오지 못했습니다.';
            throw new Error(
              detailMessage ? `${baseMessage} (${detailMessage})` : baseMessage
            );
          }
          if (requestSeq !== requestSeqRef.current) return;

          const fullItems = Array.isArray(fullPayload.data) ? fullPayload.data : [];
          const mergedItems = mergeMediaRows(previewItems, fullItems);
          const fullShowingPublicOnly = Boolean(
            fullPayload.meta?.showing_public_only ?? previewShowingPublicOnly
          );

          setItems(mergedItems);
          setShowingPublicOnly(fullShowingPublicOnly);
          setCachedMedia(studioPostId, mergedItems, fullShowingPublicOnly);
        } catch (fullLoadError) {
          if (requestSeq !== requestSeqRef.current) return;
          console.warn('[StudioProtectedMedia] full media load failed', fullLoadError);
          setCachedMedia(studioPostId, previewItems, previewShowingPublicOnly);
        } finally {
          if (requestSeq === requestSeqRef.current) {
            setLoadingMore(false);
          }
        }
      } catch (err) {
        if (requestSeq !== requestSeqRef.current) return;
        setItems([]);
        setShowingPublicOnly(false);
        setLoadingMore(false);
        setError(
          err instanceof Error ? err.message : '미디어를 불러오지 못했습니다.'
        );
      } finally {
        if (requestSeq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [studioPostId]
  );

  useEffect(() => {
    void loadMedia();
    return () => {
      requestSeqRef.current += 1;
    };
  }, [loadMedia]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-300">
        미디어 링크를 준비하는 중입니다...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-5">
        <p className="text-sm text-rose-100">{error}</p>
        <button
          type="button"
          onClick={() => void loadMedia(true)}
          className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/20"
        >
          다시 불러오기
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-300">
        {showingPublicOnly
          ? '일반 공개 미디어가 아직 없습니다. 멤버십 전용 미디어는 가입 후 표시됩니다.'
          : '연결된 전용 미디어가 아직 없습니다.'}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {items.map((item) => (
        <div
          key={item.id}
          className="overflow-hidden rounded-2xl border border-white/10 bg-black/40"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-400">
              {item.kind === 'video' ? 'Video' : 'Image'}
              {item.is_free_public ? ' · 일반 공개' : ''}
              {item.mime ? ` · ${item.mime}` : ''}
              {formatBytes(item.bytes) ? ` · ${formatBytes(item.bytes)}` : ''}
            </p>
          </div>

          {item.kind === 'video' ? (
            <video
              controls
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              playsInline
              preload="metadata"
              src={item.url}
              onContextMenu={(event) => event.preventDefault()}
              className="h-auto w-full bg-black"
            />
          ) : (
            <img
              src={item.url}
              alt=""
              loading="lazy"
              className="h-auto w-full object-contain"
            />
          )}
        </div>
      ))}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-neutral-400">
        보안 링크는 잠시 후 만료됩니다. 재생/열기 오류가 나면 다시 불러오기를
        눌러주세요.
        {showingPublicOnly ? ' 일반 공개 미디어만 표시 중입니다.' : ''}
        {loadingMore ? ' 나머지 미디어를 불러오는 중입니다...' : ''}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';

type SignedStudioMedia = {
  id: string;
  kind: 'image' | 'video';
  url: string;
  mime: string | null;
  bytes: number | null;
};

type ApiResponse = {
  data?: SignedStudioMedia[];
  message?: string;
};

type Props = {
  studioPostId: string;
};

const formatBytes = (value: number | null) => {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export default function StudioProtectedMedia({ studioPostId }: Props) {
  const [items, setItems] = useState<SignedStudioMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/studio/media/${encodeURIComponent(studioPostId)}`, {
        cache: 'no-store'
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok) {
        throw new Error(payload.message || '미디어를 불러오지 못했습니다.');
      }

      setItems(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : '미디어를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [studioPostId]);

  useEffect(() => {
    void loadMedia();
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
          onClick={() => void loadMedia()}
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
        연결된 전용 미디어가 아직 없습니다.
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
              {item.mime ? ` · ${item.mime}` : ''}
              {formatBytes(item.bytes) ? ` · ${formatBytes(item.bytes)}` : ''}
            </p>
          </div>

          {item.kind === 'video' ? (
            <video
              controls
              preload="metadata"
              src={item.url}
              className="h-auto w-full bg-black"
            />
          ) : (
            <img src={item.url} alt="" loading="lazy" className="h-auto w-full object-contain" />
          )}
        </div>
      ))}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-neutral-400">
        보안 링크는 잠시 후 만료됩니다. 재생/열기 오류가 나면 다시 불러오기를 눌러주세요.
      </div>
    </div>
  );
}


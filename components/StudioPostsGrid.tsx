'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import cn from 'classnames';

type StudioPost = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

type StudioPostsGridProps = {
  posts: StudioPost[];
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium'
  }).format(new Date(value));

export default function StudioPostsGrid({ posts }: StudioPostsGridProps) {
  const [selected, setSelected] = useState<StudioPost | null>(null);

  const close = useCallback(() => setSelected(null), []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    if (selected) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [close, selected]);

  const emptyState = useMemo(
    () => (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-base text-neutral-400">
        아직 등록된 Studio 게시물이 없습니다. 마이페이지에서 새 게시물을
        작성해 주세요.
      </div>
    ),
    []
  );

  return (
    <div className="mx-auto w-full max-w-6xl">
      {posts.length === 0 ? (
        emptyState
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() => setSelected(post)}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left shadow-[0_18px_45px_rgba(0,0,0,0.4)] transition hover:-translate-y-1 hover:border-white/40"
            >
              <div className="relative h-56 w-full overflow-hidden">
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="h-full w-full object-cover grayscale transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-sm uppercase tracking-[0.3em] text-neutral-500">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-neutral-400">
                  {formatDate(post.created_at)}
                </p>
                <h3 className="text-xl font-semibold text-white">
                  {post.title}
                </h3>
                <p
                  className="text-base text-neutral-300"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {post.content}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 transition-opacity duration-300',
          selected ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={!selected}
        onClick={close}
      >
        <div
          className={cn(
            'max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 shadow-2xl transition-all duration-300',
            selected ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          )}
          onClick={(event) => event.stopPropagation()}
        >
          {selected && (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-neutral-400">
                    {formatDate(selected.created_at)}
                  </p>
                  <h3 className="text-xl font-semibold text-white">
                    {selected.title}
                  </h3>
                </div>
                <button
                  onClick={close}
                  className="rounded-full border border-white/20 px-3 py-1 text-sm text-neutral-300 transition hover:border-white/60 hover:text-white"
                >
                  닫기
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  {selected.image_url ? (
                    <img
                      src={selected.image_url}
                      alt={selected.title}
                      className="h-full w-full object-cover grayscale"
                    />
                  ) : (
                    <div className="flex h-64 w-full items-center justify-center bg-neutral-900 text-sm uppercase tracking-[0.3em] text-neutral-500">
                      No Image
                    </div>
                  )}
                </div>
                <p className="text-base leading-relaxed text-neutral-200">
                  {selected.content}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

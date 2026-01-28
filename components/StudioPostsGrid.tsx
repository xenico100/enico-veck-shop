'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
import {
  deleteStudioPost,
  updateStudioPost,
  type StudioPostDeleteState,
  type StudioPostUpdateState
} from '@/app/account/actions';

type StudioPost = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
};

type StudioPostsGridProps = {
  posts: StudioPost[];
  currentUserId?: string | null;
  isAdmin?: boolean;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium'
  }).format(new Date(value));

const initialUpdateState: StudioPostUpdateState = {
  status: 'idle'
};

const initialDeleteState: StudioPostDeleteState = {
  status: 'idle'
};

export default function StudioPostsGrid({
  posts,
  currentUserId,
  isAdmin = false
}: StudioPostsGridProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<StudioPost | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateAction] = useFormState(
    updateStudioPost,
    initialUpdateState
  );
  const [deleteState, deleteAction] = useFormState(
    deleteStudioPost,
    initialDeleteState
  );

  const close = useCallback(() => {
    setSelected(null);
    setIsEditing(false);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    if (selected) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [close, selected]);

  useEffect(() => {
    if (updateState.status === 'success') {
      setIsEditing(false);
      router.refresh();
    }
  }, [router, updateState.status]);

  useEffect(() => {
    if (deleteState.status === 'success') {
      close();
      router.refresh();
    }
  }, [close, deleteState.status, router]);

  const emptyState = useMemo(
    () => (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-sm text-neutral-400">
        아직 등록된 Studio 게시물이 없습니다. 마이페이지에서 새 게시물을
        작성해 주세요.
      </div>
    ),
    []
  );

  const canManageSelected = selected
    ? isAdmin || selected.user_id === currentUserId
    : false;

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
                  <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-xs uppercase tracking-[0.3em] text-neutral-500">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                  {formatDate(post.created_at)}
                </p>
                <h3 className="text-lg font-semibold text-white">
                  {post.title}
                </h3>
                <p
                  className="text-sm text-neutral-300"
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
              <div className="flex items-start justify-between border-b border-white/10 px-6 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                    {formatDate(selected.created_at)}
                  </p>
                  <h3 className="text-lg font-semibold text-white">
                    {selected.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {canManageSelected && (
                    <button
                      onClick={() => setIsEditing((prev) => !prev)}
                      className="rounded-full border border-white/20 px-3 py-1 text-xs text-neutral-300 transition hover:border-white/60 hover:text-white"
                    >
                      {isEditing ? '보기' : '수정'}
                    </button>
                  )}
                  <button
                    onClick={close}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-neutral-300 transition hover:border-white/60 hover:text-white"
                  >
                    닫기
                  </button>
                </div>
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
                    <div className="flex h-64 w-full items-center justify-center bg-neutral-900 text-xs uppercase tracking-[0.3em] text-neutral-500">
                      No Image
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <p className="text-sm leading-relaxed text-neutral-200">
                    {selected.content}
                  </p>
                )}

                {canManageSelected && isEditing && (
                  <div className="space-y-4">
                    <form action={updateAction} className="space-y-4">
                      <input type="hidden" name="postId" value={selected.id} />
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                          제목
                        </label>
                        <input
                          name="title"
                          maxLength={80}
                          required
                          defaultValue={selected.title}
                          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                          내용
                        </label>
                        <textarea
                          name="content"
                          required
                          maxLength={2000}
                          rows={5}
                          defaultValue={selected.content}
                          className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                          이미지 변경 (선택)
                        </label>
                        <input
                          name="image"
                          type="file"
                          accept="image/*"
                          className="block w-full cursor-pointer rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-3 text-sm text-neutral-200 file:mr-4 file:rounded-full file:border-0 file:bg-white/80 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-black hover:file:bg-white"
                        />
                      </div>
                      {updateState.status === 'error' &&
                        updateState.message && (
                          <p className="text-sm text-neutral-300">
                            {updateState.message}
                          </p>
                        )}
                      <div className="flex justify-end">
                        <button className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/60">
                          수정 저장
                        </button>
                      </div>
                    </form>
                    <form
                      action={deleteAction}
                      onSubmit={(event) => {
                        if (!confirm('게시물을 삭제할까요?')) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="postId" value={selected.id} />
                      <button className="text-xs uppercase tracking-[0.2em] text-neutral-400 transition hover:text-white">
                        삭제
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

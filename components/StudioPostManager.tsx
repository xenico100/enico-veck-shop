'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import cn from 'classnames';
import { useToast } from '@/components/ui/Toasts/use-toast';
import {
  deleteStudioPost,
  updateStudioPost,
  type StudioPostDeleteState,
  type StudioPostUpdateState
} from '@/app/posts/actions';

type StudioPost = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

type StudioPostManagerProps = {
  posts: StudioPost[];
};

const initialUpdateState: StudioPostUpdateState = { status: 'idle' };
const initialDeleteState: StudioPostDeleteState = { status: 'idle' };

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));

export default function StudioPostManager({ posts }: StudioPostManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activePost, setActivePost] = useState<StudioPost | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [updateState, updateAction] = useFormState(updateStudioPost, initialUpdateState);
  const [deleteState, deleteAction] = useFormState(deleteStudioPost, initialDeleteState);

  useEffect(() => {
    if (updateState.status === 'success') {
      toast({ title: '수정 완료', description: '게시물이 업데이트되었습니다.' });
      setActivePost(null);
      setRemoveImage(false);
      router.refresh();
    }
    if (updateState.status === 'error' && updateState.message) {
      toast({ title: '수정 실패', description: updateState.message });
    }
  }, [router, toast, updateState]);

  useEffect(() => {
    if (deleteState.status === 'success') {
      toast({ title: '삭제 완료', description: '게시물이 삭제되었습니다.' });
      router.refresh();
    }
    if (deleteState.status === 'error' && deleteState.message) {
      toast({ title: '삭제 실패', description: deleteState.message });
    }
  }, [deleteState, router, toast]);

  useEffect(() => {
    if (!activePost) {
      setRemoveImage(false);
    }
  }, [activePost]);

  const emptyState = useMemo(
    () => (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-base text-neutral-400">
        아직 작성한 Studio 게시물이 없습니다. 첫 작업을 기록해 보세요.
      </div>
    ),
    []
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">Studio</p>
        <h3 className="text-2xl font-semibold text-white md:text-3xl">내 게시물 관리</h3>
        <p className="text-base text-neutral-400">
          등록한 Studio 게시물을 수정하거나 삭제할 수 있습니다.
        </p>
      </div>

      {posts.length === 0 ? (
        emptyState
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-[0.3em] text-neutral-400">
                    {formatDate(post.created_at)}
                  </p>
                  <h4 className="text-xl font-semibold text-white">{post.title}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePost(post)}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/60"
                >
                  수정
                </button>
              </div>
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="h-40 w-full rounded-2xl object-cover"
                />
              )}
              <p className="line-clamp-4 text-base leading-relaxed text-neutral-300">
                {post.content}
              </p>
              <div className="flex items-center justify-between">
                <form
                  action={deleteAction}
                  onSubmit={(event) => {
                    if (!window.confirm('게시물을 삭제할까요?')) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="postId" value={post.id} />
                  <button className="text-sm uppercase tracking-[0.2em] text-neutral-400 transition hover:text-white">
                    삭제
                  </button>
                </form>
                <span className="text-sm text-neutral-500">공개됨 · Studio 게시판</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 transition-opacity duration-200',
          activePost ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={!activePost}
        onClick={() => setActivePost(null)}
      >
        <div
          className={cn(
            'w-full max-w-2xl rounded-[28px] border border-white/20 bg-neutral-950 p-7 shadow-[0_40px_120px_rgba(0,0,0,0.65)] transition-all sm:p-8',
            activePost ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          )}
          onClick={(event) => event.stopPropagation()}
        >
          {activePost && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
                    스튜디오 게시물
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                    게시물 수정
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePost(null)}
                  className="rounded-full border border-white/20 px-3 py-1 text-sm text-neutral-300 transition hover:border-white/60 hover:text-white"
                >
                  닫기
                </button>
              </div>

              <form action={updateAction} className="mt-6 space-y-4" encType="multipart/form-data">
                <input type="hidden" name="postId" value={activePost.id} />
                <input type="hidden" name="existingImageUrl" value={activePost.image_url ?? ''} />

                <div className="space-y-2">
                  <label className="text-sm uppercase tracking-[0.3em] text-neutral-400">
                    제목
                  </label>
                  <input
                    name="title"
                    maxLength={80}
                    required
                    defaultValue={activePost.title}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/20"
                  />
                  {updateState.status === 'error' && updateState.fieldErrors?.title && (
                    <p className="text-sm text-red-200">{updateState.fieldErrors.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm uppercase tracking-[0.3em] text-neutral-400">
                    내용
                  </label>
                  <textarea
                    name="content"
                    required
                    maxLength={2000}
                    rows={6}
                    defaultValue={activePost.content}
                    className="min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/20"
                  />
                  {updateState.status === 'error' && updateState.fieldErrors?.content && (
                    <p className="text-sm text-red-200">{updateState.fieldErrors.content}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm uppercase tracking-[0.3em] text-neutral-400">
                    이미지 URL (선택)
                  </label>
                  <input
                    name="imageUrl"
                    defaultValue={activePost.image_url ?? ''}
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm uppercase tracking-[0.3em] text-neutral-400">
                    이미지 파일 업로드 (선택)
                  </label>
                  <input
                    name="image"
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm text-white/80 file:mr-3 file:rounded-full file:border file:border-white/20 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                  />
                  {updateState.status === 'error' && updateState.fieldErrors?.image && (
                    <p className="text-sm text-red-200">{updateState.fieldErrors.image}</p>
                  )}
                  <p className="text-sm text-neutral-500">
                    파일을 업로드하면 기존 URL/이미지보다 우선 적용됩니다.
                  </p>
                </div>

                <label className="flex items-center gap-2 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    name="removeImage"
                    checked={removeImage}
                    onChange={(event) => setRemoveImage(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/10"
                  />
                  기존 이미지 제거
                </label>

                {updateState.status === 'error' && updateState.message && (
                  <p className="text-sm text-red-200">{updateState.message}</p>
                )}

                <div className="flex justify-end">
                  <button className="rounded-full bg-white px-6 py-2 text-base font-semibold text-black transition hover:bg-neutral-200">
                    수정 저장
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

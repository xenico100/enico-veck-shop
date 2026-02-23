'use client';

import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toasts/use-toast';
import {
  updateStudioPost,
  type StudioPostUpdateState
} from '@/app/posts/actions';

type StudioPost = {
  id: string;
  title: string | null;
  content: string | null;
  image_url: string | null;
};

type Props = {
  post: StudioPost;
};

const initialState: StudioPostUpdateState = { status: 'idle' };

export default function StudioPostEditForm({ post }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [removeImage, setRemoveImage] = useState(false);
  const [state, formAction] = useFormState(updateStudioPost, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({
        title: '수정 완료',
        description: '게시물이 업데이트되었습니다.'
      });
      router.push(`/posts/${post.id}`);
      router.refresh();
    }

    if (state.status === 'error' && state.message) {
      toast({
        title: '수정 실패',
        description: state.message
      });
    }
  }, [post.id, router, state, toast]);

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
    >
      <input type="hidden" name="postId" value={post.id} />
      <input type="hidden" name="existingImageUrl" value={post.image_url ?? ''} />

      {state.status === 'error' && state.message && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
          제목
        </label>
        <input
          name="title"
          maxLength={80}
          required
          defaultValue={post.title ?? ''}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-white/20"
        />
        {state.status === 'error' && state.fieldErrors?.title && (
          <p className="text-sm text-red-200">{state.fieldErrors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
          내용
        </label>
        <textarea
          name="content"
          required
          maxLength={2000}
          rows={8}
          defaultValue={post.content ?? ''}
          className="min-h-40 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-white/20"
        />
        {state.status === 'error' && state.fieldErrors?.content && (
          <p className="text-sm text-red-200">{state.fieldErrors.content}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
          이미지 URL (선택)
        </label>
        <input
          name="imageUrl"
          defaultValue={post.image_url ?? ''}
          placeholder="https://..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
          이미지 파일 업로드 (선택)
        </label>
        <input
          name="image"
          type="file"
          accept="image/*"
          className="block w-full text-sm text-white/80 file:mr-3 file:rounded-full file:border file:border-white/20 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        {state.status === 'error' && state.fieldErrors?.image && (
          <p className="text-sm text-red-200">{state.fieldErrors.image}</p>
        )}
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

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push(`/posts/${post.id}`)}
          className="rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/20"
        >
          취소
        </button>
        <button className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-200">
          수정 저장
        </button>
      </div>
    </form>
  );
}

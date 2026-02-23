'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toasts/use-toast';
import ActionButton from '@/components/ui/ActionButton';
import { createPost, type CreatePostState } from '@/app/posts/actions';

const initialState: CreatePostState = {
  status: 'idle'
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <ActionButton type="submit" variant="primary" size="md" disabled={pending}>
      {pending ? '작성 중...' : '게시물 작성'}
    </ActionButton>
  );
}

export default function StudioPostForm() {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(createPost, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({
        title: '작성 완료',
        description: '스튜디오 게시물이 등록되었습니다.'
      });
      formRef.current?.reset();
      router.push(state.postId ? `/posts/${state.postId}` : '/posts');
    }

    if (state.status === 'error' && state.message) {
      toast({
        title: '작성 실패',
        description: state.message
      });
    }
  }, [router, state, toast]);

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="mt-6 space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
    >
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
          placeholder="스튜디오 게시물 제목을 입력하세요."
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
          rows={6}
          placeholder="작업 스토리와 소개를 작성해 주세요."
        />
        {state.status === 'error' && state.fieldErrors?.content && (
          <p className="text-sm text-red-200">{state.fieldErrors.content}</p>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
          이미지 업로드
        </label>
        <input
          name="image"
          type="file"
          accept="image/*"
        />
        {state.status === 'error' && state.fieldErrors?.image && (
          <p className="text-sm text-red-200">{state.fieldErrors.image}</p>
        )}
        <p className="text-sm text-neutral-500">
          최대 5MB, JPG/PNG 등 이미지 파일만 업로드 가능합니다.
        </p>
      </div>
      <div className="flex items-center justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

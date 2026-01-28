'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toasts/use-toast';
import {
  createStudioPost,
  type StudioPostFormState
} from '@/app/account/actions';

const initialState: StudioPostFormState = {
  status: 'idle'
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-white/30 bg-white/10 px-6 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:border-white/60 hover:bg-white/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-neutral-800 disabled:text-neutral-400"
    >
      {pending ? '작성 중...' : '게시물 작성'}
    </button>
  );
}

export default function StudioPostForm() {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(createStudioPost, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({
        title: '작성 완료',
        description: '스튜디오 게시물이 등록되었습니다.'
      });
      formRef.current?.reset();
      router.refresh();
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
      className="mt-6 space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
    >
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
          제목
        </label>
        <input
          name="title"
          maxLength={80}
          required
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
          placeholder="스튜디오 게시물 제목을 입력하세요."
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
          내용
        </label>
        <textarea
          name="content"
          required
          maxLength={2000}
          rows={6}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
          placeholder="작업 스토리와 소개를 작성해 주세요."
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
          이미지 업로드
        </label>
        <input
          name="image"
          type="file"
          accept="image/*"
          required
          className="block w-full cursor-pointer rounded-xl border border-dashed border-white/20 bg-black/20 px-4 py-3 text-sm text-neutral-200 file:mr-4 file:rounded-full file:border-0 file:bg-white/80 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-black hover:file:bg-white"
        />
        <p className="text-xs text-neutral-500">
          최대 5MB, JPG/PNG 등 이미지 파일만 업로드 가능합니다.
        </p>
      </div>
      <div className="flex items-center justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

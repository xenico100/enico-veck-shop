'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/components/ui/Toasts/use-toast';
import { updateProfile, type ProfileFormState } from '@/app/mypage/actions';

type MyPageProfileFormProps = {
  phone: string | null;
  address: string | null;
};

const initialState: ProfileFormState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-pink-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:-translate-y-0.5 hover:bg-pink-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
    >
      {pending ? '저장 중...' : '정보 저장'}
    </button>
  );
}

export default function MyPageProfileForm({
  phone,
  address
}: MyPageProfileFormProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(updateProfile, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({
        title: '저장 완료',
        description: state.message ?? '회원정보가 저장되었습니다.'
      });
    }

    if (state.status === 'error' && state.message) {
      toast({
        title: '저장 실패',
        description: state.message
      });
    }
  }, [state, toast]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-6 space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
    >
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
          전화번호
        </label>
        <input
          name="phone"
          defaultValue={phone ?? ''}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-pink-400/60 focus:outline-none focus:ring-2 focus:ring-pink-400/30"
          placeholder="010-0000-0000"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
          주소
        </label>
        <input
          name="address"
          defaultValue={address ?? ''}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-pink-400/60 focus:outline-none focus:ring-2 focus:ring-pink-400/30"
          placeholder="서울 강서구 양천로 551-17 4층"
        />
      </div>
      <div className="flex items-center justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

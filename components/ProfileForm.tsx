'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import {
  updateProfile,
  type ProfileFormState
} from '@/app/mypage/actions';

type ProfileFormProps = {
  initialPhone?: string | null;
  initialAddress?: string | null;
};

const initialState: ProfileFormState = {
  status: 'idle'
};

export default function ProfileForm({
  initialPhone,
  initialAddress
}: ProfileFormProps) {
  const [state, formAction] = useFormState(updateProfile, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      // no-op: keep UX minimal, state refresh handled by server revalidate
    }
  }, [state.status]);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-3xl border border-white/10 bg-black/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
    >
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-neutral-400">
          Phone
        </label>
        <input
          name="phone"
          defaultValue={initialPhone ?? ''}
          placeholder="010-0000-0000"
          className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-neutral-400">
          Address
        </label>
        <textarea
          name="address"
          rows={3}
          defaultValue={initialAddress ?? ''}
          placeholder="주소를 입력해 주세요."
          className="w-full resize-none rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
        />
      </div>
      {state.status === 'error' && state.message && (
        <p className="text-sm text-neutral-300">{state.message}</p>
      )}
      {state.status === 'success' && (
        <p className="text-sm text-neutral-400">저장되었습니다.</p>
      )}
      <div className="flex justify-end">
        <button className="rounded-full border border-white/20 px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/60">
          저장
        </button>
      </div>
    </form>
  );
}

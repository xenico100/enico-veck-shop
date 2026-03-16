'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (!mounted) return;
        setHasSession(Boolean(session));
      } catch {
        if (!mounted) return;
        setHasSession(false);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    void checkSession();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const trimmed = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmed) {
      setError('새 비밀번호를 입력해 주세요.');
      return;
    }

    if (trimmed.length < 6) {
      setError('비밀번호는 6자 이상으로 입력해 주세요.');
      return;
    }

    if (trimmed !== trimmedConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: trimmed });
      if (error) throw error;

      setMessage('비밀번호가 변경되었습니다. 다시 로그인해 주세요.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        router.push('/login');
      }, 900);
    } catch (error) {
      setError(error instanceof Error ? error.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fffefb_0%,#f8f4ed_100%)] px-4 text-stone-900">
      <div className="w-full max-w-md rounded-[1rem] border border-stone-900/10 bg-[rgba(255,253,249,0.94)] p-6 shadow-[0_24px_60px_rgba(58,43,26,0.08)] md:p-8">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-stone-500">Account Recovery</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950 md:text-3xl">
            비밀번호 재설정
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            이메일 링크를 통해 들어오셨다면 새 비밀번호를 설정할 수 있습니다.
          </p>
        </div>

        {checkingSession ? (
          <div className="rounded-2xl border border-stone-900/10 bg-stone-50 p-4 text-sm text-stone-600">
            세션을 확인하는 중…
          </div>
        ) : !hasSession ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
              재설정 세션을 찾을 수 없습니다. 이메일의 링크를 다시 눌러주세요.
            </div>
            <Link
              href="/login"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-stone-900/10 bg-stone-50 px-4 text-sm font-medium tracking-[0.2px] text-stone-800 transition hover:bg-[#f4efe6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
            >
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-[0.2em] text-stone-500">
                새 비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="새 비밀번호 입력"
                autoComplete="new-password"
                className="y2k-input w-full px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:ring-2 focus:ring-stone-900/10"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-[0.2em] text-stone-500">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 다시 입력"
                autoComplete="new-password"
                className="y2k-input w-full px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:ring-2 focus:ring-stone-900/10"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-2xl border border-stone-900/10 bg-stone-50 p-3 text-sm text-stone-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-stone-900/12 bg-[rgba(111,117,95,0.1)] px-5 text-sm font-semibold tracking-[0.1px] text-stone-900 transition hover:bg-[rgba(111,117,95,0.16)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
            >
              {loading ? '변경 중…' : '새 비밀번호 저장'}
            </button>

            <Link
              href="/login"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-stone-900/10 bg-stone-50 px-4 text-sm font-medium tracking-[0.2px] text-stone-800 transition hover:bg-[#f4efe6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
            >
              로그인 페이지로 이동
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

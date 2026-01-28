'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const isSupabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabase = useMemo(
    () => (isSupabaseConfigured ? createClient() : null),
    [isSupabaseConfigured]
  );

  // 🔥 구글 로그인 함수 (이게 핵심)
  const handleGoogleLogin = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`, // 로그인 끝나면 돌아올 주소
      },
    });

    if (error) {
      alert('구글 로그인 에러: ' + error.message);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert('가입 실패: ' + error.message);
      else {
        alert('회원가입 성공! 🎉');
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert('로그인 실패: ' + error.message);
      else {
        router.push('/');
        router.refresh();
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2">
        <div className="hidden flex-col justify-center gap-6 border border-white/10 bg-white/5 p-10 md:flex">
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">
            Zeus Studio
          </p>
          <h1 className="text-4xl font-light tracking-[0.2em]">
            Atelier Access
          </h1>
          <p className="text-sm leading-relaxed text-white/60">
            Minimal member card for a high-end studio experience. Enter with
            your credentials or continue with Google.
          </p>
          <div className="h-48 w-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-black to-black" />
        </div>

        <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-light tracking-[0.4em]">
              {isSignUp ? 'JOIN US' : 'LOGIN'}
            </h1>
            <p className="mt-2 text-xs uppercase tracking-[0.4em] text-white/40">
              Zeus Studio Member
            </p>
            {!supabase && (
              <p className="mt-4 text-xs uppercase tracking-[0.3em] text-white/30">
                Supabase 환경 변수가 설정되지 않았습니다.
              </p>
            )}
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={!supabase}
            className="flex w-full items-center justify-center gap-3 border border-white/20 bg-white text-xs font-semibold uppercase tracking-[0.3em] text-black transition hover:border-white disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-black/40"
          >
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-white/30">
            <span className="h-px flex-1 bg-white/10" />
            OR
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!supabase}
                className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-sm text-white placeholder:text-white/30 focus:border-white focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!supabase}
                className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-sm text-white placeholder:text-white/30 focus:border-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !supabase}
              className="border border-white/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-white transition hover:border-white hover:text-white/80 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/40"
            >
              {loading ? '처리 중...' : (isSignUp ? '이메일로 회원가입' : '이메일로 로그인')}
            </button>
          </form>

          <p className="mt-6 text-center text-xs uppercase tracking-[0.3em] text-white/40">
            {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 text-white underline decoration-white/40 underline-offset-4"
            >
              {isSignUp ? '로그인하기' : '회원가입하기'}
            </button>
          </p>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-6 text-xs uppercase tracking-[0.3em] text-white/30 transition hover:text-white/60"
          >
            ← 메인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

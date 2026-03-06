'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  // 🔥 구글 로그인 함수 (이게 핵심)
  const handleGoogleLogin = async () => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    console.log('[OAuth Debug] NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log(
      '[OAuth Debug] NEXT_PUBLIC_SUPABASE_ANON_KEY exists?',
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );
    console.log('[OAuth Debug] window.location.origin', window.location.origin);
    console.log('[OAuth Debug] redirectTo', redirectTo);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo, // 로그인 끝나면 돌아올 주소
          skipBrowserRedirect: true,
        },
      });

      console.log('[OAuth Debug] signInWithOAuth data', data);
      console.log('[OAuth Debug] signInWithOAuth error', error);

      if (error) {
        alert('구글 로그인 에러: ' + error.message);
        return;
      }

      if (data?.url) {
        console.log('[OAuth Debug] authorize URL', data.url);
        window.location.assign(data.url);
        return;
      }

      console.warn('[OAuth Debug] No authorize URL returned from Supabase OAuth response');
    } catch (error) {
      console.log('[OAuth Debug] signInWithOAuth catch error', error);
      const message = error instanceof Error ? error.message : String(error);
      alert('구글 로그인 에러: ' + message);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetMessage(null);
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

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim();
    setResetError(null);
    setResetMessage(null);

    if (!isValidEmail(normalizedEmail)) {
      setResetError('올바른 이메일 주소를 입력해 주세요.');
      return;
    }

    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const origin = configuredSiteUrl
      ? configuredSiteUrl.replace(/\/+$/, '')
      : window.location.origin;
    const redirectTo = `${origin}/auth/reset_password`;

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo
      });

      if (error) {
        throw error;
      }

      setResetMessage('비밀번호 재설정 이메일을 보냈습니다. 메일함을 확인해 주세요.');
    } catch (error) {
      setResetError(
        error instanceof Error ? error.message : '재설정 이메일 전송에 실패했습니다.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-3xl border border-white/10 bg-neutral-950/80 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.6)] sm:gap-6 sm:p-8">
        <div className="text-center">
             <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
               ZEUS STUDIO MEMBER
             </p>
             <h1 className="mt-3 text-2xl font-semibold tracking-[0.18em] sm:text-3xl">
               {isSignUp ? 'JOIN US' : 'LOGIN'}
             </h1>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="flex min-h-12 items-center justify-center gap-3 rounded-full border border-white/20 bg-white px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-neutral-200 sm:text-base"
        >
          {/* 구글 G 로고 SVG */}
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
          Google로 계속하기
        </button>

        <div className="flex items-center gap-3 text-sm uppercase tracking-[0.3em] text-neutral-500">
            <div className="h-px flex-1 bg-white/10"></div>
            <span>OR</span>
            <div className="h-px flex-1 bg-white/10"></div>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input 
            type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-base text-white placeholder:text-neutral-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
          />
          <input 
            type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required
            className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-base text-white placeholder:text-neutral-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
          />
          
          {!isSignUp && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || resetLoading}
                className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-white/10 px-4 text-sm font-medium tracking-[0.2px] text-white/90 backdrop-blur-md transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                {resetLoading ? '전송 중…' : '비밀번호 찾기'}
              </button>
            </div>
          )}

          <button 
            type="submit" disabled={loading || resetLoading}
            className="rounded-full border border-white/30 bg-white/10 px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:border-white/60 hover:bg-white/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-neutral-800 disabled:text-neutral-500"
          >
            {loading ? '처리 중...' : (isSignUp ? '이메일로 회원가입' : '이메일로 로그인')}
          </button>
        </form>

        {!isSignUp && (resetError || resetMessage) && (
          <div
            className={`rounded-2xl border p-3 text-sm ${
              resetError
                ? 'border-red-300/20 bg-red-300/10 text-red-100'
                : 'border-white/10 bg-white/5 text-white/85'
            }`}
          >
            {resetError ?? resetMessage}
          </div>
        )}

        <p className="text-center text-sm leading-relaxed text-neutral-400">
          {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'} 
          <span onClick={() => setIsSignUp(!isSignUp)} className="ml-2 cursor-pointer font-semibold text-white underline">
            {isSignUp ? '로그인하기' : '회원가입하기'}
          </span>
        </p>

        <button type="button" onClick={() => router.push('/')} className="text-sm uppercase tracking-[0.2em] text-neutral-500 transition hover:text-white">
            ← 메인으로 돌아가기
        </button>
      </div>
    </div>
  );
}

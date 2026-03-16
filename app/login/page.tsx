'use client';

import { createClient } from '@/utils/supabase/client';
import { BRAND_MEMBER_LABEL } from '@/utils/branding';
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
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fffefb_0%,#f8f4ed_100%)] px-4 text-stone-900">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-[1rem] border border-stone-900/10 bg-[rgba(255,253,249,0.94)] p-5 shadow-[0_24px_60px_rgba(58,43,26,0.08)] sm:gap-6 sm:p-8">
        <div className="text-center">
             <p className="text-sm uppercase tracking-[0.35em] text-stone-500">
               {BRAND_MEMBER_LABEL}
             </p>
             <h1 className="mt-3 text-2xl font-semibold tracking-[0.12em] text-stone-950 sm:text-3xl">
               {isSignUp ? 'JOIN US' : 'LOGIN'}
             </h1>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="flex min-h-12 items-center justify-center gap-3 rounded-xl border border-stone-900/10 bg-stone-50 px-4 py-3 text-center text-sm font-semibold text-stone-900 transition hover:bg-[#f4efe6] sm:text-base"
        >
          {/* 구글 G 로고 SVG */}
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
          Google로 계속하기
        </button>

        <div className="flex items-center gap-3 text-sm uppercase tracking-[0.3em] text-stone-400">
            <div className="h-px flex-1 bg-stone-900/10"></div>
            <span>OR</span>
            <div className="h-px flex-1 bg-stone-900/10"></div>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input 
            type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required
            className="y2k-input px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none"
          />
          <input 
            type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required
            className="y2k-input px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none"
          />
          
          {!isSignUp && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || resetLoading}
                className="inline-flex min-h-11 items-center rounded-xl border border-stone-900/10 bg-stone-50 px-4 text-sm font-medium tracking-[0.2px] text-stone-800 transition hover:bg-[#f4efe6] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
              >
                {resetLoading ? '전송 중…' : '비밀번호 찾기'}
              </button>
            </div>
          )}

          <button 
            type="submit" disabled={loading || resetLoading}
            className="rounded-xl border border-stone-900/12 bg-[rgba(111,117,95,0.1)] px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.18em] text-stone-900 transition hover:bg-[rgba(111,117,95,0.16)] disabled:cursor-not-allowed disabled:border-stone-900/8 disabled:bg-stone-100 disabled:text-stone-400"
          >
            {loading ? '처리 중...' : (isSignUp ? '이메일로 회원가입' : '이메일로 로그인')}
          </button>
        </form>

        {!isSignUp && (resetError || resetMessage) && (
          <div
            className={`rounded-2xl border p-3 text-sm ${
              resetError
                ? 'border-red-300/20 bg-red-300/10 text-red-100'
                : 'border-stone-900/10 bg-stone-50 text-stone-700'
            }`}
          >
            {resetError ?? resetMessage}
          </div>
        )}

        <p className="text-center text-sm leading-relaxed text-stone-500">
          {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'} 
          <span onClick={() => setIsSignUp(!isSignUp)} className="ml-2 cursor-pointer font-semibold text-stone-900 underline">
            {isSignUp ? '로그인하기' : '회원가입하기'}
          </span>
        </p>

        <button type="button" onClick={() => router.push('/')} className="text-sm uppercase tracking-[0.2em] text-stone-500 transition hover:text-stone-900">
            ← 메인으로 돌아가기
        </button>
      </div>
    </div>
  );
}

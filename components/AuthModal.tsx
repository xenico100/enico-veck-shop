'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Mode = 'login' | 'signup';

type Props = {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onSwitchMode: (mode: Mode) => void;
  onGoogle?: () => void;
  onLogin?: (email: string, password: string) => Promise<void> | void;
  onSignup?: (name: string, email: string, password: string) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
};

export default function AuthModal({
  open,
  mode,
  onClose,
  onSwitchMode,
  onGoogle,
  onLogin,
  onSignup,
  loading = false,
  error = null,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const appleFontClass =
    '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';
  const closeButtonClass =
    'flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.08] text-[#f5f5f7] backdrop-blur-md transition-colors duration-200 ease-in-out hover:bg-white/[0.18]';
  const tabGroupClass =
    'inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md';
  const tabButtonBase = `rounded-full px-4 py-2 text-sm font-medium tracking-[0.2px] no-underline transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${appleFontClass}`;
  const primaryButtonClass = `w-full rounded-full bg-white py-3 text-sm font-medium text-black transition-colors duration-200 ease-in-out hover:bg-neutral-200 disabled:opacity-50 ${appleFontClass}`;
  const secondaryButtonClass = `w-full rounded-full border border-white/20 bg-white/10 py-3 text-sm font-medium text-white backdrop-blur-md transition-colors duration-200 ease-in-out hover:bg-white/20 disabled:opacity-50 ${appleFontClass}`;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    // 모달 열릴 때 초기화(원하면 제거)
    setPassword('');
    setResetError(null);
    setResetMessage(null);
  }, [open, mode]);

  if (!open) return null;

  const submit = async () => {
    setResetError(null);
    setResetMessage(null);
    if (mode === 'login') {
      await onLogin?.(email.trim(), password);
    } else {
      await onSignup?.(name.trim(), email.trim(), password);
    }
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
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className={`w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0a0a]/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${appleFontClass}`}>
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div className={tabGroupClass}>
              <button
                type="button"
                onClick={() => onSwitchMode('login')}
                className={`${tabButtonBase} ${
                  mode === 'login'
                    ? 'bg-white text-black hover:bg-neutral-200'
                    : 'border border-transparent bg-transparent text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => onSwitchMode('signup')}
                className={`${tabButtonBase} ${
                  mode === 'signup'
                    ? 'bg-white text-black hover:bg-neutral-200'
                    : 'border border-transparent bg-transparent text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                회원가입
              </button>
            </div>

            <button type="button" onClick={onClose} className={closeButtonClass} aria-label="닫기">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs text-gray-500 mb-2">이름</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                  placeholder="홍길동"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-2">이메일</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">비밀번호</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                placeholder="••••••••"
              />
            </div>

            {error && <div className="text-sm text-red-400">{error}</div>}
            {mode === 'login' && resetError && (
              <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">
                {resetError}
              </div>
            )}
            {mode === 'login' && resetMessage && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/85">
                {resetMessage}
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading || resetLoading}
                  className={`inline-flex min-h-11 items-center rounded-full border border-white/15 bg-white/5 px-4 text-sm font-medium tracking-[0.2px] text-white/85 backdrop-blur-md transition-colors duration-200 ease-in-out hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${appleFontClass}`}
                >
                  {resetLoading ? '전송 중…' : '비밀번호 찾기'}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={loading || resetLoading}
              className={primaryButtonClass}
            >
              {loading ? '처리중…' : mode === 'login' ? '로그인' : '회원가입'}
            </button>

            <button
              type="button"
              onClick={onGoogle}
              disabled={loading || resetLoading}
              className={secondaryButtonClass}
            >
              Google로 계속
            </button>

            <p className="text-xs text-gray-500 leading-relaxed">
              계속 진행하면 서비스 약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

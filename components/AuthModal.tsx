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
    '[font-family:var(--font-sans),"IBM Plex Sans KR","Pretendard",sans-serif]';
  const closeButtonClass =
    `y2k-button y2k-button-ghost y2k-button-icon ${appleFontClass}`;
  const tabGroupClass =
    `y2k-tab-group inline-flex items-center gap-1 p-1 ${appleFontClass}`;
  const tabButtonBase = `relative px-0 py-2 pr-5 text-sm font-medium tracking-[0.08em] no-underline transition-colors duration-200 ease-in-out after:absolute after:bottom-0 after:left-0 after:h-px after:w-[calc(100%-1.25rem)] after:origin-left after:scale-x-0 after:bg-current after:opacity-70 after:transition-transform after:duration-200 focus-visible:outline-none focus-visible:ring-0 ${appleFontClass}`;
  const primaryButtonClass = `y2k-button y2k-button-primary w-full justify-center !min-h-12 !rounded-[1rem] !text-[0.8rem] disabled:opacity-50 ${appleFontClass}`;
  const secondaryButtonClass = `y2k-button y2k-button-accent w-full justify-center !min-h-12 !rounded-[1rem] !text-[0.8rem] disabled:opacity-50 ${appleFontClass}`;

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
      <div className="fixed inset-0 z-[60] bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div
          className={`w-full max-w-md bg-[#060913]/92 shadow-[0_24px_80px_rgba(0,0,0,0.42)] ${appleFontClass}`}
        >
          <div className="flex items-center justify-between border-b border-cyan-300/12 px-6 py-5">
            <div className={tabGroupClass}>
              <button
                type="button"
                onClick={() => onSwitchMode('login')}
                className={`${tabButtonBase} ${
                  mode === 'login'
                    ? 'text-white after:scale-x-100'
                    : 'text-cyan-100/62 hover:text-white'
                }`}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => onSwitchMode('signup')}
                className={`${tabButtonBase} ${
                  mode === 'signup'
                    ? 'text-white after:scale-x-100'
                    : 'text-cyan-100/62 hover:text-white'
                }`}
              >
                회원가입
              </button>
            </div>

            <button type="button" onClick={onClose} className={closeButtonClass} aria-label="닫기">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 px-6 py-6">
            {mode === 'signup' && (
              <div>
                <label className="mb-2 block text-xs text-cyan-100/55">이름</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="y2k-input w-full px-4 py-3 text-sm text-cyan-100 outline-none"
                  placeholder="홍길동"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs text-cyan-100/55">이메일</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="y2k-input w-full px-4 py-3 text-sm text-cyan-100 outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-cyan-100/55">비밀번호</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="y2k-input w-full px-4 py-3 text-sm text-cyan-100 outline-none"
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
              <div className="rounded-2xl border border-cyan-300/18 bg-cyan-300/8 p-3 text-sm text-cyan-100/85">
                {resetMessage}
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading || resetLoading}
                  className={`y2k-button y2k-button-ghost !min-h-11 !text-[0.74rem] disabled:cursor-not-allowed disabled:opacity-50 ${appleFontClass}`}
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

            <p className="text-xs leading-relaxed text-cyan-100/55">
              계속 진행하면 서비스 약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

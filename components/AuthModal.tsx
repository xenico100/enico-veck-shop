'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

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
  }, [open, mode]);

  if (!open) return null;

  const submit = async () => {
    if (mode === 'login') {
      await onLogin?.(email.trim(), password);
    } else {
      await onSignup?.(name.trim(), email.trim(), password);
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

            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className={primaryButtonClass}
            >
              {loading ? '처리중…' : mode === 'login' ? '로그인' : '회원가입'}
            </button>

            <button
              type="button"
              onClick={onGoogle}
              disabled={loading}
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

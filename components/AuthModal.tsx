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
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onSwitchMode('login')}
                className={`text-sm tracking-wide ${
                  mode === 'login' ? 'text-white' : 'text-gray-500 hover:text-white'
                }`}
              >
                로그인
              </button>
              <span className="text-gray-700">/</span>
              <button
                type="button"
                onClick={() => onSwitchMode('signup')}
                className={`text-sm tracking-wide ${
                  mode === 'signup' ? 'text-white' : 'text-gray-500 hover:text-white'
                }`}
              >
                회원가입
              </button>
            </div>

            <button type="button" onClick={onClose} className="text-white/80 hover:text-white" aria-label="닫기">
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
              className="w-full rounded-xl bg-white text-black py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? '처리중…' : mode === 'login' ? '로그인' : '회원가입'}
            </button>

            <button
              type="button"
              onClick={onGoogle}
              disabled={loading}
              className="w-full rounded-xl bg-white/5 border border-white/10 text-white py-3 text-sm hover:bg-white/10 disabled:opacity-50"
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

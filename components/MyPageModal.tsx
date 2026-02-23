'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Lock, Package, Trash2, X } from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';

type TabKey = 'profile' | 'orders' | 'membership' | 'admin' | 'posts';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const tabs: Array<{ key: TabKey; label: string; adminOnly?: boolean }> = [
  { key: 'profile', label: '회원 정보' },
  { key: 'orders', label: '주문 목록' },
  { key: 'membership', label: '멤버십' },
  { key: 'admin', label: '관리자 패널', adminOnly: true },
  { key: 'posts', label: '게시글 관리', adminOnly: true },
];

export default function MyPageModal({ open, onOpenChange }: Props) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const isAdmin = useMemo(() => {
    const role = (user as { role?: string } | null)?.role;
    return role === 'admin';
  }, [user]);

  const name = user?.name ?? '관리자';
  const email = user?.email ?? 'admin@example.com';
  const initial = name.trim().charAt(0) || '관';
  const appleFontClass =
    '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';
  const glassIconButtonClass =
    'flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.08] text-white/90 backdrop-blur-md transition-colors duration-200 ease-in-out hover:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30';
  const segmentedWrapClass = `inline-flex min-w-max items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md ${appleFontClass}`;
  const segmentedTabBaseClass =
    'rounded-full px-4 py-2 text-sm font-medium tracking-[0.2px] transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 whitespace-nowrap';
  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/25';
  const labelClass =
    `text-xs uppercase tracking-[0.16em] text-white/50 ${appleFontClass}`;
  const pillPrimaryClass =
    `inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium tracking-[0.2px] text-black transition-colors duration-200 ease-in-out hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 md:w-auto md:min-w-[200px] ${appleFontClass}`;
  const pillGlassClass =
    `inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium tracking-[0.2px] text-white/85 backdrop-blur-md transition-colors duration-200 ease-in-out hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${appleFontClass}`;
  const pillDangerClass =
    `inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-medium tracking-[0.2px] text-rose-100 transition-colors duration-200 ease-in-out hover:bg-rose-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${appleFontClass}`;

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const elements = Array.from(focusable).filter((el) => !el.hasAttribute('disabled'));
    if (elements.length === 0) return;
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      onOpenChange(false);
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('정말로 탈퇴하시겠어요?')) {
      window.alert('회원 탈퇴 기능은 준비 중입니다.');
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/70" onClick={() => onOpenChange(false)} />

      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mypage-title"
          className={`w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-xl ${appleFontClass}`}
          onKeyDown={handleKeyDown}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-white/10 px-6 pb-5 pt-6 md:px-8">
            <div className="min-w-0 flex-1">
              <h2 id="mypage-title" className="text-xl font-semibold tracking-tight text-white">
                마이페이지
              </h2>
              <div className="mt-4 overflow-x-auto pb-1">
                <div className={segmentedWrapClass}>
                  {tabs.map((tab) => {
                    const disabled = tab.adminOnly && !isAdmin;
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => !disabled && setActiveTab(tab.key)}
                        className={`${segmentedTabBaseClass} ${
                          isActive
                            ? 'bg-white text-black'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        } ${
                          disabled
                            ? 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-white/70'
                            : ''
                        }`}
                        disabled={disabled}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => onOpenChange(false)}
              className={`ml-4 shrink-0 ${glassIconButtonClass}`}
              aria-label="마이페이지 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-6 pb-8 pt-6 md:px-8">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm md:p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg font-semibold text-white">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-white">{name}</p>
                      <p className="truncate text-sm text-white/60">{email}</p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label className={labelClass}>이름</label>
                      <input className={inputClass} value={name} readOnly />
                    </div>
                    <div className="grid gap-2">
                      <label className={labelClass}>이메일 (아이디)</label>
                      <input className={inputClass} value={email} readOnly />
                      <p className="text-xs text-white/40">이메일은 변경할 수 없습니다</p>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 md:gap-4">
                      <div className="grid gap-2">
                        <label className={labelClass}>전화번호</label>
                        <input className={inputClass} value="010-0000-0000" readOnly />
                      </div>
                      <div className="grid gap-2">
                        <label className={labelClass}>결제수단</label>
                        <input className={inputClass} value="등록된 결제수단 없음" readOnly />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label className={labelClass}>주소</label>
                      <input className={inputClass} value="서울시 어딘가" readOnly />
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <button type="button" className={pillPrimaryClass}>
                      회원정보 수정
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold tracking-tight text-white">보안</h3>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
                    <button
                      type="button"
                      className={pillGlassClass}
                    >
                      <Lock className="h-4 w-4" />
                      비밀번호 변경
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold tracking-tight text-white">계정 관리</h3>
                  <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={pillGlassClass}
                    >
                      로그아웃
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className={pillDangerClass}
                    >
                      <Trash2 className="h-4 w-4" />
                      회원 탈퇴
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold tracking-tight text-white">주문 내역</h3>
                <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                    <Package className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-white">주문 내역이 없습니다</p>
                  <p className="text-xs text-white/50">첫 주문을 시작해보세요</p>
                </div>
              </div>
            )}

            {activeTab !== 'profile' && activeTab !== 'orders' && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">준비 중입니다</p>
                <p className="text-xs text-white/50">곧 새로운 기능으로 찾아올게요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

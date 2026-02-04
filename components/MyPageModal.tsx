'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Lock, Package, Trash2, X } from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { checkIsAdmin } from '@/utils/supabase/admins';

type TabKey = 'profile' | 'orders' | 'membership' | 'admin' | 'posts';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const TABS: Array<{ key: TabKey; label: string; adminOnly?: boolean }> = [
  { key: 'profile', label: '회원 정보' },
  { key: 'orders', label: '주문 목록' },
  { key: 'membership', label: '멤버십' },
  { key: 'admin', label: '관리자 패널', adminOnly: true },
  { key: 'posts', label: '게시글 관리', adminOnly: true },
];

export default function MyPageModal({ open, onOpenChange }: Props) {
  const { user, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const adminLoading = isAdmin === null;

  const name = user?.name ?? '관리자';
  const email = user?.email ?? 'admin@example.com';
  const initial = name.trim().charAt(0) || '관';

  const isAdminTab = activeTab === 'admin' || activeTab === 'posts';

  const visibleTabs = useMemo(() => {
    // 로딩 중(null)엔 admin 탭 숨김 (스켈레톤으로 대체)
    if (isAdmin !== true) return TABS.filter((t) => !t.adminOnly);
    return TABS;
  }, [isAdmin]);

  // 모달 열릴 때 body scroll lock
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // 관리자 체크 (user.id 바뀔 때마다)
  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!user?.id) {
        if (!alive) return;
        setIsAdmin(false);
        // 혹시 admin 탭에 머물러 있으면 기본 탭으로 돌려줌
        if (isAdminTab) setActiveTab('profile');
        return;
      }

      setIsAdmin(null); // loading
      try {
        const ok = await checkIsAdmin(supabase, user.id);
        if (!alive) return;
        setIsAdmin(ok);

        // 관리자 아닌데 admin 탭이면 튕김
        if (!ok && (activeTab === 'admin' || activeTab === 'posts')) {
          setActiveTab('profile');
        }
      } catch (e) {
        if (!alive) return;
        setIsAdmin(false);
        if (isAdminTab) setActiveTab('profile');
      }
    };

    // open일 때만 체크(불필요 호출 방지)
    if (open) run();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  // 포커스 트랩
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
          className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d0f14] shadow-2xl"
          onKeyDown={handleKeyDown}
          onClick={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 px-6 pb-4 pt-6">
            <div>
              <h2 id="mypage-title" className="text-xl font-semibold text-white">
                마이페이지
              </h2>

              {/* Tabs */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {visibleTabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`relative pb-2 ${
                        isActive ? 'text-white' : 'text-gray-500 hover:text-gray-200'
                      }`}
                    >
                      {tab.label}
                      {isActive && (
                        <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full bg-white" />
                      )}
                    </button>
                  );
                })}

                {/* 로딩 중엔 admin 탭 자리 스켈레톤 */}
                {adminLoading && (
                  <>
                    <div className="h-[22px] w-20 animate-pulse rounded-full bg-white/10" />
                    <div className="h-[22px] w-20 animate-pulse rounded-full bg-white/10" />
                  </>
                )}
              </div>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/80 hover:text-white"
              aria-label="마이페이지 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-8 pt-6">
            {/* Admin content guard */}
            {isAdminTab && adminLoading && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#131720] p-8 text-center">
                <p className="text-sm font-semibold text-white">권한 확인 중...</p>
                <p className="text-xs text-gray-500">관리자 권한을 확인하고 있습니다.</p>
              </div>
            )}

            {isAdminTab && !adminLoading && !isAdmin && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#131720] p-8 text-center">
                <p className="text-sm font-semibold text-white">권한이 없습니다</p>
                <p className="text-xs text-gray-500">관리자 전용 메뉴입니다.</p>
              </div>
            )}

            {/* Profile */}
            {!isAdminTab && activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-[#131720] p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1b2230] text-lg font-semibold text-white">
                      {initial}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">{name}</p>
                      <p className="text-sm text-gray-400">{email}</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-[#0f1218] p-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">이름</span>
                      <span className="text-sm text-white">{name}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">이메일(아이디)</span>
                      <span className="text-sm text-white">{email}</span>
                      <span className="text-xs text-gray-600">이메일은 변경할 수 없습니다</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">전화번호</span>
                      <span className="text-sm text-white">010-0000-0000</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">주소</span>
                      <span className="text-sm text-white">서울시 어딘가</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">결제수단</span>
                      <span className="text-sm text-white">등록된 결제수단 없음</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-6 w-full rounded-xl bg-[#1c2433] py-3 text-sm font-medium text-white hover:bg-[#222b3d]"
                  >
                    회원정보 수정
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">보안</h3>
                  <div className="rounded-2xl border border-white/10 bg-[#131720] p-5">
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#151922] py-3 text-sm text-white hover:bg-[#1b212c]"
                    >
                      <Lock className="h-4 w-4" />
                      비밀번호 변경
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">계정 관리</h3>
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-[#131720] p-5">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-xl bg-[#151922] py-3 text-sm text-white hover:bg-[#1b212c]"
                    >
                      로그아웃
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3a1414] py-3 text-sm text-red-100 hover:bg-[#451818]"
                    >
                      <Trash2 className="h-4 w-4" />
                      회원 탈퇴
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Orders */}
            {!isAdminTab && activeTab === 'orders' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">주문 내역</h3>
                <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#131720] p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1c2433] text-white">
                    <Package className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-white">주문 내역이 없습니다</p>
                  <p className="text-xs text-gray-500">첫 주문을 시작해보세요</p>
                </div>
              </div>
            )}

            {/* Membership / default placeholder */}
            {!isAdminTab && activeTab === 'membership' && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#131720] p-8 text-center">
                <p className="text-sm font-semibold text-white">준비 중입니다</p>
                <p className="text-xs text-gray-500">곧 새로운 기능으로 찾아올게요.</p>
              </div>
            )}

            {/* Admin placeholder (only if admin) */}
            {isAdminTab && !adminLoading && isAdmin && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#131720] p-8 text-center">
                <p className="text-sm font-semibold text-white">준비 중입니다</p>
                <p className="text-xs text-gray-500">곧 새로운 기능으로 찾아올게요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

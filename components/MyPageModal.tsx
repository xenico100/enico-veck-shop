'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { FileText, Lock, Package, Trash2, X } from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import MyPageAdminPanel from '@/components/MyPageAdminPanel';
import OrderDetailModal from '@/components/OrderDetailModal';
import ActionButton from '@/components/ui/ActionButton';
import PillTab from '@/components/ui/PillTab';
import { useToast } from '@/components/ui/Toasts/use-toast';
import {
  formatOrderDate,
  formatOrderMoney,
  getOrderStatusBadgeClass,
  mapOrderStatusLabel,
  normalizeOrders,
  type OrderRecord
} from '@/utils/orders';
import { isAdminUserLike } from '@/utils/service-posts';

type TabKey = 'profile' | 'orders' | 'community' | 'membership' | 'admin';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const tabs: Array<{ key: TabKey; label: string; adminOnly?: boolean }> = [
  { key: 'profile', label: '회원 정보' },
  { key: 'orders', label: '주문 목록' },
  { key: 'community', label: '내 게시글' },
  { key: 'membership', label: '멤버십' },
  { key: 'admin', label: '관리자 패널', adminOnly: true },
];

type UserProfileFormState = {
  name: string;
  phone: string;
  address: string;
};

type MembershipSummary = {
  user_id: string;
  has_active_subscription: boolean;
  subscription_id: string | null;
  subscription_status: string | null;
  selected_membership: string | null;
  subscribed_at: string | null;
  next_billing_at: string | null;
  plan_id: string | null;
  plan_amount: number | null;
  plan_currency: string | null;
  plan_interval: string | null;
};

type CommunityPostItem = {
  id: string;
  title: string;
  content: string;
  is_notice: boolean;
  created_at: string;
  updated_at: string;
  comment_count: number;
};

const toCommunityExcerpt = (content: string) => {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= 150) return normalized;
  return `${normalized.slice(0, 150)}...`;
};

export default function MyPageModal({ open, onOpenChange }: Props) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [profileForm, setProfileForm] = useState<UserProfileFormState>({
    name: '',
    phone: '',
    address: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [communityPosts, setCommunityPosts] = useState<CommunityPostItem[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [membershipSummary, setMembershipSummary] = useState<MembershipSummary | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const isAdmin = useMemo(() => {
    return isAdminUserLike(user);
  }, [user]);
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => !tab.adminOnly || isAdmin),
    [isAdmin]
  );

  const name = profileForm.name || user?.name || '관리자';
  const email = user?.email ?? 'admin@example.com';
  const initial = name.trim().charAt(0) || '관';
  const appleFontClass =
    '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';
  const glassIconButtonClass =
    'flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.08] text-white/90 backdrop-blur-md transition-colors duration-200 ease-in-out hover:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30';
  const segmentedWrapClass = `flex min-w-max flex-wrap items-center gap-3 ${appleFontClass}`;
  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/25';
  const labelClass =
    `text-xs uppercase tracking-[0.16em] text-white/50 ${appleFontClass}`;

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('profile');
    }
  }, [activeTab, isAdmin]);

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

  const fetchOrders = useMemo(
    () => async () => {
      if (!user?.id) {
        setOrders([]);
        return;
      }

      setOrdersLoading(true);
      setOrdersError(null);
      try {
        const response = await fetch('/api/account/orders', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || '주문 내역을 불러오지 못했습니다.');
        }
        setOrders(normalizeOrders(payload?.data));
      } catch (error) {
        setOrdersError(error instanceof Error ? error.message : '주문 내역을 불러오지 못했습니다.');
      } finally {
        setOrdersLoading(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (!open || activeTab !== 'orders') return;
    void fetchOrders();
  }, [open, activeTab, fetchOrders]);

  const fetchCommunityPosts = useMemo(
    () => async () => {
      if (!user?.id) {
        setCommunityPosts([]);
        return;
      }

      setCommunityLoading(true);
      setCommunityError(null);
      try {
        const response = await fetch('/api/account/community-posts', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || '내 게시글을 불러오지 못했습니다.');
        }

        const rows = Array.isArray(payload?.data) ? payload.data : [];
        setCommunityPosts(rows as CommunityPostItem[]);
      } catch (error) {
        setCommunityError(error instanceof Error ? error.message : '내 게시글을 불러오지 못했습니다.');
      } finally {
        setCommunityLoading(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (!open || activeTab !== 'community') return;
    void fetchCommunityPosts();
  }, [open, activeTab, fetchCommunityPosts]);

  const fetchMembership = useMemo(
    () => async () => {
      if (!user?.id) {
        setMembershipSummary(null);
        return;
      }

      setMembershipLoading(true);
      setMembershipError(null);
      try {
        const response = await fetch('/api/account/membership', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || '멤버십 정보를 불러오지 못했습니다.');
        }
        setMembershipSummary((payload?.data ?? null) as MembershipSummary | null);
      } catch (error) {
        setMembershipError(
          error instanceof Error ? error.message : '멤버십 정보를 불러오지 못했습니다.'
        );
      } finally {
        setMembershipLoading(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (!open || activeTab !== 'membership') return;
    void fetchMembership();
  }, [open, activeTab, fetchMembership]);

  const fetchProfile = useMemo(
    () => async () => {
      if (!user?.id) {
        setProfileForm({ name: '', phone: '', address: '' });
        return;
      }

      setProfileLoading(true);
      setProfileError(null);
      setProfileMessage(null);

      try {
        const response = await fetch('/api/account/profile', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || '프로필 정보를 불러오지 못했습니다.');
        }

        const row = (payload?.data ?? null) as
          | { name?: string | null; phone?: string | null; address?: string | null }
          | null;

        setProfileForm({
          name: row?.name ?? user.name ?? '',
          phone: row?.phone ?? '',
          address: row?.address ?? ''
        });
      } catch (error) {
        setProfileError(
          error instanceof Error ? error.message : '프로필 정보를 불러오지 못했습니다.'
        );
        setProfileForm({
          name: user.name ?? '',
          phone: '',
          address: ''
        });
      } finally {
        setProfileLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!open || activeTab !== 'profile') return;
    fetchProfile();
  }, [open, activeTab, fetchProfile]);

  const handleProfileFieldChange = (key: keyof UserProfileFormState, value: string) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateProfileForm = () => {
    const phone = profileForm.phone.trim();
    const address = profileForm.address.trim();
    const nameValue = profileForm.name.trim();

    if (!nameValue) return '이름을 입력해 주세요.';
    if (nameValue.length > 80) return '이름은 80자 이하로 입력해 주세요.';
    if (phone && !/^[0-9+()\-\s]{9,20}$/.test(phone)) {
      return '전화번호는 숫자/하이픈 형식으로 9자 이상 입력해 주세요.';
    }
    if (address && address.length < 5) return '주소는 5자 이상 입력해 주세요.';
    if (address.length > 200) return '주소는 200자 이하로 입력해 주세요.';
    return null;
  };

  const handleSaveProfile = async () => {
    if (!user?.id) {
      setProfileError('로그인이 필요합니다.');
      toast({
        title: '저장 실패',
        description: '로그인이 필요합니다.',
        variant: 'destructive'
      });
      return;
    }

    const validationError = validateProfileForm();
    if (validationError) {
      setProfileError(validationError);
      setProfileMessage(null);
      return;
    }

    setProfileSaving(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
          address: profileForm.address
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '회원정보 저장에 실패했습니다.');
      }

      const next = payload?.data as Partial<UserProfileFormState> | undefined;
      if (next) {
        setProfileForm((prev) => ({
          name: typeof next.name === 'string' ? next.name : prev.name,
          phone: typeof next.phone === 'string' ? next.phone : prev.phone,
          address: typeof next.address === 'string' ? next.address : prev.address
        }));
      }

      setProfileMessage(payload?.message || '회원정보가 저장되었습니다.');
      toast({
        title: '저장 완료',
        description: '회원정보가 저장되었습니다.'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '회원정보 저장에 실패했습니다.';
      setProfileError(message);
      toast({
        title: '저장 실패',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setProfileSaving(false);
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
                  {visibleTabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                      <PillTab
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        active={isActive}
                        className="whitespace-nowrap"
                      >
                        {tab.label}
                      </PillTab>
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
                      <input
                        className={inputClass}
                        value={profileForm.name}
                        onChange={(e) => handleProfileFieldChange('name', e.target.value)}
                        placeholder="이름을 입력하세요"
                        disabled={profileLoading || profileSaving}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className={labelClass}>이메일 (아이디)</label>
                      <input className={inputClass} value={email} readOnly />
                      <p className="text-xs text-white/40">이메일은 변경할 수 없습니다</p>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 md:gap-4">
                      <div className="grid gap-2">
                        <label className={labelClass}>전화번호</label>
                        <input
                          className={inputClass}
                          value={profileForm.phone}
                          onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                          placeholder="010-0000-0000"
                          disabled={profileLoading || profileSaving}
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className={labelClass}>결제수단</label>
                        <input className={inputClass} value="등록된 결제수단 없음" readOnly />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label className={labelClass}>주소</label>
                      <input
                        className={inputClass}
                        value={profileForm.address}
                        onChange={(e) => handleProfileFieldChange('address', e.target.value)}
                        placeholder="주소를 입력하세요"
                        disabled={profileLoading || profileSaving}
                      />
                    </div>
                  </div>

                  {(profileLoading || profileError || profileMessage) && (
                    <div className="space-y-2">
                      {profileLoading && (
                        <p className="text-xs text-white/50">프로필 정보를 불러오는 중…</p>
                      )}
                      {profileError && (
                        <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-xs text-red-100">
                          {profileError}
                        </div>
                      )}
                      {profileMessage && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/80">
                          {profileMessage}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-start">
                    <ActionButton
                      variant="primary"
                      size="md"
                      className={`w-full md:min-w-[200px] md:w-auto ${appleFontClass}`}
                      onClick={handleSaveProfile}
                      disabled={profileLoading || profileSaving}
                    >
                      {profileSaving ? '저장 중…' : '회원정보 수정'}
                    </ActionButton>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold tracking-tight text-white">보안</h3>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
                    <ActionButton
                      variant="secondary"
                      size="md"
                      className={`w-full md:w-auto ${appleFontClass}`}
                    >
                      <Lock className="h-4 w-4" />
                      비밀번호 변경
                    </ActionButton>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold tracking-tight text-white">계정 관리</h3>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
                    <div className="flex flex-wrap gap-3">
                    <ActionButton
                      variant="secondary"
                      size="md"
                      onClick={handleLogout}
                      className={`w-full md:w-auto ${appleFontClass}`}
                    >
                      로그아웃
                    </ActionButton>
                    <ActionButton
                      variant="destructive"
                      size="md"
                      onClick={handleDeleteAccount}
                      className={`w-full md:w-auto ${appleFontClass}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      회원 탈퇴
                    </ActionButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold tracking-tight text-white">주문 내역</h3>
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    onClick={() => void fetchOrders()}
                    className={appleFontClass}
                    disabled={ordersLoading}
                  >
                    {ordersLoading ? '불러오는 중…' : '새로고침'}
                  </ActionButton>
                </div>

                {ordersError && (
                  <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
                    {ordersError}
                  </div>
                )}

                <div className="space-y-3">
                  {!ordersLoading && orders.length === 0 ? (
                    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                        <Package className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-white">주문 내역이 없습니다</p>
                      <p className="text-xs text-white/50">첫 주문을 시작해보세요</p>
                    </div>
                  ) : (
                    orders.map((order) => {
                      const firstItem = order.items[0];
                      const extraCount = Math.max(0, order.items.length - 1);
                      return (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setOrderDetailOpen(true);
                          }}
                          className="w-full rounded-3xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getOrderStatusBadgeClass(order.status)}`}
                                >
                                  {mapOrderStatusLabel(order.status)}
                                </span>
                                <span className="text-xs text-white/55">
                                  {formatOrderDate(order.created_at)}
                                </span>
                              </div>
                              <p className="mt-2 truncate text-sm font-semibold text-white">
                                {firstItem?.title ?? '주문 항목'}
                                {extraCount > 0 ? ` 외 ${extraCount}건` : ''}
                              </p>
                              <p className="mt-1 text-xs text-white/50">
                                주문번호 {order.id.slice(0, 8)}…
                              </p>
                            </div>
                            <div className="text-left md:text-right">
                              <p className="text-sm font-semibold text-white">
                                {formatOrderMoney(order.amount_total, order.currency || 'KRW')}
                              </p>
                              <p className="mt-1 text-xs text-white/50">
                                항목 {order.items.length || 0}개
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'membership' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-white">멤버십</h3>
                    <p className="mt-1 text-sm text-white/60">
                      선택한 Studio 멤버십과 구독/결제 일정을 확인하세요.
                    </p>
                  </div>
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    onClick={() => void fetchMembership()}
                    className={appleFontClass}
                    disabled={membershipLoading}
                  >
                    {membershipLoading ? '불러오는 중…' : '새로고침'}
                  </ActionButton>
                </div>

                {membershipError && (
                  <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
                    {membershipError}
                  </div>
                )}

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-[0.16em] text-white/55">
                      Studio Membership
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                        membershipSummary?.has_active_subscription
                          ? 'border-emerald-300/30 bg-emerald-500/15 text-emerald-100'
                          : 'border-white/15 bg-white/5 text-white/70'
                      }`}
                    >
                      {membershipSummary?.has_active_subscription ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    {membershipSummary?.subscription_status && (
                      <span className="text-xs text-white/60">
                        PayPal: {membershipSummary.subscription_status}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs text-white/50">선택 멤버십</p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {membershipSummary?.selected_membership ?? '가입된 멤버십 없음'}
                      </p>
                      {membershipSummary?.subscription_id && (
                        <p className="mt-2 break-all text-xs text-white/45">
                          Subscription ID: {membershipSummary.subscription_id}
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs text-white/50">구독 일정</p>
                      <p className="mt-2 text-sm text-white/85">
                        구독 날짜: {membershipSummary?.subscribed_at ? formatOrderDate(membershipSummary.subscribed_at) : '-'}
                      </p>
                      <p className="mt-1 text-sm text-white/85">
                        결제예정일: {membershipSummary?.next_billing_at ? formatOrderDate(membershipSummary.next_billing_at) : '-'}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-white/50">
                    구독 관리/취소는 PayPal 자동결제(Automatic Payments)에서 진행할 수 있습니다.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'community' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-white">내가 작성한 게시글</h3>
                    <p className="mt-1 text-sm text-white/60">
                      커뮤니티에 작성한 글만 모아서 볼 수 있습니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ActionButton
                      variant="secondary"
                      size="sm"
                      onClick={() => void fetchCommunityPosts()}
                      className={appleFontClass}
                      disabled={communityLoading}
                    >
                      {communityLoading ? '불러오는 중…' : '새로고침'}
                    </ActionButton>
                    <a
                      href="#community"
                      onClick={() => onOpenChange(false)}
                      className={`inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 text-sm text-white transition hover:bg-white/20 ${appleFontClass}`}
                    >
                      커뮤니티 이동
                    </a>
                  </div>
                </div>

                {communityError && (
                  <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
                    {communityError}
                  </div>
                )}

                {communityLoading && communityPosts.length === 0 && (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                    게시글을 불러오는 중입니다...
                  </div>
                )}

                <div className="space-y-3">
                  {!communityLoading && communityPosts.length === 0 ? (
                    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-white">작성한 게시글이 없습니다</p>
                      <p className="text-xs text-white/50">
                        커뮤니티에서 첫 게시글을 작성해 보세요.
                      </p>
                    </div>
                  ) : (
                    communityPosts.map((post) => (
                      <article
                        key={post.id}
                        className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {post.is_notice && (
                                <span className="inline-flex items-center rounded-full border border-amber-300/35 bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100">
                                  공지
                                </span>
                              )}
                              <h4 className="truncate text-sm font-semibold text-white">{post.title}</h4>
                            </div>
                            <p className="mt-1 text-xs text-white/55">
                              작성 {formatOrderDate(post.created_at)} · 댓글 {post.comment_count}개
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-white/75">{toCommunityExcerpt(post.content)}</p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'admin' && isAdmin && <MyPageAdminPanel enabled={open && isAdmin} />}

            {activeTab !== 'profile' &&
              activeTab !== 'orders' &&
              activeTab !== 'community' &&
              activeTab !== 'membership' &&
              activeTab !== 'admin' && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">준비 중입니다</p>
                <p className="text-xs text-white/50">곧 새로운 기능으로 찾아올게요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <OrderDetailModal
        open={orderDetailOpen}
        onOpenChange={(next) => {
          setOrderDetailOpen(next);
          if (!next) setSelectedOrder(null);
        }}
        order={selectedOrder}
      />
    </>
  );
}

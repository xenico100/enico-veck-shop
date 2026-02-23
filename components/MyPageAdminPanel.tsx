'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import OrderDetailModal from '@/components/OrderDetailModal';
import StudioPostForm from '@/components/StudioPostForm';
import { useAuth } from '@/app/context/AuthContext';
import ActionButton from '@/components/ui/ActionButton';
import PillTab from '@/components/ui/PillTab';
import {
  formatOrderDate,
  formatOrderMoney,
  getOrderStatusBadgeClass,
  mapOrderStatusLabel,
  normalizeOrders,
  type OrderRecord
} from '@/utils/orders';
import type { ServicePost } from '@/utils/service-posts';

type AdminMember = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  role: 'user' | 'admin';
  full_name: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  subscription_status: string | null;
  is_protected_admin: boolean;
};

type AdminStudioPost = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  user_id: string;
  created_at: string;
};

type DashboardResponse = {
  data?: {
    members?: AdminMember[];
    studio_posts?: AdminStudioPost[];
  };
  message?: string;
};

type Props = {
  enabled: boolean;
};

type AdminTabKey = 'members' | 'studio-posts' | 'service-posts' | 'create-post';

type AdminServicePostDraft = {
  title: string;
  category: string;
  summary: string;
  content: string;
  price_from: string;
  currency: string;
  is_published: boolean;
  image_urls_text: string;
};

export default function MyPageAdminPanel({ enabled }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('members');
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [studioPosts, setStudioPosts] = useState<AdminStudioPost[]>([]);
  const [servicePosts, setServicePosts] = useState<ServicePost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, 'user' | 'admin'>>({});
  const [memberProfileDrafts, setMemberProfileDrafts] = useState<
    Record<string, { name: string; phone: string; address: string }>
  >({});
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [busyServicePostId, setBusyServicePostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingServicePostId, setEditingServicePostId] = useState<string | null>(null);
  const [editingMemberProfileId, setEditingMemberProfileId] = useState<string | null>(null);
  const [postDrafts, setPostDrafts] = useState<
    Record<string, { title: string; content: string; image_url: string }>
  >({});
  const [servicePostDrafts, setServicePostDrafts] = useState<
    Record<string, AdminServicePostDraft>
  >({});
  const [memberOrdersModalOpen, setMemberOrdersModalOpen] = useState(false);
  const [memberOrdersLoading, setMemberOrdersLoading] = useState(false);
  const [memberOrdersError, setMemberOrdersError] = useState<string | null>(null);
  const [memberOrdersTarget, setMemberOrdersTarget] = useState<AdminMember | null>(null);
  const [memberOrders, setMemberOrders] = useState<OrderRecord[]>([]);
  const [selectedMemberOrder, setSelectedMemberOrder] = useState<OrderRecord | null>(null);
  const [memberOrderDetailOpen, setMemberOrderDetailOpen] = useState(false);

  const appleFontClass =
    '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';
  const segmentedWrapClass = `flex min-w-max flex-wrap items-center gap-3 ${appleFontClass}`;
  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/25';

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const hydrateFromResponse = useCallback((payload: DashboardResponse) => {
    const nextMembers = Array.isArray(payload?.data?.members) ? payload.data.members : [];
    const nextPosts = Array.isArray(payload?.data?.studio_posts)
      ? payload.data.studio_posts
      : [];

    setMembers(nextMembers);
    setStudioPosts(nextPosts);
    setRoleDrafts(
      Object.fromEntries(nextMembers.map((member) => [member.id, member.role])) as Record<
        string,
        'user' | 'admin'
      >
    );
    setMemberProfileDrafts(
      Object.fromEntries(
        nextMembers.map((member) => [
          member.id,
          {
            name: member.name ?? member.full_name ?? '',
            phone: member.phone ?? '',
            address: member.address ?? ''
          }
        ])
      )
    );
    setPostDrafts(
      Object.fromEntries(
        nextPosts.map((post) => [
          post.id,
          {
            title: post.title ?? '',
            content: post.content ?? '',
            image_url: post.image_url ?? ''
          }
        ])
      )
    );
  }, []);

  const hydrateServicePosts = useCallback((rows: ServicePost[]) => {
    setServicePosts(rows);
    setServicePostDrafts(
      Object.fromEntries(
        rows.map((post) => [
          post.id,
          {
            title: post.title ?? '',
            category: post.category ?? '',
            summary: post.summary ?? '',
            content: post.content ?? '',
            price_from: post.price_from != null ? String(post.price_from) : '',
            currency: post.currency ?? 'KRW',
            is_published: Boolean(post.is_published),
            image_urls_text: (post.image_urls ?? []).join('\n')
          }
        ])
      )
    );
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const [dashboardResponse, servicePostsResponse] = await Promise.all([
        fetch('/api/admin/dashboard', { cache: 'no-store' }),
        fetch('/api/service-posts?all=true', { cache: 'no-store' })
      ]);

      const dashboardPayload = (await dashboardResponse.json()) as DashboardResponse;
      if (!dashboardResponse.ok) {
        throw new Error(dashboardPayload?.message || '관리자 데이터를 불러오지 못했습니다.');
      }
      hydrateFromResponse(dashboardPayload);

      const servicePayload = await servicePostsResponse.json().catch(() => ({}));
      if (!servicePostsResponse.ok) {
        throw new Error(servicePayload?.message || 'Service 게시글을 불러오지 못했습니다.');
      }
      const serviceRows = Array.isArray(servicePayload?.data)
        ? (servicePayload.data as ServicePost[])
        : [];
      hydrateServicePosts(serviceRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : '관리자 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [enabled, hydrateFromResponse, hydrateServicePosts]);

  useEffect(() => {
    if (!enabled) return;
    fetchDashboard();
  }, [enabled, fetchDashboard]);

  const currentUserId = user?.id ?? null;

  const memberCountLabel = useMemo(() => `${members.length}명`, [members.length]);
  const servicePostCountLabel = useMemo(
    () => `${servicePosts.length}개`,
    [servicePosts.length]
  );

  const handleRoleSave = async (member: AdminMember) => {
    const nextRole = roleDrafts[member.id] ?? member.role;
    if (nextRole === member.role) return;

    setBusyMemberId(member.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '역할 변경에 실패했습니다.');
      }

      setMembers((prev) =>
        prev.map((row) => (row.id === member.id ? { ...row, role: nextRole } : row))
      );
      setMessage('회원 역할을 변경했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '역할 변경에 실패했습니다.');
      setRoleDrafts((prev) => ({ ...prev, [member.id]: member.role }));
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleMemberDelete = async (member: AdminMember) => {
    if (!window.confirm(`"${member.email ?? member.id}" 계정을 삭제할까요?`)) return;

    setBusyMemberId(member.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/members/${member.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '회원 삭제에 실패했습니다.');
      }
      setMembers((prev) => prev.filter((row) => row.id !== member.id));
      setMessage('회원을 삭제했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원 삭제에 실패했습니다.');
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleMemberProfileDraftChange = (
    memberId: string,
    key: 'name' | 'phone' | 'address',
    value: string
  ) => {
    setMemberProfileDrafts((prev) => ({
      ...prev,
      [memberId]: {
        name: prev[memberId]?.name ?? '',
        phone: prev[memberId]?.phone ?? '',
        address: prev[memberId]?.address ?? '',
        [key]: value
      }
    }));
  };

  const handleMemberProfileSave = async (member: AdminMember) => {
    const draft = memberProfileDrafts[member.id] ?? {
      name: member.name ?? member.full_name ?? '',
      phone: member.phone ?? '',
      address: member.address ?? ''
    };

    const phone = draft.phone.trim();
    const address = draft.address.trim();

    if (phone && phone.length < 9) {
      setError('전화번호는 최소 9자 이상 입력해 주세요.');
      setMessage(null);
      return;
    }

    if (address && address.length < 5) {
      setError('주소는 최소 5자 이상 입력해 주세요.');
      setMessage(null);
      return;
    }

    setBusyMemberId(member.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          phone: draft.phone,
          address: draft.address
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '회원 정보 수정에 실패했습니다.');
      }

      setMembers((prev) =>
        prev.map((row) =>
          row.id === member.id
            ? {
                ...row,
                name: draft.name.trim() || null,
                full_name: draft.name.trim() || null,
                phone: draft.phone.trim() || null,
                address: draft.address.trim() || null
              }
            : row
        )
      );
      setMessage('회원 정보를 수정했습니다.');
      setEditingMemberProfileId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원 정보 수정에 실패했습니다.');
    } finally {
      setBusyMemberId(null);
    }
  };

  const closeMemberOrdersModal = () => {
    setMemberOrdersModalOpen(false);
    setMemberOrdersTarget(null);
    setMemberOrders([]);
    setMemberOrdersError(null);
    setMemberOrdersLoading(false);
    setSelectedMemberOrder(null);
    setMemberOrderDetailOpen(false);
  };

  const handleOpenMemberOrders = async (member: AdminMember) => {
    setMemberOrdersTarget(member);
    setMemberOrders([]);
    setMemberOrdersError(null);
    setMemberOrdersModalOpen(true);
    setMemberOrdersLoading(true);
    setSelectedMemberOrder(null);
    setMemberOrderDetailOpen(false);

    try {
      const response = await fetch(`/api/admin/users/${member.id}/orders`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '회원 주문 내역을 불러오지 못했습니다.');
      }
      setMemberOrders(normalizeOrders(payload?.data));
    } catch (err) {
      setMemberOrdersError(
        err instanceof Error ? err.message : '회원 주문 내역을 불러오지 못했습니다.'
      );
    } finally {
      setMemberOrdersLoading(false);
    }
  };

  const handlePostDraftChange = (
    postId: string,
    key: 'title' | 'content' | 'image_url',
    value: string
  ) => {
    setPostDrafts((prev) => ({
      ...prev,
      [postId]: {
        title: prev[postId]?.title ?? '',
        content: prev[postId]?.content ?? '',
        image_url: prev[postId]?.image_url ?? '',
        [key]: value
      }
    }));
  };

  const handleStudioPostSave = async (post: AdminStudioPost) => {
    const draft = postDrafts[post.id] ?? {
      title: post.title,
      content: post.content,
      image_url: post.image_url ?? ''
    };

    setBusyPostId(post.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/studio-posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '게시글 수정에 실패했습니다.');
      }

      const updated = payload?.data as AdminStudioPost | undefined;
      if (updated?.id) {
        setStudioPosts((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        setPostDrafts((prev) => ({
          ...prev,
          [updated.id]: {
            title: updated.title,
            content: updated.content,
            image_url: updated.image_url ?? ''
          }
        }));
      }
      setMessage('Studio 게시글을 수정했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글 수정에 실패했습니다.');
    } finally {
      setBusyPostId(null);
    }
  };

  const handleStudioPostDelete = async (post: AdminStudioPost) => {
    if (!window.confirm(`"${post.title}" 게시글을 삭제할까요?`)) return;

    setBusyPostId(post.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/studio-posts/${post.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '게시글 삭제에 실패했습니다.');
      }
      setStudioPosts((prev) => prev.filter((row) => row.id !== post.id));
      setMessage('Studio 게시글을 삭제했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글 삭제에 실패했습니다.');
    } finally {
      setBusyPostId(null);
    }
  };

  const handleServicePostDraftChange = (
    postId: string,
    key: keyof AdminServicePostDraft,
    value: string | boolean
  ) => {
    setServicePostDrafts((prev) => ({
      ...prev,
      [postId]: {
        title: prev[postId]?.title ?? '',
        category: prev[postId]?.category ?? '',
        summary: prev[postId]?.summary ?? '',
        content: prev[postId]?.content ?? '',
        price_from: prev[postId]?.price_from ?? '',
        currency: prev[postId]?.currency ?? 'KRW',
        is_published: prev[postId]?.is_published ?? true,
        image_urls_text: prev[postId]?.image_urls_text ?? '',
        [key]: value
      } as AdminServicePostDraft
    }));
  };

  const handleServicePostSave = async (post: ServicePost) => {
    const draft = servicePostDrafts[post.id];
    if (!draft) return;

    setBusyServicePostId(post.id);
    setError(null);
    setMessage(null);

    try {
      const imageUrls = draft.image_urls_text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const response = await fetch(`/api/service-posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title.trim(),
          category: draft.category.trim() || null,
          summary: draft.summary.trim() || null,
          content: draft.content.trim() || null,
          price_from: draft.price_from ? Number(draft.price_from) : null,
          currency: draft.currency.trim() || 'KRW',
          is_published: draft.is_published,
          image_urls: imageUrls
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Service 게시글 수정에 실패했습니다.');
      }

      const updated = payload?.data as ServicePost | undefined;
      if (updated?.id) {
        setServicePosts((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        setServicePostDrafts((prev) => ({
          ...prev,
          [updated.id]: {
            title: updated.title ?? '',
            category: updated.category ?? '',
            summary: updated.summary ?? '',
            content: updated.content ?? '',
            price_from: updated.price_from != null ? String(updated.price_from) : '',
            currency: updated.currency ?? 'KRW',
            is_published: Boolean(updated.is_published),
            image_urls_text: (updated.image_urls ?? []).join('\n')
          }
        }));
      }
      setMessage('Service 게시글을 수정했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Service 게시글 수정에 실패했습니다.');
    } finally {
      setBusyServicePostId(null);
    }
  };

  const handleServicePostDelete = async (post: ServicePost) => {
    if (!window.confirm(`"${post.title}" Service 게시글을 삭제할까요?`)) return;

    setBusyServicePostId(post.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/service-posts/${post.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Service 게시글 삭제에 실패했습니다.');
      }
      setServicePosts((prev) => prev.filter((row) => row.id !== post.id));
      setServicePostDrafts((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
      setMessage('Service 게시글을 삭제했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Service 게시글 삭제에 실패했습니다.');
    } finally {
      setBusyServicePostId(null);
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className={`space-y-6 ${appleFontClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-white">관리자 패널</h3>
          <p className="mt-1 text-sm text-white/60">
            회원 관리와 Studio 게시글 관리 기능을 마이페이지 안에서 바로 사용합니다.
          </p>
        </div>
        <ActionButton
          type="button"
          onClick={fetchDashboard}
          variant="primary"
          size="md"
          className={appleFontClass}
          disabled={loading}
        >
          {loading ? '불러오는 중…' : '새로고침'}
        </ActionButton>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className={segmentedWrapClass}>
          {[
            { key: 'members', label: `회원 관리 (${memberCountLabel})` },
            { key: 'studio-posts', label: `Studio 게시글 (${studioPosts.length})` },
            { key: 'service-posts', label: `Service 게시글 (${servicePostCountLabel})` },
            { key: 'create-post', label: '게시물 작성' }
          ].map((tab) => (
            <PillTab
              key={tab.key}
              onClick={() => setActiveTab(tab.key as AdminTabKey)}
              active={activeTab === tab.key}
              className="whitespace-nowrap"
            >
              {tab.label}
            </PillTab>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          {message}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
          <div className="space-y-3">
            {members.length === 0 && !loading ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                등록된 회원이 없습니다.
              </div>
            ) : (
              members.map((member) => {
                const isSelf = currentUserId === member.id;
                const isBusy = busyMemberId === member.id;
                const protectedAdmin = member.is_protected_admin;
                const isEditingProfile = editingMemberProfileId === member.id;
                const memberProfileDraft = memberProfileDrafts[member.id] ?? {
                  name: member.name ?? member.full_name ?? '',
                  phone: member.phone ?? '',
                  address: member.address ?? ''
                };
                return (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="break-all text-sm font-medium text-white">
                          {member.email ?? member.id}
                        </p>
                        <p className="mt-1 text-xs text-white/55">
                          이름: {member.name ?? member.full_name ?? '-'} · 구독:{' '}
                          {member.subscription_status ?? 'none'}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          가입: {formatDate(member.created_at)} · 최근 로그인:{' '}
                          {formatDate(member.last_sign_in_at)}
                        </p>
                        {(member.phone || member.address) && (
                          <p className="mt-1 text-xs text-white/45">
                            {member.phone ? `전화: ${member.phone}` : ''}{' '}
                            {member.address ? `· 주소: ${member.address}` : ''}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <select
                          value={roleDrafts[member.id] ?? member.role}
                          onChange={(e) =>
                            setRoleDrafts((prev) => ({
                              ...prev,
                              [member.id]: (e.target.value === 'admin' ? 'admin' : 'user')
                            }))
                          }
                          className="h-9 rounded-full border border-white/20 bg-white/10 px-3 pr-8 text-sm font-medium text-white shadow-sm backdrop-blur-sm outline-none focus:ring-2 focus:ring-white/40"
                          disabled={isBusy || protectedAdmin}
                        >
                          <option value="user" className="bg-neutral-900">
                            user
                          </option>
                          <option value="admin" className="bg-neutral-900">
                            admin
                          </option>
                        </select>
                        <ActionButton
                          type="button"
                          onClick={() => handleRoleSave(member)}
                          variant="primary"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy || protectedAdmin}
                        >
                          역할 변경
                        </ActionButton>
                        <ActionButton
                          type="button"
                          onClick={() =>
                            setEditingMemberProfileId((prev) => (prev === member.id ? null : member.id))
                          }
                          variant="secondary"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy}
                        >
                          {isEditingProfile ? '닫기' : '회원정보 수정'}
                        </ActionButton>
                        <ActionButton
                          type="button"
                          onClick={() => void handleOpenMemberOrders(member)}
                          variant="secondary"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy}
                        >
                          주문 보기
                        </ActionButton>
                        <ActionButton
                          type="button"
                          onClick={() => handleMemberDelete(member)}
                          variant="destructive"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy || isSelf || protectedAdmin}
                          title={
                            isSelf
                              ? '현재 로그인한 계정은 삭제할 수 없습니다.'
                              : protectedAdmin
                                ? '보호된 관리자 계정입니다.'
                                : '회원 삭제'
                          }
                        >
                          삭제
                        </ActionButton>
                      </div>
                    </div>

                    {isEditingProfile && (
                      <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="grid gap-2">
                            <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                              이름
                            </label>
                            <input
                              className={inputClass}
                              value={memberProfileDraft.name}
                              onChange={(e) =>
                                handleMemberProfileDraftChange(member.id, 'name', e.target.value)
                              }
                              disabled={isBusy}
                            />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                              전화번호
                            </label>
                            <input
                              className={inputClass}
                              value={memberProfileDraft.phone}
                              onChange={(e) =>
                                handleMemberProfileDraftChange(member.id, 'phone', e.target.value)
                              }
                              placeholder="010-0000-0000"
                              disabled={isBusy}
                            />
                          </div>
                          <div className="grid gap-2 md:col-span-1">
                            <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                              주소
                            </label>
                            <input
                              className={inputClass}
                              value={memberProfileDraft.address}
                              onChange={(e) =>
                                handleMemberProfileDraftChange(member.id, 'address', e.target.value)
                              }
                              placeholder="주소 입력"
                              disabled={isBusy}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <ActionButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingMemberProfileId(null)}
                            className={appleFontClass}
                            disabled={isBusy}
                          >
                            취소
                          </ActionButton>
                          <ActionButton
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleMemberProfileSave(member)}
                            className={appleFontClass}
                            disabled={isBusy}
                          >
                            {isBusy ? '저장 중…' : '저장'}
                          </ActionButton>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'studio-posts' && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
          <div className="space-y-3">
            {studioPosts.length === 0 && !loading ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                등록된 Studio 게시글이 없습니다.
              </div>
            ) : (
              studioPosts.map((post) => {
                const isBusy = busyPostId === post.id;
                const draft = postDrafts[post.id] ?? {
                  title: post.title,
                  content: post.content,
                  image_url: post.image_url ?? ''
                };

                return (
                  <div
                    key={post.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{post.title}</p>
                        <p className="mt-1 text-xs text-white/55">
                          작성자 ID: {post.user_id}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          생성일: {formatDate(post.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <ActionButton
                          type="button"
                          onClick={() =>
                            setEditingPostId((prev) => (prev === post.id ? null : post.id))
                          }
                          variant="secondary"
                          size="sm"
                          className={appleFontClass}
                        >
                          {editingPostId === post.id ? '닫기' : '수정'}
                        </ActionButton>
                        <ActionButton
                          type="button"
                          onClick={() => handleStudioPostDelete(post)}
                          variant="destructive"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy}
                        >
                          삭제
                        </ActionButton>
                      </div>
                    </div>

                    {editingPostId === post.id && (
                      <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            제목
                          </label>
                          <input
                            className={inputClass}
                            value={draft.title}
                            onChange={(e) =>
                              handlePostDraftChange(post.id, 'title', e.target.value)
                            }
                            disabled={isBusy}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            이미지 URL
                          </label>
                          <input
                            className={inputClass}
                            value={draft.image_url}
                            onChange={(e) =>
                              handlePostDraftChange(post.id, 'image_url', e.target.value)
                            }
                            placeholder="https://..."
                            disabled={isBusy}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            내용
                          </label>
                          <textarea
                            className={`${inputClass} min-h-28 resize-y`}
                            value={draft.content}
                            onChange={(e) =>
                              handlePostDraftChange(post.id, 'content', e.target.value)
                            }
                            disabled={isBusy}
                          />
                        </div>
                        <div className="flex justify-end">
                          <ActionButton
                            type="button"
                            onClick={() => handleStudioPostSave(post)}
                            variant="primary"
                            size="sm"
                            className={appleFontClass}
                            disabled={isBusy}
                          >
                            {isBusy ? '저장 중…' : '저장'}
                          </ActionButton>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'service-posts' && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">Service 게시글 관리</p>
              <p className="text-xs text-white/55">
                Services 섹션에 노출되는 `service_posts` 목록입니다.
              </p>
            </div>
            <ActionButton
              type="button"
              onClick={fetchDashboard}
              variant="secondary"
              size="sm"
              className={appleFontClass}
              disabled={loading}
            >
              새로고침
            </ActionButton>
          </div>

          <div className="space-y-3">
            {servicePosts.length === 0 && !loading ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                등록된 Service 게시글이 없습니다.
              </div>
            ) : (
              servicePosts.map((post) => {
                const isBusy = busyServicePostId === post.id;
                const isEditing = editingServicePostId === post.id;
                const draft = servicePostDrafts[post.id] ?? {
                  title: post.title ?? '',
                  category: post.category ?? '',
                  summary: post.summary ?? '',
                  content: post.content ?? '',
                  price_from: post.price_from != null ? String(post.price_from) : '',
                  currency: post.currency ?? 'KRW',
                  is_published: Boolean(post.is_published),
                  image_urls_text: (post.image_urls ?? []).join('\n')
                };

                return (
                  <div key={post.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{post.title}</p>
                        <p className="mt-1 text-xs text-white/55">
                          {post.category || '카테고리 없음'} · {post.is_published ? '공개' : '비공개'} · 수정{' '}
                          {formatDate(post.updated_at)}
                        </p>
                        {post.summary && (
                          <p className="mt-1 line-clamp-2 text-xs text-white/45">{post.summary}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <ActionButton
                          type="button"
                          onClick={() =>
                            setEditingServicePostId((prev) => (prev === post.id ? null : post.id))
                          }
                          variant="secondary"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy}
                        >
                          {isEditing ? '닫기' : '수정'}
                        </ActionButton>
                        <ActionButton
                          type="button"
                          onClick={() => handleServicePostDelete(post)}
                          variant="destructive"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy}
                        >
                          삭제
                        </ActionButton>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            제목
                          </label>
                          <input
                            className={inputClass}
                            value={draft.title}
                            onChange={(e) =>
                              handleServicePostDraftChange(post.id, 'title', e.target.value)
                            }
                            disabled={isBusy}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="grid gap-2">
                            <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                              카테고리
                            </label>
                            <input
                              className={inputClass}
                              value={draft.category}
                              onChange={(e) =>
                                handleServicePostDraftChange(post.id, 'category', e.target.value)
                              }
                              disabled={isBusy}
                            />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                              가격 시작
                            </label>
                            <input
                              className={inputClass}
                              type="number"
                              min={0}
                              value={draft.price_from}
                              onChange={(e) =>
                                handleServicePostDraftChange(post.id, 'price_from', e.target.value)
                              }
                              disabled={isBusy}
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            요약
                          </label>
                          <input
                            className={inputClass}
                            value={draft.summary}
                            onChange={(e) =>
                              handleServicePostDraftChange(post.id, 'summary', e.target.value)
                            }
                            disabled={isBusy}
                          />
                        </div>

                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            상세 내용
                          </label>
                          <textarea
                            className={`${inputClass} min-h-28 resize-y`}
                            value={draft.content}
                            onChange={(e) =>
                              handleServicePostDraftChange(post.id, 'content', e.target.value)
                            }
                            disabled={isBusy}
                          />
                        </div>

                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            이미지 URL 목록 (한 줄에 하나)
                          </label>
                          <textarea
                            className={`${inputClass} min-h-24 resize-y`}
                            value={draft.image_urls_text}
                            onChange={(e) =>
                              handleServicePostDraftChange(post.id, 'image_urls_text', e.target.value)
                            }
                            disabled={isBusy}
                          />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-white/85">
                          <input
                            type="checkbox"
                            checked={draft.is_published}
                            onChange={(e) =>
                              handleServicePostDraftChange(post.id, 'is_published', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-white/20 bg-white/10"
                            disabled={isBusy}
                          />
                          게시글 공개
                        </label>

                        <div className="flex justify-end">
                          <ActionButton
                            type="button"
                            onClick={() => handleServicePostSave(post)}
                            variant="primary"
                            size="sm"
                            className={appleFontClass}
                            disabled={isBusy}
                          >
                            {isBusy ? '저장 중…' : '저장'}
                          </ActionButton>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'create-post' && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
          <p className="mb-3 text-sm text-white/60">
            Studio 게시물 작성 폼입니다. 등록 후 Studio 페이지로 이동할 수 있습니다.
          </p>
          <StudioPostForm />
        </div>
      )}

      {memberOrdersModalOpen && (
        <div
          className="fixed inset-0 z-[84] bg-black/70 backdrop-blur-sm"
          onClick={closeMemberOrdersModal}
          aria-hidden="true"
        />
      )}
      {memberOrdersModalOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="회원 주문 내역"
            className="w-full max-w-3xl rounded-3xl border border-white/10 bg-black/75 p-5 shadow-2xl backdrop-blur-xl md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h4 className="text-base font-semibold tracking-tight text-white">
                  회원 주문 내역
                </h4>
                <p className="mt-1 break-all text-sm text-white/60">
                  {memberOrdersTarget?.email ?? memberOrdersTarget?.id ?? '-'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    memberOrdersTarget ? void handleOpenMemberOrders(memberOrdersTarget) : undefined
                  }
                  className={appleFontClass}
                  disabled={memberOrdersLoading || !memberOrdersTarget}
                >
                  {memberOrdersLoading ? '불러오는 중…' : '새로고침'}
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={closeMemberOrdersModal}
                  className={appleFontClass}
                >
                  닫기
                </ActionButton>
              </div>
            </div>

            {memberOrdersError && (
              <div className="mb-4 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
                {memberOrdersError}
              </div>
            )}

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {!memberOrdersLoading && memberOrders.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
                  주문 내역이 없습니다.
                </div>
              ) : (
                memberOrders.map((order) => {
                  const firstItem = order.items[0];
                  const extraCount = Math.max(0, order.items.length - 1);
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        setSelectedMemberOrder(order);
                        setMemberOrderDetailOpen(true);
                      }}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
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
                          <p className="mt-1 text-xs text-white/45">
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
        </div>
      )}

      <OrderDetailModal
        open={memberOrderDetailOpen}
        onOpenChange={(next) => {
          setMemberOrderDetailOpen(next);
          if (!next) {
            setSelectedMemberOrder(null);
          }
        }}
        order={selectedMemberOrder}
      />
    </div>
  );
}

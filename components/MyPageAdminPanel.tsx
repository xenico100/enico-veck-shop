'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import StudioPostForm from '@/components/StudioPostForm';
import { useAuth } from '@/app/context/AuthContext';

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

type AdminTabKey = 'members' | 'studio-posts' | 'create-post';

export default function MyPageAdminPanel({ enabled }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('members');
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [studioPosts, setStudioPosts] = useState<AdminStudioPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, 'user' | 'admin'>>({});
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postDrafts, setPostDrafts] = useState<
    Record<string, { title: string; content: string; image_url: string }>
  >({});

  const appleFontClass =
    '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';
  const segmentedWrapClass = `inline-flex min-w-max items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md ${appleFontClass}`;
  const segmentedTabBaseClass =
    'rounded-full px-4 py-2 text-sm font-medium tracking-[0.2px] transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 whitespace-nowrap';
  const pillGlassClass =
    `inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium tracking-[0.2px] text-white/90 backdrop-blur-md transition-colors duration-200 ease-in-out hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${appleFontClass}`;
  const pillDangerClass =
    `inline-flex items-center justify-center rounded-full border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-medium tracking-[0.2px] text-rose-100 transition-colors duration-200 ease-in-out hover:bg-rose-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${appleFontClass}`;
  const pillPrimaryClass =
    `inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-medium tracking-[0.2px] text-black transition-colors duration-200 ease-in-out hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${appleFontClass}`;
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

  const fetchDashboard = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/dashboard', { cache: 'no-store' });
      const payload = (await response.json()) as DashboardResponse;
      if (!response.ok) {
        throw new Error(payload?.message || '관리자 데이터를 불러오지 못했습니다.');
      }
      hydrateFromResponse(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : '관리자 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [enabled, hydrateFromResponse]);

  useEffect(() => {
    if (!enabled) return;
    fetchDashboard();
  }, [enabled, fetchDashboard]);

  const currentUserId = user?.id ?? null;

  const memberCountLabel = useMemo(() => `${members.length}명`, [members.length]);

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
        <button type="button" onClick={fetchDashboard} className={pillPrimaryClass} disabled={loading}>
          {loading ? '불러오는 중…' : '새로고침'}
        </button>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className={segmentedWrapClass}>
          {[
            { key: 'members', label: `회원 관리 (${memberCountLabel})` },
            { key: 'studio-posts', label: `Studio 게시글 (${studioPosts.length})` },
            { key: 'create-post', label: '게시물 작성' }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as AdminTabKey)}
              className={`${segmentedTabBaseClass} ${
                activeTab === tab.key
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
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

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={roleDrafts[member.id] ?? member.role}
                          onChange={(e) =>
                            setRoleDrafts((prev) => ({
                              ...prev,
                              [member.id]: (e.target.value === 'admin' ? 'admin' : 'user')
                            }))
                          }
                          className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs text-white outline-none"
                          disabled={isBusy || protectedAdmin}
                        >
                          <option value="user" className="bg-neutral-900">
                            user
                          </option>
                          <option value="admin" className="bg-neutral-900">
                            admin
                          </option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRoleSave(member)}
                          className={pillGlassClass}
                          disabled={isBusy || protectedAdmin}
                        >
                          역할 변경
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMemberDelete(member)}
                          className={pillDangerClass}
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
                        </button>
                      </div>
                    </div>
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
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingPostId((prev) => (prev === post.id ? null : post.id))
                          }
                          className={pillGlassClass}
                        >
                          {editingPostId === post.id ? '닫기' : '수정'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStudioPostDelete(post)}
                          className={pillDangerClass}
                          disabled={isBusy}
                        >
                          삭제
                        </button>
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
                          <button
                            type="button"
                            onClick={() => handleStudioPostSave(post)}
                            className={pillPrimaryClass}
                            disabled={isBusy}
                          >
                            {isBusy ? '저장 중…' : '저장'}
                          </button>
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
    </div>
  );
}

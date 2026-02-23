'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Lock, Package, Trash2, X } from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import { SERVICE_CATEGORIES, type ServicePost } from '@/utils/service-posts';

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

type ServicePostEditorState = {
  id: string | null;
  title: string;
  category: string;
  summary: string;
  content: string;
  price_from: string;
  currency: string;
  is_published: boolean;
  image_urls_text: string;
  files: File[];
};

const emptyPostEditor = (): ServicePostEditorState => ({
  id: null,
  title: '',
  category: SERVICE_CATEGORIES[0],
  summary: '',
  content: '',
  price_from: '',
  currency: 'KRW',
  is_published: true,
  image_urls_text: '',
  files: []
});

export default function MyPageModal({ open, onOpenChange }: Props) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [servicePosts, setServicePosts] = useState<ServicePost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState<ServicePostEditorState>(emptyPostEditor);
  const [editorSubmitting, setEditorSubmitting] = useState(false);
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const isAdmin = useMemo(() => {
    const adminEnv =
      process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '';
    const adminEmails = adminEnv
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    return Boolean(user?.email && adminEmails.includes(user.email.toLowerCase()));
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
    `inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium tracking-[0.2px] text-white/85 backdrop-blur-md transition-colors duration-200 ease-in-out hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 md:w-auto ${appleFontClass}`;
  const pillDangerClass =
    `inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-medium tracking-[0.2px] text-rose-100 transition-colors duration-200 ease-in-out hover:bg-rose-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 md:w-auto ${appleFontClass}`;

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

  const fetchServicePosts = async () => {
    setPostsLoading(true);
    setPostsError(null);
    try {
      const response = await fetch('/api/service-posts?all=true', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || '게시글 목록을 불러오지 못했습니다.');
      }
      setServicePosts(Array.isArray(payload?.data) ? (payload.data as ServicePost[]) : []);
    } catch (error) {
      setPostsError(error instanceof Error ? error.message : '게시글 목록을 불러오지 못했습니다.');
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    if (!open || activeTab !== 'posts' || !isAdmin) return;
    fetchServicePosts();
  }, [open, activeTab, isAdmin]);

  const openCreateEditor = () => {
    setEditorMessage(null);
    setEditorState(emptyPostEditor());
    setEditorOpen(true);
  };

  const openEditEditor = (post: ServicePost) => {
    setEditorMessage(null);
    setEditorState({
      id: post.id,
      title: post.title ?? '',
      category: post.category || SERVICE_CATEGORIES[0],
      summary: post.summary ?? '',
      content: post.content ?? '',
      price_from: post.price_from != null ? String(post.price_from) : '',
      currency: post.currency ?? 'KRW',
      is_published: Boolean(post.is_published),
      image_urls_text: (post.image_urls ?? []).join('\n'),
      files: []
    });
    setEditorOpen(true);
  };

  const handlePostFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setEditorState((prev) => ({ ...prev, files }));
  };

  const handleEditorFieldChange = (
    key: keyof ServicePostEditorState,
    value: string | boolean | File[]
  ) => {
    setEditorState((prev) => ({ ...prev, [key]: value } as ServicePostEditorState));
  };

  const handleSubmitServicePost = async () => {
    if (!editorState.title.trim()) {
      setEditorMessage('제목을 입력해 주세요.');
      return;
    }

    setEditorSubmitting(true);
    setEditorMessage(null);

    try {
      let uploadedImageUrls: string[] = [];
      if (editorState.files.length > 0) {
        const uploadForm = new FormData();
        editorState.files.forEach((file) => uploadForm.append('files', file));
        const uploadResponse = await fetch('/api/service-posts/upload', {
          method: 'POST',
          body: uploadForm
        });
        const uploadPayload = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadPayload?.message || '이미지 업로드에 실패했습니다.');
        }
        uploadedImageUrls = Array.isArray(uploadPayload?.data?.image_urls)
          ? uploadPayload.data.image_urls
          : [];
      }

      const manualUrls = editorState.image_urls_text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const body = {
        title: editorState.title.trim(),
        category: editorState.category || null,
        summary: editorState.summary.trim() || null,
        content: editorState.content.trim() || null,
        price_from: editorState.price_from ? Number(editorState.price_from) : null,
        currency: editorState.currency || 'KRW',
        is_published: editorState.is_published,
        image_urls: [...manualUrls, ...uploadedImageUrls]
      };

      const endpoint = editorState.id
        ? `/api/service-posts/${editorState.id}`
        : '/api/service-posts';
      const method = editorState.id ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || '저장에 실패했습니다.');
      }

      setEditorMessage(editorState.id ? '게시글을 수정했습니다.' : '게시글을 생성했습니다.');
      setEditorOpen(false);
      setEditorState(emptyPostEditor());
      await fetchServicePosts();
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setEditorSubmitting(false);
    }
  };

  const handleDeleteServicePost = async (post: ServicePost) => {
    if (!window.confirm(`"${post.title}" 게시글을 삭제할까요?`)) return;
    setEditorMessage(null);
    try {
      const response = await fetch(`/api/service-posts/${post.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '삭제에 실패했습니다.');
      }
      await fetchServicePosts();
    } catch (error) {
      setPostsError(error instanceof Error ? error.message : '삭제에 실패했습니다.');
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

            {activeTab === 'posts' && isAdmin && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-white">게시글 관리</h3>
                    <p className="mt-1 text-sm text-white/60">
                      Services 섹션에 노출될 게시글을 생성/수정/삭제합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openCreateEditor}
                    className={pillPrimaryClass}
                  >
                    새 게시글
                  </button>
                </div>

                {postsError && (
                  <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
                    {postsError}
                  </div>
                )}

                {editorMessage && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                    {editorMessage}
                  </div>
                )}

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-medium text-white">게시글 목록</p>
                    {postsLoading && <span className="text-xs text-white/50">불러오는 중…</span>}
                  </div>

                  <div className="space-y-3">
                    {!postsLoading && servicePosts.length === 0 && (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                        등록된 서비스 게시글이 없습니다.
                      </div>
                    )}

                    {servicePosts.map((post) => (
                      <div
                        key={post.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{post.title}</p>
                          <p className="mt-1 text-xs text-white/55">
                            {post.category || '카테고리 없음'} ·{' '}
                            {post.is_published ? '공개' : '비공개'} · 수정{' '}
                            {new Date(post.updated_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditEditor(post)}
                            className={pillGlassClass}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteServicePost(post)}
                            className={pillDangerClass}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {editorOpen && (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <h4 className="text-base font-semibold tracking-tight text-white">
                        {editorState.id ? '게시글 수정' : '새 게시글'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setEditorOpen(false);
                          setEditorState(emptyPostEditor());
                        }}
                        className={glassIconButtonClass}
                        aria-label="편집기 닫기"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <label className={labelClass}>제목</label>
                        <input
                          className={inputClass}
                          value={editorState.title}
                          onChange={(e) => handleEditorFieldChange('title', e.target.value)}
                          placeholder="서비스 제목"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <label className={labelClass}>카테고리</label>
                          <select
                            className={inputClass}
                            value={editorState.category}
                            onChange={(e) => handleEditorFieldChange('category', e.target.value)}
                          >
                            {SERVICE_CATEGORIES.map((category) => (
                              <option key={category} value={category} className="bg-neutral-900">
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <label className={labelClass}>가격 시작 (KRW)</label>
                          <input
                            className={inputClass}
                            type="number"
                            min={0}
                            value={editorState.price_from}
                            onChange={(e) => handleEditorFieldChange('price_from', e.target.value)}
                            placeholder="150000"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <label className={labelClass}>요약</label>
                        <input
                          className={inputClass}
                          value={editorState.summary}
                          onChange={(e) => handleEditorFieldChange('summary', e.target.value)}
                          placeholder="카드에 표시될 짧은 요약"
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className={labelClass}>상세 내용</label>
                        <textarea
                          className={`${inputClass} min-h-32 resize-y`}
                          value={editorState.content}
                          onChange={(e) => handleEditorFieldChange('content', e.target.value)}
                          placeholder="상세 설명 (마크다운 가능)"
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className={labelClass}>이미지 URL 목록 (한 줄에 하나)</label>
                        <textarea
                          className={`${inputClass} min-h-24 resize-y`}
                          value={editorState.image_urls_text}
                          onChange={(e) =>
                            handleEditorFieldChange('image_urls_text', e.target.value)
                          }
                          placeholder="https://..."
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className={labelClass}>이미지 업로드</label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePostFilesChange}
                          className="block w-full text-sm text-white/80 file:mr-3 file:rounded-full file:border file:border-white/15 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white/85 hover:file:bg-white/20"
                        />
                        {editorState.files.length > 0 && (
                          <p className="text-xs text-white/50">
                            선택됨: {editorState.files.map((file) => file.name).join(', ')}
                          </p>
                        )}
                      </div>

                      <label className="flex items-center gap-2 text-sm text-white/80">
                        <input
                          type="checkbox"
                          checked={editorState.is_published}
                          onChange={(e) =>
                            handleEditorFieldChange('is_published', e.target.checked)
                          }
                          className="h-4 w-4 rounded border-white/20 bg-white/10"
                        />
                        게시글 공개
                      </label>

                      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setEditorOpen(false);
                            setEditorState(emptyPostEditor());
                          }}
                          className={pillGlassClass}
                          disabled={editorSubmitting}
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitServicePost}
                          className={pillPrimaryClass}
                          disabled={editorSubmitting}
                        >
                          {editorSubmitting ? '저장 중…' : editorState.id ? '수정 저장' : '게시글 생성'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab !== 'profile' && activeTab !== 'orders' && activeTab !== 'posts' && (
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

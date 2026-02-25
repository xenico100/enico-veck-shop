'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ImageIcon, Pause, PencilLine, Play, X } from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import StudioProtectedMedia from '@/components/StudioProtectedMedia';
import StudioSubscribeButton from '@/components/StudioSubscribeButton';
import { createClient } from '@/utils/supabase/client';
import { isAdminUserLike } from '@/utils/service-posts';

type StudioPost = {
  id: string;
  title: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string | null;
};

type StudioWriteForm = {
  title: string;
  content: string;
  imageUrl: string;
};

const STUDIO_COLUMNS_PER_ROW = 3;
const MARQUEE_GAP_REM = 1; // gap-4 == 1rem

const dialogOverlayClass =
  'fixed inset-0 z-40 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-300';
const dialogContentClass =
  'fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-300 md:rounded-3xl';
const modalCloseButtonClass =
  'absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 shadow-md backdrop-blur-md transition-all duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 md:right-5 md:top-5';
const fieldLabelClass = 'text-[11px] uppercase tracking-[0.24em] text-white/55';
const inputClass =
  'w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-white/20 focus:bg-white/[0.06] focus:ring-2 focus:ring-white/20';
const textareaClass = `${inputClass} min-h-[140px] resize-y`;

const chunkPosts = <T,>(items: T[], size: number) => {
  if (size <= 0) return [items];

  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
};

const buildLoopSeed = (rowItems: StudioPost[]) => {
  if (rowItems.length === 0) return [] as StudioPost[];
  if (rowItems.length >= STUDIO_COLUMNS_PER_ROW) return rowItems;

  const seed: StudioPost[] = [];
  while (seed.length < STUDIO_COLUMNS_PER_ROW) {
    seed.push(...rowItems);
  }
  return seed.slice(0, STUDIO_COLUMNS_PER_ROW);
};

const formatStudioDate = (value: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const getExcerpt = (value: string | null, maxLength = 72) => {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
};

function StudioDetailModal({
  post,
  onClose
}: {
  post: StudioPost | null;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [hasActiveMembership, setHasActiveMembership] = useState(false);
  const [membershipError, setMembershipError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resetForGuest = () => {
      setMembershipLoading(false);
      setHasActiveMembership(false);
      setMembershipError(null);
    };

    if (!post) {
      resetForGuest();
      return;
    }

    if (authLoading) {
      setMembershipLoading(true);
      setMembershipError(null);
      return;
    }

    if (!user?.id) {
      resetForGuest();
      return;
    }

    const loadStudioAccess = async () => {
      setMembershipLoading(true);
      setMembershipError(null);

      try {
        const { data, error } = await (supabase as any)
          .from('studio_access')
          .select('has_active_subscription')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setHasActiveMembership(Boolean(data?.has_active_subscription));
        }
      } catch (error) {
        if (!cancelled) {
          setHasActiveMembership(false);
          setMembershipError(
            error instanceof Error ? error.message : '멤버십 상태를 확인하지 못했습니다.'
          );
        }
      } finally {
        if (!cancelled) {
          setMembershipLoading(false);
        }
      }
    };

    void loadStudioAccess();

    return () => {
      cancelled = true;
    };
  }, [authLoading, post?.id, supabase, user?.id]);

  return (
    <DialogPrimitive.Root open={Boolean(post)} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={dialogOverlayClass} />
        <DialogPrimitive.Content className={dialogContentClass}>
          {post && (
            <div className="relative max-h-[88vh] overflow-y-auto">
              <button
                type="button"
                onClick={onClose}
                className={modalCloseButtonClass}
                aria-label="닫기"
              >
                <X className="h-4 w-4 md:h-5 md:w-5" />
              </button>

              <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-white/[0.07] to-white/[0.02]">
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.title ?? 'Studio post image'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/45">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              </div>

              <div className="space-y-5 p-6 md:p-8">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                    {formatStudioDate(post.created_at)}
                  </p>
                  <DialogPrimitive.Title className="text-2xl font-semibold tracking-tight text-white md:text-4xl">
                    {post.title?.trim() || 'Untitled Post'}
                  </DialogPrimitive.Title>
                </div>

                <div className="h-px w-full bg-white/10" />

                <DialogPrimitive.Description asChild>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-white/80 md:text-base">
                    {post.content?.trim() || '내용이 없습니다.'}
                  </p>
                </DialogPrimitive.Description>

                <div className="h-px w-full bg-white/10" />

                <section className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-white md:text-xl">
                        Studio 멤버십 전용 미디어
                      </h4>
                      {hasActiveMembership && (
                        <span className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-white/55">
                      Studio 전용 이미지/영상은 멤버십 활성 사용자만 볼 수 있습니다.
                    </p>
                  </div>

                  {membershipError && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
                      멤버십 상태 확인 실패: {membershipError}
                    </div>
                  )}

                  {authLoading || membershipLoading ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
                      멤버십 상태를 확인하는 중입니다...
                    </div>
                  ) : !user ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-sm font-semibold text-white">멤버십 가입이 필요합니다.</p>
                      <p className="mt-2 text-sm text-white/60">
                        로그인 후 멤버십 가입을 진행하면 전용 미디어를 볼 수 있습니다.
                      </p>
                      <div className="mt-4">
                        <Link
                          href="/signin"
                          className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
                        >
                          로그인
                        </Link>
                      </div>
                    </div>
                  ) : !hasActiveMembership ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-sm font-semibold text-white">
                        Studio 전용 미디어는 구독자 전용입니다.
                      </p>
                      <p className="mt-2 text-sm text-white/60">
                        멤버십 가입 후 이 게시글의 원본 이미지/영상을 볼 수 있습니다.
                      </p>
                      <div className="mt-4">
                        <StudioSubscribeButton
                          studioPostId={post.id}
                          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
                        />
                      </div>
                    </div>
                  ) : (
                    <StudioProtectedMedia studioPostId={post.id} />
                  )}
                </section>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function StudioWriteModal({
  open,
  onOpenChange,
  form,
  onChange,
  onSubmit,
  submitting,
  error
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: StudioWriteForm;
  onChange: (patch: Partial<StudioWriteForm>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={dialogOverlayClass} />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0a0a0a] p-5 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-300 md:rounded-3xl md:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-xl font-semibold tracking-tight text-white">
                Write
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-white/55">
                Studio 게시물을 작성하면 바로 마퀴 행에 반영됩니다.
              </DialogPrimitive.Description>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              aria-label="작성 모달 닫기"
              disabled={submitting}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {error ? (
              <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="studio-write-title" className={fieldLabelClass}>
                Title
              </label>
              <input
                id="studio-write-title"
                type="text"
                value={form.title}
                onChange={(event) => onChange({ title: event.target.value })}
                placeholder="작업 제목을 입력하세요"
                className={inputClass}
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="studio-write-content" className={fieldLabelClass}>
                Content
              </label>
              <textarea
                id="studio-write-content"
                value={form.content}
                onChange={(event) => onChange({ content: event.target.value })}
                placeholder="작업 내용, 후기, 비하인드 등을 작성하세요"
                className={textareaClass}
                rows={6}
                maxLength={4000}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="studio-write-image-url" className={fieldLabelClass}>
                Image URL (optional)
              </label>
              <input
                id="studio-write-image-url"
                type="url"
                value={form.imageUrl}
                onChange={(event) => onChange({ imageUrl: event.target.value })}
                placeholder="https://example.com/image.jpg"
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                disabled={submitting}
              >
                취소
              </button>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black shadow-md transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={submitting}
              >
                {submitting ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default function StudioSection() {
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();
  const isAdmin = isAdminUserLike(user);

  const [studioPosts, setStudioPosts] = useState<StudioPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<StudioPost | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [writeSubmitting, setWriteSubmitting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writeForm, setWriteForm] = useState<StudioWriteForm>({
    title: '',
    content: '',
    imageUrl: ''
  });

  const rows = useMemo(() => chunkPosts(studioPosts, STUDIO_COLUMNS_PER_ROW), [studioPosts]);

  const fetchStudioPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError(null);

    try {
      const { data, error } = await (supabase as never)
        .from('studio_posts')
        .select('id,title,content,image_url,created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setStudioPosts(Array.isArray(data) ? (data as StudioPost[]) : []);
    } catch (error) {
      setStudioPosts([]);
      setPostsError(
        error instanceof Error ? error.message : '스튜디오 게시물을 불러오지 못했습니다.'
      );
    } finally {
      setPostsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchStudioPosts();
  }, [fetchStudioPosts]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getRowDuration = useCallback(
    (rowIndex: number) => {
      const durations = [28, 22, 25, 20, 24, 18, 26];
      const base = durations[rowIndex % durations.length];
      return isMobile ? base * 1.45 : base;
    },
    [isMobile]
  );

  const handleWriteFormChange = (patch: Partial<StudioWriteForm>) => {
    setWriteForm((prev) => ({ ...prev, ...patch }));
  };

  const resetWriteForm = () => {
    setWriteForm({ title: '', content: '', imageUrl: '' });
    setWriteError(null);
  };

  const handleOpenWrite = () => {
    if (!isAdmin) return;
    setWriteError(null);
    setIsWriteModalOpen(true);
  };

  const handleWriteModalChange = (open: boolean) => {
    setIsWriteModalOpen(open);
    if (!open && !writeSubmitting) {
      setWriteError(null);
    }
  };

  const handleSubmitWrite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id || !isAdmin) {
      setWriteError('관리자 권한이 필요합니다.');
      return;
    }

    const title = writeForm.title.trim();
    const content = writeForm.content.trim();
    const imageUrl = writeForm.imageUrl.trim();

    if (!title) {
      setWriteError('제목을 입력해 주세요.');
      return;
    }

    if (!content) {
      setWriteError('내용을 입력해 주세요.');
      return;
    }

    setWriteSubmitting(true);
    setWriteError(null);

    try {
      const { data, error } = await (supabase as never)
        .from('studio_posts')
        .insert({
          title,
          content,
          image_url: imageUrl || '',
          user_id: user.id
        })
        .select('id,title,content,image_url,created_at')
        .single();

      if (error) {
        throw error;
      }

      const insertedPost = (data ?? null) as StudioPost | null;
      if (!insertedPost) {
        await fetchStudioPosts();
      } else {
        setStudioPosts((prev) => [insertedPost, ...prev.filter((post) => post.id !== insertedPost.id)]);
      }

      resetWriteForm();
      setIsWriteModalOpen(false);
    } catch (error) {
      setWriteError(error instanceof Error ? error.message : '게시물 작성에 실패했습니다.');
    } finally {
      setWriteSubmitting(false);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const renderRow = (rowIndex: number) => {
    const rowItems = rows[rowIndex] ?? [];
    if (rowItems.length === 0) return null;

    const loopSeed = buildLoopSeed(rowItems);
    const duplicatedItems = [...loopSeed, ...loopSeed];
    const isRowPaused = !isPlaying || hoveredRowIndex === rowIndex;

    return (
      <div
        key={`studio-row-${rowIndex}`}
        className="overflow-hidden"
        onMouseEnter={() => setHoveredRowIndex(rowIndex)}
        onMouseLeave={() => setHoveredRowIndex((prev) => (prev === rowIndex ? null : prev))}
      >
        <div
          className="flex gap-4"
          style={{
            width: 'fit-content',
            animationName: 'studio-marquee-rtl',
            animationDuration: `${getRowDuration(rowIndex)}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationPlayState: isRowPaused ? 'paused' : 'running',
            willChange: 'transform'
          }}
        >
          {duplicatedItems.map((post, index) => {
            const excerpt = getExcerpt(post.content);
            return (
              <button
                key={`${post.id}-${rowIndex}-${index}`}
                type="button"
                onClick={() => setSelectedPost(post)}
                className="group relative h-[130px] w-[220px] flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left shadow-[0_14px_34px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-[0_20px_42px_rgba(0,0,0,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 md:h-[240px] md:w-[400px] md:rounded-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent" />
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.title?.trim() || 'Studio post image'}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/[0.04] via-transparent to-white/[0.02]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/35 md:h-14 md:w-14">
                      <ImageIcon className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                  </div>
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/5 transition-opacity duration-300 group-hover:from-black/70" />
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-white/[0.03]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.14),transparent_42%)]" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-3 md:p-5">
                  <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 backdrop-blur-sm md:rounded-xl md:px-4 md:py-3">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/60 md:text-[11px]">
                      {formatStudioDate(post.created_at)}
                    </p>
                    <h3 className="truncate text-sm font-semibold tracking-tight text-white md:text-xl">
                      {post.title?.trim() || 'Untitled Post'}
                    </h3>
                    {excerpt ? (
                      <p className="hidden text-xs leading-relaxed text-white/70 md:block">{excerpt}</p>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <style jsx global>{`
        @keyframes studio-marquee-rtl {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(calc(-50% - ${MARQUEE_GAP_REM / 2}rem), 0, 0);
          }
        }
      `}</style>

      <section
        id="studio"
        className="relative flex min-h-screen max-w-full flex-col justify-center overflow-hidden bg-black py-20 text-white"
      >
        <div className="mb-10 flex items-start justify-between gap-4 px-4 md:px-8 lg:px-16">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.34em] text-white/45">Studio</p>
            <h2 className="text-4xl tracking-tight md:text-5xl">Studio</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-white/55 md:text-base">
              최근 작업 기록과 스튜디오 게시물을 둘러보세요.
            </p>
          </div>

          {!authLoading && isAdmin ? (
            <button
              type="button"
              onClick={handleOpenWrite}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-medium text-white/90 shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <PencilLine className="h-4 w-4" />
              Write
            </button>
          ) : null}
        </div>

        <div className="mb-12 space-y-4 px-4 md:px-6 2xl:px-16">
          {postsLoading ? (
            Array.from({ length: 2 }).map((_, rowIndex) => (
              <div key={`studio-skeleton-row-${rowIndex}`} className="overflow-hidden">
                <div className="flex gap-4" style={{ width: 'fit-content' }}>
                  {Array.from({ length: 3 }).map((__, cardIndex) => (
                    <div
                      key={`studio-skeleton-${rowIndex}-${cardIndex}`}
                      className="h-[130px] w-[220px] overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] shadow-[0_14px_34px_rgba(0,0,0,0.28)] md:h-[240px] md:w-[400px] md:rounded-2xl"
                    >
                      <div className="h-full w-full animate-pulse bg-white/[0.05]" />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-6 text-sm text-white/80">
              No studio posts yet.
              {postsError ? <p className="mt-2 text-xs text-red-300/90">{postsError}</p> : null}
            </div>
          ) : (
            rows.map((_, rowIndex) => renderRow(rowIndex))
          )}
        </div>

        <div className="mt-6 flex justify-end px-4 md:px-8 lg:px-16">
          <button
            type="button"
            onClick={togglePlayPause}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={isPlaying ? '일시정지' : '재생'}
            disabled={rows.length === 0}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 text-white" fill="white" />
            ) : (
              <Play className="h-5 w-5 text-white" fill="white" />
            )}
          </button>
        </div>
      </section>

      <StudioDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />

      <StudioWriteModal
        open={isWriteModalOpen}
        onOpenChange={handleWriteModalChange}
        form={writeForm}
        onChange={handleWriteFormChange}
        onSubmit={handleSubmitWrite}
        submitting={writeSubmitting}
        error={writeError}
      />
    </>
  );
}

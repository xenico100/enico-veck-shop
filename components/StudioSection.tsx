'use client';

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  ChevronDown,
  Clapperboard,
  ImageIcon,
  Lock,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import StudioProtectedMedia from '@/components/StudioProtectedMedia';
import StudioSubscribeButton from '@/components/StudioSubscribeButton';
import { useToast } from '@/components/ui/Toasts/use-toast';
import { createClient } from '@/utils/supabase/client';
import { isAdminUserLike } from '@/utils/service-posts';
import {
  normalizeRequiredMembershipLevel,
  resolveStudioMembershipTierLevel
} from '@/utils/studio-membership-tier';

type StudioPost = {
  id: string;
  title: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string | null;
  is_placeholder?: boolean;
  required_membership_level?: number | null;
  required_membership_label?: string;
};

type StudioWriteForm = {
  title: string;
  content: string;
  imageUrl: string;
};

type StudioMembershipApiData = {
  has_active_subscription?: boolean;
  selected_membership?: string | null;
  plan_amount?: number | string | null;
};

type StudioMembershipApiResponse = {
  data?: StudioMembershipApiData;
  message?: string;
};

type StudioMediaKind = 'image' | 'video';

type StudioShortsMediaItem = {
  id: string;
  kind: StudioMediaKind;
  url: string;
  mime: string | null;
};

type StudioShortsMediaResponse = {
  data?: StudioShortsMediaItem[];
  message?: string;
};

type StudioMediaBatchItem = {
  postId: string;
  videoUrl: string | null;
  fallbackImageUrl: string | null;
  hasVideo: boolean;
  showing_public_only?: boolean;
};

type StudioMediaBatchResponse = {
  data?: StudioMediaBatchItem[];
  message?: string;
};

type StudioShortsMediaState = {
  loading: boolean;
  loaded: boolean;
  videoUrl: string | null;
  fallbackImageUrl: string | null;
  error: string | null;
  retryCount: number;
};

type StudioSectionProps = {
  studioPostIdFromQuery: string | null;
  queryString: string;
};

type StudioRowAccessRule = {
  key: 'free' | 'tier_4900' | 'tier_13900' | 'tier_79000';
  rowLabel: string;
  membershipLabel: string;
  requiredLevel: number;
};

type StudioDisplayRow = {
  rowId: string;
  rowLabel: string;
  rowRule: StudioRowAccessRule;
  posts: StudioPost[];
};

const STUDIO_COLUMNS_PER_ROW = 3;
const MARQUEE_GAP_REM = 1; // gap-4 == 1rem
const PREMIUM_ROW_PRICE_DISPLAY = 79000;
const FREE_TRIAL_POST_LIMIT = 3;
const STUDIO_ROW_ACCESS_RULES: StudioRowAccessRule[] = [
  {
    key: 'free',
    rowLabel: '무료 일반 멤버십',
    membershipLabel: '무료 체험 3개',
    requiredLevel: 0
  },
  {
    key: 'tier_4900',
    rowLabel: '가로 영상 플랫폼',
    membershipLabel: '멤버십 월 4,900원 · 가로 영상',
    requiredLevel: 1
  },
  {
    key: 'tier_13900',
    rowLabel: '숏폼 영상 플랫폼',
    membershipLabel: '멤버십 월 13,900원 · 숏폼',
    requiredLevel: 2
  },
  {
    key: 'tier_79000',
    rowLabel: '포토+글 블로그 플랫폼',
    membershipLabel: `멤버십 월 ${PREMIUM_ROW_PRICE_DISPLAY.toLocaleString(
      'ko-KR'
    )}원 · 블로그`,
    requiredLevel: 3
  }
];

const resolveStudioRowRule = (requiredLevel: unknown) => {
  const normalized = normalizeRequiredMembershipLevel(requiredLevel);
  return (
    STUDIO_ROW_ACCESS_RULES.find((rule) => rule.requiredLevel === normalized) ??
    STUDIO_ROW_ACCESS_RULES[0]
  );
};

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

const hasMissingRequiredMembershipLevelColumnError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();
  return (
    combined.includes('required_membership_level') &&
    combined.includes('studio_posts')
  );
};

const buildPlaceholderPost = (
  rowRule: StudioRowAccessRule,
  rowId: string,
  slotIndex: number
): StudioPost => ({
  id: `__studio-placeholder-${rowId}-${slotIndex}`,
  title: `${rowRule.membershipLabel} 게시물 준비중`,
  content:
    '게시물이 부족한 구간입니다. 관리자에서 Studio 게시물을 추가하면 여기에 표시됩니다.',
  image_url: null,
  created_at: null,
  is_placeholder: true,
  required_membership_level: rowRule.requiredLevel,
  required_membership_label: rowRule.membershipLabel
});

const buildDisplayRow = (
  rowRule: StudioRowAccessRule,
  rowId: string,
  rowLabel: string,
  rowItems: StudioPost[]
): StudioDisplayRow => {
  if (rowItems.length >= STUDIO_COLUMNS_PER_ROW) {
    return {
      rowId,
      rowLabel,
      rowRule,
      posts: rowItems
    };
  }

  const filled = [...rowItems];
  while (filled.length < STUDIO_COLUMNS_PER_ROW) {
    filled.push(buildPlaceholderPost(rowRule, rowId, filled.length));
  }

  return {
    rowId,
    rowLabel,
    rowRule,
    posts: filled
  };
};

const buildTierRows = (posts: StudioPost[]): StudioDisplayRow[] => {
  const postsByLevel = new Map<number, StudioPost[]>();

  posts.forEach((post) => {
    const requiredLevel = normalizeRequiredMembershipLevel(
      post.required_membership_level
    );
    const rowRule = resolveStudioRowRule(requiredLevel);
    const current = postsByLevel.get(rowRule.requiredLevel) ?? [];
    current.push({
      ...post,
      required_membership_level: rowRule.requiredLevel,
      required_membership_label: rowRule.membershipLabel
    });
    postsByLevel.set(rowRule.requiredLevel, current);
  });

  const displayRows: StudioDisplayRow[] = [];
  const freeRule = STUDIO_ROW_ACCESS_RULES[0];
  const freePosts = (postsByLevel.get(freeRule.requiredLevel) ?? []).slice(
    0,
    FREE_TRIAL_POST_LIMIT
  );

  displayRows.push(
    buildDisplayRow(
      freeRule,
      `${freeRule.key}-trial`,
      freeRule.rowLabel,
      freePosts
    )
  );

  STUDIO_ROW_ACCESS_RULES.slice(1).forEach((rule) => {
    const rowItems = postsByLevel.get(rule.requiredLevel) ?? [];
    displayRows.push(
      buildDisplayRow(rule, `${rule.key}-1`, rule.rowLabel, rowItems)
    );
  });

  return displayRows;
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

const getStudioPostCreatedAtMs = (post: StudioPost) => {
  const parsed = Date.parse(post.created_at || '');
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};

const SHORTS_PRIORITY_BY_TIER_LEVEL: Record<number, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3
};

const sortStudioShortsPosts = (posts: StudioPost[]) =>
  [...posts].sort((left, right) => {
    const leftLevel = normalizeRequiredMembershipLevel(
      left.required_membership_level
    );
    const rightLevel = normalizeRequiredMembershipLevel(
      right.required_membership_level
    );
    const leftPriority = SHORTS_PRIORITY_BY_TIER_LEVEL[leftLevel] ?? 99;
    const rightPriority = SHORTS_PRIORITY_BY_TIER_LEVEL[rightLevel] ?? 99;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return getStudioPostCreatedAtMs(right) - getStudioPostCreatedAtMs(left);
  });

const buildInitialShortsMediaState = (): StudioShortsMediaState => ({
  loading: false,
  loaded: false,
  videoUrl: null,
  fallbackImageUrl: null,
  error: null,
  retryCount: 0
});

const SHORTS_INSTAGRAM_STYLE_DEFAULT_VOLUME = 0.35;
const SHORTS_MEDIA_FETCH_MAX_RETRY = 3;
const SHORTS_WARMUP_POST_LIMIT = 18;
const clampShortsVolume = (value: number) =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

function StudioDetailModal({
  post,
  onClose,
  onOpenShorts,
  viewerMembershipTierLevel,
  viewerMembershipTierLoading
}: {
  post: StudioPost | null;
  onClose: () => void;
  onOpenShorts: (postId: string) => void;
  viewerMembershipTierLevel: number;
  viewerMembershipTierLoading: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const hasActiveMembership = viewerMembershipTierLevel > 0;

  const requiredTierLevel = post?.required_membership_level ?? 0;
  const requiredTierLabel = post?.required_membership_label ?? '일반 멤버십';
  const isRowTierLocked =
    Boolean(post) &&
    requiredTierLevel > 0 &&
    !viewerMembershipTierLoading &&
    viewerMembershipTierLevel < requiredTierLevel;

  return (
    <DialogPrimitive.Root
      open={Boolean(post)}
      onOpenChange={(open) => !open && onClose()}
    >
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

              <div className="relative min-h-[220px] w-full overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#111111] via-[#0a0a0a] to-black md:min-h-[320px]">
                {post.image_url ? (
                  <>
                    <img
                      src={post.image_url}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="relative flex min-h-[220px] items-center justify-center p-3 md:min-h-[320px] md:p-6">
                      <img
                        src={post.image_url}
                        alt={post.title ?? 'Studio post image'}
                        className="max-h-[58vh] w-auto max-w-full rounded-xl object-contain shadow-[0_22px_50px_rgba(0,0,0,0.45)] md:rounded-2xl"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/45">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                {isRowTierLocked && (
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-black/45" />
                    <div
                      className="absolute inset-0 opacity-35"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 14px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 14px)'
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                        <Lock className="h-3.5 w-3.5" />
                        Locked · {requiredTierLabel}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-5 p-6 md:p-8">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                    {formatStudioDate(post.created_at)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                        requiredTierLevel === 0
                          ? 'border-sky-300/30 bg-sky-500/10 text-sky-100'
                          : 'border-white/15 bg-white/5 text-white/70'
                      }`}
                    >
                      {requiredTierLabel}
                    </span>
                    {isRowTierLocked ? (
                      <span className="inline-flex items-center rounded-full border border-amber-300/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100">
                        잠금
                      </span>
                    ) : null}
                  </div>
                  <DialogPrimitive.Title className="text-2xl font-semibold tracking-tight text-white md:text-4xl">
                    {post.title?.trim() || 'Untitled Post'}
                  </DialogPrimitive.Title>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenShorts(post.id);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                    >
                      <Clapperboard className="h-3.5 w-3.5" />
                      숏폼 모드
                    </button>
                  </div>
                </div>

                <div className="h-px w-full bg-white/10" />

                {isRowTierLocked ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-sm font-semibold text-white">
                      이 게시물은 {requiredTierLabel} 전용으로 잠겨 있습니다.
                    </p>
                    <p className="mt-2 text-sm text-white/60">
                      {user
                        ? '현재 멤버십 등급으로는 게시물 본문을 볼 수 없습니다. 상위 멤버십으로 가입/변경해 주세요.'
                        : '로그인 후 해당 멤버십에 가입하면 게시물 본문을 볼 수 있습니다.'}
                    </p>
                    <div className="mt-4">
                      {user ? (
                        <StudioSubscribeButton
                          studioPostId={post.id}
                          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
                        />
                      ) : (
                        <Link
                          href="/signin"
                          className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
                        >
                          로그인
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <DialogPrimitive.Description asChild>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-white/80 md:text-base">
                      {post.content?.trim() || '내용이 없습니다.'}
                    </p>
                  </DialogPrimitive.Description>
                )}

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
                      기본은 멤버십 전용이며, 일반 공개 체크 미디어는 비구독자도
                      볼 수 있습니다.
                    </p>
                  </div>

                  {authLoading || viewerMembershipTierLoading ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
                      멤버십 상태를 확인하는 중입니다...
                    </div>
                  ) : isRowTierLocked ? (
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-5">
                      <p className="text-sm font-semibold text-white">
                        {requiredTierLabel} 이상에서만 이 게시물의 전용 미디어를
                        볼 수 있습니다.
                      </p>
                      <p className="mt-2 text-sm text-white/70">
                        일반 공개 체크된 미디어는 비구독자도 볼 수 있지만, 전용
                        미디어 전체는 해당 등급 가입자에게만 열립니다.
                      </p>
                      <div className="mt-4">
                        {user ? (
                          <StudioSubscribeButton
                            studioPostId={post.id}
                            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
                          />
                        ) : (
                          <Link
                            href="/signin"
                            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
                          >
                            로그인
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : !user ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-sm font-semibold text-white">
                        멤버십 가입이 필요합니다.
                      </p>
                      <p className="mt-2 text-sm text-white/60">
                        로그인 후 멤버십 가입을 진행하면 전용 미디어를 볼 수
                        있습니다.
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
                        멤버십 가입 후 이 게시글의 원본 이미지/영상을 볼 수
                        있습니다.
                      </p>
                      <div className="mt-4">
                        <StudioSubscribeButton
                          studioPostId={post.id}
                          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
                        />
                      </div>
                    </div>
                  ) : null}

                  {!authLoading &&
                  !viewerMembershipTierLoading &&
                  !isRowTierLocked ? (
                    <StudioProtectedMedia studioPostId={post.id} />
                  ) : null}
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
              <label
                htmlFor="studio-write-image-url"
                className={fieldLabelClass}
              >
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

function StudioShortsModal({
  open,
  onOpenChange,
  posts,
  initialPostId,
  onOpenPost,
  viewerMembershipTierLevel,
  viewerMembershipTierLoading,
  isAuthenticated,
  isMobile
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: StudioPost[];
  initialPostId: string | null;
  onOpenPost: (post: StudioPost) => void;
  viewerMembershipTierLevel: number;
  viewerMembershipTierLoading: boolean;
  isAuthenticated: boolean;
  isMobile: boolean;
}) {
  const shortsPosts = useMemo(
    () => sortStudioShortsPosts(posts.filter((post) => !post.is_placeholder)),
    [posts]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(SHORTS_INSTAGRAM_STYLE_DEFAULT_VOLUME);
  const [autoplayMutedFallback, setAutoplayMutedFallback] = useState(false);
  const [videoFitByPostId, setVideoFitByPostId] = useState<
    Record<string, 'cover' | 'contain'>
  >({});
  const [mediaByPostId, setMediaByPostId] = useState<
    Record<string, StudioShortsMediaState>
  >({});
  const mediaByPostIdRef = useRef<Record<string, StudioShortsMediaState>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const discoveringVideoRef = useRef(false);
  const wheelLockedRef = useRef(false);
  const previousNonZeroVolumeRef = useRef(
    SHORTS_INSTAGRAM_STYLE_DEFAULT_VOLUME
  );

  useEffect(() => {
    mediaByPostIdRef.current = mediaByPostId;
  }, [mediaByPostId]);

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, shortsPosts.length);
    videoRefs.current = videoRefs.current.slice(0, shortsPosts.length);
  }, [shortsPosts.length]);

  const applyShortsAudioState = useCallback(
    (video: HTMLVideoElement | null) => {
      if (!video) return;
      const clampedVolume = clampShortsVolume(volume);
      const shouldMute = muted || clampedVolume <= 0;
      video.defaultMuted = shouldMute;
      video.volume = clampedVolume;
      video.muted = shouldMute;
    },
    [muted, volume]
  );

  const playVideoWithAutoplayFallback = useCallback(
    async (video: HTMLVideoElement | null) => {
      if (!video) return false;

      try {
        applyShortsAudioState(video);
        await video.play();
        setAutoplayMutedFallback(false);
        return true;
      } catch {
        video.defaultMuted = true;
        video.muted = true;
        setMuted(true);
        setAutoplayMutedFallback(true);
        try {
          await video.play();
          return true;
        } catch {
          return false;
        }
      }
    },
    [applyShortsAudioState]
  );

  const handleToggleMuted = useCallback(() => {
    setMuted((prev) => {
      if (prev) {
        if (volume <= 0) {
          setVolume(previousNonZeroVolumeRef.current);
        }
        return false;
      }

      if (volume > 0) {
        previousNonZeroVolumeRef.current = clampShortsVolume(volume);
      }
      return true;
    });
  }, [volume]);

  const handleVolumeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextVolume = clampShortsVolume(Number(event.target.value) / 100);
      setVolume(nextVolume);
      if (nextVolume > 0) {
        previousNonZeroVolumeRef.current = nextVolume;
      }
      setMuted(nextVolume <= 0);
    },
    []
  );

  const loadBatchMedia = useCallback(async (postIds: string[]) => {
    const normalizedIds = Array.from(
      new Set(
        postIds
          .map((id) => (typeof id === 'string' ? id.trim() : ''))
          .filter(Boolean)
      )
    );
    const targetIds = normalizedIds.filter((id) => {
      const current = mediaByPostIdRef.current[id];
      if (current?.loading) return false;
      if (current?.videoUrl) return false;
      if (current?.loaded && !current.error) return false;
      if ((current?.retryCount ?? 0) >= SHORTS_MEDIA_FETCH_MAX_RETRY)
        return false;
      return true;
    });
    if (targetIds.length === 0)
      return {} as Record<string, StudioMediaBatchItem>;

    setMediaByPostId((prev) => {
      const next = { ...prev };
      targetIds.forEach((id) => {
        const prevState = prev[id] ?? buildInitialShortsMediaState();
        next[id] = {
          ...prevState,
          loading: true,
          error: null
        };
      });
      return next;
    });

    try {
      const response = await fetch('/api/studio/media/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ postIds: targetIds })
      });
      const payload = (await response
        .json()
        .catch(() => ({}))) as StudioMediaBatchResponse;
      if (!response.ok) {
        throw new Error(
          payload?.message || '게시물 미디어를 불러오지 못했습니다.'
        );
      }

      const rows = Array.isArray(payload?.data) ? payload.data : [];
      const rowMap = new Map<string, StudioMediaBatchItem>();
      rows.forEach((row) => {
        if (row?.postId) {
          rowMap.set(row.postId, row);
        }
      });

      setMediaByPostId((prev) => {
        const next = { ...prev };
        targetIds.forEach((id) => {
          const incoming = rowMap.get(id);
          const prevState = prev[id] ?? buildInitialShortsMediaState();
          const hasVideo = Boolean(incoming?.videoUrl);
          next[id] = {
            loading: false,
            loaded: true,
            videoUrl: incoming?.videoUrl ?? null,
            fallbackImageUrl: incoming?.fallbackImageUrl ?? null,
            error: hasVideo ? null : '영상 미디어가 없습니다.',
            retryCount: hasVideo
              ? prevState.retryCount
              : (prevState.retryCount ?? 0) + 1
          };
        });
        return next;
      });

      return rows.reduce<Record<string, StudioMediaBatchItem>>((acc, row) => {
        if (row?.postId) {
          acc[row.postId] = row;
        }
        return acc;
      }, {});
    } catch (error) {
      setMediaByPostId((prev) => {
        const next = { ...prev };
        targetIds.forEach((id) => {
          const prevState = prev[id] ?? buildInitialShortsMediaState();
          next[id] = {
            loading: false,
            loaded: false,
            videoUrl: null,
            fallbackImageUrl: null,
            error:
              error instanceof Error
                ? error.message
                : '게시물 미디어를 불러오지 못했습니다.',
            retryCount: (prevState.retryCount ?? 0) + 1
          };
        });
        return next;
      });
      return {} as Record<string, StudioMediaBatchItem>;
    }
  }, []);

  const scrollToIndex = useCallback(
    (nextIndex: number, behavior: ScrollBehavior = 'smooth') => {
      if (shortsPosts.length === 0) return;
      const clamped = Math.max(0, Math.min(shortsPosts.length - 1, nextIndex));
      const target = slideRefs.current[clamped];
      if (!target) return;
      setActiveIndex((prev) => (prev === clamped ? prev : clamped));
      target.scrollIntoView({ behavior, block: 'start' });
    },
    [shortsPosts.length]
  );

  useEffect(() => {
    if (!open || shortsPosts.length === 0) return;

    const matchedIndex = initialPostId
      ? shortsPosts.findIndex((post) => post.id === initialPostId)
      : -1;
    const preferredIndex = matchedIndex >= 0 ? matchedIndex : 0;
    const preferredPostId = shortsPosts[preferredIndex]?.id ?? '';
    const preferredHasVideo = Boolean(
      mediaByPostIdRef.current[preferredPostId]?.videoUrl
    );
    const cachedFreeVideoIndex = shortsPosts.findIndex((post) => {
      const requiredLevel = normalizeRequiredMembershipLevel(
        post.required_membership_level
      );
      if (requiredLevel !== 0) return false;
      return Boolean(mediaByPostIdRef.current[post.id]?.videoUrl);
    });
    const cachedVideoIndex = shortsPosts.findIndex((post) =>
      Boolean(mediaByPostIdRef.current[post.id]?.videoUrl)
    );
    const nextActiveIndex = preferredHasVideo
      ? preferredIndex
      : cachedFreeVideoIndex >= 0
        ? cachedFreeVideoIndex
        : cachedVideoIndex >= 0
          ? cachedVideoIndex
          : preferredIndex;
    setActiveIndex(nextActiveIndex);

    const frameId = window.requestAnimationFrame(() => {
      const target = slideRefs.current[nextActiveIndex];
      if (target) target.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [open, initialPostId, shortsPosts]);

  useEffect(() => {
    if (shortsPosts.length === 0) return;
    const freePosts = shortsPosts.filter(
      (post) =>
        normalizeRequiredMembershipLevel(post.required_membership_level) === 0
    );
    const premiumPosts = shortsPosts.filter(
      (post) =>
        normalizeRequiredMembershipLevel(post.required_membership_level) > 0
    );
    const prioritized = [...freePosts, ...premiumPosts].slice(
      0,
      Math.min(shortsPosts.length, SHORTS_WARMUP_POST_LIMIT)
    );
    void loadBatchMedia(prioritized.map((post) => post.id));
  }, [loadBatchMedia, shortsPosts]);

  useEffect(() => {
    if (!open || shortsPosts.length === 0) return;
    const prioritizedIds = new Set<string>();
    const normalizedInitialPostId = (initialPostId || '').trim();
    if (normalizedInitialPostId) {
      prioritizedIds.add(normalizedInitialPostId);
    }
    shortsPosts
      .slice(0, Math.min(shortsPosts.length, 8))
      .forEach((post) => prioritizedIds.add(post.id));
    void loadBatchMedia(Array.from(prioritizedIds));
  }, [initialPostId, loadBatchMedia, open, shortsPosts]);

  useEffect(() => {
    if (!open) return;
    setAutoplayMutedFallback(false);
    setMuted(!isMobile);
    setVolume((prev) =>
      clampShortsVolume(prev) > 0
        ? clampShortsVolume(prev)
        : SHORTS_INSTAGRAM_STYLE_DEFAULT_VOLUME
    );
  }, [isMobile, open]);

  useEffect(() => {
    if (!open || shortsPosts.length === 0) return;
    const currentPost = shortsPosts[activeIndex];
    if (!currentPost) return;

    const currentMediaState = mediaByPostId[currentPost.id];
    if (!currentMediaState) return;
    if (currentMediaState.loading) return;
    if (!currentMediaState.loaded) return;
    if (currentMediaState.videoUrl) return;

    const freePlayableIndex = shortsPosts.findIndex((post) => {
      const requiredLevel = normalizeRequiredMembershipLevel(
        post.required_membership_level
      );
      if (requiredLevel !== 0) return false;
      return Boolean(mediaByPostId[post.id]?.videoUrl);
    });
    if (freePlayableIndex >= 0 && freePlayableIndex !== activeIndex) {
      scrollToIndex(freePlayableIndex);
      return;
    }

    const nextVideoIndex = shortsPosts.findIndex((post, index) => {
      if (index <= activeIndex) return false;
      return Boolean(mediaByPostId[post.id]?.videoUrl);
    });

    if (nextVideoIndex > activeIndex) {
      scrollToIndex(nextVideoIndex);
      return;
    }

    const upcomingIndexes = Array.from(
      { length: 4 },
      (_, offset) => activeIndex + offset + 1
    ).filter((index) => index >= 0 && index < shortsPosts.length);
    void loadBatchMedia(upcomingIndexes.map((index) => shortsPosts[index].id));
  }, [
    activeIndex,
    loadBatchMedia,
    mediaByPostId,
    open,
    scrollToIndex,
    shortsPosts
  ]);

  useEffect(() => {
    if (!open || shortsPosts.length === 0) return;
    const activePost = shortsPosts[activeIndex];
    if (!activePost) return;

    const state = mediaByPostId[activePost.id];
    if (!state) return;
    if (state.loading) return;
    if (state.videoUrl) return;
    if (state.retryCount >= SHORTS_MEDIA_FETCH_MAX_RETRY) return;

    const retryTimer = window.setTimeout(() => {
      void loadBatchMedia([activePost.id]);
    }, 260);

    return () => window.clearTimeout(retryTimer);
  }, [activeIndex, loadBatchMedia, mediaByPostId, open, shortsPosts]);

  useEffect(() => {
    if (!open || shortsPosts.length === 0) return;
    const activePost = shortsPosts[activeIndex];
    if (!activePost) return;

    const activeMediaState = mediaByPostId[activePost.id];
    if (activeMediaState?.videoUrl) return;

    const cachedFreeVideoIndex = shortsPosts.findIndex((post) => {
      const requiredLevel = normalizeRequiredMembershipLevel(
        post.required_membership_level
      );
      if (requiredLevel !== 0) return false;
      return Boolean(mediaByPostIdRef.current[post.id]?.videoUrl);
    });
    if (cachedFreeVideoIndex >= 0 && cachedFreeVideoIndex !== activeIndex) {
      scrollToIndex(cachedFreeVideoIndex, 'auto');
      return;
    }

    const cachedVideoIndex = shortsPosts.findIndex((post) =>
      Boolean(mediaByPostIdRef.current[post.id]?.videoUrl)
    );
    if (cachedVideoIndex >= 0 && cachedVideoIndex !== activeIndex) {
      scrollToIndex(cachedVideoIndex, 'auto');
      return;
    }

    if (discoveringVideoRef.current) return;
    let cancelled = false;

    const discoverFirstPlayableVideo = async () => {
      discoveringVideoRef.current = true;
      try {
        for (let index = 0; index < shortsPosts.length; index += 1) {
          if (cancelled) return;

          const postId = shortsPosts[index].id;
          if (mediaByPostIdRef.current[postId]?.videoUrl) {
            if (index !== activeIndex) {
              scrollToIndex(index, 'auto');
            }
            return;
          }

          const batchResult = await loadBatchMedia([postId]);
          const hasVideo =
            batchResult[postId]?.videoUrl ||
            mediaByPostIdRef.current[postId]?.videoUrl;
          if (cancelled) return;
          if (hasVideo) {
            if (index !== activeIndex) {
              scrollToIndex(index, 'auto');
            }
            return;
          }
        }
      } finally {
        discoveringVideoRef.current = false;
      }
    };

    void discoverFirstPlayableVideo();
    return () => {
      cancelled = true;
    };
  }, [
    activeIndex,
    loadBatchMedia,
    mediaByPostId,
    open,
    scrollToIndex,
    shortsPosts
  ]);

  useEffect(() => {
    if (!open || shortsPosts.length === 0) return;
    const activePost = shortsPosts[activeIndex];
    if (!activePost) return;

    const activeMediaState = mediaByPostId[activePost.id];
    if (!activeMediaState || !activeMediaState.loaded) return;
    if (activeMediaState.videoUrl) return;

    const firstFreeVideoIndex = shortsPosts.findIndex((post) => {
      const requiredLevel = normalizeRequiredMembershipLevel(
        post.required_membership_level
      );
      if (requiredLevel !== 0) return false;
      return Boolean(mediaByPostId[post.id]?.videoUrl);
    });
    if (firstFreeVideoIndex >= 0 && firstFreeVideoIndex !== activeIndex) {
      scrollToIndex(firstFreeVideoIndex);
      return;
    }

    const firstVideoIndex = shortsPosts.findIndex((post) =>
      Boolean(mediaByPostId[post.id]?.videoUrl)
    );
    if (firstVideoIndex >= 0 && firstVideoIndex !== activeIndex) {
      scrollToIndex(firstVideoIndex);
    }
  }, [activeIndex, mediaByPostId, open, scrollToIndex, shortsPosts]);

  useEffect(() => {
    if (!open || shortsPosts.length === 0) return;

    const nearIndexes = [
      activeIndex - 1,
      activeIndex,
      activeIndex + 1,
      activeIndex + 2
    ];
    const ids = nearIndexes
      .filter((index) => index >= 0 && index < shortsPosts.length)
      .map((index) => shortsPosts[index].id);
    if (ids.length > 0) {
      void loadBatchMedia(ids);
    }
  }, [activeIndex, loadBatchMedia, open, shortsPosts]);

  useEffect(() => {
    if (!open) return;
    const root = scrollContainerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIndex = -1;
        let bestRatio = 0;

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const indexRaw = (entry.target as HTMLElement).dataset.index;
          const index = Number(indexRaw);
          if (!Number.isFinite(index)) return;
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = index;
          }
        });

        if (bestIndex >= 0) {
          setActiveIndex((prev) => (prev === bestIndex ? prev : bestIndex));
        }
      },
      {
        root,
        threshold: [0.35, 0.55, 0.75]
      }
    );

    slideRefs.current.forEach((element, index) => {
      if (!element) return;
      element.dataset.index = String(index);
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [open, shortsPosts.length]);

  useEffect(() => {
    if (!open) return;
    videoRefs.current.forEach((video) => applyShortsAudioState(video));
  }, [applyShortsAudioState, mediaByPostId, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let retryTimer: number | null = null;
    let retries = 0;

    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index !== activeIndex) {
        video.pause();
      }
    });

    const activeVideo = videoRefs.current[activeIndex];
    if (!activeVideo) return;

    const run = async () => {
      const played = await playVideoWithAutoplayFallback(activeVideo);
      if (cancelled || played) return;
      if (retries >= 3) return;
      retries += 1;
      retryTimer = window.setTimeout(() => {
        void run();
      }, 220);
    };

    void run();
    return () => {
      cancelled = true;
      if (retryTimer != null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [activeIndex, mediaByPostId, open, playVideoWithAutoplayFallback]);

  useEffect(() => {
    if (!open) return;
    const watchdog = window.setInterval(() => {
      const activeVideo = videoRefs.current[activeIndex];
      if (!activeVideo) return;
      if (!activeVideo.paused) return;
      if (activeVideo.readyState < 2) return;
      void playVideoWithAutoplayFallback(activeVideo);
    }, 600);

    return () => {
      window.clearInterval(watchdog);
    };
  }, [activeIndex, open, playVideoWithAutoplayFallback]);

  useEffect(() => {
    if (!open) {
      videoRefs.current.forEach((video) => video?.pause());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        scrollToIndex(activeIndex + 1);
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        scrollToIndex(activeIndex - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, open, scrollToIndex]);

  useEffect(() => {
    if (!open) return;
    const root = scrollContainerRef.current;
    if (!root) return;

    const onWheel = (event: WheelEvent) => {
      const delta = event.deltaY;
      if (Math.abs(delta) < 20) return;

      event.preventDefault();
      if (wheelLockedRef.current) return;

      wheelLockedRef.current = true;
      if (delta > 0) {
        scrollToIndex(activeIndex + 1);
      } else {
        scrollToIndex(activeIndex - 1);
      }

      window.setTimeout(() => {
        wheelLockedRef.current = false;
      }, 420);
    };

    root.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      root.removeEventListener('wheel', onWheel);
      wheelLockedRef.current = false;
    };
  }, [activeIndex, open, scrollToIndex]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 bg-black text-white outline-none">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={`${modalCloseButtonClass} right-4 top-4 md:right-6 md:top-6`}
            aria-label="숏폼 모드 닫기"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-center px-4 pt-4">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur">
              <Clapperboard className="h-3.5 w-3.5" />
              Studio Shorts
            </div>
          </div>

          {shortsPosts.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <p className="text-base font-semibold">
                  표시할 Studio 게시물이 없습니다.
                </p>
                <p className="mt-2 text-sm text-white/60">
                  게시물을 추가한 뒤 숏폼 모드를 다시 열어주세요.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="absolute right-4 top-20 z-20 hidden flex-col gap-2 md:right-6 md:flex">
                <button
                  type="button"
                  onClick={() => scrollToIndex(activeIndex - 1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white/90 backdrop-blur transition hover:bg-white/20"
                  aria-label="이전 게시물"
                >
                  <Play
                    className="h-4 w-4 rotate-[-90deg]"
                    fill="currentColor"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToIndex(activeIndex + 1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white/90 backdrop-blur transition hover:bg-white/20"
                  aria-label="다음 게시물"
                >
                  <Play className="h-4 w-4 rotate-90" fill="currentColor" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleMuted}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white/90 backdrop-blur transition hover:bg-white/20"
                  aria-label={muted ? '음소거 해제' : '음소거'}
                >
                  {muted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <div className="w-36 rounded-2xl border border-white/15 bg-black/55 px-3 py-2 text-white/90 backdrop-blur">
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-white/65">
                    <span>Volume</span>
                    <span>{Math.round((muted ? 0 : volume) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(volume * 100)}
                    onChange={handleVolumeChange}
                    className="mt-2 h-1.5 w-full cursor-pointer accent-white"
                    aria-label="숏폼 볼륨 조절"
                  />
                  {autoplayMutedFallback ? (
                    <p className="mt-1.5 text-[10px] leading-relaxed text-white/60">
                      브라우저 정책으로 처음에는 무음 재생됩니다.
                    </p>
                  ) : null}
                </div>
              </div>

              <div
                ref={scrollContainerRef}
                className="h-[100dvh] overflow-y-auto snap-y snap-mandatory"
              >
                {shortsPosts.map((post, index) => {
                  const rowRule = resolveStudioRowRule(
                    post.required_membership_level
                  );
                  const mediaState =
                    mediaByPostId[post.id] ?? buildInitialShortsMediaState();
                  const previewPoster =
                    mediaState.fallbackImageUrl || post.image_url || null;
                  const fallbackImage = mediaState.fallbackImageUrl;
                  const isRowLocked =
                    rowRule.requiredLevel > 0 &&
                    !viewerMembershipTierLoading &&
                    viewerMembershipTierLevel < rowRule.requiredLevel;
                  const excerpt = getExcerpt(post.content, 180);

                  if (!mediaState.videoUrl) {
                    videoRefs.current[index] = null;
                  }

                  const videoFitMode = videoFitByPostId[post.id] ?? 'cover';
                  const videoFitClass =
                    videoFitMode === 'contain'
                      ? 'h-full w-full object-contain bg-black'
                      : 'h-full w-full object-cover';

                  return (
                    <article
                      key={`studio-shorts-${post.id}`}
                      ref={(element) => {
                        slideRefs.current[index] = element;
                      }}
                      className="relative flex min-h-[100dvh] snap-start items-center justify-center px-3 py-14 md:px-8 md:py-16"
                    >
                      <div className="w-full max-w-[min(100%,27.5rem)]">
                        <div className="overflow-hidden rounded-[24px] border border-white/15 bg-black shadow-[0_28px_70px_rgba(0,0,0,0.55)] md:rounded-[30px]">
                          <div className="relative aspect-[9/16] bg-black">
                            {mediaState.loading ? (
                              previewPoster ? (
                                <>
                                  <img
                                    src={previewPoster}
                                    alt={
                                      post.title?.trim() ||
                                      'Studio shorts preview'
                                    }
                                    className="h-full w-full object-cover"
                                    loading="eager"
                                    decoding="async"
                                  />
                                  <div className="absolute inset-0 bg-black/35" />
                                  <div className="absolute inset-x-0 bottom-4 flex justify-center">
                                    <div className="inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/78 backdrop-blur">
                                      영상 연결 중
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-sm text-white/60">
                                  영상 연결 중...
                                </div>
                              )
                            ) : mediaState.videoUrl ? (
                              <video
                                ref={(element) => {
                                  videoRefs.current[index] = element;
                                }}
                                src={mediaState.videoUrl}
                                poster={previewPoster || undefined}
                                controls={false}
                                controlsList="nodownload noplaybackrate noremoteplayback"
                                disablePictureInPicture
                                playsInline
                                autoPlay={index === activeIndex}
                                muted={muted}
                                loop
                                preload={
                                  index <= activeIndex + 2 ? 'auto' : 'metadata'
                                }
                                onLoadedMetadata={(event) => {
                                  const video = event.currentTarget;
                                  const fitMode =
                                    video.videoWidth > video.videoHeight
                                      ? 'contain'
                                      : 'cover';
                                  setVideoFitByPostId((prev) =>
                                    prev[post.id] === fitMode
                                      ? prev
                                      : { ...prev, [post.id]: fitMode }
                                  );
                                  if (index === activeIndex) {
                                    void playVideoWithAutoplayFallback(video);
                                  }
                                }}
                                onLoadedData={(event) => {
                                  if (index !== activeIndex) return;
                                  void playVideoWithAutoplayFallback(
                                    event.currentTarget
                                  );
                                }}
                                onCanPlay={(event) => {
                                  if (index !== activeIndex) return;
                                  void playVideoWithAutoplayFallback(
                                    event.currentTarget
                                  );
                                }}
                                onClick={(event) => {
                                  const video = event.currentTarget;
                                  if (isMobile && muted) {
                                    const nextVolume =
                                      clampShortsVolume(volume) > 0
                                        ? clampShortsVolume(volume)
                                        : previousNonZeroVolumeRef.current;
                                    if (nextVolume > 0) {
                                      previousNonZeroVolumeRef.current =
                                        nextVolume;
                                    }
                                    setVolume(nextVolume);
                                    setMuted(false);
                                    setAutoplayMutedFallback(false);
                                    video.defaultMuted = false;
                                    video.muted = false;
                                    video.volume = nextVolume;
                                    void video.play();
                                    return;
                                  }
                                  if (video.paused) {
                                    void playVideoWithAutoplayFallback(video);
                                    return;
                                  }
                                  video.pause();
                                }}
                                onContextMenu={(event) =>
                                  event.preventDefault()
                                }
                                className={`${videoFitClass} cursor-pointer`}
                              />
                            ) : fallbackImage &&
                              mediaState.retryCount >=
                                SHORTS_MEDIA_FETCH_MAX_RETRY ? (
                              <img
                                src={fallbackImage}
                                alt={
                                  post.title?.trim() || 'Studio post preview'
                                }
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-white/[0.04] px-6 text-center">
                                <ImageIcon className="h-8 w-8 text-white/35" />
                                <p className="text-sm text-white/65">
                                  {mediaState.retryCount >=
                                  SHORTS_MEDIA_FETCH_MAX_RETRY
                                    ? '이 게시물에는 노출 가능한 영상이 없습니다.'
                                    : '영상을 찾는 중입니다...'}
                                </p>
                              </div>
                            )}

                            {isRowLocked && !mediaState.videoUrl && (
                              <div className="pointer-events-none absolute inset-0 z-[1]">
                                <div className="absolute inset-0 bg-black/55" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                                    <Lock className="h-3.5 w-3.5" />
                                    {rowRule.membershipLabel}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 space-y-2 px-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                rowRule.requiredLevel === 0
                                  ? 'border-sky-300/30 bg-sky-500/10 text-sky-100'
                                  : isRowLocked
                                    ? 'border-amber-300/25 bg-amber-500/10 text-amber-100'
                                    : 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100'
                              }`}
                            >
                              {rowRule.membershipLabel}
                            </span>
                            <span className="text-xs text-white/45">
                              {index + 1} / {shortsPosts.length}
                            </span>
                          </div>
                          <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-white">
                            {post.title?.trim() || 'Untitled Post'}
                          </h3>
                          {excerpt ? (
                            <p className="line-clamp-3 text-sm leading-relaxed text-white/70">
                              {excerpt}
                            </p>
                          ) : null}
                          <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                            {formatStudioDate(post.created_at)}
                          </p>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                onOpenChange(false);
                                onOpenPost({
                                  ...post,
                                  required_membership_level:
                                    rowRule.requiredLevel,
                                  required_membership_label:
                                    rowRule.membershipLabel
                                });
                              }}
                              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                            >
                              상세 보기
                            </button>
                          </div>

                          {isRowLocked ? (
                            <div className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-3">
                              <p className="text-xs text-amber-100">
                                {rowRule.membershipLabel} 이상에서 전체 영상
                                재생이 가능합니다.
                              </p>
                              <div className="mt-2">
                                {isAuthenticated ? (
                                  <StudioSubscribeButton
                                    studioPostId={post.id}
                                    className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-neutral-200"
                                  />
                                ) : (
                                  <Link
                                    href="/signin"
                                    className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-neutral-200"
                                  >
                                    로그인
                                  </Link>
                                )}
                              </div>
                            </div>
                          ) : null}

                          {mediaState.error ? (
                            <p className="text-xs text-red-200/90">
                              {mediaState.error}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {index < shortsPosts.length - 1 ? (
                        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
                          <div className="inline-flex animate-bounce items-center gap-1 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/75 backdrop-blur">
                            <ChevronDown className="h-3.5 w-3.5" />
                            다음 게시물
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default function StudioSection({
  studioPostIdFromQuery,
  queryString
}: StudioSectionProps) {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = isAdminUserLike(user);

  const [studioPosts, setStudioPosts] = useState<StudioPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<StudioPost | null>(null);
  const [isShortsModalOpen, setIsShortsModalOpen] = useState(false);
  const [shortsInitialPostId, setShortsInitialPostId] = useState<string | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [writeSubmitting, setWriteSubmitting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writeForm, setWriteForm] = useState<StudioWriteForm>({
    title: '',
    content: '',
    imageUrl: ''
  });
  const [viewerMembershipTierLevel, setViewerMembershipTierLevel] = useState(0);
  const [viewerMembershipTierLoading, setViewerMembershipTierLoading] =
    useState(false);
  const [viewerMembershipLabel, setViewerMembershipLabel] =
    useState<string>('일반 멤버십');

  const displayRows = useMemo(() => buildTierRows(studioPosts), [studioPosts]);
  const shortsPosts = useMemo(
    () =>
      sortStudioShortsPosts(studioPosts.filter((post) => !post.is_placeholder)),
    [studioPosts]
  );

  const findPostWithRowMeta = useCallback(
    (postId: string) => {
      const normalizedId = postId.trim();
      if (!normalizedId) return null;

      for (const row of displayRows) {
        const rowRule = row.rowRule;
        const rowPosts = row.posts ?? [];
        const found = rowPosts.find(
          (post) => post.id === normalizedId && !post.is_placeholder
        );
        if (!found) continue;

        return {
          ...found,
          required_membership_level: rowRule.requiredLevel,
          required_membership_label: rowRule.membershipLabel
        } as StudioPost;
      }

      return null;
    },
    [displayRows]
  );

  const fetchStudioPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError(null);

    try {
      let queryResult = await (supabase as never)
        .from('studio_posts')
        .select(
          'id,title,content,image_url,created_at,required_membership_level'
        )
        .order('created_at', { ascending: false });

      if (
        queryResult.error &&
        hasMissingRequiredMembershipLevelColumnError(queryResult.error)
      ) {
        const fallbackQuery = await (supabase as never)
          .from('studio_posts')
          .select('id,title,content,image_url,created_at')
          .order('created_at', { ascending: false });

        queryResult = {
          ...fallbackQuery,
          data: Array.isArray(fallbackQuery.data)
            ? fallbackQuery.data.map((row) => ({
                ...row,
                required_membership_level: 0
              }))
            : fallbackQuery.data
        };
      }

      if (queryResult.error) {
        throw queryResult.error;
      }

      const rows = Array.isArray(queryResult.data)
        ? (queryResult.data as StudioPost[]).map((row) => ({
            ...row,
            required_membership_level: normalizeRequiredMembershipLevel(
              row.required_membership_level
            )
          }))
        : [];
      setStudioPosts(rows);
    } catch (error) {
      setStudioPosts([]);
      setPostsError(
        error instanceof Error
          ? error.message
          : '스튜디오 게시물을 불러오지 못했습니다.'
      );
    } finally {
      setPostsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchStudioPosts();
  }, [fetchStudioPosts]);

  useEffect(() => {
    if (!studioPostIdFromQuery || postsLoading) return;

    const targetPost = findPostWithRowMeta(studioPostIdFromQuery);
    if (!targetPost) return;

    setSelectedPost((prev) => (prev?.id === targetPost.id ? prev : targetPost));
  }, [findPostWithRowMeta, postsLoading, studioPostIdFromQuery]);

  useEffect(() => {
    let cancelled = false;

    const resetGuestTier = () => {
      if (cancelled) return;
      setViewerMembershipTierLevel(0);
      setViewerMembershipLabel('일반 멤버십');
      setViewerMembershipTierLoading(false);
    };

    if (authLoading) {
      setViewerMembershipTierLoading(true);
      return;
    }

    if (!user?.id) {
      resetGuestTier();
      return;
    }

    const loadMembershipTier = async () => {
      setViewerMembershipTierLoading(true);
      try {
        const response = await fetch('/api/account/membership', {
          cache: 'no-store'
        });
        const payload = (await response
          .json()
          .catch(() => ({}))) as StudioMembershipApiResponse;
        if (!response.ok) {
          throw new Error(
            payload.message || '멤버십 정보를 불러오지 못했습니다.'
          );
        }

        const membership = payload.data ?? null;
        const nextTierLevel = resolveStudioMembershipTierLevel(membership);
        if (!cancelled) {
          setViewerMembershipTierLevel(nextTierLevel);
          setViewerMembershipLabel(
            membership?.has_active_subscription
              ? String(
                  membership?.selected_membership || '활성 멤버십'
                ).trim() || '활성 멤버십'
              : '일반 멤버십'
          );
        }
      } catch (error) {
        console.error('[StudioSection] membership tier lookup failed', error);
        if (!cancelled) {
          setViewerMembershipTierLevel(0);
          setViewerMembershipLabel('일반 멤버십');
        }
      } finally {
        if (!cancelled) {
          setViewerMembershipTierLoading(false);
        }
      }
    };

    void loadMembershipTier();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getRowDuration = useCallback(
    (rowIndex: number, rowItemCount: number) => {
      const durations = [28, 22, 25, 20, 24, 18, 26];
      const base = durations[rowIndex % durations.length];
      const countMultiplier = Math.max(
        1,
        rowItemCount / STUDIO_COLUMNS_PER_ROW
      );
      return isMobile ? base * countMultiplier * 1.45 : base * countMultiplier;
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
      let insertResult = await (supabase as never)
        .from('studio_posts')
        .insert({
          title,
          content,
          image_url: imageUrl || '',
          user_id: user.id,
          required_membership_level: 0
        })
        .select(
          'id,title,content,image_url,created_at,required_membership_level'
        )
        .single();

      if (
        insertResult.error &&
        hasMissingRequiredMembershipLevelColumnError(insertResult.error)
      ) {
        insertResult = await (supabase as never)
          .from('studio_posts')
          .insert({
            title,
            content,
            image_url: imageUrl || '',
            user_id: user.id
          })
          .select('id,title,content,image_url,created_at')
          .single();

        if (!insertResult.error && insertResult.data) {
          insertResult = {
            ...insertResult,
            data: {
              ...(insertResult.data as Record<string, unknown>),
              required_membership_level: 0
            }
          };
        }
      }

      if (insertResult.error) {
        throw insertResult.error;
      }

      const insertedPost = (insertResult.data ?? null) as StudioPost | null;
      if (!insertedPost) {
        await fetchStudioPosts();
      } else {
        const normalizedPost = {
          ...insertedPost,
          required_membership_level: normalizeRequiredMembershipLevel(
            insertedPost.required_membership_level
          )
        };
        setStudioPosts((prev) => [
          normalizedPost,
          ...prev.filter((post) => post.id !== insertedPost.id)
        ]);
      }

      resetWriteForm();
      setIsWriteModalOpen(false);
    } catch (error) {
      setWriteError(
        error instanceof Error ? error.message : '게시물 작성에 실패했습니다.'
      );
    } finally {
      setWriteSubmitting(false);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleCloseSelectedPost = useCallback(() => {
    setSelectedPost(null);

    const nextSearch = new URLSearchParams(queryString);
    if (!nextSearch.has('studioPost')) return;
    nextSearch.delete('studioPost');
    const nextQuery = nextSearch.toString();
    router.replace(`${pathname}${nextQuery ? `?${nextQuery}` : ''}#studio`, {
      scroll: false
    });
  }, [pathname, queryString, router]);

  const handleOpenShorts = useCallback(
    (postId?: string | null) => {
      if (shortsPosts.length === 0) return;
      const normalized = (postId || '').trim();
      const hasTarget =
        normalized && shortsPosts.some((post) => post.id === normalized);
      setShortsInitialPostId(hasTarget ? normalized : shortsPosts[0].id);
      setIsShortsModalOpen(true);
    },
    [shortsPosts]
  );

  const handleOpenPostFromShorts = useCallback(
    (post: StudioPost) => {
      setIsShortsModalOpen(false);
      setSelectedPost(post);
      const nextSearch = new URLSearchParams(queryString);
      nextSearch.set('studioPost', post.id);
      const nextQuery = nextSearch.toString();
      router.replace(`${pathname}${nextQuery ? `?${nextQuery}` : ''}#studio`, {
        scroll: false
      });
    },
    [pathname, queryString, router]
  );

  const renderRow = (row: StudioDisplayRow, rowIndex: number) => {
    const rowItems = row.posts ?? [];
    if (rowItems.length === 0) return null;

    const rowRule = row.rowRule;
    const loopSeed = buildLoopSeed(rowItems);
    const duplicatedItems = [...loopSeed, ...loopSeed];
    const isRowPaused = !isPlaying || hoveredRowId === row.rowId;
    const isRowLocked =
      rowRule.requiredLevel > 0 &&
      !viewerMembershipTierLoading &&
      viewerMembershipTierLevel < rowRule.requiredLevel;

    return (
      <div key={`studio-row-${row.rowId}`} className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">
            {row.rowLabel}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] ${
              rowRule.requiredLevel === 0
                ? 'border-sky-300/25 bg-sky-500/10 text-sky-100'
                : isRowLocked
                  ? 'border-amber-300/25 bg-amber-500/10 text-amber-100'
                  : 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100'
            }`}
          >
            {rowRule.membershipLabel}
          </span>
          {viewerMembershipTierLoading ? (
            <span className="text-[11px] text-white/45">권한 확인중...</span>
          ) : rowRule.requiredLevel > 0 ? (
            <span className="text-[11px] text-white/45">
              {isRowLocked ? '잠금' : '열림'}
            </span>
          ) : (
            <span className="text-[11px] text-white/45">모두 공개</span>
          )}
        </div>

        <div
          className="overflow-hidden"
          onMouseEnter={() => setHoveredRowId(row.rowId)}
          onMouseLeave={() =>
            setHoveredRowId((prev) => (prev === row.rowId ? null : prev))
          }
        >
          <div
            className="flex gap-4"
            style={{
              width: 'fit-content',
              animationName: 'studio-marquee-rtl',
              animationDuration: `${getRowDuration(rowIndex, rowItems.length)}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationPlayState: isRowPaused ? 'paused' : 'running',
              willChange: 'transform'
            }}
          >
            {duplicatedItems.map((post, index) => {
              const excerpt = getExcerpt(post.content);
              const isPlaceholder = Boolean(post.is_placeholder);
              const canOpen = !isPlaceholder;

              const handleCardClick = () => {
                if (isPlaceholder) {
                  if (isAdmin) handleOpenWrite();
                  return;
                }
                if (isRowLocked) {
                  toast({
                    title: '멤버십 전용 게시물',
                    description: `${rowRule.membershipLabel} 이상에서 열람할 수 있습니다.`
                  });
                }
                setSelectedPost({
                  ...post,
                  required_membership_level: rowRule.requiredLevel,
                  required_membership_label: rowRule.membershipLabel
                });
              };

              return (
                <button
                  key={`${post.id}-${rowIndex}-${index}`}
                  type="button"
                  onClick={handleCardClick}
                  className={`group relative h-[140px] w-[min(13.75rem,calc(100vw-3rem))] flex-shrink-0 overflow-hidden rounded-xl border bg-white/[0.03] text-left shadow-[0_14px_34px_rgba(0,0,0,0.28)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 md:h-[240px] md:w-[400px] md:rounded-2xl ${
                    isPlaceholder
                      ? 'border-dashed border-white/15'
                      : isRowLocked
                        ? 'border-white/10 hover:border-white/15'
                        : 'border-white/10 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-[0_20px_42px_rgba(0,0,0,0.36)]'
                  }`}
                  aria-label={
                    canOpen
                      ? `${post.title?.trim() || 'Studio post'} ${isRowLocked ? '잠금됨' : '상세보기'}`
                      : '빈 슬롯'
                  }
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent" />
                  {post.image_url && !isPlaceholder ? (
                    <img
                      src={post.image_url}
                      alt={post.title?.trim() || 'Studio post image'}
                      className={`h-full w-full object-cover transition-transform duration-700 ease-out ${
                        isRowLocked ? '' : 'group-hover:scale-[1.03]'
                      }`}
                      loading="lazy"
                      decoding="async"
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

                  {isRowLocked && !viewerMembershipTierLoading && (
                    <div className="pointer-events-none absolute inset-0 z-[1]">
                      <div className="absolute inset-0 bg-black/35" />
                      <div
                        className="absolute inset-0 opacity-35"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, rgba(255,255,255,0.22) 0 2px, transparent 2px 14px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.14) 0 2px, transparent 2px 14px)'
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white md:text-xs">
                          <Lock className="h-3.5 w-3.5" />
                          {rowRule.membershipLabel}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-3 md:p-5">
                    <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 backdrop-blur-sm md:rounded-xl md:px-4 md:py-3">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-white/60 md:text-[11px]">
                        {formatStudioDate(post.created_at)}
                      </p>
                      <h3 className="break-words text-sm font-semibold leading-tight tracking-tight text-white md:text-xl">
                        {post.title?.trim() ||
                          (isPlaceholder ? '게시물 준비중' : 'Untitled Post')}
                      </h3>
                      {excerpt ? (
                        <p className="hidden text-xs leading-relaxed text-white/70 md:block">
                          {excerpt}
                        </p>
                      ) : null}
                      {isPlaceholder ? (
                        <p className="hidden text-[11px] text-white/45 md:block">
                          {isAdmin
                            ? '관리자 패널에서 게시물을 추가할 수 있습니다.'
                            : '곧 업데이트됩니다.'}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
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
            transform: translate3d(
              calc(-50% - ${MARQUEE_GAP_REM / 2}rem),
              0,
              0
            );
          }
        }
      `}</style>

      <section
        id="studio"
        className="relative flex min-h-screen max-w-full flex-col justify-center overflow-hidden px-4 py-14 text-white md:px-8 md:py-24"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[12%] top-[16%] h-56 w-56 rounded-full bg-[#7ad0ff]/8 blur-3xl" />
          <div className="absolute right-[12%] bottom-[14%] h-64 w-64 rounded-full bg-[#ff6b78]/8 blur-3xl" />
        </div>
        <div className="mx-auto w-full max-w-7xl tech-panel scanline animate-rise p-4 sm:p-5 md:p-8">
          <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="section-kicker">Studio</p>
              <h2 className="section-title !mt-2 !text-[clamp(1.8rem,4vw,3rem)]">
                Studio Flux
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-cyan-50/72 md:text-base">
                무료 일반 멤버십은 체험판 3개만 공개되고, 월 4,900은 가로 영상,
                월 13,900은 숏폼, 월 79,000은 포토+글 블로그를 이용합니다.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] uppercase tracking-[0.18em] text-cyan-50/50">
                  현재 권한
                </span>
                <span className="inline-flex items-center rounded-full border border-cyan-100/25 bg-cyan-200/10 px-3 py-1 text-xs text-cyan-50/90">
                  {viewerMembershipTierLoading
                    ? '확인중...'
                    : viewerMembershipLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:self-start">
              <button
                type="button"
                onClick={() => handleOpenShorts(studioPostIdFromQuery)}
                disabled={shortsPosts.length === 0}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-cyan-100/30 bg-cyan-200/10 px-4 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-200/20 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
              >
                <Clapperboard className="h-4 w-4" />
                숏폼 보기
              </button>
            </div>
          </div>

          <div className="mb-12 space-y-4">
            {postsLoading ? (
              Array.from({ length: STUDIO_ROW_ACCESS_RULES.length }).map(
                (_, rowIndex) => (
                  <div
                    key={`studio-skeleton-row-${rowIndex}`}
                    className="overflow-hidden"
                  >
                    <div
                      className="flex gap-4"
                      style={{ width: 'fit-content' }}
                    >
                      {Array.from({ length: 3 }).map((__, cardIndex) => (
                        <div
                          key={`studio-skeleton-${rowIndex}-${cardIndex}`}
                          className="h-[140px] w-[min(13.75rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-cyan-100/20 bg-cyan-200/[0.06] shadow-[0_14px_34px_rgba(0,0,0,0.28)] md:h-[240px] md:w-[400px] md:rounded-2xl"
                        >
                          <div className="h-full w-full animate-pulse bg-cyan-100/[0.08]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )
            ) : (
              <>
                {studioPosts.length === 0 ? (
                  <div className="rounded-2xl border border-cyan-100/20 bg-cyan-200/[0.08] px-5 py-4 text-sm text-cyan-50/78">
                    실제 Studio 게시물이 아직 부족해서 줄별 placeholder 카드로
                    채워져 있습니다.
                    {postsError ? (
                      <p className="mt-2 text-xs text-red-300/90">
                        {postsError}
                      </p>
                    ) : null}
                  </div>
                ) : postsError ? (
                  <div className="rounded-2xl border border-red-300/30 bg-red-500/10 px-5 py-4 text-sm text-red-100">
                    {postsError}
                  </div>
                ) : null}
                {displayRows.map((row, rowIndex) => renderRow(row, rowIndex))}
              </>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={togglePlayPause}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-100/28 bg-cyan-200/12 backdrop-blur-md transition-colors hover:bg-cyan-200/24 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={isPlaying ? '일시정지' : '재생'}
              disabled={displayRows.every((row) =>
                row.posts.every((post) => post.is_placeholder)
              )}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-cyan-50" fill="currentColor" />
              ) : (
                <Play className="h-5 w-5 text-cyan-50" fill="currentColor" />
              )}
            </button>
          </div>
        </div>
      </section>

      <StudioDetailModal
        post={selectedPost}
        onClose={handleCloseSelectedPost}
        onOpenShorts={handleOpenShorts}
        viewerMembershipTierLevel={viewerMembershipTierLevel}
        viewerMembershipTierLoading={viewerMembershipTierLoading}
      />

      <StudioShortsModal
        open={isShortsModalOpen}
        onOpenChange={setIsShortsModalOpen}
        posts={shortsPosts}
        initialPostId={shortsInitialPostId}
        onOpenPost={handleOpenPostFromShorts}
        viewerMembershipTierLevel={viewerMembershipTierLevel}
        viewerMembershipTierLoading={viewerMembershipTierLoading}
        isAuthenticated={Boolean(user?.id)}
        isMobile={isMobile}
      />

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

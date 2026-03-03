import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { signR2GetUrl } from '@/utils/r2';
import { getStudioMembershipSummaryForUser } from '@/utils/studio-membership-summary';
import {
  hasStudioMembershipTierAccess,
  normalizeRequiredMembershipLevel,
  resolveStudioMembershipTierLevel
} from '@/utils/studio-membership-tier';

export const runtime = 'nodejs';

type RouteContext = {
  params: { studioPostId: string };
};

type StudioMediaRow = {
  id: string;
  kind: 'image' | 'video';
  r2_bucket: string;
  r2_key: string;
  mime: string | null;
  bytes: number | null;
  is_free_public: boolean | null;
};

type CachedMembershipTier = {
  tierLevel: number;
  expiresAt: number;
};

type CachedPostAccessRule = {
  requiredLevel: number;
  expiresAt: number;
};

const MEMBERSHIP_TIER_CACHE_TTL_MS = 45 * 1000;
const POST_ACCESS_CACHE_TTL_MS = 60 * 1000;
const membershipTierCache = new Map<string, CachedMembershipTier>();
const postAccessCache = new Map<string, CachedPostAccessRule>();

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const hasMissingFreePublicColumnError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();
  return (
    combined.includes('is_free_public') && combined.includes('studio_media')
  );
};

const hasMissingStudioMediaTableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();
  return (
    combined.includes('studio_media') && combined.includes('does not exist')
  );
};

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

const getCachedMembershipTierLevel = (userId: string) => {
  const cached = membershipTierCache.get(userId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    membershipTierCache.delete(userId);
    return null;
  }
  return cached.tierLevel;
};

const setCachedMembershipTierLevel = (userId: string, tierLevel: number) => {
  membershipTierCache.set(userId, {
    tierLevel,
    expiresAt: Date.now() + MEMBERSHIP_TIER_CACHE_TTL_MS
  });
};

const getCachedPostRequiredLevel = (postId: string) => {
  const cached = postAccessCache.get(postId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    postAccessCache.delete(postId);
    return null;
  }
  return cached.requiredLevel;
};

const setCachedPostRequiredLevel = (postId: string, requiredLevel: number) => {
  postAccessCache.set(postId, {
    requiredLevel,
    expiresAt: Date.now() + POST_ACCESS_CACHE_TTL_MS
  });
};

const selectPreviewRows = (rows: StudioMediaRow[]) => {
  if (rows.length <= 1) return rows;

  const firstVideo = rows.find((row) => row.kind === 'video') ?? null;
  const firstImage = rows.find((row) => row.kind === 'image') ?? null;

  if (firstVideo && firstImage && firstVideo.id !== firstImage.id) {
    return [firstVideo, firstImage];
  }
  if (firstVideo) return [firstVideo];
  if (firstImage) return [firstImage];
  return rows.slice(0, 1);
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const requestUrl = new URL(request.url);
    const previewMode =
      requestUrl.searchParams.get('preview') === '1' ||
      requestUrl.searchParams.get('preview') === 'true';
    const supabase = createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError) {
      console.warn(
        '[Studio media] auth.getUser failed, continuing as guest',
        authError
      );
    }

    const studioPostId = (params.studioPostId || '').trim();
    if (!studioPostId) {
      return jsonError('잘못된 Studio 게시글 ID입니다.', 400);
    }

    const adminClient = createAdminClient();
    let viewerMembershipTierLevel = 0;
    if (user?.id) {
      const cachedTier = getCachedMembershipTierLevel(user.id);
      if (cachedTier != null) {
        viewerMembershipTierLevel = cachedTier;
      } else {
        try {
          const membership = await getStudioMembershipSummaryForUser(
            user.id,
            adminClient
          );
          viewerMembershipTierLevel =
            resolveStudioMembershipTierLevel(membership);
          setCachedMembershipTierLevel(user.id, viewerMembershipTierLevel);
        } catch (membershipError) {
          console.error(
            '[Studio media] membership tier lookup failed, falling back to public-only',
            membershipError
          );
        }
      }
    }
    const hasActiveSubscription = viewerMembershipTierLevel > 0;

    const cachedRequiredLevel = getCachedPostRequiredLevel(studioPostId);
    let requiredMembershipLevel = cachedRequiredLevel ?? 0;
    if (cachedRequiredLevel == null) {
      let postQuery = await (adminClient as any)
        .from('studio_posts')
        .select('required_membership_level')
        .eq('id', studioPostId)
        .maybeSingle();

      if (
        postQuery.error &&
        hasMissingRequiredMembershipLevelColumnError(postQuery.error)
      ) {
        const fallbackPostQuery = await (adminClient as any)
          .from('studio_posts')
          .select('id')
          .eq('id', studioPostId)
          .maybeSingle();
        postQuery = {
          ...fallbackPostQuery,
          data: fallbackPostQuery.data
            ? {
                ...(fallbackPostQuery.data as Record<string, unknown>),
                required_membership_level: 0
              }
            : fallbackPostQuery.data
        };
      }

      if (postQuery.error) {
        return jsonError(
          'Studio 게시글 권한 정보를 확인하지 못했습니다.',
          500,
          postQuery.error
        );
      }

      requiredMembershipLevel = normalizeRequiredMembershipLevel(
        postQuery.data && typeof postQuery.data === 'object'
          ? (postQuery.data as Record<string, unknown>)
              .required_membership_level
          : 0
      );
      setCachedPostRequiredLevel(studioPostId, requiredMembershipLevel);
    }
    const canViewMembersOnlyMedia = hasStudioMembershipTierAccess(
      viewerMembershipTierLevel,
      requiredMembershipLevel
    );

    let mediaQuery = await (adminClient as any)
      .from('studio_media')
      .select('id,kind,r2_bucket,r2_key,mime,bytes,is_free_public')
      .eq('studio_post_id', studioPostId)
      .order('created_at', { ascending: true });

    if (mediaQuery.error && hasMissingFreePublicColumnError(mediaQuery.error)) {
      console.warn(
        '[Studio media] studio_media.is_free_public column missing, using members-only fallback',
        mediaQuery.error
      );
      const fallbackQuery = await (adminClient as any)
        .from('studio_media')
        .select('id,kind,r2_bucket,r2_key,mime,bytes')
        .eq('studio_post_id', studioPostId)
        .order('created_at', { ascending: true });
      mediaQuery = {
        ...fallbackQuery,
        data: Array.isArray(fallbackQuery.data)
          ? fallbackQuery.data.map((row) => ({ ...row, is_free_public: false }))
          : fallbackQuery.data
      };
    }

    if (mediaQuery.error) {
      if (hasMissingStudioMediaTableError(mediaQuery.error)) {
        return jsonError(
          'studio_media 테이블이 없습니다. Supabase 마이그레이션을 먼저 적용해 주세요.',
          500,
          mediaQuery.error
        );
      }
      return jsonError(
        'Studio 미디어를 불러오지 못했습니다.',
        500,
        mediaQuery.error
      );
    }

    const rows = Array.isArray(mediaQuery.data)
      ? (mediaQuery.data as StudioMediaRow[])
      : [];
    const visibleRowsRaw = canViewMembersOnlyMedia
      ? rows
      : rows.filter((row) => Boolean(row.is_free_public));
    const visibleRows = previewMode
      ? selectPreviewRows(visibleRowsRaw)
      : visibleRowsRaw;
    const signed = await Promise.all(
      visibleRows.map(async (row) => ({
        id: row.id,
        kind: row.kind,
        mime: row.mime,
        bytes: row.bytes,
        is_free_public: Boolean(row.is_free_public),
        url: await signR2GetUrl(row.r2_key, {
          bucketName: row.r2_bucket || undefined,
          expiresIn: 180
        })
      }))
    );

    return NextResponse.json({
      data: signed,
      meta: {
        has_active_subscription: hasActiveSubscription,
        viewer_membership_tier_level: viewerMembershipTierLevel,
        required_membership_level: requiredMembershipLevel,
        showing_public_only: !canViewMembersOnlyMedia,
        preview_mode: previewMode
      }
    });
  } catch (error) {
    console.error('[Studio media] unexpected error', error);
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected studio media error',
      500
    );
  }
}

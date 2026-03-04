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
import { isAdminUserLike } from '@/utils/service-posts';

export const runtime = 'nodejs';

type BatchRequestBody = {
  postIds?: unknown;
};

type StudioMediaRow = {
  id: string;
  studio_post_id: string;
  kind: 'image' | 'video';
  r2_bucket: string;
  r2_key: string;
  mime: string | null;
  bytes: number | null;
  is_free_public: boolean | null;
};

type CachedMembershipTier = { tierLevel: number; expiresAt: number };
type CachedRequiredLevel = { requiredLevel: number; expiresAt: number };
type CachedSignedUrl = { url: string; expiresAt: number };

const MEMBERSHIP_TIER_CACHE_TTL_MS = 45_000;
const POST_ACCESS_CACHE_TTL_MS = 60_000;
const SIGNED_URL_CACHE_TTL_MS = 5 * 60_000;

const membershipTierCache = new Map<string, CachedMembershipTier>();
const postAccessCache = new Map<string, CachedRequiredLevel>();
const signedUrlCache = new Map<string, CachedSignedUrl>();

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

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

const getCachedSignedUrl = (cacheKey: string) => {
  const cached = signedUrlCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    signedUrlCache.delete(cacheKey);
    return null;
  }
  return cached.url;
};

const setCachedSignedUrl = (cacheKey: string, url: string, ttlMs = SIGNED_URL_CACHE_TTL_MS) => {
  signedUrlCache.set(cacheKey, { url, expiresAt: Date.now() + ttlMs });
};

const normalizeIds = (values: unknown) =>
  Array.isArray(values)
    ? Array.from(
        new Set(
          values
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter(Boolean)
        )
      )
    : [];

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError) {
      console.warn('[Studio media batch] auth.getUser failed, continuing as guest', authError);
    }

    const body = (await request.json().catch(() => ({}))) as BatchRequestBody;
    const postIds = normalizeIds(body.postIds);
    if (postIds.length === 0) {
      return jsonError('postIds 배열이 비어 있습니다.', 400);
    }

    const adminClient = createAdminClient();
    const isAdminViewer = isAdminUserLike({
      email: user?.email ?? null,
      app_metadata:
        user?.app_metadata && typeof user.app_metadata === 'object'
          ? (user.app_metadata as Record<string, unknown>)
          : null,
      user_metadata:
        user?.user_metadata && typeof user.user_metadata === 'object'
          ? (user.user_metadata as Record<string, unknown>)
          : null
    });

    let viewerMembershipTierLevel = 0;
    if (user?.id) {
      const cachedTier = getCachedMembershipTierLevel(user.id);
      if (cachedTier != null) {
        viewerMembershipTierLevel = cachedTier;
      } else {
        try {
          const membership = await getStudioMembershipSummaryForUser(user.id, adminClient);
          viewerMembershipTierLevel = resolveStudioMembershipTierLevel(membership);
          setCachedMembershipTierLevel(user.id, viewerMembershipTierLevel);
        } catch (membershipError) {
          console.error(
            '[Studio media batch] membership tier lookup failed, falling back to public-only',
            membershipError
          );
        }
      }
    }

    // 1) required membership levels in one query
    let postQuery = await (adminClient as any)
      .from('studio_posts')
      .select('id,required_membership_level')
      .in('id', postIds);

    if (
      postQuery.error &&
      hasMissingRequiredMembershipLevelColumnError(postQuery.error)
    ) {
      const fallback = await (adminClient as any)
        .from('studio_posts')
        .select('id')
        .in('id', postIds);
      postQuery = {
        ...fallback,
        data: Array.isArray(fallback.data)
          ? fallback.data.map((row: Record<string, unknown>) => ({
              ...row,
              required_membership_level: 0
            }))
          : fallback.data
      };
    }

    if (postQuery.error) {
      return jsonError('Studio 게시글 권한 정보를 확인하지 못했습니다.', 500, postQuery.error);
    }

    const postRequiredLevel = new Map<string, number>();
    (Array.isArray(postQuery.data) ? postQuery.data : []).forEach((row) => {
      const id = typeof row.id === 'string' ? row.id : '';
      if (!id) return;
      const required = normalizeRequiredMembershipLevel(
        (row as Record<string, unknown>).required_membership_level
      );
      postRequiredLevel.set(id, required);
      setCachedPostRequiredLevel(id, required);
    });

    // 2) fetch media rows in batch
    let mediaQuery = await (adminClient as any)
      .from('studio_media')
      .select('id,studio_post_id,kind,r2_bucket,r2_key,mime,bytes,is_free_public')
      .in('studio_post_id', postIds)
      .order('created_at', { ascending: true });

    if (mediaQuery.error && hasMissingFreePublicColumnError(mediaQuery.error)) {
      const fallback = await (adminClient as any)
        .from('studio_media')
        .select('id,studio_post_id,kind,r2_bucket,r2_key,mime,bytes')
        .in('studio_post_id', postIds)
        .order('created_at', { ascending: true });
      mediaQuery = {
        ...fallback,
        data: Array.isArray(fallback.data)
          ? fallback.data.map((row: Record<string, unknown>) => ({
              ...row,
              is_free_public: false
            }))
          : fallback.data
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
      return jsonError('Studio 미디어를 불러오지 못했습니다.', 500, mediaQuery.error);
    }

    const rows = Array.isArray(mediaQuery.data)
      ? (mediaQuery.data as StudioMediaRow[])
      : [];
    const rowsByPostId = new Map<string, StudioMediaRow[]>();
    rows.forEach((row) => {
      const id = (row.studio_post_id || '').trim();
      if (!id) return;
      if (!rowsByPostId.has(id)) rowsByPostId.set(id, []);
      rowsByPostId.get(id)?.push(row);
    });

    const shouldShowForPost = (postId: string) => {
      if (isAdminViewer) return true;
      const requiredLevel =
        postRequiredLevel.get(postId) ?? getCachedPostRequiredLevel(postId) ?? 0;
      return hasStudioMembershipTierAccess(viewerMembershipTierLevel, requiredLevel);
    };

    const result = await Promise.all(
      postIds.map(async (postId) => {
        const mediaRows = rowsByPostId.get(postId) ?? [];
        const visibleRows = shouldShowForPost(postId)
          ? mediaRows
          : mediaRows.filter((row) => Boolean(row.is_free_public));

        const firstVideo = visibleRows.find((row) => row.kind === 'video') ?? null;
        const firstImage = visibleRows.find((row) => row.kind === 'image') ?? null;

        const videoUrl = firstVideo
          ? await (() => {
              const cacheKey = `${firstVideo.r2_bucket || ''}:${firstVideo.r2_key}`;
              const cachedUrl = getCachedSignedUrl(cacheKey);
              if (cachedUrl) return Promise.resolve(cachedUrl);
              return signR2GetUrl(firstVideo.r2_key, {
                bucketName: firstVideo.r2_bucket || undefined,
                expiresIn: 600
              }).then((url) => {
                setCachedSignedUrl(cacheKey, url);
                return url;
              });
            })()
          : null;

        const fallbackImageUrl = firstImage
          ? await (() => {
              const cacheKey = `${firstImage.r2_bucket || ''}:${firstImage.r2_key}`;
              const cachedUrl = getCachedSignedUrl(cacheKey);
              if (cachedUrl) return Promise.resolve(cachedUrl);
              return signR2GetUrl(firstImage.r2_key, {
                bucketName: firstImage.r2_bucket || undefined,
                expiresIn: 600
              }).then((url) => {
                setCachedSignedUrl(cacheKey, url);
                return url;
              });
            })()
          : null;

        return {
          postId,
          videoUrl,
          fallbackImageUrl,
          hasVideo: Boolean(videoUrl),
          showing_public_only: !shouldShowForPost(postId)
        };
      })
    );

    return NextResponse.json({
      data: result,
      meta: {
        viewer_membership_tier_level: viewerMembershipTierLevel,
        is_admin_viewer: isAdminViewer
      }
    });
  } catch (error) {
    console.error('[Studio media batch] unexpected error', error);
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected studio media batch error',
      500
    );
  }
}

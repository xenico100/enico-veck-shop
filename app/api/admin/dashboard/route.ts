import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';
import { FORCED_ADMIN_EMAIL, resolveUserRoleForUserLike } from '@/utils/service-posts';
import { getStudioMembershipSummaryMapForUsers, type StudioMembershipSummary } from '@/utils/studio-membership-summary';

type ProfileRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
};

type SubscriptionRow = {
  user_id: string;
  status: string | null;
};

type DashboardWarningMap = Partial<{
  profiles: string;
  subscriptions: string;
  studio_posts: string;
  studio_membership: string;
  daily_metrics: string;
}>;

type DailyMetricsSummary = {
  date: string;
  timezone: string;
  visitor_count: number;
  post_count: number;
  community_post_count: number;
  service_post_count: number;
  studio_post_count: number;
};

const VISIT_TIME_ZONE = 'Asia/Seoul';

const getKstDate = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VISIT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
};

const getKstDayWindow = (value = new Date()) => {
  const date = getKstDate(value);
  const startDate = new Date(`${date}T00:00:00+09:00`);
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  return {
    date,
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString()
  };
};

const toUnixMs = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const hasMissingTableError = (error: unknown, tableName: string) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();

  return (
    (combined.includes(tableName) || combined.includes(`public.${tableName}`)) &&
    (combined.includes('does not exist') ||
      combined.includes('schema cache') ||
      combined.includes('could not find the table'))
  );
};

const hasMissingRequiredMembershipLevelColumnError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();
  return combined.includes('required_membership_level') && combined.includes('studio_posts');
};

const parsePageNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return null;
};

async function listAllAuthUsers(
  adminClient: NonNullable<Awaited<ReturnType<typeof getAdminApiContext>>['adminClient']>
) {
  const users: any[] = [];
  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      return { users: [] as any[], error };
    }

    const rows = Array.isArray((data as any)?.users) ? ((data as any).users as any[]) : [];
    users.push(...rows);

    const nextPage = parsePageNumber((data as any)?.nextPage);
    if (nextPage && nextPage > page) {
      page = nextPage;
      continue;
    }

    if (rows.length < perPage) break;
    page += 1;
  }

  return { users, error: null };
}

export async function GET() {
  const { user, isAdmin, adminClient } = await getAdminApiContext();

  if (!user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  if (!isAdmin || !adminClient) {
    return NextResponse.json({ message: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  const warnings: DashboardWarningMap = {};
  let profileData: ProfileRow[] = [];
  const profileSelect = await (adminClient as any)
    .from('users')
    .select('id,full_name,name,phone,address');

  if (profileSelect.error) {
    const fallback = await (adminClient as any).from('users').select('id,full_name');
    if (fallback.error) {
      warnings.profiles =
        profileSelect.error.message || fallback.error.message || '프로필 정보를 불러오지 못했습니다.';
      console.error('[admin/dashboard] profile query failed', {
        primary: profileSelect.error,
        fallback: fallback.error
      });
      profileData = [];
    } else {
      profileData = (fallback.data ?? []) as ProfileRow[];
    }
  } else {
    profileData = (profileSelect.data ?? []) as ProfileRow[];
  }

  const [authUsersResult, { data: subscriptionData, error: subscriptionError }] =
    await Promise.all([
    listAllAuthUsers(adminClient),
    (adminClient as any).from('subscriptions').select('user_id,status')
  ]);

  let studioPostsData: Record<string, unknown>[] = [];
  let studioPostsError: unknown = null;

  let studioPostsQuery = await (adminClient as any)
    .from('studio_posts')
    .select('id,title,content,image_url,user_id,created_at,required_membership_level')
    .order('created_at', { ascending: false });

  if (
    studioPostsQuery.error &&
    hasMissingRequiredMembershipLevelColumnError(studioPostsQuery.error)
  ) {
    const fallbackQuery = await (adminClient as any)
      .from('studio_posts')
      .select('id,title,content,image_url,user_id,created_at')
      .order('created_at', { ascending: false });

    studioPostsQuery = {
      ...fallbackQuery,
      data: Array.isArray(fallbackQuery.data)
        ? fallbackQuery.data.map((row) => ({ ...row, required_membership_level: 0 }))
        : fallbackQuery.data
    };
  }

  studioPostsData = Array.isArray(studioPostsQuery.data)
    ? (studioPostsQuery.data as Record<string, unknown>[])
    : [];
  studioPostsError = studioPostsQuery.error;

  const { date: dailyDate, startIso: dailyStartIso, endIso: dailyEndIso } = getKstDayWindow();
  const [dailyVisitorQuery, dailyServicePostQuery, dailyCommunityPostQuery] = await Promise.all([
    (adminClient as any)
      .from('site_daily_visits')
      .select('id', { head: true, count: 'exact' })
      .eq('visit_date', dailyDate),
    (adminClient as any)
      .from('service_posts')
      .select('id', { head: true, count: 'exact' })
      .gte('created_at', dailyStartIso)
      .lt('created_at', dailyEndIso),
    (adminClient as any)
      .from('community_posts')
      .select('id', { head: true, count: 'exact' })
      .gte('created_at', dailyStartIso)
      .lt('created_at', dailyEndIso)
  ]);

  let dailyVisitorCount = 0;
  let dailyServicePostCount = 0;
  let dailyCommunityPostCount = 0;
  const dailyMetricWarningMessages: string[] = [];

  if (dailyVisitorQuery.error) {
    if (!hasMissingTableError(dailyVisitorQuery.error, 'site_daily_visits')) {
      dailyMetricWarningMessages.push(
        dailyVisitorQuery.error.message || '방문자 통계를 불러오지 못했습니다.'
      );
      console.error('[admin/dashboard] site_daily_visits query failed', dailyVisitorQuery.error);
    } else {
      dailyMetricWarningMessages.push(
        'site_daily_visits 테이블이 없어 방문자 수는 0으로 표시됩니다. 마이그레이션 적용이 필요합니다.'
      );
    }
  } else {
    dailyVisitorCount = Number(dailyVisitorQuery.count ?? 0);
  }

  if (dailyServicePostQuery.error) {
    if (!hasMissingTableError(dailyServicePostQuery.error, 'service_posts')) {
      dailyMetricWarningMessages.push(
        dailyServicePostQuery.error.message || '서비스 게시글 통계를 불러오지 못했습니다.'
      );
      console.error('[admin/dashboard] service_posts daily count failed', dailyServicePostQuery.error);
    }
  } else {
    dailyServicePostCount = Number(dailyServicePostQuery.count ?? 0);
  }

  if (dailyCommunityPostQuery.error) {
    if (!hasMissingTableError(dailyCommunityPostQuery.error, 'community_posts')) {
      dailyMetricWarningMessages.push(
        dailyCommunityPostQuery.error.message || '커뮤니티 게시글 통계를 불러오지 못했습니다.'
      );
      console.error(
        '[admin/dashboard] community_posts daily count failed',
        dailyCommunityPostQuery.error
      );
    } else {
      dailyMetricWarningMessages.push(
        'community_posts 테이블이 없어 커뮤니티 게시글 수는 0으로 표시됩니다.'
      );
    }
  } else {
    dailyCommunityPostCount = Number(dailyCommunityPostQuery.count ?? 0);
  }

  const dailyStartMs = Date.parse(dailyStartIso);
  const dailyEndMs = Date.parse(dailyEndIso);
  const dailyStudioPostCount = studioPostsData.reduce((count, row) => {
    const createdMs = toUnixMs(row.created_at);
    if (!Number.isFinite(createdMs)) return count;
    if (createdMs >= dailyStartMs && createdMs < dailyEndMs) return count + 1;
    return count;
  }, 0);

  const dailyMetrics: DailyMetricsSummary = {
    date: dailyDate,
    timezone: VISIT_TIME_ZONE,
    visitor_count: dailyVisitorCount,
    service_post_count: dailyServicePostCount,
    community_post_count: dailyCommunityPostCount,
    studio_post_count: dailyStudioPostCount,
    post_count: dailyServicePostCount + dailyCommunityPostCount + dailyStudioPostCount
  };

  if (subscriptionError) {
    warnings.subscriptions = subscriptionError.message || '구독 정보를 불러오지 못했습니다.';
    console.error('[admin/dashboard] subscriptions query failed', subscriptionError);
  }

  if (studioPostsError) {
    const studioPostsErrorMessage =
      typeof studioPostsError === 'object' &&
      studioPostsError &&
      'message' in studioPostsError &&
      typeof (studioPostsError as { message?: unknown }).message === 'string'
        ? (studioPostsError as { message: string }).message
        : '게시글 목록을 불러오지 못했습니다.';
    warnings.studio_posts = studioPostsErrorMessage;
    console.error('[admin/dashboard] studio_posts query failed', studioPostsError);
  }

  if (dailyMetricWarningMessages.length > 0) {
    warnings.daily_metrics = dailyMetricWarningMessages[0];
  }

  const profileMap = new Map(profileData.map((profile) => [profile.id, profile]));
  const subscriptionMap = new Map(
    ((subscriptionData ?? []) as SubscriptionRow[]).map((subscription) => [
      subscription.user_id,
      subscription.status
    ])
  );
  const authError = authUsersResult.error;
  if (authError) {
    return NextResponse.json(
      { message: '회원 목록을 불러오지 못했습니다.', error: authError },
      { status: 500 }
    );
  }
  const authUsers = authUsersResult.users ?? [];
  let studioMembershipMap = new Map<string, StudioMembershipSummary>();
  try {
    studioMembershipMap = await getStudioMembershipSummaryMapForUsers(
      authUsers.map((member) => member.id),
      adminClient
    );
  } catch (membershipError) {
    warnings.studio_membership =
      membershipError instanceof Error
        ? membershipError.message
        : 'Studio 멤버십 정보를 불러오지 못했습니다.';
    console.error('[admin/dashboard] studio membership summary failed', membershipError);
  }

  const members = authUsers.map((member) => {
    const profile = profileMap.get(member.id);
    const studioMembership = studioMembershipMap.get(member.id) ?? null;
    const email = (member.email ?? '').trim().toLowerCase();
    const role = resolveUserRoleForUserLike({
      email: member.email ?? null,
      app_metadata:
        member.app_metadata && typeof member.app_metadata === 'object'
          ? (member.app_metadata as Record<string, unknown>)
          : null,
      user_metadata:
        member.user_metadata && typeof member.user_metadata === 'object'
          ? (member.user_metadata as Record<string, unknown>)
          : null
    });

    return {
      id: member.id,
      email: member.email ?? null,
      created_at: member.created_at ?? null,
      last_sign_in_at: member.last_sign_in_at ?? null,
      role,
      full_name: profile?.full_name ?? null,
      name: profile?.name ?? null,
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
      subscription_status: subscriptionMap.get(member.id) ?? null,
      studio_membership: studioMembership,
      is_protected_admin: email === FORCED_ADMIN_EMAIL
    };
  });

  return NextResponse.json({
    data: {
      members,
      studio_posts: studioPostsData ?? [],
      daily_metrics: dailyMetrics
    },
    warnings
  });
}

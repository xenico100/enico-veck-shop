import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';
import { FORCED_ADMIN_EMAIL } from '@/utils/service-posts';
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
}>;

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

  const [
    authUsersResult,
    { data: subscriptionData, error: subscriptionError },
    { data: studioPostsData, error: studioPostsError }
  ] = await Promise.all([
    listAllAuthUsers(adminClient),
    (adminClient as any).from('subscriptions').select('user_id,status'),
    (adminClient as any)
      .from('studio_posts')
      .select('id,title,content,image_url,user_id,created_at')
      .order('created_at', { ascending: false })
  ]);

  if (subscriptionError) {
    warnings.subscriptions = subscriptionError.message || '구독 정보를 불러오지 못했습니다.';
    console.error('[admin/dashboard] subscriptions query failed', subscriptionError);
  }

  if (studioPostsError) {
    warnings.studio_posts = studioPostsError.message || '게시글 목록을 불러오지 못했습니다.';
    console.error('[admin/dashboard] studio_posts query failed', studioPostsError);
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
    const role =
      (member.app_metadata && typeof member.app_metadata === 'object'
        ? String((member.app_metadata as Record<string, unknown>).role ?? 'user')
        : 'user') || 'user';

    return {
      id: member.id,
      email: member.email ?? null,
      created_at: member.created_at ?? null,
      last_sign_in_at: member.last_sign_in_at ?? null,
      role: role === 'admin' ? 'admin' : 'user',
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
      studio_posts: studioPostsData ?? []
    },
    warnings
  });
}

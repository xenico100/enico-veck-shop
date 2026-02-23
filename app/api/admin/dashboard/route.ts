import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';
import { FORCED_ADMIN_EMAIL } from '@/utils/service-posts';

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

export async function GET() {
  const { user, isAdmin, adminClient } = await getAdminApiContext();

  if (!user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  if (!isAdmin || !adminClient) {
    return NextResponse.json({ message: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  let profileData: ProfileRow[] = [];
  const profileSelect = await (adminClient as never)
    .from('users')
    .select('id,full_name,name,phone,address');

  if (profileSelect.error) {
    const fallback = await (adminClient as never).from('users').select('id,full_name');
    if (fallback.error) {
      return NextResponse.json(
        { message: '프로필 정보를 불러오지 못했습니다.', error: fallback.error },
        { status: 500 }
      );
    }
    profileData = (fallback.data ?? []) as ProfileRow[];
  } else {
    profileData = (profileSelect.data ?? []) as ProfileRow[];
  }

  const [
    { data: authData, error: authError },
    { data: subscriptionData, error: subscriptionError },
    { data: studioPostsData, error: studioPostsError }
  ] = await Promise.all([
    adminClient.auth.admin.listUsers(),
    (adminClient as never).from('subscriptions').select('user_id,status'),
    (adminClient as never)
      .from('studio_posts')
      .select('id,title,content,image_url,user_id,created_at')
      .order('created_at', { ascending: false })
  ]);

  if (authError) {
    return NextResponse.json(
      { message: '회원 목록을 불러오지 못했습니다.', error: authError },
      { status: 500 }
    );
  }

  if (subscriptionError) {
    return NextResponse.json(
      { message: '구독 정보를 불러오지 못했습니다.', error: subscriptionError },
      { status: 500 }
    );
  }

  if (studioPostsError) {
    return NextResponse.json(
      { message: '게시글 목록을 불러오지 못했습니다.', error: studioPostsError },
      { status: 500 }
    );
  }

  const profileMap = new Map(profileData.map((profile) => [profile.id, profile]));
  const subscriptionMap = new Map(
    ((subscriptionData ?? []) as SubscriptionRow[]).map((subscription) => [
      subscription.user_id,
      subscription.status
    ])
  );

  const members = (authData?.users ?? []).map((member) => {
    const profile = profileMap.get(member.id);
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
      is_protected_admin: email === FORCED_ADMIN_EMAIL
    };
  });

  return NextResponse.json({
    data: {
      members,
      studio_posts: studioPostsData ?? []
    }
  });
}

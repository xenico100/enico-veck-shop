import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';
import { FORCED_ADMIN_EMAIL } from '@/utils/service-posts';

type RouteContext = {
  params: { id: string };
};

type MemberPatchBody = {
  role?: string;
};

async function parseBody(request: Request) {
  try {
    return (await request.json()) as MemberPatchBody;
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { user, isAdmin, adminClient } = await getAdminApiContext();
  if (!user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (!isAdmin || !adminClient) {
    return NextResponse.json({ message: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  const body = await parseBody(request);
  const nextRole = body?.role === 'admin' ? 'admin' : 'user';
  const targetUserId = params.id;

  if (!targetUserId) {
    return NextResponse.json({ message: '잘못된 사용자 ID입니다.' }, { status: 400 });
  }

  const { data: targetUser, error: getUserError } =
    await adminClient.auth.admin.getUserById(targetUserId);

  if (getUserError || !targetUser?.user) {
    return NextResponse.json({ message: '사용자를 찾을 수 없습니다.' }, { status: 404 });
  }

  const targetEmail = targetUser.user.email?.trim().toLowerCase() ?? '';
  if (targetEmail === FORCED_ADMIN_EMAIL) {
    return NextResponse.json(
      { message: '보호된 관리자 계정의 역할은 변경할 수 없습니다.' },
      { status: 403 }
    );
  }

  const currentAppMetadata =
    targetUser.user.app_metadata && typeof targetUser.user.app_metadata === 'object'
      ? (targetUser.user.app_metadata as Record<string, unknown>)
      : {};

  const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
    app_metadata: {
      ...currentAppMetadata,
      role: nextRole
    }
  });

  if (error) {
    return NextResponse.json(
      { message: '역할 변경에 실패했습니다.', error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { user, isAdmin, adminClient } = await getAdminApiContext();
  if (!user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (!isAdmin || !adminClient) {
    return NextResponse.json({ message: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  const targetUserId = params.id;
  if (!targetUserId) {
    return NextResponse.json({ message: '잘못된 사용자 ID입니다.' }, { status: 400 });
  }

  if (targetUserId === user.id) {
    return NextResponse.json(
      { message: '현재 로그인한 계정은 삭제할 수 없습니다.' },
      { status: 400 }
    );
  }

  const { data: targetUser } = await adminClient.auth.admin.getUserById(targetUserId);
  const targetEmail = targetUser?.user?.email?.trim().toLowerCase() ?? '';
  if (targetEmail === FORCED_ADMIN_EMAIL) {
    return NextResponse.json(
      { message: '보호된 관리자 계정은 삭제할 수 없습니다.' },
      { status: 403 }
    );
  }

  const { error } = await adminClient.auth.admin.deleteUser(targetUserId);
  if (error) {
    return NextResponse.json(
      { message: '회원 삭제에 실패했습니다.', error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

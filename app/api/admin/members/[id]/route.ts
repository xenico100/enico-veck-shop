import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';
import {
  FORCED_ADMIN_EMAIL,
  getUserRoleLabel,
  getUserRoleLevel,
  normalizeUserRoleValue,
  resolveUserRoleForUserLike,
  type UserRoleValue
} from '@/utils/service-posts';
import {
  type StudioMembershipTierLevel,
  STUDIO_MEMBERSHIP_MANUAL_PLAN_BY_LEVEL,
  getStudioMembershipTierLabel,
  normalizeRequiredMembershipLevel
} from '@/utils/studio-membership-tier';

type RouteContext = {
  params: { id: string };
};

type MemberPatchBody = {
  role?: string;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  studio_membership_active?: boolean | null;
  studio_membership_level?: number | string | null;
};

async function parseBody(request: Request) {
  try {
    return (await request.json()) as MemberPatchBody;
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { user, isAdmin, adminClient, adminRole, adminRoleLevel } = await getAdminApiContext();
  if (!user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (!isAdmin || !adminClient) {
    return NextResponse.json({ message: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  const body = await parseBody(request);
  if (!body) {
    return NextResponse.json({ message: '요청 본문이 올바르지 않습니다.' }, { status: 400 });
  }

  const shouldUpdateRole = typeof body.role === 'string';
  const shouldUpdateProfile =
    Object.prototype.hasOwnProperty.call(body, 'name') ||
    Object.prototype.hasOwnProperty.call(body, 'phone') ||
    Object.prototype.hasOwnProperty.call(body, 'address');
  const hasStudioMembershipLevelField = Object.prototype.hasOwnProperty.call(
    body,
    'studio_membership_level'
  );
  const nextStudioMembershipLevel = (
    hasStudioMembershipLevelField
      ? normalizeRequiredMembershipLevel(body.studio_membership_level)
      : body.studio_membership_active === true
        ? 1
        : body.studio_membership_active === false
          ? 0
          : null
  ) as StudioMembershipTierLevel | null;
  const shouldUpdateStudioMembership = nextStudioMembershipLevel != null;

  if (!shouldUpdateRole && !shouldUpdateProfile && !shouldUpdateStudioMembership) {
    return NextResponse.json({ message: '변경할 값이 없습니다.' }, { status: 400 });
  }

  if (shouldUpdateRole) {
    const rawRole = String(body.role ?? '')
      .trim()
      .toLowerCase();
    const isKnownRole =
      rawRole === 'admin' ||
      rawRole === 'sub_admin' ||
      rawRole === 'sub-admin' ||
      rawRole === 'subadmin' ||
      rawRole === 'manager' ||
      rawRole === 'user';
    if (!isKnownRole) {
      return NextResponse.json({ message: '지원하지 않는 역할 값입니다.' }, { status: 400 });
    }
  }

  const nextRole = normalizeUserRoleValue(body.role) as UserRoleValue;
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
  const targetRole = resolveUserRoleForUserLike({
    email: targetUser.user.email ?? null,
    app_metadata:
      targetUser.user.app_metadata && typeof targetUser.user.app_metadata === 'object'
        ? (targetUser.user.app_metadata as Record<string, unknown>)
        : null,
    user_metadata:
      targetUser.user.user_metadata && typeof targetUser.user.user_metadata === 'object'
        ? (targetUser.user.user_metadata as Record<string, unknown>)
        : null
  });
  const targetRoleLevel = getUserRoleLevel(targetRole);

  if (shouldUpdateRole && targetEmail === FORCED_ADMIN_EMAIL) {
    return NextResponse.json(
      { message: '보호된 관리자 계정의 역할은 변경할 수 없습니다.' },
      { status: 403 }
    );
  }

  if (shouldUpdateRole) {
    const nextRoleLevel = getUserRoleLevel(nextRole);
    const isTopAdminActor = adminRole === 'admin';
    if (targetUserId === user.id && nextRole !== targetRole) {
      return NextResponse.json(
        { message: '현재 로그인한 계정의 역할은 직접 변경할 수 없습니다.' },
        { status: 403 }
      );
    }

    if (!isTopAdminActor && adminRoleLevel <= targetRoleLevel) {
      return NextResponse.json(
        {
          message: `현재 계정 권한(${getUserRoleLabel(adminRole)})으로는 대상 권한(${getUserRoleLabel(
            targetRole
          )})을 변경할 수 없습니다.`
        },
        { status: 403 }
      );
    }

    if (!isTopAdminActor && adminRoleLevel <= nextRoleLevel) {
      return NextResponse.json(
        {
          message: `현재 계정 권한(${getUserRoleLabel(adminRole)})으로는 ${getUserRoleLabel(
            nextRole
          )} 권한을 부여할 수 없습니다.`
        },
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
  }

  if (shouldUpdateProfile) {
    const normalizeText = (value: unknown) => {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const nextName = normalizeText(body.name);
    const nextPhone = normalizeText(body.phone);
    const nextAddress = normalizeText(body.address);

    if (nextPhone && nextPhone.length < 9) {
      return NextResponse.json(
        { message: '전화번호는 최소 9자 이상 입력해 주세요.' },
        { status: 400 }
      );
    }

    if (nextAddress && nextAddress.length < 5) {
      return NextResponse.json(
        { message: '주소는 최소 5자 이상 입력해 주세요.' },
        { status: 400 }
      );
    }

    const { error: profileError } = await (adminClient as never)
      .from('users')
      .upsert(
        {
          id: targetUserId,
          name: nextName,
          full_name: nextName,
          phone: nextPhone,
          address: nextAddress
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      return NextResponse.json(
        { message: profileError.message || '회원 정보 수정에 실패했습니다.' },
        { status: 500 }
      );
    }
  }

  if (shouldUpdateStudioMembership) {
    const nowIso = new Date().toISOString();
    const membershipLevel = nextStudioMembershipLevel as StudioMembershipTierLevel;
    const hasActiveStudioMembership = membershipLevel > 0;

    const { error: accessError } = await (adminClient as never)
      .from('studio_access')
      .upsert(
        {
          user_id: targetUserId,
          has_active_subscription: hasActiveStudioMembership,
          updated_at: nowIso
        },
        { onConflict: 'user_id' }
      );

    if (accessError) {
      return NextResponse.json(
        { message: accessError.message || 'Studio 멤버십 상태 변경에 실패했습니다.' },
        { status: 500 }
      );
    }

    const manualSubscriptionId = `manual:${targetUserId}`;
    if (!hasActiveStudioMembership) {
      const { error: removeManualSubscriptionError } = await (adminClient as never)
        .from('paypal_subscriptions')
        .delete()
        .eq('id', manualSubscriptionId);

      if (removeManualSubscriptionError) {
        return NextResponse.json(
          {
            message:
              removeManualSubscriptionError.message ||
              '수동 멤버십 구독 레코드를 정리하지 못했습니다.'
          },
          { status: 500 }
        );
      }
    } else {
      const manualPlan = STUDIO_MEMBERSHIP_MANUAL_PLAN_BY_LEVEL[membershipLevel as 1 | 2 | 3];
      const { error: manualPlanError } = await (adminClient as never)
        .from('paypal_plans')
        .upsert({
          id: manualPlan.planId,
          name: manualPlan.name,
          status: 'ACTIVE',
          interval: manualPlan.interval,
          amount: manualPlan.amountKrw,
          currency: manualPlan.currency
        });

      if (manualPlanError) {
        return NextResponse.json(
          {
            message: manualPlanError.message || '수동 멤버십 플랜을 저장하지 못했습니다.'
          },
          { status: 500 }
        );
      }

      const { error: manualSubscriptionError } = await (adminClient as never)
        .from('paypal_subscriptions')
        .upsert({
          id: manualSubscriptionId,
          user_id: targetUserId,
          plan_id: manualPlan.planId,
          status: 'ACTIVE',
          current_period_end: null,
          last_event_at: nowIso,
          raw: {
            source: 'admin_manual_grant',
            membership_level: membershipLevel,
            plan_id: manualPlan.planId,
            amount_krw: manualPlan.amountKrw,
            updated_at: nowIso,
            updated_by: user.id
          }
        });

      if (manualSubscriptionError) {
        return NextResponse.json(
          {
            message:
              manualSubscriptionError.message || '수동 멤버십 구독 정보를 저장하지 못했습니다.'
          },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      role: shouldUpdateRole ? nextRole : undefined,
      name: shouldUpdateProfile ? (body.name ?? null) : undefined,
      phone: shouldUpdateProfile ? (body.phone ?? null) : undefined,
      address: shouldUpdateProfile ? (body.address ?? null) : undefined,
      studio_membership_active:
        shouldUpdateStudioMembership ? (nextStudioMembershipLevel as number) > 0 : undefined,
      studio_membership_level:
        shouldUpdateStudioMembership ? nextStudioMembershipLevel : undefined,
      studio_membership_label:
        shouldUpdateStudioMembership
          ? getStudioMembershipTierLabel(nextStudioMembershipLevel)
          : undefined
    }
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { user, isAdmin, adminClient, adminRole, adminRoleLevel } = await getAdminApiContext();
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
  const targetRole = resolveUserRoleForUserLike({
    email: targetUser?.user?.email ?? null,
    app_metadata:
      targetUser?.user?.app_metadata && typeof targetUser.user.app_metadata === 'object'
        ? (targetUser.user.app_metadata as Record<string, unknown>)
        : null,
    user_metadata:
      targetUser?.user?.user_metadata && typeof targetUser.user.user_metadata === 'object'
        ? (targetUser.user.user_metadata as Record<string, unknown>)
        : null
  });
  const targetRoleLevel = getUserRoleLevel(targetRole);
  const isTopAdminActor = adminRole === 'admin';

  if (targetEmail === FORCED_ADMIN_EMAIL) {
    return NextResponse.json(
      { message: '보호된 관리자 계정은 삭제할 수 없습니다.' },
      { status: 403 }
    );
  }

  if (!isTopAdminActor && adminRoleLevel <= targetRoleLevel) {
    return NextResponse.json(
      {
        message: `현재 계정 권한(${getUserRoleLabel(adminRole)})으로는 대상 권한(${getUserRoleLabel(
          targetRole
        )}) 계정을 삭제할 수 없습니다.`
      },
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

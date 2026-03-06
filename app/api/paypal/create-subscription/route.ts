import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  createSubscription,
  getPayPalApprovalUrl,
  isPayPalApiError
} from '@/utils/paypal';
import {
  inferStudioMembershipPlanKeyFromSummary,
  isStudioMembershipTierDowngrade,
  normalizeStudioMembershipPlanKey,
  type StudioMembershipPlanKey
} from '@/utils/studio-membership-plans';
import { getStudioMembershipSummaryForUser } from '@/utils/studio-membership-summary';

export const runtime = 'nodejs';

type CreateSubscriptionBody = {
  studioPostId?: string;
  planKey?: StudioMembershipPlanKey;
};

type PayPalPlanKey = 'monthly_4900' | 'monthly_13900' | 'monthly_79000';

const studioPostIdRegex = /^[a-z0-9-]{8,}$/i;

const PLAN_ENV_KEY_BY_PLAN_KEY: Record<PayPalPlanKey, string> = {
  monthly_4900: 'PAYPAL_PLAN_ID_MONTHLY_4900',
  monthly_13900: 'PAYPAL_PLAN_ID_MONTHLY_13900',
  monthly_79000: 'PAYPAL_PLAN_ID_MONTHLY_79000'
};
const LEGACY_PLAN_ENV_KEY = 'PAYPAL_PLAN_ID_MONTHLY';
const LEGACY_PREMIUM_PLAN_ENV_KEY = 'PAYPAL_PLAN_ID_MONTHLY_69000';

// Safety net for Vercel/Sandbox deployments where plan env vars are not configured yet.
// These IDs are non-secret PayPal plan IDs tied to this sandbox merchant account.
const SANDBOX_PLAN_ID_FALLBACK_BY_PLAN_KEY: Record<PayPalPlanKey, string> = {
  monthly_4900: 'P-66J57653FV568243LNGTF3KQ',
  monthly_13900: 'P-6JS61276AJ849370SNGTF3KY',
  monthly_79000: 'P-31657772UD838403ANGTF3LA'
};

const SUPPORTED_PLAN_KEYS = new Set(
  Object.keys(PLAN_ENV_KEY_BY_PLAN_KEY) as PayPalPlanKey[]
);

const isSandboxEnvironment = () => {
  const raw = (process.env.PAYPAL_ENV || 'sandbox').trim().toLowerCase();
  return raw !== 'live' && raw !== 'production';
};

const resolvePayPalPlanId = (planKey: PayPalPlanKey) => {
  const envKey = PLAN_ENV_KEY_BY_PLAN_KEY[planKey];
  const direct = process.env[envKey]?.trim();
  if (direct) {
    return { planId: direct, envKey };
  }

  if (planKey === 'monthly_79000') {
    const legacyPremium = process.env[LEGACY_PREMIUM_PLAN_ENV_KEY]?.trim();
    if (legacyPremium) {
      return { planId: legacyPremium, envKey: LEGACY_PREMIUM_PLAN_ENV_KEY };
    }
  }

  // Backward compatibility for the old single-plan setup:
  // only map legacy env to the basic (4,900) tier.
  if (planKey === 'monthly_4900') {
    const legacy = process.env[LEGACY_PLAN_ENV_KEY]?.trim();
    if (legacy) {
      return { planId: legacy, envKey: LEGACY_PLAN_ENV_KEY };
    }
  }

  if (isSandboxEnvironment()) {
    const sandboxFallback = SANDBOX_PLAN_ID_FALLBACK_BY_PLAN_KEY[planKey];
    if (sandboxFallback) {
      return { planId: sandboxFallback, envKey: `${envKey}_SANDBOX_FALLBACK` };
    }
  }

  return { planId: '', envKey };
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const sanitizeStudioPostId = (value: string | null | undefined) => {
  const normalized = (value || '').trim();
  return studioPostIdRegex.test(normalized) ? normalized : '';
};

const getStudioPath = (studioPostId: string | null | undefined) => {
  const normalizedStudioPostId = sanitizeStudioPostId(studioPostId);
  return normalizedStudioPostId ? `/posts/${normalizedStudioPostId}` : '/posts';
};

const buildStudioRedirectUrl = (
  requestUrl: URL,
  options: {
    studioPostId?: string | null;
    paypalState: 'success' | 'cancel' | 'error' | 'inactive';
    message?: string | null;
    missingPlanEnv?: string | null;
  }
) => {
  const redirectUrl = new URL(
    getStudioPath(options.studioPostId),
    requestUrl.origin
  );
  redirectUrl.searchParams.set('paypal', options.paypalState);
  if (options.message) {
    redirectUrl.searchParams.set('paypal_message', options.message);
  }
  if (options.missingPlanEnv) {
    redirectUrl.searchParams.set('missing_plan_env', options.missingPlanEnv);
  }
  return redirectUrl;
};

const parsePlanKey = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const normalized = normalizeStudioMembershipPlanKey(value);
  if (!normalized) return null;
  return SUPPORTED_PLAN_KEYS.has(normalized as PayPalPlanKey)
    ? (normalized as PayPalPlanKey)
    : null;
};

const getMembershipChangeValidation = async (params: {
  userId: string;
  targetPlanKey: PayPalPlanKey;
}) => {
  const membershipSummary = await getStudioMembershipSummaryForUser(params.userId);
  const currentPlanKey = inferStudioMembershipPlanKeyFromSummary(membershipSummary);
  if (!currentPlanKey) {
    return {
      isSamePlan: false,
      isTierDowngrade: false
    };
  }
  return {
    isSamePlan: currentPlanKey === params.targetPlanKey,
    isTierDowngrade: isStudioMembershipTierDowngrade(
      currentPlanKey,
      params.targetPlanKey
    )
  };
};

const createSubscriptionSession = async ({
  userId,
  studioPostId,
  planKey,
  origin
}: {
  userId: string;
  studioPostId: string;
  planKey: PayPalPlanKey;
  origin: string;
}) => {
  const { planId, envKey } = resolvePayPalPlanId(planKey);

  if (!planId) {
    throw new Error(`Missing PayPal plan env for ${planKey} (${envKey})`);
  }

  const returnUrl = new URL('/api/paypal/subscription/return', origin);
  if (studioPostId) {
    returnUrl.searchParams.set('studioPostId', studioPostId);
  }

  const cancelUrl = new URL(getStudioPath(studioPostId), origin);
  cancelUrl.searchParams.set('paypal', 'cancel');

  const response = await createSubscription(
    planId,
    returnUrl.toString(),
    cancelUrl.toString(),
    userId
  );
  const approvalUrl = getPayPalApprovalUrl(response);

  if (!approvalUrl) {
    throw new Error('PayPal approval URL not found');
  }

  return {
    approvalUrl,
    planKey,
    subscriptionId: typeof response.id === 'string' ? response.id : null,
    status: typeof response.status === 'string' ? response.status : null
  };
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const studioPostId = sanitizeStudioPostId(
    requestUrl.searchParams.get('studioPostId')
  );
  const requestedPlanKey = requestUrl.searchParams.get('planKey');
  const parsedPlanKey = parsePlanKey(requestedPlanKey);
  const planKey: PayPalPlanKey = parsedPlanKey ?? 'monthly_4900';

  if (requestedPlanKey && !parsedPlanKey) {
    return NextResponse.redirect(
      buildStudioRedirectUrl(requestUrl, {
        studioPostId,
        paypalState: 'error',
        message: 'invalid_plan_key'
      })
    );
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL('/signin', requestUrl.origin));
    }

    const membershipValidation = await getMembershipChangeValidation({
      userId: user.id,
      targetPlanKey: planKey
    });
    if (membershipValidation.isSamePlan) {
      return NextResponse.redirect(
        buildStudioRedirectUrl(requestUrl, {
          studioPostId,
          paypalState: 'error',
          message: 'already_active_plan'
        })
      );
    }
    if (membershipValidation.isTierDowngrade) {
      return NextResponse.redirect(
        buildStudioRedirectUrl(requestUrl, {
          studioPostId,
          paypalState: 'error',
          message: 'downgrade_requires_schedule'
        })
      );
    }

    const payload = await createSubscriptionSession({
      userId: user.id,
      studioPostId,
      planKey,
      origin
    });
    return NextResponse.redirect(payload.approvalUrl);
  } catch (error) {
    if (isPayPalApiError(error)) {
      return NextResponse.redirect(
        buildStudioRedirectUrl(requestUrl, {
          studioPostId,
          paypalState: 'error',
          message: 'paypal_subscription_create_failed'
        })
      );
    }

    console.error('[PayPal create-subscription GET] unexpected error', error);
    const missingPlanEnvMatch =
      error instanceof Error
        ? error.message.match(/Missing PayPal plan env for [^(]+\(([^)]+)\)/)
        : null;
    const missingPlanEnv = missingPlanEnvMatch?.[1]?.trim() || null;
    const message = missingPlanEnv
      ? 'missing_paypal_plan_env'
      : 'unexpected_create_subscription_error';

    return NextResponse.redirect(
      buildStudioRedirectUrl(requestUrl, {
        studioPostId,
        paypalState: 'error',
        message,
        missingPlanEnv
      })
    );
  }
}

export async function POST(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;
    const supabase = createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('로그인이 필요합니다.', 401);
    }

    const body = (await request
      .json()
      .catch(() => ({}))) as CreateSubscriptionBody;
    const studioPostId = sanitizeStudioPostId(body.studioPostId);
    const parsedPlanKey = parsePlanKey(body.planKey);
    const requestedPlanKey: PayPalPlanKey = parsedPlanKey ?? 'monthly_4900';

    if (body.planKey && !parsedPlanKey) {
      return jsonError('Invalid membership plan key', 400, {
        planKey: body.planKey
      });
    }

    const membershipValidation = await getMembershipChangeValidation({
      userId: user.id,
      targetPlanKey: requestedPlanKey
    });
    if (membershipValidation.isSamePlan) {
      return jsonError('이미 사용 중인 멤버십 플랜입니다.', 400);
    }
    if (membershipValidation.isTierDowngrade) {
      return jsonError(
        '낮은 멤버십으로 변경 시 다음 결제일부터 변경 예약을 이용해 주세요.',
        400
      );
    }

    const payload = await createSubscriptionSession({
      userId: user.id,
      studioPostId,
      planKey: requestedPlanKey,
      origin
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (isPayPalApiError(error)) {
      return jsonError(
        'PayPal subscription creation failed',
        error.status,
        error.details
      );
    }
    if (
      error instanceof Error &&
      error.message.includes('Missing PayPal plan env')
    ) {
      return jsonError(error.message, 500);
    }
    console.error('[PayPal create-subscription] unexpected error', error);
    return jsonError(
      error instanceof Error
        ? error.message
        : 'Unexpected create-subscription error',
      500
    );
  }
}

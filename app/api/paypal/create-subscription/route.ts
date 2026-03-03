import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createSubscription, getPayPalApprovalUrl, isPayPalApiError } from '@/utils/paypal';
import { getURL } from '@/utils/helpers';
import type { StudioMembershipPlanKey } from '@/utils/studio-membership-plans';

export const runtime = 'nodejs';

type CreateSubscriptionBody = {
  studioPostId?: string;
  planKey?: StudioMembershipPlanKey;
};

const studioPostIdRegex = /^[a-z0-9-]{8,}$/i;

const PLAN_ENV_KEY_BY_PLAN_KEY: Record<StudioMembershipPlanKey, string> = {
  monthly_4900: 'PAYPAL_PLAN_ID_MONTHLY_4900',
  monthly_13900: 'PAYPAL_PLAN_ID_MONTHLY_13900',
  monthly_69000: 'PAYPAL_PLAN_ID_MONTHLY_69000'
};

const SUPPORTED_PLAN_KEYS = new Set(Object.keys(PLAN_ENV_KEY_BY_PLAN_KEY));

const resolvePayPalPlanId = (planKey: StudioMembershipPlanKey) => {
  const envKey = PLAN_ENV_KEY_BY_PLAN_KEY[planKey];
  const direct = process.env[envKey]?.trim();
  if (direct) {
    return { planId: direct, envKey };
  }

  if (planKey === 'monthly_4900') {
    const legacy = process.env.PAYPAL_PLAN_ID_MONTHLY?.trim();
    if (legacy) {
      return { planId: legacy, envKey: 'PAYPAL_PLAN_ID_MONTHLY' };
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
  }
) => {
  const redirectUrl = new URL(getStudioPath(options.studioPostId), requestUrl.origin);
  redirectUrl.searchParams.set('paypal', options.paypalState);
  if (options.message) {
    redirectUrl.searchParams.set('paypal_message', options.message);
  }
  return redirectUrl;
};

const parsePlanKey = (value: unknown) => {
  if (typeof value !== 'string') return null;
  return SUPPORTED_PLAN_KEYS.has(value) ? (value as StudioMembershipPlanKey) : null;
};

const createSubscriptionSession = async ({
  userId,
  studioPostId,
  planKey
}: {
  userId: string;
  studioPostId: string;
  planKey: StudioMembershipPlanKey;
}) => {
  const { planId, envKey } = resolvePayPalPlanId(planKey);

  if (!planId) {
    throw new Error(`Missing PayPal plan env for ${planKey} (${envKey})`);
  }

  const returnUrl = new URL(getURL('/api/paypal/subscription/return'));
  if (studioPostId) {
    returnUrl.searchParams.set('studioPostId', studioPostId);
  }

  const cancelUrl = new URL(getURL(getStudioPath(studioPostId)));
  cancelUrl.searchParams.set('paypal', 'cancel');

  const response = await createSubscription(planId, returnUrl.toString(), cancelUrl.toString(), userId);
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
  const studioPostId = sanitizeStudioPostId(requestUrl.searchParams.get('studioPostId'));
  const requestedPlanKey = requestUrl.searchParams.get('planKey');
  const parsedPlanKey = parsePlanKey(requestedPlanKey);
  const planKey = parsedPlanKey ?? 'monthly_4900';

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

    const payload = await createSubscriptionSession({ userId: user.id, studioPostId, planKey });
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
    const message =
      error instanceof Error && error.message.includes('Missing PayPal plan env')
        ? 'missing_paypal_plan_env'
        : 'unexpected_create_subscription_error';

    return NextResponse.redirect(
      buildStudioRedirectUrl(requestUrl, {
        studioPostId,
        paypalState: 'error',
        message
      })
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('로그인이 필요합니다.', 401);
    }

    const body = (await request.json().catch(() => ({}))) as CreateSubscriptionBody;
    const studioPostId = sanitizeStudioPostId(body.studioPostId);
    const parsedPlanKey = parsePlanKey(body.planKey);
    const requestedPlanKey = parsedPlanKey ?? 'monthly_4900';

    if (body.planKey && !parsedPlanKey) {
      return jsonError('Invalid membership plan key', 400, { planKey: body.planKey });
    }

    const payload = await createSubscriptionSession({
      userId: user.id,
      studioPostId,
      planKey: requestedPlanKey
    });

    return NextResponse.json(
      payload,
      { status: 200 }
    );
  } catch (error) {
    if (isPayPalApiError(error)) {
      return jsonError('PayPal subscription creation failed', error.status, error.details);
    }
    if (error instanceof Error && error.message.includes('Missing PayPal plan env')) {
      return jsonError(error.message, 500);
    }
    console.error('[PayPal create-subscription] unexpected error', error);
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected create-subscription error',
      500
    );
  }
}

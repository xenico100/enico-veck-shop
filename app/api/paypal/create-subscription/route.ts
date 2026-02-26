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
    const studioPostId = (body.studioPostId || '').trim();
    const requestedPlanKey = typeof body.planKey === 'string' ? body.planKey : 'monthly_4900';
    if (!SUPPORTED_PLAN_KEYS.has(requestedPlanKey)) {
      return jsonError('Invalid membership plan key', 400, { planKey: requestedPlanKey });
    }
    const planKey = requestedPlanKey as StudioMembershipPlanKey;
    const { planId, envKey } = resolvePayPalPlanId(planKey);

    if (!planId) {
      return jsonError(`Missing PayPal plan env for ${planKey} (${envKey})`, 500);
    }

    const returnUrl = new URL(getURL('/api/paypal/subscription/return'));
    if (studioPostId) {
      returnUrl.searchParams.set('studioPostId', studioPostId);
    }

    const cancelPath = studioPostId ? `/posts/${studioPostId}` : '/posts';
    const cancelUrl = new URL(getURL(cancelPath));
    cancelUrl.searchParams.set('paypal', 'cancel');

    const response = await createSubscription(
      planId,
      returnUrl.toString(),
      cancelUrl.toString(),
      user.id
    );
    const approvalUrl = getPayPalApprovalUrl(response);

    if (!approvalUrl) {
      return jsonError('PayPal approval URL not found', 502, response);
    }

    return NextResponse.json(
      {
        approvalUrl,
        planKey,
        subscriptionId: typeof response.id === 'string' ? response.id : null,
        status: typeof response.status === 'string' ? response.status : null
      },
      { status: 200 }
    );
  } catch (error) {
    if (isPayPalApiError(error)) {
      return jsonError('PayPal subscription creation failed', error.status, error.details);
    }
    console.error('[PayPal create-subscription] unexpected error', error);
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected create-subscription error',
      500
    );
  }
}

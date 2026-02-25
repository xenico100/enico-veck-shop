import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createSubscription, getPayPalApprovalUrl, isPayPalApiError } from '@/utils/paypal';
import { getURL } from '@/utils/helpers';

export const runtime = 'nodejs';

type CreateSubscriptionBody = {
  studioPostId?: string;
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
    const planId = process.env.PAYPAL_PLAN_ID_MONTHLY?.trim();

    if (!planId) {
      return jsonError('Missing PAYPAL_PLAN_ID_MONTHLY', 500);
    }

    const returnUrl = new URL(getURL('/api/paypal/capture'));
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


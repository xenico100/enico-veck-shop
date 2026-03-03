import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSubscription, isPayPalApiError } from '@/utils/paypal';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { upsertPayPalSubscriptionSnapshot } from '@/utils/studio-subscription';

export const runtime = 'nodejs';

type CaptureSubscriptionBody = {
  subscriptionId?: string;
  studioPostId?: string;
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const sanitizeStudioPostId = (value: string | null) => {
  const normalized = (value || '').trim();
  return /^[a-z0-9-]{8,}$/i.test(normalized) ? normalized : '';
};

const buildStudioRedirectUrl = (
  requestUrl: URL,
  options: {
    studioPostId?: string | null;
    paypalState: 'success' | 'cancel' | 'error' | 'inactive';
    subscriptionStatus?: string | null;
    message?: string | null;
  }
) => {
  const studioPostId = sanitizeStudioPostId(options.studioPostId ?? null);
  const path = studioPostId ? `/posts/${studioPostId}` : '/posts';
  const redirectUrl = new URL(path, requestUrl.origin);
  redirectUrl.searchParams.set('paypal', options.paypalState);
  if (options.subscriptionStatus) {
    redirectUrl.searchParams.set('subscription_status', options.subscriptionStatus);
  }
  if (options.message) {
    redirectUrl.searchParams.set('paypal_message', options.message);
  }
  return redirectUrl;
};

const syncPayPalSubscriptionById = async (
  subscriptionId: string,
  options?: { fallbackUserId?: string | null }
) => {
  const adminClient = createAdminClient();
  const subscription = await getSubscription(subscriptionId);
  return upsertPayPalSubscriptionSnapshot(
    {
      subscription,
      eventAt: new Date().toISOString(),
      fallbackUserId: options?.fallbackUserId ?? null
    },
    adminClient
  );
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const subscriptionId = (
    requestUrl.searchParams.get('subscription_id') ||
    requestUrl.searchParams.get('ba_token') ||
    ''
  ).trim();
  const studioPostId = requestUrl.searchParams.get('studioPostId');

  if (!subscriptionId) {
    return NextResponse.redirect(
      buildStudioRedirectUrl(requestUrl, {
        studioPostId,
        paypalState: 'error',
        message: 'missing_subscription_id'
      })
    );
  }

  try {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const result = await syncPayPalSubscriptionById(subscriptionId, {
      fallbackUserId: user?.id ?? null
    });

    if (user?.id && result.userId && result.userId !== user.id) {
      console.warn('[PayPal capture] user mismatch', {
        authUserId: user.id,
        subscriptionUserId: result.userId,
        subscriptionId
      });

      return NextResponse.redirect(
        buildStudioRedirectUrl(requestUrl, {
          studioPostId,
          paypalState: 'error',
          subscriptionStatus: result.status,
          message: 'user_mismatch'
        })
      );
    }

    return NextResponse.redirect(
      buildStudioRedirectUrl(requestUrl, {
        studioPostId,
        paypalState: result.hasActiveSubscription ? 'success' : 'inactive',
        subscriptionStatus: result.status
      })
    );
  } catch (error) {
    console.error('[PayPal capture] unexpected error', error);
    return NextResponse.redirect(
      buildStudioRedirectUrl(requestUrl, {
        studioPostId,
        paypalState: 'error',
        message: 'capture_failed'
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

    const body = (await request.json().catch(() => ({}))) as CaptureSubscriptionBody;
    const subscriptionId = (body.subscriptionId || '').trim();

    if (!subscriptionId) {
      return jsonError('Missing PayPal subscriptionId', 400);
    }

    const result = await syncPayPalSubscriptionById(subscriptionId, {
      fallbackUserId: user.id
    });

    if (result.userId && result.userId !== user.id) {
      return jsonError('Subscription does not belong to the current user', 403, {
        subscriptionId
      });
    }

    return NextResponse.json({
      ok: true,
      subscriptionId: result.subscriptionId,
      status: result.status,
      hasActiveSubscription: result.hasActiveSubscription
    });
  } catch (error) {
    if (isPayPalApiError(error)) {
      return jsonError('PayPal subscription fetch failed', error.status, error.details);
    }
    console.error('[PayPal capture POST] unexpected error', error);
    return jsonError(error instanceof Error ? error.message : 'Unexpected capture error', 500);
  }
}

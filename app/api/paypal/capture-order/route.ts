import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  captureOrder,
  getOrder,
  getPayPalEnvironment,
  isPayPalApiError
} from '@/utils/paypal';

export const runtime = 'nodejs';

type CaptureOrderRequestBody = {
  orderId?: string;
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getPayPalErrorIssue = (details: unknown) => {
  const payload = asRecord(details);
  const detailsArray = Array.isArray(payload?.details) ? payload.details : [];
  const first = asRecord(detailsArray[0]);
  const issue = typeof first?.issue === 'string' ? first.issue : null;
  const description = typeof first?.description === 'string' ? first.description : null;
  const message = typeof payload?.message === 'string' ? payload.message : null;
  const debugId = typeof payload?.debug_id === 'string' ? payload.debug_id : null;

  return { issue, description, message, debugId };
};

const buildCaptureErrorMessage = (details: unknown) => {
  const parsed = getPayPalErrorIssue(details);
  const parts = [
    parsed.message || 'PayPal capture failed',
    parsed.issue || null,
    parsed.description || null
  ].filter(Boolean);
  return parts.join(' | ');
};

export async function POST(request: Request) {
  let orderId = '';
  let environment: string | null = null;

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('로그인이 필요합니다. (PayPal order capture)', 401);
    }

    environment = getPayPalEnvironment();

    const body = (await request.json().catch(() => ({}))) as CaptureOrderRequestBody;
    orderId = (body.orderId || '').trim();

    if (!orderId) {
      return jsonError('Missing PayPal orderId', 400);
    }

    const payload = await captureOrder(orderId);

    console.log('[PayPal capture-order] response', {
      environment,
      orderId: typeof payload?.id === 'string' ? payload.id : orderId,
      orderStatus: typeof payload?.status === 'string' ? payload.status : null,
      payerEmail:
        typeof payload?.payer?.email_address === 'string'
          ? `${payload.payer.email_address.slice(0, 3)}***`
          : null
    });

    return NextResponse.json(
      {
        paypal: payload,
        debug: {
          environment
        }
      },
      { status: 200 }
    );
  } catch (error) {
    if (isPayPalApiError(error)) {
      const parsed = getPayPalErrorIssue(error.details);

      // PayPal may return ORDER_ALREADY_CAPTURED if the approval callback fires twice
      // or a retry hits a completed order. Treat completed orders as success.
      if (orderId && parsed.issue === 'ORDER_ALREADY_CAPTURED') {
        try {
          const order = await getOrder(orderId);
          console.warn('[PayPal capture-order] order already captured; returning existing order', {
            orderId,
            environment,
            orderStatus: typeof order?.status === 'string' ? order.status : null
          });

          return NextResponse.json(
            {
              paypal: order,
              debug: {
                environment,
                alreadyCaptured: true
              }
            },
            { status: 200 }
          );
        } catch (fallbackError) {
          console.error('[PayPal capture-order] fallback getOrder failed', {
            orderId,
            fallbackError
          });
        }
      }

      console.error('[PayPal capture-order] PayPal API error', {
        orderId,
        environment,
        status: error.status,
        details: error.details
      });

      return jsonError(buildCaptureErrorMessage(error.details), error.status, error.details);
    }
    console.error('[PayPal capture-order] unexpected error', error);
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected PayPal capture-order error',
      500
    );
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureOrder, getPayPalEnvironment, isPayPalApiError } from '@/utils/paypal';

export const runtime = 'nodejs';

type CaptureOrderRequestBody = {
  orderId?: string;
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
      return jsonError('로그인이 필요합니다. (PayPal order capture)', 401);
    }

    const environment = getPayPalEnvironment();

    const body = (await request.json().catch(() => ({}))) as CaptureOrderRequestBody;
    const orderId = (body.orderId || '').trim();

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
      return jsonError('PayPal capture failed', error.status, error.details);
    }
    console.error('[PayPal capture-order] unexpected error', error);
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected PayPal capture-order error',
      500
    );
  }
}

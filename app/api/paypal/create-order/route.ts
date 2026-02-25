import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  createOrder,
  getPayPalEnvironment,
  isPayPalApiError
} from '@/utils/paypal';

export const runtime = 'nodejs';

type CreateOrderRequestBody = {
  amount?: string | number;
  currency?: string;
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const normalizeAmount = (input: unknown) => {
  const raw = typeof input === 'number' ? String(input) : String(input ?? '');
  const numeric = Number(raw.replace(/,/g, '').trim());

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric.toFixed(2);
};

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError) {
      console.warn('[PayPal create-order] auth lookup warning (continuing as guest)', {
        message: authError.message
      });
    }

    const environment = getPayPalEnvironment();

    const body = (await request.json().catch(() => ({}))) as CreateOrderRequestBody;
    const amount = normalizeAmount(body.amount);
    const currency = String(body.currency || 'USD').toUpperCase();

    if (!amount) {
      return jsonError('Invalid PayPal amount. Expected a positive USD amount string/number.', 400);
    }

    const payload = await createOrder({ amount, currency, customId: user?.id ?? null });

    console.log('[PayPal create-order] response', {
      environment,
      hasUser: Boolean(user),
      orderId: typeof payload?.id === 'string' ? payload.id : null,
      orderStatus: typeof payload?.status === 'string' ? payload.status : null
    });

    if (typeof payload?.id !== 'string') {
      return jsonError('PayPal order creation failed: missing order ID in response', 502);
    }

    return NextResponse.json(
      {
        id: payload.id,
        status: payload.status ?? null,
        debug: {
          environment,
          amount,
          currency
        }
      },
      { status: 200 }
    );
  } catch (error) {
    if (isPayPalApiError(error)) {
      return jsonError('PayPal order creation failed', error.status, error.details);
    }
    console.error('[PayPal create-order] unexpected error', error);
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected PayPal create-order error',
      500
    );
  }
}

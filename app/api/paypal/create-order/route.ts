import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type PayPalEnv = 'sandbox' | 'live';

type CreateOrderRequestBody = {
  amount?: string | number;
  currency?: string;
};

const getPayPalConfig = () => {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const rawEnv = (process.env.PAYPAL_ENV || 'sandbox').trim().toLowerCase();
  const environment: PayPalEnv = rawEnv === 'live' || rawEnv === 'production' ? 'live' : 'sandbox';
  const baseUrl =
    environment === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

  return { clientId, clientSecret, environment, baseUrl };
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

const getAccessToken = async (baseUrl: string, clientId: string, clientSecret: string) => {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || typeof payload?.access_token !== 'string') {
    console.error('[PayPal create-order] token request failed', {
      status: response.status,
      environment: baseUrl.includes('sandbox') ? 'sandbox' : 'live',
      error: payload
    });
    throw new Error('Failed to get PayPal access token');
  }

  return payload.access_token as string;
};

export async function POST(request: Request) {
  try {
    const { clientId, clientSecret, environment, baseUrl } = getPayPalConfig();

    if (!clientId) {
      return jsonError('Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID', 500);
    }

    if (!clientSecret) {
      return jsonError('Missing PAYPAL_CLIENT_SECRET', 500);
    }

    const body = (await request.json().catch(() => ({}))) as CreateOrderRequestBody;
    const amount = normalizeAmount(body.amount);
    const currency = String(body.currency || 'USD').toUpperCase();

    if (!amount) {
      return jsonError('Invalid USD amount for PayPal checkout', 400);
    }

    console.log('[PayPal create-order] diagnostic', {
      environment,
      baseUrl,
      amount,
      currency,
      hasClientId: Boolean(clientId),
      clientIdPrefix: `${clientId.slice(0, 6)}...`
    });

    const accessToken = await getAccessToken(baseUrl, clientId, clientSecret);

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount
            }
          }
        ]
      }),
      cache: 'no-store'
    });

    const payload = await response.json().catch(() => ({}));

    console.log('[PayPal create-order] response', {
      statusCode: response.status,
      environment,
      orderId: typeof payload?.id === 'string' ? payload.id : null,
      orderStatus: typeof payload?.status === 'string' ? payload.status : null
    });

    if (!response.ok || typeof payload?.id !== 'string') {
      return jsonError('PayPal order creation failed', response.status || 500, {
        name: payload?.name ?? null,
        message: payload?.message ?? null,
        details: Array.isArray(payload?.details) ? payload.details : null
      });
    }

    return NextResponse.json(
      {
        id: payload.id,
        status: payload.status ?? null,
        debug: {
          environment,
          baseUrl,
          amount,
          currency
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PayPal create-order] unexpected error', error);
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected PayPal create-order error',
      500
    );
  }
}

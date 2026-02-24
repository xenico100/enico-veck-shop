import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type PayPalEnv = 'sandbox' | 'live';

type CaptureOrderRequestBody = {
  orderId?: string;
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
    console.error('[PayPal capture-order] token request failed', {
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

    const body = (await request.json().catch(() => ({}))) as CaptureOrderRequestBody;
    const orderId = (body.orderId || '').trim();

    if (!orderId) {
      return jsonError('Missing PayPal orderId', 400);
    }

    console.log('[PayPal capture-order] diagnostic', {
      environment,
      baseUrl,
      orderId
    });

    const accessToken = await getAccessToken(baseUrl, clientId, clientSecret);

    const response = await fetch(
      `${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      }
    );

    const payload = await response.json().catch(() => ({}));

    console.log('[PayPal capture-order] response', {
      statusCode: response.status,
      environment,
      orderId: typeof payload?.id === 'string' ? payload.id : orderId,
      orderStatus: typeof payload?.status === 'string' ? payload.status : null,
      payerEmail:
        typeof payload?.payer?.email_address === 'string'
          ? `${payload.payer.email_address.slice(0, 3)}***`
          : null
    });

    if (!response.ok) {
      return jsonError('PayPal capture failed', response.status || 500, {
        name: payload?.name ?? null,
        message: payload?.message ?? null,
        details: Array.isArray(payload?.details) ? payload.details : null
      });
    }

    return NextResponse.json(
      {
        paypal: payload,
        debug: {
          environment,
          baseUrl
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PayPal capture-order] unexpected error', error);
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected PayPal capture-order error',
      500
    );
  }
}

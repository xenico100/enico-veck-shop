import 'server-only';

type PayPalEnv = 'sandbox' | 'live';

type PayPalOAuthResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

export type PayPalSubscription = {
  id?: string;
  plan_id?: string;
  status?: string;
  custom_id?: string;
  create_time?: string;
  status_update_time?: string;
  billing_info?: {
    next_billing_time?: string | null;
    final_payment_time?: string | null;
    last_payment?: {
      amount?: {
        currency_code?: string;
        value?: string;
      };
      time?: string;
    };
  };
  subscriber?: {
    payer_id?: string;
    email_address?: string;
    name?: {
      given_name?: string;
      surname?: string;
    };
  };
  plan?: {
    id?: string;
    name?: string;
    status?: string;
    billing_cycles?: Array<{
      frequency?: {
        interval_unit?: string;
        interval_count?: number;
      };
      pricing_scheme?: {
        fixed_price?: {
          currency_code?: string;
          value?: string;
        };
      };
    }>;
  };
  [key: string]: unknown;
};

export type PayPalCreateSubscriptionResponse = {
  id?: string;
  status?: string;
  links?: Array<{
    href?: string;
    rel?: string;
    method?: string;
  }>;
  [key: string]: unknown;
};

export type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  create_time?: string;
  resource_type?: string;
  summary?: string;
  resource?: Record<string, unknown>;
  [key: string]: unknown;
};

type VerifyWebhookResponse = {
  verification_status?: string;
};

type PayPalConfig = {
  clientId: string;
  secret: string;
  webhookId: string | null;
  environment: PayPalEnv;
  baseUrl: string;
};

type PayPalRequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

class PayPalApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = 'PayPalApiError';
    this.status = status;
    this.details = details;
  }
}

const getPayPalConfig = (): PayPalConfig => {
  const clientId =
    process.env.PAYPAL_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() ||
    '';
  const secret =
    process.env.PAYPAL_SECRET?.trim() || process.env.PAYPAL_CLIENT_SECRET?.trim() || '';
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim() || null;
  const rawEnv = (process.env.PAYPAL_ENV || 'sandbox').trim().toLowerCase();
  const environment: PayPalEnv =
    rawEnv === 'live' || rawEnv === 'production' ? 'live' : 'sandbox';
  const baseUrl =
    environment === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

  if (!clientId) {
    throw new Error('Missing PAYPAL_CLIENT_ID');
  }

  if (!secret) {
    throw new Error('Missing PAYPAL_SECRET');
  }

  return { clientId, secret, webhookId, environment, baseUrl };
};

const basicAuthHeader = (clientId: string, secret: string) =>
  `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`;

const parseJson = async (response: Response) => response.json().catch(() => ({}));

async function paypalFetch<T>(
  path: string,
  init: PayPalRequestInit = {},
  options?: { accessToken?: string }
): Promise<T> {
  const { baseUrl } = getPayPalConfig();
  const headers = new Headers(init.headers ?? {});

  if (options?.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`);
  }

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method || 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store'
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new PayPalApiError(
      `PayPal API request failed: ${path}`,
      response.status,
      payload
    );
  }

  return payload as T;
}

export async function getAccessToken() {
  const { clientId, secret, baseUrl } = getPayPalConfig();

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(clientId, secret),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store'
  });

  const payload = (await parseJson(response)) as PayPalOAuthResponse;

  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new PayPalApiError('Failed to get PayPal access token', response.status, payload);
  }

  return payload.access_token;
}

export async function createSubscription(
  planId: string,
  returnUrl: string,
  cancelUrl: string,
  customId: string
) {
  const accessToken = await getAccessToken();

  return paypalFetch<PayPalCreateSubscriptionResponse>(
    '/v1/billing/subscriptions',
    {
      method: 'POST',
      body: {
        plan_id: planId,
        custom_id: customId,
        application_context: {
          brand_name: process.env.NEXT_PUBLIC_SITE_NAME?.trim() || 'Studio',
          user_action: 'SUBSCRIBE_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl
        }
      }
    },
    { accessToken }
  );
}

export async function getSubscription(subscriptionId: string) {
  const accessToken = await getAccessToken();
  return paypalFetch<PayPalSubscription>(
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { method: 'GET' },
    { accessToken }
  );
}

const getWebhookHeader = (headers: Headers, key: string) =>
  headers.get(key) || headers.get(key.toLowerCase()) || '';

export async function verifyWebhook(headers: Headers, rawBody: string) {
  const config = getPayPalConfig();
  if (!config.webhookId) {
    throw new Error('Missing PAYPAL_WEBHOOK_ID');
  }

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    throw new Error('Invalid PayPal webhook JSON body');
  }

  const accessToken = await getAccessToken();

  const payload = await paypalFetch<VerifyWebhookResponse>(
    '/v1/notifications/verify-webhook-signature',
    {
      method: 'POST',
      body: {
        auth_algo: getWebhookHeader(headers, 'paypal-auth-algo'),
        cert_url: getWebhookHeader(headers, 'paypal-cert-url'),
        transmission_id: getWebhookHeader(headers, 'paypal-transmission-id'),
        transmission_sig: getWebhookHeader(headers, 'paypal-transmission-sig'),
        transmission_time: getWebhookHeader(headers, 'paypal-transmission-time'),
        webhook_id: config.webhookId,
        webhook_event: event
      }
    },
    { accessToken }
  );

  return {
    verified: (payload.verification_status || '').toUpperCase() === 'SUCCESS',
    event
  };
}

export const getPayPalApprovalUrl = (
  response: PayPalCreateSubscriptionResponse
) =>
  response.links?.find((link) => link.rel === 'approve' && typeof link.href === 'string')
    ?.href ?? null;

export const isPayPalApiError = (error: unknown): error is PayPalApiError =>
  error instanceof PayPalApiError;

export const getPayPalEnvironment = () => getPayPalConfig().environment;


import { timingSafeEqual } from 'node:crypto';
import { isAnonymousSignup, parseSignupCutoff } from './signup-eligibility';

export const SIGNUP_ALERT_MARKER = 'admin_signup_alert_mongsangin_v1';
const MAX_BODY_BYTES = 16 * 1024;
const MAX_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SignupRecord = {
  id: string;
  email?: string | null;
  is_anonymous?: boolean;
  created_at: string;
  app_metadata?: Record<string, unknown>;
};

export type SignupNotificationDependencies = {
  secret: () => string | undefined;
  enabledAt?: () => string | undefined;
  getUser: (id: string) => Promise<SignupRecord | null>;
  notify: (user: SignupRecord) => Promise<{ sent: boolean }>;
  markNotified: (id: string, sentAt: string) => Promise<void>;
  now?: () => number;
};

const json = (status: number, data: Record<string, string | boolean>) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

async function readEvent(request: Request): Promise<{ status: 400 | 413 } | { event: unknown }> {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) {
    return { status: 413 } as const;
  }
  const reader = request.body?.getReader();
  if (!reader) return { status: 400 } as const;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return { status: 413 } as const;
    }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  try {
    return { event: JSON.parse(body) as unknown } as const;
  } catch {
    return { status: 400 } as const;
  }
}

export async function processSignupUser(userId: string, dependencies: SignupNotificationDependencies) {
  const cutoff = parseSignupCutoff(dependencies.enabledAt?.());
  if (!cutoff.ok) throw new Error('Notification cutoff is invalid');
  const user = await dependencies.getUser(userId);
  if (!user || user.id !== userId) return 'missing_user';
  const email = user.email?.trim() ?? '';
  if (isAnonymousSignup(user) || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return 'not_registered_member';
  const now = (dependencies.now ?? Date.now)();
  const createdAt = Date.parse(user.created_at), age = now - createdAt;
  if (!Number.isFinite(age) || age < 0 || age >= MAX_ACCOUNT_AGE_MS) return 'not_new_signup';
  if (cutoff.at !== null && createdAt < cutoff.at) return 'not_enabled_yet';
  if (user.app_metadata?.[SIGNUP_ALERT_MARKER]) return 'already_notified';
  const result = await dependencies.notify(user);
  if (!result.sent) throw new Error('Signup notification was not accepted');
  await dependencies.markNotified(user.id, new Date(now).toISOString());
  return 'sent';
}

export const createSignupWebhookHandler = (dependencies: SignupNotificationDependencies) =>
  async (request: Request) => {
    const expected = dependencies.secret()?.trim() ?? '';
    if (expected.length < 32) return json(503, { error: 'notification_not_configured' });
    const provided = request.headers.get('x-signup-webhook-secret') ?? '';
    const actualBytes = Buffer.from(provided);
    const expectedBytes = Buffer.from(expected);
    if (
      actualBytes.length !== expectedBytes.length ||
      !timingSafeEqual(actualBytes, expectedBytes)
    ) {
      return json(401, { error: 'unauthorized' });
    }

    try {
      const parsed = await readEvent(request);
      if ('status' in parsed) return json(parsed.status, { error: 'invalid_event' });
      const event = parsed.event;
      if (!event || typeof event !== 'object' || Array.isArray(event)) {
        return json(400, { error: 'invalid_event' });
      }
      const row = event as Record<string, unknown>;
      if (row.type !== 'INSERT' || row.schema !== 'auth' || row.table !== 'users') {
        return json(400, { error: 'unsupported_event' });
      }
      const record = row.record;
      const userId = record && typeof record === 'object' && !Array.isArray(record)
        ? (record as Record<string, unknown>).id
        : null;
      if (typeof userId !== 'string' || !UUID.test(userId)) {
        return json(400, { error: 'invalid_user_id' });
      }

      // Never trust the event body's email, metadata or anonymity claims.
      const outcome = await processSignupUser(userId, dependencies);
      return outcome === 'sent' ? json(200, { sent: true }) : json(200, { skipped: outcome });
    } catch {
      // No account details, secrets or provider error bodies are exposed in webhook responses.
      return json(503, { error: 'notification_unavailable' });
    }
  };

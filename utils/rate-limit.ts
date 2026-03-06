import 'server-only';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitBucket>;

type ConsumeRateLimitParams = {
  key: string;
  max: number;
  windowMs: number;
  nowMs?: number;
};

type ConsumeRateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const STORE_PRUNE_THRESHOLD = 10_000;
const STORE_PRUNE_TARGET = 9_000;

declare global {
  // eslint-disable-next-line no-var
  var __appRateLimitStore: RateLimitStore | undefined;
}

const getStore = (): RateLimitStore => {
  if (!globalThis.__appRateLimitStore) {
    globalThis.__appRateLimitStore = new Map<string, RateLimitBucket>();
  }
  return globalThis.__appRateLimitStore;
};

const pruneStoreIfNeeded = (store: RateLimitStore, nowMs: number) => {
  if (store.size < STORE_PRUNE_THRESHOLD) return;

  store.forEach((bucket, key) => {
    if (bucket.resetAt <= nowMs) {
      store.delete(key);
    }
  });

  if (store.size <= STORE_PRUNE_TARGET) return;
  const keys = Array.from(store.keys());
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    store.delete(key);
    if (store.size <= STORE_PRUNE_TARGET) break;
  }
};

const parseForwardedFor = (value: string | null) => {
  if (!value) return '';
  const [first] = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return first || '';
};

export const getRequestIp = (request: Request) => {
  const headers = request.headers;
  const forwardedFor = parseForwardedFor(headers.get('x-forwarded-for'));
  if (forwardedFor) return forwardedFor;

  const realIp = headers.get('x-real-ip')?.trim() || '';
  if (realIp) return realIp;

  const cfIp = headers.get('cf-connecting-ip')?.trim() || '';
  if (cfIp) return cfIp;

  return 'unknown';
};

export const buildRateLimitKey = (params: {
  request: Request;
  scope: string;
  userId?: string | null;
}) => {
  const normalizedScope = params.scope.trim() || 'default';
  const normalizedUserId = params.userId?.trim() || '';
  if (normalizedUserId) {
    return `${normalizedScope}:user:${normalizedUserId}`;
  }
  return `${normalizedScope}:ip:${getRequestIp(params.request)}`;
};

export const consumeRateLimit = ({
  key,
  max,
  windowMs,
  nowMs = Date.now()
}: ConsumeRateLimitParams): ConsumeRateLimitResult => {
  const safeMax = Math.max(1, Math.floor(max));
  const safeWindowMs = Math.max(1_000, Math.floor(windowMs));
  const normalizedKey = key.trim();
  const store = getStore();

  pruneStoreIfNeeded(store, nowMs);

  const existing = store.get(normalizedKey);
  if (!existing || existing.resetAt <= nowMs) {
    const resetAt = nowMs + safeWindowMs;
    store.set(normalizedKey, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: safeMax - 1,
      resetAt,
      retryAfterSeconds: Math.ceil(safeWindowMs / 1000)
    };
  }

  existing.count += 1;
  store.set(normalizedKey, existing);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((existing.resetAt - nowMs) / 1000)
  );

  if (existing.count > safeMax) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, safeMax - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds
  };
};

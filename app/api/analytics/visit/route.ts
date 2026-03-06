import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { buildRateLimitKey, consumeRateLimit } from '@/utils/rate-limit';

export const runtime = 'nodejs';

const VISITOR_COOKIE_KEY = 'site_visitor_id';
const VISITOR_LAST_TRACKED_AT_COOKIE_KEY = 'site_visitor_last_tracked_at';
const VISIT_TIME_ZONE = 'Asia/Seoul';
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const VISIT_TRACK_THROTTLE_MS = 30 * 1000;
const VISIT_RATE_LIMIT_MAX = 240;
const VISIT_RATE_LIMIT_WINDOW_MS = 60 * 1000;

type VisitTrackBody = {
  path?: string;
};

const getKstDate = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VISIT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
};

const sanitizePath = (value: unknown) => {
  if (typeof value !== 'string') return '/';
  const trimmed = value.trim();
  if (!trimmed) return '/';
  return trimmed.slice(0, 240);
};

const hasMissingSiteDailyVisitsTableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();

  return (
    (combined.includes('site_daily_visits') || combined.includes('public.site_daily_visits')) &&
    (combined.includes('does not exist') ||
      combined.includes('schema cache') ||
      combined.includes('could not find the table'))
  );
};

const tryCreateAdminClient = () => {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
};

const parseCookieMs = (value: string | undefined) => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
};

const withVisitorCookies = (
  response: NextResponse,
  visitorId: string,
  lastTrackedAtMs?: number
) => {
  response.cookies.set({
    name: VISITOR_COOKIE_KEY,
    value: visitorId,
    path: '/',
    maxAge: VISITOR_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  if (typeof lastTrackedAtMs === 'number' && Number.isFinite(lastTrackedAtMs) && lastTrackedAtMs > 0) {
    response.cookies.set({
      name: VISITOR_LAST_TRACKED_AT_COOKIE_KEY,
      value: String(Math.floor(lastTrackedAtMs)),
      path: '/',
      maxAge: VISITOR_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
  }

  return response;
};

export async function POST(request: Request) {
  const cookieStore = cookies();
  const existingVisitorId = cookieStore.get(VISITOR_COOKIE_KEY)?.value?.trim() ?? '';
  const visitorId = existingVisitorId || crypto.randomUUID();
  const nowMs = Date.now();
  const lastTrackedAtMs = parseCookieMs(
    cookieStore.get(VISITOR_LAST_TRACKED_AT_COOKIE_KEY)?.value
  );
  const visitDate = getKstDate();

  const body = (await request.json().catch(() => ({}))) as VisitTrackBody;
  const path = sanitizePath(body.path);
  const userAgent = headers().get('user-agent')?.trim().slice(0, 255) || null;

  const rateLimit = consumeRateLimit({
    key: existingVisitorId
      ? `analytics-visit:visitor:${existingVisitorId}`
      : buildRateLimitKey({ request, scope: 'analytics-visit' }),
    max: VISIT_RATE_LIMIT_MAX,
    windowMs: VISIT_RATE_LIMIT_WINDOW_MS
  });
  if (!rateLimit.allowed) {
    return withVisitorCookies(
      NextResponse.json({ ok: true, tracked: false, reason: 'rate-limited' }),
      visitorId
    );
  }

  if (lastTrackedAtMs && nowMs - lastTrackedAtMs < VISIT_TRACK_THROTTLE_MS) {
    return withVisitorCookies(
      NextResponse.json({ ok: true, tracked: false, reason: 'throttled' }),
      visitorId,
      lastTrackedAtMs
    );
  }

  const admin = tryCreateAdminClient();
  if (!admin) {
    return withVisitorCookies(
      NextResponse.json({ ok: true, tracked: false, reason: 'admin-client-unavailable' }),
      visitorId
    );
  }

  let userId: string | null = null;
  try {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  const { error } = await (admin as any).from('site_daily_visits').upsert(
    {
      visit_date: visitDate,
      visitor_id: visitorId,
      user_id: userId,
      last_path: path,
      user_agent: userAgent
    },
    { onConflict: 'visit_date,visitor_id' }
  );

  if (error) {
    if (!hasMissingSiteDailyVisitsTableError(error)) {
      console.error('[analytics/visit] failed to upsert visit row', error);
    }
    return withVisitorCookies(
      NextResponse.json({ ok: true, tracked: false, reason: 'table-unavailable' }),
      visitorId
    );
  }

  return withVisitorCookies(
    NextResponse.json({ ok: true, tracked: true, date: visitDate }),
    visitorId,
    nowMs
  );
}

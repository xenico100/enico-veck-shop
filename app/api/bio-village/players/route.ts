import { NextResponse } from 'next/server';

import { buildRateLimitKey, consumeRateLimit } from '@/utils/rate-limit';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLAYER_ROOM = 'bio-village';
const PLAYER_ACTIVE_WINDOW_MS = 15_000;
const PLAYER_CLEANUP_STALE_SECONDS = 45;
const PLAYER_CLEANUP_INTERVAL_MS = 15_000;
const PLAYER_RATE_LIMIT_MAX = 420;
const PLAYER_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const PLAYER_LABEL_MAX_LENGTH = 40;
const PLAYER_KEY_MAX_LENGTH = 96;

type PlayerStateBody = {
  dir?: unknown;
  key?: unknown;
  label?: unknown;
  latestPoop?: unknown;
  moving?: unknown;
  palette?: unknown;
  preset?: unknown;
  profile?: unknown;
  vx?: unknown;
  vy?: unknown;
  x?: unknown;
  y?: unknown;
};

type PlayerStateRow = {
  dir: string | null;
  label: string | null;
  latest_poop: unknown;
  palette: string | null;
  participant_key: string;
  preset: string | null;
  profile: unknown;
  updated_at: string | null;
  vx: number | null;
  vy: number | null;
  x: number | null;
  y: number | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __bioVillagePlayerStatesLastPruneAt: number | undefined;
}

const noStoreJson = (body: unknown, init?: ResponseInit) =>
  NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      ...(init?.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : ((init?.headers as Record<string, string> | undefined) ?? {}))
    }
  });

const tryCreateAdminClient = () => {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
};

const getCurrentUserId = async () => {
  try {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
};

const sanitizeText = (value: unknown, fallback: string, maxLength: number) => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  return normalized.slice(0, maxLength);
};

const sanitizeParticipantKey = (value: unknown) =>
  sanitizeText(value, '', PLAYER_KEY_MAX_LENGTH)
    .replace(/[^a-zA-Z0-9:_-]/g, '')
    .slice(0, PLAYER_KEY_MAX_LENGTH);

const sanitizeFiniteNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

const sanitizeDirection = (value: unknown) => {
  if (
    value === 'down' ||
    value === 'left' ||
    value === 'right' ||
    value === 'up'
  ) {
    return value;
  }
  return 'down';
};

const sanitizePalette = (value: unknown) => {
  if (
    value === 'amber' ||
    value === 'cobalt' ||
    value === 'crimson' ||
    value === 'jade' ||
    value === 'violet'
  ) {
    return value;
  }
  return 'crimson';
};

const sanitizePreset = (value: unknown) => {
  if (
    value === 'archivist' ||
    value === 'courier' ||
    value === 'ghost' ||
    value === 'medic'
  ) {
    return value;
  }
  return 'archivist';
};

const sanitizeProfile = (value: unknown) => {
  if (!value || typeof value !== 'object') return {};
  const profile = value as Record<string, unknown>;
  return {
    bio: sanitizeText(profile.bio, '', 180),
    interests: sanitizeText(profile.interests, '', 180),
    mbti: sanitizeText(profile.mbti, '', 12),
    name: sanitizeText(profile.name, '', 40),
    tagline: sanitizeText(profile.tagline, '', 120)
  };
};

const sanitizeLatestPoop = (value: unknown) => {
  if (!value || typeof value !== 'object') return null;
  const poop = value as Record<string, unknown>;
  if (
    typeof poop.id !== 'string' ||
    typeof poop.actorId !== 'string' ||
    typeof poop.dropX !== 'number' ||
    typeof poop.dropY !== 'number'
  ) {
    return null;
  }

  return {
    actorId: sanitizeParticipantKey(poop.actorId),
    createdAt: sanitizeFiniteNumber(poop.createdAt, Date.now(), 0, Date.now()),
    dropX: sanitizeFiniteNumber(poop.dropX, 0, -10_000, 10_000),
    dropY: sanitizeFiniteNumber(poop.dropY, 0, -10_000, 10_000),
    id: poop.id.slice(0, 96)
  };
};

const hasMissingPlayerStatesTableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();

  return (
    (combined.includes('bio_village_player_states') ||
      combined.includes('prune_bio_village_player_states')) &&
    (combined.includes('does not exist') ||
      combined.includes('schema cache') ||
      combined.includes('could not find'))
  );
};

const prunePlayerStatesIfDue = async (
  admin: ReturnType<typeof createAdminClient>
) => {
  const nowMs = Date.now();
  if (
    globalThis.__bioVillagePlayerStatesLastPruneAt &&
    nowMs - globalThis.__bioVillagePlayerStatesLastPruneAt <
      PLAYER_CLEANUP_INTERVAL_MS
  ) {
    return;
  }

  globalThis.__bioVillagePlayerStatesLastPruneAt = nowMs;
  const { error } = await (admin as any).rpc(
    'prune_bio_village_player_states',
    {
      p_room: PLAYER_ROOM,
      p_stale_seconds: PLAYER_CLEANUP_STALE_SECONDS
    }
  );

  if (error && !hasMissingPlayerStatesTableError(error)) {
    console.error('[bio-village/players] failed to prune player states', error);
  }
};

const toPlayerPayload = (row: PlayerStateRow) => {
  const sentAt = row.updated_at ? Date.parse(row.updated_at) : Date.now();
  const vx = row.vx ?? 0;
  const vy = row.vy ?? 0;

  return {
    dir: sanitizeDirection(row.dir),
    key: row.participant_key,
    label: sanitizeText(row.label, 'Visitor', PLAYER_LABEL_MAX_LENGTH),
    latestPoop: sanitizeLatestPoop(row.latest_poop),
    moving: Math.hypot(vx, vy) > 0.1,
    palette: sanitizePalette(row.palette),
    preset: sanitizePreset(row.preset),
    profile: sanitizeProfile(row.profile),
    sentAt: Number.isFinite(sentAt) ? sentAt : Date.now(),
    vx,
    vy,
    x: row.x ?? 0,
    y: row.y ?? 0
  };
};

export async function GET() {
  const admin = tryCreateAdminClient();
  if (!admin) {
    return noStoreJson({
      data: [],
      ok: false,
      reason: 'admin-client-unavailable'
    });
  }

  void prunePlayerStatesIfDue(admin);

  const cutoff = new Date(Date.now() - PLAYER_ACTIVE_WINDOW_MS).toISOString();
  const { data, error } = await (admin as any)
    .from('bio_village_player_states')
    .select(
      'participant_key, label, x, y, vx, vy, dir, palette, preset, profile, latest_poop, updated_at'
    )
    .eq('room', PLAYER_ROOM)
    .gte('updated_at', cutoff)
    .order('updated_at', { ascending: false })
    .limit(64);

  if (error) {
    if (!hasMissingPlayerStatesTableError(error)) {
      console.error(
        '[bio-village/players] failed to load player states',
        error
      );
    }
    return noStoreJson({
      data: [],
      ok: false,
      reason: 'player-states-unavailable'
    });
  }

  return noStoreJson({
    data: ((data ?? []) as PlayerStateRow[]).map(toPlayerPayload),
    ok: true
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PlayerStateBody;
  const key = sanitizeParticipantKey(body.key);
  if (!key) {
    return noStoreJson(
      {
        ok: false,
        reason: 'missing-key'
      },
      { status: 400 }
    );
  }

  const userId = await getCurrentUserId();
  const rateLimit = consumeRateLimit({
    key: buildRateLimitKey({
      request,
      scope: 'bio-village-player-state',
      userId
    }),
    max: PLAYER_RATE_LIMIT_MAX,
    windowMs: PLAYER_RATE_LIMIT_WINDOW_MS
  });

  if (!rateLimit.allowed) {
    return noStoreJson(
      {
        ok: false,
        reason: 'rate-limited'
      },
      {
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds)
        },
        status: 429
      }
    );
  }

  const admin = tryCreateAdminClient();
  if (!admin) {
    return noStoreJson({
      ok: false,
      reason: 'admin-client-unavailable'
    });
  }

  const { error } = await (admin as any)
    .from('bio_village_player_states')
    .upsert(
      {
        dir: sanitizeDirection(body.dir),
        label: sanitizeText(body.label, 'Visitor', PLAYER_LABEL_MAX_LENGTH),
        latest_poop: sanitizeLatestPoop(body.latestPoop),
        palette: sanitizePalette(body.palette),
        participant_key: key,
        preset: sanitizePreset(body.preset),
        profile: sanitizeProfile(body.profile),
        room: PLAYER_ROOM,
        updated_at: new Date().toISOString(),
        user_id: userId,
        vx: sanitizeFiniteNumber(body.vx, 0, -120, 120),
        vy: sanitizeFiniteNumber(body.vy, 0, -120, 120),
        x: sanitizeFiniteNumber(body.x, 0, 0, 10_000),
        y: sanitizeFiniteNumber(body.y, 0, 0, 10_000)
      },
      { onConflict: 'participant_key' }
    );

  if (error) {
    if (!hasMissingPlayerStatesTableError(error)) {
      console.error(
        '[bio-village/players] failed to store player state',
        error
      );
    }
    return noStoreJson({
      ok: false,
      reason: 'player-states-unavailable'
    });
  }

  void prunePlayerStatesIfDue(admin);

  return noStoreJson({ ok: true });
}

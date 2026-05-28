import { NextResponse } from 'next/server';

import {
  BIO_VILLAGE_CHAT_HISTORY_LIMIT,
  BIO_VILLAGE_CHAT_MAX_LENGTH,
  BIO_VILLAGE_CHAT_ROOM,
  BIO_VILLAGE_CHAT_STORAGE_KEEP_RECENT,
  BIO_VILLAGE_CHAT_STORAGE_RETENTION_HOURS,
  normalizeBioVillageChatText
} from '@/utils/bio-village-chat';
import { buildRateLimitKey, consumeRateLimit } from '@/utils/rate-limit';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHAT_AUTHOR_MAX_LENGTH = 40;
const CHAT_ACTOR_ID_MAX_LENGTH = 96;
const CHAT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const CHAT_WRITE_RATE_LIMIT_MAX = 24;
const CHAT_WRITE_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StoredChatRow = {
  actor_id: string | null;
  author: string | null;
  body: string | null;
  created_at: string | null;
  id: string;
};

type StoredChatPayload = {
  actorId: string;
  author: string;
  id: string;
  sentAt: number;
  text: string;
};

type ChatRequestBody = {
  actorId?: unknown;
  author?: unknown;
  id?: unknown;
  text?: unknown;
};

declare global {
  // eslint-disable-next-line no-var
  var __bioVillageChatLastPruneAt: number | undefined;
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

const sanitizeBoundedText = (
  value: unknown,
  fallback: string,
  maxLength: number
) => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  return normalized.slice(0, maxLength);
};

const sanitizeActorId = (value: unknown) => {
  const normalized = sanitizeBoundedText(value, '', CHAT_ACTOR_ID_MAX_LENGTH)
    .replace(/[^a-zA-Z0-9:_-]/g, '')
    .slice(0, CHAT_ACTOR_ID_MAX_LENGTH);
  return normalized || 'anonymous';
};

const toStoredChatPayload = (row: StoredChatRow): StoredChatPayload => {
  const text = normalizeBioVillageChatText(row.body ?? '');
  const createdAtMs = row.created_at ? Date.parse(row.created_at) : NaN;

  return {
    actorId: sanitizeActorId(row.actor_id),
    author: sanitizeBoundedText(row.author, 'Visitor', CHAT_AUTHOR_MAX_LENGTH),
    id: row.id,
    sentAt: Number.isFinite(createdAtMs) ? createdAtMs : Date.now(),
    text
  };
};

const hasMissingBioVillageChatTableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const code = typeof row.code === 'string' ? row.code : '';
  const combined = `${code} ${message} ${details} ${hint}`.toLowerCase();

  return (
    (combined.includes('bio_village_chat_messages') ||
      combined.includes('prune_bio_village_chat_messages')) &&
    (combined.includes('does not exist') ||
      combined.includes('schema cache') ||
      combined.includes('could not find'))
  );
};

const hasDuplicateChatMessageError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const code = typeof row.code === 'string' ? row.code : '';
  const message = typeof row.message === 'string' ? row.message : '';
  return code === '23505' || message.toLowerCase().includes('duplicate key');
};

const pruneChatHistoryIfDue = async (
  admin: ReturnType<typeof createAdminClient>
) => {
  const nowMs = Date.now();
  if (
    globalThis.__bioVillageChatLastPruneAt &&
    nowMs - globalThis.__bioVillageChatLastPruneAt < CHAT_CLEANUP_INTERVAL_MS
  ) {
    return;
  }

  globalThis.__bioVillageChatLastPruneAt = nowMs;
  const { error } = await (admin as any).rpc(
    'prune_bio_village_chat_messages',
    {
      p_keep_recent: BIO_VILLAGE_CHAT_STORAGE_KEEP_RECENT,
      p_retention_minutes: BIO_VILLAGE_CHAT_STORAGE_RETENTION_HOURS * 60,
      p_room: BIO_VILLAGE_CHAT_ROOM
    }
  );

  if (error && !hasMissingBioVillageChatTableError(error)) {
    console.error('[bio-village/chat] failed to prune chat history', error);
  }
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

  await pruneChatHistoryIfDue(admin);

  const cutoff = new Date(
    Date.now() - BIO_VILLAGE_CHAT_STORAGE_RETENTION_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await (admin as any)
    .from('bio_village_chat_messages')
    .select('id, actor_id, author, body, created_at')
    .eq('room', BIO_VILLAGE_CHAT_ROOM)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(BIO_VILLAGE_CHAT_HISTORY_LIMIT);

  if (error) {
    if (!hasMissingBioVillageChatTableError(error)) {
      console.error('[bio-village/chat] failed to load chat history', error);
    }
    return noStoreJson({
      data: [],
      ok: false,
      reason: 'chat-table-unavailable'
    });
  }

  const messages = ((data ?? []) as StoredChatRow[])
    .map(toStoredChatPayload)
    .filter((message) => message.text)
    .reverse();

  return noStoreJson({ data: messages, ok: true });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ChatRequestBody;
  const text = normalizeBioVillageChatText(
    typeof body.text === 'string' ? body.text : ''
  );

  if (!text) {
    return noStoreJson(
      {
        ok: false,
        reason: 'empty-message'
      },
      { status: 400 }
    );
  }

  const userId = await getCurrentUserId();
  const rateLimit = consumeRateLimit({
    key: buildRateLimitKey({
      request,
      scope: 'bio-village-chat',
      userId
    }),
    max: CHAT_WRITE_RATE_LIMIT_MAX,
    windowMs: CHAT_WRITE_RATE_LIMIT_WINDOW_MS
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

  const requestedId =
    typeof body.id === 'string' && UUID_PATTERN.test(body.id.trim())
      ? body.id.trim()
      : crypto.randomUUID();
  const actorId = sanitizeActorId(body.actorId);
  const author = sanitizeBoundedText(
    body.author,
    'Visitor',
    CHAT_AUTHOR_MAX_LENGTH
  );

  const { data, error } = await (admin as any)
    .from('bio_village_chat_messages')
    .insert({
      actor_id: actorId,
      author,
      body: text.slice(0, BIO_VILLAGE_CHAT_MAX_LENGTH),
      id: requestedId,
      room: BIO_VILLAGE_CHAT_ROOM,
      user_id: userId
    })
    .select('id, actor_id, author, body, created_at')
    .single();

  if (error) {
    if (hasDuplicateChatMessageError(error)) {
      return noStoreJson({
        data: {
          actorId,
          author,
          id: requestedId,
          sentAt: Date.now(),
          text
        },
        duplicate: true,
        ok: true
      });
    }

    if (!hasMissingBioVillageChatTableError(error)) {
      console.error('[bio-village/chat] failed to store chat message', error);
    }
    return noStoreJson({
      ok: false,
      reason: 'chat-table-unavailable'
    });
  }

  void pruneChatHistoryIfDue(admin);

  return noStoreJson({
    data: toStoredChatPayload(data as StoredChatRow),
    ok: true
  });
}

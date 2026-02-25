import { NextResponse } from 'next/server';
import {
  getSubscription,
  isPayPalApiError,
  type PayPalSubscription,
  type PayPalWebhookEvent,
  verifyWebhook
} from '@/utils/paypal';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { upsertPayPalSubscriptionSnapshot } from '@/utils/studio-subscription';

export const runtime = 'nodejs';

const RELEVANT_EVENTS = new Set([
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.UPDATED',
  'PAYMENT.SALE.COMPLETED'
]);

const STATUS_BY_EVENT_TYPE: Record<string, string> = {
  'BILLING.SUBSCRIPTION.ACTIVATED': 'ACTIVE',
  'BILLING.SUBSCRIPTION.CANCELLED': 'CANCELLED',
  'BILLING.SUBSCRIPTION.SUSPENDED': 'SUSPENDED',
  'BILLING.SUBSCRIPTION.EXPIRED': 'EXPIRED'
};

type WebhookEventRow = {
  id: string;
  processed_at: string | null;
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getString = (record: Record<string, unknown> | null, key: string) => {
  if (!record) return null;
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const getNestedRecord = (record: Record<string, unknown> | null, key: string) =>
  asRecord(record?.[key]);

const getSubscriptionIdFromEvent = (event: PayPalWebhookEvent) => {
  const eventType = (event.event_type || '').trim().toUpperCase();
  const resource = asRecord(event.resource);

  if (!resource) return null;

  if (eventType.startsWith('BILLING.SUBSCRIPTION.')) {
    return getString(resource, 'id');
  }

  const directBillingAgreementId = getString(resource, 'billing_agreement_id');
  if (directBillingAgreementId) return directBillingAgreementId;

  const supplementaryData = getNestedRecord(resource, 'supplementary_data');
  const relatedIds = getNestedRecord(supplementaryData, 'related_ids');
  return (
    getString(relatedIds, 'subscription_id') ||
    getString(relatedIds, 'billing_agreement_id') ||
    null
  );
};

const buildFallbackSubscriptionFromWebhook = (event: PayPalWebhookEvent) => {
  const resource = asRecord(event.resource);
  const subscriptionId = getSubscriptionIdFromEvent(event);
  if (!resource || !subscriptionId) return null;

  const inferredStatus =
    STATUS_BY_EVENT_TYPE[(event.event_type || '').trim().toUpperCase()] ||
    getString(resource, 'status') ||
    null;

  return {
    id: subscriptionId,
    plan_id: getString(resource, 'plan_id') || undefined,
    custom_id: getString(resource, 'custom_id') || undefined,
    status: inferredStatus || undefined,
    status_update_time: getString(resource, 'status_update_time') || event.create_time,
    create_time: getString(resource, 'create_time') || event.create_time,
    billing_info: (getNestedRecord(resource, 'billing_info') as PayPalSubscription['billing_info']) || undefined,
    subscriber: (getNestedRecord(resource, 'subscriber') as PayPalSubscription['subscriber']) || undefined
  } satisfies PayPalSubscription;
};

const getWebhookEventId = (headers: Headers, event: PayPalWebhookEvent) =>
  (typeof event.id === 'string' && event.id.trim()) ||
  headers.get('paypal-transmission-id')?.trim() ||
  null;

const ensureWebhookEventProcessable = async (
  adminClient: ReturnType<typeof createAdminClient>,
  eventId: string,
  eventType: string,
  raw: unknown
) => {
  const { data, error } = await (adminClient as any)
    .from('paypal_webhook_events')
    .select('id,processed_at')
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read webhook dedupe row: ${error.message}`);
  }

  const existing = (data ?? null) as WebhookEventRow | null;
  if (existing?.processed_at) {
    return { alreadyProcessed: true };
  }

  if (!existing) {
    const { error: insertError } = await (adminClient as any)
      .from('paypal_webhook_events')
      .insert({
        id: eventId,
        event_type: eventType,
        raw
      });

    if (insertError) {
      throw new Error(`Failed to insert webhook dedupe row: ${insertError.message}`);
    }
    return { alreadyProcessed: false };
  }

  const { error: updateError } = await (adminClient as any)
    .from('paypal_webhook_events')
    .update({
      event_type: eventType,
      raw,
      received_at: new Date().toISOString()
    })
    .eq('id', eventId);

  if (updateError) {
    throw new Error(`Failed to update webhook dedupe row: ${updateError.message}`);
  }

  return { alreadyProcessed: false };
};

const markWebhookEventProcessed = async (
  adminClient: ReturnType<typeof createAdminClient>,
  eventId: string,
  raw: unknown
) => {
  const { error } = await (adminClient as any)
    .from('paypal_webhook_events')
    .update({
      processed_at: new Date().toISOString(),
      raw
    })
    .eq('id', eventId);

  if (error) {
    throw new Error(`Failed to mark webhook event processed: ${error.message}`);
  }
};

const syncWebhookSubscriptionEvent = async (
  adminClient: ReturnType<typeof createAdminClient>,
  event: PayPalWebhookEvent
) => {
  const subscriptionId = getSubscriptionIdFromEvent(event);
  if (!subscriptionId) {
    return { handled: false, reason: 'no_subscription_id' as const };
  }

  try {
    const subscription = await getSubscription(subscriptionId);
    const result = await upsertPayPalSubscriptionSnapshot(
      {
        subscription,
        eventAt: typeof event.create_time === 'string' ? event.create_time : undefined
      },
      adminClient
    );
    return { handled: true as const, result };
  } catch (error) {
    const fallbackSubscription = buildFallbackSubscriptionFromWebhook(event);
    if (!fallbackSubscription) {
      throw error;
    }

    if (isPayPalApiError(error)) {
      console.warn('[PayPal webhook] falling back to webhook resource payload', {
        eventType: event.event_type,
        subscriptionId,
        status: error.status
      });
    }

    const result = await upsertPayPalSubscriptionSnapshot(
      {
        subscription: fallbackSubscription,
        eventAt: typeof event.create_time === 'string' ? event.create_time : undefined
      },
      adminClient
    );

    return { handled: true as const, result };
  }
};

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const { verified, event } = await verifyWebhook(request.headers, rawBody);

    if (!verified) {
      return jsonError('Invalid PayPal webhook signature', 400);
    }

    const eventType = (event.event_type || '').trim().toUpperCase();
    const eventId = getWebhookEventId(request.headers, event);
    if (!eventId) {
      return jsonError('Missing PayPal webhook event ID', 400);
    }

    const adminClient = createAdminClient();
    const dedupe = await ensureWebhookEventProcessable(adminClient, eventId, eventType, event);
    if (dedupe.alreadyProcessed) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    if (RELEVANT_EVENTS.has(eventType)) {
      await syncWebhookSubscriptionEvent(adminClient, event);
    } else {
      console.log('[PayPal webhook] ignoring unsupported event', { eventType, eventId });
    }

    await markWebhookEventProcessed(adminClient, eventId, event);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[PayPal webhook] unexpected error', error);
    if (isPayPalApiError(error)) {
      return jsonError('PayPal webhook processing failed', error.status, error.details);
    }
    return jsonError(error instanceof Error ? error.message : 'Unexpected webhook error', 500);
  }
}

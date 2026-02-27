import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/adminClient';
import type { PayPalSubscription } from '@/utils/paypal';
import { sendAdminSalesNotification } from '@/utils/admin-sales-notifier';

type AdminClient = SupabaseClient;

type PayPalSubscriptionRow = {
  id: string;
  user_id: string | null;
  plan_id: string | null;
  status: string | null;
  current_period_end: string | null;
};

export type StudioEntitlementResult = {
  hasActiveSubscription: boolean;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  source: 'studio_access' | 'paypal_subscriptions' | 'none';
};

export class StudioSubscriptionRequiredError extends Error {
  status: number;

  constructor(message = 'Active Studio subscription required') {
    super(message);
    this.name = 'StudioSubscriptionRequiredError';
    this.status = 403;
  }
}

export const isActiveStudioSubscriptionStatus = (status?: string | null) =>
  (status || '').trim().toUpperCase() === 'ACTIVE';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const asUuidOrNull = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return uuidRegex.test(normalized) ? normalized : null;
};

const asIsoOrNull = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getText = (record: Record<string, unknown> | null, key: string) => {
  const value = record?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const getSubscriberName = (subscription: PayPalSubscription) => {
  const givenName = subscription.subscriber?.name?.given_name?.trim() || '';
  const surname = subscription.subscriber?.name?.surname?.trim() || '';
  const fullName = `${givenName} ${surname}`.trim();
  return fullName || null;
};

const getSubscriberPhone = (subscription: PayPalSubscription) => {
  const subscriber = asRecord(subscription.subscriber);
  const direct = getText(subscriber, 'phone');
  if (direct) return direct;

  const phone = asRecord(subscriber?.phone);
  const phoneNumber = asRecord(phone?.phone_number);
  const countryCode = getText(phoneNumber, 'country_code');
  const nationalNumber = getText(phoneNumber, 'national_number');
  const joined = [countryCode, nationalNumber].filter(Boolean).join(' ');
  return joined || null;
};

const getSubscriberAddress = (subscription: PayPalSubscription) => {
  const subscriptionRecord = asRecord(subscription);
  const subscriber = asRecord(subscriptionRecord?.subscriber);
  const shippingAddress = asRecord(subscriber?.shipping_address);
  const address = asRecord(shippingAddress?.address);

  const parts = [
    getText(address, 'address_line_1'),
    getText(address, 'address_line_2'),
    getText(address, 'admin_area_2'),
    getText(address, 'admin_area_1'),
    getText(address, 'postal_code'),
    getText(address, 'country_code')
  ].filter(Boolean) as string[];

  return parts.length > 0 ? parts.join(', ') : null;
};

const extractCurrentPeriodEnd = (subscription: PayPalSubscription) =>
  asIsoOrNull(
    subscription.billing_info?.next_billing_time ??
      subscription.billing_info?.final_payment_time ??
      null
  );

const getSubscriptionPlanSnapshot = (subscription: PayPalSubscription) => {
  const cycle = Array.isArray(subscription.plan?.billing_cycles)
    ? subscription.plan?.billing_cycles.find((item) => item?.frequency?.interval_unit)
    : undefined;
  const fixedPrice = cycle?.pricing_scheme?.fixed_price;
  const fallbackLastPayment = subscription.billing_info?.last_payment?.amount;
  const amountRaw = fixedPrice?.value ?? fallbackLastPayment?.value ?? null;
  const amount =
    typeof amountRaw === 'string' && amountRaw.trim() !== '' && !Number.isNaN(Number(amountRaw))
      ? Number(amountRaw)
      : null;
  const currency =
    fixedPrice?.currency_code ?? fallbackLastPayment?.currency_code ?? null;
  const interval = cycle?.frequency?.interval_unit
    ? String(cycle.frequency.interval_unit).toLowerCase()
    : null;

  return {
    id: typeof subscription.plan_id === 'string' ? subscription.plan_id : null,
    name: typeof subscription.plan?.name === 'string' ? subscription.plan.name : null,
    status: typeof subscription.plan?.status === 'string' ? subscription.plan.status : null,
    interval,
    amount,
    currency: currency ? String(currency).toUpperCase() : null
  };
};

const getAdmin = (adminClient?: AdminClient) => adminClient ?? createAdminClient();

export async function upsertStudioAccess(
  userId: string,
  hasActiveSubscription: boolean,
  adminClient?: AdminClient
) {
  const admin = getAdmin(adminClient);
  const { error } = await (admin as any)
    .from('studio_access')
    .upsert({
      user_id: userId,
      has_active_subscription: hasActiveSubscription,
      updated_at: new Date().toISOString()
    });

  if (error) {
    throw new Error(`Failed to update studio_access: ${error.message}`);
  }
}

export async function refreshStudioAccessForUser(userId: string, adminClient?: AdminClient) {
  const admin = getAdmin(adminClient);
  const { data, error } = await (admin as any)
    .from('paypal_subscriptions')
    .select('id,status')
    .eq('user_id', userId)
    .order('last_event_at', { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(`Failed to check PayPal subscriptions: ${error.message}`);
  }

  const rows = Array.isArray(data) ? (data as Array<{ id: string; status: string | null }>) : [];
  const active = rows.find((row) => isActiveStudioSubscriptionStatus(row.status)) ?? null;

  await upsertStudioAccess(userId, Boolean(active), admin);

  return {
    hasActiveSubscription: Boolean(active),
    subscriptionId: active?.id ?? null,
    subscriptionStatus: active?.status ?? null
  };
}

export async function getStudioEntitlement(userId: string, adminClient?: AdminClient) {
  const admin = getAdmin(adminClient);

  const { data: accessRow, error: accessError } = await (admin as any)
    .from('studio_access')
    .select('has_active_subscription,updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (accessError) {
    throw new Error(`Failed to check studio access cache: ${accessError.message}`);
  }

  const { data: subscriptionRows, error: subscriptionError } = await (admin as any)
    .from('paypal_subscriptions')
    .select('id,status,last_event_at')
    .eq('user_id', userId)
    .order('last_event_at', { ascending: false })
    .limit(10);

  if (subscriptionError) {
    throw new Error(`Failed to check subscriptions: ${subscriptionError.message}`);
  }

  const rows = Array.isArray(subscriptionRows)
    ? (subscriptionRows as Array<{ id: string; status: string | null }>)
    : [];
  const activeRow = rows.find((row) => isActiveStudioSubscriptionStatus(row.status)) ?? null;

  if (activeRow) {
    if (!accessRow?.has_active_subscription) {
      await upsertStudioAccess(userId, true, admin);
    }
    return {
      hasActiveSubscription: true,
      subscriptionId: activeRow.id,
      subscriptionStatus: activeRow.status,
      source: 'paypal_subscriptions'
    } satisfies StudioEntitlementResult;
  }

  if (accessRow?.has_active_subscription) {
    await upsertStudioAccess(userId, false, admin);
  }

  const latest = rows[0] ?? null;
  return {
    hasActiveSubscription: false,
    subscriptionId: latest?.id ?? null,
    subscriptionStatus: latest?.status ?? null,
    source: accessRow ? 'studio_access' : 'none'
  } satisfies StudioEntitlementResult;
}

export async function requireActiveStudioSubscription(
  userId: string,
  adminClient?: AdminClient
) {
  const entitlement = await getStudioEntitlement(userId, adminClient);
  if (!entitlement.hasActiveSubscription) {
    throw new StudioSubscriptionRequiredError();
  }
  return entitlement;
}

type UpsertPayPalSubscriptionInput = {
  subscription: PayPalSubscription;
  eventAt?: string | null;
};

type UpsertPayPalSubscriptionResult = {
  subscriptionId: string;
  userId: string | null;
  status: string | null;
  hasActiveSubscription: boolean;
};

export async function upsertPayPalSubscriptionSnapshot(
  input: UpsertPayPalSubscriptionInput,
  adminClient?: AdminClient
): Promise<UpsertPayPalSubscriptionResult> {
  const admin = getAdmin(adminClient);
  const { subscription } = input;
  const subscriptionId = typeof subscription.id === 'string' ? subscription.id.trim() : '';
  if (!subscriptionId) {
    throw new Error('Missing PayPal subscription id');
  }

  const eventAt =
    asIsoOrNull(input.eventAt) ??
    asIsoOrNull(subscription.status_update_time) ??
    asIsoOrNull(subscription.create_time) ??
    new Date().toISOString();
  const incomingStatus =
    typeof subscription.status === 'string' ? subscription.status.trim().toUpperCase() : null;
  const planSnapshot = getSubscriptionPlanSnapshot(subscription);
  const payerId =
    typeof subscription.subscriber?.payer_id === 'string'
      ? subscription.subscriber.payer_id.trim()
      : null;
  const customUserId = asUuidOrNull(subscription.custom_id);

  const { data: existingRow, error: existingError } = await (admin as any)
    .from('paypal_subscriptions')
    .select('id,user_id,plan_id,status,current_period_end')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to read existing PayPal subscription: ${existingError.message}`);
  }

  const existing = (existingRow ?? null) as PayPalSubscriptionRow | null;
  const wasActiveSubscription = isActiveStudioSubscriptionStatus(existing?.status);
  const userId = customUserId ?? existing?.user_id ?? null;
  const planId = planSnapshot.id ?? existing?.plan_id ?? null;
  const status = incomingStatus ?? existing?.status ?? null;
  const currentPeriodEnd = extractCurrentPeriodEnd(subscription) ?? existing?.current_period_end ?? null;

  if (planId) {
    const { error: planError } = await (admin as any)
      .from('paypal_plans')
      .upsert({
        id: planId,
        name: planSnapshot.name,
        status: planSnapshot.status,
        interval: planSnapshot.interval,
        amount: planSnapshot.amount,
        currency: planSnapshot.currency
      });

    if (planError) {
      throw new Error(`Failed to upsert paypal_plans row: ${planError.message}`);
    }
  }

  if (userId && payerId) {
    const { error: customerError } = await (admin as any)
      .from('paypal_customers')
      .upsert({
        user_id: userId,
        paypal_payer_id: payerId
      });

    if (customerError) {
      throw new Error(`Failed to upsert paypal_customers row: ${customerError.message}`);
    }
  }

  const { error: subscriptionError } = await (admin as any)
    .from('paypal_subscriptions')
    .upsert({
      id: subscriptionId,
      user_id: userId,
      plan_id: planId,
      status,
      current_period_end: currentPeriodEnd,
      last_event_at: eventAt,
      raw: subscription
    });

  if (subscriptionError) {
    throw new Error(`Failed to upsert paypal_subscriptions row: ${subscriptionError.message}`);
  }

  const hasActiveSubscription = isActiveStudioSubscriptionStatus(status);
  if (userId) {
    await upsertStudioAccess(userId, hasActiveSubscription, admin);
  }

  if (hasActiveSubscription && !wasActiveSubscription) {
    let profileName: string | null = null;
    let profilePhone: string | null = null;
    let profileAddress: string | null = null;
    let profileEmail: string | null = null;

    if (userId) {
      try {
        const { data: profile } = await (admin as any)
          .from('users')
          .select('name,full_name,phone,address')
          .eq('id', userId)
          .maybeSingle();

        profileName =
          (typeof profile?.name === 'string' && profile.name.trim()) ||
          (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
          null;
        profilePhone =
          typeof profile?.phone === 'string' && profile.phone.trim()
            ? profile.phone.trim()
            : null;
        profileAddress =
          typeof profile?.address === 'string' && profile.address.trim()
            ? profile.address.trim()
            : null;
      } catch (profileError) {
        console.warn('[studio-subscription] profile lookup for sales email failed', profileError);
      }

      try {
        const { data: authUserResult } = await (admin as any).auth.admin.getUserById(userId);
        profileEmail = authUserResult?.user?.email?.trim() || null;
      } catch (authUserError) {
        console.warn('[studio-subscription] auth user lookup for sales email failed', authUserError);
      }
    }

    await sendAdminSalesNotification({
      eventLabel: '멤버십 가입 완료 (PayPal)',
      paymentMethod: 'PayPal 정기결제',
      subscriptionId,
      items: [
        {
          title: planSnapshot.name || 'Studio 멤버십',
          quantity: 1,
          price: planSnapshot.amount,
          currency: planSnapshot.currency || null
        }
      ],
      customer: {
        name: getSubscriberName(subscription) || profileName || null,
        email: subscription.subscriber?.email_address || profileEmail || null,
        phone: getSubscriberPhone(subscription) || profilePhone || null,
        address: getSubscriberAddress(subscription) || profileAddress || null
      },
      amountTotal: planSnapshot.amount,
      currency: planSnapshot.currency || null,
      note: planId ? `plan_id=${planId}` : null,
      occurredAt: eventAt
    });
  }

  return {
    subscriptionId,
    userId,
    status,
    hasActiveSubscription
  };
}

export const extractUserIdFromPayPalSubscription = (subscription: PayPalSubscription) =>
  asUuidOrNull(subscription.custom_id);

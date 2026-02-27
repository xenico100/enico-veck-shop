import 'server-only';

type SalesNotificationItem = {
  title: string;
  quantity?: number | null;
  price?: number | null;
  currency?: string | null;
};

type SalesNotificationCustomer = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type SendAdminSalesNotificationInput = {
  eventLabel: string;
  paymentMethod: string;
  orderId?: string | null;
  subscriptionId?: string | null;
  items?: SalesNotificationItem[];
  customer?: SalesNotificationCustomer | null;
  amountTotal?: number | null;
  currency?: string | null;
  note?: string | null;
  occurredAt?: string | null;
};

const DEFAULT_ALERT_TO_EMAIL = 'morba9850@gmail.com';

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const normalizePhone = (value: unknown) =>
  normalizeText(value).replace(/\s+/g, ' ');

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatMoney = (amount: number | null | undefined, currency = 'KRW') => {
  if (!Number.isFinite(amount ?? NaN) || (amount ?? 0) <= 0) return '-';
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency || 'KRW'
    }).format(amount as number);
  } catch {
    return `${amount}`;
  }
};

const getAlertConfig = () => {
  const enabled = normalizeText(process.env.SALES_ALERT_EMAIL_ENABLED).toLowerCase();
  if (enabled === '0' || enabled === 'false' || enabled === 'off') {
    return { disabled: true as const };
  }

  const to =
    normalizeText(process.env.SALES_ALERT_TO_EMAIL) || DEFAULT_ALERT_TO_EMAIL;
  const from =
    normalizeText(process.env.SALES_ALERT_FROM_EMAIL) ||
    normalizeText(process.env.RESEND_FROM_EMAIL) ||
    'onboarding@resend.dev';
  const resendApiKey = normalizeText(process.env.RESEND_API_KEY);

  return {
    disabled: false as const,
    to,
    from,
    resendApiKey
  };
};

const toItemSummary = (items: SalesNotificationItem[]) => {
  if (!Array.isArray(items) || items.length === 0) return '-';

  return items
    .map((item) => {
      const title = normalizeText(item.title) || '상품명 미상';
      const qty = Number(item.quantity ?? 1);
      const safeQty =
        Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
      const priceLabel =
        Number.isFinite(item.price ?? NaN) && (item.price ?? 0) > 0
          ? ` (${formatMoney(item.price ?? null, item.currency || 'KRW')})`
          : '';
      return `${title} x${safeQty}${priceLabel}`;
    })
    .join(', ');
};

const toReferenceLabel = (
  orderId: string | null | undefined,
  subscriptionId: string | null | undefined
) => {
  const normalizedOrderId = normalizeText(orderId);
  if (normalizedOrderId) {
    return `주문 #${normalizedOrderId.slice(0, 8).toUpperCase()}`;
  }
  const normalizedSubscriptionId = normalizeText(subscriptionId);
  if (normalizedSubscriptionId) {
    return `구독 ${normalizedSubscriptionId}`;
  }
  return '참조번호 없음';
};

export async function sendAdminSalesNotification(
  input: SendAdminSalesNotificationInput
) {
  try {
    const config = getAlertConfig();
    if (config.disabled) return { sent: false, skipped: 'disabled' as const };

    if (!config.resendApiKey) {
      console.warn('[sales-notifier] skip: missing RESEND_API_KEY');
      return { sent: false, skipped: 'missing_resend_api_key' as const };
    }

    const customerName =
      normalizeText(input.customer?.name) || '이름 미입력';
    const customerEmail =
      normalizeText(input.customer?.email) || '이메일 미입력';
    const customerPhone =
      normalizePhone(input.customer?.phone) || '연락처 미입력';
    const customerAddress =
      normalizeText(input.customer?.address) || '주소 미입력';
    const currency = normalizeText(input.currency) || 'KRW';
    const itemSummary = toItemSummary(Array.isArray(input.items) ? input.items : []);
    const amountLabel = formatMoney(input.amountTotal ?? null, currency);
    const occurredAt =
      normalizeText(input.occurredAt) || new Date().toISOString();
    const referenceLabel = toReferenceLabel(input.orderId, input.subscriptionId);
    const note = normalizeText(input.note);
    const paymentMethod = normalizeText(input.paymentMethod) || '미상';
    const eventLabel = normalizeText(input.eventLabel) || '새 결제 이벤트';

    const subject = `[ENICO] ${eventLabel} - ${referenceLabel}`;
    const lines = [
      `이벤트: ${eventLabel}`,
      `참조: ${referenceLabel}`,
      `결제수단: ${paymentMethod}`,
      `상품: ${itemSummary}`,
      `금액: ${amountLabel}`,
      `주문자 이름: ${customerName}`,
      `주문자 이메일: ${customerEmail}`,
      `주문자 연락처: ${customerPhone}`,
      `주문자 주소: ${customerAddress}`,
      `발생시각: ${occurredAt}`
    ];
    if (note) {
      lines.push(`비고: ${note}`);
    }
    const text = lines.join('\n');
    const html =
      '<div style="font-family:Arial,sans-serif;line-height:1.6;">' +
      `<h2 style="margin:0 0 12px;">${escapeHtml(eventLabel)}</h2>` +
      '<pre style="white-space:pre-wrap;background:#f7f7f7;padding:12px;border-radius:8px;border:1px solid #e5e7eb;">' +
      `${escapeHtml(text)}` +
      '</pre>' +
      '</div>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        subject,
        html,
        text
      })
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.error('[sales-notifier] resend failed', {
        status: response.status,
        details
      });
      return { sent: false, skipped: 'resend_error' as const };
    }

    return { sent: true };
  } catch (error) {
    console.error('[sales-notifier] unexpected error', error);
    return { sent: false, skipped: 'unexpected_error' as const };
  }
}

export type { SalesNotificationItem, SalesNotificationCustomer };

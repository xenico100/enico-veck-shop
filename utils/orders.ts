export type OrderItemSnapshot = {
  id: string;
  title: string;
  type: string;
  price: number | null;
  qty: number;
  image: string | null;
};

export type OrderCustomerContact = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

export type OrderRecord = {
  id: string;
  user_id: string | null;
  status: string;
  currency: string | null;
  amount_total: number | null;
  created_at: string;
  paypal_order_id: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipping_status: string | null;
  shipping_address: Record<string, unknown> | null;
  customer_contact: OrderCustomerContact | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  items: OrderItemSnapshot[];
  metadata: Record<string, unknown> | null;
};

export const normalizeOrderItems = (value: unknown): OrderItemSnapshot[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      if (!title) return null;
      const qtyRaw = Number(row.qty ?? row.quantity ?? 1);
      const priceRaw = row.price == null ? null : Number(row.price);
      return {
        id: typeof row.id === 'string' ? row.id : title,
        title,
        type: typeof row.type === 'string' ? row.type : 'item',
        price: priceRaw != null && Number.isFinite(priceRaw) ? priceRaw : null,
        qty: Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1,
        image: typeof row.image === 'string' ? row.image : null
      } satisfies OrderItemSnapshot;
    })
    .filter(Boolean) as OrderItemSnapshot[];
};

const normalizeCustomerContact = (value: unknown): OrderCustomerContact | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  const email = typeof row.email === 'string' ? row.email.trim() : '';
  const phone = typeof row.phone === 'string' ? row.phone.trim() : '';
  const address = typeof row.address === 'string' ? row.address.trim() : '';
  if (!name && !email && !phone && !address) return null;
  return {
    name,
    email,
    phone,
    address
  };
};

export const normalizeOrderRecord = (value: unknown): OrderRecord | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.created_at !== 'string') {
    return null;
  }

  const shippingAddress =
    row.shipping_address && typeof row.shipping_address === 'object' && !Array.isArray(row.shipping_address)
      ? (row.shipping_address as Record<string, unknown>)
      : null;
  const customerContact = normalizeCustomerContact(
    shippingAddress?.customer_contact ?? shippingAddress?.guest_contact ?? null
  );

  return {
    id: row.id,
    user_id: typeof row.user_id === 'string' ? row.user_id : null,
    status: typeof row.status === 'string' ? row.status : 'pending',
    currency: typeof row.currency === 'string' ? row.currency : null,
    amount_total: row.amount_total == null ? null : Number(row.amount_total),
    created_at: row.created_at,
    paypal_order_id: typeof row.paypal_order_id === 'string' ? row.paypal_order_id : null,
    tracking_number: typeof row.tracking_number === 'string' ? row.tracking_number : null,
    shipping_carrier: typeof row.shipping_carrier === 'string' ? row.shipping_carrier : null,
    shipping_status: typeof row.shipping_status === 'string' ? row.shipping_status : null,
    shipping_address: shippingAddress,
    customer_contact: customerContact,
    stripe_checkout_session_id:
      typeof row.stripe_checkout_session_id === 'string' ? row.stripe_checkout_session_id : null,
    stripe_payment_intent_id:
      typeof row.stripe_payment_intent_id === 'string' ? row.stripe_payment_intent_id : null,
    items: normalizeOrderItems(row.items),
    metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null
  };
};

export const normalizeOrders = (rows: unknown): OrderRecord[] => {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeOrderRecord).filter(Boolean) as OrderRecord[];
};

export const formatOrderMoney = (amount: number | null | undefined, currency = 'KRW') => {
  if (amount == null || Number.isNaN(amount)) return '금액 확인 필요';
  try {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency }).format(amount);
  } catch {
    return `₩${new Intl.NumberFormat('ko-KR').format(amount)}`;
  }
};

export const formatOrderDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const mapOrderStatusLabel = (status?: string | null) => {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'paid') return '결제 완료';
  if (normalized === 'pending') return '결제 대기';
  if (normalized === 'canceled') return '취소됨';
  if (normalized === 'refunded') return '환불됨';
  return status || '상태 미상';
};

export const getOrderStatusBadgeClass = (status?: string | null) => {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'paid') return 'border-emerald-300/30 bg-emerald-300/15 text-emerald-100';
  if (normalized === 'pending') return 'border-amber-300/30 bg-amber-300/15 text-amber-100';
  if (normalized === 'canceled') return 'border-zinc-300/20 bg-zinc-300/10 text-zinc-100';
  if (normalized === 'refunded') return 'border-sky-300/30 bg-sky-300/15 text-sky-100';
  return 'border-white/20 bg-white/10 text-white';
};

export const mapShippingStatusLabel = (status?: string | null) => {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'preparing') return '배송 준비중';
  if (normalized === 'ready_to_ship') return '발송 준비 완료';
  if (normalized === 'shipped') return '발송 완료';
  if (normalized === 'in_transit') return '배송 중';
  if (normalized === 'delivered') return '배송 완료';
  if (normalized === 'returned') return '반송';
  if (normalized === 'canceled') return '배송 취소';
  return status || '배송 상태 미상';
};

export const getShippingStatusBadgeClass = (status?: string | null) => {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'preparing' || normalized === 'ready_to_ship') {
    return 'border-amber-300/30 bg-amber-300/15 text-amber-100';
  }
  if (normalized === 'shipped' || normalized === 'in_transit') {
    return 'border-sky-300/30 bg-sky-300/15 text-sky-100';
  }
  if (normalized === 'delivered') {
    return 'border-emerald-300/30 bg-emerald-300/15 text-emerald-100';
  }
  if (normalized === 'returned' || normalized === 'canceled') {
    return 'border-zinc-300/20 bg-zinc-300/10 text-zinc-100';
  }
  return 'border-white/20 bg-white/10 text-white';
};

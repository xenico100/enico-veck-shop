'use client';

import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ShoppingBag, X } from 'lucide-react';
import ActionButton from '@/components/ui/ActionButton';
import {
  formatOrderDate,
  formatOrderMoney,
  getOrderStatusBadgeClass,
  getShippingStatusBadgeClass,
  mapOrderStatusLabel,
  mapShippingStatusLabel,
  type OrderRecord
} from '@/utils/orders';

const appleFontClass =
  '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';

type OrderShippingDraft = {
  shippingCarrier: string;
  trackingNumber: string;
  shippingStatus: string;
};

type SaveShippingPayload = {
  orderId: string;
  shippingCarrier: string;
  trackingNumber: string;
  shippingStatus: string;
};

type OrderDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderRecord | null;
  adminShippingEditable?: boolean;
  onSaveShipping?: (payload: SaveShippingPayload) => Promise<void> | void;
  shippingSavePending?: boolean;
  shippingSaveError?: string | null;
};

const shippingStatusOptions = [
  { value: 'preparing', label: '배송 준비중' },
  { value: 'ready_to_ship', label: '발송 준비 완료' },
  { value: 'shipped', label: '발송 완료' },
  { value: 'in_transit', label: '배송 중' },
  { value: 'delivered', label: '배송 완료' },
  { value: 'returned', label: '반송' },
  { value: 'canceled', label: '배송 취소' }
];

function InfoRow({
  label,
  value
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-2 last:border-b-0">
      <span className="text-xs text-white/50">{label}</span>
      <span className="max-w-[70%] break-words text-right text-sm text-white/90">
        {value && value.trim() ? value : '-'}
      </span>
    </div>
  );
}

export default function OrderDetailModal({
  open,
  onOpenChange,
  order,
  adminShippingEditable = false,
  onSaveShipping,
  shippingSavePending = false,
  shippingSaveError = null
}: OrderDetailModalProps) {
  const [shippingDraft, setShippingDraft] = useState<OrderShippingDraft>({
    shippingCarrier: '',
    trackingNumber: '',
    shippingStatus: 'preparing'
  });

  useEffect(() => {
    if (!order) return;
    setShippingDraft({
      shippingCarrier: order.shipping_carrier ?? '',
      trackingNumber: order.tracking_number ?? '',
      shippingStatus: order.shipping_status ?? 'preparing'
    });
  }, [order?.id, order?.shipping_carrier, order?.tracking_number, order?.shipping_status]);

  const handleSaveShipping = async () => {
    if (!order || !onSaveShipping) return;
    await onSaveShipping({
      orderId: order.id,
      shippingCarrier: shippingDraft.shippingCarrier.trim(),
      trackingNumber: shippingDraft.trackingNumber.trim(),
      shippingStatus: shippingDraft.shippingStatus
    });
  };

  const contact = order?.customer_contact ?? null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[88] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogPrimitive.Content
          className={`fixed left-1/2 top-1/2 z-[89] w-[calc(100%-1.5rem)] max-h-[90vh] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/10 bg-black/75 p-5 shadow-2xl backdrop-blur-xl outline-none md:p-6 ${appleFontClass}`}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-white">
                주문 상세
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-white/60">
                주문 항목, 주문자 정보, 배송 정보를 확인하세요.
              </DialogPrimitive.Description>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 shadow-sm backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              aria-label="주문 상세 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {order ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getOrderStatusBadgeClass(order.status)}`}
                  >
                    {mapOrderStatusLabel(order.status)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getShippingStatusBadgeClass(order.shipping_status)}`}
                  >
                    {mapShippingStatusLabel(order.shipping_status)}
                  </span>
                  <span className="text-xs text-white/55">{formatOrderDate(order.created_at)}</span>
                  <span className="text-xs text-white/40">주문번호: {order.id.slice(0, 8)}…</span>
                </div>

                <div className="mt-4 space-y-3">
                  {order.items.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                      주문 항목 정보가 없습니다.
                    </div>
                  ) : (
                    order.items.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <ShoppingBag className="h-4 w-4 text-white/60" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{item.title}</p>
                          <p className="mt-1 text-xs text-white/50">
                            {item.type} · 수량 {item.qty}
                          </p>
                        </div>
                        <div className="text-right text-sm text-white/90">
                          {item.price == null
                            ? '금액 확인'
                            : formatOrderMoney(item.price * item.qty, order.currency || 'KRW')}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-sm text-white/60">총 결제 금액</span>
                  <span className="text-lg font-semibold text-white">
                    {formatOrderMoney(order.amount_total, order.currency || 'KRW')}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold tracking-tight text-white">주문자 정보</h4>
                  <div className="mt-2">
                    <InfoRow label="이름" value={contact?.name} />
                    <InfoRow label="이메일" value={contact?.email} />
                    <InfoRow label="핸드폰 번호" value={contact?.phone} />
                    <InfoRow label="집 주소" value={contact?.address} />
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold tracking-tight text-white">택배 정보</h4>
                  <div className="mt-2">
                    <InfoRow label="택배 상태" value={mapShippingStatusLabel(order.shipping_status)} />
                    <InfoRow label="택배사" value={order.shipping_carrier} />
                    <InfoRow label="운송장번호" value={order.tracking_number} />
                  </div>
                </div>
              </div>

              {adminShippingEditable && onSaveShipping ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold tracking-tight text-white">관리자 배송 처리</h4>
                    <p className="mt-1 text-xs text-white/55">택배사, 운송장번호, 배송 상태를 저장합니다.</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-white/60">택배사</label>
                      <input
                        type="text"
                        value={shippingDraft.shippingCarrier}
                        onChange={(event) =>
                          setShippingDraft((prev) => ({
                            ...prev,
                            shippingCarrier: event.target.value
                          }))
                        }
                        placeholder="CJ대한통운 / 우체국 / 한진"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/60">운송장번호</label>
                      <input
                        type="text"
                        value={shippingDraft.trackingNumber}
                        onChange={(event) =>
                          setShippingDraft((prev) => ({
                            ...prev,
                            trackingNumber: event.target.value
                          }))
                        }
                        placeholder="1234-5678-9012"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="mb-1 block text-xs text-white/60">배송 상태</label>
                    <select
                      value={shippingDraft.shippingStatus}
                      onChange={(event) =>
                        setShippingDraft((prev) => ({
                          ...prev,
                          shippingStatus: event.target.value
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                    >
                      {shippingStatusOptions.map((option) => (
                        <option key={option.value} value={option.value} className="bg-zinc-900">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {shippingSaveError ? (
                    <div className="mt-3 rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">
                      {shippingSaveError}
                    </div>
                  ) : null}

                  <div className="mt-4 flex justify-end">
                    <ActionButton
                      variant="primary"
                      size="sm"
                      onClick={() => void handleSaveShipping()}
                      disabled={shippingSavePending}
                    >
                      {shippingSavePending ? '저장 중…' : '배송정보 저장'}
                    </ActionButton>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end">
                <ActionButton variant="secondary" size="md" onClick={() => onOpenChange(false)}>
                  닫기
                </ActionButton>
              </div>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

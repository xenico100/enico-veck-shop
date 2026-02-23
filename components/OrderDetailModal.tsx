'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ShoppingBag, X } from 'lucide-react';
import ActionButton from '@/components/ui/ActionButton';
import {
  formatOrderDate,
  formatOrderMoney,
  getOrderStatusBadgeClass,
  mapOrderStatusLabel,
  type OrderRecord
} from '@/utils/orders';

const appleFontClass =
  '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';

export default function OrderDetailModal({
  open,
  onOpenChange,
  order
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderRecord | null;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[88] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogPrimitive.Content
          className={`fixed left-1/2 top-1/2 z-[89] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-black/75 p-5 shadow-2xl backdrop-blur-xl outline-none md:p-6 ${appleFontClass}`}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-white">
                주문 상세
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-white/60">
                주문 항목과 결제 정보를 확인하세요.
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

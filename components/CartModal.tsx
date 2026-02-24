'use client';

import { useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CreditCard, ShoppingBag, Trash2, X } from 'lucide-react';

import ActionButton from '@/components/ui/ActionButton';
import QuantityStepper from '@/components/ui/QuantityStepper';
import { useToast } from '@/components/ui/Toasts/use-toast';
import { useCart } from '@/app/context/CartContext';

const appleFontClass =
  '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';

const formatMoney = (amount: number | null, currency = 'KRW') => {
  if (amount == null || Number.isNaN(amount)) return '문의';
  try {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency }).format(amount);
  } catch {
    return `₩${new Intl.NumberFormat('ko-KR').format(amount)}`;
  }
};

type CartModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function GlassCloseButton({
  onClick,
  label
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 shadow-sm backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

export default function CartModal({ open, onOpenChange }: CartModalProps) {
  const { items, itemCount, total, removeItem, updateQty, clear } = useCart();
  const { toast } = useToast();
  const [checkoutItemKey, setCheckoutItemKey] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const checkoutItem = useMemo(
    () => items.find((item) => item.key === checkoutItemKey) ?? null,
    [items, checkoutItemKey]
  );

  useEffect(() => {
    if (!open) {
      setCheckoutItemKey(null);
      setCheckoutLoading(false);
      setCheckoutError(null);
    }
  }, [open]);

  useEffect(() => {
    if (checkoutItemKey && !checkoutItem) {
      setCheckoutItemKey(null);
    }
  }, [checkoutItem, checkoutItemKey]);

  const handlePay = async () => {
    if (!checkoutItem) return;
    if (checkoutItem.price == null) {
      setCheckoutError('가격 정보가 없는 항목은 온라인 결제를 진행할 수 없습니다.');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: {
            id: checkoutItem.id,
            type: checkoutItem.type,
            title: checkoutItem.title,
            image: checkoutItem.image,
            price: checkoutItem.price,
            currency: checkoutItem.currency,
            quantity: checkoutItem.quantity
          }
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || '체크아웃 세션 생성에 실패했습니다.');
      }

      if (typeof payload?.url === 'string' && payload.url) {
        window.location.assign(payload.url);
        return;
      }

      throw new Error('결제 이동 URL을 받지 못했습니다.');
    } catch (error) {
      const message = error instanceof Error ? error.message : '결제 처리에 실패했습니다.';
      setCheckoutError(message);
      toast({
        title: '결제 준비 실패',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            className={`fixed left-1/2 top-1/2 z-[81] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/10 bg-black/70 shadow-2xl backdrop-blur-xl outline-none ${appleFontClass}`}
          >
            <div className="flex items-start justify-between border-b border-white/10 px-5 py-4 md:px-6">
              <div>
                <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-white">
                  Cart
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm text-white/60">
                  {itemCount > 0 ? `${itemCount}개 항목이 담겨 있습니다.` : '장바구니가 비어 있습니다.'}
                </DialogPrimitive.Description>
              </div>
              <GlassCloseButton onClick={() => onOpenChange(false)} label="장바구니 닫기" />
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-5 md:px-6">
              {items.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-white">장바구니가 비어 있습니다</p>
                  <p className="text-xs text-white/50">Services에서 항목을 추가해 보세요.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => {
                    const itemTotal = item.price == null ? null : item.price * item.quantity;
                    return (
                      <div
                        key={item.key}
                        className="rounded-3xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
                      >
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setCheckoutError(null);
                              setCheckoutItemKey(item.key);
                            }}
                            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.09] to-white/[0.04] p-1 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition hover:from-white/[0.12] hover:to-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                          >
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07]">
                              {item.image ? (
                                <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                              ) : (
                                <ShoppingBag className="h-5 w-5 text-white/60" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">{item.title}</p>
                              <p className="mt-1 text-xs text-white/65">수량 {item.quantity}</p>
                              <p className="mt-1 text-sm font-medium text-white/95">
                                {itemTotal == null
                                  ? '가격 문의'
                                  : `${formatMoney(itemTotal, item.currency)}`}
                              </p>
                            </div>
                          </button>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <QuantityStepper
                              value={item.quantity}
                              onDecrease={() => updateQty(item.key, item.quantity - 1)}
                              onIncrease={() => updateQty(item.key, item.quantity + 1)}
                              decrementLabel={`${item.title} 수량 감소`}
                              incrementLabel={`${item.title} 수량 증가`}
                            />
                            <ActionButton
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeItem(item.key)}
                              className="gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              삭제
                            </ActionButton>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Total</p>
                <p className="mt-1 text-lg font-semibold text-white">{formatMoney(total, 'KRW')}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => clear()}
                  className="px-5"
                  disabled={items.length === 0}
                >
                  비우기
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => {
                    const first = items[0];
                    if (!first) return;
                    setCheckoutError(null);
                    setCheckoutItemKey(first.key);
                  }}
                  className="px-5"
                  disabled={items.length === 0}
                >
                  결제하기
                </ActionButton>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root open={Boolean(checkoutItem)} onOpenChange={(isOpen) => !isOpen && setCheckoutItemKey(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
          <DialogPrimitive.Content
            className={`fixed left-1/2 top-1/2 z-[91] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-black/75 p-5 shadow-2xl backdrop-blur-xl outline-none md:p-6 ${appleFontClass}`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-white">
                  Checkout
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm text-white/60">
                  결제 전 주문 정보를 확인하세요.
                </DialogPrimitive.Description>
              </div>
              <GlassCloseButton onClick={() => setCheckoutItemKey(null)} label="체크아웃 닫기" />
            </div>

            {checkoutItem && (
              <div className="space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <div className="flex gap-3">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                      {checkoutItem.image ? (
                        <img src={checkoutItem.image} alt={checkoutItem.title} className="h-full w-full object-cover" />
                      ) : (
                        <ShoppingBag className="h-5 w-5 text-white/60" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-white">{checkoutItem.title}</p>
                      <p className="mt-1 text-xs text-white/55">{checkoutItem.type === 'service' ? 'Service' : 'Item'}</p>
                      <p className="mt-2 text-sm text-white/85">
                        단가: {formatMoney(checkoutItem.price, checkoutItem.currency)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <span className="text-sm text-white/70">수량</span>
                    <QuantityStepper
                      value={checkoutItem.quantity}
                      onDecrease={() => updateQty(checkoutItem.key, checkoutItem.quantity - 1)}
                      onIncrease={() => updateQty(checkoutItem.key, checkoutItem.quantity + 1)}
                      decrementLabel={`${checkoutItem.title} 수량 감소`}
                      incrementLabel={`${checkoutItem.title} 수량 증가`}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-white/65">총 결제 금액</span>
                    <span className="text-base font-semibold text-white">
                      {checkoutItem.price == null
                        ? '가격 문의'
                        : formatMoney(checkoutItem.price * checkoutItem.quantity, checkoutItem.currency)}
                    </span>
                  </div>
                </div>

                {checkoutError && (
                  <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">
                    {checkoutError}
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setCheckoutItemKey(null)}
                    className="px-5"
                    disabled={checkoutLoading}
                  >
                    취소
                  </ActionButton>
                  <ActionButton
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handlePay}
                    className="gap-2 px-5"
                    disabled={checkoutLoading || checkoutItem.price == null}
                  >
                    <CreditCard className="h-4 w-4" />
                    {checkoutLoading ? '결제 준비 중…' : 'Pay'}
                  </ActionButton>
                </div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

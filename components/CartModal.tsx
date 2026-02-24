'use client';

import { useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ShoppingBag, Trash2, X } from 'lucide-react';
import { PayPalButtons } from '@paypal/react-paypal-js';

import ActionButton from '@/components/ui/ActionButton';
import QuantityStepper from '@/components/ui/QuantityStepper';
import { useToast } from '@/components/ui/Toasts/use-toast';
import { useCart } from '@/app/context/CartContext';

const appleFontClass =
  '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';
const USD_EXCHANGE_RATE = 1300;

const formatMoney = (amount: number | null, currency = 'KRW') => {
  if (amount == null || Number.isNaN(amount)) return '문의';
  try {
    const locale = currency === 'USD' ? 'en-US' : 'ko-KR';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    if (currency === 'USD') return `$${amount.toFixed(2)}`;
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
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const hasUnpricedItems = useMemo(
    () => items.some((item) => item.price == null),
    [items]
  );
  const usdTotal = useMemo(() => Number((total / USD_EXCHANGE_RATE).toFixed(2)), [total]);
  const usdTotalLabel = useMemo(() => usdTotal.toFixed(2), [usdTotal]);

  useEffect(() => {
    if (!open) {
      setIsCheckingOut(false);
      setCheckoutError(null);
    }
  }, [open]);

  useEffect(() => {
    if (items.length === 0) {
      setIsCheckingOut(false);
    }
  }, [items.length]);

  const handleOpenCheckout = () => {
    if (items.length === 0) return;
    setCheckoutError(null);
    setIsCheckingOut(true);
  };

  const handleBackToCart = () => {
    setCheckoutError(null);
    setIsCheckingOut(false);
  };

  const handlePayPalSuccess = async (data: unknown, actions: any) => {
    try {
      if (!actions?.order) {
        throw new Error('PayPal order action is unavailable.');
      }

      const details = await actions.order.capture();
      console.log('PayPal payment success:', { data, details });
      window.alert('Payment Successful!');
      clear();
      setIsCheckingOut(false);
      setCheckoutError(null);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '결제 완료 처리에 실패했습니다.';
      setCheckoutError(message);
      toast({
        title: '결제 완료 처리 실패',
        description: message,
        variant: 'destructive'
      });
    }
  };

  const handlePayPalError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'PayPal 결제 중 오류가 발생했습니다.';
    setCheckoutError(message);
    toast({
      title: 'PayPal 결제 오류',
      description: message,
      variant: 'destructive'
    });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className={`fixed left-1/2 top-1/2 z-[81] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/10 bg-black/70 shadow-2xl backdrop-blur-xl outline-none ${appleFontClass}`}
        >
          <div className="flex items-start justify-between border-b border-white/10 px-5 py-4 md:px-6">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-white">
                {isCheckingOut ? 'Payment Options' : 'Cart'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-white/60">
                {isCheckingOut
                  ? '간편결제 수단을 선택해 결제를 진행하세요.'
                  : itemCount > 0
                    ? `${itemCount}개 항목이 담겨 있습니다.`
                    : '장바구니가 비어 있습니다.'}
              </DialogPrimitive.Description>
            </div>
            <GlassCloseButton onClick={() => onOpenChange(false)} label="장바구니 닫기" />
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-5 py-5 md:px-6">
            {!isCheckingOut ? (
              items.length === 0 ? (
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
                          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.09] to-white/[0.04] p-1 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
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
                                {itemTotal == null ? '가격 문의' : `${formatMoney(itemTotal, item.currency)}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <QuantityStepper
                              value={item.quantity}
                              onDecrement={() => updateQty(item.key, item.quantity - 1)}
                              onIncrement={() => updateQty(item.key, item.quantity + 1)}
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
              )
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">Order Summary</p>
                  <p className="mt-2 text-sm text-white/80">
                    총 결제 금액: <span className="font-semibold text-white">{formatMoney(total, 'KRW')}</span>{' '}
                    <span className="text-white/60">(approx. {formatMoney(usdTotal, 'USD')})</span>
                  </p>
                  <p className="mt-2 text-xs text-white/50">
                    환율 기준: 1 USD = {new Intl.NumberFormat('ko-KR').format(USD_EXCHANGE_RATE)} KRW (고정 환율)
                  </p>
                  <p className="mt-1 text-xs text-white/50">주문 항목 수: {itemCount}개</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold tracking-tight text-white">간편결제</h3>
                    <p className="mt-1 text-xs text-white/55">PayPal (USD 결제)부터 지원합니다.</p>
                  </div>

                  {hasUnpricedItems ? (
                    <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">
                      가격 정보가 없는 항목이 있어 PayPal 결제를 진행할 수 없습니다.
                    </div>
                  ) : total <= 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">
                      결제 가능한 금액이 없습니다.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <PayPalButtons
                        style={{ layout: 'vertical', shape: 'pill', label: 'paypal' }}
                        forceReRender={[usdTotalLabel, itemCount]}
                        createOrder={(_data, actions) => {
                          if (!actions.order) {
                            throw new Error('PayPal order actions not available');
                          }

                          const amount = Number(usdTotalLabel);
                          if (!Number.isFinite(amount) || amount <= 0) {
                            throw new Error('Invalid USD amount for PayPal checkout');
                          }

                          return actions.order.create({
                            intent: 'CAPTURE',
                            purchase_units: [
                              {
                                amount: {
                                  currency_code: 'USD',
                                  value: usdTotalLabel
                                },
                                description: `ZEUS Studio Cart (${itemCount} items)`
                              }
                            ]
                          });
                        }}
                        onApprove={handlePayPalSuccess}
                        onError={handlePayPalError}
                        onCancel={() => {
                          toast({
                            title: '결제가 취소되었습니다',
                            description: '원하시면 다른 결제 수단 또는 다시 시도해 주세요.'
                          });
                        }}
                      />
                    </div>
                  )}
                </div>

                {checkoutError && (
                  <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">
                    {checkoutError}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            {!isCheckingOut ? (
              <>
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
                    onClick={handleOpenCheckout}
                    className="px-5"
                    disabled={items.length === 0}
                  >
                    결제하기
                  </ActionButton>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Payment Total</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {formatMoney(total, 'KRW')} <span className="text-white/60">(approx. {formatMoney(usdTotal, 'USD')})</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleBackToCart}
                    className="px-5"
                  >
                    Back to Cart
                  </ActionButton>
                </div>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

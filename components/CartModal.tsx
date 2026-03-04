'use client';

import { useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ShoppingBag, Trash2, X } from 'lucide-react';

import ActionButton from '@/components/ui/ActionButton';
import PaypalButton from '@/components/paypal-button';
import QuantityStepper from '@/components/ui/QuantityStepper';
import { useToast } from '@/components/ui/Toasts/use-toast';
import { useAuth } from '@/app/context/AuthContext';
import { useCart } from '@/app/context/CartContext';
import { getBankTransferInfo } from '@/utils/bank-transfer';
import {
  uploadBankTransferProofFile,
  validateBankTransferProofFile
} from '@/utils/bank-transfer-client';

const appleFontClass =
  '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';
const USD_EXCHANGE_RATE = 1300;

const formatMoney = (amount: number | null, currency = 'KRW') => {
  if (amount == null || Number.isNaN(amount)) return '문의';
  try {
    const locale = currency === 'USD' ? 'en-US' : 'ko-KR';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(amount);
  } catch {
    if (currency === 'USD') return `$${amount.toFixed(2)}`;
    return `₩${new Intl.NumberFormat('ko-KR').format(amount)}`;
  }
};

type CartModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type GuestCheckoutForm = {
  name: string;
  email: string;
  depositorName: string;
  phone: string;
  address: string;
};

type BankTransferOrderResponse = {
  message?: string;
  data?: {
    id?: string;
  };
  bankTransfer?: {
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    notice?: string;
    orderRef?: string | null;
    accountConfigured?: boolean;
    depositorName?: string;
    proofImageUrl?: string;
  };
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
  const { user, loading: authLoading } = useAuth();
  const { items, itemCount, total, removeItem, updateQty, clear } = useCart();
  const { toast } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    'paypal' | 'bank_transfer'
  >('paypal');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [profilePrefillLoading, setProfilePrefillLoading] = useState(false);
  const [guestForm, setGuestForm] = useState<GuestCheckoutForm>({
    name: '',
    email: '',
    depositorName: '',
    phone: '',
    address: ''
  });
  const [bankTransferProofFile, setBankTransferProofFile] =
    useState<File | null>(null);

  const hasUnpricedItems = useMemo(
    () => items.some((item) => item.price == null),
    [items]
  );
  const totalKRW = useMemo(() => Math.round(total), [total]);
  const usdTotal = useMemo(
    () => Number((totalKRW / USD_EXCHANGE_RATE).toFixed(2)),
    [totalKRW]
  );
  const usdTotalLabel = useMemo(() => usdTotal.toFixed(2), [usdTotal]);
  const bankTransferInfo = useMemo(() => getBankTransferInfo(), []);
  const hasConfiguredBankAccount = useMemo(
    () =>
      Boolean(
        bankTransferInfo.bankName &&
        bankTransferInfo.accountNumber &&
        bankTransferInfo.accountHolder
      ),
    [bankTransferInfo]
  );
  const cartSnapshot = useMemo(
    () =>
      items.map((item) => ({
        key: item.key,
        id: item.id,
        type: item.type,
        title: item.title,
        image: item.image,
        price: item.price,
        currency: item.currency,
        quantity: item.quantity
      })),
    [items]
  );

  useEffect(() => {
    if (!open) {
      setIsCheckingOut(false);
      setPaymentMethod('paypal');
      setCheckoutError(null);
      setIsSavingOrder(false);
      setBankTransferProofFile(null);
    }
  }, [open]);

  useEffect(() => {
    if (items.length === 0) {
      setIsCheckingOut(false);
    }
  }, [items.length]);

  useEffect(() => {
    if (user?.email) {
      setGuestForm((prev) => ({
        ...prev,
        email: prev.email || user.email
      }));
    }
  }, [user?.email]);

  useEffect(() => {
    if (user?.name) {
      setGuestForm((prev) => ({
        ...prev,
        name: prev.name || user.name,
        depositorName: prev.depositorName || user.name
      }));
    }
  }, [user?.name]);

  useEffect(() => {
    let cancelled = false;

    if (!open || !isCheckingOut || authLoading || !user?.id) {
      setProfilePrefillLoading(false);
      return;
    }

    const loadProfileForPrefill = async () => {
      setProfilePrefillLoading(true);
      try {
        const response = await fetch('/api/account/profile', {
          cache: 'no-store'
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload?.message || '회원정보를 불러오지 못했습니다.'
          );
        }

        const row = (payload?.data ?? null) as {
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
        } | null;

        if (cancelled) return;

        setGuestForm((prev) => ({
          name: prev.name || row?.name || user.name || '',
          email: prev.email || row?.email || user.email || '',
          depositorName: prev.depositorName || row?.name || user.name || '',
          phone: prev.phone || row?.phone || '',
          address: prev.address || row?.address || ''
        }));
      } catch (error) {
        if (!cancelled) {
          console.warn('[CartModal] profile prefill skipped', error);
        }
      } finally {
        if (!cancelled) {
          setProfilePrefillLoading(false);
        }
      }
    };

    void loadProfileForPrefill();

    return () => {
      cancelled = true;
    };
  }, [open, isCheckingOut, authLoading, user?.id, user?.name, user?.email]);

  const updateGuestForm = (patch: Partial<GuestCheckoutForm>) => {
    setGuestForm((prev) => ({ ...prev, ...patch }));
  };

  const getCustomerPayload = () => {
    const name = guestForm.name.trim() || user?.name?.trim() || '';
    const email = guestForm.email.trim() || user?.email?.trim() || '';
    const phone = guestForm.phone.trim();
    const address = guestForm.address.trim();

    if (!name || !email || !phone || !address) {
      return {
        error: '주문자 정보(이름, 이메일, 연락처, 주소)를 모두 입력해 주세요.'
      } as const;
    }

    return {
      value: { name, email, phone, address }
    } as const;
  };

  const getBankTransferPayload = async () => {
    const depositorName =
      guestForm.depositorName.trim() ||
      guestForm.name.trim() ||
      user?.name?.trim() ||
      '';
    if (!depositorName) {
      return { error: '입금자명을 입력해 주세요.' } as const;
    }

    const validatedFile = validateBankTransferProofFile(bankTransferProofFile);
    if (!validatedFile.ok) {
      return { error: validatedFile.message } as const;
    }

    const uploadResult = await uploadBankTransferProofFile(
      bankTransferProofFile as File
    );
    return {
      value: {
        depositorName,
        proofImageUrl: uploadResult.url
      }
    } as const;
  };

  const handleOpenCheckout = () => {
    if (items.length === 0) return;

    setCheckoutError(null);
    setPaymentMethod('paypal');
    setIsCheckingOut(true);
  };

  const handleBackToCart = () => {
    if (isSavingOrder) return;
    setCheckoutError(null);
    setIsCheckingOut(false);
  };

  const handlePayPalApprove = async (data: any) => {
    try {
      setIsSavingOrder(true);
      setCheckoutError(null);
      const orderId = typeof data?.orderID === 'string' ? data.orderID : '';
      const customerPayload = getCustomerPayload();

      if (!orderId) {
        throw new Error('Missing PayPal order ID');
      }
      if ('error' in customerPayload) {
        throw new Error(customerPayload.error);
      }

      const captureResponse = await fetch('/api/paypal/order/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId })
      });
      const capturePayload = await captureResponse.json().catch(() => ({}));

      if (!captureResponse.ok) {
        const paypalIssue =
          typeof capturePayload?.details?.details?.[0]?.issue === 'string'
            ? capturePayload.details.details[0].issue
            : null;
        const paypalDescription =
          typeof capturePayload?.details?.details?.[0]?.description === 'string'
            ? capturePayload.details.details[0].description
            : null;
        const paypalDebugId =
          typeof capturePayload?.details?.debug_id === 'string'
            ? capturePayload.details.debug_id
            : null;
        const detailedMessage = [
          capturePayload?.message || 'PayPal capture failed',
          paypalIssue,
          paypalDescription,
          paypalDebugId ? `debug_id=${paypalDebugId}` : null
        ]
          .filter(Boolean)
          .join(' | ');
        throw new Error(detailedMessage);
      }

      const captureDetails = capturePayload?.paypal ?? capturePayload;
      const paypalOrderId =
        typeof (captureDetails as any)?.id === 'string'
          ? (captureDetails as any).id
          : typeof data?.orderID === 'string'
            ? data.orderID
            : null;

      const saveOrderResponse = await fetch('/api/orders/paypal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          totalKRW,
          approxUsd: usdTotal,
          paypalOrderId,
          paypalCapture: captureDetails,
          items: cartSnapshot,
          customerContact: customerPayload.value
        })
      });
      const saveOrderPayload = await saveOrderResponse.json().catch(() => ({}));

      if (!saveOrderResponse.ok) {
        throw new Error(
          saveOrderPayload?.message || '결제 완료 후 주문 저장에 실패했습니다.'
        );
      }

      clear();
      setIsCheckingOut(false);
      setCheckoutError(null);
      onOpenChange(false);
      toast({
        title: '결제가 완료되었습니다',
        description: '주문이 저장되었습니다.'
      });
    } catch (error) {
      console.error('[PayPal Diagnostic] onApprove/capture failed', error);
      const message =
        error instanceof Error
          ? error.message
          : '결제 완료 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      setCheckoutError(message);
      window.alert(`결제 처리 실패: ${message}`);
      toast({
        title: '결제 처리 실패',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleBankTransferCheckout = async () => {
    try {
      setIsSavingOrder(true);
      setCheckoutError(null);

      const customerPayload = getCustomerPayload();
      if ('error' in customerPayload) {
        throw new Error(customerPayload.error);
      }
      const bankTransferPayload = await getBankTransferPayload();
      if ('error' in bankTransferPayload) {
        throw new Error(bankTransferPayload.error);
      }

      const response = await fetch('/api/orders/bank-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          totalKRW,
          items: cartSnapshot,
          customerContact: customerPayload.value,
          bankTransfer: bankTransferPayload.value
        })
      });
      const payload = (await response
        .json()
        .catch(() => ({}))) as BankTransferOrderResponse;
      if (!response.ok) {
        throw new Error(
          payload?.message || '계좌이체 주문 저장에 실패했습니다.'
        );
      }

      clear();
      setIsCheckingOut(false);
      setCheckoutError(null);
      onOpenChange(false);

      const orderRef = payload?.bankTransfer?.orderRef;
      toast({
        title: '계좌이체 주문이 접수되었습니다',
        description: orderRef
          ? `주문 참조번호 ${orderRef} 로 입금 후 관리자 확인을 기다려 주세요.`
          : '입금 후 관리자 확인을 기다려 주세요.'
      });
    } catch (error) {
      console.error('[BankTransfer] checkout failed', error);
      const message =
        error instanceof Error
          ? error.message
          : '계좌이체 주문 처리 중 오류가 발생했습니다.';
      setCheckoutError(message);
      toast({
        title: '계좌이체 주문 실패',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handlePayPalError = (error: unknown) => {
    console.error('[PayPal Diagnostic] paypal button onError', error);
    const message =
      error instanceof Error
        ? error.message
        : 'PayPal 결제 중 오류가 발생했습니다.';
    setCheckoutError(message);
    window.alert(`PayPal 결제 오류: ${message}`);
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
            <GlassCloseButton
              onClick={() => onOpenChange(false)}
              label="장바구니 닫기"
            />
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-5 py-5 md:px-6">
            {!isCheckingOut ? (
              items.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-white">
                    장바구니가 비어 있습니다
                  </p>
                  <p className="text-xs text-white/50">
                    Services에서 항목을 추가해 보세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => {
                    const itemTotal =
                      item.price == null ? null : item.price * item.quantity;
                    return (
                      <div
                        key={item.key}
                        className="rounded-3xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
                      >
                        <div className="flex gap-3">
                          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.09] to-white/[0.04] p-1 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07]">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <ShoppingBag className="h-5 w-5 text-white/60" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">
                                {item.title}
                              </p>
                              <p className="mt-1 text-xs text-white/65">
                                수량 {item.quantity}
                              </p>
                              <p className="mt-1 text-sm font-medium text-white/95">
                                {itemTotal == null
                                  ? '가격 문의'
                                  : `${formatMoney(itemTotal, item.currency)}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <QuantityStepper
                              value={item.quantity}
                              onDecrement={() =>
                                updateQty(item.key, item.quantity - 1)
                              }
                              onIncrement={() =>
                                updateQty(item.key, item.quantity + 1)
                              }
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
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                    Order Summary
                  </p>
                  <p className="mt-2 text-sm text-white/80">
                    총 결제 금액:{' '}
                    <span className="font-semibold text-white">
                      {formatMoney(totalKRW, 'KRW')}
                    </span>{' '}
                    <span className="text-white/60">
                      (approx. {formatMoney(usdTotal, 'USD')})
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-white/50">
                    환율 기준: 1 USD ={' '}
                    {new Intl.NumberFormat('ko-KR').format(USD_EXCHANGE_RATE)}{' '}
                    KRW (고정 환율)
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    주문 항목 수: {itemCount}개
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold tracking-tight text-white">
                      주문자/배송 정보
                    </h3>
                    <p className="mt-1 text-xs text-white/55">
                      주문 저장 및 배송 안내를 위해 이름, 이메일, 핸드폰 번호,
                      집 주소를 입력해 주세요.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs text-white/60">
                        이름
                      </label>
                      <input
                        type="text"
                        value={guestForm.name}
                        onChange={(event) =>
                          updateGuestForm({ name: event.target.value })
                        }
                        placeholder="홍길동"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/60">
                        이메일
                      </label>
                      <input
                        type="email"
                        value={guestForm.email}
                        onChange={(event) =>
                          updateGuestForm({ email: event.target.value })
                        }
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/60">
                        입금자명
                      </label>
                      <input
                        type="text"
                        value={guestForm.depositorName}
                        onChange={(event) =>
                          updateGuestForm({ depositorName: event.target.value })
                        }
                        placeholder="주문자명과 동일 권장"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/60">
                        핸드폰 번호
                      </label>
                      <input
                        type="tel"
                        value={guestForm.phone}
                        onChange={(event) =>
                          updateGuestForm({ phone: event.target.value })
                        }
                        placeholder="010-0000-0000"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/60">
                        집 주소
                      </label>
                      <input
                        type="text"
                        value={guestForm.address}
                        onChange={(event) =>
                          updateGuestForm({ address: event.target.value })
                        }
                        placeholder="배송지 주소"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold tracking-tight text-white">
                      결제수단 선택
                    </h3>
                    <p className="mt-1 text-xs text-white/55">
                      PayPal 또는 계좌이체를 선택할 수 있습니다.
                    </p>
                  </div>

                  <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paypal')}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        paymentMethod === 'paypal'
                          ? 'border-white/35 bg-white/15 text-white'
                          : 'border-white/15 bg-black/20 text-white/70 hover:border-white/25'
                      }`}
                    >
                      PayPal
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank_transfer')}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        paymentMethod === 'bank_transfer'
                          ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100'
                          : 'border-white/15 bg-black/20 text-white/70 hover:border-white/25'
                      }`}
                    >
                      계좌이체
                    </button>
                  </div>

                  {hasUnpricedItems ? (
                    <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">
                      가격 정보가 없는 항목이 있어 결제를 진행할 수 없습니다.
                    </div>
                  ) : totalKRW <= 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">
                      결제 가능한 금액이 없습니다.
                    </div>
                  ) : paymentMethod === 'paypal' ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <PaypalButton
                        buttonProps={{
                          style: {
                            layout: 'vertical',
                            shape: 'pill',
                            label: 'paypal'
                          },
                          disabled: isSavingOrder,
                          forceReRender: [
                            usdTotalLabel,
                            itemCount,
                            user?.id ?? '',
                            isSavingOrder
                          ],
                          onClick: async () => {
                            console.log(
                              '[PayPal Diagnostic] PayPal button clicked (popup should open)',
                              {
                                host:
                                  typeof window !== 'undefined'
                                    ? window.location.host
                                    : 'unknown',
                                siteMode:
                                  typeof window !== 'undefined' &&
                                  (window.location.hostname === 'localhost' ||
                                    window.location.hostname === '127.0.0.1')
                                    ? 'localhost'
                                    : 'production-like'
                              }
                            );
                          },
                          createOrder: async () => {
                            try {
                              const customerPayload = getCustomerPayload();
                              if ('error' in customerPayload) {
                                window.alert(customerPayload.error);
                                throw new Error(customerPayload.error);
                              }

                              const parsedAmount = Number(
                                String(usdTotalLabel).replace(/,/g, '')
                              );
                              if (
                                !Number.isFinite(parsedAmount) ||
                                parsedAmount <= 0
                              ) {
                                throw new Error(
                                  'Invalid USD amount for PayPal checkout'
                                );
                              }

                              const normalizedUsdAmount =
                                parsedAmount.toFixed(2);
                              const response = await fetch(
                                '/api/paypal/order/create',
                                {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    amount: normalizedUsdAmount,
                                    currency: 'USD'
                                  })
                                }
                              );
                              const payload = await response
                                .json()
                                .catch(() => ({}));

                              console.log(
                                '[PayPal Diagnostic] create-order API response',
                                {
                                  ok: response.ok,
                                  status: response.status,
                                  environment:
                                    payload?.debug?.environment ?? null,
                                  orderId: payload?.id ?? null,
                                  orderStatus: payload?.status ?? null,
                                  message: payload?.message ?? null
                                }
                              );

                              if (
                                !response.ok ||
                                typeof payload?.id !== 'string'
                              ) {
                                throw new Error(
                                  payload?.message ||
                                    'Failed to create PayPal order'
                                );
                              }

                              return payload.id;
                            } catch (error) {
                              console.error(
                                '[PayPal Diagnostic] createOrder failed',
                                error
                              );
                              const message =
                                error instanceof Error
                                  ? error.message
                                  : 'PayPal 주문 생성 중 오류가 발생했습니다.';
                              setCheckoutError(message);
                              window.alert(`PayPal 주문 생성 실패: ${message}`);
                              throw error;
                            }
                          },
                          onApprove: handlePayPalApprove,
                          onError: handlePayPalError,
                          onCancel: (
                            cancelData: unknown,
                            cancelActions: unknown
                          ) => {
                            console.warn(
                              '[PayPal Diagnostic] paypal button onCancel',
                              {
                                cancelData,
                                cancelActions
                              }
                            );
                            toast({
                              title: '결제가 취소되었습니다',
                              description:
                                '원하시면 다른 결제 수단 또는 다시 시도해 주세요.'
                            });
                          }
                        }}
                      />
                      {authLoading ? (
                        <p className="mt-2 text-xs text-white/45">
                          로그인 상태 확인 중...
                        </p>
                      ) : null}
                      {!authLoading ? (
                        <p className="mt-2 text-xs text-white/45">
                          {user?.id
                            ? '주문자/배송 정보를 확인한 뒤 결제를 진행해 주세요.'
                            : '비회원 구매 가능합니다. 위 주문 정보를 입력한 뒤 결제를 진행해 주세요.'}
                        </p>
                      ) : null}
                      {!authLoading && user?.id && profilePrefillLoading ? (
                        <p className="mt-1 text-xs text-white/40">
                          회원정보에서 핸드폰 번호/주소를 불러오는 중...
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-3">
                      <p className="text-sm font-semibold text-emerald-100">
                        계좌이체 안내
                      </p>
                      {hasConfiguredBankAccount ? (
                        <>
                          <p className="mt-2 text-sm text-emerald-50">
                            은행: {bankTransferInfo.bankName}
                          </p>
                          <p className="mt-1 text-sm text-emerald-50">
                            계좌번호: {bankTransferInfo.accountNumber}
                          </p>
                          <p className="mt-1 text-sm text-emerald-50">
                            예금주: {bankTransferInfo.accountHolder}
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-amber-100">
                          계좌 정보가 아직 설정되지 않았습니다. 관리자에게
                          문의해 주세요.
                        </p>
                      )}
                      <p className="mt-2 text-xs text-emerald-50/90">
                        {bankTransferInfo.notice}
                      </p>
                      <div className="mt-3">
                        <label className="mb-1 block text-xs text-emerald-100/90">
                          이체인증 이미지 첨부 (필수)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setBankTransferProofFile(file);
                          }}
                          className="w-full rounded-xl border border-emerald-200/30 bg-black/20 px-3 py-2 text-xs text-emerald-50 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-200/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-50 hover:file:bg-emerald-200/30"
                        />
                        {bankTransferProofFile ? (
                          <p className="mt-1 text-[11px] text-emerald-100/80">
                            첨부됨: {bankTransferProofFile.name}
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-emerald-100/80">
                            입금 후 캡처 이미지를 올려 주세요.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleBankTransferCheckout()}
                        disabled={isSavingOrder || !bankTransferProofFile}
                        className="mt-3 w-full rounded-xl border border-emerald-200/40 bg-emerald-300/20 px-3 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingOrder
                          ? '주문 접수 중...'
                          : '계좌이체 주문 접수'}
                      </button>
                      <p className="mt-2 text-xs text-emerald-50/80">
                        입금 확인 전까지 주문 상태는 결제 대기로 표시됩니다.
                      </p>
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
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Total
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {formatMoney(totalKRW, 'KRW')}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => clear()}
                    className="px-5"
                    disabled={items.length === 0 || isSavingOrder}
                  >
                    비우기
                  </ActionButton>
                  <ActionButton
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleOpenCheckout}
                    className="px-5"
                    disabled={items.length === 0 || isSavingOrder}
                  >
                    결제하기
                  </ActionButton>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Payment Total
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {formatMoney(totalKRW, 'KRW')}{' '}
                    <span className="text-white/60">
                      (approx. {formatMoney(usdTotal, 'USD')})
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleBackToCart}
                    className="px-5"
                    disabled={isSavingOrder}
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

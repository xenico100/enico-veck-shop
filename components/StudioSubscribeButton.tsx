'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  STUDIO_MEMBERSHIP_PLAN_OPTIONS,
  formatStudioMembershipPriceKrw,
  type StudioMembershipPlanKey
} from '@/utils/studio-membership-plans';

type Props = {
  studioPostId: string;
  className?: string;
};

type MembershipBankTransferResponse = {
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
  };
  plan?: {
    key?: StudioMembershipPlanKey;
    title?: string;
    priceKrw?: number;
  };
};

type MembershipSummaryLite = {
  has_active_subscription?: boolean;
  selected_membership?: string | null;
  next_billing_at?: string | null;
  plan_amount?: number | string | null;
  plan_currency?: string | null;
  plan_interval?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const parsePlanAmount = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const inferPlanKeyFromSummary = (summary: MembershipSummaryLite | null): StudioMembershipPlanKey | null => {
  if (!summary?.has_active_subscription) return null;

  const amount = parsePlanAmount(summary.plan_amount);
  if (amount != null) {
    if (amount >= 69000) return 'monthly_69000';
    if (amount >= 13900) return 'monthly_13900';
    if (amount >= 4900) return 'monthly_4900';
  }

  const label = String(summary.selected_membership || '').toLowerCase();
  if (!label) return null;
  if (label.includes('프리미엄') || label.includes('premium')) return 'monthly_69000';
  if (label.includes('플러스') || label.includes('plus')) return 'monthly_13900';
  if (label.includes('베이직') || label.includes('basic')) return 'monthly_4900';
  return null;
};

const getRemainingDays = (nextBillingAt: string | null | undefined) => {
  if (!nextBillingAt) return null;
  const targetMs = Date.parse(nextBillingAt);
  if (!Number.isFinite(targetMs)) return null;
  const diff = targetMs - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / DAY_MS);
};

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(parsed);
  } catch {
    return null;
  }
};

export default function StudioSubscribeButton({ studioPostId, className }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingState, setLoadingState] = useState<{
    planKey: StudioMembershipPlanKey;
    method: 'paypal' | 'bank_transfer';
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [membershipSummary, setMembershipSummary] = useState<MembershipSummaryLite | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [bankTransferResult, setBankTransferResult] =
    useState<MembershipBankTransferResponse | null>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    let active = true;

    const loadMembershipSummary = async () => {
      setMembershipLoading(true);
      try {
        const response = await fetch('/api/account/membership', { cache: 'no-store' });
        if (!active) return;
        if (!response.ok) {
          setMembershipSummary(null);
          return;
        }
        const payload = await response.json().catch(() => ({}));
        const row = payload?.data ?? null;
        setMembershipSummary(row && typeof row === 'object' ? (row as MembershipSummaryLite) : null);
      } catch {
        if (!active) return;
        setMembershipSummary(null);
      } finally {
        if (active) setMembershipLoading(false);
      }
    };

    void loadMembershipSummary();
    return () => {
      active = false;
    };
  }, [pickerOpen]);

  const remainingDays = useMemo(
    () => getRemainingDays(membershipSummary?.next_billing_at),
    [membershipSummary?.next_billing_at]
  );

  const handleSubscribe = (planKey: StudioMembershipPlanKey) => {
    if (loadingState) return;
    if (membershipLoading) {
      setError('현재 멤버십 정보를 확인 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    if (membershipSummary?.has_active_subscription) {
      const currentPlanKey = inferPlanKeyFromSummary(membershipSummary);
      if (currentPlanKey === planKey) {
        setError('이미 사용 중인 멤버십 플랜입니다. 현재 플랜 만료일까지 이용 후 변경해 주세요.');
        return;
      }

      const targetPlan = STUDIO_MEMBERSHIP_PLAN_OPTIONS.find((plan) => plan.key === planKey);
      const nextBillingText = formatDateLabel(membershipSummary.next_billing_at) || '다음 결제일';
      const remainingText =
        typeof remainingDays === 'number' ? `남은 기간은 약 ${remainingDays}일` : '남은 기간 확인 불가';
      const currentLabel = membershipSummary.selected_membership || '현재 멤버십';
      const nextLabel = targetPlan?.title || '선택 멤버십';

      const shouldContinue = window.confirm(
        `현재 ${currentLabel} 이용 중입니다. ${remainingText}이며, ${nextLabel}은 ${nextBillingText}(다음 결제주기)부터 적용됩니다.\n계속 진행하시겠어요?`
      );
      if (!shouldContinue) return;
    }

    setLoadingState({ planKey, method: 'paypal' });
    setError(null);
    setBankTransferResult(null);

    const redirectUrl = new URL('/api/paypal/subscription/create', window.location.origin);
    redirectUrl.searchParams.set('planKey', planKey);
    if (studioPostId.trim()) {
      redirectUrl.searchParams.set('studioPostId', studioPostId.trim());
    }

    window.location.assign(redirectUrl.toString());
  };

  const handleBankTransfer = async (planKey: StudioMembershipPlanKey) => {
    if (loadingState) return;
    if (membershipLoading) {
      setError('현재 멤버십 정보를 확인 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setLoadingState({ planKey, method: 'bank_transfer' });
    setError(null);

    try {
      const response = await fetch('/api/studio/membership/bank-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioPostId, planKey })
      });

      const payload = (await response.json().catch(() => ({}))) as MembershipBankTransferResponse;
      if (response.status === 401) {
        setLoadingState(null);
        window.location.assign('/signin');
        return;
      }
      if (!response.ok) {
        throw new Error(payload.message || '계좌이체 신청에 실패했습니다.');
      }

      setBankTransferResult(payload);
      setLoadingState(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '계좌이체 신청에 실패했습니다.');
      setLoadingState(null);
    }
  };

  if (!pickerOpen) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setPickerOpen(true);
          }}
          className={
            className ||
            'inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-70'
          }
        >
          멤버십 가입하기
        </button>
        {error && <p className="text-sm text-rose-200">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <p className="text-xs uppercase tracking-[0.16em] text-white/50">월간 멤버십 선택</p>
        {membershipSummary?.has_active_subscription && (
          <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
            <p className="font-semibold">
              현재 멤버십: {membershipSummary.selected_membership ?? '활성 구독'}
            </p>
            <p className="mt-1 text-xs text-amber-100/90">
              {typeof remainingDays === 'number'
                ? `남은 기간: 약 ${remainingDays}일`
                : '남은 기간을 계산하지 못했습니다.'}
              {formatDateLabel(membershipSummary.next_billing_at)
                ? ` · 다음 결제일: ${formatDateLabel(membershipSummary.next_billing_at)}`
                : ''}
            </p>
            <p className="mt-1 text-xs text-amber-100/85">
              새 플랜은 현재 플랜 만료 후 다음 결제일부터 적용됩니다.
            </p>
          </div>
        )}
        {membershipLoading && (
          <p className="mt-3 text-xs text-white/60">현재 멤버십 정보를 확인하는 중...</p>
        )}
        <div className="mt-3 grid gap-2">
          {STUDIO_MEMBERSHIP_PLAN_OPTIONS.map((plan) => {
            const isPayPalLoading =
              loadingState?.planKey === plan.key && loadingState.method === 'paypal';
            const isBankLoading =
              loadingState?.planKey === plan.key && loadingState.method === 'bank_transfer';
            return (
              <div
                key={plan.key}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{plan.title}</p>
                    <p className="mt-1 text-xs text-white/55">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {formatStudioMembershipPriceKrw(plan.priceKrw)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void handleSubscribe(plan.key)}
                    disabled={Boolean(loadingState) || membershipLoading}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPayPalLoading ? 'PayPal 이동 중...' : 'PayPal 자동결제'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBankTransfer(plan.key)}
                    disabled={Boolean(loadingState) || membershipLoading}
                    className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isBankLoading ? '신청 저장 중...' : '계좌이체 신청'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {bankTransferResult?.bankTransfer ? (
          <div className="mt-3 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100">
            <p className="font-semibold">계좌이체 신청이 접수되었습니다.</p>
            {bankTransferResult.bankTransfer.accountConfigured ? (
              <>
                <p className="mt-2">
                  입금 계좌: {bankTransferResult.bankTransfer.bankName}{' '}
                  {bankTransferResult.bankTransfer.accountNumber}
                </p>
                <p className="mt-1">예금주: {bankTransferResult.bankTransfer.accountHolder}</p>
              </>
            ) : (
              <p className="mt-2">
                계좌 정보가 아직 설정되지 않았습니다. 관리자에게 계좌 정보를 문의해 주세요.
              </p>
            )}
            {bankTransferResult.bankTransfer.orderRef ? (
              <p className="mt-1">주문 참조번호: {bankTransferResult.bankTransfer.orderRef}</p>
            ) : null}
            {bankTransferResult.bankTransfer.notice ? (
              <p className="mt-1 text-xs text-emerald-200/90">
                {bankTransferResult.bankTransfer.notice}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-emerald-200/90">
              입금 확인 후 관리자가 멤버십 이용 권한을 활성화합니다.
            </p>
          </div>
        ) : null}

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (loadingState) return;
              setPickerOpen(false);
            }}
            disabled={Boolean(loadingState)}
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            취소
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-rose-200">{error}</p>}
    </div>
  );
}

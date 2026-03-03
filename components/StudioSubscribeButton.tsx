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
  buttonLabel?: string;
};

type MembershipBankTransferResponse = {
  message?: string;
  data?: {
    id?: string;
    amount_total?: number | string | null;
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
  proration?: {
    enabled?: boolean;
    current_plan_key?: string | null;
    target_plan_key?: string | null;
    remaining_days?: number | null;
    cycle_days?: number | null;
    current_credit_krw?: number | null;
    target_remaining_cost_krw?: number | null;
    due_now_krw?: number | null;
  } | null;
};

type MembershipSummaryLite = {
  has_active_subscription?: boolean;
  selected_membership?: string | null;
  subscribed_at?: string | null;
  next_billing_at?: string | null;
  plan_amount?: number | string | null;
  plan_currency?: string | null;
  plan_interval?: string | null;
  plan_cycle_days?: number | null;
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

const parseIsoMs = (value: string | null | undefined) => {
  if (!value) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const resolveEstimatedNextBillingAt = (summary: MembershipSummaryLite | null) => {
  const directMs = parseIsoMs(summary?.next_billing_at);
  if (Number.isFinite(directMs)) return directMs;

  const baseMs = parseIsoMs(summary?.subscribed_at);
  if (!Number.isFinite(baseMs)) return Number.NaN;

  const cycleDays =
    typeof summary?.plan_cycle_days === 'number' && summary.plan_cycle_days > 0
      ? summary.plan_cycle_days
      : 30;
  let nextMs = baseMs + cycleDays * DAY_MS;
  const nowMs = Date.now();
  let guard = 0;
  while (nextMs <= nowMs && guard < 48) {
    nextMs += cycleDays * DAY_MS;
    guard += 1;
  }
  return nextMs;
};

const getRemainingDays = (summary: MembershipSummaryLite | null) => {
  const targetMs = resolveEstimatedNextBillingAt(summary);
  if (!Number.isFinite(targetMs)) return null;
  const diff = targetMs - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / DAY_MS);
};

const formatKrw = (amount: number) => `${Math.round(amount).toLocaleString('ko-KR')}원`;

const getProrationEstimate = (params: {
  currentAmount: number | null;
  targetAmount: number;
  remainingDays: number | null;
  cycleDays: number;
}) => {
  const { currentAmount, targetAmount, remainingDays, cycleDays } = params;
  if (currentAmount == null || remainingDays == null || cycleDays <= 0) return null;

  const safeRemainingDays = Math.max(0, Math.min(remainingDays, cycleDays));
  const ratio = safeRemainingDays / cycleDays;
  const currentCredit = Math.round(currentAmount * ratio);
  const targetRemainingCost = Math.round(targetAmount * ratio);
  const dueNow = Math.max(0, targetRemainingCost - currentCredit);

  return {
    currentCredit,
    targetRemainingCost,
    dueNow
  };
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

const formatDateLabelFromMs = (valueMs: number) => {
  if (!Number.isFinite(valueMs)) return null;
  return formatDateLabel(new Date(valueMs).toISOString());
};

export default function StudioSubscribeButton({ studioPostId, className, buttonLabel }: Props) {
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

  const remainingDays = useMemo(() => getRemainingDays(membershipSummary), [membershipSummary]);
  const currentPlanAmount = useMemo(
    () => parsePlanAmount(membershipSummary?.plan_amount),
    [membershipSummary?.plan_amount]
  );
  const estimatedNextBillingMs = useMemo(
    () => resolveEstimatedNextBillingAt(membershipSummary),
    [membershipSummary]
  );
  const estimatedNextBillingLabel = useMemo(
    () => formatDateLabelFromMs(estimatedNextBillingMs),
    [estimatedNextBillingMs]
  );
  const cycleDays = useMemo(() => {
    const value = membershipSummary?.plan_cycle_days;
    return typeof value === 'number' && value > 0 ? value : 30;
  }, [membershipSummary?.plan_cycle_days]);
  const bankTransferChargedAmount = useMemo(
    () => parsePlanAmount(bankTransferResult?.data?.amount_total),
    [bankTransferResult?.data?.amount_total]
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
      const nextBillingText = estimatedNextBillingLabel || '다음 결제일';
      const remainingText =
        typeof remainingDays === 'number' ? `남은 기간은 약 ${remainingDays}일` : '남은 기간 확인 불가';
      const currentLabel = membershipSummary.selected_membership || '현재 멤버십';
      const nextLabel = targetPlan?.title || '선택 멤버십';
      const prorationEstimate = targetPlan
        ? getProrationEstimate({
            currentAmount: currentPlanAmount,
            targetAmount: targetPlan.priceKrw,
            remainingDays,
            cycleDays
          })
        : null;
      const prorationText = prorationEstimate
        ? `\n(내부 계산 기준) 남은 기간 크레딧 ${formatKrw(prorationEstimate.currentCredit)} 반영 시 예상 추가 금액: ${formatKrw(prorationEstimate.dueNow)}`
        : '';
      const paypalNotice = '\nPayPal 결제창에 표시되는 금액이 실제 청구 금액입니다.';

      const shouldContinue = window.confirm(
        `현재 ${currentLabel} 이용 중입니다. ${remainingText}이며, ${nextLabel}은 ${nextBillingText}(다음 결제주기)부터 적용됩니다.${prorationText}${paypalNotice}\n계속 진행하시겠어요?`
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
          {buttonLabel || '멤버십 가입하기'}
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
              {estimatedNextBillingLabel
                ? ` · 다음 결제일: ${estimatedNextBillingLabel}`
                : ''}
            </p>
            <p className="mt-1 text-xs text-amber-100/85">
              남은 기간 기준 차등 계산(예상)을 먼저 안내하고, 새 플랜은 다음 결제주기부터 적용됩니다.
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
            const prorationEstimate = membershipSummary?.has_active_subscription
              ? getProrationEstimate({
                  currentAmount: currentPlanAmount,
                  targetAmount: plan.priceKrw,
                  remainingDays,
                  cycleDays
                })
              : null;
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
                {prorationEstimate ? (
                  <p className="mt-2 text-[11px] text-white/55">
                    내부 계산 기준 차등 안내: 남은기간 크레딧 {formatKrw(prorationEstimate.currentCredit)} 반영 시
                    예상 추가금액 {formatKrw(prorationEstimate.dueNow)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {bankTransferResult?.bankTransfer ? (
          <div className="mt-3 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100">
            <p className="font-semibold">
              계좌이체 신청이 접수되었습니다.
              {bankTransferChargedAmount != null
                ? ` (청구금액 ${formatKrw(bankTransferChargedAmount)})`
                : ''}
            </p>
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
            {bankTransferResult.proration?.enabled ? (
              <p className="mt-1 text-xs text-emerald-200/90">
                차등 계산: 남은기간 크레딧{' '}
                {formatKrw(Number(bankTransferResult.proration.current_credit_krw || 0))} 반영,
                현재 청구금액{' '}
                {formatKrw(Number(bankTransferResult.proration.due_now_krw || 0))}
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

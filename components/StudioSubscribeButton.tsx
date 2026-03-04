'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  STUDIO_MEMBERSHIP_PLAN_OPTIONS,
  formatStudioMembershipPriceKrw,
  getStudioMembershipPlanOptionByKey,
  inferStudioMembershipPlanKeyFromSummary,
  isStudioMembershipTierDowngrade,
  type StudioMembershipPlanKey
} from '@/utils/studio-membership-plans';
import {
  uploadBankTransferProofFile,
  validateBankTransferProofFile
} from '@/utils/bank-transfer-client';

type Props = {
  studioPostId: string;
  className?: string;
  buttonLabel?: string;
  alwaysOpen?: boolean;
  onActionCompleted?: () => void | Promise<void>;
  membershipSummaryOverride?: MembershipSummaryLite | null;
  profilePrefillOverride?: MembershipProfileLite | null;
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
    depositorName?: string;
    proofImageUrl?: string;
  };
  plan?: {
    key?: StudioMembershipPlanKey;
    title?: string;
    priceKrw?: number;
    billingCycle?: 'monthly' | 'yearly';
    durationDays?: number;
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

type MembershipProfileLite = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type BankTransferApplicantForm = {
  name: string;
  email: string;
  depositorName: string;
  phone: string;
  address: string;
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

type MembershipChangeRequestResponse = {
  message?: string;
  data?: {
    id?: string;
  };
  membershipChange?: {
    currentPlanKey?: string;
    currentPlanTitle?: string;
    targetPlanKey?: string;
    targetPlanTitle?: string;
    effectiveAt?: string;
    orderRef?: string | null;
  };
};

const parseIsoMs = (value: string | null | undefined) => {
  if (!value) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const resolveEstimatedNextBillingAt = (
  summary: MembershipSummaryLite | null
) => {
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

const formatKrw = (amount: number) =>
  `${Math.round(amount).toLocaleString('ko-KR')}원`;

const getProrationEstimate = (params: {
  currentAmount: number | null;
  targetAmount: number;
  remainingDays: number | null;
  cycleDays: number;
}) => {
  const { currentAmount, targetAmount, remainingDays, cycleDays } = params;
  if (currentAmount == null || remainingDays == null || cycleDays <= 0)
    return null;

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
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(
      parsed
    );
  } catch {
    return null;
  }
};

const formatDateLabelFromMs = (valueMs: number) => {
  if (!Number.isFinite(valueMs)) return null;
  return formatDateLabel(new Date(valueMs).toISOString());
};

export default function StudioSubscribeButton({
  studioPostId,
  className,
  buttonLabel,
  alwaysOpen = false,
  onActionCompleted,
  membershipSummaryOverride = null,
  profilePrefillOverride = null
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(alwaysOpen);
  const [loadingState, setLoadingState] = useState<{
    planKey: StudioMembershipPlanKey;
    method: 'paypal' | 'bank_transfer' | 'schedule_downgrade';
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [membershipSummary, setMembershipSummary] =
    useState<MembershipSummaryLite | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [profilePrefillLoading, setProfilePrefillLoading] = useState(false);
  const [bankTransferResult, setBankTransferResult] =
    useState<MembershipBankTransferResponse | null>(null);
  const [membershipChangeResult, setMembershipChangeResult] =
    useState<MembershipChangeRequestResponse | null>(null);
  const [bankTransferForm, setBankTransferForm] =
    useState<BankTransferApplicantForm>({
      name: '',
      email: '',
      depositorName: '',
      phone: '',
      address: ''
    });
  const [bankTransferProofFile, setBankTransferProofFile] =
    useState<File | null>(null);

  useEffect(() => {
    if (alwaysOpen) {
      setPickerOpen(true);
    }
  }, [alwaysOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    let active = true;

    if (membershipSummaryOverride) {
      setMembershipSummary(membershipSummaryOverride);
      setMembershipLoading(false);
    }

    if (profilePrefillOverride) {
      setBankTransferForm((prev) => ({
        name: prev.name || String(profilePrefillOverride.name || '').trim(),
        email: prev.email || String(profilePrefillOverride.email || '').trim(),
        depositorName:
          prev.depositorName || String(profilePrefillOverride.name || '').trim(),
        phone: prev.phone || String(profilePrefillOverride.phone || '').trim(),
        address: prev.address || String(profilePrefillOverride.address || '').trim()
      }));
    }

    const loadMembershipSummary = async () => {
      if (membershipSummaryOverride) return;
      setMembershipLoading(true);
      try {
        const response = await fetch('/api/account/membership', {
          cache: 'no-store'
        });
        if (!active) return;
        if (!response.ok) {
          setMembershipSummary(null);
          return;
        }
        const payload = await response.json().catch(() => ({}));
        const row = payload?.data ?? null;
        setMembershipSummary(
          row && typeof row === 'object' ? (row as MembershipSummaryLite) : null
        );
      } catch {
        if (!active) return;
        setMembershipSummary(null);
      } finally {
        if (active) setMembershipLoading(false);
      }
    };

    const loadProfileForPrefill = async () => {
      const hasOverridePrefill =
        Boolean(profilePrefillOverride?.name) &&
        Boolean(profilePrefillOverride?.email) &&
        Boolean(profilePrefillOverride?.phone) &&
        Boolean(profilePrefillOverride?.address);
      if (hasOverridePrefill) {
        setProfilePrefillLoading(false);
        return;
      }

      setProfilePrefillLoading(true);
      try {
        const response = await fetch('/api/account/profile', {
          cache: 'no-store'
        });
        if (!active) return;
        if (!response.ok) {
          if (response.status === 401) {
            window.location.assign('/signin');
          }
          return;
        }

        const payload = await response.json().catch(() => ({}));
        const row = (payload?.data ?? null) as MembershipProfileLite | null;
        setBankTransferForm((prev) => ({
          name: prev.name || String(row?.name || '').trim(),
          email: prev.email || String(row?.email || '').trim(),
          depositorName: prev.depositorName || String(row?.name || '').trim(),
          phone: prev.phone || String(row?.phone || '').trim(),
          address: prev.address || String(row?.address || '').trim()
        }));
      } catch {
        if (!active) return;
      } finally {
        if (active) setProfilePrefillLoading(false);
      }
    };

    void loadMembershipSummary();
    void loadProfileForPrefill();
    return () => {
      active = false;
    };
  }, [pickerOpen, membershipSummaryOverride, profilePrefillOverride]);

  useEffect(() => {
    if (pickerOpen) return;
    setBankTransferProofFile(null);
  }, [pickerOpen]);

  const remainingDays = useMemo(
    () => getRemainingDays(membershipSummary),
    [membershipSummary]
  );
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
  const currentPlanKey = useMemo(
    () => inferStudioMembershipPlanKeyFromSummary(membershipSummary),
    [membershipSummary]
  );
  const currentPlanOption = useMemo(
    () => getStudioMembershipPlanOptionByKey(currentPlanKey),
    [currentPlanKey]
  );

  const updateBankTransferForm = (
    patch: Partial<BankTransferApplicantForm>
  ) => {
    setBankTransferForm((prev) => ({ ...prev, ...patch }));
  };

  const getBankTransferRequestPayload = async () => {
    const name = bankTransferForm.name.trim();
    const email = bankTransferForm.email.trim();
    const phone = bankTransferForm.phone.trim();
    const address = bankTransferForm.address.trim();
    const depositorName = bankTransferForm.depositorName.trim() || name;

    if (!name || !email || !phone || !address || !depositorName) {
      return {
        error:
          '입금자 정보(이름/이메일/입금자명/핸드폰/주소)를 모두 입력해 주세요.'
      } as const;
    }

    const validatedProofFile = validateBankTransferProofFile(
      bankTransferProofFile
    );
    if (!validatedProofFile.ok) {
      return { error: validatedProofFile.message } as const;
    }

    const uploadResult = await uploadBankTransferProofFile(
      bankTransferProofFile as File
    );
    return {
      value: {
        customerContact: {
          name,
          email,
          phone,
          address
        },
        bankTransfer: {
          depositorName,
          proofImageUrl: uploadResult.url
        }
      }
    } as const;
  };

  const notifyActionCompleted = async () => {
    if (!onActionCompleted) return;
    await onActionCompleted();
  };

  const handleScheduleDowngrade = async (planKey: StudioMembershipPlanKey) => {
    if (loadingState) return;
    if (membershipLoading) {
      setError('현재 멤버십 정보를 확인 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if (!membershipSummary?.has_active_subscription || !currentPlanKey) {
      setError('현재 활성 멤버십 정보가 없습니다.');
      return;
    }
    if (!isStudioMembershipTierDowngrade(currentPlanKey, planKey)) {
      setError('다운그레이드 플랜이 아닙니다.');
      return;
    }

    const targetPlan = getStudioMembershipPlanOptionByKey(planKey);
    const nextBillingText = estimatedNextBillingLabel || '다음 결제일';
    const shouldContinue = window.confirm(
      `현재 ${membershipSummary.selected_membership || currentPlanOption?.title || '멤버십'} 이용 중입니다.\n${targetPlan?.title || '선택 멤버십'}으로의 다운그레이드는 ${nextBillingText}부터 적용됩니다.\n예약 요청을 진행할까요?`
    );
    if (!shouldContinue) return;

    setLoadingState({ planKey, method: 'schedule_downgrade' });
    setError(null);
    setBankTransferResult(null);
    setMembershipChangeResult(null);

    try {
      const response = await fetch('/api/account/membership/change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPlanKey: planKey
        })
      });
      const payload = (await response
        .json()
        .catch(() => ({}))) as MembershipChangeRequestResponse;

      if (response.status === 401) {
        setLoadingState(null);
        window.location.assign('/signin');
        return;
      }
      if (!response.ok) {
        throw new Error(payload.message || '멤버십 변경 예약에 실패했습니다.');
      }

      setMembershipChangeResult(payload);
      await notifyActionCompleted();
      setLoadingState(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '멤버십 변경 예약에 실패했습니다.'
      );
      setLoadingState(null);
    }
  };

  const handleSubscribe = (planKey: StudioMembershipPlanKey) => {
    if (loadingState) return;
    if (membershipLoading) {
      setError('현재 멤버십 정보를 확인 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    const selectedPlan = STUDIO_MEMBERSHIP_PLAN_OPTIONS.find(
      (plan) => plan.key === planKey
    );
    if (!selectedPlan?.supportsPayPal) {
      setError('선택한 플랜은 계좌이체 전용입니다.');
      return;
    }

    if (membershipSummary?.has_active_subscription) {
      if (currentPlanKey === planKey) {
        setError(
          '이미 사용 중인 멤버십 플랜입니다. 현재 플랜 만료일까지 이용 후 변경해 주세요.'
        );
        return;
      }
      if (currentPlanKey && isStudioMembershipTierDowngrade(currentPlanKey, planKey)) {
        setError(
          '현재보다 낮은 멤버십은 "다음 결제일부터 변경 예약" 버튼으로 신청해 주세요.'
        );
        return;
      }

      const targetPlan = selectedPlan;
      const nextBillingText = estimatedNextBillingLabel || '다음 결제일';
      const remainingText =
        typeof remainingDays === 'number'
          ? `남은 기간은 약 ${remainingDays}일`
          : '남은 기간 확인 불가';
      const currentLabel =
        membershipSummary.selected_membership || '현재 멤버십';
      const nextLabel = targetPlan?.title || '선택 멤버십';
      const prorationEstimate = targetPlan
        ? targetPlan.billingCycle === 'monthly'
          ? getProrationEstimate({
              currentAmount: currentPlanAmount,
              targetAmount: targetPlan.priceKrw,
              remainingDays,
              cycleDays
            })
          : null
        : null;
      const prorationText = prorationEstimate
        ? `\n(내부 계산 기준) 남은 기간 크레딧 ${formatKrw(prorationEstimate.currentCredit)} 반영 시 예상 추가 금액: ${formatKrw(prorationEstimate.dueNow)}`
        : '';
      const paypalNotice =
        '\nPayPal 결제창에 표시되는 금액이 실제 청구 금액입니다.';

      const shouldContinue = window.confirm(
        `현재 ${currentLabel} 이용 중입니다. ${remainingText}이며, ${nextLabel}은 ${nextBillingText}(다음 결제주기)부터 적용됩니다.${prorationText}${paypalNotice}\n계속 진행하시겠어요?`
      );
      if (!shouldContinue) return;
    }

    setLoadingState({ planKey, method: 'paypal' });
    setError(null);
    setBankTransferResult(null);
    setMembershipChangeResult(null);

    const redirectUrl = new URL(
      '/api/paypal/subscription/create',
      window.location.origin
    );
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
    if (membershipSummary?.has_active_subscription && currentPlanKey) {
      if (currentPlanKey === planKey) {
        setError('이미 사용 중인 멤버십 플랜입니다.');
        return;
      }
      if (isStudioMembershipTierDowngrade(currentPlanKey, planKey)) {
        setError(
          '다운그레이드는 결제가 아닌 "다음 결제일부터 변경 예약"으로 진행됩니다.'
        );
        return;
      }
    }

    setLoadingState({ planKey, method: 'bank_transfer' });
    setError(null);
    setMembershipChangeResult(null);

    try {
      const requestPayload = await getBankTransferRequestPayload();
      if ('error' in requestPayload) {
        throw new Error(requestPayload.error);
      }

      const response = await fetch('/api/studio/membership/bank-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioPostId,
          planKey,
          ...requestPayload.value
        })
      });

      const payload = (await response
        .json()
        .catch(() => ({}))) as MembershipBankTransferResponse;
      if (response.status === 401) {
        setLoadingState(null);
        window.location.assign('/signin');
        return;
      }
      if (!response.ok) {
        throw new Error(payload.message || '계좌이체 신청에 실패했습니다.');
      }

      setBankTransferResult(payload);
      await notifyActionCompleted();
      setLoadingState(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '계좌이체 신청에 실패했습니다.'
      );
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
            setMembershipChangeResult(null);
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
        <p className="text-xs uppercase tracking-[0.16em] text-white/50">
          멤버십 선택
        </p>
        {membershipSummary?.has_active_subscription && (
          <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
            <p className="font-semibold">
              현재 멤버십:{' '}
              {membershipSummary.selected_membership ?? '활성 구독'}
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
              남은 기간 기준 차등 계산(예상)을 먼저 안내하고, 새 플랜은 다음
              결제주기부터 적용됩니다.
            </p>
          </div>
        )}
        {membershipLoading && (
          <p className="mt-3 text-xs text-white/60">
            현재 멤버십 정보를 확인하는 중...
          </p>
        )}
        {profilePrefillLoading && (
          <p className="mt-1 text-xs text-white/50">
            회원정보(입금자명/핸드폰/주소)를 자동 입력하는 중...
          </p>
        )}
        <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3">
          <p className="text-sm font-semibold text-emerald-100">
            계좌이체 신청 정보
          </p>
          <p className="mt-1 text-xs text-emerald-100/85">
            회원정보가 있으면 자동으로 채워집니다. 이체인증 이미지는 필수입니다.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              type="text"
              value={bankTransferForm.name}
              onChange={(event) =>
                updateBankTransferForm({ name: event.target.value })
              }
              placeholder="회원 이름"
              className="rounded-xl border border-emerald-200/20 bg-black/20 px-3 py-2 text-xs text-emerald-50 outline-none placeholder:text-emerald-100/45 focus:border-emerald-200/40"
            />
            <input
              type="email"
              value={bankTransferForm.email}
              onChange={(event) =>
                updateBankTransferForm({ email: event.target.value })
              }
              placeholder="you@example.com"
              className="rounded-xl border border-emerald-200/20 bg-black/20 px-3 py-2 text-xs text-emerald-50 outline-none placeholder:text-emerald-100/45 focus:border-emerald-200/40"
            />
            <input
              type="text"
              value={bankTransferForm.depositorName}
              onChange={(event) =>
                updateBankTransferForm({ depositorName: event.target.value })
              }
              placeholder="입금자명"
              className="rounded-xl border border-emerald-200/20 bg-black/20 px-3 py-2 text-xs text-emerald-50 outline-none placeholder:text-emerald-100/45 focus:border-emerald-200/40"
            />
            <input
              type="tel"
              value={bankTransferForm.phone}
              onChange={(event) =>
                updateBankTransferForm({ phone: event.target.value })
              }
              placeholder="핸드폰 번호"
              className="rounded-xl border border-emerald-200/20 bg-black/20 px-3 py-2 text-xs text-emerald-50 outline-none placeholder:text-emerald-100/45 focus:border-emerald-200/40"
            />
            <input
              type="text"
              value={bankTransferForm.address}
              onChange={(event) =>
                updateBankTransferForm({ address: event.target.value })
              }
              placeholder="주소"
              className="rounded-xl border border-emerald-200/20 bg-black/20 px-3 py-2 text-xs text-emerald-50 outline-none placeholder:text-emerald-100/45 focus:border-emerald-200/40 md:col-span-2"
            />
            <div className="md:col-span-2">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setBankTransferProofFile(file);
                }}
                className="w-full rounded-xl border border-emerald-200/20 bg-black/20 px-3 py-2 text-xs text-emerald-50 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-200/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-50 hover:file:bg-emerald-200/30"
              />
              <p className="mt-1 text-[11px] text-emerald-100/80">
                {bankTransferProofFile
                  ? `첨부됨: ${bankTransferProofFile.name}`
                  : '이체 후 캡처 이미지를 첨부해 주세요.'}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-2">
          {STUDIO_MEMBERSHIP_PLAN_OPTIONS.map((plan) => {
            const isPayPalLoading =
              loadingState?.planKey === plan.key &&
              loadingState.method === 'paypal';
            const isBankLoading =
              loadingState?.planKey === plan.key &&
              loadingState.method === 'bank_transfer';
            const isScheduleLoading =
              loadingState?.planKey === plan.key &&
              loadingState.method === 'schedule_downgrade';
            const isDowngradeCandidate =
              Boolean(membershipSummary?.has_active_subscription) &&
              Boolean(currentPlanKey) &&
              isStudioMembershipTierDowngrade(currentPlanKey, plan.key);
            const prorationEstimate = membershipSummary?.has_active_subscription
              ? !isDowngradeCandidate && plan.billingCycle === 'monthly'
                ? getProrationEstimate({
                    currentAmount: currentPlanAmount,
                    targetAmount: plan.priceKrw,
                    remainingDays,
                    cycleDays
                  })
                : null
              : null;
            return (
              <div
                key={plan.key}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {plan.title}
                    </p>
                    <p className="mt-1 text-xs text-white/55">
                      {plan.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {formatStudioMembershipPriceKrw(
                        plan.priceKrw,
                        plan.billingCycle
                      )}
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-3 grid grid-cols-1 gap-2 ${!isDowngradeCandidate && plan.supportsPayPal ? 'sm:grid-cols-2' : ''}`}
                >
                  {isDowngradeCandidate ? (
                    <button
                      type="button"
                      onClick={() => void handleScheduleDowngrade(plan.key)}
                      disabled={Boolean(loadingState) || membershipLoading}
                      className="rounded-xl border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isScheduleLoading
                        ? '예약 저장 중...'
                        : '다음 결제일부터 변경 예약'}
                    </button>
                  ) : (
                    <>
                      {plan.supportsPayPal ? (
                        <button
                          type="button"
                          onClick={() => void handleSubscribe(plan.key)}
                          disabled={Boolean(loadingState) || membershipLoading}
                          className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isPayPalLoading
                            ? 'PayPal 이동 중...'
                            : 'PayPal 자동결제'}
                        </button>
                      ) : (
                        <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-center text-[11px] font-semibold text-white/65">
                          PayPal 자동결제 미지원 (계좌이체 전용)
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleBankTransfer(plan.key)}
                        disabled={
                          Boolean(loadingState) ||
                          membershipLoading ||
                          !bankTransferProofFile
                        }
                        className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isBankLoading ? '신청 저장 중...' : '계좌이체 신청'}
                      </button>
                    </>
                  )}
                </div>
                {isDowngradeCandidate ? (
                  <p className="mt-2 text-[11px] text-amber-100/85">
                    현재보다 낮은 멤버십은 다음 결제일(다음달)부터 적용되며,
                    지금 예약만 접수됩니다.
                  </p>
                ) : null}
                {prorationEstimate ? (
                  <p className="mt-2 text-[11px] text-white/55">
                    내부 계산 기준 차등 안내: 남은기간 크레딧{' '}
                    {formatKrw(prorationEstimate.currentCredit)} 반영 시 예상
                    추가금액 {formatKrw(prorationEstimate.dueNow)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {membershipChangeResult?.membershipChange ? (
          <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
            <p className="font-semibold">멤버십 변경 예약이 접수되었습니다.</p>
            <p className="mt-1 text-xs text-amber-100/90">
              변경 플랜: {membershipChangeResult.membershipChange.targetPlanTitle}
            </p>
            <p className="mt-1 text-xs text-amber-100/90">
              적용예정일:{' '}
              {formatDateLabel(membershipChangeResult.membershipChange.effectiveAt) ||
                '-'}
            </p>
            {membershipChangeResult.membershipChange.orderRef ? (
              <p className="mt-1 text-xs text-amber-100/90">
                요청번호: {membershipChangeResult.membershipChange.orderRef}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-amber-100/80">
              다운그레이드는 다음 결제일(다음달)부터 적용됩니다.
            </p>
          </div>
        ) : null}

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
                <p className="mt-1">
                  예금주: {bankTransferResult.bankTransfer.accountHolder}
                </p>
              </>
            ) : (
              <p className="mt-2">
                계좌 정보가 아직 설정되지 않았습니다. 관리자에게 계좌 정보를
                문의해 주세요.
              </p>
            )}
            {bankTransferResult.bankTransfer.orderRef ? (
              <p className="mt-1">
                주문 참조번호: {bankTransferResult.bankTransfer.orderRef}
              </p>
            ) : null}
            {bankTransferResult.bankTransfer.depositorName ? (
              <p className="mt-1">
                입금자명: {bankTransferResult.bankTransfer.depositorName}
              </p>
            ) : null}
            {bankTransferResult.bankTransfer.proofImageUrl ? (
              <p className="mt-1 text-xs text-emerald-200/90">
                이체인증:{' '}
                <a
                  href={bankTransferResult.bankTransfer.proofImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  이미지 보기
                </a>
              </p>
            ) : null}
            {bankTransferResult.bankTransfer.notice ? (
              <p className="mt-1 text-xs text-emerald-200/90">
                {bankTransferResult.bankTransfer.notice}
              </p>
            ) : null}
            {bankTransferResult.proration?.enabled ? (
              <p className="mt-1 text-xs text-emerald-200/90">
                차등 계산: 남은기간 크레딧{' '}
                {formatKrw(
                  Number(bankTransferResult.proration.current_credit_krw || 0)
                )}{' '}
                반영, 현재 청구금액{' '}
                {formatKrw(
                  Number(bankTransferResult.proration.due_now_krw || 0)
                )}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-emerald-200/90">
              입금 확인 후 관리자가 멤버십 이용 권한을 활성화합니다.
            </p>
          </div>
        ) : null}

        {!alwaysOpen ? (
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
        ) : null}
      </div>
      {error && <p className="text-sm text-rose-200">{error}</p>}
    </div>
  );
}

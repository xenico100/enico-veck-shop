'use client';

import { useState } from 'react';
import {
  STUDIO_MEMBERSHIP_PLAN_OPTIONS,
  formatStudioMembershipPriceKrw,
  type StudioMembershipPlanKey
} from '@/utils/studio-membership-plans';

type Props = {
  studioPostId: string;
  className?: string;
};

type CreateSubscriptionResponse = {
  approvalUrl?: string;
  message?: string;
};

export default function StudioSubscribeButton({ studioPostId, className }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingPlanKey, setLoadingPlanKey] = useState<StudioMembershipPlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planKey: StudioMembershipPlanKey) => {
    if (loadingPlanKey) return;

    setLoadingPlanKey(planKey);
    setError(null);

    try {
      const response = await fetch('/api/paypal/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioPostId, planKey })
      });

      const payload = (await response.json().catch(() => ({}))) as CreateSubscriptionResponse;

      if (response.status === 401) {
        window.location.assign('/signin');
        return;
      }

      if (!response.ok || typeof payload.approvalUrl !== 'string') {
        throw new Error(payload.message || 'PayPal 구독 요청을 시작하지 못했습니다.');
      }

      window.location.assign(payload.approvalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '구독 요청에 실패했습니다.');
      setLoadingPlanKey(null);
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
        <div className="mt-3 grid gap-2">
          {STUDIO_MEMBERSHIP_PLAN_OPTIONS.map((plan) => {
            const isLoading = loadingPlanKey === plan.key;
            return (
              <button
                key={plan.key}
                type="button"
                onClick={() => void handleSubscribe(plan.key)}
                disabled={Boolean(loadingPlanKey)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-white/25 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
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
                    {isLoading ? (
                      <p className="mt-1 text-[11px] text-white/55">PayPal로 이동 중...</p>
                    ) : (
                      <p className="mt-1 text-[11px] text-white/45">선택</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (loadingPlanKey) return;
              setPickerOpen(false);
            }}
            disabled={Boolean(loadingPlanKey)}
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

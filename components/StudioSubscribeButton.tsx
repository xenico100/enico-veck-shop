'use client';

import { useState } from 'react';

type Props = {
  studioPostId: string;
  className?: string;
};

type CreateSubscriptionResponse = {
  approvalUrl?: string;
  message?: string;
};

export default function StudioSubscribeButton({ studioPostId, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/paypal/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioPostId })
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
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ||
          'inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-70'
        }
      >
        {loading ? 'PayPal 결제창으로 이동 중...' : '멤버십 가입 (PayPal)'}
      </button>
      {error && <p className="text-sm text-rose-200">{error}</p>}
    </div>
  );
}

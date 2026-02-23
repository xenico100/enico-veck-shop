'use client';

import Button from '@/components/ui/Button/Button';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { createStripePortal } from '@/utils/stripe/server';
import Link from 'next/link';
import Card from '@/components/ui/Card/Card';
import { Tables } from '@/types_db';

type Subscription = Tables<'subscriptions'>;
type Price = Tables<'prices'>;
type Product = Tables<'products'>;

type SubscriptionWithPriceAndProduct = Subscription & {
  prices:
    | (Price & {
        products: Product | null;
      })
    | null;
};

interface Props {
  subscription: SubscriptionWithPriceAndProduct | null;
}

export default function CustomerPortalForm({ subscription }: Props) {
  const router = useRouter();
  const currentPath = usePathname();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subscriptionPrice =
    subscription &&
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: subscription?.prices?.currency!,
      minimumFractionDigits: 0
    }).format((subscription?.prices?.unit_amount || 0) / 100);

  const handleStripePortalRequest = async () => {
    setIsSubmitting(true);
    const redirectUrl = await createStripePortal(currentPath);
    setIsSubmitting(false);
    return router.push(redirectUrl);
  };

  return (
    <Card
      title="이용 플랜"
      description={
        subscription
          ? `현재 ${subscription?.prices?.products?.name} 플랜을 이용 중입니다.`
          : '현재 이용 중인 플랜이 없습니다.'
      }
      footer={
        <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="pb-4 sm:pb-0">Stripe에서 구독을 관리할 수 있습니다.</p>
          <Button
            variant="slim"
            onClick={handleStripePortalRequest}
            loading={isSubmitting}
          >
            고객 포털 열기
          </Button>
        </div>
      }
    >
      <div className="mt-8 mb-4 text-xl font-semibold">
        {subscription ? (
          `${subscriptionPrice}/${subscription?.prices?.interval}`
        ) : (
          <Link href="/">플랜 선택</Link>
        )}
      </div>
    </Card>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

type CheckoutItemPayload = {
  id: string;
  type: 'service';
  title: string;
  image?: string | null;
  price: number;
  currency?: string;
  quantity?: number;
};

const toOrigin = (request: NextRequest) => {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (configured) {
    return configured.startsWith('http') ? configured : `https://${configured}`;
  }
  return new URL(request.url).origin;
};

const buildStubUrl = (request: NextRequest) => {
  const origin = toOrigin(request).replace(/\/$/, '');
  const url = new URL(`${origin}/`);
  url.searchParams.set('status', 'Checkout 준비');
  url.searchParams.set('status_description', 'Stripe 키가 없어 임시 체크아웃으로 처리되었습니다.');
  return url.toString();
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { item?: Partial<CheckoutItemPayload> };
    const raw = body?.item;

    const item: CheckoutItemPayload | null = raw && typeof raw === 'object'
      ? {
          id: String(raw.id ?? '').trim(),
          type: 'service',
          title: String(raw.title ?? '').trim(),
          image: typeof raw.image === 'string' ? raw.image : null,
          price: Number(raw.price),
          currency: typeof raw.currency === 'string' && raw.currency ? raw.currency : 'KRW',
          quantity: Math.max(1, Math.floor(Number(raw.quantity ?? 1) || 1))
        }
      : null;

    if (!item || !item.id || !item.title || !Number.isFinite(item.price) || item.price <= 0) {
      return NextResponse.json(
        { message: '유효한 결제 항목 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY_LIVE ?? process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      return NextResponse.json({ url: buildStubUrl(request), mode: 'stub' });
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion
    });

    const origin = toOrigin(request).replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: item.quantity,
          price_data: {
            currency: item.currency.toLowerCase(),
            unit_amount: Math.round(item.price),
            product_data: {
              name: item.title,
              images: item.image ? [item.image] : undefined,
              metadata: {
                item_id: item.id,
                item_type: item.type
              }
            }
          }
        }
      ],
      success_url: `${origin}/?status=${encodeURIComponent('결제 준비 완료')}&status_description=${encodeURIComponent('Stripe 결제 페이지로 이동 후 결제를 완료해 주세요.')}`,
      cancel_url: `${origin}/?status=${encodeURIComponent('결제 취소')}&status_description=${encodeURIComponent('결제가 취소되었습니다.')}`
    });

    if (!session.url) {
      return NextResponse.json(
        { message: '체크아웃 URL 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url, mode: 'stripe' });
  } catch (error) {
    console.error('[checkout/create-session] error', error);
    return NextResponse.json(
      { message: '체크아웃 세션 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

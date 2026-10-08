import { NextResponse } from 'next/server';
import {
  APPAREL_FEED_URL,
  APPAREL_STORE_URL,
  parseApparelCatalog
} from '@/utils/apparel-catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch(APPAREL_FEED_URL, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
      redirect: 'error',
      signal: AbortSignal.timeout(8000)
    });
    if (
      !response.ok ||
      !response.headers.get('content-type')?.includes('application/json')
    ) {
      throw new Error('Apparel store unavailable');
    }
    const source = await response.json();
    const products = parseApparelCatalog(source);
    return NextResponse.json(
      {
        products,
        updatedAt:
          typeof source.updatedAt === 'string' &&
          Number.isFinite(Date.parse(source.updatedAt))
            ? source.updatedAt
            : new Date().toISOString(),
        sourceUrl: APPAREL_STORE_URL
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
        }
      }
    );
  } catch {
    return NextResponse.json(
      {
        message:
          '실물 상품 목록을 불러오지 못했어요. 다시 시도하거나 ENICO VECK 공식 스토어에서 확인해 주세요.',
        sourceUrl: APPAREL_STORE_URL
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

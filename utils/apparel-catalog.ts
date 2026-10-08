export const APPAREL_STORE_URL = 'https://enicoveck.com';
export const APPAREL_FEED_URL = `${APPAREL_STORE_URL}/api/storefront/products`;

export type ApparelProduct = {
  id: string;
  title: string;
  price: number;
  currency: 'KRW';
  images: string[];
  description: string;
  category: string;
  purchaseUrl: string;
};

function publicImage(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 3000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** The game consumes public product data; it never handles store credentials or orders. */
export function parseApparelCatalog(value: unknown): ApparelProduct[] {
  if (
    !value ||
    typeof value !== 'object' ||
    !('products' in value) ||
    !Array.isArray(value.products)
  ) {
    throw new Error('Invalid apparel catalog');
  }

  const products: ApparelProduct[] = [];
  const ids = new Set<string>();
  let validRows = 0;
  for (const row of value.products.slice(0, 100)) {
    if (
      !row ||
      typeof row !== 'object' ||
      typeof row.id !== 'string' ||
      !row.id.trim() ||
      row.id.length > 180 ||
      ids.has(row.id) ||
      typeof row.title !== 'string' ||
      !row.title.trim() ||
      typeof row.price !== 'number' ||
      !Number.isSafeInteger(row.price) ||
      row.price <= 0 ||
      row.currency !== 'KRW'
    )
      continue;

    validRows += 1;
    if (row.isSoldOut === true) continue;

    const purchaseUrl = new URL('/', APPAREL_STORE_URL);
    purchaseUrl.searchParams.set('product', row.id);
    const imageCandidates: Array<string | null> = Array.isArray(row.images)
      ? row.images.map(publicImage)
      : [];
    const images: string[] = imageCandidates.length
      ? Array.from(
          new Set(imageCandidates.filter((url): url is string => url !== null))
        ).slice(0, 8)
      : [];

    products.push({
      id: row.id,
      title: row.title.trim().slice(0, 240),
      price: row.price,
      currency: 'KRW',
      images,
      description:
        typeof row.description === 'string'
          ? row.description.slice(0, 6000)
          : '',
      category:
        typeof row.category === 'string'
          ? row.category.trim().slice(0, 60)
          : '실물 상품',
      purchaseUrl: purchaseUrl.href
    });
    ids.add(row.id);
  }
  if (value.products.length > 0 && validRows === 0) {
    throw new Error('No valid public apparel products');
  }
  return products;
}

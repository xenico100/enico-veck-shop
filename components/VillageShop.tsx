'use client';

import dynamic from 'next/dynamic';
import * as Tabs from '@radix-ui/react-tabs';
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  Package,
  RefreshCw,
  Shirt,
  ShoppingBag,
  Sparkles,
  Truck
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import styles from './VillageShop.module.css';

const OFFICIAL_STORE_URL = 'https://enicoveck.com';
const Services = dynamic(() => import('./ServicesSection'), {
  loading: () => (
    <p role="status">디지털 상품과 제작 의뢰를 불러오는 중이에요.</p>
  )
});

type ApparelProduct = {
  id: string;
  title: string;
  price: number;
  currency: string;
  images: string[];
  description: string;
  category: string;
  purchaseUrl: string;
};

type ApparelCatalog = {
  products: ApparelProduct[];
  updatedAt: string;
  sourceUrl: string;
};

function isOfficialStoreUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      ['enicoveck.com', 'www.enicoveck.com'].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port
    );
  } catch {
    return false;
  }
}

function readCatalog(value: unknown): ApparelCatalog {
  if (!value || typeof value !== 'object' || !('products' in value)) {
    throw new Error('Invalid apparel catalog');
  }
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.products)) {
    throw new Error('Invalid apparel catalog');
  }
  const ids = new Set<string>();
  const products = data.products.map((entry: unknown): ApparelProduct => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Invalid apparel product');
    }
    const product = entry as Record<string, unknown>;
    if (
      typeof product.id !== 'string' ||
      !product.id.trim() ||
      ids.has(product.id) ||
      typeof product.title !== 'string' ||
      !product.title.trim() ||
      typeof product.price !== 'number' ||
      !Number.isFinite(product.price) ||
      product.price < 0 ||
      typeof product.currency !== 'string' ||
      !/^[A-Z]{3}$/.test(product.currency) ||
      !Array.isArray(product.images) ||
      !product.images.every((image: unknown) => typeof image === 'string') ||
      typeof product.description !== 'string' ||
      typeof product.category !== 'string' ||
      !isOfficialStoreUrl(product.purchaseUrl)
    ) {
      throw new Error('Invalid apparel product');
    }
    ids.add(product.id);
    return {
      id: product.id,
      title: product.title.trim(),
      price: product.price,
      currency: product.currency,
      images: (product.images as string[]).filter((src) => {
        try {
          const url = new URL(src);
          return url.protocol === 'https:' && !url.username && !url.password;
        } catch {
          return false;
        }
      }),
      description: product.description.trim(),
      category: product.category.trim(),
      purchaseUrl: product.purchaseUrl
    };
  });
  return {
    products,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    sourceUrl: isOfficialStoreUrl(data.sourceUrl)
      ? data.sourceUrl
      : OFFICIAL_STORE_URL
  };
}

function formatPrice(product: ApparelProduct) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: product.currency,
    maximumFractionDigits: product.currency === 'KRW' ? 0 : 2
  }).format(product.price);
}

function ProductImage({
  src,
  title,
  compact = false,
  eager = false
}: {
  src?: string;
  title: string;
  compact?: boolean;
  eager?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  if (!src || failedSource === src) {
    return (
      <span className={styles.imageFallback}>
        <Shirt size={compact ? 22 : 40} aria-hidden="true" />
        {!compact && (
          <span>
            {src ? '이미지를 불러오지 못했어요' : '등록된 이미지가 없어요'}
          </span>
        )}
      </span>
    );
  }
  return (
    // Official product images are served from the catalog's original image hosts.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={title}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedSource(src)}
    />
  );
}

function StoreLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={compact ? styles.sourceLink : styles.secondaryLink}
      href={OFFICIAL_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      ENICO VECK 공식 스토어
      <ExternalLink size={16} aria-hidden="true" />
      <span className={styles.srOnly}> (새 탭)</span>
    </a>
  );
}

function ProductDetail({
  product,
  onBack
}: {
  product: ApparelProduct;
  onBack: () => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => {
    detailRef.current?.focus({ preventScroll: true });
    detailRef.current?.scrollIntoView({ block: 'start' });
  }, []);

  return (
    <section
      className={styles.detail}
      aria-labelledby="apparel-product-title"
      ref={detailRef}
      tabIndex={-1}
    >
      <button className={styles.backButton} onClick={onBack} type="button">
        <ArrowLeft size={18} aria-hidden="true" />
        실물 상품 진열대로
      </button>
      <div className={styles.detailGrid}>
        <div className={styles.gallery}>
          <figure className={styles.detailImage}>
            <ProductImage
              src={product.images[imageIndex]}
              title={`${product.title}${product.images.length > 1 ? ` · 사진 ${imageIndex + 1}` : ''}`}
              eager
            />
            {product.images.length > 1 && (
              <figcaption className={styles.imageCount} aria-live="polite">
                {imageIndex + 1} / {product.images.length}
              </figcaption>
            )}
          </figure>
          {product.images.length > 1 && (
            <div
              className={styles.thumbnails}
              role="group"
              aria-label="상품 사진 선택"
            >
              {product.images.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  className={styles.thumbnail}
                  type="button"
                  aria-label={`${product.title} 사진 ${index + 1}`}
                  aria-pressed={imageIndex === index}
                  onClick={() => setImageIndex(index)}
                >
                  <ProductImage src={src} title="" compact />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.detailInfo}>
          <div className={styles.detailLabels}>
            <span className={styles.physicalBadge}>
              <Shirt size={15} aria-hidden="true" />
              실물 상품
            </span>
            {product.category && <span>{product.category}</span>}
          </div>
          <h3 id="apparel-product-title">{product.title}</h3>
          <p className={styles.detailPrice}>{formatPrice(product)}</p>
          <div className={styles.description}>
            <h4>상품 설명</h4>
            <p>
              {product.description ||
                '소재와 크기 등 상세 정보는 공식 스토어의 상품 페이지에서 확인할 수 있어요.'}
            </p>
          </div>
          <div className={styles.orderNote}>
            <Truck size={20} aria-hidden="true" />
            <p>
              실제로 배송되는 상품이에요. 옵션·재고·배송비와 최종 결제 금액은
              ENICO VECK 공식 스토어에서 확인해 주세요.
            </p>
          </div>
          <a
            className={styles.purchaseLink}
            href={product.purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            공식 스토어에서 구매
            <ArrowUpRight size={20} aria-hidden="true" />
            <span className={styles.srOnly}> (새 탭)</span>
          </a>
          <p className={styles.purchaseHint}>
            실물 상품 주문과 결제는 공식 스토어에서 진행돼요.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function VillageShop({
  onOpenCart
}: {
  onOpenCart: () => void;
}) {
  const [catalog, setCatalog] = useState<ApparelCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApparelProduct | null>(null);
  const [tab, setTab] = useState('apparel');
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const restoreFocusId = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError(false);
    async function load() {
      try {
        const response = await fetch('/api/shop/apparel', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        });
        if (!response.ok) throw new Error('Apparel catalog unavailable');
        const data = readCatalog(await response.json());
        if (mounted) setCatalog(data);
      } catch {
        if (mounted) {
          setCatalog(null);
          setError(true);
        }
      } finally {
        window.clearTimeout(timeout);
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [attempt]);

  useEffect(() => {
    if (!selected && restoreFocusId.current) {
      cardRefs.current.get(restoreFocusId.current)?.focus();
      restoreFocusId.current = null;
    }
  }, [selected]);

  const products = catalog?.products ?? [];
  const categories = Array.from(
    new Set(products.map((product) => product.category).filter(Boolean))
  );
  const visibleProducts = products.filter(
    (product) => category === null || product.category === category
  );
  const updatedDate = catalog?.updatedAt ? new Date(catalog.updatedAt) : null;
  const updatedLabel =
    updatedDate && !Number.isNaN(updatedDate.getTime())
      ? new Intl.DateTimeFormat('ko-KR', {
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Seoul'
        }).format(updatedDate)
      : null;

  return (
    <section className={styles.shop} aria-label="단의 잡화점 상품">
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>DAN’S SHOP · 단의 잡화점</p>
          <h2>마음에 드는 것을 발견하는 곳</h2>
          <p className={styles.intro}>
            입을 옷부터 작은 창작물까지, 천천히 둘러보세요.
          </p>
        </div>
        <span className={styles.shopSign} aria-hidden="true">
          <Shirt size={28} />
          <span>
            ENICO
            <br />
            VECK
          </span>
        </span>
      </header>
      <Tabs.Root
        value={tab}
        activationMode="manual"
        onValueChange={(value) => {
          setTab(value);
          setSelected(null);
          restoreFocusId.current = null;
        }}
      >
        <Tabs.List className={styles.tabs} aria-label="잡화점 상품 종류">
          <Tabs.Trigger className={styles.tab} value="apparel">
            <Shirt size={18} aria-hidden="true" />
            의류·실물 굿즈
          </Tabs.Trigger>
          <Tabs.Trigger className={styles.tab} value="digital">
            <Sparkles size={18} aria-hidden="true" />
            디지털·제작 의뢰
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content className={styles.panel} value="apparel">
          {selected ? (
            <ProductDetail
              key={selected.id}
              product={selected}
              onBack={() => {
                restoreFocusId.current = selected.id;
                setSelected(null);
              }}
            />
          ) : (
            <>
              <div className={styles.deliveryNotice}>
                <Truck size={21} aria-hidden="true" />
                <p>
                  <strong>실제로 배송되는 ENICO VECK 상품</strong>
                  <span>상품 옵션 선택과 결제는 공식 스토어에서 진행돼요.</span>
                </p>
                <StoreLink compact />
              </div>
              {loading ? (
                <div
                  className={styles.emptyState}
                  role="status"
                  aria-live="polite"
                >
                  <Package size={38} aria-hidden="true" />
                  <h3>단이 물건을 진열하고 있어요.</h3>
                  <p>공식 스토어의 상품 정보를 불러오는 중이에요.</p>
                </div>
              ) : error ? (
                <div className={styles.emptyState}>
                  <Shirt size={38} aria-hidden="true" />
                  <div role="alert">
                    <h3>상품 진열 정보를 불러오지 못했어요.</h3>
                    <p>다시 시도하거나 공식 스토어에서 상품을 확인해 주세요.</p>
                  </div>
                  <div className={styles.stateActions}>
                    <button
                      className={styles.retryButton}
                      type="button"
                      onClick={() => setAttempt((value) => value + 1)}
                    >
                      <RefreshCw size={17} aria-hidden="true" />
                      다시 불러오기
                    </button>
                    <StoreLink />
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className={styles.emptyState}>
                  <Shirt size={38} aria-hidden="true" />
                  <h3>현재 진열 중인 실물 상품이 없어요.</h3>
                  <p>공식 스토어에서도 판매 중인 상품을 확인할 수 있어요.</p>
                  <StoreLink />
                </div>
              ) : (
                <>
                  <div className={styles.catalogTools}>
                    <h3>단의 실물 상품 진열대</h3>
                    <span role="status" aria-live="polite">
                      {visibleProducts.length}개 상품
                    </span>
                  </div>
                  {categories.length > 0 && (
                    <div
                      className={styles.filters}
                      role="group"
                      aria-label="실물 상품 분류"
                    >
                      {[null, ...categories].map((item) => (
                        <button
                          key={item ?? '__all'}
                          type="button"
                          aria-pressed={category === item}
                          onClick={() => setCategory(item)}
                        >
                          {item ?? '전체 상품'}
                        </button>
                      ))}
                    </div>
                  )}
                  {visibleProducts.length === 0 && (
                    <p className={styles.filterEmpty} role="status">
                      이 분류에 진열된 상품이 없어요. 다른 분류를 선택해 주세요.
                    </p>
                  )}
                  <ul className={styles.productGrid}>
                    {visibleProducts.map((product, index) => (
                      <li key={product.id}>
                        <button
                          className={styles.productCard}
                          type="button"
                          ref={(node) => {
                            if (node) cardRefs.current.set(product.id, node);
                            else cardRefs.current.delete(product.id);
                          }}
                          aria-label={`${product.title}, ${formatPrice(product)}, 실물 상품 자세히 보기`}
                          onClick={() => setSelected(product)}
                        >
                          <span className={styles.cardImage}>
                            <ProductImage
                              src={product.images[0]}
                              title={product.title}
                            />
                            <span className={styles.imageBadge}>실물 상품</span>
                          </span>
                          <span className={styles.cardInfo}>
                            <span className={styles.cardCategory}>
                              {String(index + 1).padStart(2, '0')}
                              {product.category
                                ? ` / ${product.category}`
                                : ' / ENICO VECK'}
                            </span>
                            <span className={styles.cardTitle}>
                              {product.title}
                            </span>
                            <strong className={styles.cardPrice}>
                              {formatPrice(product)}
                            </strong>
                            <span className={styles.inspectLabel}>
                              자세히 보기
                              <ArrowUpRight size={17} aria-hidden="true" />
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <footer className={styles.catalogFooter}>
                    <a
                      href={catalog?.sourceUrl ?? OFFICIAL_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      상품 정보 · ENICO VECK
                      <ExternalLink size={13} aria-hidden="true" />
                      <span className={styles.srOnly}> (새 탭)</span>
                    </a>
                    {updatedLabel && (
                      <span>{updatedLabel} 확인 · 한국 시간</span>
                    )}
                    <p>
                      가격과 재고는 변경될 수 있어요. 주문 전 공식 스토어에서
                      최종 정보를 확인해 주세요.
                    </p>
                  </footer>
                </>
              )}
            </>
          )}
        </Tabs.Content>
        <Tabs.Content className={styles.panel} value="digital">
          <div className={styles.digitalNotice}>
            <div>
              <h3>디지털 상품·제작 의뢰</h3>
              <p>
                각 상품의 파일 제공 방식과 제작 범위는 상세 안내에서 확인해
                주세요.
              </p>
            </div>
            <button
              className={styles.retryButton}
              onClick={onOpenCart}
              type="button"
            >
              <ShoppingBag size={18} aria-hidden="true" />
              디지털·제작 장바구니
            </button>
          </div>
          <Services
            mode="modal"
            game
            onOpenCart={onOpenCart}
            sectionId="village-goods"
          />
        </Tabs.Content>
      </Tabs.Root>
    </section>
  );
}

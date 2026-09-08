'use client';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Film,
  Plus,
  RefreshCw,
  Shirt,
  ScanEye
} from 'lucide-react';
import styles from './VillageAdventure.module.css';
type Item = {
  id: string;
  title: string;
  image?: string | null;
  subtitle?: string;
  category?: string | null;
};
export default function VillageExhibit({
  items,
  kind,
  loading,
  error,
  onInspect,
  onCreate,
  onRetry
}: {
  items: Item[];
  kind: 'goods' | 'studio';
  loading: boolean;
  error: string | null;
  onInspect: (id: string) => void;
  onCreate?: () => void;
  onRetry: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [category, setCategory] = useState('all');
  const [broken, setBroken] = useState<string[]>([]);
  const categories = Array.from(
    new Set(items.map((i) => i.category).filter((c): c is string => Boolean(c)))
  );
  const filtered = items.filter(
    (i) => category === 'all' || i.category === category
  );
  const current = Math.min(index, Math.max(0, filtered.length - 1));
  const item = filtered[current];
  return (
    <section className={styles.exhibit}>
      <header className={styles.exhibitTools}>
        <h2>{kind === 'goods' ? '단의 진열대' : '루의 상영실'}</h2>
        <div className={styles.actions}>
          {categories.length > 1 && (
            <select
              aria-label="전시 분류"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setIndex(0);
              }}
            >
              <option value="all">모든 작품</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
          {onCreate && (
            <button
              className={styles.icon}
              title={kind === 'goods' ? '상품 등록' : '작품 등록'}
              aria-label={kind === 'goods' ? '상품 등록' : '작품 등록'}
              onClick={onCreate}
            >
              <Plus size={19} />
            </button>
          )}
          <button
            className={styles.icon}
            title="새로고침"
            aria-label="전시 새로고침"
            onClick={onRetry}
            disabled={loading}
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className={styles.empty} role="status">
          {kind === 'goods'
            ? '단이 물건을 가져오는 중...'
            : '루가 필름을 찾는 중...'}
        </div>
      ) : !item ? (
        <div className={styles.empty}>
          {kind === 'goods' ? <Shirt size={62} /> : <Film size={62} />}
          <h3>
            {kind === 'goods'
              ? '다음 물건을 기다리는 진열대'
              : '아직 불이 켜지지 않은 스크린'}
          </h3>
          <p>
            {kind === 'goods'
              ? '현재 공개된 상품이 없어요. 단은 다음 물건의 마감을 살피는 중이에요.'
              : '현재 공개된 작품이 없어요. 루는 다음 상영을 준비하고 있어요.'}
          </p>
        </div>
      ) : (
        <>
          <div className={styles.objectStage}>
            <button
              className={styles.icon}
              aria-label="이전 전시물"
              disabled={current === 0}
              onClick={() => setIndex(current - 1)}
            >
              <ArrowLeft size={18} />
            </button>
            <figure>
              {item.image && !broken.includes(item.id) ? (
                <img
                  src={item.image}
                  alt={item.title}
                  onError={() => setBroken([...broken, item.id])}
                />
              ) : kind === 'goods' ? (
                <Shirt aria-label="상품 이미지 미등록" />
              ) : (
                <Film aria-label="작품 이미지 미등록" />
              )}
            </figure>
            <button
              className={styles.icon}
              aria-label="다음 전시물"
              disabled={current === filtered.length - 1}
              onClick={() => setIndex(current + 1)}
            >
              <ArrowRight size={18} />
            </button>
          </div>
          <div className={styles.objectInfo}>
            <div>
              <small>
                NO. {String(current + 1).padStart(2, '0')} / {filtered.length}
                {item.category ? ` · ${item.category}` : ''}
              </small>
              <h3>{item.title}</h3>
              {item.subtitle && <p>{item.subtitle}</p>}
            </div>
            <button
              className={styles.primary}
              onClick={() => onInspect(item.id)}
            >
              <ScanEye size={18} />
              {kind === 'goods' ? '자세히 살펴보기' : '작품 감상하기'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

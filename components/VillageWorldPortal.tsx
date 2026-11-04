'use client';

import { getVillageWorldPortal } from '@/utils/village-world-portal';
import styles from './VillageWorldPortal.module.css';

export default function VillageWorldPortal({
  width,
  active,
  transitioning,
  onTravel
}: {
  width: number;
  active: boolean;
  transitioning: boolean;
  onTravel: () => void;
}) {
  const portal = getVillageWorldPortal(width);

  return (
    <button
      type="button"
      data-avatar-ui="true"
      data-world-portal="true"
      data-active={active}
      data-transitioning={transitioning}
      className={styles.portal}
      style={{ left: portal.x - 36, top: portal.y - 106 }}
      aria-label="WORLD 포탈로 이동"
      disabled={transitioning}
      onClick={onTravel}
    >
      <span className={styles.sign}>WORLD</span>
      <svg
        className={styles.art}
        viewBox="0 0 72 112"
        shapeRendering="crispEdges"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M8 104h56v6H8z" fill="#638575" opacity=".45" />
        <path d="M16 28h8v-8h24v8h8v72H16z" fill="#344854" />
        <path d="M12 28h8v-8h8v-8h16v8h8v8h8v72H12z" fill="#738c9b" />
        <path d="M12 28h8v-8h8v-8h16v4H28v8h-8v8h-4v64h-4z" fill="#c1d4cf" />
        <path d="M48 24h4v8h8v68h-8V36h-4z" fill="#4e6579" />
        <path d="M24 32h8v-8h8v8h8v68H24z" fill="#1a263b" />
        <path d="M28 36h8v-8h4v8h4v64H28z" fill="#413b72" />
        <path d="M28 42h16v54H28z" fill="#776da4" opacity=".38" />
        <g opacity=".65">
          <path
            d="M32 44h8v4h-8zM28 58h16v4H28zM32 76h8v4h-8zM28 90h16v4H28z"
            fill="#b1d9e0"
          />
          <path d="M36 50h4v4h-4zM28 68h4v4h-4zM40 84h4v4h-4z" fill="#e8dba5" />
        </g>
        <path
          d="M12 44h8v4h-8zM52 44h8v4h-8zM12 72h8v4h-8zM52 72h8v4h-8z"
          fill="#526b7c"
        />
        <path d="M8 100h56v8H8z" fill="#526b70" />
        <path d="M8 100h56v3H8zM12 103h48v3H12z" fill="#bbcec0" />
        <path d="M22 103h28v3H22z" fill="#d4d5ac" />
      </svg>
      <span className={styles.glow} aria-hidden="true" />
      <span className={styles.description}>밤 산책</span>
      <span className={styles.hint} aria-hidden="true">
        {transitioning ? '이동 중…' : active ? '걸어서 입장' : '입구로 이동'}
      </span>
    </button>
  );
}

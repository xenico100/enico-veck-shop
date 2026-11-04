'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './WorldPortalLoading.module.css';

export default function WorldPortalLoading({
  onCancel
}: {
  onCancel?: () => void;
}) {
  const canCancel = Boolean(onCancel);
  const [mounted, setMounted] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setShowCancel(false);
    if (!canCancel) return;
    const timer = window.setTimeout(() => setShowCancel(true), 10000);
    return () => window.clearTimeout(timer);
  }, [canCancel]);

  const content = (
    <div
      className={styles.overlay}
      data-avatar-ui="true"
      data-world-portal-loading="true"
    >
      <div className={styles.card}>
        <div className={styles.gateway} aria-hidden="true">
          <svg
            viewBox="0 0 96 96"
            shapeRendering="crispEdges"
            focusable="false"
          >
            <path d="M12 84h72v8H12z" fill="#101420" />
            <path d="M24 32h8V20h8v-8h16v8h8v12h8v52H24z" fill="#677287" />
            <path
              d="M24 32h8V20h8v-8h16v4H40v8h-8v12h-4v48h-4z"
              fill="#a9b6bc"
            />
            <path d="M64 32h8v52h-8zM56 20h8v12h-8z" fill="#353b55" />
            <path d="M36 36h8V24h8v12h8v48H36z" fill="#27293f" />
            <path d="M40 40h16v44H40z" fill="#5a507c" />
            <path
              d="M44 32h8v8h-8zM40 52h16v4H40zM44 68h8v4h-8z"
              fill="#bac9dd"
            />
            <path d="M20 84h56v4H20z" fill="#b3b3ad" />
            <path d="M36 84h24v4H36z" fill="#e3ce94" />
            <path
              d="M12 28h4v4h-4zM80 12h4v4h-4zM76 60h4v4h-4z"
              fill="#d7bd83"
            />
          </svg>
        </div>
        <div
          role="status"
          aria-label="WORLD 이동 중"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className={styles.eyebrow}>WORLD · 몽상인</p>
          <h2 className={styles.title}>밤 산책을 준비하고 있어요</h2>
          <p className={styles.description}>
            불빛을 따라 잠시만 기다려 주세요.
          </p>
          <div className={styles.track} aria-hidden="true">
            <span />
          </div>
          <p className={styles.loadingText} aria-hidden="true">
            NOW LOADING<span>…</span>
          </p>
        </div>
        {canCancel && showCancel ? (
          <button type="button" className={styles.cancel} onClick={onCancel}>
            마을에 머무르기
          </button>
        ) : null}
      </div>
    </div>
  );

  return mounted ? createPortal(content, document.body) : content;
}

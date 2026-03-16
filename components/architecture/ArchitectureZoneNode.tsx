'use client';

import type { CSSProperties } from 'react';
import type { NodeProps } from '@xyflow/react';

import {
  getAccentMeta,
  type ArchitectureZoneNode
} from '@/components/architecture/graph-types';
import styles from '@/components/architecture/ArchitectureGraph.module.css';

export default function ArchitectureZoneNode({
  data
}: NodeProps<ArchitectureZoneNode>) {
  const accent = getAccentMeta(data.accent);
  const cssVars = {
    '--accent': accent.color,
    '--accent-soft': accent.soft
  } as CSSProperties;

  return (
    <div className={styles.zone} style={cssVars}>
      <div className={styles.zoneBody}>
        <div className={styles.zoneKicker}>{accent.label}</div>
        <h4 className={styles.zoneTitle}>{data.title}</h4>
        <p className={styles.zoneSubtitle}>{data.subtitle}</p>
      </div>
    </div>
  );
}

'use client';

import type { CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import {
  getAccentMeta,
  type ArchitectureSystemNode
} from '@/components/architecture/graph-types';
import styles from '@/components/architecture/ArchitectureGraph.module.css';

const handleOffsets = {
  leftTarget: { top: '38%' },
  leftSource: { top: '62%' },
  rightTarget: { top: '38%' },
  rightSource: { top: '62%' },
  topTarget: { left: '38%' },
  topSource: { left: '62%' },
  bottomTarget: { left: '38%' },
  bottomSource: { left: '62%' }
} as const;

export default function ArchitectureNode({
  data
}: NodeProps<ArchitectureSystemNode>) {
  const accent = getAccentMeta(data.accent);
  const cssVars = {
    '--accent': accent.color,
    '--accent-soft': accent.soft,
    '--accent-glow': accent.glow
  } as CSSProperties;

  return (
    <div className={styles.node} style={cssVars}>
      <Handle
        id="left-target"
        type="target"
        position={Position.Left}
        isConnectable={false}
        className={styles.handle}
        style={handleOffsets.leftTarget}
      />
      <Handle
        id="left-source"
        type="source"
        position={Position.Left}
        isConnectable={false}
        className={styles.handle}
        style={handleOffsets.leftSource}
      />
      <Handle
        id="right-target"
        type="target"
        position={Position.Right}
        isConnectable={false}
        className={styles.handle}
        style={handleOffsets.rightTarget}
      />
      <Handle
        id="right-source"
        type="source"
        position={Position.Right}
        isConnectable={false}
        className={styles.handle}
        style={handleOffsets.rightSource}
      />
      <Handle
        id="top-target"
        type="target"
        position={Position.Top}
        isConnectable={false}
        className={styles.handle}
        style={handleOffsets.topTarget}
      />
      <Handle
        id="top-source"
        type="source"
        position={Position.Top}
        isConnectable={false}
        className={styles.handle}
        style={handleOffsets.topSource}
      />
      <Handle
        id="bottom-target"
        type="target"
        position={Position.Bottom}
        isConnectable={false}
        className={styles.handle}
        style={handleOffsets.bottomTarget}
      />
      <Handle
        id="bottom-source"
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className={styles.handle}
        style={handleOffsets.bottomSource}
      />

      <div className={styles.nodeHeader}>
        <span className={styles.kindTag}>{accent.label}</span>
        {data.status ? <span className={styles.statusTag}>{data.status}</span> : null}
      </div>

      <div className={styles.nodeBody}>
        <div className={styles.subtitle}>{data.subtitle}</div>
        <h4 className={styles.nodeTitle}>{data.title}</h4>
        {data.path ? <div className={styles.path}>{data.path}</div> : null}
        {data.detail ? <p className={styles.detail}>{data.detail}</p> : null}
      </div>
    </div>
  );
}

'use client';

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps
} from '@xyflow/react';

import {
  getAccentMeta,
  type ArchitectureGraphEdge
} from '@/components/architecture/graph-types';
import styles from '@/components/architecture/ArchitectureGraph.module.css';

export default function ArchitectureEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd
}: EdgeProps<ArchitectureGraphEdge>) {
  const flow = data?.flow ?? 'runtime';
  const accent = getAccentMeta(flow);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
    offset: 24
  });

  const strokeDasharray =
    flow === 'admin' ? '6 5' : flow === 'source' ? '4 7' : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: accent.color,
          strokeWidth: 1.9,
          strokeDasharray,
          filter: `drop-shadow(0 0 8px ${accent.glow})`
        }}
      />

      {data?.label ? (
        <EdgeLabelRenderer>
          <div
            className={styles.edgeLabel}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              borderColor: accent.soft,
              color: accent.color
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

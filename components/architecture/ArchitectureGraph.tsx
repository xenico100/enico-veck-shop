'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  type EdgeTypes,
  type NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { cn } from '@/utils/cn';
import ArchitectureEdge from '@/components/architecture/ArchitectureEdge';
import styles from '@/components/architecture/ArchitectureGraph.module.css';
import ArchitectureNode from '@/components/architecture/ArchitectureNode';
import ArchitectureZoneNode from '@/components/architecture/ArchitectureZoneNode';
import { architectureEdges, architectureNodes } from '@/components/architecture/architecture-data';
import { getAccentMeta, type ArchitectureAccent } from '@/components/architecture/graph-types';

const nodeTypes = {
  architectureNode: ArchitectureNode,
  architectureZone: ArchitectureZoneNode
} satisfies NodeTypes;

const edgeTypes = {
  architectureEdge: ArchitectureEdge
} satisfies EdgeTypes;

const legendItems: Array<{
  key: ArchitectureAccent;
  label: string;
}> = [
  { key: 'runtime', label: 'Deployment / Runtime' },
  { key: 'data', label: 'Data Flow' },
  { key: 'image', label: 'Image Flow' },
  { key: 'admin', label: 'Admin Flow' },
  { key: 'source', label: 'Source Structure' }
];

type ArchitectureGraphProps = {
  variant?: 'compact' | 'full';
  className?: string;
};

function Legend() {
  return (
    <div className={styles.legend}>
      {legendItems.map((item) => {
        const accent = getAccentMeta(item.key);

        return (
          <div key={item.key} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ color: accent.color, backgroundColor: accent.color }}
            />
            {item.label}
          </div>
        );
      })}
    </div>
  );
}

export default function ArchitectureGraph({
  variant = 'full',
  className
}: ArchitectureGraphProps) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        styles.shell,
        isCompact ? styles.shellCompact : styles.shellFull,
        className
      )}
    >
      <div className={styles.topBar}>
        <div>
          <p className={styles.kicker}>Repo-Derived Node Graph</p>
          <h3 className={styles.title}>real_enico 웹사이트 아키텍처 맵</h3>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaChip}>React Flow UI</span>
          <span className={styles.metaChip}>README + source paths</span>
          <span className={styles.metaChip}>보수적 추론 태그 포함</span>
        </div>
      </div>

      <div className={cn(styles.frame, isCompact ? styles.frameCompact : styles.frameFull)}>
        <div className={styles.canvas}>
          <ReactFlow
            nodes={architectureNodes}
            edges={architectureEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            colorMode="dark"
            fitView
            fitViewOptions={{
              padding: isCompact ? 0.08 : 0.12,
              maxZoom: 1.1
            }}
            minZoom={0.2}
            maxZoom={1.6}
            nodesConnectable={false}
            nodesDraggable={!isCompact}
            elementsSelectable={!isCompact}
            panOnDrag
            panOnScroll
            zoomOnDoubleClick={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              id="architecture-lines"
              variant={BackgroundVariant.Lines}
              gap={28}
              size={1}
              color="rgba(104, 156, 255, 0.08)"
            />
            <Background
              id="architecture-dots"
              variant={BackgroundVariant.Dots}
              gap={14}
              size={1}
              color="rgba(110, 232, 255, 0.08)"
            />

            <Panel position="top-right">
              <Legend />
            </Panel>

            <Panel position="bottom-left">
              <div className={styles.helpPanel}>
                {isCompact ? 'Scroll / drag to inspect nodes' : 'Pan / zoom / drag nodes'}
              </div>
            </Panel>

            {!isCompact ? (
              <MiniMap
                pannable
                zoomable
                nodeColor={(node) =>
                  getAccentMeta(
                    ((node.data as { accent?: ArchitectureAccent } | undefined)?.accent ??
                      'source') as ArchitectureAccent
                  ).color
                }
                maskColor="rgba(2, 6, 12, 0.78)"
              />
            ) : null}

            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

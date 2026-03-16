import type { Edge, Node } from '@xyflow/react';

export type ArchitectureAccent =
  | 'runtime'
  | 'data'
  | 'image'
  | 'admin'
  | 'source'
  | 'neutral';

export type ArchitectureFlowKind =
  | 'runtime'
  | 'data'
  | 'image'
  | 'admin'
  | 'source';

export type ArchitectureSystemNodeData = {
  title: string;
  subtitle: string;
  path?: string;
  detail?: string;
  accent: ArchitectureAccent;
  status?: '실제 코드' | '보수적 추론';
};

export type ArchitectureZoneNodeData = {
  title: string;
  subtitle: string;
  accent: ArchitectureAccent;
};

export type ArchitectureGraphEdgeData = {
  label: string;
  flow: ArchitectureFlowKind;
};

export type ArchitectureSystemNode = Node<
  ArchitectureSystemNodeData,
  'architectureNode'
>;
export type ArchitectureZoneNode = Node<
  ArchitectureZoneNodeData,
  'architectureZone'
>;
export type ArchitectureGraphNode = ArchitectureSystemNode | ArchitectureZoneNode;
export type ArchitectureGraphEdge = Edge<
  ArchitectureGraphEdgeData,
  'architectureEdge'
>;

export const ACCENT_META: Record<
  ArchitectureAccent,
  {
    color: string;
    soft: string;
    glow: string;
    label: string;
  }
> = {
  runtime: {
    color: '#66e7ff',
    soft: 'rgba(102, 231, 255, 0.12)',
    glow: 'rgba(102, 231, 255, 0.28)',
    label: 'Runtime'
  },
  data: {
    color: '#8eff78',
    soft: 'rgba(142, 255, 120, 0.12)',
    glow: 'rgba(142, 255, 120, 0.28)',
    label: 'Data'
  },
  image: {
    color: '#39a7ff',
    soft: 'rgba(57, 167, 255, 0.13)',
    glow: 'rgba(57, 167, 255, 0.28)',
    label: 'Image'
  },
  admin: {
    color: '#ffbf63',
    soft: 'rgba(255, 191, 99, 0.12)',
    glow: 'rgba(255, 191, 99, 0.24)',
    label: 'Admin'
  },
  source: {
    color: '#a7b6d2',
    soft: 'rgba(167, 182, 210, 0.12)',
    glow: 'rgba(167, 182, 210, 0.2)',
    label: 'Source'
  },
  neutral: {
    color: '#d8e0f4',
    soft: 'rgba(216, 224, 244, 0.12)',
    glow: 'rgba(216, 224, 244, 0.18)',
    label: 'Neutral'
  }
};

export function getAccentMeta(accent: ArchitectureAccent) {
  return ACCENT_META[accent];
}

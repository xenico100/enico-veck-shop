'use client';

import { useState } from 'react';

import {
  BOARD,
  BoardMark,
  toneColor,
  type BoardMarkVariant,
  type BoardTone
} from '@/components/dark-node/board-theme';

type Phase = 'digital' | 'archive' | 'physical' | 'ecommerce';

type PhaseTone = Record<Phase, BoardTone>;

type ProdNode = {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  mark: BoardMarkVariant;
  phase: Phase;
};

type ProdConnection = {
  color: Phase;
  label?: string;
  dashed?: boolean;
  waypoints: [number, number][];
};

const PHASE_TONES: PhaseTone = {
  digital: 'ink',
  archive: 'wood',
  physical: 'rust',
  ecommerce: 'gold'
};

export const PROD_SVG_WIDTH = 1360;
export const PROD_SVG_HEIGHT = 820;

export function ProductionDiagram() {
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const [hoverConn, setHoverConn] = useState<number | null>(null);

  const nodes: ProdNode[] = [
    { id: 'pattern', label: '패턴 제작', sublabel: 'Pattern Drafting', x: 30, y: 55, w: 170, h: 90, mark: 'loom', phase: 'digital' },
    { id: 'clo3d-sample', label: 'CLO3D 가상 샘플', sublabel: 'Virtual Prototype', x: 240, y: 55, w: 185, h: 90, mark: 'branch', phase: 'digital' },
    { id: 'fabric-texture', label: '원단 텍스쳐 적용', sublabel: 'Fabric Texture Map', x: 465, y: 55, w: 185, h: 90, mark: 'loom', phase: 'digital' },
    { id: 'digital-sample-2', label: '2차 디지털 샘플', sublabel: 'Digital Review v2', x: 690, y: 55, w: 180, h: 90, mark: 'branch', phase: 'digital' },
    { id: 'bom', label: 'BOM 야드수 측정', sublabel: 'Bill of Materials', x: 910, y: 55, w: 180, h: 90, mark: 'ledger', phase: 'digital' },
    { id: 'closet-techpack', label: 'CLO-SET 테크팩', sublabel: 'Tech Pack Export', x: 1135, y: 55, w: 180, h: 90, mark: 'ledger', phase: 'digital' },
    { id: 'material-archive', label: '부자재 아카이브', sublabel: 'Materials Archive DB', x: 80, y: 270, w: 195, h: 90, mark: 'ledger', phase: 'archive' },
    { id: 'digital-archive', label: '디지털 패션 아카이브', sublabel: 'Digital Fashion Archive', x: 350, y: 270, w: 210, h: 90, mark: 'grid', phase: 'archive' },
    { id: 'clo-size-data', label: 'CLO 사이즈 데이터', sublabel: 'CLO Size Data v1', x: 640, y: 270, w: 195, h: 90, mark: 'ledger', phase: 'archive' },
    { id: 'real-measure', label: '실물 실측 저장', sublabel: 'Physical Measure v2', x: 920, y: 270, w: 185, h: 90, mark: 'ledger', phase: 'archive' },
    { id: 'seam-notch', label: '시접 / 너치 추가', sublabel: 'Seam & Notch', x: 30, y: 480, w: 180, h: 90, mark: 'seal', phase: 'physical' },
    { id: 'print-layout', label: 'Print Layout / 마카', sublabel: 'Marker Layout', x: 260, y: 480, w: 185, h: 90, mark: 'grid', phase: 'physical' },
    { id: 'pattern-print', label: '실물 패턴 출력', sublabel: 'Pattern Print', x: 495, y: 480, w: 175, h: 90, mark: 'seal', phase: 'physical' },
    { id: 'material-order', label: '원단/부자재 발주', sublabel: 'Fabric & Trim Order', x: 720, y: 480, w: 185, h: 90, mark: 'cart', phase: 'physical' },
    { id: 'handmade', label: '핸드메이드 실물 제작', sublabel: 'Handmade Production', x: 955, y: 480, w: 200, h: 90, mark: 'loom', phase: 'physical' },
    { id: 'clo3d-flat', label: 'CLO3D 3D 도식화', sublabel: '3D Technical Drawing', x: 200, y: 690, w: 190, h: 90, mark: 'branch', phase: 'ecommerce' },
    { id: 'size-chart', label: '사이즈표 기재', sublabel: 'Size Chart Spec', x: 470, y: 690, w: 175, h: 90, mark: 'ledger', phase: 'ecommerce' },
    { id: 'upload-auto', label: 'enicoveck.com 업로드', sublabel: 'Upload Automation', x: 725, y: 690, w: 210, h: 90, mark: 'hall', phase: 'ecommerce' },
    { id: 'product-complete', label: '상품등록 완료', sublabel: 'Product Live', x: 1015, y: 690, w: 175, h: 90, mark: 'seal', phase: 'ecommerce' }
  ];

  const nd = (id: string) => nodes.find((node) => node.id === id)!;
  const r = (id: string): [number, number] => {
    const n = nd(id);
    return [n.x + n.w, n.y + n.h / 2];
  };
  const l = (id: string): [number, number] => {
    const n = nd(id);
    return [n.x, n.y + n.h / 2];
  };
  const b = (id: string): [number, number] => {
    const n = nd(id);
    return [n.x + n.w / 2, n.y + n.h];
  };
  const t = (id: string): [number, number] => {
    const n = nd(id);
    return [n.x + n.w / 2, n.y];
  };

  const connections: ProdConnection[] = [
    { color: 'digital', waypoints: [r('pattern'), l('clo3d-sample')] },
    { color: 'digital', waypoints: [r('clo3d-sample'), l('fabric-texture')] },
    { color: 'digital', waypoints: [r('fabric-texture'), l('digital-sample-2')] },
    { color: 'digital', waypoints: [r('digital-sample-2'), l('bom')] },
    { color: 'digital', waypoints: [r('bom'), l('closet-techpack')] },
    { color: 'archive', label: '부자재 데이터', waypoints: [b('closet-techpack'), [1225, 200], [178, 200], [178, 270]] },
    { color: 'archive', label: '디지털 아카이브', waypoints: [b('closet-techpack'), [1225, 220], [455, 220], [455, 270]] },
    { color: 'archive', dashed: true, label: '사이즈 데이터', waypoints: [b('clo3d-sample'), [333, 195], [738, 195], [738, 270]] },
    { color: 'archive', dashed: true, waypoints: [b('material-archive'), [178, 420], [120, 420], [120, 480]] },
    { color: 'archive', dashed: true, waypoints: [b('digital-archive'), [455, 420], [353, 420], [353, 480]] },
    { color: 'archive', dashed: true, label: '부자재 참조', waypoints: [b('material-archive'), [178, 435], [813, 435], [813, 480]] },
    { color: 'physical', waypoints: [r('seam-notch'), l('print-layout')] },
    { color: 'physical', waypoints: [r('print-layout'), l('pattern-print')] },
    { color: 'physical', waypoints: [r('pattern-print'), l('material-order')] },
    { color: 'physical', waypoints: [r('material-order'), l('handmade')] },
    { color: 'archive', label: '실측 데이터', waypoints: [t('handmade'), [1055, 420], [1013, 420], [1013, 360]] },
    { color: 'ecommerce', label: '3D 데이터', waypoints: [b('clo-size-data'), [738, 630], [295, 630], [295, 690]] },
    { color: 'ecommerce', label: '실측 -> 사이즈표', waypoints: [b('real-measure'), [1013, 645], [558, 645], [558, 690]] },
    { color: 'archive', dashed: true, waypoints: [b('digital-archive'), [455, 395], [260, 395], [260, 630], [260, 690]] },
    { color: 'ecommerce', waypoints: [r('clo3d-flat'), l('size-chart')] },
    { color: 'ecommerce', waypoints: [r('size-chart'), l('upload-auto')] },
    { color: 'ecommerce', waypoints: [r('upload-auto'), l('product-complete')] },
    { color: 'archive', dashed: true, label: '아카이브 자산', waypoints: [[560, 315], [600, 315], [600, 660], [830, 660], [830, 690]] },
    { color: 'archive', dashed: true, waypoints: [[835, 315], [870, 315], [870, 660], [558, 660], [558, 690]] }
  ];

  const buildPath = (pts: [number, number][], r = 12) => {
    if (pts.length < 2) return '';
    if (pts.length === 2) return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`;
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const next = pts[i + 1];
      const d1x = curr[0] - prev[0];
      const d1y = curr[1] - prev[1];
      const d2x = next[0] - curr[0];
      const d2y = next[1] - curr[1];
      const len1 = Math.sqrt(d1x * d1x + d1y * d1y);
      const len2 = Math.sqrt(d2x * d2x + d2y * d2y);
      const cr = Math.min(r, len1 / 2, len2 / 2);
      const sx = curr[0] - (d1x / len1) * cr;
      const sy = curr[1] - (d1y / len1) * cr;
      const ex = curr[0] + (d2x / len2) * cr;
      const ey = curr[1] + (d2y / len2) * cr;
      d += ` L ${sx} ${sy} Q ${curr[0]} ${curr[1]} ${ex} ${ey}`;
    }
    d += ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`;
    return d;
  };

  const getLabelPos = (pts: [number, number][]) => {
    const mid = Math.floor(pts.length / 2);
    const a = pts[mid - 1];
    const b_ = pts[mid];
    return { x: (a[0] + b_[0]) / 2, y: (a[1] + b_[1]) / 2 - 8 };
  };

  const phaseRows = [
    { label: 'Digital Design', sub: '디지털 설계 구획', phase: 'digital' as const, x: 20, y: 40, w: 1310, h: 120 },
    { label: 'Archive / Data', sub: '아카이브와 기록 레이어', phase: 'archive' as const, x: 65, y: 255, w: 1060, h: 120 },
    { label: 'Physical Production', sub: '실물 제작 수순', phase: 'physical' as const, x: 20, y: 465, w: 1150, h: 120 },
    { label: 'Ecommerce Output', sub: '이커머스 정리판', phase: 'ecommerce' as const, x: 185, y: 675, w: 1020, h: 120 }
  ];

  return (
    <svg
      viewBox={`0 0 ${PROD_SVG_WIDTH} ${PROD_SVG_HEIGHT}`}
      width={PROD_SVG_WIDTH}
      height={PROD_SVG_HEIGHT}
    >
      <defs>
        <linearGradient id="prod-board-bg" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor={BOARD.paperSoft} />
          <stop offset="100%" stopColor={BOARD.paper} />
        </linearGradient>
        <pattern id="prod-grid" width="52" height="52" patternUnits="userSpaceOnUse">
          <path d="M 52 0 L 0 0 0 52" fill="none" stroke={BOARD.line} strokeWidth="1" strokeOpacity="0.28" />
          <rect x="-1" y="-1" width="2" height="2" fill={BOARD.line} fillOpacity="0.34" />
        </pattern>
        {Object.entries(PHASE_TONES).map(([phase, tone]) => (
          <marker key={phase} id={`prod-end-${phase}`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M4 0L8 4L4 8L0 4Z" fill={toneColor(tone)} />
          </marker>
        ))}
      </defs>

      <rect width="100%" height="100%" fill="url(#prod-board-bg)" />
      <rect width="100%" height="100%" fill="url(#prod-grid)" opacity="0.52" />

      {phaseRows.map((group) => {
        const tone = toneColor(PHASE_TONES[group.phase]);
        return (
          <g key={group.label}>
            <rect
              x={group.x}
              y={group.y}
              width={group.w}
              height={group.h}
              rx="0"
              fill={BOARD.paperSoft}
              fillOpacity="0.92"
              stroke={tone}
              strokeWidth="1.3"
              strokeOpacity="0.5"
            />
            <text x={group.x + 12} y={group.y - 8} fill={BOARD.ink} fontSize="11" fontWeight="700" letterSpacing="1.8">
              {group.label}
            </text>
            <text x={group.x + group.w - 12} y={group.y - 8} fill={BOARD.inkSoft} fontSize="10" textAnchor="end">
              {group.sub}
            </text>
          </g>
        );
      })}

      {connections.map((conn, idx) => {
        const color = toneColor(PHASE_TONES[conn.color]);
        const isHover = hoverConn === idx;
        const path = buildPath(conn.waypoints, 14);
        const labelPos = conn.label ? getLabelPos(conn.waypoints) : null;
        const labelWidth = conn.label ? conn.label.length * 7.4 + 18 : 0;

        return (
          <g key={`c-${idx}`}>
            <path
              d={path}
              fill="none"
              stroke={BOARD.lineSoft}
              strokeWidth={isHover ? 3.7 : 2.8}
              strokeOpacity="0.95"
            />
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={isHover ? 2.1 : 1.45}
              strokeOpacity={isHover ? 1 : 0.9}
              strokeDasharray={conn.dashed ? '6 6' : 'none'}
              markerEnd={`url(#prod-end-${conn.color})`}
              onMouseEnter={() => setHoverConn(idx)}
              onMouseLeave={() => setHoverConn(null)}
            />
            {labelPos && conn.label ? (
              <g>
                <rect
                  x={labelPos.x - labelWidth / 2}
                  y={labelPos.y - 12}
                  width={labelWidth}
                  height={18}
                  rx="0"
                  fill={BOARD.paperSoft}
                  stroke={color}
                  strokeWidth="1.2"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fill={BOARD.ink}
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {conn.label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}

      {nodes.map((node) => {
        const tone = toneColor(PHASE_TONES[node.phase]);
        const isHover = hoverNode === node.id;
        const compact = node.w <= 180;
        const phaseCode =
          node.phase === 'digital'
            ? 'D'
            : node.phase === 'archive'
              ? 'A'
              : node.phase === 'physical'
                ? 'P'
                : 'E';
        const markSize = compact ? 20 : 24;
        const markBox = compact ? 24 : 30;
        const titleX = node.x + (compact ? 38 : 50);
        const titleY = node.y + 35;
        const subY = node.y + 52;

        return (
          <g
            key={node.id}
            onMouseEnter={() => setHoverNode(node.id)}
            onMouseLeave={() => setHoverNode(null)}
          >
            {isHover ? (
              <rect
                x={node.x - 4}
                y={node.y - 4}
                width={node.w + 8}
                height={node.h + 8}
                rx="0"
                fill="none"
                stroke={tone}
                strokeOpacity="0.2"
                strokeWidth="2"
              />
            ) : null}
            <rect
              x={node.x}
              y={node.y}
              width={node.w}
              height={node.h}
              rx="0"
              fill={BOARD.paperSoft}
              stroke={tone}
              strokeWidth={isHover ? 1.6 : 1.2}
            />
            <rect
              x={node.x}
              y={node.y}
              width="6"
              height={node.h}
              fill={tone}
              fillOpacity="0.14"
            />
            <line
              x1={node.x + (compact ? 32 : 42)}
              y1={node.y}
              x2={node.x + (compact ? 32 : 42)}
              y2={node.y + node.h}
              stroke={BOARD.line}
              strokeWidth="1"
              strokeOpacity="0.9"
            />
            <rect
              x={node.x + 8}
              y={node.y + 8}
              width={markBox}
              height={markBox}
              rx="0"
              fill={BOARD.paper}
              stroke={tone}
              strokeWidth="1.1"
            />
            <g transform={`translate(${node.x + 8 + (markBox - markSize) / 2}, ${node.y + 8 + (markBox - markSize) / 2})`}>
              <BoardMark variant={node.mark} tone={PHASE_TONES[node.phase]} size={markSize} />
            </g>
            <text
              x={node.x + node.w - 16}
              y={node.y + 19}
              textAnchor="end"
              fill={BOARD.ink}
              fontSize="8"
              fontWeight="700"
              letterSpacing="1.4"
            >
              {phaseCode}
            </text>
            <text
              x={titleX}
              y={titleY}
              textAnchor="start"
              fill={BOARD.ink}
              fontSize={compact ? 10 : 11.5}
              fontWeight="700"
            >
              {node.label}
            </text>
            {node.sublabel ? (
              <text
                x={titleX}
                y={subY}
                textAnchor="start"
                fill={BOARD.inkSoft}
                fontSize={compact ? 8 : 9}
              >
                {node.sublabel}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

'use client';

import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode
} from 'react';
import {
  Scissors,
  Box,
  Layers,
  Ruler,
  FileText,
  Archive,
  Database,
  Printer,
  Truck,
  Hand,
  BarChart3,
  Upload,
  CheckCircle,
  Palette,
  Grid3X3,
  Cpu,
  Pen
} from 'lucide-react';

type Phase = 'digital' | 'archive' | 'physical' | 'ecommerce';

type ProdNode = {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  glow: string;
  icon: ReactNode;
  iconSize: number;
  phase: Phase;
};

type ProdConnection = {
  from: string;
  to: string;
  color: string;
  label?: string;
  flowType: Phase;
  dashed?: boolean;
  waypoints: [number, number][];
};

const C = {
  digital: '#00ffff',
  archive: '#00ff41',
  physical: '#ff00ff',
  ecommerce: '#4499ff'
} as const;

export const PROD_SVG_WIDTH = 1360;
export const PROD_SVG_HEIGHT = 820;
const LABEL_FILL = 'rgba(0, 0, 0, 0.18)';

const mixWithBlack = (hex: string, amount = 0.42) => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((char) => char + char)
        .join('')
    : normalized;

  const parts = value.match(/.{2}/g);
  if (!parts) return hex;

  const [r, g, b] = parts.map((part) => parseInt(part, 16));
  const blend = (channel: number) => Math.round(channel * (1 - amount));

  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
};

export function ProductionDiagram() {
  const [hNode, setHNode] = useState<string | null>(null);
  const [hConn, setHConn] = useState<number | null>(null);

  const I = 32;

  const renderIcon = (icon: ReactNode, size: number) => {
    if (!isValidElement(icon)) return icon;

    return cloneElement(icon as ReactElement<{ size?: number; strokeWidth?: number }>, {
      size,
      strokeWidth: size >= 56 ? 1.25 : 1.4
    });
  };

  const nodes: ProdNode[] = [
    {
      id: 'pattern',
      label: '패턴 제작',
      sublabel: 'Pattern Drafting',
      x: 30,
      y: 55,
      w: 170,
      h: 90,
      color: '#0a1518',
      glow: C.digital,
      icon: <Scissors size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'digital'
    },
    {
      id: 'clo3d-sample',
      label: 'CLO3D 가상 샘플',
      sublabel: 'Virtual Prototype',
      x: 240,
      y: 55,
      w: 185,
      h: 90,
      color: '#0a1518',
      glow: C.digital,
      icon: <Cpu size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'digital'
    },
    {
      id: 'fabric-texture',
      label: '원단 텍스쳐 적용',
      sublabel: 'Fabric Texture Map',
      x: 465,
      y: 55,
      w: 185,
      h: 90,
      color: '#0a1518',
      glow: C.digital,
      icon: <Palette size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'digital'
    },
    {
      id: 'digital-sample-2',
      label: '2차 디지털 샘플',
      sublabel: 'Digital Review v2',
      x: 690,
      y: 55,
      w: 180,
      h: 90,
      color: '#0a1518',
      glow: C.digital,
      icon: <Layers size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'digital'
    },
    {
      id: 'bom',
      label: 'BOM 야드수 측정',
      sublabel: 'Bill of Materials',
      x: 910,
      y: 55,
      w: 180,
      h: 90,
      color: '#0a1518',
      glow: C.digital,
      icon: <Ruler size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'digital'
    },
    {
      id: 'closet-techpack',
      label: 'CLO-SET 테크팩',
      sublabel: 'Tech Pack Export',
      x: 1135,
      y: 55,
      w: 180,
      h: 90,
      color: '#0a1518',
      glow: C.digital,
      icon: <FileText size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'digital'
    },
    {
      id: 'material-archive',
      label: '부자재 아카이브',
      sublabel: 'Materials Archive DB',
      x: 80,
      y: 270,
      w: 195,
      h: 90,
      color: '#081408',
      glow: C.archive,
      icon: <Archive size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'archive'
    },
    {
      id: 'digital-archive',
      label: '디지털 패션 아카이브',
      sublabel: 'Digital Fashion Archive',
      x: 350,
      y: 270,
      w: 210,
      h: 90,
      color: '#081408',
      glow: C.archive,
      icon: <Database size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'archive'
    },
    {
      id: 'clo-size-data',
      label: 'CLO 사이즈 데이터',
      sublabel: 'CLO Size Data v1',
      x: 640,
      y: 270,
      w: 195,
      h: 90,
      color: '#081408',
      glow: C.archive,
      icon: <BarChart3 size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'archive'
    },
    {
      id: 'real-measure',
      label: '실물 실측 저장',
      sublabel: 'Physical Measure v2',
      x: 920,
      y: 270,
      w: 185,
      h: 90,
      color: '#081408',
      glow: C.archive,
      icon: <Ruler size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'archive'
    },
    {
      id: 'seam-notch',
      label: '시접 / 너치 추가',
      sublabel: 'Seam & Notch',
      x: 30,
      y: 480,
      w: 180,
      h: 90,
      color: '#180a18',
      glow: C.physical,
      icon: <Pen size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'physical'
    },
    {
      id: 'print-layout',
      label: 'Print Layout / 마카',
      sublabel: 'Marker Layout',
      x: 260,
      y: 480,
      w: 185,
      h: 90,
      color: '#180a18',
      glow: C.physical,
      icon: <Grid3X3 size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'physical'
    },
    {
      id: 'pattern-print',
      label: '실물 패턴 출력',
      sublabel: 'Pattern Print',
      x: 495,
      y: 480,
      w: 175,
      h: 90,
      color: '#180a18',
      glow: C.physical,
      icon: <Printer size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'physical'
    },
    {
      id: 'material-order',
      label: '원단/부자재 발주',
      sublabel: 'Fabric & Trim Order',
      x: 720,
      y: 480,
      w: 185,
      h: 90,
      color: '#180a18',
      glow: C.physical,
      icon: <Truck size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'physical'
    },
    {
      id: 'handmade',
      label: '핸드메이드 실물 제작',
      sublabel: 'Handmade Production',
      x: 955,
      y: 480,
      w: 200,
      h: 90,
      color: '#180a18',
      glow: C.physical,
      icon: <Hand size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'physical'
    },
    {
      id: 'clo3d-flat',
      label: 'CLO3D 3D 도식화',
      sublabel: '3D Technical Drawing',
      x: 200,
      y: 690,
      w: 190,
      h: 90,
      color: '#0a0a1a',
      glow: C.ecommerce,
      icon: <Box size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'ecommerce'
    },
    {
      id: 'size-chart',
      label: '사이즈표 기재',
      sublabel: 'Size Chart Spec',
      x: 470,
      y: 690,
      w: 175,
      h: 90,
      color: '#0a0a1a',
      glow: C.ecommerce,
      icon: <FileText size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'ecommerce'
    },
    {
      id: 'upload-auto',
      label: 'enicoveck.com 업로드',
      sublabel: 'Upload Automation',
      x: 725,
      y: 690,
      w: 210,
      h: 90,
      color: '#0a0a1a',
      glow: C.ecommerce,
      icon: <Upload size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'ecommerce'
    },
    {
      id: 'product-complete',
      label: '상품등록 완료',
      sublabel: 'Product Live',
      x: 1015,
      y: 690,
      w: 175,
      h: 90,
      color: '#0a0a1a',
      glow: C.ecommerce,
      icon: <CheckCircle size={I} strokeWidth={1.5} />,
      iconSize: I,
      phase: 'ecommerce'
    }
  ];

  const nd = (id: string) => nodes.find((n) => n.id === id)!;
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
    { from: 'pattern', to: 'clo3d-sample', color: C.digital, flowType: 'digital', waypoints: [r('pattern'), l('clo3d-sample')] },
    { from: 'clo3d-sample', to: 'fabric-texture', color: C.digital, flowType: 'digital', waypoints: [r('clo3d-sample'), l('fabric-texture')] },
    { from: 'fabric-texture', to: 'digital-sample-2', color: C.digital, flowType: 'digital', waypoints: [r('fabric-texture'), l('digital-sample-2')] },
    { from: 'digital-sample-2', to: 'bom', color: C.digital, flowType: 'digital', waypoints: [r('digital-sample-2'), l('bom')] },
    { from: 'bom', to: 'closet-techpack', color: C.digital, flowType: 'digital', waypoints: [r('bom'), l('closet-techpack')] },
    {
      from: 'closet-techpack',
      to: 'material-archive',
      color: C.archive,
      flowType: 'archive',
      label: '부자재 데이터',
      waypoints: [b('closet-techpack'), [1225, 200], [178, 200], [178, 270]]
    },
    {
      from: 'closet-techpack',
      to: 'digital-archive',
      color: C.archive,
      flowType: 'archive',
      label: '디지털 아카이브',
      waypoints: [b('closet-techpack'), [1225, 220], [455, 220], [455, 270]]
    },
    {
      from: 'clo3d-sample',
      to: 'clo-size-data',
      color: C.archive,
      flowType: 'archive',
      dashed: true,
      label: '사이즈 데이터',
      waypoints: [b('clo3d-sample'), [333, 195], [738, 195], [738, 270]]
    },
    {
      from: 'material-archive',
      to: 'seam-notch',
      color: C.archive,
      flowType: 'archive',
      dashed: true,
      waypoints: [b('material-archive'), [178, 420], [120, 420], [120, 480]]
    },
    {
      from: 'digital-archive',
      to: 'print-layout',
      color: C.archive,
      flowType: 'archive',
      dashed: true,
      waypoints: [b('digital-archive'), [455, 420], [353, 420], [353, 480]]
    },
    {
      from: 'material-archive',
      to: 'material-order',
      color: C.archive,
      flowType: 'archive',
      dashed: true,
      label: '부자재 참조',
      waypoints: [b('material-archive'), [178, 435], [813, 435], [813, 480]]
    },
    { from: 'seam-notch', to: 'print-layout', color: C.physical, flowType: 'physical', waypoints: [r('seam-notch'), l('print-layout')] },
    { from: 'print-layout', to: 'pattern-print', color: C.physical, flowType: 'physical', waypoints: [r('print-layout'), l('pattern-print')] },
    { from: 'pattern-print', to: 'material-order', color: C.physical, flowType: 'physical', waypoints: [r('pattern-print'), l('material-order')] },
    { from: 'material-order', to: 'handmade', color: C.physical, flowType: 'physical', waypoints: [r('material-order'), l('handmade')] },
    {
      from: 'handmade',
      to: 'real-measure',
      color: C.archive,
      flowType: 'archive',
      label: '실측 데이터',
      waypoints: [t('handmade'), [1055, 420], [1013, 420], [1013, 360]]
    },
    {
      from: 'clo-size-data',
      to: 'clo3d-flat',
      color: C.ecommerce,
      flowType: 'ecommerce',
      label: '3D 데이터',
      waypoints: [b('clo-size-data'), [738, 630], [295, 630], [295, 690]]
    },
    {
      from: 'real-measure',
      to: 'size-chart',
      color: C.ecommerce,
      flowType: 'ecommerce',
      label: '실측 → 사이즈표',
      waypoints: [b('real-measure'), [1013, 645], [558, 645], [558, 690]]
    },
    {
      from: 'digital-archive',
      to: 'clo3d-flat',
      color: C.archive,
      flowType: 'archive',
      dashed: true,
      waypoints: [b('digital-archive'), [455, 395], [260, 395], [260, 630], [260, 690]]
    },
    { from: 'clo3d-flat', to: 'size-chart', color: C.ecommerce, flowType: 'ecommerce', waypoints: [r('clo3d-flat'), l('size-chart')] },
    { from: 'size-chart', to: 'upload-auto', color: C.ecommerce, flowType: 'ecommerce', waypoints: [r('size-chart'), l('upload-auto')] },
    { from: 'upload-auto', to: 'product-complete', color: C.ecommerce, flowType: 'ecommerce', waypoints: [r('upload-auto'), l('product-complete')] },
    {
      from: 'digital-archive',
      to: 'upload-auto',
      color: C.archive,
      flowType: 'archive',
      dashed: true,
      label: '아카이브 자산',
      waypoints: [[560, 315], [600, 315], [600, 660], [830, 660], [830, 690]]
    },
    {
      from: 'clo-size-data',
      to: 'size-chart',
      color: C.archive,
      flowType: 'archive',
      dashed: true,
      waypoints: [[835, 315], [870, 315], [870, 660], [558, 660], [558, 690]]
    }
  ];

  const buildSmoothPath = (pts: [number, number][], rad = 12) => {
    if (pts.length < 2) return '';
    if (pts.length === 2) {
      return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`;
    }

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
      const cr = Math.min(rad, len1 / 2, len2 / 2);
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
    {
      label: 'DIGITAL DESIGN',
      sub: '디지털 디자인 페이즈',
      phase: 'digital' as const,
      x: 20,
      y: 40,
      w: 1310,
      h: 120
    },
    {
      label: 'ARCHIVE / DATA',
      sub: '아카이브 · 데이터 레이어',
      phase: 'archive' as const,
      x: 65,
      y: 255,
      w: 1060,
      h: 120
    },
    {
      label: 'PHYSICAL PRODUCTION',
      sub: '실물 프로덕션',
      phase: 'physical' as const,
      x: 20,
      y: 465,
      w: 1150,
      h: 120
    },
    {
      label: 'ECOMMERCE OUTPUT',
      sub: '이커머스 아웃풋',
      phase: 'ecommerce' as const,
      x: 185,
      y: 675,
      w: 1020,
      h: 120
    }
  ];

  return (
    <svg
      viewBox={`0 0 ${PROD_SVG_WIDTH} ${PROD_SVG_HEIGHT}`}
      width={PROD_SVG_WIDTH}
      height={PROD_SVG_HEIGHT}
      style={{ background: '#ffffff' }}
    >
      <defs>
        <filter id="p-gc">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00ffff" floodOpacity="0.7" />
        </filter>
        <filter id="p-gg">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00ff41" floodOpacity="0.7" />
        </filter>
        <filter id="p-gm">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ff00ff" floodOpacity="0.7" />
        </filter>
        <filter id="p-gb">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#4499ff" floodOpacity="0.7" />
        </filter>

        {(['digital', 'physical', 'ecommerce', 'archive'] as const).map((ph) => (
          <marker
            key={ph}
            id={`p-a-${ph}`}
            markerWidth="10"
            markerHeight="8"
            refX="9"
            refY="4"
            orient="auto"
          >
            <polygon points="0 0, 10 4, 0 8" fill={C[ph]} />
          </marker>
        ))}

        <pattern id="p-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#0f0f0f" strokeWidth="0.5" />
        </pattern>
        <radialGradient id="p-node-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="62%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="p-icon-fade" cx="50%" cy="46%" r="66%">
          <stop offset="0%" stopColor="#170007" stopOpacity="0.94" />
          <stop offset="40%" stopColor="#120005" stopOpacity="0.76" />
          <stop offset="72%" stopColor="#0c0003" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="p-board-fade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.28" />
        </linearGradient>

        <style>{`
          @keyframes p-dash { to { stroke-dashoffset: -24; } }
          .p-dash { animation: p-dash 1.2s linear infinite; }
        `}</style>
      </defs>

      <rect width="100%" height="100%" fill="#f8fbff" />
      <rect width="100%" height="100%" fill="url(#p-grid)" opacity="0.22" />
      <rect width="100%" height="100%" fill="url(#p-board-fade)" />
      <ellipse cx="675" cy="104" rx="630" ry="115" fill="url(#p-node-fade)" opacity="0.92" />
      <ellipse cx="680" cy="310" rx="640" ry="132" fill="url(#p-node-fade)" opacity="0.88" />
      <ellipse cx="680" cy="520" rx="640" ry="132" fill="url(#p-node-fade)" opacity="0.88" />
      <ellipse cx="680" cy="728" rx="640" ry="118" fill="url(#p-node-fade)" opacity="0.9" />

      {phaseRows.map((g) => (
        <g key={g.phase}>
          <rect
            x={g.x}
            y={g.y}
            width={g.w}
            height={g.h}
            fill={C[g.phase]}
            fillOpacity="0.03"
            stroke={C[g.phase]}
            strokeWidth="1"
            strokeOpacity="0.2"
            rx="3"
          />
          <text
            x={g.x + 10}
            y={g.y - 5}
            fill={mixWithBlack(C[g.phase], 0.56)}
            fontSize="10"
            fontFamily="monospace"
            opacity="0.45"
            letterSpacing="2"
          >
            {g.label}
          </text>
          <text
            x={g.x + g.w - 10}
            y={g.y - 5}
            fill={mixWithBlack(C[g.phase], 0.68)}
            fontSize="9"
            fontFamily="monospace"
            opacity="0.35"
            textAnchor="end"
          >
            {g.sub}
          </text>
        </g>
      ))}

      {connections.map((conn, idx) => {
        const path = buildSmoothPath(conn.waypoints, 14);
        const isH = hConn === idx;
        const marker = `url(#p-a-${conn.flowType})`;
        const labelPos = conn.label ? getLabelPos(conn.waypoints) : null;

        return (
          <g key={`c-${idx}`}>
            <path
              d={path}
              fill="none"
              stroke={conn.color}
              strokeWidth={isH ? 6 : 2.5}
              strokeOpacity={isH ? 0.15 : 0.04}
            />
            <path
              d={path}
              fill="none"
              stroke={conn.color}
              strokeWidth={isH ? 2.5 : 1.8}
              strokeOpacity={isH ? 1 : conn.dashed ? 0.35 : 0.65}
              strokeDasharray={conn.dashed ? '6 4' : 'none'}
              className={conn.dashed ? 'p-dash' : ''}
              markerEnd={marker}
              onMouseEnter={() => setHConn(idx)}
              onMouseLeave={() => setHConn(null)}
              style={{
                cursor: 'pointer',
                filter: isH ? `drop-shadow(0 0 5px ${conn.color})` : 'none',
                transition: 'all 0.15s'
              }}
            />
            {labelPos && conn.label ? (
              <g>
                <rect
                  x={labelPos.x - conn.label.length * 4.2 - 6}
                  y={labelPos.y - 12}
                  width={conn.label.length * 8.4 + 12}
                  height={18}
                  fill={LABEL_FILL}
                  rx="2"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y + 1}
                  fill={mixWithBlack(conn.color, 0.56)}
                  fontSize="10.5"
                  fontFamily="monospace"
                  textAnchor="middle"
                  opacity={isH ? 1 : 0.65}
                >
                  {conn.label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}

      {nodes.map((node) => {
        const isH = hNode === node.id;
        const gc = node.glow;
        const tc = mixWithBlack(gc, 0.54);
        const sc = mixWithBlack(gc, 0.68);
        const iconSize = Math.max(
          node.iconSize + 18,
          Math.min(node.w * 0.42, node.h * 0.72)
        );
        const iconBox = iconSize + 12;
        const iconCx = node.x + node.w / 2;
        const iconCy = node.y + Math.min(node.h * 0.44, 34);

        let iconFilter = 'p-gc';
        if (node.phase === 'archive') iconFilter = 'p-gg';
        else if (node.phase === 'physical') iconFilter = 'p-gm';
        else if (node.phase === 'ecommerce') iconFilter = 'p-gb';

        return (
          <g
            key={node.id}
            onMouseEnter={() => setHNode(node.id)}
            onMouseLeave={() => setHNode(null)}
            style={{ cursor: 'pointer' }}
          >
            <ellipse
              cx={iconCx}
              cy={iconCy + 8}
              rx={Math.max(iconSize * 1.1, node.w * 0.33)}
              ry={Math.max(iconSize * 0.92, node.h * 0.46)}
              fill="url(#p-node-fade)"
              opacity={isH ? 1 : 0.9}
              style={{ transition: 'opacity 0.15s' }}
            />

            <ellipse
              cx={iconCx}
              cy={iconCy}
              rx={iconSize * 0.88}
              ry={iconSize * 0.88}
              fill="url(#p-icon-fade)"
              opacity={isH ? 0.98 : 0.9}
              style={{
                transition: 'all 0.15s'
              }}
            />

            <foreignObject
              x={iconCx - iconBox / 2}
              y={iconCy - iconBox / 2}
              width={iconBox}
              height={iconBox}
            >
              <div
                style={{
                  color: gc,
                  filter: isH ? `url(#${iconFilter})` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  opacity: isH ? 1 : 0.9
                }}
              >
                {renderIcon(node.icon, iconSize)}
              </div>
            </foreignObject>

            <text
              x={iconCx}
              y={iconCy + iconSize / 2 + 21}
              textAnchor="middle"
              fill={tc}
              fontSize="14.5"
              fontFamily="monospace"
              fontWeight="600"
              opacity={isH ? 1 : 0.95}
            >
              {node.label}
            </text>

            {node.sublabel ? (
              <text
                x={iconCx}
                y={iconCy + iconSize / 2 + 40}
                textAnchor="middle"
                fill={sc}
                fontSize="10"
                fontFamily="monospace"
                opacity={isH ? 0.8 : 0.5}
              >
                {node.sublabel}
              </text>
            ) : null}
          </g>
        );
      })}

      <pattern id="p-sl" width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="2" fill="#000" opacity="0.03" />
      </pattern>
      <rect width="100%" height="100%" fill="url(#p-sl)" />
    </svg>
  );
}

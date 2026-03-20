'use client';

import { useState } from 'react';

const palette = {
  bg: '#ffffff',
  bgDeep: '#f7f7f7',
  surface: 'transparent',
  surfaceLine: 'rgba(15,23,42,0.08)',
  jade: '#ffd66b',
  jadeSoft: '#ffb24a',
  amber: '#ff9247',
  amberSoft: '#ff713c',
  cobalt: '#ff5536',
  rose: '#ff7f48',
  cream: '#27140d',
  fog: '#8d6b58',
  ink: '#2d1610'
} as const;

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  const parts = value.match(/.{2}/g);
  if (!parts) return { r: 255, g: 255, b: 255 };

  const [r, g, b] = parts.map((part) => parseInt(part, 16));
  return { r, g, b };
};

const rgbaFromHex = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const mixHex = (hex: string, target: number, amount: number) => {
  const { r, g, b } = hexToRgb(hex);
  const blend = (channel: number) =>
    Math.round(channel + (target - channel) * amount);

  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
};

type PathSpec = {
  d: string;
  color: string;
  width: number;
  type: 'main' | 'branch' | 'thorn';
};

type NodeSpec = {
  id: string;
  text: string;
  sub?: string;
  desc?: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  anchor: 'start' | 'middle' | 'end';
  color: string;
  isMain?: boolean;
  motif: MotifType;
};

type WorkflowHeistTimelineProps = {
  onTabRequest?: (target: 'system' | 'production') => void;
};

type MotifType =
  | 'lotus'
  | 'wheel'
  | 'sun'
  | 'yantra'
  | 'seed'
  | 'eye'
  | 'spiral'
  | 'waves'
  | 'knot'
  | 'flame'
  | 'orbit'
  | 'moon'
  | 'gate';

const polarPoint = (cx: number, cy: number, radius: number, angle: number) => {
  const rad = (angle * Math.PI) / 180;
  return {
    x: cx + Math.cos(rad) * radius,
    y: cy + Math.sin(rad) * radius
  };
};

const renderMotif = (node: NodeSpec, isHovered: boolean) => {
  const scale = node.isMain ? 2.72 : 2.2;
  const stroke = mixHex(node.color, 0, 0.82);
  const fill = rgbaFromHex(node.color, isHovered ? 0.22 : 0.14);
  const glowFill = rgbaFromHex(node.color, isHovered ? 0.2 : 0.12);
  const accent = 'rgba(255,233,205,0.72)';
  const lineWidth = node.isMain ? 1.7 : 1.32;
  const centerRadius = node.isMain ? 1.65 : 1.2;
  const ringRadius = node.isMain ? 10.8 : 8.9;
  const x = node.x;
  const y = node.y;

  switch (node.motif) {
    case 'lotus':
      return (
        <>
          {Array.from({ length: 8 }).map((_, index) => {
            const angle = index * 45;
            const petalCenter = polarPoint(x, y, 4.8 * scale, angle);

            return (
              <ellipse
                key={`${node.id}-lotus-${angle}`}
                cx={petalCenter.x}
                cy={petalCenter.y}
                rx={1.65 * scale}
                ry={3.25 * scale}
                fill={fill}
                stroke={stroke}
                strokeWidth={0.52}
                transform={`rotate(${angle} ${petalCenter.x} ${petalCenter.y})`}
              />
            );
          })}
          <circle
            cx={x}
            cy={y}
            r={ringRadius}
            fill={glowFill}
            stroke={stroke}
            strokeWidth={lineWidth}
          />
          <circle cx={x} cy={y} r={centerRadius} fill={accent} />
        </>
      );
    case 'wheel':
      return (
        <>
          <circle
            cx={x}
            cy={y}
            r={ringRadius + 1.2}
            fill="none"
            stroke={stroke}
            strokeWidth={lineWidth}
          />
          {Array.from({ length: 8 }).map((_, index) => {
            const angle = index * 45;
            const inner = polarPoint(x, y, 1.4 * scale, angle);
            const outer = polarPoint(x, y, ringRadius + 0.7, angle);

            return (
              <line
                key={`${node.id}-wheel-${angle}`}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={stroke}
                strokeWidth={0.75}
              />
            );
          })}
          <circle
            cx={x}
            cy={y}
            r={2.4 * scale}
            fill={glowFill}
            stroke={stroke}
            strokeWidth={0.72}
          />
          <circle cx={x} cy={y} r={centerRadius} fill={accent} />
        </>
      );
    case 'sun':
      return (
        <>
          {Array.from({ length: 12 }).map((_, index) => {
            const angle = index * 30;
            const inner = polarPoint(x, y, 4.1 * scale, angle);
            const outer = polarPoint(x, y, 7.1 * scale, angle);

            return (
              <line
                key={`${node.id}-sun-${angle}`}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={stroke}
                strokeWidth={0.72}
              />
            );
          })}
          <circle
            cx={x}
            cy={y}
            r={4.5 * scale}
            fill={fill}
            stroke={stroke}
            strokeWidth={lineWidth}
          />
          <circle cx={x} cy={y} r={centerRadius} fill={accent} />
        </>
      );
    case 'yantra':
      return (
        <>
          <polygon
            points={`${x},${y - 6.2 * scale} ${x - 5.2 * scale},${y + 3.8 * scale} ${x + 5.2 * scale},${y + 3.8 * scale}`}
            fill="none"
            stroke={stroke}
            strokeWidth={lineWidth}
          />
          <polygon
            points={`${x},${y + 6.2 * scale} ${x - 5.2 * scale},${y - 3.8 * scale} ${x + 5.2 * scale},${y - 3.8 * scale}`}
            fill="none"
            stroke={stroke}
            strokeWidth={lineWidth}
            opacity={0.82}
          />
          <circle
            cx={x}
            cy={y}
            r={2.15 * scale}
            fill={fill}
            stroke={stroke}
            strokeWidth={0.68}
          />
          <circle cx={x} cy={y} r={centerRadius} fill={accent} />
        </>
      );
    case 'seed':
      return (
        <>
          {Array.from({ length: 6 }).map((_, index) => {
            const angle = index * 60 - 90;
            const petalCenter = polarPoint(x, y, 4.1 * scale, angle);

            return (
              <path
                key={`${node.id}-seed-${angle}`}
                d={`M ${petalCenter.x} ${petalCenter.y - 2.8 * scale} C ${petalCenter.x + 1.7 * scale} ${petalCenter.y - 0.8 * scale}, ${petalCenter.x + 1.2 * scale} ${petalCenter.y + 2.2 * scale}, ${petalCenter.x} ${petalCenter.y + 3 * scale} C ${petalCenter.x - 1.2 * scale} ${petalCenter.y + 2.2 * scale}, ${petalCenter.x - 1.7 * scale} ${petalCenter.y - 0.8 * scale}, ${petalCenter.x} ${petalCenter.y - 2.8 * scale}`}
                fill={fill}
                stroke={stroke}
                strokeWidth={0.5}
                transform={`rotate(${angle} ${petalCenter.x} ${petalCenter.y})`}
              />
            );
          })}
          <circle
            cx={x}
            cy={y}
            r={2.6 * scale}
            fill={glowFill}
            stroke={stroke}
            strokeWidth={0.72}
          />
          <circle cx={x} cy={y} r={centerRadius} fill={accent} />
        </>
      );
    case 'eye':
      return (
        <>
          <path
            d={`M ${x - 7 * scale} ${y} Q ${x} ${y - 5.5 * scale} ${x + 7 * scale} ${y}`}
            fill="none"
            stroke={stroke}
            strokeWidth={lineWidth}
          />
          <path
            d={`M ${x - 7 * scale} ${y} Q ${x} ${y + 5.5 * scale} ${x + 7 * scale} ${y}`}
            fill="none"
            stroke={stroke}
            strokeWidth={lineWidth}
          />
          <circle
            cx={x}
            cy={y}
            r={2.8 * scale}
            fill={fill}
            stroke={stroke}
            strokeWidth={0.72}
          />
          <circle cx={x} cy={y} r={centerRadius} fill={accent} />
        </>
      );
    case 'spiral':
      return (
        <>
          <path
            d={`M ${x + 5.5 * scale} ${y + 0.4 * scale} C ${x + 4.2 * scale} ${y + 5.2 * scale}, ${x - 3.6 * scale} ${y + 5.5 * scale}, ${x - 4.4 * scale} ${y + 0.5 * scale} C ${x - 5.1 * scale} ${y - 4.4 * scale}, ${x + 1.4 * scale} ${y - 5.5 * scale}, ${x + 2.1 * scale} ${y - 0.4 * scale} C ${x + 2.5 * scale} ${y + 2.2 * scale}, ${x - 0.2 * scale} ${y + 2.6 * scale}, ${x - 1.1 * scale} ${y + 0.5 * scale}`}
            fill="none"
            stroke={stroke}
            strokeWidth={lineWidth}
            strokeLinecap="round"
          />
          <circle
            cx={x - 1.1 * scale}
            cy={y + 0.5 * scale}
            r={centerRadius}
            fill={accent}
          />
        </>
      );
    case 'waves':
      return (
        <>
          {[-3.6, 0, 3.6].map((offset) => (
            <path
              key={`${node.id}-wave-${offset}`}
              d={`M ${x - 6.2 * scale} ${y + offset * scale * 0.34} C ${x - 3.9 * scale} ${y + (offset - 1.2) * scale * 0.34}, ${x - 1.6 * scale} ${y + (offset + 1.2) * scale * 0.34}, ${x + 0.6 * scale} ${y + offset * scale * 0.34} C ${x + 2.8 * scale} ${y + (offset - 1.2) * scale * 0.34}, ${x + 5 * scale} ${y + (offset + 1.2) * scale * 0.34}, ${x + 6.8 * scale} ${y + offset * scale * 0.34}`}
              fill="none"
              stroke={stroke}
              strokeWidth={0.9}
              strokeLinecap="round"
            />
          ))}
        </>
      );
    case 'knot':
      return (
        <>
          <ellipse
            cx={x - 2.2 * scale}
            cy={y}
            rx={3.8 * scale}
            ry={5.1 * scale}
            fill="none"
            stroke={stroke}
            strokeWidth={lineWidth}
          />
          <ellipse
            cx={x + 2.2 * scale}
            cy={y}
            rx={3.8 * scale}
            ry={5.1 * scale}
            fill="none"
            stroke={stroke}
            strokeWidth={lineWidth}
          />
          <circle cx={x} cy={y} r={centerRadius} fill={accent} />
        </>
      );
    case 'flame':
      return (
        <>
          <path
            d={`M ${x} ${y - 7.4 * scale} C ${x + 4.4 * scale} ${y - 3.8 * scale}, ${x + 3.8 * scale} ${y + 2.2 * scale}, ${x} ${y + 6.2 * scale} C ${x - 4.1 * scale} ${y + 2 * scale}, ${x - 4.2 * scale} ${y - 3.6 * scale}, ${x} ${y - 7.4 * scale}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={lineWidth}
          />
          <path
            d={`M ${x} ${y - 3.8 * scale} C ${x + 2.1 * scale} ${y - 1.9 * scale}, ${x + 1.8 * scale} ${y + 1.3 * scale}, ${x} ${y + 4.1 * scale} C ${x - 1.8 * scale} ${y + 1.3 * scale}, ${x - 1.9 * scale} ${y - 1.9 * scale}, ${x} ${y - 3.8 * scale}`}
            fill={accent}
            opacity={0.86}
          />
        </>
      );
    case 'orbit':
      return (
        <>
          <ellipse
            cx={x}
            cy={y}
            rx={6.4 * scale}
            ry={3.3 * scale}
            fill="none"
            stroke={stroke}
            strokeWidth={lineWidth}
          />
          <ellipse
            cx={x}
            cy={y}
            rx={6.4 * scale}
            ry={3.3 * scale}
            fill="none"
            stroke={stroke}
            strokeWidth={lineWidth}
            transform={`rotate(60 ${x} ${y})`}
            opacity={0.88}
          />
          <ellipse
            cx={x}
            cy={y}
            rx={6.4 * scale}
            ry={3.3 * scale}
            fill="none"
            stroke={stroke}
            strokeWidth={lineWidth}
            transform={`rotate(-60 ${x} ${y})`}
            opacity={0.74}
          />
          <circle cx={x} cy={y} r={centerRadius} fill={accent} />
        </>
      );
    case 'moon':
      return (
        <>
          <circle
            cx={x - 0.9 * scale}
            cy={y}
            r={5.8 * scale}
            fill={fill}
            stroke={stroke}
            strokeWidth={lineWidth}
          />
          <circle
            cx={x + 2.2 * scale}
            cy={y - 0.2 * scale}
            r={4.9 * scale}
            fill={rgbaFromHex(node.color, 0)}
          />
          <circle
            cx={x - 1.4 * scale}
            cy={y - 0.8 * scale}
            r={centerRadius}
            fill={accent}
          />
        </>
      );
    case 'gate':
      return (
        <>
          <path
            d={`M ${x - 6.8 * scale} ${y + 4.6 * scale} L ${x + 6.8 * scale} ${y + 4.6 * scale} M ${x - 5.1 * scale} ${y + 4.6 * scale} L ${x - 5.1 * scale} ${y - 5.6 * scale} M ${x + 5.1 * scale} ${y + 4.6 * scale} L ${x + 5.1 * scale} ${y - 5.6 * scale} M ${x - 7.8 * scale} ${y - 3.6 * scale} L ${x + 7.8 * scale} ${y - 3.6 * scale}`}
            fill="none"
            stroke={stroke}
            strokeWidth={lineWidth}
            strokeLinecap="round"
          />
          <circle cx={x} cy={y} r={centerRadius} fill={accent} />
        </>
      );
    default:
      return null;
  }
};

type LanternFragment = {
  x: number;
  y: number;
  width: number;
  height: number;
  tone: 'cut' | 'burn' | 'flash';
};

const getLanternFragments = (
  node: NodeSpec,
  lanternRx: number,
  lanternRy: number
): LanternFragment[] => {
  const unit = node.isMain ? 4.1 : 3;
  const make = (
    dx: number,
    dy: number,
    width: number,
    height: number,
    tone: LanternFragment['tone']
  ) => ({
    x: node.x + dx * lanternRx - (width * unit) / 2,
    y: node.y + dy * lanternRy - (height * unit) / 2,
    width: width * unit,
    height: height * unit,
    tone
  });

  return [
    make(-0.84, -0.46, 2.4, 1.2, 'cut'),
    make(0.58, -0.18, 1.5, 1.2, 'cut'),
    make(-0.18, 0.38, 1.9, 1.4, 'cut'),
    make(0.7, 0.24, 1.2, 1.8, 'cut'),
    make(0.06, 0.68, 2.6, 1.05, 'cut'),
    make(-0.48, -0.62, 1.3, 0.85, 'burn'),
    make(0.2, -0.04, 0.9, 0.9, 'flash'),
    make(0.42, 0.52, 1.1, 0.85, 'burn'),
    make(-0.64, 0.18, 0.85, 0.85, 'flash')
  ];
};

const renderClickCue = (node: NodeSpec) => {
  if (node.id !== 'c0' && node.id !== 'p0') return null;

  const cueScale = 1.5;
  const cueColor = '#bf1028';
  const cueGlow = 'rgba(226, 37, 63, 0.18)';
  const labelOffsetX = node.id === 'p0' ? 46 : 44;
  const labelOffsetY = node.id === 'p0' ? -46 : -50;

  return (
    <g pointerEvents="none">
      <g transform={`translate(${node.x} ${node.y}) scale(${cueScale})`}>
        <ellipse
          cx="0"
          cy="0"
          rx="34"
          ry="39"
          fill="none"
          stroke={cueGlow}
          strokeWidth="9"
          filter="url(#softBlur)"
        />
        <path
          d="M -28 -9 C -34 -31, -10 -42, 12 -35 C 35 -27, 38 1, 28 21 C 17 39, -10 40, -25 26"
          fill="none"
          stroke={cueColor}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.94}
        />
        <path
          d="M -24 -15 C -12 -42, 21 -40, 34 -14 C 43 7, 27 35, -1 36 C -20 36, -33 18, -31 3"
          fill="none"
          stroke={cueColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.84}
        />
      </g>

      <g
        transform={`translate(${node.x + labelOffsetX} ${node.y + labelOffsetY}) scale(${cueScale})`}
      >
        <text
          x="0"
          y="12"
          fill="rgba(255, 247, 243, 0.98)"
          stroke="rgba(255, 247, 243, 0.98)"
          strokeWidth="7"
          fontSize="9.5"
          fontWeight="800"
          letterSpacing="0.08em"
        >
          관계자 외 접근금지
        </text>
        <text
          x="0"
          y="12"
          fill={cueColor}
          fontSize="9.5"
          fontWeight="800"
          letterSpacing="0.08em"
          style={{ textTransform: 'uppercase' }}
        >
          관계자 외 접근금지
        </text>
      </g>
    </g>
  );
};

const paths: PathSpec[] = [
  {
    d: 'M 400 120 L 400 1260',
    color: 'url(#mainGradient)',
    width: 16,
    type: 'main'
  },
  {
    d: 'M 400 1260 C 400 1310, 210 1320, 210 1370 L 210 1710',
    color: palette.jade,
    width: 10,
    type: 'branch'
  },
  {
    d: 'M 400 1260 C 400 1310, 590 1320, 590 1370 L 590 1760',
    color: palette.amber,
    width: 10,
    type: 'branch'
  },
  { d: 'M 400 210 L 255 260', color: palette.jade, width: 3, type: 'thorn' },
  { d: 'M 400 320 L 545 370', color: palette.jade, width: 3, type: 'thorn' },
  { d: 'M 400 430 L 255 480', color: palette.jade, width: 3, type: 'thorn' },
  { d: 'M 400 540 L 545 590', color: palette.jade, width: 3, type: 'thorn' },
  { d: 'M 400 815 L 255 865', color: palette.rose, width: 3, type: 'thorn' },
  { d: 'M 400 925 L 545 975', color: palette.rose, width: 3, type: 'thorn' },
  { d: 'M 400 1035 L 255 1085', color: palette.rose, width: 3, type: 'thorn' },
  { d: 'M 400 1145 L 545 1195', color: palette.rose, width: 3, type: 'thorn' },
  { d: 'M 400 1230 L 255 1280', color: palette.rose, width: 3, type: 'thorn' },
  { d: 'M 210 1460 L 110 1510', color: palette.jade, width: 3, type: 'thorn' },
  { d: 'M 210 1560 L 310 1610', color: palette.jade, width: 3, type: 'thorn' },
  { d: 'M 210 1660 L 110 1710', color: palette.jade, width: 3, type: 'thorn' },
  { d: 'M 590 1420 L 490 1470', color: palette.amber, width: 3, type: 'thorn' },
  { d: 'M 590 1475 L 690 1525', color: palette.amber, width: 3, type: 'thorn' },
  { d: 'M 590 1530 L 490 1580', color: palette.amber, width: 3, type: 'thorn' },
  { d: 'M 590 1585 L 690 1635', color: palette.amber, width: 3, type: 'thorn' },
  { d: 'M 590 1640 L 490 1690', color: palette.amber, width: 3, type: 'thorn' },
  { d: 'M 590 1695 L 690 1745', color: palette.amber, width: 3, type: 'thorn' },
  { d: 'M 590 1750 L 490 1800', color: palette.amber, width: 3, type: 'thorn' }
];

const nodes: NodeSpec[] = [
  {
    id: 'c0',
    text: '[의류제작 시작]',
    sub: 'FABRIC LINE',
    x: 400,
    y: 120,
    tx: 400,
    ty: 78,
    anchor: 'middle',
    color: palette.jade,
    isMain: true,
    motif: 'lotus'
  },
  {
    id: 'v0',
    text: '[영상제작 시작]',
    sub: 'EDIT LINE',
    x: 400,
    y: 710,
    tx: 400,
    ty: 668,
    anchor: 'middle',
    color: palette.rose,
    isMain: true,
    motif: 'sun'
  },
  {
    id: 'p0',
    text: '[플랫폼 업로드]',
    sub: 'UPLOAD GATE',
    x: 400,
    y: 1260,
    tx: 400,
    ty: 1218,
    anchor: 'middle',
    color: palette.cobalt,
    isMain: true,
    motif: 'gate'
  },
  {
    id: 'c1',
    text: '원부자재 발주',
    x: 255,
    y: 260,
    tx: 232,
    ty: 265,
    anchor: 'end',
    color: palette.jade,
    motif: 'seed'
  },
  {
    id: 'c2',
    text: 'CLO 3D 설계',
    x: 545,
    y: 370,
    tx: 568,
    ty: 375,
    anchor: 'start',
    color: palette.jade,
    motif: 'yantra'
  },
  {
    id: 'c3',
    text: '데이터 저장',
    x: 255,
    y: 480,
    tx: 232,
    ty: 485,
    anchor: 'end',
    color: palette.jade,
    motif: 'wheel'
  },
  {
    id: 'c4',
    text: '실물 제작',
    x: 545,
    y: 590,
    tx: 568,
    ty: 595,
    anchor: 'start',
    color: palette.jade,
    motif: 'knot'
  },
  {
    id: 'v1',
    text: '제품 촬영',
    x: 255,
    y: 865,
    tx: 232,
    ty: 870,
    anchor: 'end',
    color: palette.rose,
    motif: 'eye'
  },
  {
    id: 'v2',
    text: '촬영/소스 정리',
    x: 545,
    y: 975,
    tx: 568,
    ty: 980,
    anchor: 'start',
    color: palette.rose,
    motif: 'orbit'
  },
  {
    id: 'v3',
    text: '컷 편집',
    x: 255,
    y: 1085,
    tx: 232,
    ty: 1090,
    anchor: 'end',
    color: palette.rose,
    motif: 'spiral'
  },
  {
    id: 'v4',
    text: '자막/사운드',
    x: 545,
    y: 1195,
    tx: 568,
    ty: 1200,
    anchor: 'start',
    color: palette.rose,
    motif: 'waves'
  },
  {
    id: 'v5',
    text: '최종 출력',
    x: 255,
    y: 1280,
    tx: 232,
    ty: 1285,
    anchor: 'end',
    color: palette.rose,
    motif: 'flame'
  },
  {
    id: 'm0',
    text: '[몽상인 채널]',
    sub: 'LONG / SHORT',
    x: 210,
    y: 1370,
    tx: 210,
    ty: 1328,
    anchor: 'middle',
    color: palette.amber,
    isMain: true,
    motif: 'orbit'
  },
  {
    id: 'm1',
    text: 'YouTube',
    desc: '(롱/숏폼)',
    x: 110,
    y: 1510,
    tx: 88,
    ty: 1515,
    anchor: 'end',
    color: palette.amber,
    motif: 'moon'
  },
  {
    id: 'm2',
    text: 'Instagram',
    desc: '(롱/숏폼)',
    x: 310,
    y: 1610,
    tx: 332,
    ty: 1615,
    anchor: 'start',
    color: palette.amber,
    motif: 'knot'
  },
  {
    id: 'm3',
    text: 'TikTok',
    desc: '(롱/숏폼)',
    x: 110,
    y: 1710,
    tx: 88,
    ty: 1715,
    anchor: 'end',
    color: palette.amber,
    motif: 'sun'
  },
  {
    id: 'e0',
    text: '[enicoveck]',
    sub: 'STORE FRONT',
    x: 590,
    y: 1370,
    tx: 590,
    ty: 1328,
    anchor: 'middle',
    color: palette.cobalt,
    isMain: true,
    motif: 'wheel'
  },
  {
    id: 'e1',
    text: '상품 등록',
    x: 490,
    y: 1470,
    tx: 468,
    ty: 1475,
    anchor: 'end',
    color: palette.cobalt,
    motif: 'yantra'
  },
  {
    id: 'e2',
    text: '이미지 업로드',
    x: 690,
    y: 1525,
    tx: 712,
    ty: 1530,
    anchor: 'start',
    color: palette.cobalt,
    motif: 'lotus'
  },
  {
    id: 'e3',
    text: '사이즈표 기재',
    x: 490,
    y: 1580,
    tx: 468,
    ty: 1585,
    anchor: 'end',
    color: palette.cobalt,
    motif: 'gate'
  },
  {
    id: 'e4',
    text: '상품 설명',
    x: 690,
    y: 1635,
    tx: 712,
    ty: 1640,
    anchor: 'start',
    color: palette.cobalt,
    motif: 'waves'
  },
  {
    id: 'e5',
    text: '결제 연결',
    x: 490,
    y: 1690,
    tx: 468,
    ty: 1695,
    anchor: 'end',
    color: palette.cobalt,
    motif: 'knot'
  },
  {
    id: 'e6',
    text: '상품 오픈',
    x: 690,
    y: 1745,
    tx: 712,
    ty: 1750,
    anchor: 'start',
    color: palette.cobalt,
    motif: 'sun'
  },
  {
    id: 'e7',
    text: '영어권 숏폼',
    x: 490,
    y: 1800,
    tx: 468,
    ty: 1805,
    anchor: 'end',
    color: palette.cobalt,
    motif: 'flame'
  }
];

export default function WorkflowHeistTimeline({
  onTabRequest
}: WorkflowHeistTimelineProps) {
  const [hoveredNode, setHoveredNode] = useState<string>('p0');

  const handleNodeClick = (nodeId: string) => {
    if (nodeId === 'c0') {
      onTabRequest?.('production');
    }

    if (nodeId === 'p0') {
      onTabRequest?.('system');
    }
  };

  return (
    <div
      className="min-h-screen overflow-hidden text-slate-900"
      style={{
        background: palette.bg
      }}
    >
      <style>{`
        @keyframes driftA {
          0% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(30px,-24px,0) scale(1.08); }
          100% { transform: translate3d(0,0,0) scale(1); }
        }
        @keyframes driftB {
          0% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(-36px,18px,0) scale(1.06); }
          100% { transform: translate3d(0,0,0) scale(1); }
        }
        @keyframes flicker {
          0%, 100% { opacity: 0.16; }
          50% { opacity: 0.28; }
        }
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.15); opacity: 0.34; }
          100% { transform: scale(1); opacity: 0.2; }
        }
        .grain-overlay {
          background-image:
            linear-gradient(rgba(15,23,42,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15,23,42,0.018) 1px, transparent 1px);
          background-size: 32px 32px, 32px 32px;
          background-position: 0 0, 0 0;
          mix-blend-mode: normal;
          animation: flicker 4s ease-in-out infinite;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-20 top-10 h-80 w-80 rounded-full blur-3xl"
          style={{
            background: 'rgba(226, 232, 240, 0.11)',
            animation: 'driftA 10s ease-in-out infinite'
          }}
        />
        <div
          className="absolute right-[-80px] top-[22%] h-96 w-96 rounded-full blur-3xl"
          style={{
            background: 'rgba(203, 213, 225, 0.09)',
            animation: 'driftB 12s ease-in-out infinite'
          }}
        />
        <div
          className="absolute left-[28%] top-[46%] h-72 w-72 rounded-full blur-3xl"
          style={{
            background: 'rgba(226, 232, 240, 0.08)',
            animation: 'driftA 14s ease-in-out infinite'
          }}
        />
        <div
          className="grain-overlay absolute inset-0"
          style={{ opacity: 0.08 }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-4xl">
          <div
            className="relative overflow-hidden rounded-[32px] border shadow-[0_24px_80px_rgba(148,163,184,0.10)]"
            style={{
              borderColor: palette.surfaceLine,
              background: palette.surface
            }}
          >
            <div className="relative p-4 sm:p-6">
              <svg viewBox="0 0 800 1880" className="h-auto w-full">
                <defs>
                  <linearGradient
                    id="mainGradient"
                    gradientUnits="userSpaceOnUse"
                    x1="400"
                    y1="120"
                    x2="400"
                    y2="1260"
                  >
                    <stop offset="0%" stopColor="#ffe49a" />
                    <stop offset="38%" stopColor={palette.jadeSoft} />
                    <stop offset="70%" stopColor={palette.amberSoft} />
                    <stop offset="100%" stopColor={palette.cobalt} />
                  </linearGradient>
                  <filter
                    id="softBlur"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feGaussianBlur stdDeviation="8" />
                  </filter>
                  <filter
                    id="nodeGlow"
                    x="-200%"
                    y="-200%"
                    width="400%"
                    height="400%"
                  >
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <rect
                  x="40"
                  y="40"
                  width="720"
                  height="1800"
                  rx="28"
                  fill="none"
                  stroke="none"
                />

                <ellipse
                  cx="220"
                  cy="380"
                  rx="170"
                  ry="120"
                  fill="rgba(226,232,240,0.08)"
                  filter="url(#softBlur)"
                />
                <ellipse
                  cx="575"
                  cy="1180"
                  rx="170"
                  ry="130"
                  fill="rgba(226,232,240,0.06)"
                  filter="url(#softBlur)"
                />
                <ellipse
                  cx="570"
                  cy="1530"
                  rx="180"
                  ry="140"
                  fill="rgba(226,232,240,0.05)"
                  filter="url(#softBlur)"
                />

                {paths.map((path, index) => {
                  const isMain = path.type === 'main';
                  const isBranch = path.type === 'branch';
                  const glowColor = path.color.startsWith('url(')
                    ? 'rgba(90,163,255,0.95)'
                    : path.color;

                  return (
                    <g key={index}>
                      {isMain ? (
                        <>
                          <path
                            d={path.d}
                            fill="none"
                            stroke="rgba(255, 181, 86, 0.16)"
                            strokeWidth={path.width + 18}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#softBlur)"
                          />
                          <path
                            d={path.d}
                            fill="none"
                            stroke="rgba(255, 110, 58, 0.24)"
                            strokeWidth={path.width + 8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      ) : null}

                      <path
                        d={path.d}
                        fill="none"
                        stroke={path.color}
                        strokeWidth={isMain ? path.width + 2 : path.width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={isMain ? 1 : isBranch ? 0.84 : 0.58}
                        style={{
                          filter: `drop-shadow(0 0 ${isMain ? 18 : 8}px ${glowColor})`
                        }}
                      />
                    </g>
                  );
                })}

                {nodes.map((node) => {
                  const isHovered = hoveredNode === node.id;
                  const isActionNode = node.id === 'c0' || node.id === 'p0';
                  const baseRadius = node.isMain ? 16 : 10.5;
                  const hoverRadius = node.isMain ? 22 : 15;
                  const glowRadius = node.isMain ? 40 : 30;
                  const lanternRx =
                    (isHovered ? hoverRadius : baseRadius) +
                    (node.isMain ? 8 : 5.5);
                  const lanternRy = lanternRx + (node.isMain ? 6.5 : 4.5);
                  const lanternGlow = isHovered
                    ? glowRadius + 11
                    : glowRadius + 4;
                  const lanternGradientId = `lantern-paper-${node.id}`;
                  const lanternCoreId = `lantern-core-${node.id}`;
                  const lanternMaskId = `lantern-mask-${node.id}`;
                  const lanternShade = mixHex(node.color, 0, 0.34);
                  const lanternPaper = mixHex(node.color, 255, 0.38);
                  const lanternHighlight = mixHex(node.color, 255, 0.74);
                  const ribStroke = isHovered
                    ? 'rgba(255, 246, 214, 0.46)'
                    : 'rgba(255, 246, 214, 0.28)';
                  const capFill = mixHex(node.color, 0, 0.54);
                  const glowColor = rgbaFromHex(node.color, 0.9);
                  const lanternFragments = getLanternFragments(
                    node,
                    lanternRx,
                    lanternRy
                  );
                  const cutFragments = lanternFragments.filter(
                    (fragment) => fragment.tone === 'cut'
                  );
                  const surfaceFragments = lanternFragments.filter(
                    (fragment) => fragment.tone !== 'cut'
                  );

                  return (
                    <g
                      key={node.id}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode('p0')}
                      onClick={
                        isActionNode
                          ? () => handleNodeClick(node.id)
                          : undefined
                      }
                      className={
                        isActionNode ? 'cursor-pointer' : 'cursor-default'
                      }
                    >
                      <defs>
                        <radialGradient
                          id={lanternGradientId}
                          cx="50%"
                          cy="36%"
                          r="78%"
                        >
                          <stop offset="0%" stopColor={lanternHighlight} />
                          <stop offset="58%" stopColor={lanternPaper} />
                          <stop offset="100%" stopColor={lanternShade} />
                        </radialGradient>
                        <radialGradient
                          id={lanternCoreId}
                          cx="50%"
                          cy="34%"
                          r="72%"
                        >
                          <stop
                            offset="0%"
                            stopColor={rgbaFromHex(node.color, 0.92)}
                          />
                          <stop
                            offset="100%"
                            stopColor={rgbaFromHex(node.color, 0)}
                          />
                        </radialGradient>
                        <mask
                          id={lanternMaskId}
                          maskUnits="userSpaceOnUse"
                          x={node.x - lanternGlow * 2}
                          y={node.y - lanternGlow * 2}
                          width={lanternGlow * 4}
                          height={lanternGlow * 4}
                        >
                          <ellipse
                            cx={node.x}
                            cy={node.y}
                            rx={lanternRx}
                            ry={lanternRy}
                            fill="white"
                          />
                          {cutFragments.map((fragment, index) => (
                            <rect
                              key={`${node.id}-cut-${index}`}
                              x={fragment.x}
                              y={fragment.y}
                              width={fragment.width}
                              height={fragment.height}
                              fill="black"
                              shapeRendering="crispEdges"
                            />
                          ))}
                        </mask>
                      </defs>

                      {renderClickCue(node)}

                      <ellipse
                        cx={node.x}
                        cy={node.y}
                        rx={lanternGlow}
                        ry={lanternGlow + (node.isMain ? 5 : 3)}
                        fill={node.color}
                        opacity={isHovered ? 0.2 : 0.11}
                        filter="url(#softBlur)"
                      />

                      {node.isMain ? (
                        <ellipse
                          cx={node.x}
                          cy={node.y}
                          rx={lanternRx + 7}
                          ry={lanternRy + 7}
                          fill="none"
                          stroke={node.color}
                          strokeWidth="1.5"
                          opacity={isHovered ? 0.38 : 0.16}
                          style={{
                            transformOrigin: `${node.x}px ${node.y}px`,
                            animation: 'pulseRing 2.8s ease-in-out infinite'
                          }}
                        />
                      ) : null}

                      <g mask={`url(#${lanternMaskId})`}>
                        <ellipse
                          cx={node.x}
                          cy={node.y}
                          rx={lanternRx}
                          ry={lanternRy}
                          fill={`url(#${lanternGradientId})`}
                          stroke={rgbaFromHex(node.color, 0.72)}
                          strokeWidth={node.isMain ? '1.8' : '1.4'}
                          filter="url(#nodeGlow)"
                          style={{
                            filter: `drop-shadow(0 0 ${node.isMain ? 18 : 11}px ${glowColor})`
                          }}
                        />

                        <ellipse
                          cx={node.x}
                          cy={node.y - lanternRy * 0.14}
                          rx={lanternRx * 0.5}
                          ry={lanternRy * 0.44}
                          fill={`url(#${lanternCoreId})`}
                          opacity={0.56}
                        />

                        {[-0.6, -0.18, 0.12, 0.48].map((offset) => (
                          <ellipse
                            key={`${node.id}-rib-${offset}`}
                            cx={node.x + lanternRx * offset * 0.24}
                            cy={node.y}
                            rx={lanternRx * (0.74 - Math.abs(offset) * 0.24)}
                            ry={lanternRy * 0.94}
                            fill="none"
                            stroke={ribStroke}
                            strokeWidth={0.85}
                          />
                        ))}

                        <ellipse
                          cx={node.x}
                          cy={node.y - lanternRy * 0.72}
                          rx={lanternRx * 0.5}
                          ry={node.isMain ? 2.6 : 2.1}
                          fill={capFill}
                          opacity={0.92}
                        />

                        <ellipse
                          cx={node.x}
                          cy={node.y + lanternRy * 0.72}
                          rx={lanternRx * 0.5}
                          ry={node.isMain ? 2.6 : 2.1}
                          fill={capFill}
                          opacity={0.88}
                        />
                      </g>

                      {surfaceFragments.map((fragment, index) => (
                        <rect
                          key={`${node.id}-surface-${index}`}
                          x={fragment.x}
                          y={fragment.y}
                          width={fragment.width}
                          height={fragment.height}
                          fill={
                            fragment.tone === 'burn'
                              ? 'rgba(58, 23, 11, 0.18)'
                              : 'rgba(255, 243, 211, 0.26)'
                          }
                          opacity={fragment.tone === 'burn' ? 0.9 : 0.74}
                          rx={0.8}
                          shapeRendering="crispEdges"
                        />
                      ))}

                      {renderMotif(node, isHovered)}

                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.isMain ? 3.8 : 2.9}
                        fill={mixHex(node.color, 0, 0.62)}
                        opacity={0.5}
                      />

                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.isMain ? 1.9 : 1.4}
                        fill="rgba(255, 248, 230, 0.88)"
                      />

                      <text
                        x={node.tx}
                        y={node.ty}
                        fill="rgba(255, 249, 232, 0.96)"
                        stroke="rgba(255, 249, 232, 0.96)"
                        strokeWidth="10"
                        fontSize={isHovered ? '16' : '14'}
                        fontWeight="700"
                        letterSpacing="0.04em"
                        textAnchor={node.anchor}
                      >
                        {node.text}
                      </text>

                      <text
                        x={node.tx}
                        y={node.ty}
                        fill={isHovered ? palette.ink : palette.cream}
                        fontSize={isHovered ? '16' : '14'}
                        fontWeight="700"
                        letterSpacing="0.04em"
                        textAnchor={node.anchor}
                        style={{ textShadow: '0 1px 0 rgba(255,247,228,0.7)' }}
                      >
                        {node.text}
                      </text>

                      {node.sub ? (
                        <text
                          x={node.tx}
                          y={node.ty + 20}
                          fill={isHovered ? '#724731' : '#946b56'}
                          fontSize="10"
                          fontWeight="600"
                          letterSpacing="0.28em"
                          textAnchor={node.anchor}
                          style={{ textTransform: 'uppercase' }}
                        >
                          {node.sub}
                        </text>
                      ) : null}

                      {node.desc ? (
                        <text
                          x={node.tx}
                          y={node.ty + 18}
                          fill="#8f6a58"
                          fontSize="11"
                          fontWeight="500"
                          textAnchor={node.anchor}
                        >
                          {node.desc}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

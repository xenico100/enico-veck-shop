'use client';

import { useState } from 'react';

const palette = {
  bg: 'transparent',
  surface: 'rgba(255,255,255,0.78)',
  jade: '#d8b06a',
  jadeSoft: '#e6c98c',
  amber: '#ca6a56',
  amberSoft: '#df8b73',
  cobalt: '#a62a2a',
  rose: '#cf7e65',
  cream: '#4f231d',
  ink: '#2f120f'
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

const hashString = (value: string) =>
  value
    .split('')
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 17), 0);

const buildOrganicContourPath = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  amplitude: number,
  steps = 28
) => {
  const points = Array.from({ length: steps }).map((_, index) => {
    const angle = (Math.PI * 2 * index) / steps;
    const rippleA = Math.sin(angle * 3 + seed * 0.017) * amplitude;
    const rippleB = Math.cos(angle * 5 - seed * 0.011) * amplitude * 0.7;
    const rippleC = Math.sin(angle * 9 + seed * 0.031) * amplitude * 0.36;
    const finalRx = rx * (1 + rippleA + rippleC);
    const finalRy = ry * (1 + rippleB - rippleC * 0.55);

    return {
      x: cx + Math.cos(angle) * finalRx,
      y: cy + Math.sin(angle) * finalRy
    };
  });

  return (
    points.reduce((path, point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${path}${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
    }, '') + 'Z'
  );
};

const buildVeinPath = (
  cx: number,
  cy: number,
  ry: number,
  offset: number,
  seed: number
) => {
  const topX = cx + offset * 9.2 + Math.sin(seed * 0.021) * 2.6;
  const topY = cy - ry * 0.72;
  const ctrl1X = cx + offset * 4.8 + Math.cos(seed * 0.014) * 6.8;
  const ctrl1Y = cy - ry * 0.26;
  const ctrl2X = cx + offset * 12.2 - Math.sin(seed * 0.028) * 5.2;
  const ctrl2Y = cy + ry * 0.06;
  const bottomX = cx + offset * 7.4 + Math.cos(seed * 0.017) * 3.6;
  const bottomY = cy + ry * 0.74;

  return `M ${topX.toFixed(2)} ${topY.toFixed(2)} C ${ctrl1X.toFixed(2)} ${ctrl1Y.toFixed(2)}, ${ctrl2X.toFixed(2)} ${ctrl2Y.toFixed(2)}, ${bottomX.toFixed(2)} ${bottomY.toFixed(2)}`;
};

const buildScarPath = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number
) => {
  const startX = cx - rx * 0.58;
  const startY = cy + Math.sin(seed * 0.02) * ry * 0.12;
  const midX = cx + Math.cos(seed * 0.037) * rx * 0.09;
  const midY = cy - ry * 0.06 + Math.sin(seed * 0.018) * 3.2;
  const endX = cx + rx * 0.54;
  const endY = cy + Math.cos(seed * 0.025) * ry * 0.11;

  return `M ${startX.toFixed(2)} ${startY.toFixed(2)} C ${(cx - rx * 0.22).toFixed(2)} ${(cy - ry * 0.22).toFixed(2)}, ${midX.toFixed(2)} ${midY.toFixed(2)}, ${(cx + rx * 0.14).toFixed(2)} ${(cy + ry * 0.16).toFixed(2)} S ${(cx + rx * 0.32).toFixed(2)} ${(cy - ry * 0.12).toFixed(2)}, ${endX.toFixed(2)} ${endY.toFixed(2)}`;
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
  const scale = node.isMain ? 3.18 : 2.52;
  const stroke = mixHex(node.color, 0, 0.82);
  const fill = rgbaFromHex(node.color, isHovered ? 0.24 : 0.16);
  const glowFill = rgbaFromHex(node.color, isHovered ? 0.24 : 0.15);
  const accent = 'rgba(255, 242, 216, 0.78)';
  const lineWidth = node.isMain ? 1.95 : 1.5;
  const centerRadius = node.isMain ? 1.85 : 1.32;
  const ringRadius = node.isMain ? 11.8 : 9.6;
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
  const cueColor = '#a81d2c';
  const cueGlow = 'rgba(216, 53, 76, 0.13)';
  const labelOffsetX = node.id === 'p0' ? 62 : 60;
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
          fill="rgba(255, 250, 248, 0.96)"
          stroke="rgba(255, 250, 248, 0.96)"
          strokeWidth="7"
          fontSize="9.5"
          fontWeight="800"
          letterSpacing="0.08em"
          style={{
            fontFamily: 'var(--font-display-kr), var(--font-brush), serif'
          }}
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
          style={{
            fontFamily: 'var(--font-display-kr), var(--font-brush), serif',
            textTransform: 'uppercase'
          }}
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
  const displayFont = 'var(--font-display-kr), var(--font-brush), serif';
  const monoFont = 'var(--font-mono), monospace';

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
      className="overflow-hidden text-slate-900"
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
        @keyframes organPulse {
          0% { transform: scale(0.985); opacity: 0.12; }
          50% { transform: scale(1.03); opacity: 0.22; }
          100% { transform: scale(0.985); opacity: 0.12; }
        }
        @keyframes mistDrift {
          0% { transform: translate3d(0,0,0) rotate(0deg); }
          50% { transform: translate3d(18px,-14px,0) rotate(5deg); }
          100% { transform: translate3d(0,0,0) rotate(0deg); }
        }
        .grain-overlay {
          background-image:
            radial-gradient(circle at 18% 24%, rgba(110, 35, 35, 0.045) 0%, transparent 18%),
            radial-gradient(circle at 76% 33%, rgba(207, 126, 101, 0.048) 0%, transparent 17%),
            radial-gradient(circle at 48% 72%, rgba(48, 20, 18, 0.035) 0%, transparent 22%),
            repeating-linear-gradient(
              0deg,
              rgba(90, 44, 38, 0.01) 0px,
              rgba(90, 44, 38, 0.01) 1px,
              transparent 1px,
              transparent 5px
            );
          mix-blend-mode: multiply;
          animation: flicker 4s ease-in-out infinite;
        }
      `}</style>

      <div className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-6">
        <div className="relative overflow-hidden rounded-[42px_64px_40px_60px/36px_54px_34px_58px] border border-[rgba(173,35,35,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(249,244,241,0.92))] shadow-[0_28px_64px_rgba(132,38,38,0.08)]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute -left-20 top-10 h-80 w-80 rounded-full blur-3xl"
              style={{
                background: 'rgba(196, 62, 62, 0.06)',
                animation: 'driftA 10s ease-in-out infinite'
              }}
            />
            <div
              className="absolute right-[-80px] top-[22%] h-96 w-96 rounded-full blur-3xl"
              style={{
                background: 'rgba(210, 140, 90, 0.05)',
                animation: 'driftB 12s ease-in-out infinite'
              }}
            />
            <div
              className="absolute left-[28%] top-[46%] h-72 w-72 rounded-full blur-3xl"
              style={{
                background: 'rgba(151, 179, 101, 0.05)',
                animation: 'driftA 14s ease-in-out infinite'
              }}
            />
            <div
              className="absolute left-[12%] top-[12%] h-[16rem] w-[20rem] rounded-full blur-3xl"
              style={{
                background: 'rgba(198, 82, 82, 0.04)',
                animation: 'mistDrift 18s ease-in-out infinite'
              }}
            />
            <div
              className="absolute right-[10%] top-[44%] h-[20rem] w-[18rem] rounded-full blur-3xl"
              style={{
                background: 'rgba(89, 117, 43, 0.045)',
                animation: 'mistDrift 22s ease-in-out infinite'
              }}
            />
            <div
              className="grain-overlay absolute inset-0"
              style={{ opacity: 0.08 }}
            />
          </div>

          <div className="relative z-10 px-4 pb-4 pt-5 sm:px-6 sm:pb-6 sm:pt-6 md:px-8 md:pb-8">
            <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="section-kicker !text-[rgba(150,36,36,0.8)]">
                  Workflow Tissue Map
                </p>
                <h3 className="mt-2 text-[clamp(1.45rem,2.8vw,2.25rem)] font-semibold tracking-[0.04em] text-[rgba(67,11,11,0.94)]">
                  제작 흐름과 업로드 구조를 한 몸처럼 연결한 아카이브
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[rgba(97,49,49,0.68)] md:text-[15px]">
                  의류 제작, 영상 제작, 플랫폼 업로드가 따로 노는 다이어그램이
                  아니라 하나의 생체 흐름처럼 이어지도록 정리한 실사용 맵이다.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.24em] text-[rgba(134,55,55,0.72)]">
                <span className="rounded-full border border-[rgba(171,48,48,0.18)] bg-white/70 px-3 py-1.5">
                  Fabric / Edit / Upload
                </span>
                <span className="rounded-full border border-[rgba(123,153,73,0.18)] bg-[rgba(245,250,239,0.82)] px-3 py-1.5">
                  Clinical Archive
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[32px_44px_30px_48px/28px_42px_30px_44px] border border-[rgba(176,46,46,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(251,247,244,0.78))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] sm:p-5">
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
                    <stop offset="0%" stopColor="#f2dfba" />
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
                  <filter
                    id="organicWarp"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency="0.018 0.032"
                      numOctaves="2"
                      seed="11"
                      result="noise"
                    />
                    <feDisplacementMap
                      in="SourceGraphic"
                      in2="noise"
                      scale="11"
                      xChannelSelector="R"
                      yChannelSelector="G"
                    />
                  </filter>
                  <filter
                    id="smearBloom"
                    x="-100%"
                    y="-100%"
                    width="300%"
                    height="300%"
                  >
                    <feGaussianBlur stdDeviation="7" result="blur" />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="1 0 0 0 0
                              0 1 0 0 0
                              0 0 1 0 0
                              0 0 0 1.25 0"
                    />
                  </filter>
                </defs>

                <ellipse
                  cx="220"
                  cy="380"
                  rx="170"
                  ry="120"
                  fill="rgba(180, 105, 86, 0.045)"
                  filter="url(#softBlur)"
                />
                <ellipse
                  cx="575"
                  cy="1180"
                  rx="170"
                  ry="130"
                  fill="rgba(206, 90, 63, 0.04)"
                  filter="url(#softBlur)"
                />
                <ellipse
                  cx="570"
                  cy="1530"
                  rx="180"
                  ry="140"
                  fill="rgba(174, 192, 116, 0.04)"
                  filter="url(#softBlur)"
                />

                {paths.map((path, index) => {
                  const isMain = path.type === 'main';
                  const isBranch = path.type === 'branch';
                  const glowColor = path.color.startsWith('url(')
                    ? 'rgba(181, 93, 65, 0.62)'
                    : path.color;
                  const warmMembrane = isMain
                    ? 'rgba(255, 250, 241, 0.54)'
                    : isBranch
                      ? 'rgba(255, 248, 239, 0.4)'
                      : 'rgba(255, 248, 239, 0.3)';
                  const emberVein = isMain
                    ? 'rgba(125, 46, 27, 0.16)'
                    : 'rgba(125, 46, 27, 0.08)';

                  return (
                    <g key={index}>
                      {isMain ? (
                        <>
                          <path
                            d={path.d}
                            fill="none"
                            stroke="rgba(222, 170, 109, 0.12)"
                            strokeWidth={path.width + 24}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#softBlur)"
                          />
                          <path
                            d={path.d}
                            fill="none"
                            stroke="rgba(143, 51, 35, 0.07)"
                            strokeWidth={path.width + 34}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#softBlur)"
                          />
                          <path
                            d={path.d}
                            fill="none"
                            stroke="rgba(197, 95, 70, 0.2)"
                            strokeWidth={path.width + 10}
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
                      <path
                        d={path.d}
                        fill="none"
                        stroke={warmMembrane}
                        strokeWidth={isMain ? 2.8 : 1.15}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={isMain ? 0.86 : isBranch ? 0.72 : 0.58}
                      />
                      <path
                        d={path.d}
                        fill="none"
                        stroke={emberVein}
                        strokeWidth={isMain ? 1.1 : 0.62}
                        strokeDasharray={isMain ? '10 17' : '7 12'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.86}
                      />
                    </g>
                  );
                })}

                {nodes.map((node) => {
                  const isHovered = hoveredNode === node.id;
                  const isActionNode = node.id === 'c0' || node.id === 'p0';
                  const nodeSeed = hashString(node.id);
                  const baseRadius = node.isMain ? 18 : 12;
                  const hoverRadius = node.isMain ? 24 : 16.5;
                  const glowRadius = node.isMain ? 48 : 34;
                  const lanternRx =
                    (isHovered ? hoverRadius : baseRadius) +
                    (node.isMain ? 10.5 : 7.5);
                  const lanternRy = lanternRx + (node.isMain ? 8.5 : 5.4);
                  const lanternGlow = isHovered
                    ? glowRadius + 13
                    : glowRadius + 5;
                  const lanternGradientId = `lantern-paper-${node.id}`;
                  const lanternCoreId = `lantern-core-${node.id}`;
                  const lanternMaskId = `lantern-mask-${node.id}`;
                  const lanternMembraneId = `lantern-membrane-${node.id}`;
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
                  const membraneOuterPath = buildOrganicContourPath(
                    node.x,
                    node.y,
                    lanternRx + (node.isMain ? 6 : 4),
                    lanternRy + (node.isMain ? 8 : 5),
                    nodeSeed,
                    node.isMain ? 0.095 : 0.082,
                    node.isMain ? 34 : 26
                  );
                  const membraneInnerPath = buildOrganicContourPath(
                    node.x,
                    node.y,
                    lanternRx * 0.92,
                    lanternRy * 0.91,
                    nodeSeed + 23,
                    node.isMain ? 0.06 : 0.05,
                    node.isMain ? 30 : 24
                  );
                  const auraPath = buildOrganicContourPath(
                    node.x,
                    node.y,
                    lanternGlow + (node.isMain ? 5 : 3),
                    lanternGlow + (node.isMain ? 10 : 6),
                    nodeSeed + 41,
                    node.isMain ? 0.11 : 0.08,
                    node.isMain ? 36 : 28
                  );
                  const veinPaths = [-0.62, -0.18, 0.22, 0.56].map(
                    (offset, index) =>
                      buildVeinPath(
                        node.x,
                        node.y,
                        lanternRy,
                        offset,
                        nodeSeed + index * 29
                      )
                  );
                  const scarPaths = [0, 1].map((index) =>
                    buildScarPath(
                      node.x,
                      node.y +
                        (index === 0 ? -lanternRy * 0.12 : lanternRy * 0.14),
                      lanternRx * (index === 0 ? 0.94 : 0.82),
                      lanternRy * 0.24,
                      nodeSeed + index * 57
                    )
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
                        <radialGradient
                          id={lanternMembraneId}
                          cx="50%"
                          cy="38%"
                          r="84%"
                        >
                          <stop
                            offset="0%"
                            stopColor="rgba(255, 247, 226, 0.88)"
                          />
                          <stop
                            offset="52%"
                            stopColor={rgbaFromHex(node.color, 0.18)}
                          />
                          <stop
                            offset="100%"
                            stopColor="rgba(32, 15, 10, 0.08)"
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

                      <path
                        d={auraPath}
                        fill={rgbaFromHex(node.color, isHovered ? 0.18 : 0.12)}
                        filter="url(#smearBloom)"
                        opacity={node.isMain ? 0.9 : 0.76}
                        style={{
                          transformOrigin: `${node.x}px ${node.y}px`,
                          animation: 'organPulse 4.2s ease-in-out infinite'
                        }}
                      />

                      <ellipse
                        cx={node.x}
                        cy={node.y + lanternRy * 0.1}
                        rx={lanternGlow * 0.78}
                        ry={lanternGlow * 0.34}
                        fill="rgba(46, 16, 11, 0.1)"
                        filter="url(#softBlur)"
                      />

                      {node.isMain ? (
                        <path
                          d={buildOrganicContourPath(
                            node.x,
                            node.y,
                            lanternRx + 11,
                            lanternRy + 13,
                            nodeSeed + 71,
                            0.085,
                            36
                          )}
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
                        <path
                          d={membraneOuterPath}
                          fill={`url(#${lanternGradientId})`}
                          stroke={rgbaFromHex(node.color, 0.78)}
                          strokeWidth={node.isMain ? '1.9' : '1.5'}
                          filter="url(#organicWarp)"
                          style={{
                            filter: `drop-shadow(0 0 ${node.isMain ? 20 : 12}px ${glowColor})`
                          }}
                        />

                        <path
                          d={membraneInnerPath}
                          fill={`url(#${lanternMembraneId})`}
                          opacity={0.62}
                          filter="url(#organicWarp)"
                        />

                        <ellipse
                          cx={node.x}
                          cy={node.y - lanternRy * 0.14}
                          rx={lanternRx * 0.5}
                          ry={lanternRy * 0.44}
                          fill={`url(#${lanternCoreId})`}
                          opacity={0.56}
                        />

                        {veinPaths.map((veinPath, index) => (
                          <path
                            key={`${node.id}-vein-${index}`}
                            d={veinPath}
                            fill="none"
                            stroke={
                              index % 2 === 0
                                ? ribStroke
                                : rgbaFromHex(node.color, 0.26)
                            }
                            strokeWidth={index % 2 === 0 ? 0.92 : 0.72}
                            strokeLinecap="round"
                            opacity={index % 2 === 0 ? 0.88 : 0.74}
                          />
                        ))}

                        {scarPaths.map((scarPath, index) => (
                          <path
                            key={`${node.id}-scar-${index}`}
                            d={scarPath}
                            fill="none"
                            stroke={
                              index === 0
                                ? 'rgba(59, 17, 11, 0.24)'
                                : 'rgba(255, 242, 214, 0.22)'
                            }
                            strokeWidth={index === 0 ? 1.15 : 0.85}
                            strokeLinecap="round"
                            opacity={0.9}
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

                      <path
                        d={membraneOuterPath}
                        fill="none"
                        stroke="rgba(255, 252, 246, 0.5)"
                        strokeWidth={node.isMain ? 0.92 : 0.74}
                        opacity={0.88}
                        filter="url(#organicWarp)"
                      />

                      {surfaceFragments.map((fragment, index) => (
                        <rect
                          key={`${node.id}-surface-${index}`}
                          x={fragment.x}
                          y={fragment.y}
                          width={fragment.width}
                          height={fragment.height}
                          fill={
                            fragment.tone === 'burn'
                              ? 'rgba(53, 18, 11, 0.22)'
                              : 'rgba(255, 247, 224, 0.28)'
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
                        r={node.isMain ? 4.4 : 3.2}
                        fill={mixHex(node.color, 0, 0.62)}
                        opacity={0.56}
                      />

                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.isMain ? 2.3 : 1.7}
                        fill="rgba(255, 248, 230, 0.88)"
                      />

                      <text
                        x={node.tx}
                        y={node.ty}
                        fill="rgba(255, 252, 248, 0.96)"
                        stroke="rgba(255, 252, 248, 0.96)"
                        strokeWidth="8"
                        fontSize={isHovered ? '16' : '14'}
                        fontWeight="700"
                        letterSpacing="0.04em"
                        textAnchor={node.anchor}
                        style={{ fontFamily: displayFont }}
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
                        style={{
                          fontFamily: displayFont,
                          textShadow: '0 1px 0 rgba(255,250,246,0.72)'
                        }}
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
                          style={{
                            fontFamily: monoFont,
                            textTransform: 'uppercase'
                          }}
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
                          style={{ fontFamily: monoFont }}
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

'use client';

import { useState } from 'react';

const palette = {
  bg: '#f7f7f2',
  bgDeep: '#f7f7f2',
  surface: 'transparent',
  surfaceLine: 'rgba(15,23,42,0.08)',
  jade: '#44f1a6',
  jadeSoft: '#2ccf95',
  amber: '#ffc06b',
  amberSoft: '#ff9e57',
  cobalt: '#5aa3ff',
  rose: '#ff7a6e',
  cream: '#111827',
  fog: '#6b7280',
  ink: '#0f172a'
} as const;

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
};

type WorkflowHeistTimelineProps = {
  onTabRequest?: (target: 'system' | 'production') => void;
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
    isMain: true
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
    isMain: true
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
    isMain: true
  },
  {
    id: 'c1',
    text: '원부자재 발주',
    x: 255,
    y: 260,
    tx: 232,
    ty: 265,
    anchor: 'end',
    color: palette.jade
  },
  {
    id: 'c2',
    text: 'CLO 3D 설계',
    x: 545,
    y: 370,
    tx: 568,
    ty: 375,
    anchor: 'start',
    color: palette.jade
  },
  {
    id: 'c3',
    text: '데이터 저장',
    x: 255,
    y: 480,
    tx: 232,
    ty: 485,
    anchor: 'end',
    color: palette.jade
  },
  {
    id: 'c4',
    text: '실물 제작',
    x: 545,
    y: 590,
    tx: 568,
    ty: 595,
    anchor: 'start',
    color: palette.jade
  },
  {
    id: 'v1',
    text: '제품 촬영',
    x: 255,
    y: 865,
    tx: 232,
    ty: 870,
    anchor: 'end',
    color: palette.rose
  },
  {
    id: 'v2',
    text: '촬영/소스 정리',
    x: 545,
    y: 975,
    tx: 568,
    ty: 980,
    anchor: 'start',
    color: palette.rose
  },
  {
    id: 'v3',
    text: '컷 편집',
    x: 255,
    y: 1085,
    tx: 232,
    ty: 1090,
    anchor: 'end',
    color: palette.rose
  },
  {
    id: 'v4',
    text: '자막/사운드',
    x: 545,
    y: 1195,
    tx: 568,
    ty: 1200,
    anchor: 'start',
    color: palette.rose
  },
  {
    id: 'v5',
    text: '최종 출력',
    x: 255,
    y: 1280,
    tx: 232,
    ty: 1285,
    anchor: 'end',
    color: palette.rose
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
    color: palette.jade,
    isMain: true
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
    color: palette.jade
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
    color: palette.jade
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
    color: palette.jade
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
    color: palette.amber,
    isMain: true
  },
  {
    id: 'e1',
    text: '상품 등록',
    x: 490,
    y: 1470,
    tx: 468,
    ty: 1475,
    anchor: 'end',
    color: palette.amber
  },
  {
    id: 'e2',
    text: '이미지 업로드',
    x: 690,
    y: 1525,
    tx: 712,
    ty: 1530,
    anchor: 'start',
    color: palette.amber
  },
  {
    id: 'e3',
    text: '사이즈표 기재',
    x: 490,
    y: 1580,
    tx: 468,
    ty: 1585,
    anchor: 'end',
    color: palette.amber
  },
  {
    id: 'e4',
    text: '상품 설명',
    x: 690,
    y: 1635,
    tx: 712,
    ty: 1640,
    anchor: 'start',
    color: palette.amber
  },
  {
    id: 'e5',
    text: '결제 연결',
    x: 490,
    y: 1690,
    tx: 468,
    ty: 1695,
    anchor: 'end',
    color: palette.amber
  },
  {
    id: 'e6',
    text: '상품 오픈',
    x: 690,
    y: 1745,
    tx: 712,
    ty: 1750,
    anchor: 'start',
    color: palette.amber
  },
  {
    id: 'e7',
    text: '영어권 숏폼',
    x: 490,
    y: 1800,
    tx: 468,
    ty: 1805,
    anchor: 'end',
    color: palette.amber
  }
];

export default function WorkflowHeistTimeline({
  onTabRequest
}: WorkflowHeistTimelineProps) {
  const [hoveredNode, setHoveredNode] = useState<string>('p0');

  const handleNodeClick = (nodeId: string) => {
    if (nodeId === 'c0' || nodeId === 'v0') {
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
            linear-gradient(to bottom, rgba(255,255,255,0.26), rgba(255,255,255,0.12)),
            repeating-linear-gradient(
              to bottom,
              rgba(15,23,42,0.02) 0px,
              rgba(15,23,42,0.02) 1px,
              transparent 1px,
              transparent 5px
            );
          mix-blend-mode: multiply;
          animation: flicker 4s ease-in-out infinite;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-20 top-10 h-80 w-80 rounded-full blur-3xl"
          style={{
            background: 'rgba(68,241,166,0.14)',
            animation: 'driftA 10s ease-in-out infinite'
          }}
        />
        <div
          className="absolute right-[-80px] top-[22%] h-96 w-96 rounded-full blur-3xl"
          style={{
            background: 'rgba(255,192,107,0.14)',
            animation: 'driftB 12s ease-in-out infinite'
          }}
        />
        <div
          className="absolute left-[28%] top-[46%] h-72 w-72 rounded-full blur-3xl"
          style={{
            background: 'rgba(90,163,255,0.1)',
            animation: 'driftA 14s ease-in-out infinite'
          }}
        />
        <div
          className="grain-overlay absolute inset-0"
          style={{ opacity: 0.18 }}
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
                    <stop offset="0%" stopColor={palette.jade} />
                    <stop offset="55%" stopColor={palette.cobalt} />
                    <stop offset="100%" stopColor={palette.amber} />
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
                  fill="rgba(68,241,166,0.09)"
                  filter="url(#softBlur)"
                />
                <ellipse
                  cx="575"
                  cy="1180"
                  rx="170"
                  ry="130"
                  fill="rgba(255,122,110,0.09)"
                  filter="url(#softBlur)"
                />
                <ellipse
                  cx="570"
                  cy="1530"
                  rx="180"
                  ry="140"
                  fill="rgba(255,192,107,0.08)"
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
                            stroke="rgba(90,163,255,0.16)"
                            strokeWidth={path.width + 18}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#softBlur)"
                          />
                          <path
                            d={path.d}
                            fill="none"
                            stroke="rgba(90,163,255,0.28)"
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
                  const baseRadius = node.isMain ? 13 : 8;
                  const hoverRadius = node.isMain ? 18 : 12;
                  const glowRadius = node.isMain ? 34 : 24;

                  return (
                    <g
                      key={node.id}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode('p0')}
                      onClick={() => handleNodeClick(node.id)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isHovered ? glowRadius : glowRadius - 6}
                        fill={node.color}
                        opacity={isHovered ? 0.16 : 0.08}
                        filter="url(#softBlur)"
                      />

                      {node.isMain ? (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isHovered ? 24 : 20}
                          fill="none"
                          stroke={node.color}
                          strokeWidth="1.5"
                          opacity={isHovered ? 0.42 : 0.18}
                          style={{
                            transformOrigin: `${node.x}px ${node.y}px`,
                            animation: 'pulseRing 2.8s ease-in-out infinite'
                          }}
                        />
                      ) : null}

                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isHovered ? hoverRadius : baseRadius}
                        fill="rgba(5,8,11,0.95)"
                        stroke={node.color}
                        strokeWidth={node.isMain ? '3.5' : '2.4'}
                        filter="url(#nodeGlow)"
                      />

                      <text
                        x={node.tx}
                        y={node.ty}
                        fill="rgba(255,255,255,0.92)"
                        stroke="rgba(255,255,255,0.92)"
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
                        style={{ textShadow: '0 1px 0 rgba(255,255,255,0.55)' }}
                      >
                        {node.text}
                      </text>

                      {node.sub ? (
                        <text
                          x={node.tx}
                          y={node.ty + 20}
                          fill={isHovered ? '#475569' : '#64748b'}
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
                          fill="#64748b"
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

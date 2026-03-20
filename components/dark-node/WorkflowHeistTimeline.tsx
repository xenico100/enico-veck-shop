'use client';

import { useState } from 'react';

type PathSpec = {
  d: string;
  color: string;
  width: number;
  type?: 'main' | 'branch' | 'spike';
};

type NodeSpec = {
  id: string;
  text: string;
  desc?: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  anchor: 'start' | 'middle' | 'end';
  color: string;
  isMain?: boolean;
};

const CANVAS_BG = '#101322';
const TEXT_BG = '#101322';

const PATHS: PathSpec[] = [
  { d: 'M 400 100 L 400 1250', color: '#818cf8', width: 16, type: 'main' },
  {
    d: 'M 400 1250 C 400 1300, 200 1300, 200 1350 L 200 1700',
    color: '#2dd4bf',
    width: 10,
    type: 'branch'
  },
  {
    d: 'M 400 1250 C 400 1300, 600 1300, 600 1350 L 600 1750',
    color: '#fbbf24',
    width: 10,
    type: 'branch'
  },
  { d: 'M 400 200 L 250 250', color: '#4ade80', width: 3, type: 'spike' },
  { d: 'M 400 300 L 550 350', color: '#4ade80', width: 3, type: 'spike' },
  { d: 'M 400 400 L 250 450', color: '#4ade80', width: 3, type: 'spike' },
  { d: 'M 400 500 L 550 550', color: '#4ade80', width: 3, type: 'spike' },
  { d: 'M 400 800 L 250 850', color: '#f87171', width: 3, type: 'spike' },
  { d: 'M 400 900 L 550 950', color: '#f87171', width: 3, type: 'spike' },
  { d: 'M 400 1000 L 250 1050', color: '#f87171', width: 3, type: 'spike' },
  { d: 'M 400 1100 L 550 1150', color: '#f87171', width: 3, type: 'spike' },
  { d: 'M 400 1200 L 250 1250', color: '#f87171', width: 3, type: 'spike' },
  { d: 'M 200 1450 L 100 1500', color: '#2dd4bf', width: 3, type: 'spike' },
  { d: 'M 200 1550 L 300 1600', color: '#2dd4bf', width: 3, type: 'spike' },
  { d: 'M 200 1650 L 100 1700', color: '#2dd4bf', width: 3, type: 'spike' },
  { d: 'M 600 1400 L 500 1450', color: '#fbbf24', width: 3, type: 'spike' },
  { d: 'M 600 1450 L 700 1500', color: '#fbbf24', width: 3, type: 'spike' },
  { d: 'M 600 1500 L 500 1550', color: '#fbbf24', width: 3, type: 'spike' },
  { d: 'M 600 1550 L 700 1600', color: '#fbbf24', width: 3, type: 'spike' },
  { d: 'M 600 1600 L 500 1650', color: '#fbbf24', width: 3, type: 'spike' },
  { d: 'M 600 1650 L 700 1700', color: '#fbbf24', width: 3, type: 'spike' },
  { d: 'M 600 1700 L 500 1750', color: '#fbbf24', width: 3, type: 'spike' }
];

const NODES: NodeSpec[] = [
  {
    id: 'c0',
    text: '[의류제작 시작]',
    x: 400,
    y: 100,
    tx: 400,
    ty: 60,
    anchor: 'middle',
    color: '#4ade80',
    isMain: true
  },
  {
    id: 'v0',
    text: '[영상제작 시작]',
    x: 400,
    y: 700,
    tx: 400,
    ty: 660,
    anchor: 'middle',
    color: '#f87171',
    isMain: true
  },
  {
    id: 'p0',
    text: '[플랫폼 업로드]',
    x: 400,
    y: 1250,
    tx: 400,
    ty: 1210,
    anchor: 'middle',
    color: '#818cf8',
    isMain: true
  },
  {
    id: 'c1',
    text: '원부자재 발주',
    x: 250,
    y: 250,
    tx: 230,
    ty: 255,
    anchor: 'end',
    color: '#4ade80'
  },
  {
    id: 'c2',
    text: 'CLO 3D 설계',
    x: 550,
    y: 350,
    tx: 570,
    ty: 355,
    anchor: 'start',
    color: '#4ade80'
  },
  {
    id: 'c3',
    text: '데이터 저장',
    x: 250,
    y: 450,
    tx: 230,
    ty: 455,
    anchor: 'end',
    color: '#4ade80'
  },
  {
    id: 'c4',
    text: '실물 제작',
    x: 550,
    y: 550,
    tx: 570,
    ty: 555,
    anchor: 'start',
    color: '#4ade80'
  },
  {
    id: 'v1',
    text: '제품 촬영',
    x: 250,
    y: 850,
    tx: 230,
    ty: 855,
    anchor: 'end',
    color: '#f87171'
  },
  {
    id: 'v2',
    text: '촬영/소스 정리',
    x: 550,
    y: 950,
    tx: 570,
    ty: 955,
    anchor: 'start',
    color: '#f87171'
  },
  {
    id: 'v3',
    text: '컷 편집',
    x: 250,
    y: 1050,
    tx: 230,
    ty: 1055,
    anchor: 'end',
    color: '#f87171'
  },
  {
    id: 'v4',
    text: '자막/사운드',
    x: 550,
    y: 1150,
    tx: 570,
    ty: 1155,
    anchor: 'start',
    color: '#f87171'
  },
  {
    id: 'v5',
    text: '최종 출력',
    x: 250,
    y: 1250,
    tx: 230,
    ty: 1255,
    anchor: 'end',
    color: '#f87171'
  },
  {
    id: 'm0',
    text: '[몽상인 채널]',
    x: 200,
    y: 1350,
    tx: 200,
    ty: 1310,
    anchor: 'middle',
    color: '#2dd4bf',
    isMain: true
  },
  {
    id: 'm1',
    text: 'YouTube',
    desc: '(롱/숏폼)',
    x: 100,
    y: 1500,
    tx: 80,
    ty: 1505,
    anchor: 'end',
    color: '#2dd4bf'
  },
  {
    id: 'm2',
    text: 'Instagram',
    desc: '(롱/숏폼)',
    x: 300,
    y: 1600,
    tx: 320,
    ty: 1605,
    anchor: 'start',
    color: '#2dd4bf'
  },
  {
    id: 'm3',
    text: 'TikTok',
    desc: '(롱/숏폼)',
    x: 100,
    y: 1700,
    tx: 80,
    ty: 1705,
    anchor: 'end',
    color: '#2dd4bf'
  },
  {
    id: 'e0',
    text: '[enicoveck]',
    x: 600,
    y: 1350,
    tx: 600,
    ty: 1310,
    anchor: 'middle',
    color: '#fbbf24',
    isMain: true
  },
  {
    id: 'e1',
    text: '상품 등록',
    x: 500,
    y: 1450,
    tx: 480,
    ty: 1455,
    anchor: 'end',
    color: '#fbbf24'
  },
  {
    id: 'e2',
    text: '이미지 업로드',
    x: 700,
    y: 1500,
    tx: 720,
    ty: 1505,
    anchor: 'start',
    color: '#fbbf24'
  },
  {
    id: 'e3',
    text: '사이즈표 기재',
    x: 500,
    y: 1550,
    tx: 480,
    ty: 1555,
    anchor: 'end',
    color: '#fbbf24'
  },
  {
    id: 'e4',
    text: '상품 설명',
    x: 700,
    y: 1600,
    tx: 720,
    ty: 1605,
    anchor: 'start',
    color: '#fbbf24'
  },
  {
    id: 'e5',
    text: '결제 연결',
    x: 500,
    y: 1650,
    tx: 480,
    ty: 1655,
    anchor: 'end',
    color: '#fbbf24'
  },
  {
    id: 'e6',
    text: '상품 오픈',
    x: 700,
    y: 1700,
    tx: 720,
    ty: 1705,
    anchor: 'start',
    color: '#fbbf24'
  },
  {
    id: 'e7',
    text: '영어권 숏폼',
    x: 500,
    y: 1750,
    tx: 480,
    ty: 1755,
    anchor: 'end',
    color: '#fbbf24'
  }
];

export default function WorkflowHeistTimeline() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <section className="mb-6 md:mb-8">
      <div className="tech-panel scanline overflow-hidden p-4 sm:p-5 md:p-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-6">
          <div>
            <p className="section-kicker">Workflow Heist</p>
            <h3 className="display-font mt-2 text-[1.35rem] font-semibold tracking-[0.05em] text-stone-950 sm:text-[1.85rem] md:text-[2.2rem]">
              디자이너 브랜드 세로형 실행 워크플로우
            </h3>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-[0.22em] text-stone-500">
            garment build / video pipeline / platform release
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.6rem] border border-stone-900/10 bg-[#eff4fb]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(76,93,255,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.14),transparent_30%),linear-gradient(180deg,#1b2138_0%,#101322_44%,#0b0d18_100%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />
          <div className="pointer-events-none absolute inset-y-8 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          <div className="pointer-events-none absolute left-6 top-6 z-10 border border-white/15 bg-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
            mongsangin execution map
          </div>

          <div className="relative overflow-x-auto">
            <div className="mx-auto min-w-[760px] p-3 sm:p-4 md:p-6">
              <svg
                viewBox="0 0 800 1850"
                className="h-auto w-full"
                style={{
                  filter: 'drop-shadow(0 18px 36px rgba(0, 0, 0, 0.28))'
                }}
              >
                <defs>
                  <radialGradient id="workflow-glow" cx="50%" cy="0%" r="85%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                </defs>

                <rect
                  x="0"
                  y="0"
                  width="800"
                  height="1850"
                  fill="url(#workflow-glow)"
                />

                {PATHS.map((path, idx) => {
                  const blurStrength =
                    path.type === 'main' ? 16 : path.type === 'branch' ? 11 : 6;

                  return (
                    <path
                      key={`path-${idx}`}
                      d={path.d}
                      fill="none"
                      stroke={path.color}
                      strokeWidth={path.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={path.type === 'spike' ? 0.86 : 0.94}
                      style={{
                        filter: `drop-shadow(0 0 ${blurStrength}px ${path.color})`
                      }}
                    />
                  );
                })}

                {NODES.map((node) => {
                  const isHovered = hoveredNode === node.id;
                  const baseRadius = node.isMain ? 12 : 8;
                  const hoverRadius = node.isMain ? 16 : 12;

                  return (
                    <g
                      key={node.id}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isHovered ? hoverRadius : baseRadius}
                        fill={CANVAS_BG}
                        stroke={node.color}
                        strokeWidth={node.isMain ? 4 : 3}
                        style={{
                          filter: `drop-shadow(0 0 10px ${node.color})`
                        }}
                      />

                      <text
                        x={node.tx}
                        y={node.ty}
                        fill={TEXT_BG}
                        stroke={TEXT_BG}
                        strokeWidth="10"
                        strokeLinejoin="round"
                        fontSize={isHovered ? '16' : '14'}
                        fontWeight="700"
                        textAnchor={node.anchor}
                        className="pointer-events-none transition-all duration-300"
                      >
                        {node.text}
                      </text>

                      <text
                        x={node.tx}
                        y={node.ty}
                        fill={isHovered ? '#ffffff' : '#e7edf9'}
                        fontSize={isHovered ? '16' : '14'}
                        fontWeight="700"
                        textAnchor={node.anchor}
                        className="pointer-events-none transition-all duration-300"
                        style={{
                          textShadow: '0 2px 10px rgba(0, 0, 0, 0.55)'
                        }}
                      >
                        {node.text}
                      </text>

                      {node.desc ? (
                        <text
                          x={node.tx}
                          y={node.ty + 20}
                          fill="#94a3b8"
                          fontSize="12"
                          fontWeight="500"
                          textAnchor={node.anchor}
                          className="pointer-events-none"
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
    </section>
  );
}

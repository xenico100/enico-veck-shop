'use client';

import { useState } from 'react';

import {
  BOARD,
  BoardMark,
  type BoardMarkVariant,
  type BoardTone
} from '@/components/dark-node/board-theme';

type FlowType = 'data' | 'image' | 'auth' | 'payment' | 'admin' | 'repo';

type NodeSpec = {
  id: string;
  label: string;
  sublabel?: string;
  tag: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tone: BoardTone;
  mark: BoardMarkVariant;
};

type ConnectionSpec = {
  flow: FlowType;
  label?: string;
  wp: [number, number][];
};

const NODE_COLORS: Record<BoardTone, string> = {
  ink: '#4f7daa',
  wood: '#5d7460',
  rust: '#b52930',
  gold: '#b69143',
  neutral: '#7f8b97'
};

export const ARCH_FLOW_COLORS: Record<FlowType, string> = {
  data: '#4f7daa',
  image: '#5d7460',
  auth: '#b69143',
  payment: '#d07f44',
  admin: '#b52930',
  repo: '#7f8b97'
};

export const ARCH_SVG_WIDTH = 1300;
export const ARCH_SVG_HEIGHT = 840;

export function ArchitectureDiagram() {
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const [hoverConn, setHoverConn] = useState<number | null>(null);

  const nodes: NodeSpec[] = [
    { id: 'admin', label: '관리자 업로드', sublabel: '운영 입력', tag: '운영', x: 30, y: 45, w: 170, h: 85, tone: 'rust', mark: 'seal' },
    { id: 'google', label: 'Google 로그인', sublabel: '외부 인증', tag: '인증', x: 305, y: 45, w: 178, h: 85, tone: 'gold', mark: 'hall' },
    { id: 'user', label: '사용자', sublabel: '브라우저 진입', tag: '주체', x: 30, y: 240, w: 160, h: 88, tone: 'ink', mark: 'stone' },
    { id: 'nextjs', label: 'Next.js 웹사이트', sublabel: '앱 라우터', tag: '핵심', x: 260, y: 240, w: 185, h: 88, tone: 'ink', mark: 'branch' },
    { id: 'vercel', label: 'Vercel 배포', sublabel: '실행 환경', tag: '배포', x: 520, y: 240, w: 170, h: 88, tone: 'neutral', mark: 'hall' },
    { id: 'supa', label: 'Supabase', sublabel: '백엔드 기둥', tag: '데이터', x: 762, y: 170, w: 200, h: 78, tone: 'wood', mark: 'ledger' },
    { id: 'supa-auth', label: 'Auth 인증', sublabel: '사용자 식별', tag: '인증', x: 772, y: 266, w: 180, h: 62, tone: 'gold', mark: 'hall' },
    { id: 'supa-session', label: '세션 / 사용자', sublabel: '상태 보관', tag: '기록', x: 772, y: 342, w: 180, h: 62, tone: 'wood', mark: 'ledger' },
    { id: 'supa-db', label: '상품/주문 데이터', sublabel: '핵심 행 자료', tag: '기록', x: 772, y: 418, w: 180, h: 62, tone: 'wood', mark: 'ledger' },
    { id: 'supa-admin', label: '관리자 데이터', sublabel: '메타 정보', tag: '기록', x: 772, y: 494, w: 180, h: 62, tone: 'wood', mark: 'ledger' },
    { id: 'r2', label: 'Cloudflare R2', sublabel: '이미지 저장소', tag: '저장', x: 1042, y: 170, w: 195, h: 78, tone: 'gold', mark: 'seal' },
    { id: 'r2-prod', label: 'Product Images', sublabel: '상품 자산', tag: '자산', x: 1052, y: 266, w: 175, h: 62, tone: 'gold', mark: 'grid' },
    { id: 'r2-coll', label: 'Collection Images', sublabel: '컬렉션 자산', tag: '자산', x: 1052, y: 342, w: 175, h: 62, tone: 'gold', mark: 'grid' },
    { id: 'r2-pub', label: 'Public Assets', sublabel: '정적 배포', tag: '자산', x: 1052, y: 418, w: 175, h: 62, tone: 'gold', mark: 'grid' },
    { id: 'nice', label: 'Nice Payments 결제', sublabel: '국내 결제', tag: '결제', x: 110, y: 450, w: 200, h: 85, tone: 'gold', mark: 'cart' },
    { id: 'paypal', label: 'PayPal 결제', sublabel: '해외 결제', tag: '결제', x: 375, y: 450, w: 175, h: 85, tone: 'gold', mark: 'cart' },
    { id: 'repo', label: '개발 소스 구조', sublabel: 'real_enico', tag: '원본', x: 30, y: 640, w: 190, h: 75, tone: 'neutral', mark: 'grid' },
    { id: 'r-src', label: 'src/', sublabel: '앱 소스', tag: '폴더', x: 40, y: 735, w: 95, h: 55, tone: 'neutral', mark: 'grid' },
    { id: 'r-pub', label: 'public/', sublabel: '정적 자산', tag: '폴더', x: 150, y: 735, w: 95, h: 55, tone: 'neutral', mark: 'grid' },
    { id: 'r-sql', label: 'sql/', sublabel: '스키마', tag: '폴더', x: 260, y: 735, w: 95, h: 55, tone: 'neutral', mark: 'ledger' },
    { id: 'r-supa', label: 'supabase/', sublabel: '설정', tag: '폴더', x: 370, y: 735, w: 95, h: 55, tone: 'neutral', mark: 'ledger' },
    { id: 'r-tool', label: 'tools/', sublabel: '도구', tag: '폴더', x: 480, y: 735, w: 95, h: 55, tone: 'neutral', mark: 'branch' },
    { id: 'r-up', label: 'upload/', sublabel: '자산 입력', tag: '폴더', x: 590, y: 735, w: 95, h: 55, tone: 'neutral', mark: 'seal' }
  ];

  const conns: ConnectionSpec[] = [
    { flow: 'data', label: '페이지 요청', wp: [[190, 284], [260, 284]] },
    { flow: 'data', label: '배포 반영', wp: [[445, 284], [520, 284]] },
    { flow: 'data', label: '상품 자료 조회', wp: [[690, 284], [726, 284], [726, 209], [762, 209]] },
    { flow: 'data', wp: [[862, 248], [862, 266]] },
    { flow: 'data', wp: [[862, 328], [862, 342]] },
    { flow: 'data', wp: [[862, 404], [862, 418]] },
    { flow: 'image', label: '이미지 수급', wp: [[605, 240], [605, 152], [1139, 152], [1139, 170]] },
    { flow: 'image', wp: [[1139, 248], [1139, 266]] },
    { flow: 'image', wp: [[1139, 328], [1139, 342]] },
    { flow: 'image', wp: [[1139, 404], [1139, 418]] },
    { flow: 'auth', label: '외부 인증 요청', wp: [[352, 240], [352, 168], [394, 168], [394, 130]] },
    { flow: 'auth', label: '인증 회신', wp: [[483, 87], [722, 87], [722, 297], [772, 297]] },
    { flow: 'auth', label: '인증 상태', wp: [[772, 365], [706, 365], [706, 275], [690, 275]] },
    { flow: 'payment', label: '결제 요청', wp: [[318, 328], [318, 395], [210, 395], [210, 450]] },
    { flow: 'payment', label: '결제 요청', wp: [[388, 328], [388, 395], [462, 395], [462, 450]] },
    { flow: 'payment', label: '주문 기록', wp: [[310, 485], [618, 485], [618, 440], [772, 440]] },
    { flow: 'payment', label: '확인 기록', wp: [[550, 500], [648, 500], [648, 458], [772, 458]] },
    { flow: 'admin', label: '이미지 등록', wp: [[200, 62], [200, 22], [1002, 22], [1002, 209], [1042, 209]] },
    { flow: 'admin', label: '메타 갱신', wp: [[115, 130], [115, 145], [862, 145], [862, 170]] },
    { flow: 'repo', label: '빌드 원본', wp: [[87, 735], [87, 400], [352, 400], [352, 328]] },
    { flow: 'repo', label: '스키마 근거', wp: [[417, 735], [417, 600], [710, 600], [710, 218], [762, 218]] },
    { flow: 'repo', label: '업로드 도구', wp: [[637, 735], [637, 185], [115, 185], [115, 130]] }
  ];

  const buildPath = (pts: [number, number][], r = 12) => {
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
      const cr = Math.min(r, len1 / 2, len2 / 2);
      const sx = curr[0] - (d1x / len1) * cr;
      const sy = curr[1] - (d1y / len1) * cr;
      const ex = curr[0] + (d2x / len2) * cr;
      const ey = curr[1] + (d2y / len2) * cr;
      d += ` L ${sx} ${sy} Q ${curr[0]} ${curr[1]} ${ex} ${ey}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${last[0]} ${last[1]}`;
    return d;
  };

  const labelPos = (pts: [number, number][]) => {
    const m = Math.floor(pts.length / 2);
    const a = pts[m - 1];
    const b = pts[m];
    return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 - 9 };
  };

  const groups = [
    { x: 750, y: 158, w: 218, h: 412, title: 'Supabase 묶음', note: '인증과 자료 기록', tone: 'wood' as const },
    { x: 1030, y: 158, w: 212, h: 335, title: 'Cloudflare R2', note: '이미지 저장', tone: 'gold' as const },
    { x: 98, y: 438, w: 468, h: 110, title: '결제 구획', note: '국내 / 해외 결제', tone: 'gold' as const },
    { x: 20, y: 628, w: 680, h: 175, title: '원본 저장소', note: 'repo 구조', tone: 'neutral' as const },
    { x: 293, y: 33, w: 200, h: 110, title: '인증 창구', note: '외부 로그인', tone: 'gold' as const }
  ];

  return (
    <svg
      viewBox={`0 0 ${ARCH_SVG_WIDTH} ${ARCH_SVG_HEIGHT}`}
      width={ARCH_SVG_WIDTH}
      height={ARCH_SVG_HEIGHT}
    >
      <defs>
        <linearGradient id="arch-board-bg" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor={BOARD.paperSoft} />
          <stop offset="100%" stopColor={BOARD.paper} />
        </linearGradient>
        <pattern id="arch-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke={BOARD.line} strokeWidth="1" strokeOpacity="0.32" />
          <rect x="-1" y="-1" width="2" height="2" fill={BOARD.line} fillOpacity="0.38" />
        </pattern>
        {Object.entries(ARCH_FLOW_COLORS).map(([key, color]) => (
          <marker key={key} id={`arch-end-${key}`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M4 0L8 4L4 8L0 4Z" fill={color} />
          </marker>
        ))}
      </defs>

      <rect width="100%" height="100%" fill="url(#arch-board-bg)" />
      <rect width="100%" height="100%" fill="url(#arch-grid)" opacity="0.55" />

      {groups.map((group) => (
        <g key={group.title}>
          <rect
            x={group.x}
            y={group.y}
            width={group.w}
            height={group.h}
            rx="0"
            fill={BOARD.paperSoft}
            fillOpacity="0.92"
            stroke={NODE_COLORS[group.tone]}
            strokeWidth="1.3"
            strokeOpacity="0.62"
          />
          <text
            x={group.x + 12}
            y={group.y - 8}
            fill={NODE_COLORS[group.tone]}
            fontSize="11"
            letterSpacing="2"
            fontWeight="600"
          >
            {group.title}
          </text>
          <text
            x={group.x + group.w - 12}
            y={group.y - 8}
            fill={BOARD.inkSoft}
            fontSize="10"
            textAnchor="end"
          >
            {group.note}
          </text>
        </g>
      ))}

      {conns.map((conn, idx) => {
        const color = ARCH_FLOW_COLORS[conn.flow];
        const isHover = hoverConn === idx;
        const path = buildPath(conn.wp, 12);
        const pos = conn.label ? labelPos(conn.wp) : null;
        const labelWidth = conn.label ? conn.label.length * 7.2 + 18 : 0;

        return (
          <g key={`conn-${idx}`}>
            <path
              d={path}
              fill="none"
              stroke={BOARD.lineSoft}
              strokeWidth={isHover ? 3.6 : 2.6}
              strokeOpacity="0.95"
            />
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={isHover ? 2.1 : 1.4}
              strokeOpacity={isHover ? 1 : 0.92}
              markerEnd={`url(#arch-end-${conn.flow})`}
              onMouseEnter={() => setHoverConn(idx)}
              onMouseLeave={() => setHoverConn(null)}
            />
            {pos && conn.label ? (
              <g>
                <rect
                  x={pos.x - labelWidth / 2}
                  y={pos.y - 12}
                  width={labelWidth}
                  height={18}
                  rx="0"
                  fill={BOARD.paperSoft}
                  stroke={color}
                  strokeWidth="1.2"
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  fill={BOARD.ink}
                  fontSize="10"
                  fontWeight="600"
                >
                  {conn.label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}

      {nodes.map((node) => {
        const tone = NODE_COLORS[node.tone];
        const isHover = hoverNode === node.id;
        const compact = node.h <= 62 || node.w <= 110;
        const markSize = compact ? 28 : 36;
        const markBox = compact ? 36 : 46;
        const dividerX = node.x + (compact ? 44 : 58);
        const titleX = node.x + (compact ? 54 : 70);
        const titleY = node.y + (compact ? 27 : 34);
        const subY = node.y + (compact ? 43 : 52);

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
                strokeOpacity="0.22"
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
              x1={dividerX}
              y1={node.y}
              x2={dividerX}
              y2={node.y + node.h}
              stroke={BOARD.line}
              strokeWidth="1"
              strokeOpacity="0.9"
            />
            <rect
              x={node.x + node.w - 40}
              y={node.y + 8}
              width="30"
              height="14"
              rx="0"
              fill={BOARD.paperSoft}
              stroke={tone}
              strokeWidth="1.1"
            />
            <text
              x={node.x + node.w - 25}
              y={node.y + 18}
              textAnchor="middle"
              fill={BOARD.ink}
              fontSize="7"
              fontWeight="700"
              letterSpacing="1.2"
            >
              {node.tag}
            </text>
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
              <BoardMark variant={node.mark} tone={node.tone} size={markSize} color={tone} />
            </g>
            <text
              x={titleX}
              y={titleY}
              textAnchor="start"
              fill={BOARD.ink}
              fontSize={compact ? 9.2 : 11.5}
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
                fontSize={compact ? 7.5 : 9}
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

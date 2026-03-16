'use client';

import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode
} from 'react';
import {
  Monitor,
  Database,
  Cloud,
  Upload,
  Server,
  Folder,
  Code,
  HardDrive,
  Settings,
  Image,
  FileCode,
  Package,
  Wrench,
  FolderOpen,
  CreditCard,
  ShieldCheck,
  UserCheck,
  LogIn,
  DollarSign
} from 'lucide-react';

type FlowType =
  | 'data'
  | 'image'
  | 'auth'
  | 'payment'
  | 'admin'
  | 'internal'
  | 'repo';

type NodeSpec = {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  bg: string;
  glow: string;
  icon: ReactNode;
  iconSz: number;
  group?: string;
};

type ConnectionSpec = {
  from: string;
  to: string;
  flow: FlowType;
  label?: string;
  wp: [number, number][];
};

const FLOW_COLORS: Record<FlowType, string> = {
  data: '#00ffff',
  image: '#00ff41',
  auth: '#ff9900',
  payment: '#ffdd00',
  admin: '#ff00ff',
  internal: '#00ffff',
  repo: '#888888'
};

export const ARCH_SVG_WIDTH = 1300;
export const ARCH_SVG_HEIGHT = 840;
const LABEL_FILL = 'rgba(0, 0, 0, 0.18)';

const I = { lg: 32, md: 24, sm: 18 };

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

export function ArchitectureDiagram() {
  const [hNode, setHNode] = useState<string | null>(null);
  const [hConn, setHConn] = useState<number | null>(null);

  const nodes: NodeSpec[] = [
    {
      id: 'admin',
      label: '관리자 업로드',
      sublabel: 'Content Mgmt',
      x: 30,
      y: 45,
      w: 170,
      h: 85,
      bg: '#1a0a20',
      glow: '#ff00ff',
      icon: <Upload size={I.lg} strokeWidth={1.5} />,
      iconSz: I.lg
    },
    {
      id: 'google',
      label: 'Google 로그인',
      sublabel: 'OAuth Provider',
      x: 305,
      y: 45,
      w: 178,
      h: 85,
      bg: '#1a1208',
      glow: '#ff9900',
      icon: <LogIn size={I.lg} strokeWidth={1.5} />,
      iconSz: I.lg
    },
    {
      id: 'user',
      label: '사용자',
      sublabel: 'Browser Client',
      x: 30,
      y: 240,
      w: 160,
      h: 88,
      bg: '#0a1520',
      glow: '#00ffff',
      icon: <Monitor size={I.lg} strokeWidth={1.5} />,
      iconSz: I.lg
    },
    {
      id: 'nextjs',
      label: 'Next.js 웹사이트',
      sublabel: 'App Router',
      x: 260,
      y: 240,
      w: 185,
      h: 88,
      bg: '#0a1520',
      glow: '#00ffff',
      icon: <Code size={I.lg} strokeWidth={1.5} />,
      iconSz: I.lg
    },
    {
      id: 'vercel',
      label: 'Vercel 배포',
      sublabel: 'Production Host',
      x: 520,
      y: 240,
      w: 170,
      h: 88,
      bg: '#0a1025',
      glow: '#4488ff',
      icon: <Server size={I.lg} strokeWidth={1.5} />,
      iconSz: I.lg
    },
    {
      id: 'supa',
      label: 'Supabase',
      sublabel: 'Backend Services',
      x: 762,
      y: 170,
      w: 200,
      h: 78,
      bg: '#081a0a',
      glow: '#00ff41',
      icon: <Database size={I.lg} strokeWidth={1.5} />,
      iconSz: I.lg,
      group: 'supabase'
    },
    {
      id: 'supa-auth',
      label: 'Auth 인증',
      sublabel: 'User Management',
      x: 772,
      y: 266,
      w: 180,
      h: 62,
      bg: '#0d1a06',
      glow: '#ff9900',
      icon: <ShieldCheck size={I.md} strokeWidth={1.5} />,
      iconSz: I.md,
      group: 'supabase'
    },
    {
      id: 'supa-session',
      label: '세션 / 사용자',
      sublabel: 'Session & Profile',
      x: 772,
      y: 342,
      w: 180,
      h: 62,
      bg: '#0d1a06',
      glow: '#ff9900',
      icon: <UserCheck size={I.md} strokeWidth={1.5} />,
      iconSz: I.md,
      group: 'supabase'
    },
    {
      id: 'supa-db',
      label: '상품/주문 데이터',
      sublabel: 'PostgreSQL',
      x: 772,
      y: 418,
      w: 180,
      h: 62,
      bg: '#061406',
      glow: '#00ff41',
      icon: <HardDrive size={I.md} strokeWidth={1.5} />,
      iconSz: I.md,
      group: 'supabase'
    },
    {
      id: 'supa-admin',
      label: '관리자 데이터',
      sublabel: 'Admin / App Meta',
      x: 772,
      y: 494,
      w: 180,
      h: 62,
      bg: '#061406',
      glow: '#00ff41',
      icon: <Settings size={I.md} strokeWidth={1.5} />,
      iconSz: I.md,
      group: 'supabase'
    },
    {
      id: 'r2',
      label: 'Cloudflare R2',
      sublabel: '이미지 저장소',
      x: 1042,
      y: 170,
      w: 195,
      h: 78,
      bg: '#141a06',
      glow: '#00ff41',
      icon: <Cloud size={I.lg} strokeWidth={1.5} />,
      iconSz: I.lg,
      group: 'r2'
    },
    {
      id: 'r2-prod',
      label: 'Product Images',
      sublabel: 'Asset CDN',
      x: 1052,
      y: 266,
      w: 175,
      h: 62,
      bg: '#101406',
      glow: '#00ff41',
      icon: <Image size={I.md} strokeWidth={1.5} />,
      iconSz: I.md,
      group: 'r2'
    },
    {
      id: 'r2-coll',
      label: 'Collection Images',
      sublabel: 'Gallery Storage',
      x: 1052,
      y: 342,
      w: 175,
      h: 62,
      bg: '#101406',
      glow: '#00ff41',
      icon: <Image size={I.md} strokeWidth={1.5} />,
      iconSz: I.md,
      group: 'r2'
    },
    {
      id: 'r2-pub',
      label: 'Public Assets',
      sublabel: 'Static Delivery',
      x: 1052,
      y: 418,
      w: 175,
      h: 62,
      bg: '#101406',
      glow: '#00ff41',
      icon: <Package size={I.md} strokeWidth={1.5} />,
      iconSz: I.md,
      group: 'r2'
    },
    {
      id: 'nice',
      label: 'Nice Payments 결제',
      sublabel: 'KRW Checkout',
      x: 110,
      y: 450,
      w: 200,
      h: 85,
      bg: '#1a1a06',
      glow: '#ffdd00',
      icon: <CreditCard size={I.lg} strokeWidth={1.5} />,
      iconSz: I.lg
    },
    {
      id: 'paypal',
      label: 'PayPal 결제',
      sublabel: 'Global Checkout',
      x: 375,
      y: 450,
      w: 175,
      h: 85,
      bg: '#1a1a06',
      glow: '#ffdd00',
      icon: <DollarSign size={I.lg} strokeWidth={1.5} />,
      iconSz: I.lg
    },
    {
      id: 'repo',
      label: '개발 소스 구조',
      sublabel: 'real_enico',
      x: 30,
      y: 640,
      w: 190,
      h: 75,
      bg: '#141414',
      glow: '#888',
      icon: <Folder size={I.lg} strokeWidth={1.5} />,
      iconSz: I.lg,
      group: 'repo'
    },
    {
      id: 'r-src',
      label: 'src/',
      sublabel: 'App Source',
      x: 40,
      y: 735,
      w: 95,
      h: 55,
      bg: '#111',
      glow: '#888',
      icon: <FileCode size={I.sm} strokeWidth={1.5} />,
      iconSz: I.sm,
      group: 'repo'
    },
    {
      id: 'r-pub',
      label: 'public/',
      sublabel: 'Static',
      x: 150,
      y: 735,
      w: 95,
      h: 55,
      bg: '#111',
      glow: '#888',
      icon: <FolderOpen size={I.sm} strokeWidth={1.5} />,
      iconSz: I.sm,
      group: 'repo'
    },
    {
      id: 'r-sql',
      label: 'sql/',
      sublabel: 'Schema',
      x: 260,
      y: 735,
      w: 95,
      h: 55,
      bg: '#111',
      glow: '#888',
      icon: <Database size={I.sm} strokeWidth={1.5} />,
      iconSz: I.sm,
      group: 'repo'
    },
    {
      id: 'r-supa',
      label: 'supabase/',
      sublabel: 'Config',
      x: 370,
      y: 735,
      w: 95,
      h: 55,
      bg: '#111',
      glow: '#888',
      icon: <Settings size={I.sm} strokeWidth={1.5} />,
      iconSz: I.sm,
      group: 'repo'
    },
    {
      id: 'r-tool',
      label: 'tools/',
      sublabel: 'Scripts',
      x: 480,
      y: 735,
      w: 95,
      h: 55,
      bg: '#111',
      glow: '#888',
      icon: <Wrench size={I.sm} strokeWidth={1.5} />,
      iconSz: I.sm,
      group: 'repo'
    },
    {
      id: 'r-up',
      label: 'upload/',
      sublabel: 'Assets',
      x: 590,
      y: 735,
      w: 95,
      h: 55,
      bg: '#111',
      glow: '#888',
      icon: <Upload size={I.sm} strokeWidth={1.5} />,
      iconSz: I.sm,
      group: 'repo'
    }
  ];

  const nd = (id: string) => nodes.find((n) => n.id === id)!;
  const R = (id: string): [number, number] => {
    const n = nd(id);
    return [n.x + n.w, n.y + n.h / 2];
  };
  const L = (id: string): [number, number] => {
    const n = nd(id);
    return [n.x, n.y + n.h / 2];
  };

  const conns: ConnectionSpec[] = [
    {
      from: 'user',
      to: 'nextjs',
      flow: 'data',
      label: 'Page Request',
      wp: [R('user'), L('nextjs')]
    },
    {
      from: 'nextjs',
      to: 'vercel',
      flow: 'data',
      label: 'Deploy',
      wp: [R('nextjs'), L('vercel')]
    },
    {
      from: 'vercel',
      to: 'supa',
      flow: 'data',
      label: '상품 데이터',
      wp: [
        [690, 284],
        [726, 284],
        [726, 209],
        [762, 209]
      ]
    },
    {
      from: 'supa',
      to: 'supa-auth',
      flow: 'internal',
      wp: [
        [862, 248],
        [862, 266]
      ]
    },
    {
      from: 'supa-auth',
      to: 'supa-session',
      flow: 'internal',
      wp: [
        [862, 328],
        [862, 342]
      ]
    },
    {
      from: 'supa-session',
      to: 'supa-db',
      flow: 'internal',
      wp: [
        [862, 404],
        [862, 418]
      ]
    },
    {
      from: 'supa-db',
      to: 'supa-admin',
      flow: 'internal',
      wp: [
        [862, 480],
        [862, 494]
      ]
    },
    {
      from: 'vercel',
      to: 'r2',
      flow: 'image',
      label: '이미지 렌더링',
      wp: [
        [605, 240],
        [605, 152],
        [1139, 152],
        [1139, 170]
      ]
    },
    {
      from: 'r2',
      to: 'r2-prod',
      flow: 'image',
      wp: [
        [1139, 248],
        [1139, 266]
      ]
    },
    {
      from: 'r2-prod',
      to: 'r2-coll',
      flow: 'image',
      wp: [
        [1139, 328],
        [1139, 342]
      ]
    },
    {
      from: 'r2-coll',
      to: 'r2-pub',
      flow: 'image',
      wp: [
        [1139, 404],
        [1139, 418]
      ]
    },
    {
      from: 'nextjs',
      to: 'google',
      flow: 'auth',
      label: 'OAuth 요청',
      wp: [
        [352, 240],
        [352, 168],
        [394, 168],
        [394, 130]
      ]
    },
    {
      from: 'google',
      to: 'supa-auth',
      flow: 'auth',
      label: '인증 콜백',
      wp: [
        [483, 87],
        [722, 87],
        [722, 297],
        [772, 297]
      ]
    },
    {
      from: 'supa-session',
      to: 'vercel',
      flow: 'auth',
      label: '인증 상태',
      wp: [
        [772, 365],
        [706, 365],
        [706, 275],
        [690, 275]
      ]
    },
    {
      from: 'nextjs',
      to: 'nice',
      flow: 'payment',
      label: '결제 요청',
      wp: [
        [318, 328],
        [318, 395],
        [210, 395],
        [210, 450]
      ]
    },
    {
      from: 'nextjs',
      to: 'paypal',
      flow: 'payment',
      label: '결제 요청',
      wp: [
        [388, 328],
        [388, 395],
        [462, 395],
        [462, 450]
      ]
    },
    {
      from: 'nice',
      to: 'supa-db',
      flow: 'payment',
      label: '주문 데이터',
      wp: [
        [310, 485],
        [618, 485],
        [618, 440],
        [772, 440]
      ]
    },
    {
      from: 'paypal',
      to: 'supa-db',
      flow: 'payment',
      label: '결제 확인',
      wp: [
        [550, 500],
        [648, 500],
        [648, 458],
        [772, 458]
      ]
    },
    {
      from: 'admin',
      to: 'r2',
      flow: 'admin',
      label: 'Upload Images',
      wp: [
        [200, 62],
        [200, 22],
        [1002, 22],
        [1002, 209],
        [1042, 209]
      ]
    },
    {
      from: 'admin',
      to: 'supa',
      flow: 'admin',
      label: 'Update Meta',
      wp: [
        [115, 130],
        [115, 145],
        [862, 145],
        [862, 170]
      ]
    },
    {
      from: 'r-src',
      to: 'nextjs',
      flow: 'repo',
      label: 'Build',
      wp: [
        [87, 735],
        [87, 400],
        [352, 400],
        [352, 328]
      ]
    },
    {
      from: 'r-supa',
      to: 'supa',
      flow: 'repo',
      label: 'Schema',
      wp: [
        [417, 735],
        [417, 600],
        [710, 600],
        [710, 218],
        [762, 218]
      ]
    },
    {
      from: 'r-up',
      to: 'admin',
      flow: 'repo',
      label: 'Tools',
      wp: [
        [637, 735],
        [637, 185],
        [115, 185],
        [115, 130]
      ]
    }
  ];

  const smooth = (pts: [number, number][], r = 13) => {
    if (pts.length < 2) return '';
    if (pts.length === 2) {
      return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`;
    }

    let d = `M ${pts[0][0]} ${pts[0][1]}`;

    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i - 1];
      const [cx, cy] = pts[i];
      const [nx, ny] = pts[i + 1];
      const d1x = cx - px;
      const d1y = cy - py;
      const d2x = nx - cx;
      const d2y = ny - cy;
      const l1 = Math.sqrt(d1x * d1x + d1y * d1y);
      const l2 = Math.sqrt(d2x * d2x + d2y * d2y);
      const cr = Math.min(r, l1 / 2, l2 / 2);

      d += ` L ${cx - (d1x / l1) * cr} ${cy - (d1y / l1) * cr}`;
      d += ` Q ${cx} ${cy} ${cx + (d2x / l2) * cr} ${cy + (d2y / l2) * cr}`;
    }

    const last = pts[pts.length - 1];
    d += ` L ${last[0]} ${last[1]}`;

    return d;
  };

  const labelPos = (pts: [number, number][]) => {
    const m = Math.floor(pts.length / 2);
    const a = pts[m - 1];
    const b = pts[m];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const isVert = Math.abs(dy) > Math.abs(dx);

    return {
      x: (a[0] + b[0]) / 2 + (isVert ? 8 : 0),
      y: (a[1] + b[1]) / 2 + (isVert ? 0 : -9)
    };
  };

  const glowId = (color: string) => {
    if (color === '#00ffff') return 'ag-c';
    if (color === '#00ff41') return 'ag-g';
    if (color === '#ff00ff') return 'ag-m';
    if (color === '#ff9900') return 'ag-o';
    if (color === '#ffdd00') return 'ag-y';
    if (color === '#4488ff') return 'ag-b';
    return 'ag-x';
  };

  const renderIcon = (icon: ReactNode, size: number) => {
    if (!isValidElement(icon)) return icon;

    return cloneElement(icon as ReactElement<{ size?: number; strokeWidth?: number }>, {
      size,
      strokeWidth: size >= 56 ? 1.25 : 1.4
    });
  };

  return (
    <svg
      viewBox={`0 0 ${ARCH_SVG_WIDTH} ${ARCH_SVG_HEIGHT}`}
      width={ARCH_SVG_WIDTH}
      height={ARCH_SVG_HEIGHT}
      style={{ background: '#ffffff' }}
    >
      <defs>
        <filter id="ag-c">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00ffff" floodOpacity="0.7" />
        </filter>
        <filter id="ag-g">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00ff41" floodOpacity="0.7" />
        </filter>
        <filter id="ag-m">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ff00ff" floodOpacity="0.7" />
        </filter>
        <filter id="ag-o">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ff9900" floodOpacity="0.7" />
        </filter>
        <filter id="ag-y">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffdd00" floodOpacity="0.7" />
        </filter>
        <filter id="ag-b">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#4488ff" floodOpacity="0.7" />
        </filter>
        <filter id="ag-x">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#888" floodOpacity="0.5" />
        </filter>

        {Object.entries(FLOW_COLORS).map(([key, color]) => (
          <marker
            key={key}
            id={`aa-${key}`}
            markerWidth="10"
            markerHeight="8"
            refX="9"
            refY="4"
            orient="auto"
          >
            <polygon points="0 0, 10 4, 0 8" fill={color} />
          </marker>
        ))}

        <pattern id="ag" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#0f0f0f" strokeWidth="0.5" />
        </pattern>
        <radialGradient id="ag-node-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="62%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ag-icon-fade" cx="50%" cy="46%" r="66%">
          <stop offset="0%" stopColor="#170007" stopOpacity="0.94" />
          <stop offset="40%" stopColor="#120005" stopOpacity="0.76" />
          <stop offset="72%" stopColor="#0c0003" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ag-board-fade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.28" />
        </linearGradient>
      </defs>

      <rect width="100%" height="100%" fill="#f8fbff" />
      <rect width="100%" height="100%" fill="url(#ag)" opacity="0.22" />
      <rect width="100%" height="100%" fill="url(#ag-board-fade)" />
      <ellipse cx="318" cy="266" rx="315" ry="195" fill="url(#ag-node-fade)" opacity="0.95" />
      <ellipse cx="905" cy="284" rx="348" ry="235" fill="url(#ag-node-fade)" opacity="0.92" />
      <ellipse cx="316" cy="710" rx="330" ry="125" fill="url(#ag-node-fade)" opacity="0.88" />

      <rect
        x="750"
        y="158"
        width="218"
        height="412"
        fill="#00ff4105"
        stroke="#00ff41"
        strokeWidth="1"
        strokeOpacity="0.22"
        rx="4"
      />
      <text
        x="760"
        y="152"
        fill={mixWithBlack('#00ff41', 0.58)}
        fontSize="10"
        fontFamily="monospace"
        opacity="0.4"
        letterSpacing="2"
      >
        SUPABASE CLUSTER
      </text>

      <rect
        x="1030"
        y="158"
        width="212"
        height="335"
        fill="#00ff4105"
        stroke="#00ff41"
        strokeWidth="1"
        strokeOpacity="0.22"
        rx="4"
      />
      <text
        x="1040"
        y="152"
        fill={mixWithBlack('#00ff41', 0.58)}
        fontSize="10"
        fontFamily="monospace"
        opacity="0.4"
        letterSpacing="2"
      >
        CLOUDFLARE R2
      </text>

      <rect
        x="98"
        y="438"
        width="468"
        height="110"
        fill="#ffdd0005"
        stroke="#ffdd00"
        strokeWidth="1"
        strokeOpacity="0.18"
        rx="4"
      />
      <text
        x="108"
        y="432"
        fill={mixWithBlack('#ffdd00', 0.58)}
        fontSize="10"
        fontFamily="monospace"
        opacity="0.35"
        letterSpacing="2"
      >
        PAYMENT GATEWAY
      </text>

      <rect
        x="20"
        y="628"
        width="680"
        height="175"
        fill="#88888805"
        stroke="#888"
        strokeWidth="1"
        strokeOpacity="0.18"
        rx="4"
      />
      <text
        x="30"
        y="622"
        fill={mixWithBlack('#888888', 0.38)}
        fontSize="10"
        fontFamily="monospace"
        opacity="0.35"
        letterSpacing="2"
      >
        REPOSITORY
      </text>

      <rect
        x="293"
        y="33"
        width="200"
        height="110"
        fill="#ff990005"
        stroke="#ff9900"
        strokeWidth="1"
        strokeOpacity="0.18"
        rx="4"
      />
      <text
        x="303"
        y="27"
        fill={mixWithBlack('#ff9900', 0.58)}
        fontSize="10"
        fontFamily="monospace"
        opacity="0.35"
        letterSpacing="2"
      >
        AUTH PROVIDER
      </text>

      {conns.map((c, idx) => {
        if (c.wp.length < 2) return null;
        const path = smooth(c.wp, 13);
        const isH = hConn === idx;
        const color = FLOW_COLORS[c.flow];
        const lp = c.label ? labelPos(c.wp) : null;
        const charW = c.label ? c.label.length * 4.2 + 7 : 0;

        return (
          <g key={`c-${idx}`}>
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={isH ? 6 : 2.5}
              strokeOpacity={isH ? 0.18 : 0.04}
            />
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={isH ? 2.5 : 1.8}
              strokeOpacity={isH ? 1 : 0.6}
              markerEnd={`url(#aa-${c.flow})`}
              onMouseEnter={() => setHConn(idx)}
              onMouseLeave={() => setHConn(null)}
              style={{
                cursor: 'pointer',
                filter: isH ? `drop-shadow(0 0 6px ${color})` : 'none',
                transition: 'all 0.15s'
              }}
            />
            {lp && c.label ? (
              <g>
                <rect
                  x={lp.x - charW}
                  y={lp.y - 12}
                  width={charW * 2}
                  height={18}
                  fill={LABEL_FILL}
                  rx="2"
                />
                <text
                  x={lp.x}
                  y={lp.y + 1}
                  fill={mixWithBlack(color, 0.56)}
                  fontSize="10.5"
                  fontFamily="monospace"
                  textAnchor="middle"
                  opacity={isH ? 1 : 0.7}
                  style={{ transition: 'opacity 0.15s' }}
                >
                  {c.label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}

      {nodes.map((n) => {
        const isH = hNode === n.id;
        const gc = n.glow;
        const tc = mixWithBlack(gc, 0.54);
        const sc = mixWithBlack(gc, 0.68);
        const iconSize = Math.max(
          n.iconSz + 18,
          Math.min(n.w * 0.42, n.h * 0.72)
        );
        const iconBox = iconSize + 12;
        const iconCx = n.x + n.w / 2;
        const iconCy = n.y + Math.min(n.h * 0.44, 34);
        const fId = glowId(gc);

        return (
          <g
            key={n.id}
            onMouseEnter={() => setHNode(n.id)}
            onMouseLeave={() => setHNode(null)}
            style={{ cursor: 'pointer' }}
          >
            <ellipse
              cx={iconCx}
              cy={iconCy + 8}
              rx={Math.max(iconSize * 1.1, n.w * 0.33)}
              ry={Math.max(iconSize * 0.92, n.h * 0.46)}
              fill="url(#ag-node-fade)"
              opacity={isH ? 1 : 0.9}
              style={{ transition: 'opacity 0.15s' }}
            />

            <ellipse
              cx={iconCx}
              cy={iconCy}
              rx={iconSize * 0.88}
              ry={iconSize * 0.88}
              fill="url(#ag-icon-fade)"
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
                  filter: isH ? `url(#${fId})` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  opacity: isH ? 1 : 0.95
                }}
              >
                {renderIcon(n.icon, iconSize)}
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
              {n.label}
            </text>

            {n.sublabel ? (
              <text
                x={iconCx}
                y={iconCy + iconSize / 2 + 40}
                textAnchor="middle"
                fill={sc}
                fontSize="10"
                fontFamily="monospace"
                opacity={isH ? 0.8 : 0.5}
              >
                {n.sublabel}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

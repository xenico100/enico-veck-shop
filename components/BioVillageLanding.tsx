'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const WORLD_HEIGHT = 3500;
const PLAYER_SCALE = 5;
const PLAYER_SPEED = 6;
const PLAYER_MARGIN = 30;

type PanelKey = 'msg' | 'com' | 'v_factory' | 'v_server' | 'v_core';
type Direction = 'down' | 'left' | 'right' | 'up';

const DIRECTIONS: Record<string, Direction> = {
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up'
};

type PlayerState = {
  animFrame: number;
  dir: Direction;
  targetX: number | null;
  targetY: number | null;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type CellState = {
  color: string;
  phase: number;
  radius: number;
  vx: number;
  vy: number;
  worldX: number;
  worldY: number;
};

type WorldNode = {
  bodyClassName: string;
  description?: string;
  id: string;
  label?: string;
  labelClassName?: string;
  left: string;
  onClickPanel?: PanelKey;
  organic?: boolean;
  subLabel?: string;
  subLabelClassName?: string;
  title: string;
  top: number;
  width?: number;
};

const sprites: Record<Direction, string[]> = {
  down: [
    '  KKKK  ',
    ' KRRRRK ',
    'KSSSSSSK',
    'KSKSSKSK',
    ' KWWWWK ',
    ' KWDWWK ',
    ' KKWWKK ',
    '  KBBK  ',
    ' KKKKKK '
  ],
  left: [
    '  KKKK  ',
    ' KRRRRK ',
    ' KSSKSK ',
    ' KSSSSK ',
    '  KWWWK ',
    '  KWDWK ',
    '  KKWKK ',
    '   KBK  ',
    '  KKKK  '
  ],
  right: [
    '  KKKK  ',
    ' KRRRRK ',
    ' KSKSSK ',
    ' KSSSSK ',
    ' KWWWK  ',
    ' KWDWK  ',
    ' KKWKK  ',
    '  KBK   ',
    '  KKKK  '
  ],
  up: [
    '  KKKK  ',
    ' KRRRRK ',
    'KRRRRRRK',
    'KSSSSSSK',
    ' KWWWWK ',
    ' KWDWWK ',
    ' KKWWKK ',
    '  KBBK  ',
    ' KKKKKK '
  ]
};

const spritePalette: Record<string, string> = {
  ' ': 'transparent',
  B: '#1e3a8a',
  D: '#9ca3af',
  K: '#1a1a1a',
  R: '#cc0000',
  S: '#ffdbac',
  W: '#ffffff'
};

const edges: Array<[string, string, string, number]> = [
  ['node-core', 'node-msg', '#cc0000', 8],
  ['node-core', 'node-com', '#8a0303', 8],
  ['node-msg', 'sub-msg-1', '#660033', 4],
  ['node-msg', 'sub-msg-2', '#660033', 4],
  ['node-msg', 'sub-msg-3', '#4a0022', 2],
  ['node-com', 'sub-com-1', '#004d00', 4],
  ['node-com', 'sub-com-2', '#004d00', 4],
  ['node-com', 'sub-com-3', '#004d00', 4],
  ['node-com', 'village-1', '#5a0000', 10],
  ['node-msg', 'village-2', '#5a0022', 10],
  ['village-1', 'village-3', '#8a0303', 12],
  ['village-2', 'village-3', '#8a0303', 12]
];

const worldNodes: WorldNode[] = [
  {
    bodyClassName: 'village-node-core',
    id: 'node-core',
    label: 'ORGAN.00 [HEART]',
    left: '50%',
    organic: true,
    subLabel: '대본/3D/실물',
    subLabelClassName: 'text-red-600',
    title: '본질 축',
    top: 350
  },
  {
    bodyClassName: 'village-node-main',
    id: 'node-msg',
    label: 'LOBE.01 [MIND]',
    left: '30%',
    onClickPanel: 'msg',
    organic: true,
    subLabel: '메시지 네트워크',
    subLabelClassName: 'text-purple-700',
    title: '몽상',
    top: 250
  },
  {
    bodyClassName: 'village-node-sub',
    id: 'sub-msg-1',
    left: '15%',
    onClickPanel: 'msg',
    organic: true,
    subLabel: 'MAIN_ARTERY',
    title: '유튜브 롱폼',
    top: 150
  },
  {
    bodyClassName: 'village-node-sub',
    id: 'sub-msg-2',
    left: '12%',
    onClickPanel: 'msg',
    organic: true,
    subLabel: 'VIRAL_SPORES',
    title: '숏폼',
    top: 350
  },
  {
    bodyClassName: 'village-node-sub village-node-inactive',
    id: 'sub-msg-3',
    left: '28%',
    organic: true,
    subLabel: 'DORMANT',
    title: '쓰레드',
    top: 450
  },
  {
    bodyClassName: 'village-node-main',
    id: 'node-com',
    label: 'LOBE.02 [MATTER]',
    labelClassName: 'text-green-700',
    left: '70%',
    onClickPanel: 'com',
    organic: true,
    subLabel: '물성 배양',
    subLabelClassName: 'text-green-700',
    title: '에니코 벡',
    top: 450
  },
  {
    bodyClassName: 'village-node-sub',
    id: 'sub-com-1',
    left: '85%',
    onClickPanel: 'com',
    organic: true,
    subLabel: 'D2C_NEXUS',
    title: '공식 웹사이트',
    top: 600
  },
  {
    bodyClassName: 'village-node-sub',
    id: 'sub-com-2',
    left: '88%',
    onClickPanel: 'com',
    organic: true,
    subLabel: 'EXTERNAL',
    title: '스마트스토어',
    top: 350
  },
  {
    bodyClassName: 'village-node-sub',
    id: 'sub-com-3',
    left: '72%',
    onClickPanel: 'com',
    organic: true,
    subLabel: 'VISUAL',
    title: '인스타그램',
    top: 250
  },
  {
    bodyClassName: 'village-building',
    description: '>> 에니코 벡 실물 굿즈 생산 공정 라인',
    id: 'village-1',
    label: '第 1 物質 培養所',
    left: '30%',
    onClickPanel: 'v_factory',
    subLabel: '가동률 89% [안정]',
    title: '',
    top: 1400,
    width: 350
  },
  {
    bodyClassName: 'village-building',
    description: '>> 롱폼 및 숏폼 영상 아카이브 서버실',
    id: 'village-2',
    label: '夢想 記錄 貯藏庫',
    left: '70%',
    onClickPanel: 'v_server',
    subLabel: '데이터 무결성 검증 완료',
    title: '',
    top: 1900,
    width: 350
  },
  {
    bodyClassName: 'village-building village-building-core',
    description: '>> 전체 브랜드 파이프라인 중앙 통제실',
    id: 'village-3',
    label: '深淵의 統制 聖所',
    left: '50%',
    onClickPanel: 'v_core',
    subLabel: '최고 권한자 전용 구역',
    title: '',
    top: 2600,
    width: 450
  }
];

const createCells = (): CellState[] =>
  Array.from({ length: 150 }).map(() => ({
    color:
      Math.random() > 0.5 ? 'rgba(200, 0, 0, 0.15)' : 'rgba(150, 0, 0, 0.2)',
    phase: Math.random() * Math.PI * 2,
    radius: Math.random() * 4 + 1,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    worldX: Math.random() * 2000 - 500,
    worldY: Math.random() * WORLD_HEIGHT
  }));

const getScreenCenter = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const panelContentMap: Record<
  PanelKey,
  { label: string; subtitle: string; title: string }
> = {
  com: {
    label: 'EXTRACTING_LOBE_02_DATA...',
    subtitle: '>> 실물 배양 터미널',
    title: '에니코 벡 (MATTER)'
  },
  msg: {
    label: 'EXTRACTING_LOBE_01_DATA...',
    subtitle: '>> 서사/세계관 시냅스 데이터 스트림',
    title: '몽상 (MIND_NET)'
  },
  v_core: {
    label: 'WARNING_RESTRICTED_AREA...',
    subtitle: '>> 마스터 컨트롤 룸',
    title: '深淵의 統制 聖所'
  },
  v_factory: {
    label: 'VILLAGE_NODE_01_ACCESS...',
    subtitle: '>> 에니코 벡 생산 기지',
    title: '第 1 物質 培養所'
  },
  v_server: {
    label: 'VILLAGE_NODE_02_ACCESS...',
    subtitle: '>> 몽상 아카이브 메인 서버',
    title: '夢想 記錄 貯藏庫'
  }
};

function renderPanelBody(panel: PanelKey) {
  switch (panel) {
    case 'msg':
      return (
        <div className="mb-8">
          <h3 className="village-panel-section-title">
            &gt;&gt; PRIMARY_LONG-FORM [MEMBERS ONLY]
          </h3>
          <div className="village-data-card">
            <h4 className="text-xl font-black text-black">
              에니코 벡: 탄생의 서사
            </h4>
            <p className="mt-1 text-sm text-gray-600">
              세계관 해설 및 창작 코멘터리
            </p>
          </div>
        </div>
      );
    case 'com':
      return (
        <div className="mb-8">
          <h3 className="village-panel-section-title">
            &gt;&gt; INCUBATION_CHAMBER
          </h3>
          <div className="village-data-card">
            <h4 className="text-xl font-black text-black">
              오버핏 실루엣 아카이브 후드
            </h4>
          </div>
        </div>
      );
    case 'v_factory':
      return (
        <div className="mb-8">
          <h3 className="village-panel-section-title">
            &gt;&gt; FACTORY STATUS
          </h3>
          <div className="village-data-card">
            <h4 className="text-lg font-black text-black">
              재봉 라인 1, 2 가동 중
            </h4>
            <p className="mt-2 font-[var(--font-mono)] text-xs font-bold text-gray-600">
              진척도: 85% | 불량률: 0.01%
            </p>
          </div>
        </div>
      );
    case 'v_server':
      return (
        <div className="mb-8">
          <h3 className="village-panel-section-title">&gt;&gt; SERVER LOGS</h3>
          <div className="village-data-card">
            <h4 className="text-lg font-black text-black">
              최근 업로드: 3D 렌더링 본
            </h4>
            <p className="mt-2 font-[var(--font-mono)] text-xs font-bold text-gray-600">
              백업 완료 | 트래픽 쾌적
            </p>
          </div>
        </div>
      );
    case 'v_core':
      return (
        <div className="mt-10 text-center">
          <h3 className="mb-4 font-[var(--font-brush)] text-3xl font-black text-red-600">
            접근 권한 확인됨
          </h3>
          <p className="font-[var(--font-brush)] text-sm font-bold text-gray-800">
            환영합니다, 관리자님.
          </p>
          <button className="mt-8 w-full bg-red-900 px-6 py-3 font-[var(--font-brush)] font-bold text-white hover:bg-red-800">
            {'>> 전체 공정 오버라이드 (OVERRIDE) <<'}
          </button>
        </div>
      );
  }
}

export default function BioVillageLanding() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const cellsRef = useRef<CellState[]>([]);
  const playerRef = useRef<PlayerState>({
    animFrame: 0,
    dir: 'down',
    targetX: null,
    targetY: null,
    vx: 0,
    vy: 0,
    x: 0,
    y: 600
  });
  const cameraYRef = useRef(0);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [scrollY, setScrollY] = useState(0);

  const currentPanel = activePanel ? panelContentMap[activePanel] : null;
  const worldActive = scrollY < WORLD_HEIGHT - 80;

  const spriteWidth = useMemo(() => sprites.down[0].length * PLAYER_SCALE, []);
  const spriteHeight = useMemo(() => sprites.down.length * PLAYER_SCALE, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    cellsRef.current = createCells();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (playerRef.current.x === 0) {
        playerRef.current.x = window.innerWidth / 2;
      }
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
      if (
        playerRef.current.vx === 0 &&
        playerRef.current.vy === 0 &&
        playerRef.current.targetY === null
      ) {
        cameraYRef.current = window.scrollY;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (isTypingTarget) return;

      if (
        event.key in DIRECTIONS ||
        ['w', 'W', 'a', 'A', 's', 'S', 'd', 'D'].includes(event.key)
      ) {
        event.preventDefault();
      }

      keysRef.current[event.key] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key] = false;
    };

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-village-panel="true"]')) return;
      if (!worldActive) return;

      event.preventDefault();
      playerRef.current.targetX = event.clientX;
      playerRef.current.targetY = event.clientY + window.scrollY;
    };

    const drawVein = (
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      baseColor: string,
      baseWidth: number,
      timeOffset: number
    ) => {
      const viewportHeight = window.innerHeight;
      if (
        (p1.y < 0 && p2.y < 0) ||
        (p1.y > viewportHeight && p2.y > viewportHeight)
      ) {
        return;
      }

      const pulse = Math.sin(timeRef * 0.05 + timeOffset) * 0.5 + 0.5;
      const currentWidth = baseWidth + pulse * 4;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      context.beginPath();
      context.moveTo(p1.x, p1.y);

      for (let index = -1; index <= 1; index += 1) {
        const cp1x = p1.x + dx / 3 + dy * 0.2 * index;
        const cp1y = p1.y + dy / 3 - dx * 0.2 * index;
        const cp2x = p1.x + (dx * 2) / 3 - dy * 0.2 * index;
        const cp2y = p1.y + (dy * 2) / 3 + dx * 0.2 * index;
        context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }

      context.strokeStyle = baseColor;
      context.lineWidth = currentWidth;
      context.lineCap = 'round';
      context.shadowBlur = 8;
      context.shadowColor = 'rgba(255, 0, 0, 0.3)';
      context.stroke();

      context.strokeStyle = 'rgba(255,255,255,0.4)';
      context.lineWidth = currentWidth * 0.3;
      context.stroke();
      context.shadowBlur = 0;
    };

    const drawPlayer = () => {
      const player = playerRef.current;
      const bounce =
        (player.vx !== 0 || player.vy !== 0) &&
        Math.floor(player.animFrame) % 2 === 0
          ? -4
          : 0;
      const sprite = sprites[player.dir];
      const width = sprite[0].length * PLAYER_SCALE;
      const height = sprite.length * PLAYER_SCALE;
      const screenX = player.x;
      const screenY = player.y - window.scrollY;

      context.save();
      context.translate(screenX - width / 2, screenY - height / 2 + bounce);

      for (let row = 0; row < sprite.length; row += 1) {
        for (let col = 0; col < sprite[row].length; col += 1) {
          const char = sprite[row][col];
          if (char === ' ') continue;

          context.fillStyle = spritePalette[char];
          context.fillRect(
            col * PLAYER_SCALE,
            row * PLAYER_SCALE,
            PLAYER_SCALE,
            PLAYER_SCALE
          );
        }
      }

      context.restore();

      context.save();
      context.translate(screenX, screenY + height / 2 + 2);
      context.beginPath();
      context.ellipse(0, 0, width / 2, PLAYER_SCALE, 0, 0, Math.PI * 2);
      context.fillStyle = 'rgba(0,0,0,0.15)';
      context.fill();
      context.restore();
    };

    const updatePlayer = () => {
      const player = playerRef.current;
      let dx = 0;
      let dy = 0;

      if (keysRef.current.ArrowUp || keysRef.current.w || keysRef.current.W)
        dy -= 1;
      if (keysRef.current.ArrowDown || keysRef.current.s || keysRef.current.S)
        dy += 1;
      if (keysRef.current.ArrowLeft || keysRef.current.a || keysRef.current.A)
        dx -= 1;
      if (keysRef.current.ArrowRight || keysRef.current.d || keysRef.current.D)
        dx += 1;

      if (dx !== 0 || dy !== 0) {
        player.targetX = null;
        player.targetY = null;
        const length = Math.hypot(dx, dy) || 1;
        player.vx = (dx / length) * PLAYER_SPEED;
        player.vy = (dy / length) * PLAYER_SPEED;
      } else if (player.targetX !== null && player.targetY !== null) {
        const targetDx = player.targetX - player.x;
        const targetDy = player.targetY - player.y;
        const distance = Math.hypot(targetDx, targetDy);

        if (distance > PLAYER_SPEED) {
          player.vx = (targetDx / distance) * PLAYER_SPEED;
          player.vy = (targetDy / distance) * PLAYER_SPEED;
        } else {
          player.x = player.targetX;
          player.y = player.targetY;
          player.vx = 0;
          player.vy = 0;
          player.targetX = null;
          player.targetY = null;
        }
      } else {
        player.vx = 0;
        player.vy = 0;
      }

      player.x += player.vx;
      player.y += player.vy;

      const maxX = Math.max(
        PLAYER_MARGIN,
        document.documentElement.clientWidth - PLAYER_MARGIN
      );
      player.x = Math.max(PLAYER_MARGIN, Math.min(maxX, player.x));
      player.y = Math.max(PLAYER_MARGIN, Math.min(WORLD_HEIGHT - 50, player.y));

      if (Math.abs(player.vx) > Math.abs(player.vy)) {
        if (player.vx > 0) player.dir = 'right';
        else if (player.vx < 0) player.dir = 'left';
      } else if (Math.abs(player.vy) > 0) {
        if (player.vy > 0) player.dir = 'down';
        else if (player.vy < 0) player.dir = 'up';
      }

      if (player.vx !== 0 || player.vy !== 0) {
        player.animFrame += 0.2;
      } else {
        player.animFrame = 0;
      }
    };

    const updateCamera = () => {
      const player = playerRef.current;
      const isMoving =
        player.vx !== 0 || player.vy !== 0 || player.targetY !== null;

      if (!isMoving) {
        cameraYRef.current = window.scrollY;
        return;
      }

      const viewportHeight = window.innerHeight;
      let targetY = player.y - viewportHeight / 2;
      targetY = Math.max(0, Math.min(WORLD_HEIGHT - viewportHeight, targetY));
      cameraYRef.current += (targetY - cameraYRef.current) * 0.1;
      window.scrollTo(0, cameraYRef.current);
    };

    let timeRef = 0;

    const animate = () => {
      updatePlayer();
      updateCamera();

      context.fillStyle = 'rgba(248, 249, 250, 0.6)';
      context.fillRect(0, 0, window.innerWidth, window.innerHeight);
      timeRef += 1;

      cellsRef.current.forEach((cell) => {
        cell.worldX += cell.vx + Math.sin(timeRef * 0.01 + cell.phase) * 0.2;
        cell.worldY += cell.vy + Math.cos(timeRef * 0.01 + cell.phase) * 0.2;

        const screenY = cell.worldY - window.scrollY;
        if (screenY < -50 || screenY > window.innerHeight + 50) return;

        const radiusOffset = Math.sin(timeRef * 0.1 + cell.phase) * 1.5;
        const rx = Math.max(0.1, cell.radius + radiusOffset);
        const ry = Math.max(0.1, cell.radius - radiusOffset * 0.5);

        context.beginPath();
        context.ellipse(
          cell.worldX,
          screenY,
          rx,
          ry,
          cell.phase + timeRef * 0.01,
          0,
          Math.PI * 2
        );
        context.fillStyle = cell.color;
        context.fill();
      });

      edges.forEach(([fromId, toId, color, width], index) => {
        const from = document.getElementById(fromId);
        const to = document.getElementById(toId);
        if (!from || !to) return;

        drawVein(
          getScreenCenter(from),
          getScreenCenter(to),
          color,
          width,
          index * 10
        );
      });

      drawPlayer();
      frameRef.current = window.requestAnimationFrame(animate);
    };

    resize();
    handleScroll();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('contextmenu', handleContextMenu);
    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [worldActive]);

  return (
    <section
      id="home"
      className="relative isolate w-full overflow-hidden"
      style={{ minHeight: `${WORLD_HEIGHT}px` }}
    >
      <style>{`
        @keyframes village-squish {
          0% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
          33% { border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%; }
          66% { border-radius: 30% 70% 30% 70% / 50% 60% 30% 60%; }
          100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
        }

        @keyframes village-breath {
          0% { transform: translate(-50%, -50%) scale(0.95); }
          100% { transform: translate(-50%, -50%) scale(1.05); }
        }

        @keyframes village-glitch-1 {
          0% { clip-path: polygon(0 20%, 100% 20%, 100% 21%, 0 21%); }
          100% { clip-path: polygon(0 60%, 100% 60%, 100% 61%, 0 61%); }
        }

        @keyframes village-glitch-2 {
          0% { clip-path: polygon(0 80%, 100% 80%, 100% 81%, 0 81%); }
          100% { clip-path: polygon(0 10%, 100% 10%, 100% 11%, 0 11%); }
        }

        .village-glitch {
          position: relative;
          color: #7f1010;
        }

        .village-glitch::before,
        .village-glitch::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: transparent;
        }

        .village-glitch::before {
          left: 2px;
          text-shadow: -1px 0 rgba(0,255,0,0.35);
          animation: village-glitch-1 2s infinite linear alternate-reverse;
          clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
        }

        .village-glitch::after {
          left: -2px;
          text-shadow: -1px 0 rgba(0,0,255,0.35);
          animation: village-glitch-2 3s infinite linear alternate-reverse;
          clip-path: polygon(0 80%, 100% 20%, 100% 100%, 0 100%);
        }

        .village-node {
          position: absolute;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          z-index: 10;
          background: radial-gradient(circle at 30% 30%, #ffffff, #ffe0e0);
          box-shadow:
            inset 5px 5px 15px rgba(255, 255, 255, 0.9),
            inset -5px -5px 20px rgba(150,0,0,0.1),
            0 5px 15px rgba(100, 0, 0, 0.15);
          border: 1px solid rgba(200, 50, 50, 0.3);
          transition: filter 0.3s;
        }

        .village-node.village-organic {
          animation: village-breath 4s ease-in-out infinite alternate, village-squish 8s ease-in-out infinite;
        }

        .village-node:hover {
          filter: brightness(1.05) contrast(1.2);
          box-shadow:
            inset 10px 10px 20px rgba(255, 255, 255, 0.8),
            inset -10px -10px 30px rgba(150,0,0,0.2),
            0 0 30px rgba(255, 0, 0, 0.4);
          z-index: 20;
        }

        .village-node-core {
          width: 180px;
          height: 180px;
          background: radial-gradient(circle at 30% 30%, #fff0f0, #ffcccc);
        }

        .village-node-main {
          width: 140px;
          height: 140px;
        }

        .village-node-sub {
          width: 90px;
          height: 90px;
          background: radial-gradient(circle at 30% 30%, #ffffff, #f0f0f0);
          box-shadow:
            inset 5px 5px 10px rgba(255,255,255,0.8),
            inset -5px -5px 15px rgba(0,0,0,0.05);
        }

        .village-node-inactive {
          filter: grayscale(1) opacity(0.5);
          border: 1px dashed #aaa;
          cursor: default;
        }

        .village-building {
          width: 350px;
          height: 200px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.85);
          border: 2px solid rgba(138, 3, 3, 0.4);
          box-shadow: 0 20px 50px rgba(100, 0, 0, 0.1);
          backdrop-filter: blur(5px);
          padding: 1.5rem 1.3rem;
        }

        .village-building::after {
          content: '';
          position: absolute;
          bottom: -20px;
          left: 10%;
          width: 80%;
          height: 20px;
          background: rgba(0,0,0,0.1);
          filter: blur(10px);
          border-radius: 50%;
        }

        .village-building-core {
          height: 250px;
        }

        .village-panel-section-title {
          margin-bottom: 0.5rem;
          border-bottom: 1px solid rgba(180, 38, 38, 0.18);
          padding-bottom: 0.35rem;
          font-family: var(--font-mono), monospace;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: #8f1515;
        }

        .village-data-card {
          position: relative;
          margin-bottom: 1rem;
          border: 1px solid #cc0000;
          background: rgba(255, 255, 255, 0.8);
          padding: 1rem;
          transition: all 0.2s;
        }

        .village-data-card::before {
          content: '[DATA_EXTRACT]';
          position: absolute;
          top: -10px;
          left: 10px;
          background: #fff;
          color: #cc0000;
          font-size: 0.7rem;
          padding: 0 5px;
          font-family: var(--font-brush), serif;
          font-weight: bold;
        }
      `}</style>

      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0 h-full w-full"
        style={{
          filter: 'contrast(1.1) saturate(1.2)',
          opacity: worldActive ? 1 : 0,
          transition: 'opacity 180ms ease'
        }}
      />

      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0) 50%, rgba(0,0,0,0.03) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
          backgroundSize: '100% 4px, 3px 100%',
          opacity: worldActive ? 0.8 : 0,
          transition: 'opacity 180ms ease'
        }}
      />

      <div
        className="pointer-events-none fixed left-8 top-24 z-40"
        style={{
          opacity: worldActive ? 1 : 0,
          transition: 'opacity 180ms ease'
        }}
      >
        <div className="mb-1 font-[var(--font-brush)] text-sm font-bold tracking-widest text-red-700">
          {'> SYSTEM_ONLINE...'}
        </div>
        <h1
          className="village-glitch font-[var(--font-display-kr)] text-4xl font-black tracking-widest text-red-800"
          data-text="NEBULA_VILLAGE.exe"
        >
          NEBULA_VILLAGE.exe
        </h1>
        <p className="mt-2 inline-block bg-red-900 px-2 py-1 font-[var(--font-brush)] text-xs text-white">
          WARNING: DEEP LAYER ACCESSIBLE
        </p>
      </div>

      <div
        className="pointer-events-none fixed bottom-6 left-6 z-40 rounded border-2 border-red-800 bg-white/95 p-4 shadow-[0_0_20px_rgba(255,0,0,0.15)]"
        style={{
          opacity: worldActive ? 1 : 0,
          transition: 'opacity 180ms ease'
        }}
      >
        <p className="mb-2 font-[var(--font-brush)] text-base font-bold text-red-800">
          탐사대원 제어기동
        </p>
        <p className="mb-1 font-[var(--font-brush)] text-xs font-bold text-gray-800">
          ▪ 키보드 [W,A,S,D] 또는 [방향키] : 아바타 이동
        </p>
        <p className="mb-1 font-[var(--font-brush)] text-xs font-bold text-gray-800">
          ▪ 마우스 [우클릭] : 자동 이동 좌표 찍기
        </p>
        <p className="mt-2 font-[var(--font-brush)] text-xs font-bold text-red-600">
          ※ 스크롤은 아바타 시점을 자동 추적합니다. 밑으로 내려가면 같이
          따라간다.
        </p>
      </div>

      <div
        className="relative w-full"
        style={{
          height: `${WORLD_HEIGHT}px`,
          backgroundColor: '#f8f9fa',
          backgroundImage:
            'linear-gradient(rgba(200, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(200, 0, 0, 0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      >
        <div
          className="absolute left-0 top-[900px] z-[1] h-5 w-full opacity-20"
          style={{
            background:
              'repeating-linear-gradient(45deg, #cc0000, #cc0000 20px, #ffffff 20px, #ffffff 40px)'
          }}
        />
        <div className="pointer-events-none absolute left-0 top-[950px] z-[1] w-full text-center font-[var(--font-display-kr)] text-6xl font-black tracking-widest text-red-200 opacity-20">
          ⬇ DEEP UNDERGROUND FACILITY ⬇
        </div>
        <div
          className="absolute left-0 top-[3400px] z-[1] h-5 w-full opacity-20"
          style={{
            background:
              'repeating-linear-gradient(45deg, #cc0000, #cc0000 20px, #ffffff 20px, #ffffff 40px)'
          }}
        />

        {worldNodes.map((node) => {
          const interactive = Boolean(node.onClickPanel);
          return (
            <div
              key={node.id}
              id={node.id}
              onClick={
                node.onClickPanel
                  ? () => setActivePanel(node.onClickPanel!)
                  : undefined
              }
              className={`village-node ${node.bodyClassName} ${
                node.organic ? 'village-organic' : ''
              } ${interactive ? '' : 'cursor-default'}`}
              style={{
                left: node.left,
                top: `${node.top}px`,
                width: node.width ? `${node.width}px` : undefined
              }}
            >
              {node.label ? (
                <span
                  className={`mb-1 font-[var(--font-mono)] text-[0.65rem] font-bold tracking-[0.1em] text-red-700 ${
                    node.labelClassName ?? ''
                  }`}
                >
                  {node.label}
                </span>
              ) : null}

              {node.title ? (
                <span className="font-[var(--font-display-kr)] text-[1.2rem] font-black tracking-[1px] text-[#3a0000]">
                  {node.title}
                </span>
              ) : null}

              {node.description ? (
                <div className="mb-3 border-b-2 border-dashed border-[#ffcccc] pb-2 font-[var(--font-display-kr)] text-[1.5rem] font-black text-[#8a0303]">
                  {node.label}
                </div>
              ) : null}

              {node.description ? (
                <div className="font-[var(--font-brush)] text-[0.8rem] font-bold text-[#555]">
                  {node.description}
                </div>
              ) : null}

              {node.subLabel ? (
                <span
                  className={`mt-2 font-[var(--font-brush)] text-xs font-bold text-gray-500 ${node.subLabelClassName ?? ''} ${
                    node.description
                      ? 'inline-block border border-red-300 bg-red-50 px-2 py-1'
                      : ''
                  }`}
                >
                  {node.subLabel}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {activePanel && currentPanel ? (
        <div
          data-village-panel="true"
          className="fixed right-0 top-0 z-[100] flex h-full w-full max-w-[500px] flex-col border-l-2 border-[#cc0000] bg-white/95 shadow-[-20px_0_50px_rgba(0,0,0,0.1)]"
        >
          <div className="border-b border-dashed border-[#cc0000] bg-[repeating-linear-gradient(45deg,rgba(255,255,255,1),rgba(255,255,255,1)_10px,rgba(250,240,240,1)_10px,rgba(250,240,240,1)_20px)] p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 font-[var(--font-mono)] text-xs font-bold tracking-[0.2em] text-red-600">
                  {currentPanel.label}
                </div>
                <h2 className="mb-1 font-[var(--font-display-kr)] text-4xl font-black tracking-widest text-black">
                  {currentPanel.title}
                </h2>
                <p className="mt-1 inline-block bg-red-900 px-2 text-sm font-[var(--font-brush)] text-white">
                  {currentPanel.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="border border-red-900 bg-red-900 px-3 py-1 font-[var(--font-brush)] text-xl font-bold text-white transition-colors hover:bg-red-700"
              >
                [X]
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 text-[#333]">
            {renderPanelBody(activePanel)}
          </div>

          <div className="border-t border-red-200 bg-white px-8 py-4">
            <div className="flex items-center justify-between font-[var(--font-brush)] text-xs font-bold text-red-800">
              <span>
                SYS_STATUS:{' '}
                <span className="animate-pulse text-red-600">PULSING</span>
              </span>
              <span>BIOMETRICS: STABLE</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

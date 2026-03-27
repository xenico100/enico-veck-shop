'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { useAuth } from '@/app/context/AuthContext';
import { createClient } from '@/utils/supabase/client';

const WORLD_HEIGHT = 4300;
const MOBILE_WORLD_WIDTH = 1480;
const DESKTOP_MIN_WORLD_WIDTH = 1280;
const PLAYER_SCALE = 5;
const PLAYER_SPEED = 5.8;
const REMOTE_PLAYER_SPEED = 8.8;
const REMOTE_SYNC_INTERVAL_MS = 120;
const MOVEMENT_BROADCAST_INTERVAL_MS = 45;
const REMOTE_SNAP_DISTANCE = 90;
const DESKTOP_VERTICAL_CAMERA_LERP = 0.1;
const DESKTOP_HORIZONTAL_CAMERA_LERP = 0.14;
const PLAYER_MARGIN = 40;
const PLAYER_SPAWN_Y = 520;
const PRESENCE_CHANNEL = 'bio-village-presence-v1';
const PARTICIPANT_SESSION_STORAGE_KEY = 'bio-village-participant-session-v1';
const POOP_SETTLE_MS = 720;
const POOP_TTL_MS = 1000 * 60 * 60 * 2;

type Direction = 'down' | 'left' | 'right' | 'up';
type SpritePreset = 'archivist' | 'courier' | 'ghost' | 'medic';
type PaletteKey = 'amber' | 'cobalt' | 'crimson' | 'jade' | 'violet';

type AvatarProfile = {
  bio: string;
  interests: string;
  mbti: string;
  name: string;
  tagline: string;
};

type AppearanceState = {
  palette: PaletteKey;
  preset: SpritePreset;
};

type VillageProfilePayload = AppearanceState & {
  bio: string;
  interests: string;
  mbti: string;
  nickname: string;
  tagline: string;
};

type ActorState = {
  animFrame: number;
  dir: Direction;
  id: string;
  label: string;
  palette: PaletteKey;
  preset: SpritePreset;
  profile: AvatarProfile;
  speed: number;
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

type PoopDrop = {
  actorId: string;
  createdAt: number;
  id: string;
  x: number;
  y: number;
};

type PoopAnimationState = {
  actorId: string;
  dropX: number;
  dropY: number;
  id: string;
  startedAt: number;
};

type FacilityNode = {
  bodyClassName: string;
  caption: string;
  id: string;
  left: string;
  subtitle: string;
  tab: VillageShopTab;
  title: string;
  top: number;
  width?: number;
};

type VillageShopTab = 'diagram' | 'goods' | 'studio';

type VillageShopNode = {
  hint: string;
  id: string;
  left: string;
  tab: VillageShopTab;
  title: string;
  top: number;
  width: number;
};

type SelectedTarget = { kind: 'remote'; id: string } | { kind: 'self' };

type PresenceStateValue = Record<string, Array<Record<string, unknown>>>;

const poopPixelPattern = [
  { color: '#7c4b19', x: 6, y: 0 },
  { color: '#7c4b19', x: 12, y: 0 },
  { color: '#7c4b19', x: 0, y: 6 },
  { color: '#8a571f', x: 6, y: 6 },
  { color: '#8a571f', x: 12, y: 6 },
  { color: '#7c4b19', x: 18, y: 6 },
  { color: '#5b3310', x: 0, y: 12 },
  { color: '#8a571f', x: 6, y: 12 },
  { color: '#8a571f', x: 12, y: 12 },
  { color: '#8a571f', x: 18, y: 12 },
  { color: '#5b3310', x: 24, y: 12 },
  { color: '#5b3310', x: 6, y: 18 },
  { color: '#6c4014', x: 12, y: 18 },
  { color: '#5b3310', x: 18, y: 18 }
] as const;

const directions: Record<string, Direction> = {
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up'
};

const spriteSets: Record<SpritePreset, Record<Direction, string[]>> = {
  archivist: {
    down: [
      '  OOOO  ',
      ' OHHHHO ',
      'OHSSSSHO',
      'OHSEESHO',
      ' OACCAA ',
      ' OACCAA ',
      '  OCCA  ',
      '  O  O  ',
      ' OO  OO '
    ],
    left: [
      '  OOOO  ',
      ' OHHHHO ',
      ' OHSSSO ',
      ' OHSEEO ',
      '  OACCA ',
      '  OACCA ',
      '   OCCA ',
      '   O O  ',
      '  OO O  '
    ],
    right: [
      '  OOOO  ',
      ' OHHHHO ',
      ' OSSSHO ',
      ' OEESHO ',
      ' ACCAO  ',
      ' ACCAO  ',
      ' ACCO   ',
      '  O O   ',
      '  O OO  '
    ],
    up: [
      '  OOOO  ',
      ' OHHHHO ',
      'OHHHHHHO',
      'OHSSSSHO',
      ' OACCAA ',
      ' OACCAA ',
      '  OCCA  ',
      '  O  O  ',
      ' OO  OO '
    ]
  },
  courier: {
    down: [
      '  OOOO  ',
      ' OHHHHO ',
      'OHSSSSHO',
      'OHSEESHO',
      ' OAAACO ',
      ' OCCCCO ',
      '  OCCO  ',
      ' O OOO  ',
      ' OO  OO '
    ],
    left: [
      '  OOOO  ',
      ' OHHHHO ',
      ' OHSSSO ',
      ' OHSEEO ',
      '  OAAAO ',
      '  OCCCO ',
      '   OCCO ',
      '  O OOO ',
      '  OO O  '
    ],
    right: [
      '  OOOO  ',
      ' OHHHHO ',
      ' OSSSHO ',
      ' OEESHO ',
      ' OAAAO  ',
      ' OCCCO  ',
      ' OCCO   ',
      ' OOO O  ',
      '  O OO  '
    ],
    up: [
      '  OOOO  ',
      ' OHHHHO ',
      'OHHAAHHO',
      'OHSSSSHO',
      ' OCCCCO ',
      ' OCCCCO ',
      '  OCCO  ',
      ' O OOO  ',
      ' OO  OO '
    ]
  },
  ghost: {
    down: [
      '  OOOO  ',
      ' OHHHHO ',
      'OHSSSSHO',
      'OHSEESHO',
      ' OAAAAO ',
      ' OCCCCO ',
      ' OCEECO ',
      ' O OOOO ',
      ' OO  OO '
    ],
    left: [
      '  OOOO  ',
      ' OHHHHO ',
      ' OHSSSO ',
      ' OHSEEO ',
      '  OAAAO ',
      '  OCCCO ',
      '  OCEEO ',
      '  O OOO ',
      '  OO O  '
    ],
    right: [
      '  OOOO  ',
      ' OHHHHO ',
      ' OSSSHO ',
      ' OEESHO ',
      ' OAAAO  ',
      ' OCCCO  ',
      ' OEECO  ',
      ' OOO O  ',
      '  O OO  '
    ],
    up: [
      '  OOOO  ',
      ' OHHHHO ',
      'OHHHHHHO',
      'OHSSSSHO',
      ' OAAAAO ',
      ' OCCCCO ',
      ' OCEECO ',
      ' O OOOO ',
      ' OO  OO '
    ]
  },
  medic: {
    down: [
      '  OOOO  ',
      ' OHHHHO ',
      'OHSSSSHO',
      'OHSEESHO',
      ' OACCCO ',
      ' OCCCCO ',
      ' OCAACO ',
      '  O  O  ',
      ' OO  OO '
    ],
    left: [
      '  OOOO  ',
      ' OHHHHO ',
      ' OHSSSO ',
      ' OHSEEO ',
      '  OACCO ',
      '  OCCCO ',
      '  OCAAO ',
      '   O O  ',
      '  OO O  '
    ],
    right: [
      '  OOOO  ',
      ' OHHHHO ',
      ' OSSSHO ',
      ' OEESHO ',
      ' OCCAO  ',
      ' OCCCO  ',
      ' OAACO  ',
      '  O O   ',
      '  O OO  '
    ],
    up: [
      '  OOOO  ',
      ' OHHHHO ',
      'OHHAAHHO',
      'OHSSSSHO',
      ' OCCCCO ',
      ' OCCCCO ',
      ' OCAACO ',
      '  O  O  ',
      ' OO  OO '
    ]
  }
};

const paletteMap: Record<
  PaletteKey,
  {
    accent: string;
    body: string;
    eye: string;
    hair: string;
    name: string;
    outline: string;
    skin: string;
  }
> = {
  amber: {
    accent: '#ffe59a',
    body: '#f5b44f',
    eye: '#5d2506',
    hair: '#5f3412',
    name: 'Amber',
    outline: '#32120a',
    skin: '#ffd8b2'
  },
  cobalt: {
    accent: '#d6e4ff',
    body: '#5f87ff',
    eye: '#0f1e55',
    hair: '#233875',
    name: 'Cobalt',
    outline: '#101931',
    skin: '#ffd5b4'
  },
  crimson: {
    accent: '#ffd2cb',
    body: '#e05f5f',
    eye: '#541010',
    hair: '#612020',
    name: 'Crimson',
    outline: '#2c0c0c',
    skin: '#ffd9ba'
  },
  jade: {
    accent: '#dcfff0',
    body: '#4fcb9c',
    eye: '#0f4632',
    hair: '#1b5842',
    name: 'Jade',
    outline: '#0e251e',
    skin: '#ffe0c6'
  },
  violet: {
    accent: '#ede0ff',
    body: '#9c6fff',
    eye: '#352056',
    hair: '#49306f',
    name: 'Violet',
    outline: '#1c1230',
    skin: '#ffd7bb'
  }
};

const facilityNodes: FacilityNode[] = [
  {
    bodyClassName: 'village-atrium-card',
    caption: 'LOBBY / MATCH CORE',
    id: 'atrium-heart',
    left: '52%',
    subtitle: '중앙 접속 심장. 매칭 신호와 유저 흐름이 모이는 코어.',
    tab: 'diagram',
    title: 'Clinical Atrium',
    top: 250,
    width: 232
  },
  {
    bodyClassName: 'village-node-card',
    caption: 'PROFILE LAB',
    id: 'profile-lab',
    left: '23%',
    subtitle: '소개, 관심사, MBTI를 다듬는 생체 프로필 부스.',
    tab: 'studio',
    title: 'Profile Lab',
    top: 980,
    width: 280
  },
  {
    bodyClassName: 'village-node-card',
    caption: 'SIGNAL LOUNGE',
    id: 'signal-lounge',
    left: '76%',
    subtitle: '좌클릭으로 타인의 기록을 읽고 채팅 훅을 여는 구역.',
    tab: 'studio',
    title: 'Signal Lounge',
    top: 1160,
    width: 300
  },
  {
    bodyClassName: 'village-node-card',
    caption: 'MEMORY WARD',
    id: 'memory-ward',
    left: '28%',
    subtitle: '자기소개와 감정 기록이 축적되는 병동형 갤러리.',
    tab: 'goods',
    title: 'Memory Ward',
    top: 1920,
    width: 320
  },
  {
    bodyClassName: 'village-node-card',
    caption: 'RESONANCE GRID',
    id: 'resonance-grid',
    left: '72%',
    subtitle: '랜덤 탐험과 공감 신호가 순환하는 실험층.',
    tab: 'studio',
    title: 'Resonance Grid',
    top: 2240,
    width: 310
  },
  {
    bodyClassName: 'village-core-card',
    caption: 'DEEP LAYER / DATING CORE',
    id: 'deep-core',
    left: '50%',
    subtitle: '완주한 감정 기록과 매칭 로그가 쌓이는 지하 통제실.',
    tab: 'diagram',
    title: 'Midnight Dating Core',
    top: 2860,
    width: 420
  }
];

const villageShopNodes: VillageShopNode[] = [
  {
    hint: '더블클릭: 멤버십 영상',
    id: 'studio-access-shop',
    left: '74%',
    tab: 'studio',
    title: 'Tape Garden Booth',
    top: 790,
    width: 214
  },
  {
    hint: '더블클릭: 굿즈 판매',
    id: 'goods-access-shop',
    left: '28%',
    tab: 'goods',
    title: 'Goods Counter',
    top: 745,
    width: 236
  },
  {
    hint: '더블클릭: 시스템 다이어그램',
    id: 'diagram-access-shop',
    left: '50%',
    tab: 'diagram',
    title: 'System Shrine',
    top: 1480,
    width: 236
  }
];

const goodsShopVariants = [
  {
    hint: '더블클릭: 복불복 굿즈 진열대',
    title: 'Lucky Plush Pantry'
  },
  {
    hint: '더블클릭: 랜덤 드랍 굿즈 부스',
    title: 'Moon Drop Market'
  },
  {
    hint: '더블클릭: 비밀 굿즈 진열소',
    title: 'Candy Relic Shop'
  }
] as const;

const apparelWorkflowNodes = [
  {
    align: 'center',
    chip: 'FABRIC LINE',
    color: 'rgba(194, 78, 78, 0.92)',
    id: 'apparel-root',
    label: '의류제작 시작',
    x: 50,
    y: 12
  },
  {
    align: 'left',
    chip: 'RAW ORDER',
    color: 'rgba(205, 115, 65, 0.92)',
    id: 'apparel-source',
    label: '원부자재 발주',
    x: 23,
    y: 30
  },
  {
    align: 'right',
    chip: 'CLO SYSTEM',
    color: 'rgba(177, 119, 52, 0.9)',
    id: 'apparel-clo',
    label: 'CLO 3D 설계',
    x: 77,
    y: 43
  },
  {
    align: 'left',
    chip: 'ARCHIVE',
    color: 'rgba(157, 110, 58, 0.9)',
    id: 'apparel-data',
    label: '데이터 저장',
    x: 24,
    y: 58
  },
  {
    align: 'right',
    chip: 'HANDMADE',
    color: 'rgba(161, 76, 54, 0.92)',
    id: 'apparel-final',
    label: '실물 제작',
    x: 78,
    y: 74
  }
] as const;

const villageShopTabMeta: Record<
  VillageShopTab,
  {
    badge: string;
    description: string;
    notes: string[];
    primaryAction: string;
    sectionId: 'about' | 'services' | 'studio';
    title: string;
  }
> = {
  diagram: {
    badge: 'SYSTEM KIOSK',
    description:
      '실시간 아키텍처 흐름과 시스템 다이어그램 구역으로 바로 넘기는 접속 단말.',
    notes: [
      '워크플로우 타임라인과 시스템 문서 구역으로 바로 점프한다.',
      '원하면 시스템 다이어그램 오버레이도 바로 띄울 수 있다.'
    ],
    primaryAction: '시스템 다이어그램 구역 열기',
    sectionId: 'about',
    title: 'System Diagram Access'
  },
  goods: {
    badge: 'GOODS COUNTER',
    description:
      '굿즈 판매 섹션으로 바로 이어지고, 장바구니 훅까지 여는 판매 카운터.',
    notes: [
      '굿즈 판매 섹션으로 바로 점프할 수 있다.',
      '장바구니 모달을 바로 띄우는 훅도 함께 붙는다.'
    ],
    primaryAction: '굿즈 판매 섹션 열기',
    sectionId: 'services',
    title: 'Goods Sales Access'
  },
  studio: {
    badge: 'STUDIO ARCHIVE',
    description:
      '멤버십 영상과 스튜디오 기록 섹션으로 바로 연결되는 아카이브 단말.',
    notes: [
      '멤버십 영상이 모여 있는 Studio 구역으로 바로 이동한다.',
      '회원 전용 영상 아카이브 흐름을 탐색하는 입구 역할이다.'
    ],
    primaryAction: '멤버십 영상 섹션 열기',
    sectionId: 'studio',
    title: 'Membership Video Access'
  }
};

const villageShopVisualMeta: Record<
  VillageShopTab,
  {
    chip: string;
    glow: string;
    tone: string;
  }
> = {
  diagram: {
    chip: 'SYSTEM',
    glow: 'rgba(87, 120, 255, 0.16)',
    tone: 'rgba(88, 108, 165, 0.9)'
  },
  goods: {
    chip: 'GOODS',
    glow: 'rgba(255, 166, 126, 0.2)',
    tone: 'rgba(167, 84, 41, 0.9)'
  },
  studio: {
    chip: 'VIDEO',
    glow: 'rgba(215, 126, 255, 0.18)',
    tone: 'rgba(128, 60, 145, 0.9)'
  }
};

const veinEdges: Array<[string, string, string, number]> = [
  ['atrium-heart', 'profile-lab', '#cf3535', 8],
  ['atrium-heart', 'signal-lounge', '#a42828', 8],
  ['profile-lab', 'memory-ward', '#8a2020', 9],
  ['signal-lounge', 'resonance-grid', '#8d2d54', 9],
  ['memory-ward', 'deep-core', '#8a2020', 11],
  ['resonance-grid', 'deep-core', '#8d2d54', 11],
  ['deep-core', 'apparel-tissue-map', '#c65a34', 12]
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getWorldWidth = (viewportWidth: number) =>
  viewportWidth < 768
    ? MOBILE_WORLD_WIDTH
    : Math.max(viewportWidth, DESKTOP_MIN_WORLD_WIDTH);

const getSpawnPoint = (worldWidth: number) => ({
  x: clamp(
    Math.round(worldWidth * 0.5),
    PLAYER_MARGIN,
    Math.max(PLAYER_MARGIN, worldWidth - PLAYER_MARGIN)
  ),
  y: PLAYER_SPAWN_Y
});

const getInitialCameraPosition = (
  worldWidth: number,
  viewportWidth: number,
  viewportHeight: number
) => {
  const spawn = getSpawnPoint(worldWidth);

  return {
    x: clamp(
      spawn.x - viewportWidth / 2,
      0,
      Math.max(0, worldWidth - viewportWidth)
    ),
    y: clamp(
      spawn.y - viewportHeight / 2,
      0,
      Math.max(0, WORLD_HEIGHT - viewportHeight)
    )
  };
};

const applyWorldTransform = (
  layers: Array<HTMLDivElement | null>,
  cameraX: number
) => {
  layers.forEach((layer) => {
    if (!layer) return;
    layer.style.transform = `translate3d(${-cameraX}px, 0, 0)`;
  });
};

const createDefaultProfile = (name: string): AvatarProfile => ({
  bio: '밤에 깨어 있고, 말보다 무드를 오래 남기는 타입.',
  interests: '도트게임 / 전시 / 사운드 / 패션',
  mbti: 'INTJ',
  name,
  tagline: '기억 수집 중'
});

const profileToPayload = (
  profile: AvatarProfile,
  appearance: AppearanceState
): VillageProfilePayload => ({
  bio: profile.bio.trim(),
  interests: profile.interests.trim(),
  mbti: profile.mbti.trim().toUpperCase(),
  nickname: profile.name.trim(),
  palette: appearance.palette,
  preset: appearance.preset,
  tagline: profile.tagline.trim()
});

const payloadToProfile = (
  payload: Partial<VillageProfilePayload>,
  fallbackName: string
) => {
  const defaults = createDefaultProfile(fallbackName);

  return {
    bio: payload.bio?.trim() || defaults.bio,
    interests: payload.interests?.trim() || defaults.interests,
    mbti: payload.mbti?.trim().toUpperCase() || defaults.mbti,
    name: payload.nickname?.trim() || fallbackName,
    tagline: payload.tagline?.trim() || defaults.tagline
  } satisfies AvatarProfile;
};

const buildPresencePayload = (
  participantKey: string,
  player: ActorState,
  userId: string | null | undefined
) => ({
  key: participantKey,
  label: player.label,
  x: player.x,
  y: player.y,
  dir: player.dir,
  palette: player.palette,
  preset: player.preset,
  profile: player.profile,
  userId: userId ?? null,
  updatedAt: new Date().toISOString()
});

const buildMovementPayload = (participantKey: string, player: ActorState) => ({
  dir: player.dir,
  key: participantKey,
  label: player.label,
  moving:
    player.vx !== 0 ||
    player.vy !== 0 ||
    player.targetX !== null ||
    player.targetY !== null,
  palette: player.palette,
  preset: player.preset,
  profile: player.profile,
  sentAt: Date.now(),
  vx: player.vx,
  vy: player.vy,
  x: player.x,
  y: player.y
});

const createCells = (): CellState[] =>
  Array.from({ length: 180 }).map(() => ({
    color:
      Math.random() > 0.5 ? 'rgba(200, 0, 0, 0.15)' : 'rgba(150, 0, 0, 0.2)',
    phase: Math.random() * Math.PI * 2,
    radius: Math.random() * 4 + 1,
    vx: (Math.random() - 0.5) * 0.32,
    vy: (Math.random() - 0.5) * 0.32,
    worldX: Math.random() * 2000 - 500,
    worldY: Math.random() * WORLD_HEIGHT
  }));

const isPaletteKey = (value: unknown): value is PaletteKey =>
  typeof value === 'string' && value in paletteMap;

const isSpritePreset = (value: unknown): value is SpritePreset =>
  typeof value === 'string' && value in spriteSets;

const isDirection = (value: unknown): value is Direction =>
  value === 'up' || value === 'down' || value === 'left' || value === 'right';

const getSpriteSize = (preset: SpritePreset) => {
  const sprite = spriteSets[preset].down;
  return {
    height: sprite.length * PLAYER_SCALE,
    width: sprite[0].length * PLAYER_SCALE
  };
};

const getFacilityCenter = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
};

const getActorScreenPosition = (
  actor: ActorState,
  scrollY: number,
  cameraX: number
) => ({
  x: actor.x - cameraX,
  y: actor.y - scrollY
});

const pruneExpiredPoops = (drops: PoopDrop[], now = Date.now()) =>
  drops.filter((drop) => now - drop.createdAt < POOP_TTL_MS);

function drawActor(
  context: CanvasRenderingContext2D,
  actor: ActorState,
  scrollY: number,
  cameraX: number,
  options?: {
    isPooping?: boolean;
    isSelf?: boolean;
    isSelected?: boolean;
  }
) {
  const sprite = spriteSets[actor.preset][actor.dir];
  const palette = paletteMap[actor.palette];
  const { width, height } = getSpriteSize(actor.preset);
  const squatOffset = options?.isPooping ? 8 : 0;
  const strainJitter = options?.isPooping
    ? Math.sin(performance.now() / 72) * 1.15
    : 0;
  const bounce =
    (actor.vx !== 0 || actor.vy !== 0) && Math.floor(actor.animFrame) % 2 === 0
      ? -4
      : 0;
  const screenX = actor.x - cameraX;
  const screenY = actor.y - scrollY;

  if (
    screenX < -width - 40 ||
    screenX > window.innerWidth + width + 40 ||
    screenY < -height - 40 ||
    screenY > window.innerHeight + height + 40
  ) {
    return;
  }

  if (options?.isSelected) {
    context.save();
    context.beginPath();
    context.arc(screenX, screenY - height * 0.08, width * 0.72, 0, Math.PI * 2);
    context.fillStyle = options.isSelf
      ? 'rgba(255, 96, 96, 0.12)'
      : 'rgba(97, 167, 255, 0.12)';
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = options.isSelf
      ? 'rgba(225, 58, 58, 0.65)'
      : 'rgba(87, 144, 255, 0.7)';
    context.stroke();
    context.restore();
  }

  context.save();
  context.translate(
    screenX - width / 2 + strainJitter,
    screenY - height / 2 + bounce + squatOffset
  );

  for (let row = 0; row < sprite.length; row += 1) {
    for (let col = 0; col < sprite[row].length; col += 1) {
      const char = sprite[row][col];
      if (char === ' ') continue;

      const fill =
        char === 'O'
          ? palette.outline
          : char === 'H'
            ? palette.hair
            : char === 'S'
              ? palette.skin
              : char === 'C'
                ? palette.body
                : char === 'A'
                  ? palette.accent
                  : palette.eye;

      context.fillStyle = fill;
      context.fillRect(
        col * PLAYER_SCALE,
        row * PLAYER_SCALE,
        PLAYER_SCALE,
        PLAYER_SCALE
      );
    }
  }

  context.restore();

  if (options?.isPooping) {
    context.save();
    context.translate(screenX + width * 0.18, screenY - height * 0.68);
    context.fillStyle = 'rgba(123, 68, 20, 0.95)';
    context.beginPath();
    context.arc(0, 0, 3, 0, Math.PI * 2);
    context.arc(6, 3, 2.5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 214, 157, 0.88)';
    context.fillRect(6, -6, 2, 2);
    context.fillRect(8, -4, 2, 2);
    context.restore();
  }

  context.save();
  context.translate(screenX, screenY + height / 2 + 2);
  context.beginPath();
  context.ellipse(0, 0, width / 2, PLAYER_SCALE, 0, 0, Math.PI * 2);
  context.fillStyle = 'rgba(0,0,0,0.14)';
  context.fill();
  context.restore();

  const labelWidth = Math.max(58, actor.label.length * 7.2);
  context.save();
  context.fillStyle = options?.isSelf
    ? 'rgba(255, 249, 249, 0.92)'
    : 'rgba(255, 255, 255, 0.82)';
  context.strokeStyle = options?.isSelf
    ? 'rgba(206, 54, 54, 0.34)'
    : 'rgba(114, 149, 235, 0.28)';
  context.lineWidth = 1;
  context.fillRect(
    screenX - labelWidth / 2,
    screenY - height / 2 - 26,
    labelWidth,
    16
  );
  context.strokeRect(
    screenX - labelWidth / 2,
    screenY - height / 2 - 26,
    labelWidth,
    16
  );
  context.fillStyle = options?.isSelf ? '#6f1111' : '#27416e';
  context.font = '600 10px "IBM Plex Sans KR", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(actor.label, screenX, screenY - height / 2 - 18);
  context.restore();
}

function drawPoopSprite(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  opacity = 1
) {
  context.save();
  context.globalAlpha = opacity;
  context.translate(x, y);
  poopPixelPattern.forEach((pixel) => {
    context.fillStyle = pixel.color;
    context.fillRect(
      (pixel.x / 6) * scale,
      (pixel.y / 6) * scale,
      scale,
      scale
    );
  });
  context.restore();
}

const buildRemoteActorsFromPresence = (
  state: PresenceStateValue,
  ownKey: string | null,
  previousActors: ActorState[],
  worldWidth: number
) => {
  const previousMap = new Map(previousActors.map((actor) => [actor.id, actor]));
  const latestEntries = new Map<string, Record<string, unknown>>();

  Object.entries(state).forEach(([presenceKey, metas]) => {
    metas.forEach((meta) => {
      const key =
        typeof meta.key === 'string' && meta.key.trim().length > 0
          ? meta.key.trim()
          : presenceKey;

      if (!key || key === ownKey) return;

      const updatedAt =
        typeof meta.updatedAt === 'string' && meta.updatedAt.trim().length > 0
          ? meta.updatedAt
          : '';
      const previous = latestEntries.get(key);
      const previousUpdatedAt =
        previous && typeof previous.updatedAt === 'string'
          ? previous.updatedAt
          : '';

      if (!previous || updatedAt >= previousUpdatedAt) {
        latestEntries.set(key, { ...meta, key });
      }
    });
  });

  return Array.from(latestEntries.entries())
    .map(([key, meta]) => {
      const previous = previousMap.get(key);
      const label =
        typeof meta.label === 'string' && meta.label.trim().length > 0
          ? meta.label.trim()
          : `Visitor ${key.slice(0, 4)}`;
      const palette = isPaletteKey(meta.palette) ? meta.palette : 'crimson';
      const preset = isSpritePreset(meta.preset) ? meta.preset : 'archivist';
      const dir = isDirection(meta.dir) ? meta.dir : 'down';
      const payloadProfile =
        meta.profile && typeof meta.profile === 'object'
          ? (meta.profile as Partial<AvatarProfile>)
          : {};
      const profile: AvatarProfile = {
        bio:
          typeof payloadProfile.bio === 'string' && payloadProfile.bio.trim()
            ? payloadProfile.bio.trim()
            : createDefaultProfile(label).bio,
        interests:
          typeof payloadProfile.interests === 'string' &&
          payloadProfile.interests.trim()
            ? payloadProfile.interests.trim()
            : createDefaultProfile(label).interests,
        mbti:
          typeof payloadProfile.mbti === 'string' && payloadProfile.mbti.trim()
            ? payloadProfile.mbti.trim()
            : createDefaultProfile(label).mbti,
        name:
          typeof payloadProfile.name === 'string' && payloadProfile.name.trim()
            ? payloadProfile.name.trim()
            : label,
        tagline:
          typeof payloadProfile.tagline === 'string' &&
          payloadProfile.tagline.trim()
            ? payloadProfile.tagline.trim()
            : createDefaultProfile(label).tagline
      };

      const nextX = clamp(
        typeof meta.x === 'number'
          ? meta.x
          : (previous?.x ?? getSpawnPoint(worldWidth).x),
        PLAYER_MARGIN,
        Math.max(PLAYER_MARGIN, worldWidth - PLAYER_MARGIN)
      );
      const nextY = clamp(
        typeof meta.y === 'number' ? meta.y : (previous?.y ?? PLAYER_SPAWN_Y),
        120,
        WORLD_HEIGHT - 100
      );

      return {
        animFrame: previous?.animFrame ?? 0,
        dir,
        id: key,
        label,
        palette,
        preset,
        profile,
        speed: REMOTE_PLAYER_SPEED,
        targetX: nextX,
        targetY: nextY,
        vx: previous?.vx ?? 0,
        vy: previous?.vy ?? 0,
        x:
          previous &&
          Math.hypot(previous.x - nextX, previous.y - nextY) <
            REMOTE_SNAP_DISTANCE
            ? previous.x
            : nextX,
        y:
          previous &&
          Math.hypot(previous.x - nextX, previous.y - nextY) <
            REMOTE_SNAP_DISTANCE
            ? previous.y
            : nextY
      } satisfies ActorState;
    })
    .sort((left, right) => left.label.localeCompare(right.label));
};

export default function BioVillageLanding() {
  const { loading: authLoading, user } = useAuth();
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const avatarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldBackdropRef = useRef<HTMLDivElement | null>(null);
  const worldObjectsRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const poopAnimationsRef = useRef<PoopAnimationState[]>([]);
  const poopSettleTimeoutsRef = useRef<Map<string, number>>(new Map());
  const poopExpiryTimeoutsRef = useRef<Map<string, number>>(new Map());
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const participantKeyRef = useRef<string | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const cellsRef = useRef<CellState[]>([]);
  const remoteActorsRef = useRef<ActorState[]>([]);
  const selectedTargetRef = useRef<SelectedTarget | null>(null);
  const selfPoopHoldingRef = useRef(false);
  const lastMovementBroadcastRef = useRef(0);
  const lastMovementActiveRef = useRef(false);
  const cameraXRef = useRef(0);
  const cameraYRef = useRef(0);
  const worldWidthRef = useRef(DESKTOP_MIN_WORLD_WIDTH);
  const lastPresenceSyncRef = useRef(0);
  const initialViewportAlignedRef = useRef(false);
  const ignoreClickUntilRef = useRef(0);
  const lastStructureTapRef = useRef<{ id: string; time: number } | null>(null);
  const touchStateRef = useRef<{
    moved: boolean;
    startScrollY: number;
    targetIsUi: boolean;
    x: number;
    y: number;
  } | null>(null);
  const playerRef = useRef<ActorState>({
    animFrame: 0,
    dir: 'down',
    id: 'self',
    label: 'YOU',
    palette: 'crimson',
    preset: 'archivist',
    profile: createDefaultProfile('YOU'),
    speed: PLAYER_SPEED,
    targetX: null,
    targetY: null,
    vx: 0,
    vy: 0,
    x: 0,
    y: PLAYER_SPAWN_Y
  });

  const [scrollY, setScrollY] = useState(0);
  const [worldWidth, setWorldWidth] = useState(DESKTOP_MIN_WORLD_WIDTH);
  const [participantKey, setParticipantKey] = useState<string | null>(null);
  const [appearance, setAppearance] = useState<AppearanceState>({
    palette: 'crimson',
    preset: 'archivist'
  });
  const [selfProfile, setSelfProfile] = useState<AvatarProfile>(() =>
    createDefaultProfile(user?.name?.trim() || 'YOU')
  );
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget | null>(
    null
  );
  const [activeVillageShopTab, setActiveVillageShopTab] =
    useState<VillageShopTab | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [remoteRevision, setRemoteRevision] = useState(0);
  const [onlineVisitors, setOnlineVisitors] = useState<
    Array<{ id: string; label: string; palette: PaletteKey }>
  >([]);
  const [poopDrops, setPoopDrops] = useState<PoopDrop[]>([]);

  const worldActive = scrollY < WORLD_HEIGHT - 96;

  selectedTargetRef.current = selectedTarget;
  participantKeyRef.current = participantKey;

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !window.history) return;

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored =
      window.sessionStorage.getItem(PARTICIPANT_SESSION_STORAGE_KEY) ||
      `bio-village-session-${crypto.randomUUID()}`;

    window.sessionStorage.setItem(PARTICIPANT_SESSION_STORAGE_KEY, stored);
    setParticipantKey(stored);
  }, []);

  const selectedRemote = useMemo(() => {
    if (selectedTarget?.kind !== 'remote') return null;
    return (
      remoteActorsRef.current.find((actor) => actor.id === selectedTarget.id) ||
      null
    );
  }, [remoteRevision, selectedTarget]);

  const selectedActor =
    selectedTarget?.kind === 'self'
      ? playerRef.current
      : (selectedRemote ?? null);
  const selectedPaletteMeta = selectedActor
    ? paletteMap[selectedActor.palette]
    : null;
  const isSelfProfileTab = selectedTarget?.kind === 'self';
  const goodsShopVariant = useMemo(
    () =>
      goodsShopVariants[Math.floor(Math.random() * goodsShopVariants.length)],
    []
  );
  const renderedVillageShopNodes = useMemo(
    () =>
      villageShopNodes.map((shop) =>
        shop.tab === 'goods'
          ? {
              ...shop,
              hint: goodsShopVariant.hint,
              title: goodsShopVariant.title
            }
          : shop
      ),
    [goodsShopVariant]
  );
  const activeVillageShop = activeVillageShopTab
    ? villageShopTabMeta[activeVillageShopTab]
    : null;

  const removePoopAnimation = useCallback((id: string) => {
    poopAnimationsRef.current = poopAnimationsRef.current.filter(
      (animation) => animation.id !== id
    );
  }, []);

  const schedulePoopExpiry = useCallback((drop: PoopDrop) => {
    const existingTimeout = poopExpiryTimeoutsRef.current.get(drop.id);
    if (existingTimeout !== undefined) {
      window.clearTimeout(existingTimeout);
    }

    const remaining = drop.createdAt + POOP_TTL_MS - Date.now();

    if (remaining <= 0) {
      setPoopDrops((previous) =>
        previous.filter((entry) => entry.id !== drop.id)
      );
      poopExpiryTimeoutsRef.current.delete(drop.id);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPoopDrops((previous) =>
        previous.filter((entry) => entry.id !== drop.id)
      );
      poopExpiryTimeoutsRef.current.delete(drop.id);
    }, remaining);

    poopExpiryTimeoutsRef.current.set(drop.id, timeoutId);
  }, []);

  const startPoopSequence = useCallback(
    (
      actorId: string,
      dropX: number,
      dropY: number,
      id: string,
      createdAt = Date.now()
    ) => {
      const now = Date.now();
      if (now - createdAt >= POOP_TTL_MS) {
        return;
      }

      if (!poopAnimationsRef.current.some((animation) => animation.id === id)) {
        poopAnimationsRef.current = [
          ...poopAnimationsRef.current,
          {
            actorId,
            dropX,
            dropY,
            id,
            startedAt: performance.now()
          }
        ];
      }

      const previousTimeout = poopSettleTimeoutsRef.current.get(id);
      if (previousTimeout !== undefined) {
        window.clearTimeout(previousTimeout);
      }

      const settleTimeout = window.setTimeout(() => {
        const drop = { actorId, createdAt, id, x: dropX, y: dropY };

        setPoopDrops((previous) => {
          const nextDrops = pruneExpiredPoops(
            previous.some((entry) => entry.id === id)
              ? previous
              : [...previous, drop]
          );
          return nextDrops;
        });

        removePoopAnimation(id);
        poopSettleTimeoutsRef.current.delete(id);
        schedulePoopExpiry(drop);
      }, POOP_SETTLE_MS);

      poopSettleTimeoutsRef.current.set(id, settleTimeout);
    },
    [removePoopAnimation, schedulePoopExpiry]
  );

  const applyRemoteMovementPayload = useCallback((payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;

    const data = payload as Record<string, unknown>;
    if (
      typeof data.key !== 'string' ||
      typeof data.x !== 'number' ||
      typeof data.y !== 'number' ||
      typeof data.vx !== 'number' ||
      typeof data.vy !== 'number'
    ) {
      return;
    }

    const ownKey = participantKeyRef.current;
    if (data.key === ownKey) return;

    const label =
      typeof data.label === 'string' && data.label.trim().length > 0
        ? data.label.trim()
        : `Visitor ${data.key.slice(0, 4)}`;
    const palette = isPaletteKey(data.palette) ? data.palette : 'crimson';
    const preset = isSpritePreset(data.preset) ? data.preset : 'archivist';
    const dir = isDirection(data.dir) ? data.dir : 'down';
    const moving = data.moving === true;
    const payloadProfile =
      data.profile && typeof data.profile === 'object'
        ? (data.profile as Partial<AvatarProfile>)
        : {};
    const profile = payloadToProfile(
      {
        bio: payloadProfile.bio,
        interests: payloadProfile.interests,
        mbti: payloadProfile.mbti,
        nickname: payloadProfile.name,
        palette,
        preset,
        tagline: payloadProfile.tagline
      },
      label
    );
    const sentAt =
      typeof data.sentAt === 'number' ? data.sentAt : Date.now() - 16;
    const predictionFrames = moving
      ? Math.min(5, Math.max(1, (Date.now() - sentAt) / 16.7))
      : 0;
    const nextX = clamp(
      data.x + data.vx * predictionFrames,
      PLAYER_MARGIN,
      Math.max(PLAYER_MARGIN, worldWidthRef.current - PLAYER_MARGIN)
    );
    const nextY = clamp(
      data.y + data.vy * predictionFrames,
      120,
      WORLD_HEIGHT - 100
    );

    remoteActorsRef.current = (() => {
      const previousActors = remoteActorsRef.current;
      const actorIndex = previousActors.findIndex(
        (actor) => actor.id === data.key
      );
      const previousActor =
        actorIndex >= 0 ? previousActors[actorIndex] : undefined;
      const movementGap = previousActor
        ? Math.hypot(previousActor.x - nextX, previousActor.y - nextY)
        : 0;
      const nextActor: ActorState = {
        animFrame: moving && previousActor ? previousActor.animFrame + 0.22 : 0,
        dir,
        id: data.key,
        label,
        palette,
        preset,
        profile,
        speed: Math.max(
          REMOTE_PLAYER_SPEED,
          Math.hypot(data.vx, data.vy) * 1.55
        ),
        targetX: nextX,
        targetY: nextY,
        vx: data.vx,
        vy: data.vy,
        x:
          moving && previousActor && movementGap < REMOTE_SNAP_DISTANCE * 1.35
            ? previousActor.x
            : nextX,
        y:
          moving && previousActor && movementGap < REMOTE_SNAP_DISTANCE * 1.35
            ? previousActor.y
            : nextY
      };

      if (actorIndex < 0) {
        return [...previousActors, nextActor];
      }

      const nextActors = [...previousActors];
      nextActors[actorIndex] = nextActor;
      return nextActors;
    })();
  }, []);

  const openVillageShop = (tab: VillageShopTab) => {
    setSelectedTarget(null);
    setActiveVillageShopTab(tab);
  };

  const jumpToVillageSection = (sectionId: 'about' | 'services' | 'studio') => {
    setActiveVillageShopTab(null);
    window.setTimeout(() => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleStructureTouchEnd = (
    event: React.TouchEvent<HTMLElement>,
    structureId: string,
    tab: VillageShopTab
  ) => {
    event.preventDefault();

    const now = Date.now();
    const previousTap = lastStructureTapRef.current;
    if (
      previousTap &&
      previousTap.id === structureId &&
      now - previousTap.time < 320
    ) {
      lastStructureTapRef.current = null;
      openVillageShop(tab);
      return;
    }

    lastStructureTapRef.current = { id: structureId, time: now };
  };

  useEffect(() => {
    if (!user) {
      const fallbackName = 'GUEST';
      setSelfProfile(createDefaultProfile(fallbackName));
      setAppearance({
        palette: 'crimson',
        preset: 'archivist'
      });
      setProfileError(null);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    const fallbackName =
      user.name?.trim() || user.email?.split('@')[0] || 'MEMBER';

    const loadVillageProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);

      try {
        const response = await fetch('/api/account/village-profile', {
          cache: 'no-store'
        });
        const payload = (await response.json().catch(() => ({}))) as {
          data?: Partial<VillageProfilePayload>;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload.message || '회원 아바타 정보를 불러오지 못했습니다.'
          );
        }

        if (cancelled) return;

        setSelfProfile(payloadToProfile(payload.data ?? {}, fallbackName));
        setAppearance({
          palette: isPaletteKey(payload.data?.palette)
            ? payload.data.palette
            : 'crimson',
          preset: isSpritePreset(payload.data?.preset)
            ? payload.data.preset
            : 'archivist'
        });
      } catch (error) {
        if (cancelled) return;
        setSelfProfile(createDefaultProfile(fallbackName));
        setAppearance({
          palette: 'crimson',
          preset: 'archivist'
        });
        setProfileError(
          error instanceof Error
            ? error.message
            : '회원 아바타 정보를 불러오지 못했습니다.'
        );
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    void loadVillageProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const player = playerRef.current;
    player.label = selfProfile.name.trim() || user?.name?.trim() || 'YOU';
    player.profile = selfProfile;
    player.palette = appearance.palette;
    player.preset = appearance.preset;
  }, [appearance, selfProfile, user?.name]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const timer = window.setTimeout(() => setSaveState('idle'), 1400);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  useEffect(() => {
    if (selectedTarget?.kind !== 'remote') return;
    const exists = remoteActorsRef.current.some(
      (actor) => actor.id === selectedTarget.id
    );
    if (!exists) {
      setSelectedTarget(null);
    }
  }, [remoteRevision, selectedTarget]);

  useEffect(() => {
    return () => {
      poopSettleTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      poopSettleTimeoutsRef.current.clear();

      poopExpiryTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      poopExpiryTimeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const handlePoopHoldStart = () => {
      selfPoopHoldingRef.current = true;
    };

    const handlePoopHoldEnd = () => {
      selfPoopHoldingRef.current = false;
    };

    const handlePoopTrigger = () => {
      const player = playerRef.current;
      const { height, width } = getSpriteSize(player.preset);
      const dropX = clamp(
        player.x + width * 0.08,
        PLAYER_MARGIN,
        Math.max(PLAYER_MARGIN, worldWidthRef.current - PLAYER_MARGIN)
      );
      const dropY = clamp(player.y + height * 0.46, 120, WORLD_HEIGHT - 32);
      const animationId = crypto.randomUUID();
      const actorId = participantKeyRef.current ?? 'self';
      const createdAt = Date.now();

      startPoopSequence(actorId, dropX, dropY, animationId, createdAt);

      void presenceChannelRef.current
        ?.send({
          type: 'broadcast',
          event: 'poop-drop',
          payload: {
            actorId,
            createdAt,
            dropX,
            dropY,
            id: animationId
          }
        })
        .catch(() => undefined);
    };

    window.addEventListener(
      'bio-village:poop-hold-start',
      handlePoopHoldStart as EventListener
    );
    window.addEventListener(
      'bio-village:poop-hold-end',
      handlePoopHoldEnd as EventListener
    );
    window.addEventListener(
      'bio-village:poop-trigger',
      handlePoopTrigger as EventListener
    );

    return () => {
      window.removeEventListener(
        'bio-village:poop-hold-start',
        handlePoopHoldStart as EventListener
      );
      window.removeEventListener(
        'bio-village:poop-hold-end',
        handlePoopHoldEnd as EventListener
      );
      window.removeEventListener(
        'bio-village:poop-trigger',
        handlePoopTrigger as EventListener
      );
    };
  }, [startPoopSequence]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPoopDrops((previous) => pruneExpiredPoops(previous));
    }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!supabase || !participantKey) return;

    let cancelled = false;
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        broadcast: { self: false },
        presence: { key: participantKey }
      }
    });
    presenceChannelRef.current = channel;

    const syncPresenceSnapshot = () => {
      if (cancelled) return;
      const nextActors = buildRemoteActorsFromPresence(
        channel.presenceState() as PresenceStateValue,
        participantKey,
        remoteActorsRef.current,
        worldWidthRef.current
      );
      remoteActorsRef.current = nextActors;
      setOnlineVisitors(
        nextActors.map((actor) => ({
          id: actor.id,
          label: actor.label,
          palette: actor.palette
        }))
      );
      setRemoteRevision((previous) => previous + 1);
    };

    const trackSelf = async () => {
      const player = playerRef.current;
      await channel.track(
        buildPresencePayload(participantKey, player, user?.id ?? null)
      );
    };

    channel
      .on('broadcast', { event: 'player-move' }, ({ payload }) => {
        applyRemoteMovementPayload(payload);
      })
      .on('broadcast', { event: 'poop-drop' }, ({ payload }) => {
        if (!payload || typeof payload !== 'object') return;

        const data = payload as Record<string, unknown>;
        if (
          typeof data.id !== 'string' ||
          typeof data.actorId !== 'string' ||
          typeof data.dropX !== 'number' ||
          typeof data.dropY !== 'number'
        ) {
          return;
        }

        startPoopSequence(
          data.actorId,
          data.dropX,
          data.dropY,
          data.id,
          typeof data.createdAt === 'number' ? data.createdAt : Date.now()
        );
      })
      .on('presence', { event: 'sync' }, syncPresenceSnapshot)
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        void trackSelf().catch(() => undefined);
      });

    return () => {
      cancelled = true;
      remoteActorsRef.current = [];
      setOnlineVisitors([]);
      setRemoteRevision((previous) => previous + 1);
      void channel.untrack().catch(() => undefined);
      void supabase.removeChannel(channel).catch(() => undefined);
      presenceChannelRef.current = null;
    };
  }, [
    applyRemoteMovementPayload,
    participantKey,
    startPoopSequence,
    supabase,
    user?.id
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    cellsRef.current = createCells();
    const backgroundCanvas = backgroundCanvasRef.current;
    const avatarCanvas = avatarCanvasRef.current;
    if (!backgroundCanvas || !avatarCanvas) return;

    const backgroundContext = backgroundCanvas.getContext('2d');
    const avatarContext = avatarCanvas.getContext('2d');
    if (!backgroundContext || !avatarContext) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWorldWidth = getWorldWidth(window.innerWidth);
      worldWidthRef.current = nextWorldWidth;
      setWorldWidth(nextWorldWidth);

      [backgroundCanvas, avatarCanvas].forEach((canvas) => {
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
      });
      backgroundContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      avatarContext.setTransform(dpr, 0, 0, dpr, 0, 0);

      const player = playerRef.current;
      if (player.x === 0) {
        const spawn = getSpawnPoint(nextWorldWidth);
        player.x = clamp(
          spawn.x,
          PLAYER_MARGIN,
          Math.max(PLAYER_MARGIN, nextWorldWidth - PLAYER_MARGIN)
        );
        player.y = spawn.y;
      } else {
        player.x = clamp(
          player.x,
          PLAYER_MARGIN,
          Math.max(PLAYER_MARGIN, nextWorldWidth - PLAYER_MARGIN)
        );
      }

      player.y = clamp(player.y || PLAYER_SPAWN_Y, 120, WORLD_HEIGHT - 100);

      if (!initialViewportAlignedRef.current) {
        const initialCamera = getInitialCameraPosition(
          nextWorldWidth,
          window.innerWidth,
          window.innerHeight
        );

        cameraXRef.current = initialCamera.x;
        cameraYRef.current = initialCamera.y;
        initialViewportAlignedRef.current = true;
        setScrollY(initialCamera.y);
        window.scrollTo(0, initialCamera.y);
      } else {
        const maxHorizontalCamera = Math.max(
          0,
          nextWorldWidth - window.innerWidth
        );
        cameraXRef.current = clamp(cameraXRef.current, 0, maxHorizontalCamera);
        cameraYRef.current = clamp(
          cameraYRef.current,
          0,
          Math.max(0, WORLD_HEIGHT - window.innerHeight)
        );
      }

      applyWorldTransform(
        [worldBackdropRef.current, worldObjectsRef.current],
        cameraXRef.current
      );

      remoteActorsRef.current = remoteActorsRef.current.map((actor) => ({
        ...actor,
        targetX:
          actor.targetX == null
            ? null
            : clamp(
                actor.targetX,
                PLAYER_MARGIN,
                Math.max(PLAYER_MARGIN, nextWorldWidth - PLAYER_MARGIN)
              ),
        x: clamp(
          actor.x,
          PLAYER_MARGIN,
          Math.max(PLAYER_MARGIN, nextWorldWidth - PLAYER_MARGIN)
        )
      }));
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
      const player = playerRef.current;
      if (player.vx === 0 && player.vy === 0 && player.targetY === null) {
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
        event.key in directions ||
        ['w', 'W', 'a', 'A', 's', 'S', 'd', 'D'].includes(event.key)
      ) {
        event.preventDefault();
      }

      keysRef.current[event.key] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key] = false;
    };

    const findActorAtPoint = (clientX: number, clientY: number) => {
      const cameraX = cameraXRef.current;
      const actors = [playerRef.current, ...remoteActorsRef.current]
        .map((actor) => ({
          actor,
          ...getActorScreenPosition(actor, window.scrollY, cameraX)
        }))
        .sort((left, right) => right.actor.y - left.actor.y);

      for (const entry of actors) {
        const { width, height } = getSpriteSize(entry.actor.preset);
        const dx = clientX - entry.x;
        const dy = clientY - entry.y;
        const insideBox =
          Math.abs(dx) <= width * 0.72 && Math.abs(dy) <= height * 0.82;
        const insideCore = Math.hypot(dx, dy) <= Math.max(width, height) * 0.66;

        if (insideBox || insideCore) {
          return entry.actor;
        }
      }

      return null;
    };

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-avatar-ui="true"]')) return;
      if (window.scrollY >= WORLD_HEIGHT - 96) return;

      event.preventDefault();
      playerRef.current.targetX = event.clientX + cameraXRef.current;
      playerRef.current.targetY = event.clientY + window.scrollY;
      setSelectedTarget(null);
    };

    const handleClick = (event: MouseEvent) => {
      if (Date.now() < ignoreClickUntilRef.current) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-avatar-ui="true"]')) return;
      if (window.scrollY >= WORLD_HEIGHT - 96) return;

      const hitActor = findActorAtPoint(event.clientX, event.clientY);
      if (!hitActor) {
        setSelectedTarget(null);
        return;
      }

      if (hitActor.id === 'self') {
        setSelectedTarget({ kind: 'self' });
      } else {
        setSelectedTarget({ kind: 'remote', id: hitActor.id });
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        touchStateRef.current = null;
        return;
      }

      const target = event.target as HTMLElement | null;
      touchStateRef.current = {
        moved: false,
        startScrollY: window.scrollY,
        targetIsUi: Boolean(target?.closest('[data-avatar-ui="true"]')),
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const current = touchStateRef.current;
      if (!current || event.touches.length !== 1) return;

      const moveX = Math.abs(event.touches[0].clientX - current.x);
      const moveY = Math.abs(event.touches[0].clientY - current.y);
      const scrollDelta = Math.abs(window.scrollY - current.startScrollY);

      if (moveX > 14 || moveY > 14 || scrollDelta > 10) {
        current.moved = true;
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const current = touchStateRef.current;
      touchStateRef.current = null;

      if (!current || current.targetIsUi || current.moved) return;
      if (window.scrollY >= WORLD_HEIGHT - 96) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      ignoreClickUntilRef.current = Date.now() + 450;
      const hitActor = findActorAtPoint(touch.clientX, touch.clientY);

      if (hitActor) {
        if (hitActor.id === 'self') {
          setSelectedTarget({ kind: 'self' });
        } else {
          setSelectedTarget({ kind: 'remote', id: hitActor.id });
        }
        return;
      }

      setSelectedTarget(null);
      playerRef.current.targetX = touch.clientX + cameraXRef.current;
      playerRef.current.targetY = touch.clientY + window.scrollY;
    };

    const syncPresenceIfNeeded = () => {
      const channel = presenceChannelRef.current;
      const key = participantKeyRef.current;
      if (!channel || !key) return;

      const now = Date.now();
      if (now - lastPresenceSyncRef.current < REMOTE_SYNC_INTERVAL_MS) return;
      lastPresenceSyncRef.current = now;

      const player = playerRef.current;
      void channel
        .track(buildPresencePayload(key, player, user?.id ?? null))
        .catch(() => undefined);
    };

    const syncRealtimeMovementIfNeeded = () => {
      const channel = presenceChannelRef.current;
      const key = participantKeyRef.current;
      if (!channel || !key) return;

      const player = playerRef.current;
      const isMoving =
        player.vx !== 0 ||
        player.vy !== 0 ||
        player.targetX !== null ||
        player.targetY !== null;
      const now = performance.now();

      if (!isMoving && !lastMovementActiveRef.current) {
        return;
      }

      if (
        isMoving &&
        now - lastMovementBroadcastRef.current < MOVEMENT_BROADCAST_INTERVAL_MS
      ) {
        return;
      }

      lastMovementBroadcastRef.current = now;
      lastMovementActiveRef.current = isMoving;

      void channel
        .send({
          type: 'broadcast',
          event: 'player-move',
          payload: buildMovementPayload(key, player)
        })
        .catch(() => undefined);
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
        player.vx = (dx / length) * player.speed;
        player.vy = (dy / length) * player.speed;
      } else if (player.targetX !== null && player.targetY !== null) {
        const targetDx = player.targetX - player.x;
        const targetDy = player.targetY - player.y;
        const distance = Math.hypot(targetDx, targetDy);

        if (distance > player.speed) {
          player.vx = (targetDx / distance) * player.speed;
          player.vy = (targetDy / distance) * player.speed;
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
      player.x = clamp(
        player.x,
        PLAYER_MARGIN,
        Math.max(PLAYER_MARGIN, worldWidthRef.current - PLAYER_MARGIN)
      );
      player.y = clamp(player.y, 120, WORLD_HEIGHT - 100);

      if (Math.abs(player.vx) > Math.abs(player.vy)) {
        if (player.vx > 0) player.dir = 'right';
        else if (player.vx < 0) player.dir = 'left';
      } else if (Math.abs(player.vy) > 0) {
        if (player.vy > 0) player.dir = 'down';
        else if (player.vy < 0) player.dir = 'up';
      }

      if (player.vx !== 0 || player.vy !== 0) {
        player.animFrame += 0.18;
      } else {
        player.animFrame = 0;
      }
    };

    const updateRemoteActors = () => {
      remoteActorsRef.current = remoteActorsRef.current.map((actor) => {
        if (actor.targetX == null || actor.targetY == null) {
          return { ...actor, vx: 0, vy: 0, animFrame: 0 };
        }

        const dx = actor.targetX - actor.x;
        const dy = actor.targetY - actor.y;
        const distance = Math.hypot(dx, dy);

        if (distance < actor.speed + 1) {
          return {
            ...actor,
            animFrame: 0,
            dir:
              Math.abs(dx) > Math.abs(dy)
                ? dx >= 0
                  ? 'right'
                  : 'left'
                : dy >= 0
                  ? 'down'
                  : 'up',
            vx: 0,
            vy: 0,
            x: actor.targetX,
            y: actor.targetY
          };
        }

        const vx = (dx / distance) * actor.speed;
        const vy = (dy / distance) * actor.speed;

        return {
          ...actor,
          animFrame: actor.animFrame + 0.12,
          dir:
            Math.abs(vx) > Math.abs(vy)
              ? vx >= 0
                ? 'right'
                : 'left'
              : vy >= 0
                ? 'down'
                : 'up',
          vx,
          vy,
          x: actor.x + vx,
          y: actor.y + vy
        };
      });
    };

    const updateCamera = () => {
      const player = playerRef.current;
      const isMoving =
        player.vx !== 0 || player.vy !== 0 || player.targetY !== null;
      const isMobileViewport = window.innerWidth < 768;
      const verticalCameraLerp = isMobileViewport
        ? 1
        : DESKTOP_VERTICAL_CAMERA_LERP;
      const horizontalCameraLerp = isMobileViewport
        ? 1
        : DESKTOP_HORIZONTAL_CAMERA_LERP;

      if (!isMoving) {
        cameraYRef.current = window.scrollY;
      } else {
        let targetY = player.y - window.innerHeight / 2;
        targetY = clamp(targetY, 0, WORLD_HEIGHT - window.innerHeight);
        cameraYRef.current +=
          (targetY - cameraYRef.current) * verticalCameraLerp;
        window.scrollTo(0, cameraYRef.current);
      }

      const maxHorizontalCamera = Math.max(
        0,
        worldWidthRef.current - window.innerWidth
      );
      const horizontalTarget = clamp(
        player.x - window.innerWidth / 2,
        0,
        maxHorizontalCamera
      );
      cameraXRef.current +=
        (horizontalTarget - cameraXRef.current) * horizontalCameraLerp;
      applyWorldTransform(
        [worldBackdropRef.current, worldObjectsRef.current],
        cameraXRef.current
      );
    };

    const drawVein = (
      from: { x: number; y: number },
      to: { x: number; y: number },
      color: string,
      baseWidth: number,
      time: number
    ) => {
      if (
        (from.y < -100 && to.y < -100) ||
        (from.y > window.innerHeight + 100 && to.y > window.innerHeight + 100)
      ) {
        return;
      }

      const pulse = Math.sin(time * 0.05 + baseWidth) * 0.5 + 0.5;
      const currentWidth = baseWidth + pulse * 3.4;
      const dx = to.x - from.x;
      const dy = to.y - from.y;

      backgroundContext.beginPath();
      backgroundContext.moveTo(from.x, from.y);

      for (let index = -1; index <= 1; index += 1) {
        const cp1x = from.x + dx / 3 + dy * 0.18 * index;
        const cp1y = from.y + dy / 3 - dx * 0.18 * index;
        const cp2x = from.x + (dx * 2) / 3 - dy * 0.18 * index;
        const cp2y = from.y + (dy * 2) / 3 + dx * 0.18 * index;
        backgroundContext.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y);
      }

      backgroundContext.strokeStyle = color;
      backgroundContext.lineWidth = currentWidth;
      backgroundContext.lineCap = 'round';
      backgroundContext.shadowBlur = 10;
      backgroundContext.shadowColor = 'rgba(255, 64, 64, 0.28)';
      backgroundContext.stroke();

      backgroundContext.strokeStyle = 'rgba(255,255,255,0.28)';
      backgroundContext.lineWidth = currentWidth * 0.24;
      backgroundContext.stroke();
      backgroundContext.shadowBlur = 0;
    };

    let time = 0;

    const animate = () => {
      time += 1;
      updatePlayer();
      updateRemoteActors();
      updateCamera();
      syncPresenceIfNeeded();
      syncRealtimeMovementIfNeeded();

      backgroundContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
      backgroundContext.fillStyle = 'rgba(248, 249, 250, 0.24)';
      backgroundContext.fillRect(0, 0, window.innerWidth, window.innerHeight);
      avatarContext.clearRect(0, 0, window.innerWidth, window.innerHeight);

      cellsRef.current.forEach((cell) => {
        cell.worldX += cell.vx + Math.sin(time * 0.01 + cell.phase) * 0.12;
        cell.worldY += cell.vy + Math.cos(time * 0.01 + cell.phase) * 0.12;

        const screenY = cell.worldY - window.scrollY;
        const screenX = cell.worldX - cameraXRef.current;
        if (
          screenX < -50 ||
          screenX > window.innerWidth + 50 ||
          screenY < -50 ||
          screenY > window.innerHeight + 50
        ) {
          return;
        }

        const radiusOffset = Math.sin(time * 0.09 + cell.phase) * 1.2;
        const rx = Math.max(0.1, cell.radius + radiusOffset);
        const ry = Math.max(0.1, cell.radius - radiusOffset * 0.5);

        backgroundContext.beginPath();
        backgroundContext.ellipse(
          screenX,
          screenY,
          rx,
          ry,
          cell.phase + time * 0.01,
          0,
          Math.PI * 2
        );
        backgroundContext.fillStyle = cell.color;
        backgroundContext.fill();
      });

      veinEdges.forEach(([fromId, toId, color, width]) => {
        const from = document.getElementById(fromId);
        const to = document.getElementById(toId);
        if (!from || !to) return;

        drawVein(
          getFacilityCenter(from),
          getFacilityCenter(to),
          color,
          width,
          time
        );
      });

      const selectedId =
        selectedTargetRef.current?.kind === 'remote'
          ? selectedTargetRef.current.id
          : selectedTargetRef.current?.kind === 'self'
            ? 'self'
            : null;
      const activePoopAnimations = poopAnimationsRef.current;
      const selfPoopActorId = participantKeyRef.current ?? 'self';
      const poopingActorIds = new Set(
        activePoopAnimations.map((animation) => animation.actorId)
      );
      const selfIsPooping =
        selfPoopHoldingRef.current || poopingActorIds.has(selfPoopActorId);

      const visibleRemoteActors = [...remoteActorsRef.current].sort(
        (left, right) => left.y - right.y
      );

      visibleRemoteActors.forEach((actor) => {
        drawActor(avatarContext, actor, window.scrollY, cameraXRef.current, {
          isPooping: poopingActorIds.has(actor.id),
          isSelected: selectedId === actor.id
        });
      });

      activePoopAnimations.forEach((animation) => {
        const sourceActor =
          animation.actorId === selfPoopActorId
            ? playerRef.current
            : (remoteActorsRef.current.find(
                (actor) => actor.id === animation.actorId
              ) ?? null);
        const screenX = animation.dropX - cameraXRef.current;
        const targetY = animation.dropY - window.scrollY;
        const progress = Math.min(
          1,
          (performance.now() - animation.startedAt) / POOP_SETTLE_MS
        );
        const actorHeight = sourceActor
          ? getSpriteSize(sourceActor.preset).height
          : getSpriteSize(playerRef.current.preset).height;
        const startY = sourceActor
          ? sourceActor.y - window.scrollY + actorHeight * 0.12
          : targetY - actorHeight * 0.22;
        const animatedY = startY + (targetY - startY) * progress;

        drawPoopSprite(
          avatarContext,
          screenX - 8,
          animatedY - 6,
          3,
          0.92 - progress * 0.18
        );
      });

      drawActor(
        avatarContext,
        playerRef.current,
        window.scrollY,
        cameraXRef.current,
        {
          isPooping: selfIsPooping,
          isSelf: true,
          isSelected: selectedId === 'self'
        }
      );

      frameRef.current = window.requestAnimationFrame(animate);
    };

    resize();
    handleScroll();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClick);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [supabase, user?.id, user?.name]);

  return (
    <section
      id="home"
      className="relative isolate w-full overflow-hidden"
      style={{ minHeight: `${WORLD_HEIGHT}px` }}
    >
      <style>{`
        @keyframes village-float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }

        @keyframes village-glint {
          0% { transform: translateX(-125%) rotate(8deg); opacity: 0; }
          18% { opacity: 0.92; }
          100% { transform: translateX(138%) rotate(8deg); opacity: 0; }
        }

        @keyframes village-glitch-1 {
          0% { clip-path: polygon(0 18%, 100% 18%, 100% 19%, 0 19%); }
          100% { clip-path: polygon(0 62%, 100% 62%, 100% 63%, 0 63%); }
        }

        @keyframes village-glitch-2 {
          0% { clip-path: polygon(0 82%, 100% 82%, 100% 83%, 0 83%); }
          100% { clip-path: polygon(0 8%, 100% 8%, 100% 9%, 0 9%); }
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
          background: transparent;
          pointer-events: none;
        }

        .village-glitch::before {
          left: 2px;
          text-shadow: -1px 0 rgba(0,255,0,0.35);
          animation: village-glitch-1 2s infinite linear alternate-reverse;
        }

        .village-glitch::after {
          left: -2px;
          text-shadow: -1px 0 rgba(0,0,255,0.35);
          animation: village-glitch-2 3s infinite linear alternate-reverse;
        }

        .village-facility {
          position: absolute;
          z-index: 15;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(180, 48, 48, 0.24);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,241,241,0.72));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.84),
            0 18px 48px rgba(131, 26, 26, 0.08);
          backdrop-filter: blur(8px);
          animation: village-float 7.5s ease-in-out infinite;
        }

        .village-interactive-structure {
          isolation: isolate;
          cursor: pointer;
          touch-action: manipulation;
        }

        .village-interactive-structure::after {
          content: '';
          position: absolute;
          inset: -18%;
          z-index: 4;
          background: linear-gradient(
            110deg,
            transparent 34%,
            rgba(255,255,255,0.76) 48%,
            transparent 62%
          );
          mix-blend-mode: screen;
          opacity: 0;
          pointer-events: none;
          transform: translateX(-125%) rotate(8deg);
        }

        .village-interactive-structure:hover::after {
          animation: village-glint 1.05s ease;
        }

        .village-facility:hover {
          transform: translate(-50%, calc(-50% - 4px));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.92),
            0 24px 56px rgba(131, 26, 26, 0.14),
            0 0 0 10px rgba(255, 160, 160, 0.1);
          border-color: rgba(180, 48, 48, 0.34);
        }

        .village-node-card {
          min-height: 180px;
          padding: 1.35rem 1.3rem;
          border-radius: 26px 38px 24px 42px / 32px 28px 36px 30px;
        }

        .village-atrium-card {
          min-height: 210px;
          padding: 1.5rem 1.4rem;
          border-radius: 40px 52px 42px 58px / 34px 46px 40px 52px;
          background:
            radial-gradient(circle at top, rgba(255,255,255,0.98), rgba(255,226,226,0.82));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.92),
            0 26px 64px rgba(153, 36, 36, 0.12);
        }

        .village-core-card {
          min-height: 240px;
          padding: 1.7rem 1.5rem;
          border-radius: 38px 56px 42px 62px / 44px 38px 52px 40px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,232,232,0.78));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.94),
            0 26px 72px rgba(155, 26, 26, 0.12);
        }

        .village-lab-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border-radius: 999px;
          border: 1px solid rgba(180, 52, 52, 0.18);
          background: rgba(255, 255, 255, 0.62);
          padding: 0.45rem 0.75rem;
          font-size: 0.65rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(130, 34, 34, 0.78);
        }

        .village-avatar-button {
          border-radius: 999px;
          border: 1px solid rgba(176, 44, 44, 0.2);
          background: rgba(255,255,255,0.72);
          padding: 0.55rem 0.9rem;
          font-size: 0.72rem;
          color: rgba(87, 17, 17, 0.88);
          transition: all 180ms ease;
        }

        .village-avatar-button:hover {
          border-color: rgba(176, 44, 44, 0.34);
          background: rgba(255,255,255,0.88);
        }

        .village-avatar-button[data-active='true'] {
          border-color: rgba(176, 44, 44, 0.42);
          background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,232,232,0.94));
          box-shadow: 0 12px 24px rgba(176, 44, 44, 0.14);
          color: rgba(110, 20, 20, 0.96);
        }

        .village-shop-card {
          position: absolute;
          z-index: 18;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(164, 43, 43, 0.2);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,238,238,0.84));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.92),
            0 16px 34px rgba(130, 24, 24, 0.12);
          border-radius: 1.4rem 1.15rem 1.6rem 1.2rem;
          padding: 1rem 1rem 0.95rem;
          cursor: pointer;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease;
          touch-action: manipulation;
        }

        .village-castle-shop {
          border: none;
          background: transparent;
          box-shadow: none;
          padding: 0;
          overflow: visible;
          filter: saturate(0.94) contrast(1.02);
        }

        .village-castle-shop::before {
          display: none;
        }

        .village-castle-shop:hover {
          transform: translate(-50%, calc(-50% - 4px)) scale(1.02);
          border-color: transparent;
          box-shadow: none;
        }

        .village-castle-shell {
          position: relative;
          width: 100%;
          padding-top: 0.15rem;
        }

        .village-castle-shell::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: 0.45rem;
          z-index: 0;
          width: 74%;
          height: 1.3rem;
          transform: translateX(-50%);
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(61, 22, 22, 0.34) 0%,
            rgba(61, 22, 22, 0.18) 46%,
            rgba(61, 22, 22, 0) 100%
          );
          filter: blur(9px);
        }

        .village-castle-image {
          position: relative;
          z-index: 1;
          width: 100%;
          height: auto;
          display: block;
          image-rendering: pixelated;
          filter:
            drop-shadow(0 20px 20px rgba(76, 24, 24, 0.1))
            drop-shadow(0 5px 8px rgba(34, 8, 8, 0.12));
          user-select: none;
          -webkit-user-drag: none;
          mix-blend-mode: multiply;
        }

        .village-castle-sign {
          position: absolute;
          left: 58%;
          top: 0.8rem;
          z-index: 3;
          transform: translate(-50%, -88%) rotate(3deg);
          border: 1px solid rgba(120, 44, 44, 0.32);
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,232,232,0.92));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.92),
            0 12px 24px rgba(107, 21, 21, 0.12);
          padding: 0.42rem 0.95rem;
          font-family: var(--font-display-kr);
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: rgba(99, 22, 22, 0.92);
          white-space: nowrap;
        }

        .village-shop-card::before {
          content: '';
          position: absolute;
          inset: 0.6rem 0.7rem auto;
          height: 0.38rem;
          border-radius: 999px;
          background:
            repeating-linear-gradient(
              90deg,
              rgba(255,255,255,0.94),
              rgba(255,255,255,0.94) 14px,
              rgba(255,214,214,0.9) 14px,
              rgba(255,214,214,0.9) 28px
            );
          opacity: 0.82;
        }

        .village-shop-card:hover {
          transform: translate(-50%, calc(-50% - 2px));
          border-color: rgba(164, 43, 43, 0.34);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.96),
            0 20px 42px rgba(130, 24, 24, 0.18);
        }

        .workflow-tissue-map {
          position: absolute;
          z-index: 16;
          width: min(820px, calc(100vw - 2.8rem));
          transform: translate(-50%, -50%);
          border: 1px solid rgba(178, 54, 54, 0.18);
          border-radius: 44px 60px 42px 64px / 38px 54px 36px 58px;
          background:
            radial-gradient(circle at top, rgba(255,255,255,0.94), rgba(255,240,240,0.78)),
            linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,246,246,0.64));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.88),
            0 24px 70px rgba(121, 29, 29, 0.1),
            0 0 0 14px rgba(255, 176, 176, 0.06);
          backdrop-filter: blur(10px);
          overflow: hidden;
          pointer-events: none;
        }

        .workflow-tissue-map::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 22%, rgba(191, 89, 89, 0.08), transparent 18%),
            radial-gradient(circle at 82% 34%, rgba(220, 132, 79, 0.08), transparent 16%),
            radial-gradient(circle at 28% 82%, rgba(154, 92, 51, 0.07), transparent 18%),
            repeating-linear-gradient(
              0deg,
              rgba(125, 46, 46, 0.012) 0px,
              rgba(125, 46, 46, 0.012) 1px,
              transparent 1px,
              transparent 6px
            );
          mix-blend-mode: multiply;
          opacity: 0.82;
          pointer-events: none;
        }

        .workflow-tissue-inner {
          position: relative;
          z-index: 1;
          padding: 1.4rem 1.2rem 1.8rem;
        }

        .workflow-tissue-stage {
          position: relative;
          min-height: 760px;
          margin-top: 1rem;
          border-radius: 30px 38px 28px 40px / 32px 28px 34px 30px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.52), rgba(253,244,244,0.34));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.78);
          overflow: hidden;
        }

        .workflow-tissue-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .workflow-node {
          position: absolute;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 0.58rem;
          align-items: center;
          width: 11rem;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .workflow-node[data-align='left'] {
          align-items: flex-end;
          text-align: right;
        }

        .workflow-node[data-align='right'] {
          align-items: flex-start;
          text-align: left;
        }

        .workflow-node-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          border-radius: 999px;
          border: 1px solid rgba(186, 69, 69, 0.18);
          background: rgba(255,255,255,0.7);
          padding: 0.4rem 0.75rem;
          font-size: 0.58rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(124, 46, 46, 0.72);
        }

        .workflow-node-label {
          font-family: var(--font-display-kr);
          font-size: 1rem;
          font-weight: 700;
          color: rgba(74, 14, 14, 0.94);
          text-shadow: 0 1px 0 rgba(255,255,255,0.72);
        }

        .workflow-node-core {
          position: relative;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 2px solid currentColor;
          background: rgba(255,255,255,0.74);
          box-shadow:
            0 0 0 8px rgba(255,255,255,0.16),
            0 0 24px currentColor;
          color: inherit;
        }

        .workflow-node-core::before,
        .workflow-node-core::after {
          content: '';
          position: absolute;
          inset: 7px;
          border-radius: 999px;
          border: 1px solid currentColor;
          opacity: 0.6;
        }

        .workflow-node-core::after {
          inset: 13px;
          background: currentColor;
          border: none;
          opacity: 0.84;
        }

        @media (max-width: 767px) {
          .village-node-card {
            min-height: 140px;
            padding: 1rem 0.9rem;
          }

          .village-atrium-card {
            min-height: 168px;
            padding: 1.15rem 1rem;
          }

          .village-core-card {
            min-height: 200px;
            padding: 1.3rem 1.1rem;
          }

          .village-shop-card {
            border-radius: 1rem;
            padding: 0.82rem 0.85rem;
          }

          .workflow-tissue-map {
            width: min(720px, calc(100vw - 1.35rem));
            border-radius: 30px 38px 28px 40px / 34px 30px 36px 28px;
          }

          .workflow-tissue-inner {
            padding: 1rem 0.95rem 1.15rem;
          }

          .workflow-tissue-stage {
            min-height: 640px;
          }

          .workflow-node {
            width: 8.1rem;
          }

          .workflow-node-label {
            font-size: 0.81rem;
          }

          .workflow-node-chip {
            padding: 0.32rem 0.55rem;
            font-size: 0.5rem;
            letter-spacing: 0.16em;
          }

          .village-castle-sign {
            font-size: 0.78rem;
            padding: 0.34rem 0.8rem;
          }

        }
      `}</style>

      <canvas
        ref={backgroundCanvasRef}
        className="pointer-events-none fixed inset-0 z-[8] h-full w-full"
        style={{
          filter: 'contrast(1.08) saturate(1.18)',
          opacity: worldActive ? 1 : 0,
          transition: 'opacity 180ms ease'
        }}
      />

      <div
        className="pointer-events-none fixed inset-0 z-[11]"
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0) 50%, rgba(0,0,0,0.03) 50%), linear-gradient(90deg, rgba(255,0,0,0.03), rgba(0,255,0,0.01), rgba(0,0,255,0.03))',
          backgroundSize: '100% 4px, 3px 100%',
          opacity: worldActive ? 0.72 : 0,
          transition: 'opacity 180ms ease'
        }}
      />

      <canvas
        ref={avatarCanvasRef}
        className="pointer-events-none fixed inset-0 z-[18] h-full w-full"
        style={{
          opacity: worldActive ? 1 : 0,
          transition: 'opacity 180ms ease'
        }}
      />

      <div
        className="pointer-events-none fixed right-6 top-24 z-40 hidden lg:block"
        style={{
          opacity: worldActive ? 1 : 0,
          transition: 'opacity 180ms ease'
        }}
      >
        <p className="font-[var(--font-display-kr)] text-lg font-semibold tracking-[0.04em] text-[rgba(69,14,14,0.92)]">
          실시간 접속 {onlineVisitors.length + 1}명
        </p>
      </div>

      <div
        className="relative w-full overflow-hidden"
        style={{ height: `${WORLD_HEIGHT}px` }}
      >
        <div
          ref={worldBackdropRef}
          className="pointer-events-none absolute left-0 top-0 z-[6] h-full will-change-transform"
          style={{
            width: `${worldWidth}px`,
            backgroundColor: '#f8f9fa',
            backgroundImage:
              'linear-gradient(rgba(200, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(200, 0, 0, 0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        >
          <div className="absolute inset-x-0 top-[820px] h-5 bg-[repeating-linear-gradient(45deg,#cc0000,#cc0000_20px,#ffffff_20px,#ffffff_40px)] opacity-15" />
          <div className="absolute inset-x-0 top-[1670px] h-5 bg-[repeating-linear-gradient(45deg,#cc0000,#cc0000_20px,#ffffff_20px,#ffffff_40px)] opacity-10" />
          <div className="absolute inset-x-0 top-[3280px] h-5 bg-[repeating-linear-gradient(45deg,#cc0000,#cc0000_20px,#ffffff_20px,#ffffff_40px)] opacity-[0.08]" />
          <div className="pointer-events-none absolute left-0 top-[870px] w-full px-4 text-center font-[var(--font-display-kr)] text-[1.4rem] font-black tracking-[0.12em] text-red-100 opacity-30 sm:text-5xl sm:tracking-[0.2em]">
            PROFILE FIELD / SIGNAL WARD / MEMORY DATING CORE
          </div>
          <div className="pointer-events-none absolute left-0 top-[3345px] w-full px-4 text-center font-[var(--font-display-kr)] text-[1.15rem] font-black tracking-[0.18em] text-[rgba(181,101,101,0.24)] sm:text-[2.7rem]">
            APPAREL TISSUE VAULT
          </div>
        </div>

        <div
          ref={worldObjectsRef}
          className="relative z-[15] h-full will-change-transform"
          style={{
            width: `${worldWidth}px`
          }}
        >
          {facilityNodes.map((node) => (
            <article
              key={node.id}
              id={node.id}
              data-avatar-ui="true"
              role="button"
              tabIndex={0}
              className={`village-facility village-interactive-structure ${node.bodyClassName}`}
              style={{
                left: node.left,
                top: `${node.top}px`,
                width: node.width ? `${node.width}px` : undefined
              }}
              onDoubleClick={() => openVillageShop(node.tab)}
              onTouchEnd={(event) =>
                handleStructureTouchEnd(event, node.id, node.tab)
              }
            >
              <p className="text-[10px] uppercase tracking-[0.28em] text-[rgba(154,52,52,0.56)]">
                {node.caption}
              </p>
              <h3 className="mt-3 font-[var(--font-display-kr)] text-[1.08rem] font-semibold text-[rgba(77,14,14,0.94)] sm:text-[1.45rem]">
                {node.title}
              </h3>
              <p className="mt-3 text-[12px] leading-relaxed text-[rgba(92,24,24,0.68)] sm:text-sm">
                {node.subtitle}
              </p>
            </article>
          ))}

          {renderedVillageShopNodes.map((shop) => {
            const visual = villageShopVisualMeta[shop.tab];
            const isGoodsCastle = shop.tab === 'goods';

            return (
              <article
                key={shop.id}
                id={shop.id}
                data-avatar-ui="true"
                role="button"
                tabIndex={0}
                className={
                  isGoodsCastle
                    ? 'village-shop-card village-castle-shop village-interactive-structure'
                    : 'village-shop-card village-interactive-structure'
                }
                style={{
                  boxShadow: isGoodsCastle
                    ? undefined
                    : `inset 0 1px 0 rgba(255,255,255,0.92), 0 16px 34px rgba(130, 24, 24, 0.12), 0 0 0 10px ${visual.glow}`,
                  left: shop.left,
                  top: `${shop.top}px`,
                  width: `${shop.width}px`
                }}
                onDoubleClick={() => openVillageShop(shop.tab)}
                onTouchEnd={(event) =>
                  handleStructureTouchEnd(event, shop.id, shop.tab)
                }
              >
                {isGoodsCastle ? (
                  <div className="village-castle-shell">
                    <div className="village-castle-sign">굿즈샵</div>
                    <img
                      src="/images/bio-village/goods-castle-shop-cutout.png"
                      alt="굿즈샵 성"
                      className="village-castle-image"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <>
                    <p
                      className="relative z-[1] text-[9px] uppercase tracking-[0.26em]"
                      style={{ color: visual.tone }}
                    >
                      {visual.chip}
                    </p>
                    <h3 className="relative z-[1] mt-3 font-[var(--font-display-kr)] text-[0.98rem] font-semibold text-[rgba(77,14,14,0.94)]">
                      {shop.title}
                    </h3>
                    <p className="relative z-[1] mt-2 text-[11px] leading-relaxed text-[rgba(98,26,26,0.68)]">
                      {shop.hint}
                    </p>
                    <p className="relative z-[1] mt-3 text-[9px] uppercase tracking-[0.22em] text-[rgba(150,50,50,0.54)]">
                      dbl click / dbl tap
                    </p>
                  </>
                )}
              </article>
            );
          })}

          <section
            id="apparel-tissue-map"
            data-avatar-ui="true"
            className="workflow-tissue-map"
            style={{
              left: '50%',
              top: '3735px'
            }}
          >
            <div className="workflow-tissue-inner">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[rgba(154,52,52,0.56)]">
                WORKFLOW TISSUE MAP
              </p>
              <h3 className="mt-3 font-[var(--font-display-kr)] text-[1.1rem] font-semibold text-[rgba(77,14,14,0.94)] sm:text-[1.5rem]">
                의류 제작 다이어그램
              </h3>
              <p className="mt-3 max-w-[32rem] text-[12px] leading-relaxed text-[rgba(92,24,24,0.68)] sm:text-sm">
                원부자재 발주부터 CLO 3D 설계, 데이터 저장, 실물 제작까지 하나의
                줄기에서 뻗는 제작 조직도를 맵 깊숙한 구역에 이식했다.
              </p>

              <div className="workflow-tissue-stage">
                <svg
                  viewBox="0 0 720 760"
                  className="workflow-tissue-svg"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id="apparelTissueCore"
                      x1="360"
                      y1="86"
                      x2="360"
                      y2="660"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="rgba(241,205,132,0.82)" />
                      <stop offset="52%" stopColor="rgba(241,146,96,0.88)" />
                      <stop offset="100%" stopColor="rgba(219,81,81,0.92)" />
                    </linearGradient>
                    <filter
                      id="apparelTissueGlow"
                      x="-50%"
                      y="-50%"
                      width="200%"
                      height="200%"
                    >
                      <feGaussianBlur stdDeviation="9" />
                    </filter>
                  </defs>

                  <path
                    d="M360 92 L360 660"
                    stroke="rgba(235,98,98,0.16)"
                    strokeWidth="36"
                    strokeLinecap="round"
                    filter="url(#apparelTissueGlow)"
                    fill="none"
                  />
                  <path
                    d="M360 92 L360 660"
                    stroke="url(#apparelTissueCore)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M360 158 C320 184 255 214 176 232"
                    stroke="rgba(232,176,102,0.82)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M360 272 C405 290 480 318 546 344"
                    stroke="rgba(217,164,89,0.8)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M360 404 C306 426 232 454 178 482"
                    stroke="rgba(196,140,85,0.82)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M360 532 C420 556 495 592 552 622"
                    stroke="rgba(186,102,75,0.86)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>

                {apparelWorkflowNodes.map((node) => (
                  <div
                    key={node.id}
                    className="workflow-node"
                    data-align={node.align}
                    style={{
                      color: node.color,
                      left: `${node.x}%`,
                      top: `${node.y}%`
                    }}
                  >
                    <span className="workflow-node-chip">{node.chip}</span>
                    <span className="workflow-node-core" />
                    <p className="workflow-node-label">{node.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {poopDrops.map((drop) => (
            <div
              key={drop.id}
              className="pointer-events-none absolute z-[12] h-[28px] w-[30px]"
              style={{
                left: `${drop.x}px`,
                top: `${drop.y}px`,
                transform: 'translate(-50%, -35%)'
              }}
            >
              <div className="absolute bottom-[-3px] left-1/2 h-[8px] w-[22px] -translate-x-1/2 rounded-full bg-[rgba(45,20,8,0.16)] blur-[3px]" />
              {poopPixelPattern.map((pixel, index) => (
                <span
                  key={`${drop.id}-${index}`}
                  className="absolute block h-[5px] w-[5px]"
                  style={{
                    backgroundColor: pixel.color,
                    boxShadow:
                      pixel.color === '#8a571f'
                        ? 'inset 0 1px 0 rgba(255,222,182,0.28)'
                        : undefined,
                    left: `${pixel.x}px`,
                    top: `${pixel.y}px`
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {selectedActor && worldActive ? (
        <div
          data-avatar-ui="true"
          className={`fixed z-[70] overflow-hidden border border-[rgba(190,44,44,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,244,255,0.76))] shadow-[0_36px_120px_rgba(107,21,21,0.16)] backdrop-blur-2xl ${
            isSelfProfileTab
              ? 'inset-x-3 bottom-3 top-auto w-auto rounded-[1.6rem] md:inset-x-auto md:bottom-auto md:right-6 md:top-[6.2rem] md:w-[min(30rem,calc(100vw-1.5rem))] md:rounded-[2rem]'
              : 'bottom-3 right-3 w-[min(15.75rem,calc(100vw-1.5rem))] rounded-[1.3rem] md:bottom-auto md:right-6 md:top-[6.4rem] md:w-[17.5rem] md:rounded-[1.5rem]'
          }`}
        >
          <div
            className={`border-b border-[rgba(190,44,44,0.12)] ${
              isSelfProfileTab
                ? 'px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5'
                : 'px-3.5 pb-3 pt-3.5'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="village-lab-chip">
                    {isSelfProfileTab ? 'MY PROFILE' : 'PROFILE TAB'}
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]"
                    style={{
                      background: `${selectedPaletteMeta?.body ?? '#ddd'}22`,
                      border: `1px solid ${selectedPaletteMeta?.body ?? '#ddd'}66`,
                      color: selectedPaletteMeta?.outline ?? '#333'
                    }}
                  >
                    {selectedPaletteMeta?.name ?? 'Palette'}
                  </span>
                </div>
                <h2
                  className={`mt-3 font-[var(--font-display-kr)] font-semibold text-[rgba(69,14,14,0.95)] ${
                    isSelfProfileTab
                      ? 'text-[1.28rem] sm:mt-4 sm:text-[1.7rem]'
                      : 'text-[1rem] md:text-[1.08rem]'
                  }`}
                >
                  {isSelfProfileTab
                    ? selfProfile.name || 'YOU'
                    : selectedActor.label}
                </h2>
                <p
                  className={`mt-1.5 text-[rgba(100,31,31,0.66)] ${
                    isSelfProfileTab ? 'text-sm sm:mt-2' : 'text-[0.74rem]'
                  }`}
                >
                  {isSelfProfileTab
                    ? selfProfile.tagline
                    : selectedActor.profile.tagline}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTarget(null)}
                className={`rounded-full border border-[rgba(188,51,51,0.16)] bg-white/82 text-[rgba(91,17,17,0.88)] transition-colors hover:bg-white ${
                  isSelfProfileTab
                    ? 'px-3 py-2 text-sm'
                    : 'px-2.5 py-1.5 text-[0.72rem]'
                }`}
              >
                닫기
              </button>
            </div>
          </div>

          <div
            className={`overflow-y-auto ${
              isSelfProfileTab
                ? 'max-h-[calc(68dvh-1rem)] px-4 pb-4 pt-4 sm:max-h-[calc(100dvh-10rem)] sm:px-6 sm:pb-5 sm:pt-5'
                : 'max-h-[52dvh] px-3.5 pb-3.5 pt-3 md:max-h-[60dvh]'
            }`}
          >
            {isSelfProfileTab ? (
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-[rgba(123,42,42,0.48)]">
                    avatar booth
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.keys(spriteSets) as SpritePreset[]).map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          data-active={appearance.preset === preset}
                          className="village-avatar-button"
                          onClick={() =>
                            setAppearance((previous) => ({
                              ...previous,
                              preset
                            }))
                          }
                        >
                          {preset}
                        </button>
                      )
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.keys(paletteMap) as PaletteKey[]).map(
                      (palette) => (
                        <button
                          key={palette}
                          type="button"
                          data-active={appearance.palette === palette}
                          className="village-avatar-button"
                          onClick={() =>
                            setAppearance((previous) => ({
                              ...previous,
                              palette
                            }))
                          }
                          style={{
                            borderColor:
                              appearance.palette === palette
                                ? `${paletteMap[palette].body}88`
                                : undefined
                          }}
                        >
                          <span
                            className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: paletteMap[palette].body }}
                          />
                          {paletteMap[palette].name}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-[rgba(120,38,38,0.5)]">
                      Nickname
                    </span>
                    <input
                      value={selfProfile.name}
                      onChange={(event) =>
                        setSelfProfile((previous) => ({
                          ...previous,
                          name: event.target.value
                        }))
                      }
                      className="rounded-[1.2rem] border border-[rgba(189,52,52,0.16)] bg-white/84 px-4 py-3 text-[rgba(70,16,16,0.92)] outline-none transition focus:border-[rgba(189,52,52,0.32)]"
                      maxLength={20}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-[rgba(120,38,38,0.5)]">
                      Tagline
                    </span>
                    <input
                      value={selfProfile.tagline}
                      onChange={(event) =>
                        setSelfProfile((previous) => ({
                          ...previous,
                          tagline: event.target.value
                        }))
                      }
                      className="rounded-[1.2rem] border border-[rgba(189,52,52,0.16)] bg-white/84 px-4 py-3 text-[rgba(70,16,16,0.92)] outline-none transition focus:border-[rgba(189,52,52,0.32)]"
                      maxLength={40}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-[rgba(120,38,38,0.5)]">
                      Memo / Bio
                    </span>
                    <textarea
                      value={selfProfile.bio}
                      onChange={(event) =>
                        setSelfProfile((previous) => ({
                          ...previous,
                          bio: event.target.value
                        }))
                      }
                      rows={4}
                      className="min-h-[112px] rounded-[1.2rem] border border-[rgba(189,52,52,0.16)] bg-white/84 px-4 py-3 text-[rgba(70,16,16,0.92)] outline-none transition focus:border-[rgba(189,52,52,0.32)]"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-[11px] uppercase tracking-[0.24em] text-[rgba(120,38,38,0.5)]">
                        Interests
                      </span>
                      <input
                        value={selfProfile.interests}
                        onChange={(event) =>
                          setSelfProfile((previous) => ({
                            ...previous,
                            interests: event.target.value
                          }))
                        }
                        className="rounded-[1.2rem] border border-[rgba(189,52,52,0.16)] bg-white/84 px-4 py-3 text-[rgba(70,16,16,0.92)] outline-none transition focus:border-[rgba(189,52,52,0.32)]"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-[11px] uppercase tracking-[0.24em] text-[rgba(120,38,38,0.5)]">
                        MBTI
                      </span>
                      <input
                        value={selfProfile.mbti}
                        onChange={(event) =>
                          setSelfProfile((previous) => ({
                            ...previous,
                            mbti: event.target.value.toUpperCase()
                          }))
                        }
                        className="rounded-[1.2rem] border border-[rgba(189,52,52,0.16)] bg-white/84 px-4 py-3 text-[rgba(70,16,16,0.92)] outline-none transition focus:border-[rgba(189,52,52,0.32)]"
                        maxLength={4}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-[rgba(108,36,36,0.56)]">
                      저장하면 로그인한 회원 아바타가 이 닉네임/외형 그대로
                      필드에 뜬다.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!user) {
                          window.dispatchEvent(
                            new CustomEvent('auth:open-modal', {
                              detail: { mode: 'login' }
                            })
                          );
                          return;
                        }

                        setProfileSaving(true);
                        setProfileError(null);

                        try {
                          const response = await fetch(
                            '/api/account/village-profile',
                            {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify(
                                profileToPayload(selfProfile, appearance)
                              )
                            }
                          );
                          const payload = (await response
                            .json()
                            .catch(() => ({}))) as {
                            data?: Partial<VillageProfilePayload>;
                            message?: string;
                          };

                          if (!response.ok) {
                            throw new Error(
                              payload.message ||
                                '회원 아바타 저장에 실패했습니다.'
                            );
                          }

                          setSelfProfile(
                            payloadToProfile(
                              payload.data ?? {},
                              user.name?.trim() ||
                                user.email?.split('@')[0] ||
                                'MEMBER'
                            )
                          );
                          setAppearance({
                            palette: isPaletteKey(payload.data?.palette)
                              ? payload.data.palette
                              : appearance.palette,
                            preset: isSpritePreset(payload.data?.preset)
                              ? payload.data.preset
                              : appearance.preset
                          });
                          setSaveState('saved');
                        } catch (error) {
                          setProfileError(
                            error instanceof Error
                              ? error.message
                              : '회원 아바타 저장에 실패했습니다.'
                          );
                        } finally {
                          setProfileSaving(false);
                        }
                      }}
                      disabled={profileSaving || profileLoading || authLoading}
                      className="rounded-full border border-[rgba(177,43,43,0.2)] bg-[linear-gradient(180deg,rgba(160,33,33,0.9),rgba(123,18,18,0.95))] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(145,28,28,0.2)] transition hover:translate-y-[-1px]"
                    >
                      {profileSaving
                        ? '저장 중...'
                        : saveState === 'saved'
                          ? '저장됨'
                          : '저장'}
                    </button>
                  </div>

                  {profileLoading ? (
                    <div className="rounded-[1.2rem] border border-[rgba(188,51,51,0.12)] bg-white/72 px-4 py-3 text-sm text-[rgba(101,32,32,0.62)]">
                      회원 아바타 설정 불러오는 중...
                    </div>
                  ) : null}

                  {profileError ? (
                    <div className="rounded-[1.2rem] border border-[rgba(188,51,51,0.18)] bg-[rgba(255,241,241,0.88)] px-4 py-3 text-sm text-[rgba(134,24,24,0.86)]">
                      {profileError}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-[1.1rem] border border-[rgba(188,51,51,0.14)] bg-white/74 p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(120,38,38,0.5)]">
                    note
                  </p>
                  <p className="mt-2 text-[0.78rem] leading-relaxed text-[rgba(70,16,16,0.92)]">
                    {selectedActor.profile.bio}
                  </p>
                </div>

                <div className="grid gap-2">
                  <div className="rounded-[1rem] border border-[rgba(188,51,51,0.14)] bg-white/74 p-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(120,38,38,0.5)]">
                      interests
                    </p>
                    <p className="mt-2 text-[0.76rem] text-[rgba(70,16,16,0.92)]">
                      {selectedActor.profile.interests}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-[rgba(188,51,51,0.14)] bg-white/74 p-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(120,38,38,0.5)]">
                      mbti
                    </p>
                    <p className="mt-2 text-[0.76rem] text-[rgba(70,16,16,0.92)]">
                      {selectedActor.profile.mbti}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1rem] border border-[rgba(188,51,51,0.14)] bg-white/72 p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(120,38,38,0.5)]">
                    profile signal
                  </p>
                  <p className="mt-2 text-[0.74rem] leading-relaxed text-[rgba(86,22,22,0.74)]">
                    실시간 접속 중인 상대 기록이다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('dating:open-modal', {
                        detail: {
                          id: selectedActor.id,
                          label: selectedActor.label
                        }
                      })
                    );
                  }}
                  className="w-full rounded-[1.1rem] border border-[rgba(188,51,51,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,236,242,0.92))] px-3.5 py-3 text-left shadow-[0_16px_40px_rgba(125,25,25,0.12)] transition hover:translate-y-[-1px]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.82rem] font-semibold text-[rgba(79,14,14,0.94)]">
                        채팅 걸기 💬
                      </p>
                      <p className="mt-1 text-[0.66rem] text-[rgba(101,32,32,0.62)]">
                        {selectedActor.label} 채팅 탭 열기
                      </p>
                    </div>
                    <div className="rounded-full border border-[rgba(188,51,51,0.16)] bg-[rgba(255,255,255,0.74)] px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[rgba(120,24,24,0.72)]">
                      hook
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeVillageShop && worldActive ? (
        <div
          data-avatar-ui="true"
          className="fixed inset-x-3 bottom-3 z-[72] overflow-hidden rounded-[1.35rem] border border-[rgba(190,44,44,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,244,255,0.8))] shadow-[0_28px_90px_rgba(107,21,21,0.16)] backdrop-blur-2xl md:inset-x-auto md:left-1/2 md:top-[6.8rem] md:w-[min(28rem,calc(100vw-2rem))] md:-translate-x-1/2"
        >
          <div className="border-b border-[rgba(190,44,44,0.12)] px-4 pb-3 pt-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="village-lab-chip">
                  {activeVillageShop.badge}
                </span>
                <h2 className="mt-3 font-[var(--font-display-kr)] text-[1.05rem] font-semibold text-[rgba(69,14,14,0.95)] sm:text-[1.24rem]">
                  {activeVillageShop.title}
                </h2>
                <p className="mt-2 text-[0.78rem] leading-relaxed text-[rgba(100,31,31,0.68)]">
                  {activeVillageShop.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveVillageShopTab(null)}
                className="rounded-full border border-[rgba(188,51,51,0.16)] bg-white/82 px-2.5 py-1.5 text-[0.72rem] text-[rgba(91,17,17,0.88)] transition-colors hover:bg-white"
              >
                닫기
              </button>
            </div>
          </div>

          <div className="space-y-3 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(villageShopTabMeta) as VillageShopTab[]).map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveVillageShopTab(tab)}
                    className="rounded-full border px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.14em] transition"
                    style={{
                      borderColor:
                        activeVillageShopTab === tab
                          ? 'rgba(164,43,43,0.36)'
                          : 'rgba(164,43,43,0.14)',
                      background:
                        activeVillageShopTab === tab
                          ? 'rgba(255,241,241,0.92)'
                          : 'rgba(255,255,255,0.68)',
                      color:
                        activeVillageShopTab === tab
                          ? 'rgba(95,18,18,0.92)'
                          : 'rgba(112,34,34,0.7)'
                    }}
                  >
                    {villageShopTabMeta[tab].title}
                  </button>
                )
              )}
            </div>

            <div className="grid gap-2">
              {activeVillageShop.notes.map((note) => (
                <div
                  key={note}
                  className="rounded-[1rem] border border-[rgba(188,51,51,0.12)] bg-white/72 px-3 py-2.5 text-[0.74rem] leading-relaxed text-[rgba(86,22,22,0.78)]"
                >
                  {note}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  jumpToVillageSection(activeVillageShop.sectionId)
                }
                className="rounded-[1rem] border border-[rgba(188,51,51,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,236,242,0.92))] px-3.5 py-2.5 text-[0.74rem] font-semibold text-[rgba(79,14,14,0.94)] shadow-[0_16px_40px_rgba(125,25,25,0.08)] transition hover:translate-y-[-1px]"
              >
                {activeVillageShop.primaryAction}
              </button>

              {activeVillageShopTab === 'goods' ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveVillageShopTab(null);
                    window.dispatchEvent(new CustomEvent('cart:open-modal'));
                  }}
                  className="rounded-[1rem] border border-[rgba(188,51,51,0.14)] bg-white/78 px-3.5 py-2.5 text-[0.72rem] text-[rgba(95,18,18,0.86)] transition hover:bg-white"
                >
                  장바구니 열기
                </button>
              ) : null}

              {activeVillageShopTab === 'diagram' ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveVillageShopTab(null);
                    window.dispatchEvent(
                      new CustomEvent('architecture:open-modal', {
                        detail: { tab: 'system' }
                      })
                    );
                  }}
                  className="rounded-[1rem] border border-[rgba(188,51,51,0.14)] bg-white/78 px-3.5 py-2.5 text-[0.72rem] text-[rgba(95,18,18,0.86)] transition hover:bg-white"
                >
                  시스템 다이어그램 띄우기
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

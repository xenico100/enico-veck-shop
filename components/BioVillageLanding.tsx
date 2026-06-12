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
import {
  BIO_VILLAGE_CHAT_BUBBLE_TTL_MS,
  BIO_VILLAGE_CHAT_EVENT_MESSAGE,
  BIO_VILLAGE_CHAT_EVENT_SEND,
  type BioVillageChatEntry,
  type BioVillageChatSendDetail,
  type BioVillageChatTone,
  normalizeBioVillageChatText
} from '@/utils/bio-village-chat';
import { createClient } from '@/utils/supabase/client';
import PoopWriteModal from '@/components/PoopWriteModal';
import PoopPostModal from '@/components/PoopPostModal';

const WORLD_HEIGHT = 4300;
const MOBILE_WORLD_WIDTH = 1480;
const DESKTOP_MIN_WORLD_WIDTH = 1280;
const PLAYER_SCALE = 5;
const PLAYER_SPEED = 5.8;
const REMOTE_PLAYER_SPEED = 8.8;
const REMOTE_SYNC_INTERVAL_MS = 850;
const MOVEMENT_BROADCAST_INTERVAL_MS = 120;
const PLAYER_STATE_BROADCAST_INTERVAL_MS = 700;
const REMOTE_ACTOR_TIMEOUT_MS = 15_000;
const REMOTE_SNAP_DISTANCE = 90;
const REMOTE_ROSTER_SYNC_INTERVAL_MS = 850;
const CAMERA_FOLLOW_DEADBAND = 0.35;
const PLAYER_MARGIN = 40;
const PLAYER_SPAWN_Y = 520;
const PRESENCE_CHANNEL = 'bio-village-presence-v1';
const CHAT_HISTORY_ENDPOINT = '/api/bio-village/chat';
const CHAT_SEEN_MESSAGE_LIMIT = 180;
const PLAYER_STATE_FALLBACK_ENDPOINT = '/api/bio-village/players';
const PLAYER_STATE_FALLBACK_SYNC_INTERVAL_MS = 1500;
const POOP_SETTLE_MS = 720;
const POOP_TTL_MS = 1000 * 60 * 60 * 2;
const CLEAN_SWEEP_MS = 860;

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
  lastRemoteUpdateAt: number;
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
  isPost?: boolean;
  postTitle?: string;
  postData?: any;
};

type PoopAnimationState = {
  actorId: string;
  dropX: number;
  dropY: number;
  id: string;
  startedAt: number;
};

type CleanupAnimationState = {
  actorId: string;
  id: string;
  startedAt: number;
  targetDropId: string;
};

type SharedPoopPayload = {
  actorId: string;
  createdAt: number;
  dropX: number;
  dropY: number;
  id: string;
};

type SharedChatPayload = {
  actorId: string;
  id: string;
  label: string;
  sentAt: number;
  text: string;
};

type StoredChatPayload = {
  actorId?: unknown;
  author?: unknown;
  id?: unknown;
  sentAt?: unknown;
  text?: unknown;
};

type StoredPlayerPayload = {
  dir?: unknown;
  key?: unknown;
  label?: unknown;
  latestPoop?: unknown;
  moving?: unknown;
  palette?: unknown;
  preset?: unknown;
  profile?: unknown;
  sentAt?: unknown;
  vx?: unknown;
  vy?: unknown;
  x?: unknown;
  y?: unknown;
};

type ChatBubbleState = {
  expiresAt: number;
  text: string;
  tone: Exclude<BioVillageChatTone, 'system'>;
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

const villageShopNodes: VillageShopNode[] = [
  {
    hint: '더블클릭: 굿즈 판매',
    id: 'goods-access-shop',
    left: '28%',
    tab: 'goods',
    title: 'Goods Counter',
    top: 745,
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getFrameScale = (deltaMs: number) => clamp(deltaMs / 16.7, 0.35, 2.4);

const getSmoothCameraValue = (
  current: number,
  target: number,
  frameScale: number
) => {
  const distance = Math.abs(target - current);
  if (distance <= CAMERA_FOLLOW_DEADBAND) return target;

  const baseEase = distance > 520 ? 0.36 : distance > 220 ? 0.24 : 0.15;
  const easedAmount = 1 - Math.pow(1 - baseEase, frameScale);
  return current + (target - current) * easedAmount;
};

const getWorldWidth = (viewportWidth: number) =>
  viewportWidth < 768
    ? MOBILE_WORLD_WIDTH
    : Math.max(viewportWidth, DESKTOP_MIN_WORLD_WIDTH);

const hashParticipantKey = (value: string) =>
  Array.from(value).reduce(
    (hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0,
    7
  );

const getSpawnPoint = (worldWidth: number, participantKey?: string | null) => {
  const baseX = Math.round(worldWidth * 0.5);
  const baseY = PLAYER_SPAWN_Y;

  if (!participantKey) {
    return {
      x: clamp(
        baseX,
        PLAYER_MARGIN,
        Math.max(PLAYER_MARGIN, worldWidth - PLAYER_MARGIN)
      ),
      y: baseY
    };
  }

  const hash = hashParticipantKey(participantKey);
  const angle = ((hash % 360) * Math.PI) / 180;
  const radius = 44 + ((Math.floor(hash / 360) % 3) + 1) * 16;
  const offsetX = Math.round(Math.cos(angle) * radius);
  const offsetY = Math.round(Math.sin(angle) * Math.min(34, radius * 0.52));

  return {
    x: clamp(
      baseX + offsetX,
      PLAYER_MARGIN,
      Math.max(PLAYER_MARGIN, worldWidth - PLAYER_MARGIN)
    ),
    y: clamp(baseY + offsetY, 120, WORLD_HEIGHT - 100)
  };
};

const getInitialCameraPosition = (
  worldWidth: number,
  viewportWidth: number,
  viewportHeight: number,
  focusPoint?: { x: number; y: number }
) => {
  const spawn = focusPoint ?? getSpawnPoint(worldWidth);

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
  userId: string | null | undefined,
  latestPoop: SharedPoopPayload | null
) => ({
  key: participantKey,
  label: player.label,
  latestPoop,
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

const getActorScreenPosition = (
  actor: ActorState,
  scrollY: number,
  cameraX: number
) => ({
  x: actor.x - cameraX,
  y: actor.y - scrollY
});

const pruneExpiredPoops = (drops: PoopDrop[], now = Date.now()) =>
  drops.filter((drop) => drop.isPost || now - drop.createdAt < POOP_TTL_MS);

const wrapSpeechBubbleLines = (
  text: string,
  maxCharsPerLine = 14,
  maxLines = 2
) => {
  const normalized = normalizeBioVillageChatText(text);
  if (!normalized) return [];

  const characters = Array.from(normalized);
  const lines: string[] = [];

  while (characters.length > 0 && lines.length < maxLines) {
    lines.push(characters.splice(0, maxCharsPerLine).join('').trim());
  }

  if (characters.length > 0 && lines.length > 0) {
    const truncated = Array.from(lines[lines.length - 1]);
    truncated.pop();
    lines[lines.length - 1] = `${truncated.join('').trimEnd()}…`;
  }

  return lines.filter(Boolean);
};

const drawSpeechBubbleShape = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  tailCenterX: number,
  tailHeight: number,
  radius: number
) => {
  const right = x + width;
  const bottom = y + height;
  const tailHalfWidth = 11;

  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(right - radius, y);
  context.quadraticCurveTo(right, y, right, y + radius);
  context.lineTo(right, bottom - radius);
  context.quadraticCurveTo(right, bottom, right - radius, bottom);
  context.lineTo(tailCenterX + tailHalfWidth, bottom);
  context.lineTo(tailCenterX, bottom + tailHeight);
  context.lineTo(tailCenterX - tailHalfWidth, bottom);
  context.lineTo(x + radius, bottom);
  context.quadraticCurveTo(x, bottom, x, bottom - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
};

function drawActor(
  context: CanvasRenderingContext2D,
  actor: ActorState,
  scrollY: number,
  cameraX: number,
  options?: {
    isCleaning?: boolean;
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
  const cleaningJitter = options?.isCleaning
    ? Math.sin(performance.now() / 64) * 1.6
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
    screenX - width / 2 + strainJitter + cleaningJitter,
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

  if (options?.isCleaning) {
    const sweepWave = Math.sin(performance.now() / 74) * 0.22;
    const dustWave = Math.sin(performance.now() / 48) * 1.2;

    context.save();
    context.translate(screenX + width * 0.32, screenY + height * 0.1);
    context.rotate(-0.7 + sweepWave);
    context.fillStyle = '#8a5b33';
    context.fillRect(-1, -18, 3, 24);
    context.fillStyle = '#d8ba7c';
    context.fillRect(-6, 3, 12, 6);
    context.fillStyle = 'rgba(118,72,28,0.84)';
    context.fillRect(-5, 4, 2, 4);
    context.fillRect(-1, 4, 2, 4);
    context.fillRect(3, 4, 2, 4);
    context.restore();

    context.save();
    context.strokeStyle = 'rgba(138, 92, 41, 0.48)';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(screenX + 4, screenY + height * 0.42);
    context.quadraticCurveTo(
      screenX + 18,
      screenY + height * 0.32 + dustWave,
      screenX + 28,
      screenY + height * 0.45
    );
    context.stroke();
    context.beginPath();
    context.moveTo(screenX - 2, screenY + height * 0.48);
    context.quadraticCurveTo(
      screenX + 10,
      screenY + height * 0.4 - dustWave,
      screenX + 20,
      screenY + height * 0.5
    );
    context.stroke();
    context.restore();
  }

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

function drawActorSpeechBubble(
  context: CanvasRenderingContext2D,
  actor: ActorState,
  scrollY: number,
  cameraX: number,
  text: string,
  tone: Exclude<BioVillageChatTone, 'system'>
) {
  const { height, width } = getSpriteSize(actor.preset);
  const screenX = actor.x - cameraX;
  const screenY = actor.y - scrollY;

  if (
    screenX < -width - 48 ||
    screenX > window.innerWidth + width + 48 ||
    screenY < -height - 48 ||
    screenY > window.innerHeight + height + 48
  ) {
    return;
  }

  const lines = wrapSpeechBubbleLines(text);
  if (lines.length === 0) return;

  context.save();
  context.font = '700 12px "IBM Plex Sans KR", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const measuredWidth = Math.max(
    ...lines.map((line) => context.measureText(line).width)
  );
  const boxWidth = Math.min(196, Math.max(86, measuredWidth + 30));
  const lineHeight = 16;
  const boxHeight = lines.length * lineHeight + 20;
  const bubbleX = Math.min(
    Math.max(10, screenX - boxWidth / 2),
    Math.max(10, window.innerWidth - boxWidth - 10)
  );
  const bubbleY = Math.max(8, screenY - height / 2 - boxHeight - 36);
  const tailHeight = 10;
  const tailCenterX = Math.min(
    Math.max(screenX, bubbleX + 18),
    bubbleX + boxWidth - 18
  );

  context.shadowBlur = 16;
  context.shadowOffsetY = 5;
  context.shadowColor =
    tone === 'self' ? 'rgba(92, 20, 20, 0.26)' : 'rgba(18, 37, 78, 0.2)';
  drawSpeechBubbleShape(
    context,
    bubbleX,
    bubbleY,
    boxWidth,
    boxHeight,
    tailCenterX,
    tailHeight,
    16
  );
  context.fillStyle =
    tone === 'self' ? 'rgba(255, 251, 249, 0.98)' : 'rgba(255, 255, 255, 0.98)';
  context.fill();
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  context.lineWidth = 1.2;
  context.strokeStyle =
    tone === 'self' ? 'rgba(217, 93, 93, 0.5)' : 'rgba(95, 132, 221, 0.38)';
  context.stroke();

  context.fillStyle =
    tone === 'self' ? 'rgba(255, 168, 168, 0.72)' : 'rgba(164, 190, 255, 0.58)';
  context.beginPath();
  context.arc(bubbleX + boxWidth - 14, bubbleY + 12, 2.4, 0, Math.PI * 2);
  context.arc(bubbleX + boxWidth - 22, bubbleY + 9, 1.8, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = tone === 'self' ? '#6f1515' : '#243f72';
  lines.forEach((line, index) => {
    context.fillText(
      line,
      bubbleX + boxWidth / 2,
      bubbleY + 13 + lineHeight / 2 + index * lineHeight
    );
  });
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
          : (previous?.x ?? getSpawnPoint(worldWidth, key).x),
        PLAYER_MARGIN,
        Math.max(PLAYER_MARGIN, worldWidth - PLAYER_MARGIN)
      );
      const nextY = clamp(
        typeof meta.y === 'number'
          ? meta.y
          : (previous?.y ?? getSpawnPoint(worldWidth, key).y),
        120,
        WORLD_HEIGHT - 100
      );
      const updatedAt =
        typeof meta.updatedAt === 'string' && meta.updatedAt.trim().length > 0
          ? meta.updatedAt
          : '';
      const presenceUpdatedAt = Date.parse(updatedAt || '') || 0;
      const shouldApplyPresencePosition =
        !previous ||
        previous.lastRemoteUpdateAt <= 0 ||
        presenceUpdatedAt >= previous.lastRemoteUpdateAt - 40;
      const presenceGap = previous
        ? Math.hypot(previous.x - nextX, previous.y - nextY)
        : 0;

      return {
        animFrame: previous?.animFrame ?? 0,
        dir,
        id: key,
        label,
        lastRemoteUpdateAt: shouldApplyPresencePosition
          ? presenceUpdatedAt
          : (previous?.lastRemoteUpdateAt ?? 0),
        palette,
        preset,
        profile,
        speed: REMOTE_PLAYER_SPEED,
        targetX: shouldApplyPresencePosition
          ? nextX
          : (previous?.targetX ?? nextX),
        targetY: shouldApplyPresencePosition
          ? nextY
          : (previous?.targetY ?? nextY),
        vx: previous?.vx ?? 0,
        vy: previous?.vy ?? 0,
        x:
          previous &&
          (!shouldApplyPresencePosition ||
            presenceGap < REMOTE_SNAP_DISTANCE * 2.8)
            ? previous.x
            : nextX,
        y:
          previous &&
          (!shouldApplyPresencePosition ||
            presenceGap < REMOTE_SNAP_DISTANCE * 2.8)
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
  const cleanupAnimationsRef = useRef<CleanupAnimationState[]>([]);
  const chatBubblesRef = useRef<Record<string, ChatBubbleState>>({});
  const seenChatMessageIdsRef = useRef<Set<string>>(new Set());
  const seenChatMessageIdQueueRef = useRef<string[]>([]);
  const poopAnimationsRef = useRef<PoopAnimationState[]>([]);
  const poopSettleTimeoutsRef = useRef<Map<string, number>>(new Map());
  const poopExpiryTimeoutsRef = useRef<Map<string, number>>(new Map());
  const poopDropsRef = useRef<PoopDrop[]>([]);
  const latestSelfPoopRef = useRef<SharedPoopPayload | null>(null);
  const seenRemotePoopIdsRef = useRef<Map<string, string>>(new Map());
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const participantKeyRef = useRef<string | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const cellsRef = useRef<CellState[]>([]);
  const remoteActorsRef = useRef<ActorState[]>([]);
  const selectedTargetRef = useRef<SelectedTarget | null>(null);
  const selfCleanupHoldingRef = useRef(false);
  const selfPoopHoldingRef = useRef(false);
  const lastMovementBroadcastRef = useRef(0);
  const lastMovementActiveRef = useRef(false);
  const lastStateBroadcastRef = useRef(0);
  const lastRemoteRosterSyncRef = useRef(0);
  const lastPlayerStateFallbackSyncRef = useRef(0);
  const lastPlayerStateFallbackLoadRef = useRef(0);
  const playerStateFallbackFetchInFlightRef = useRef(false);
  const cameraXRef = useRef(0);
  const cameraYRef = useRef(0);
  const scrollYRef = useRef(0);
  const worldWidthRef = useRef(DESKTOP_MIN_WORLD_WIDTH);
  const worldActiveRef = useRef(true);
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
    lastRemoteUpdateAt: 0,
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

  const [worldActive, setWorldActive] = useState(true);
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
  const [realtimeStatus, setRealtimeStatus] = useState<
    'connecting' | 'offline' | 'online'
  >('connecting');
  const [poopDrops, setPoopDrops] = useState<PoopDrop[]>([]);
  const [poopWriteTarget, setPoopWriteTarget] = useState<PoopDrop | null>(null);
  const [poopPostViewTarget, setPoopPostViewTarget] = useState<PoopDrop | null>(null);
  const [postRefreshTrigger, setPostRefreshTrigger] = useState(0);

  useEffect(() => {
    poopDropsRef.current = poopDrops;
  }, [poopDrops]);

  useEffect(() => {
    let mounted = true;
    const fetchPostPoops = async () => {
      try {
        const response = await fetch('/api/community/posts');
        const payload = await response.json();
        if (payload.data && mounted) {
          const loadedPoops: PoopDrop[] = payload.data.map((post: any) => {
            let x = Math.random() * 800 + 100;
            let y = Math.random() * 600 + 200;
            const match = post.content.match(/\[POS:(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\]/);
            if (match) {
              x = parseFloat(match[1]);
              y = parseFloat(match[2]);
            }
            return {
              actorId: post.userId,
              createdAt: new Date(post.createdAt).getTime(),
              id: post.id,
              x,
              y,
              isPost: true,
              postTitle: post.title,
              postData: post
            };
          });
          setPoopDrops((prev) => {
            const nonPosts = prev.filter((p) => !p.isPost);
            return [...nonPosts, ...loadedPoops];
          });
        }
      } catch (err) {
        // ignore
      }
    };
    void fetchPostPoops();
    return () => { mounted = false; };
  }, [postRefreshTrigger]);

  selectedTargetRef.current = selectedTarget;
  participantKeyRef.current = participantKey;
  worldActiveRef.current = worldActive;

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

    setParticipantKey(`bio-village-client-${crypto.randomUUID()}`);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !participantKey) return;

    const player = playerRef.current;
    if (player.x !== 0) return;

    const nextWorldWidth = getWorldWidth(window.innerWidth);
    worldWidthRef.current = nextWorldWidth;
    const spawn = getSpawnPoint(nextWorldWidth, participantKey);
    player.x = spawn.x;
    player.y = spawn.y;
  }, [participantKey]);

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

  const markChatMessageSeen = useCallback((id: string) => {
    const normalizedId = id.trim();
    if (!normalizedId) return true;

    const seenIds = seenChatMessageIdsRef.current;
    if (seenIds.has(normalizedId)) return false;

    seenIds.add(normalizedId);
    const queue = seenChatMessageIdQueueRef.current;
    queue.push(normalizedId);

    while (queue.length > CHAT_SEEN_MESSAGE_LIMIT) {
      const staleId = queue.shift();
      if (staleId) {
        seenIds.delete(staleId);
      }
    }

    return true;
  }, []);

  const emitChatMessage = useCallback((entry: BioVillageChatEntry) => {
    window.dispatchEvent(
      new CustomEvent<BioVillageChatEntry>(BIO_VILLAGE_CHAT_EVENT_MESSAGE, {
        detail: entry
      })
    );
  }, []);

  const setActorChatBubble = useCallback(
    (
      actorId: string,
      text: string,
      tone: Exclude<BioVillageChatTone, 'system'>
    ) => {
      const normalized = normalizeBioVillageChatText(text);
      if (!normalized) return;

      chatBubblesRef.current[actorId] = {
        expiresAt: Date.now() + BIO_VILLAGE_CHAT_BUBBLE_TTL_MS,
        text: normalized,
        tone
      };
    },
    []
  );

  const publishChatMessage = useCallback(
    ({
      actorId,
      author,
      bubbleActorId,
      id,
      sentAt,
      text,
      tone
    }: {
      actorId: string;
      author: string;
      bubbleActorId?: string | null;
      id?: string;
      sentAt?: number;
      text: string;
      tone: BioVillageChatTone;
    }) => {
      const normalized = normalizeBioVillageChatText(text);
      if (!normalized) return null;

      const entryId = id ?? crypto.randomUUID();
      if (!markChatMessageSeen(entryId)) return null;

      const entry: BioVillageChatEntry = {
        actorId,
        author,
        id: entryId,
        sentAt: sentAt ?? Date.now(),
        text: normalized,
        tone
      };

      emitChatMessage(entry);

      if (tone !== 'system' && bubbleActorId) {
        setActorChatBubble(
          bubbleActorId,
          normalized,
          tone === 'self' ? 'self' : 'remote'
        );
      }

      return entry;
    },
    [emitChatMessage, markChatMessageSeen, setActorChatBubble]
  );

  const commitRemoteActors = useCallback(
    (actors: ActorState[], options?: { notify?: boolean }) => {
      const sortedActors = [...actors].sort((left, right) =>
        left.label.localeCompare(right.label)
      );

      remoteActorsRef.current = sortedActors;

      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const shouldNotify =
        options?.notify !== false ||
        now - lastRemoteRosterSyncRef.current > REMOTE_ROSTER_SYNC_INTERVAL_MS;

      if (!shouldNotify) return;

      lastRemoteRosterSyncRef.current = now;
      setOnlineVisitors(
        sortedActors.map((actor) => ({
          id: actor.id,
          label: actor.label,
          palette: actor.palette
        }))
      );
      setRemoteRevision((previous) => previous + 1);
    },
    []
  );

  const removePoopAnimation = useCallback((id: string) => {
    poopAnimationsRef.current = poopAnimationsRef.current.filter(
      (animation) => animation.id !== id
    );
  }, []);

  const removePoopDrop = useCallback(
    (dropId: string) => {
      const existingTimeout = poopExpiryTimeoutsRef.current.get(dropId);
      if (existingTimeout !== undefined) {
        window.clearTimeout(existingTimeout);
        poopExpiryTimeoutsRef.current.delete(dropId);
      }

      if (latestSelfPoopRef.current?.id === dropId) {
        latestSelfPoopRef.current = null;
        const channel = presenceChannelRef.current;
        const key = participantKeyRef.current;
        if (channel && key) {
          void channel
            .track(
              buildPresencePayload(
                key,
                playerRef.current,
                user?.id ?? null,
                latestSelfPoopRef.current
              )
            )
            .catch(() => undefined);
        }
      }

      setPoopDrops((previous) => {
        const nextDrops = previous.filter((entry) => entry.id !== dropId);
        poopDropsRef.current = nextDrops;
        return nextDrops;
      });
    },
    [user?.id]
  );

  const startCleanupAnimation = useCallback(
    (actorId: string, targetDropId: string) => {
      cleanupAnimationsRef.current = [
        ...cleanupAnimationsRef.current.filter(
          (animation) => animation.actorId !== actorId
        ),
        {
          actorId,
          id: crypto.randomUUID(),
          startedAt: performance.now(),
          targetDropId
        }
      ];
    },
    []
  );

  const findNearbyPoopDrop = useCallback((actor: ActorState) => {
    const { height } = getSpriteSize(actor.preset);
    const footX = actor.x;
    const footY = actor.y + height * 0.44;

    const candidates = poopDropsRef.current
      .map((drop) => {
        const dx = drop.x - footX;
        const dy = drop.y - footY;
        return {
          distance: Math.hypot(dx, dy),
          drop,
          dx,
          dy
        };
      })
      .filter(
        (entry) =>
          Math.abs(entry.dx) <= 34 &&
          Math.abs(entry.dy) <= 40 &&
          entry.distance <= 42
      )
      .sort((left, right) => left.distance - right.distance);

    return candidates[0]?.drop ?? null;
  }, []);

  const schedulePoopExpiry = useCallback(
    (drop: PoopDrop) => {
      const existingTimeout = poopExpiryTimeoutsRef.current.get(drop.id);
      if (existingTimeout !== undefined) {
        window.clearTimeout(existingTimeout);
      }

      const remaining = drop.createdAt + POOP_TTL_MS - Date.now();

      if (remaining <= 0) {
        removePoopDrop(drop.id);
        return;
      }

      const timeoutId = window.setTimeout(() => {
        removePoopDrop(drop.id);
      }, remaining);

      poopExpiryTimeoutsRef.current.set(drop.id, timeoutId);
    },
    [removePoopDrop]
  );

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

  const applyRemoteMovementPayload = useCallback(
    (payload: unknown) => {
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

      const previousActors = remoteActorsRef.current;
      const isNewActor = !previousActors.some((actor) => actor.id === data.key);
      const nextActors = (() => {
        const actorIndex = previousActors.findIndex(
          (actor) => actor.id === data.key
        );
        const previousActor =
          actorIndex >= 0 ? previousActors[actorIndex] : undefined;
        const movementGap = previousActor
          ? Math.hypot(previousActor.x - nextX, previousActor.y - nextY)
          : 0;
        const previousUpdatedAt = previousActor?.lastRemoteUpdateAt ?? 0;
        if (sentAt <= previousUpdatedAt - 30) {
          return previousActors;
        }
        const latencyMs = Math.min(180, Math.max(0, Date.now() - sentAt));
        const predictionScale = moving ? latencyMs / 16.7 : 0;
        const nextActor: ActorState = {
          animFrame:
            moving && previousActor ? previousActor.animFrame + 0.22 : 0,
          dir,
          id: data.key,
          label,
          lastRemoteUpdateAt: sentAt,
          palette,
          preset,
          profile,
          speed: Math.max(
            REMOTE_PLAYER_SPEED,
            Math.hypot(data.vx, data.vy) * 1.18 +
              Math.min(5.4, movementGap * 0.045)
          ),
          targetX: clamp(
            data.x + data.vx * predictionScale * 0.55,
            PLAYER_MARGIN,
            Math.max(PLAYER_MARGIN, worldWidthRef.current - PLAYER_MARGIN)
          ),
          targetY: clamp(
            data.y + data.vy * predictionScale * 0.55,
            120,
            WORLD_HEIGHT - 100
          ),
          vx: data.vx,
          vy: data.vy,
          x:
            moving && previousActor && movementGap < REMOTE_SNAP_DISTANCE * 4.2
              ? previousActor.x
              : nextX,
          y:
            moving && previousActor && movementGap < REMOTE_SNAP_DISTANCE * 4.2
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

      commitRemoteActors(nextActors, { notify: isNewActor });
    },
    [commitRemoteActors]
  );

  const applyRemoteChatPayload = useCallback(
    (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;

      const data = payload as Partial<SharedChatPayload>;
      if (
        typeof data.actorId !== 'string' ||
        typeof data.text !== 'string' ||
        typeof data.label !== 'string'
      ) {
        return;
      }

      const ownKey = participantKeyRef.current;
      if (data.actorId === ownKey) return;

      const fallbackLabel = `Visitor ${data.actorId.slice(0, 4)}`;
      const actor =
        remoteActorsRef.current.find((entry) => entry.id === data.actorId) ??
        null;
      const author = data.label.trim() || actor?.label || fallbackLabel;

      publishChatMessage({
        actorId: data.actorId,
        author,
        bubbleActorId: data.actorId,
        id: typeof data.id === 'string' ? data.id : undefined,
        sentAt: typeof data.sentAt === 'number' ? data.sentAt : Date.now(),
        text: data.text,
        tone: 'remote'
      });
    },
    [publishChatMessage]
  );

  const persistLocalChatMessage = useCallback((payload: SharedChatPayload) => {
    void fetch(CHAT_HISTORY_ENDPOINT, {
      body: JSON.stringify({
        actorId: payload.actorId,
        author: payload.label,
        id: payload.id,
        text: payload.text
      }),
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST'
    }).catch(() => undefined);
  }, []);

  const sendLocalChatMessage = useCallback(
    (rawText: string) => {
      const normalized = normalizeBioVillageChatText(rawText);
      if (!normalized) return;

      const player = playerRef.current;
      const actorId = participantKeyRef.current ?? 'self';
      const entry = publishChatMessage({
        actorId,
        author: player.label,
        bubbleActorId: 'self',
        text: normalized,
        tone: 'self'
      });

      if (!entry) return;

      const payload: SharedChatPayload = {
        actorId,
        id: entry.id,
        label: player.label,
        sentAt: entry.sentAt,
        text: entry.text
      };

      void presenceChannelRef.current
        ?.send({
          type: 'broadcast',
          event: 'player-chat',
          payload
        })
        .catch(() => undefined);

      persistLocalChatMessage(payload);
    },
    [persistLocalChatMessage, publishChatMessage]
  );

  const openGoodsCommercePortal = () => {
    setSelectedTarget(null);
    setActiveVillageShopTab(null);
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('services:open-modal'));
    }, 40);
  };

  const openCommunityBoardPortal = () => {
    setSelectedTarget(null);
    setActiveVillageShopTab(null);
    window.dispatchEvent(new CustomEvent('community:open-modal'));
  };

  const openVillageShop = (
    tab: VillageShopTab,
    structureId?: string | null
  ) => {

    if (structureId === 'goods-access-shop') {
      openGoodsCommercePortal();
      return;
    }

    setSelectedTarget(null);
    setActiveVillageShopTab(tab);
  };

  const jumpToVillageSection = (
    sectionId: 'about' | 'services' | 'studio'
  ) => {
    setActiveVillageShopTab(null);

    if (sectionId === 'community') {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('community:open-modal'));
      }, 80);
      return;
    }

    if (sectionId === 'services') {
      openGoodsCommercePortal();
      return;
    }

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
      openVillageShop(tab, structureId);
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
    if (!participantKey) return;

    let cancelled = false;

    const loadRecentChatMessages = async () => {
      try {
        const response = await fetch(CHAT_HISTORY_ENDPOINT, {
          cache: 'no-store'
        });
        if (!response.ok) return;

        const payload = (await response.json().catch(() => null)) as {
          data?: unknown;
        } | null;
        if (cancelled || !Array.isArray(payload?.data)) return;

        payload.data.forEach((item) => {
          const message = item as StoredChatPayload;
          if (
            typeof message.id !== 'string' ||
            typeof message.actorId !== 'string' ||
            typeof message.text !== 'string'
          ) {
            return;
          }

          const text = normalizeBioVillageChatText(message.text);
          if (!text) return;

          const author =
            typeof message.author === 'string' && message.author.trim()
              ? message.author.trim().slice(0, 40)
              : 'Visitor';
          const sentAt =
            typeof message.sentAt === 'number' &&
            Number.isFinite(message.sentAt)
              ? message.sentAt
              : Date.now();

          publishChatMessage({
            actorId: message.actorId,
            author,
            bubbleActorId: null,
            id: message.id,
            sentAt,
            text,
            tone: message.actorId === participantKey ? 'self' : 'remote'
          });
        });
      } catch {
        // Realtime chat still works if the short history endpoint is unavailable.
      }
    };

    void loadRecentChatMessages();

    return () => {
      cancelled = true;
    };
  }, [participantKey, publishChatMessage]);

  useEffect(() => {
    const handleChatSend = (event: Event) => {
      const detail = (event as CustomEvent<BioVillageChatSendDetail>).detail;
      if (!detail || typeof detail.text !== 'string') return;
      sendLocalChatMessage(detail.text);
    };

    window.addEventListener(
      BIO_VILLAGE_CHAT_EVENT_SEND,
      handleChatSend as EventListener
    );

    return () => {
      window.removeEventListener(
        BIO_VILLAGE_CHAT_EVENT_SEND,
        handleChatSend as EventListener
      );
    };
  }, [sendLocalChatMessage]);

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

    const handlePoopCleanHoldStart = () => {
      selfCleanupHoldingRef.current = Boolean(
        findNearbyPoopDrop(playerRef.current)
      );
    };

    const handlePoopCleanHoldEnd = () => {
      selfCleanupHoldingRef.current = false;
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
      const poopPayload: SharedPoopPayload = {
        actorId,
        createdAt,
        dropX,
        dropY,
        id: animationId
      };

      startPoopSequence(actorId, dropX, dropY, animationId, createdAt);
      latestSelfPoopRef.current = poopPayload;

      const channel = presenceChannelRef.current;
      const key = participantKeyRef.current;
      if (channel && key) {
        void channel
          .track(
            buildPresencePayload(
              key,
              player,
              user?.id ?? null,
              latestSelfPoopRef.current
            )
          )
          .catch(() => undefined);
      }

      void channel
        ?.send({
          type: 'broadcast',
          event: 'poop-drop',
          payload: poopPayload
        })
        .catch(() => undefined);
    };

    const handlePoopCleanTrigger = () => {
      selfCleanupHoldingRef.current = false;
      const player = playerRef.current;
      const targetDrop = findNearbyPoopDrop(player);
      if (!targetDrop) return;

      const actorId = participantKeyRef.current ?? 'self';
      startCleanupAnimation(actorId, targetDrop.id);
      removePoopDrop(targetDrop.id);

      void presenceChannelRef.current
        ?.send({
          type: 'broadcast',
          event: 'poop-clear',
          payload: {
            actorId,
            clearedAt: Date.now(),
            dropId: targetDrop.id
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
    window.addEventListener(
      'bio-village:poop-clean-hold-start',
      handlePoopCleanHoldStart as EventListener
    );
    window.addEventListener(
      'bio-village:poop-clean-hold-end',
      handlePoopCleanHoldEnd as EventListener
    );
    window.addEventListener(
      'bio-village:poop-clean-trigger',
      handlePoopCleanTrigger as EventListener
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
      window.removeEventListener(
        'bio-village:poop-clean-hold-start',
        handlePoopCleanHoldStart as EventListener
      );
      window.removeEventListener(
        'bio-village:poop-clean-hold-end',
        handlePoopCleanHoldEnd as EventListener
      );
      window.removeEventListener(
        'bio-village:poop-clean-trigger',
        handlePoopCleanTrigger as EventListener
      );
    };
  }, [
    findNearbyPoopDrop,
    removePoopDrop,
    startCleanupAnimation,
    startPoopSequence
  ]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPoopDrops((previous) => pruneExpiredPoops(previous));
    }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const activeActors = remoteActorsRef.current.filter(
        (actor) =>
          actor.lastRemoteUpdateAt <= 0 ||
          now - actor.lastRemoteUpdateAt < REMOTE_ACTOR_TIMEOUT_MS
      );

      if (activeActors.length !== remoteActorsRef.current.length) {
        commitRemoteActors(activeActors);
      }
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [commitRemoteActors]);

  useEffect(() => {
    if (!supabase || !participantKey) return;

    let cancelled = false;
    let heartbeatIntervalId: number | null = null;
    setRealtimeStatus('connecting');
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: participantKey }
      }
    });
    presenceChannelRef.current = channel;

    const syncPresenceSnapshot = () => {
      if (cancelled) return;
      const presenceState = channel.presenceState() as PresenceStateValue;
      const nextActors = buildRemoteActorsFromPresence(
        presenceState,
        participantKey,
        remoteActorsRef.current,
        worldWidthRef.current
      );
      commitRemoteActors(nextActors);
      const nextActorIds = new Set(nextActors.map((actor) => actor.id));
      Array.from(seenRemotePoopIdsRef.current.keys()).forEach((actorId) => {
        if (!nextActorIds.has(actorId)) {
          seenRemotePoopIdsRef.current.delete(actorId);
        }
      });
      Object.entries(presenceState).forEach(([presenceKey, metas]) => {
        metas.forEach((meta) => {
          const actorId =
            typeof meta.key === 'string' && meta.key.trim().length > 0
              ? meta.key.trim()
              : presenceKey;

          if (!actorId || actorId === participantKey) return;

          const latestPoop =
            meta.latestPoop && typeof meta.latestPoop === 'object'
              ? (meta.latestPoop as Partial<SharedPoopPayload>)
              : null;

          if (
            !latestPoop ||
            typeof latestPoop.id !== 'string' ||
            typeof latestPoop.dropX !== 'number' ||
            typeof latestPoop.dropY !== 'number' ||
            typeof latestPoop.actorId !== 'string'
          ) {
            return;
          }

          if (seenRemotePoopIdsRef.current.get(actorId) === latestPoop.id) {
            return;
          }

          seenRemotePoopIdsRef.current.set(actorId, latestPoop.id);
          startPoopSequence(
            latestPoop.actorId,
            latestPoop.dropX,
            latestPoop.dropY,
            latestPoop.id,
            typeof latestPoop.createdAt === 'number'
              ? latestPoop.createdAt
              : Date.now()
          );
        });
      });
    };

    const trackSelf = async () => {
      const player = playerRef.current;
      await channel.track(
        buildPresencePayload(
          participantKey,
          player,
          user?.id ?? null,
          latestSelfPoopRef.current
        )
      );
    };

    const broadcastSelfState = async () => {
      await channel.send({
        type: 'broadcast',
        event: 'player-state',
        payload: buildMovementPayload(participantKey, playerRef.current)
      });
    };

    const requestPeerStates = async () => {
      await channel.send({
        type: 'broadcast',
        event: 'player-state-request',
        payload: {
          key: participantKey,
          requestedAt: Date.now()
        }
      });
    };

    channel
      .on('broadcast', { event: 'player-state-request' }, ({ payload }) => {
        if (!payload || typeof payload !== 'object') return;

        const data = payload as Record<string, unknown>;
        if (data.key === participantKey) return;

        void broadcastSelfState().catch(() => undefined);
      })
      .on('broadcast', { event: 'player-move' }, ({ payload }) => {
        applyRemoteMovementPayload(payload);
      })
      .on('broadcast', { event: 'player-state' }, ({ payload }) => {
        applyRemoteMovementPayload(payload);
      })
      .on('broadcast', { event: 'player-chat' }, ({ payload }) => {
        applyRemoteChatPayload(payload);
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
        seenRemotePoopIdsRef.current.set(data.actorId, data.id);
      })
      .on('broadcast', { event: 'poop-clear' }, ({ payload }) => {
        if (!payload || typeof payload !== 'object') return;

        const data = payload as Record<string, unknown>;
        if (
          typeof data.dropId !== 'string' ||
          typeof data.actorId !== 'string'
        ) {
          return;
        }

        startCleanupAnimation(data.actorId, data.dropId);
        removePoopDrop(data.dropId);
      })
      .on('presence', { event: 'sync' }, syncPresenceSnapshot)
      .on('presence', { event: 'join' }, syncPresenceSnapshot)
      .on('presence', { event: 'leave' }, syncPresenceSnapshot)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('online');
          lastPresenceSyncRef.current = 0;
          lastMovementBroadcastRef.current = 0;
          lastStateBroadcastRef.current = 0;
          lastMovementActiveRef.current = true;
          if (heartbeatIntervalId !== null) {
            window.clearInterval(heartbeatIntervalId);
          }
          heartbeatIntervalId = window.setInterval(() => {
            if (cancelled) return;
            void trackSelf()
              .then(() => broadcastSelfState())
              .catch(() => setRealtimeStatus('offline'));
          }, REMOTE_SYNC_INTERVAL_MS);
          void trackSelf()
            .then(() => broadcastSelfState())
            .then(() => requestPeerStates())
            .then(syncPresenceSnapshot)
            .catch(() => setRealtimeStatus('offline'));
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('offline');
        }
      });

    return () => {
      cancelled = true;
      if (heartbeatIntervalId !== null) {
        window.clearInterval(heartbeatIntervalId);
      }
      commitRemoteActors([]);
      void channel.untrack().catch(() => undefined);
      void supabase.removeChannel(channel).catch(() => undefined);
      presenceChannelRef.current = null;
      setRealtimeStatus('connecting');
    };
  }, [
    applyRemoteChatPayload,
    applyRemoteMovementPayload,
    commitRemoteActors,
    participantKey,
    removePoopDrop,
    startCleanupAnimation,
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
        const spawn = getSpawnPoint(
          nextWorldWidth,
          participantKeyRef.current ?? participantKey
        );
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
          window.innerHeight,
          {
            x: player.x,
            y: player.y
          }
        );

        cameraXRef.current = initialCamera.x;
        cameraYRef.current = initialCamera.y;
        scrollYRef.current = initialCamera.y;
        initialViewportAlignedRef.current = true;
        const nextWorldActive = initialCamera.y < WORLD_HEIGHT - 96;
        worldActiveRef.current = nextWorldActive;
        setWorldActive(nextWorldActive);
        window.scrollTo({ left: 0, top: initialCamera.y, behavior: 'instant' });
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
      const nextScrollY = window.scrollY;
      scrollYRef.current = nextScrollY;
      const nextWorldActive = nextScrollY < WORLD_HEIGHT - 96;
      if (worldActiveRef.current !== nextWorldActive) {
        worldActiveRef.current = nextWorldActive;
        setWorldActive(nextWorldActive);
      }
      const player = playerRef.current;
      if (player.vx === 0 && player.vy === 0 && player.targetY === null) {
        cameraYRef.current = nextScrollY;
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
      const currentScrollY = scrollYRef.current;
      const actors = [playerRef.current, ...remoteActorsRef.current]
        .map((actor) => ({
          actor,
          ...getActorScreenPosition(actor, currentScrollY, cameraX)
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
        playerRef.current.targetX = event.clientX + cameraXRef.current;
        playerRef.current.targetY = event.clientY + window.scrollY;
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
        .track(
          buildPresencePayload(
            key,
            player,
            user?.id ?? null,
            latestSelfPoopRef.current
          )
        )
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

    const syncRealtimeStateIfNeeded = () => {
      const channel = presenceChannelRef.current;
      const key = participantKeyRef.current;
      if (!channel || !key) return;

      const now = performance.now();
      if (
        now - lastStateBroadcastRef.current <
        PLAYER_STATE_BROADCAST_INTERVAL_MS
      ) {
        return;
      }

      lastStateBroadcastRef.current = now;

      void channel
        .send({
          type: 'broadcast',
          event: 'player-state',
          payload: buildMovementPayload(key, playerRef.current)
        })
        .catch(() => undefined);
    };

    const syncPlayerStateFallbackIfNeeded = () => {
      const key = participantKeyRef.current;
      if (!key) return;

      const now = performance.now();
      if (
        now - lastPlayerStateFallbackSyncRef.current <
        PLAYER_STATE_FALLBACK_SYNC_INTERVAL_MS
      ) {
        return;
      }

      lastPlayerStateFallbackSyncRef.current = now;
      const payload = buildMovementPayload(key, playerRef.current);
      void fetch(PLAYER_STATE_FALLBACK_ENDPOINT, {
        body: JSON.stringify({
          ...payload,
          latestPoop: latestSelfPoopRef.current
        }),
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      }).catch(() => undefined);
    };

    const loadPlayerStateFallbackIfNeeded = () => {
      const ownKey = participantKeyRef.current;
      if (!ownKey || playerStateFallbackFetchInFlightRef.current) return;

      const now = performance.now();
      if (
        now - lastPlayerStateFallbackLoadRef.current <
        PLAYER_STATE_FALLBACK_SYNC_INTERVAL_MS
      ) {
        return;
      }

      lastPlayerStateFallbackLoadRef.current = now;
      playerStateFallbackFetchInFlightRef.current = true;

      void fetch(PLAYER_STATE_FALLBACK_ENDPOINT, {
        cache: 'no-store'
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { data?: unknown } | null) => {
          if (!Array.isArray(payload?.data)) return;

          payload.data.forEach((item) => {
            const state = item as StoredPlayerPayload;
            const stateKey = typeof state.key === 'string' ? state.key : '';
            if (!stateKey || stateKey === ownKey) return;

            applyRemoteMovementPayload(state);

            const latestPoop =
              state.latestPoop && typeof state.latestPoop === 'object'
                ? (state.latestPoop as Partial<SharedPoopPayload>)
                : null;
            if (
              !latestPoop ||
              typeof latestPoop.id !== 'string' ||
              typeof latestPoop.actorId !== 'string' ||
              typeof latestPoop.dropX !== 'number' ||
              typeof latestPoop.dropY !== 'number'
            ) {
              return;
            }

            if (seenRemotePoopIdsRef.current.get(stateKey) === latestPoop.id) {
              return;
            }

            seenRemotePoopIdsRef.current.set(stateKey, latestPoop.id);
            startPoopSequence(
              latestPoop.actorId,
              latestPoop.dropX,
              latestPoop.dropY,
              latestPoop.id,
              typeof latestPoop.createdAt === 'number'
                ? latestPoop.createdAt
                : Date.now()
            );
          });
        })
        .catch(() => undefined)
        .finally(() => {
          playerStateFallbackFetchInFlightRef.current = false;
        });
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
          return {
            ...actor,
            vx: actor.vx * 0.62,
            vy: actor.vy * 0.62,
            animFrame: 0
          };
        }

        const dx = actor.targetX - actor.x;
        const dy = actor.targetY - actor.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 1.5) {
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

        const smoothing = distance > 180 ? 0.22 : distance > 72 ? 0.16 : 0.12;
        const step = Math.min(
          distance,
          distance * smoothing + 0.5 // Pure lerp with a tiny minimum to keep it moving at the end
        );
        const vx = (dx / distance) * step;
        const vy = (dy / distance) * step;

        return {
          ...actor,
          animFrame: actor.animFrame + 0.14,
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

    const updateCamera = (frameScale: number) => {
      const player = playerRef.current;
      const maxVerticalCamera = Math.max(0, WORLD_HEIGHT - window.innerHeight);
      const verticalTarget = clamp(
        player.y - window.innerHeight / 2,
        0,
        maxVerticalCamera
      );
      const nextCameraY = getSmoothCameraValue(
        cameraYRef.current,
        verticalTarget,
        frameScale
      );
      cameraYRef.current = nextCameraY;
      scrollYRef.current = nextCameraY;

      const scrollTarget = Math.round(nextCameraY);
      if (Math.abs(window.scrollY - scrollTarget) > 0.5) {
        window.scrollTo({ left: 0, top: scrollTarget, behavior: 'instant' });
      }

      const nextWorldActive = nextCameraY < WORLD_HEIGHT - 96;
      if (worldActiveRef.current !== nextWorldActive) {
        worldActiveRef.current = nextWorldActive;
        setWorldActive(nextWorldActive);
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
      cameraXRef.current = getSmoothCameraValue(
        cameraXRef.current,
        horizontalTarget,
        frameScale
      );
      applyWorldTransform(
        [worldBackdropRef.current, worldObjectsRef.current],
        cameraXRef.current
      );
    };

    let time = 0;
    let lastFrameAt = performance.now();

    const animate = (frameAt: number) => {
      const frameDeltaMs = clamp(frameAt - lastFrameAt || 16.7, 8, 50);
      const frameScale = getFrameScale(frameDeltaMs);
      lastFrameAt = frameAt;
      const shouldRenderWorld =
        worldActiveRef.current && document.visibilityState === 'visible';

      if (!shouldRenderWorld) {
        backgroundContext.clearRect(
          0,
          0,
          window.innerWidth,
          window.innerHeight
        );
        avatarContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
        frameRef.current = window.requestAnimationFrame(animate);
        return;
      }

      time += 1;
      updatePlayer();
      updateRemoteActors();
      updateCamera(frameScale);
      const currentScrollY = cameraYRef.current;
      syncPresenceIfNeeded();
      syncRealtimeMovementIfNeeded();
      syncRealtimeStateIfNeeded();
      syncPlayerStateFallbackIfNeeded();
      loadPlayerStateFallbackIfNeeded();

      backgroundContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
      backgroundContext.fillStyle = 'rgba(248, 249, 250, 0.24)';
      backgroundContext.fillRect(0, 0, window.innerWidth, window.innerHeight);
      avatarContext.clearRect(0, 0, window.innerWidth, window.innerHeight);

      cellsRef.current.forEach((cell) => {
        cell.worldX += cell.vx + Math.sin(time * 0.01 + cell.phase) * 0.12;
        cell.worldY += cell.vy + Math.cos(time * 0.01 + cell.phase) * 0.12;

        const screenY = cell.worldY - currentScrollY;
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

      const selectedId =
        selectedTargetRef.current?.kind === 'remote'
          ? selectedTargetRef.current.id
          : selectedTargetRef.current?.kind === 'self'
            ? 'self'
            : null;
      const now = Date.now();
      Object.entries(chatBubblesRef.current).forEach(([actorId, bubble]) => {
        if (bubble.expiresAt <= now) {
          delete chatBubblesRef.current[actorId];
        }
      });
      cleanupAnimationsRef.current = cleanupAnimationsRef.current.filter(
        (animation) => performance.now() - animation.startedAt < CLEAN_SWEEP_MS
      );
      const activeCleanupAnimations = cleanupAnimationsRef.current;
      const activePoopAnimations = poopAnimationsRef.current;
      const selfPoopActorId = participantKeyRef.current ?? 'self';
      const poopingActorIds = new Set(
        activePoopAnimations.map((animation) => animation.actorId)
      );
      const cleaningActorIds = new Set(
        activeCleanupAnimations.map((animation) => animation.actorId)
      );
      const selfIsPooping =
        selfPoopHoldingRef.current || poopingActorIds.has(selfPoopActorId);
      const selfIsCleaning =
        selfCleanupHoldingRef.current || cleaningActorIds.has(selfPoopActorId);

      const visibleRemoteActors = [...remoteActorsRef.current].sort(
        (left, right) => left.y - right.y
      );

      visibleRemoteActors.forEach((actor) => {
        drawActor(avatarContext, actor, currentScrollY, cameraXRef.current, {
          isCleaning: cleaningActorIds.has(actor.id),
          isPooping: poopingActorIds.has(actor.id),
          isSelected: selectedId === actor.id
        });

        const remoteBubble = chatBubblesRef.current[actor.id];
        if (remoteBubble) {
          drawActorSpeechBubble(
            avatarContext,
            actor,
            currentScrollY,
            cameraXRef.current,
            remoteBubble.text,
            remoteBubble.tone
          );
        }
      });

      activePoopAnimations.forEach((animation) => {
        const sourceActor =
          animation.actorId === selfPoopActorId
            ? playerRef.current
            : (remoteActorsRef.current.find(
                (actor) => actor.id === animation.actorId
              ) ?? null);
        const screenX = animation.dropX - cameraXRef.current;
        const targetY = animation.dropY - currentScrollY;
        const progress = Math.min(
          1,
          (performance.now() - animation.startedAt) / POOP_SETTLE_MS
        );
        const actorHeight = sourceActor
          ? getSpriteSize(sourceActor.preset).height
          : getSpriteSize(playerRef.current.preset).height;
        const startY = sourceActor
          ? sourceActor.y - currentScrollY + actorHeight * 0.12
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
        currentScrollY,
        cameraXRef.current,
        {
          isCleaning: selfIsCleaning,
          isPooping: selfIsPooping,
          isSelf: true,
          isSelected: selectedId === 'self'
        }
      );

      const selfBubble = chatBubblesRef.current.self;
      if (selfBubble) {
        drawActorSpeechBubble(
          avatarContext,
          playerRef.current,
          currentScrollY,
          cameraXRef.current,
          selfBubble.text,
          selfBubble.tone
        );
      }

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
  }, [
    applyRemoteMovementPayload,
    startPoopSequence,
    supabase,
    user?.id,
    user?.name
  ]);

  return (
    <section
      id="home"
      className="relative isolate w-full overflow-hidden"
      style={{ minHeight: `${WORLD_HEIGHT}px` }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
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

        .village-community-shop {
          border: none;
          background: transparent;
          box-shadow: none;
          padding: 0;
          overflow: visible;
          filter: saturate(1.02) contrast(1.02);
        }

        .village-community-shop::before {
          display: none;
        }

        .village-community-shop:hover {
          transform: translate(-50%, calc(-50% - 3px)) scale(1.015);
          border-color: transparent;
          box-shadow: none;
        }

        .village-community-shell {
          position: relative;
          width: 100%;
          padding-top: 0.2rem;
        }

        .village-community-shell::after {
          content: '';
          position: absolute;
          left: 51%;
          bottom: 0.9rem;
          z-index: 0;
          width: 86%;
          height: 2rem;
          transform: translateX(-50%);
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(49, 19, 63, 0.28) 0%,
            rgba(49, 19, 63, 0.12) 45%,
            rgba(49, 19, 63, 0) 100%
          );
          filter: blur(13px);
        }

        .village-community-image {
          position: relative;
          z-index: 1;
          width: 100%;
          height: auto;
          display: block;
          image-rendering: pixelated;
          filter:
            drop-shadow(0 20px 24px rgba(40, 18, 74, 0.14))
            drop-shadow(0 7px 12px rgba(19, 7, 38, 0.12));
          user-select: none;
          -webkit-user-drag: none;
          mix-blend-mode: multiply;
        }

        .village-community-sign {
          position: absolute;
          left: 16%;
          top: 1.05rem;
          z-index: 3;
          transform: translate(-8%, -46%) rotate(-2deg);
          border: 1px solid rgba(94, 100, 198, 0.32);
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(246,250,255,0.96), rgba(232,236,255,0.92));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.92),
            0 14px 28px rgba(47, 43, 123, 0.14);
          padding: 0.42rem 0.9rem;
          font-family: var(--font-display-kr);
          font-size: 0.84rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: rgba(54, 61, 135, 0.92);
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

        @media (max-width: 767px) {
          .village-shop-card {
            border-radius: 1rem;
            padding: 0.82rem 0.85rem;
          }

          .village-castle-sign {
            font-size: 0.78rem;
            padding: 0.34rem 0.8rem;
          }

          .village-community-sign {
            font-size: 0.74rem;
            padding: 0.3rem 0.72rem;
          }

        }
      `}} />

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
        className="pointer-events-none fixed left-3 top-20 z-40 sm:left-4 sm:top-24 md:left-6"
        style={{
          opacity: worldActive ? 1 : 0,
          transition: 'opacity 180ms ease'
        }}
      >
        <div className="rounded-full border border-[rgba(186,57,57,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,241,241,0.8))] px-3.5 py-2 shadow-[0_12px_30px_rgba(107,21,21,0.12)] backdrop-blur-xl">
          <p className="flex items-center gap-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-[rgba(140,52,52,0.62)]">
            <span
              className={`h-2 w-2 rounded-full ${
                realtimeStatus === 'online'
                  ? 'bg-emerald-500'
                  : realtimeStatus === 'connecting'
                    ? 'bg-amber-400'
                    : 'bg-red-500'
              }`}
            />
            {realtimeStatus === 'online'
              ? 'online'
              : realtimeStatus === 'connecting'
                ? 'syncing'
                : 'offline'}
          </p>
          <p className="mt-1 font-[var(--font-display-kr)] text-[0.92rem] font-semibold tracking-[0.04em] text-[rgba(69,14,14,0.92)] sm:text-[1rem]">
            현재 접속 {onlineVisitors.length + 1}명
          </p>
        </div>
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
        </div>

        <div
          ref={worldObjectsRef}
          className="relative z-[15] h-full will-change-transform"
          style={{
            width: `${worldWidth}px`
          }}
        >
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
                  boxShadow:
                    isGoodsCastle
                      ? undefined
                      : `inset 0 1px 0 rgba(255,255,255,0.92), 0 16px 34px rgba(130, 24, 24, 0.12), 0 0 0 10px ${visual.glow}`,
                  left: shop.left,
                  top: `${shop.top}px`,
                  width: `${shop.width}px`
                }}
                onDoubleClick={() => openVillageShop(shop.tab, shop.id)}
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

          {poopDrops.map((drop) => {
            const isOwnNewPoop = !drop.isPost && drop.actorId === (participantKeyRef.current ?? 'self');
            const isPost = drop.isPost;

            return (
              <div
                key={drop.id}
                className={`absolute z-[12] h-[28px] w-[30px] ${isOwnNewPoop || isPost ? 'cursor-pointer' : 'pointer-events-none'}`}
                style={{
                  left: `${drop.x}px`,
                  top: `${drop.y}px`,
                  transform: 'translate(-50%, -35%)'
                }}
                onClick={() => {
                  if (isOwnNewPoop) setPoopWriteTarget(drop);
                  else if (isPost) setPoopPostViewTarget(drop);
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

                {isOwnNewPoop && (
                  <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-[0.6rem] border border-[rgba(90,40,20,0.15)] bg-[rgba(255,248,242,0.92)] px-2 py-1 text-[10px] font-semibold tracking-[-0.02em] text-[#6b3512] shadow-[0_4px_12px_rgba(90,40,20,0.1)] backdrop-blur-md transition-transform hover:scale-105 active:scale-95">
                    똥에 기록 남기기 📝
                    <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-[rgba(255,248,242,0.92)]" />
                  </div>
                )}

                {isPost && (
                  <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-[0.6rem] border border-[rgba(20,60,90,0.15)] bg-[rgba(242,250,255,0.92)] px-2 py-1 text-[10px] font-semibold tracking-[-0.02em] text-[#124b6b] shadow-[0_4px_12px_rgba(20,60,90,0.1)] backdrop-blur-md transition-transform hover:scale-105 active:scale-95">
                    {drop.postTitle || '기록된 똥 📜'}
                    <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-[rgba(242,250,255,0.92)]" />
                  </div>
                )}
              </div>
            );
          })}
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
      {poopWriteTarget && (
        <PoopWriteModal
          dropId={poopWriteTarget.id}
          dropX={poopWriteTarget.x}
          dropY={poopWriteTarget.y}
          onClose={() => setPoopWriteTarget(null)}
          onSuccess={() => {
            setPoopWriteTarget(null);
            setPostRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
      {poopPostViewTarget && poopPostViewTarget.postData && (
        <PoopPostModal
          post={poopPostViewTarget.postData}
          onClose={() => setPoopPostViewTarget(null)}
          onDelete={() => {
            setPoopPostViewTarget(null);
            setPostRefreshTrigger(prev => prev + 1);
          }}
          onCommentAdded={() => setPostRefreshTrigger(prev => prev + 1)}
        />
      )}
    </section>
  );
}

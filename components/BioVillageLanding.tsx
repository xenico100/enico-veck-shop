'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { useAuth } from '@/app/context/AuthContext';
import { createClient } from '@/utils/supabase/client';

const WORLD_HEIGHT = 3500;
const MOBILE_WORLD_WIDTH = 1480;
const DESKTOP_MIN_WORLD_WIDTH = 1280;
const PLAYER_SCALE = 5;
const PLAYER_SPEED = 5.8;
const PLAYER_MARGIN = 40;
const PRESENCE_CHANNEL = 'bio-village-presence-v1';

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

type FacilityNode = {
  bodyClassName: string;
  caption: string;
  id: string;
  left: string;
  subtitle: string;
  title: string;
  top: number;
  width?: number;
};

type SelectedTarget = { kind: 'remote'; id: string } | { kind: 'self' };

type PresenceStateValue = Record<string, Array<Record<string, unknown>>>;

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
    left: '50%',
    subtitle: '중앙 접속 심장. 매칭 신호와 유저 흐름이 모이는 코어.',
    title: 'Clinical Atrium',
    top: 360,
    width: 240
  },
  {
    bodyClassName: 'village-node-card',
    caption: 'PROFILE LAB',
    id: 'profile-lab',
    left: '23%',
    subtitle: '소개, 관심사, MBTI를 다듬는 생체 프로필 부스.',
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
    title: 'Midnight Dating Core',
    top: 2860,
    width: 420
  }
];

const veinEdges: Array<[string, string, string, number]> = [
  ['atrium-heart', 'profile-lab', '#cf3535', 8],
  ['atrium-heart', 'signal-lounge', '#a42828', 8],
  ['profile-lab', 'memory-ward', '#8a2020', 9],
  ['signal-lounge', 'resonance-grid', '#8d2d54', 9],
  ['memory-ward', 'deep-core', '#8a2020', 11],
  ['resonance-grid', 'deep-core', '#8d2d54', 11]
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getWorldWidth = (viewportWidth: number) =>
  viewportWidth < 768
    ? MOBILE_WORLD_WIDTH
    : Math.max(viewportWidth, DESKTOP_MIN_WORLD_WIDTH);

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

function drawActor(
  context: CanvasRenderingContext2D,
  actor: ActorState,
  scrollY: number,
  cameraX: number,
  options?: {
    isSelf?: boolean;
    isSelected?: boolean;
  }
) {
  const sprite = spriteSets[actor.preset][actor.dir];
  const palette = paletteMap[actor.palette];
  const { width, height } = getSpriteSize(actor.preset);
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
  context.translate(screenX - width / 2, screenY - height / 2 + bounce);

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
        typeof meta.x === 'number' ? meta.x : (previous?.x ?? worldWidth / 2),
        PLAYER_MARGIN,
        Math.max(PLAYER_MARGIN, worldWidth - PLAYER_MARGIN)
      );
      const nextY = clamp(
        typeof meta.y === 'number' ? meta.y : (previous?.y ?? 520),
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
        speed: 2.25,
        targetX: nextX,
        targetY: nextY,
        vx: previous?.vx ?? 0,
        vy: previous?.vy ?? 0,
        x: previous?.x ?? nextX,
        y: previous?.y ?? nextY
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldLayerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const cellsRef = useRef<CellState[]>([]);
  const remoteActorsRef = useRef<ActorState[]>([]);
  const selectedTargetRef = useRef<SelectedTarget | null>(null);
  const cameraXRef = useRef(0);
  const cameraYRef = useRef(0);
  const worldWidthRef = useRef(DESKTOP_MIN_WORLD_WIDTH);
  const lastPresenceSyncRef = useRef(0);
  const ignoreClickUntilRef = useRef(0);
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
    y: 520
  });

  const [scrollY, setScrollY] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [worldWidth, setWorldWidth] = useState(DESKTOP_MIN_WORLD_WIDTH);
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
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [remoteRevision, setRemoteRevision] = useState(0);
  const [onlineVisitors, setOnlineVisitors] = useState<
    Array<{ id: string; label: string; palette: PaletteKey }>
  >([]);

  const isMobile = viewportWidth < 768;
  const worldActive = scrollY < WORLD_HEIGHT - 96;

  selectedTargetRef.current = selectedTarget;

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
    if (!supabase || !user?.id) return;

    let cancelled = false;
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        broadcast: { self: false },
        presence: { key: user.id }
      }
    });
    presenceChannelRef.current = channel;

    const syncPresenceSnapshot = () => {
      if (cancelled) return;
      const nextActors = buildRemoteActorsFromPresence(
        channel.presenceState() as PresenceStateValue,
        user.id,
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
      await channel.track({
        key: user.id,
        label: player.label,
        x: player.x,
        y: player.y,
        dir: player.dir,
        palette: player.palette,
        preset: player.preset,
        profile: player.profile,
        updatedAt: new Date().toISOString()
      });
    };

    channel
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
  }, [supabase, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    cellsRef.current = createCells();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWorldWidth = getWorldWidth(window.innerWidth);
      worldWidthRef.current = nextWorldWidth;
      setWorldWidth(nextWorldWidth);
      setViewportWidth(window.innerWidth);

      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const player = playerRef.current;
      if (player.x === 0) {
        player.x = Math.min(nextWorldWidth / 2, window.innerWidth / 2 + 80);
      } else {
        player.x = clamp(
          player.x,
          PLAYER_MARGIN,
          Math.max(PLAYER_MARGIN, nextWorldWidth - PLAYER_MARGIN)
        );
      }

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
      if (!channel || !user?.id) return;

      const now = Date.now();
      if (now - lastPresenceSyncRef.current < 240) return;
      lastPresenceSyncRef.current = now;

      const player = playerRef.current;
      void channel
        .track({
          key: user.id,
          label: player.label,
          x: player.x,
          y: player.y,
          dir: player.dir,
          palette: player.palette,
          preset: player.preset,
          profile: player.profile,
          updatedAt: new Date().toISOString()
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

      if (!isMoving) {
        cameraYRef.current = window.scrollY;
      } else {
        let targetY = player.y - window.innerHeight / 2;
        targetY = clamp(targetY, 0, WORLD_HEIGHT - window.innerHeight);
        cameraYRef.current += (targetY - cameraYRef.current) * 0.1;
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
      cameraXRef.current += (horizontalTarget - cameraXRef.current) * 0.14;

      if (worldLayerRef.current) {
        worldLayerRef.current.style.transform = `translate3d(${-cameraXRef.current}px, 0, 0)`;
      }
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

      context.beginPath();
      context.moveTo(from.x, from.y);

      for (let index = -1; index <= 1; index += 1) {
        const cp1x = from.x + dx / 3 + dy * 0.18 * index;
        const cp1y = from.y + dy / 3 - dx * 0.18 * index;
        const cp2x = from.x + (dx * 2) / 3 - dy * 0.18 * index;
        const cp2y = from.y + (dy * 2) / 3 + dx * 0.18 * index;
        context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y);
      }

      context.strokeStyle = color;
      context.lineWidth = currentWidth;
      context.lineCap = 'round';
      context.shadowBlur = 10;
      context.shadowColor = 'rgba(255, 64, 64, 0.28)';
      context.stroke();

      context.strokeStyle = 'rgba(255,255,255,0.28)';
      context.lineWidth = currentWidth * 0.24;
      context.stroke();
      context.shadowBlur = 0;
    };

    let time = 0;

    const animate = () => {
      time += 1;
      updatePlayer();
      updateRemoteActors();
      updateCamera();
      syncPresenceIfNeeded();

      context.fillStyle = 'rgba(248, 249, 250, 0.54)';
      context.fillRect(0, 0, window.innerWidth, window.innerHeight);

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

        context.beginPath();
        context.ellipse(
          screenX,
          screenY,
          rx,
          ry,
          cell.phase + time * 0.01,
          0,
          Math.PI * 2
        );
        context.fillStyle = cell.color;
        context.fill();
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

      const visibleRemoteActors = [...remoteActorsRef.current].sort(
        (left, right) => left.y - right.y
      );

      visibleRemoteActors.forEach((actor) => {
        drawActor(context, actor, window.scrollY, cameraXRef.current, {
          isSelected: selectedId === actor.id
        });
      });

      drawActor(
        context,
        playerRef.current,
        window.scrollY,
        cameraXRef.current,
        {
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
        }
      `}</style>

      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[12] h-full w-full"
        style={{
          filter: 'contrast(1.08) saturate(1.18)',
          opacity: worldActive ? 1 : 0,
          transition: 'opacity 180ms ease'
        }}
      />

      <div
        className="pointer-events-none fixed inset-0 z-[13]"
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0) 50%, rgba(0,0,0,0.03) 50%), linear-gradient(90deg, rgba(255,0,0,0.03), rgba(0,255,0,0.01), rgba(0,0,255,0.03))',
          backgroundSize: '100% 4px, 3px 100%',
          opacity: worldActive ? 0.72 : 0,
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

      <div className="relative h-[3500px] w-full overflow-hidden">
        <div
          ref={worldLayerRef}
          className="relative h-full will-change-transform"
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
          <div className="pointer-events-none absolute left-0 top-[870px] w-full px-4 text-center font-[var(--font-display-kr)] text-[1.4rem] font-black tracking-[0.12em] text-red-100 opacity-30 sm:text-5xl sm:tracking-[0.2em]">
            PROFILE FIELD / SIGNAL WARD / MEMORY DATING CORE
          </div>

          {facilityNodes.map((node) => (
            <article
              key={node.id}
              id={node.id}
              className={`village-facility ${node.bodyClassName}`}
              style={{
                left: node.left,
                top: `${node.top}px`,
                width: node.width ? `${node.width}px` : undefined
              }}
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
        </div>
      </div>

      {selectedActor && worldActive ? (
        <div
          data-avatar-ui="true"
          className="fixed inset-x-3 bottom-3 top-auto z-[70] w-auto overflow-hidden rounded-[1.6rem] border border-[rgba(190,44,44,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,244,255,0.76))] shadow-[0_36px_120px_rgba(107,21,21,0.16)] backdrop-blur-2xl md:inset-x-auto md:bottom-auto md:right-6 md:top-[6.2rem] md:w-[min(30rem,calc(100vw-1.5rem))] md:rounded-[2rem]"
        >
          <div className="border-b border-[rgba(190,44,44,0.12)] px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="village-lab-chip">
                    {selectedTarget?.kind === 'self'
                      ? 'MY PROFILE'
                      : 'PROFILE TAB'}
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
                <h2 className="mt-4 font-[var(--font-display-kr)] text-[1.28rem] font-semibold text-[rgba(69,14,14,0.95)] sm:text-[1.7rem]">
                  {selectedTarget?.kind === 'self'
                    ? selfProfile.name || 'YOU'
                    : selectedActor.label}
                </h2>
                <p className="mt-2 text-sm text-[rgba(100,31,31,0.66)]">
                  {selectedTarget?.kind === 'self'
                    ? selfProfile.tagline
                    : selectedActor.profile.tagline}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTarget(null)}
                className="rounded-full border border-[rgba(188,51,51,0.16)] bg-white/82 px-3 py-2 text-sm text-[rgba(91,17,17,0.88)] transition-colors hover:bg-white"
              >
                닫기
              </button>
            </div>
          </div>

          <div className="max-h-[calc(68dvh-1rem)] overflow-y-auto px-4 pb-4 pt-4 sm:max-h-[calc(100dvh-10rem)] sm:px-6 sm:pb-5 sm:pt-5">
            {selectedTarget?.kind === 'self' ? (
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
              <div className="space-y-5">
                <div className="rounded-[1.5rem] border border-[rgba(188,51,51,0.14)] bg-white/74 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[rgba(120,38,38,0.5)]">
                    note
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[rgba(70,16,16,0.92)]">
                    {selectedActor.profile.bio}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.4rem] border border-[rgba(188,51,51,0.14)] bg-white/74 p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[rgba(120,38,38,0.5)]">
                      interests
                    </p>
                    <p className="mt-3 text-sm text-[rgba(70,16,16,0.92)]">
                      {selectedActor.profile.interests}
                    </p>
                  </div>

                  <div className="rounded-[1.4rem] border border-[rgba(188,51,51,0.14)] bg-white/74 p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[rgba(120,38,38,0.5)]">
                      mbti
                    </p>
                    <p className="mt-3 text-sm text-[rgba(70,16,16,0.92)]">
                      {selectedActor.profile.mbti}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.45rem] border border-[rgba(188,51,51,0.14)] bg-white/72 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[rgba(120,38,38,0.5)]">
                    profile signal
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[rgba(86,22,22,0.74)]">
                    이 프로필은 실시간 presence로 떠 있는 실제 접속자 기록이다.
                    채팅 훅 누르면 랜덤 채팅 모달로 바로 넘어간다.
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
                  className="w-full rounded-[1.45rem] border border-[rgba(188,51,51,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,236,242,0.92))] px-5 py-4 text-left shadow-[0_16px_40px_rgba(125,25,25,0.12)] transition hover:translate-y-[-1px]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[rgba(79,14,14,0.94)]">
                        채팅 걸기 💬
                      </p>
                      <p className="mt-1 text-xs text-[rgba(101,32,32,0.62)]">
                        {selectedActor.label} 기준으로 랜덤 채팅 탭을 띄운다.
                      </p>
                    </div>
                    <div className="rounded-full border border-[rgba(188,51,51,0.16)] bg-[rgba(255,255,255,0.74)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[rgba(120,24,24,0.72)]">
                      hook
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

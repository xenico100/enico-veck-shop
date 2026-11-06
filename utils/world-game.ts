import { worldCameraBasis } from './world-camera';
import {
  seoulLandmarks,
  seoulWaterColliders,
  type WorldCollider,
  type WorldPose
} from './world-layout';

/**
 * Story, objectives and night systems for the /world game.
 * Pure state + events: the component renders and plays them, tests drive them.
 */

export const GAME_SAVE_KEY = 'mongsangin.world.save.v1';
export const GAME_SETTINGS_KEY = 'mongsangin.world.settings.v1';
export const FRAGMENT_TOTAL = 8;
export const CLUE_TOTAL = 3;
export const RIDE_SPEED_MULTIPLIER = 2.15;

export type GamePoint = { x: number; y: number; z: number };
export type ShadowState = 'dormant' | 'roam' | 'hunt' | 'flee' | 'gone';
export type NpcId = 'postman' | 'cat' | 'projectionist';
export type SoundCue =
  | 'pickup'
  | 'fragment'
  | 'paper'
  | 'battery'
  | 'clue'
  | 'blackout'
  | 'power'
  | 'train'
  | 'ring'
  | 'hangup'
  | 'door'
  | 'wake'
  | 'click'
  | 'empty'
  | 'bark'
  | 'growl'
  | 'ending';

export type DialogueLine = { speaker: string; text: string };
export type GameEvent =
  | { type: 'toast'; text: string; tone?: 'info' | 'item' | 'warn' }
  | { type: 'chapter'; index: number; title: string; subtitle: string }
  | { type: 'whisper'; text: string }
  | { type: 'dialogue'; npc: NpcId | 'phone'; lines: DialogueLine[] }
  | { type: 'note'; title: string; text: string }
  | { type: 'sound'; cue: SoundCue }
  | { type: 'shake'; amount: number; duration: number }
  | { type: 'flicker'; target: 'windows' | 'lamps'; duration: number }
  | { type: 'wake'; text: string }
  | { type: 'ending' }
  | { type: 'save' };

export type DogState = {
  x: number;
  z: number;
  yaw: number;
  mode: 'follow' | 'sit' | 'guard' | 'sniff' | 'ride';
  riding?: boolean;
  timer: number;
  trail: { x: number; z: number }[];
  petCooldown: number;
};

export type GameState = {
  version: 1;
  chapter: number;
  collected: string[];
  talked: NpcId[];
  flags: Record<string, boolean>;
  flashlight: { owned: boolean; on: boolean; battery: number };
  breath: number;
  checkpoint: { x: number; z: number; yaw: number };
  shadow: {
    state: ShadowState;
    x: number;
    z: number;
    timer: number;
    exposure: number;
    waypoint: number;
  };
  blackout: number;
  blackoutPending: number;
  phoneRinging: boolean;
  playTime: number;
  wakeCount: number;
  dog: DogState;
};

export const CHAPTERS = [
  { title: '프롤로그 · 눈을 뜨다', subtitle: '자정이 지난 몽상로 · 서울의 밤' },
  { title: '1장 · 꺼지지 않는 가로등', subtitle: '흩어진 꿈 조각을 줍는 밤' },
  { title: '2장 · 반송된 이름들', subtitle: '마을의 그림자들에게 말을 걸 것' },
  { title: '3장 · 첫 문장', subtitle: '모든 조각이 모이면 문이 열린다' },
  { title: '에필로그 · 새벽', subtitle: '몽상인은 잠들지 않는다' }
] as const;

/** Street lamp heads measured from the approved village GLB + expanded Seoul districts. */
export const WORLD_LAMPS = [
  { id: 'lamp-west', x: -19.2, y: 2.55, z: 1.6 },
  { id: 'lamp-crossing', x: -16.8, y: 2.55, z: -1.6 },
  { id: 'lamp-post', x: -7.6, y: 2.55, z: 1.6 },
  { id: 'lamp-plaza', x: 5.2, y: 2.55, z: 1.6 },
  { id: 'lamp-east', x: 16.8, y: 2.55, z: 1.6 },
  { id: 'lamp-viaduct', x: 26, y: 2.55, z: -1.6 },
  // Expanded Seoul avenue lamps
  { id: 'lamp-gwanghwamun', x: 1.2, y: 2.8, z: -58 },
  { id: 'lamp-botanic', x: -64, y: 2.7, z: -2 },
  { id: 'lamp-hongdae', x: -46, y: 2.7, z: 24 },
  { id: 'lamp-namsan', x: 38, y: 2.8, z: 24 },
  { id: 'lamp-seongsu', x: 64, y: 2.7, z: -2 },
  { id: 'lamp-yeouido', x: -24, y: 2.8, z: 36 },
  { id: 'lamp-gangnam', x: 26, y: 2.9, z: 66 },
  { id: 'lamp-jamsil', x: 68, y: 2.9, z: 66 }
] as const;
export const LAMP_SAFE_RADIUS = 2.7;

/** Neon, car and window light sources that also tint nearby surfaces. */
export const WORLD_GLOWS = [
  { x: -13, y: 2.2, z: -2.7, radius: 3.2, color: [1, 0.25, 0.42] },
  { x: -9.1, y: 0.4, z: 1.45, radius: 2.2, color: [1, 0.72, 0.4] },
  { x: 6.3, y: 0.4, z: -1.5, radius: 2.2, color: [1, 0.72, 0.4] },
  { x: 20, y: 4, z: -11.5, radius: 4.5, color: [0.25, 0.9, 0.85] },
  { x: -52, y: 2.4, z: 28, radius: 5.5, color: [1, 0.28, 0.65] },
  { x: 46, y: 6.5, z: 28, radius: 7, color: [0.35, 0.65, 1] },
  { x: 26, y: 4.5, z: 72, radius: 6, color: [0.3, 0.85, 0.95] }
] as const;

/** Footprints missing from the original collider export (north houses, east wall), new props, and Seoul landmarks/river. */
export const GAME_COLLIDERS: readonly WorldCollider[] = [
  // First 6 entries are the north houses (used by WorldExplorer map).
  { x: -21.6, z: -16.79, width: 4.8, depth: 4 },
  { x: -15.6, z: -16.02, width: 4.8, depth: 5.04 },
  { x: -9.2, z: -17.01, width: 4.8, depth: 4 },
  { x: -2.8, z: -17.17, width: 4.8, depth: 4 },
  { x: 4, z: -16.02, width: 4, depth: 4 },
  { x: 10.8, z: -17.82, width: 4, depth: 4 },
  { x: 35.2, z: -8.8, width: 7.68, depth: 0.2 },
  { x: 0.8, z: 3.3, width: 0.26, depth: 0.26 },
  { x: -6.4, z: -2.98, width: 0.28, depth: 0.2 },
  { x: -11.9, z: 3.2, width: 0.16, depth: 0.16 },
  { x: -22.5, z: 2.95, width: 0.56, depth: 0.18 },
  // Street bins and planters baked into the village mesh.
  { x: -14.4, z: -2.8, width: 0.4, depth: 0.4 },
  { x: -4.4, z: -2.48, width: 0.4, depth: 0.4 },
  { x: 8.8, z: -2.48, width: 0.4, depth: 0.4 },
  { x: 11.6, z: 2.8, width: 0.4, depth: 0.4 },
  { x: -8.05, z: -2.52, width: 0.62, depth: 0.32 },
  { x: 9.46, z: -2.52, width: 0.62, depth: 0.32 },
  { x: 14.35, z: 3.04, width: 0.62, depth: 0.32 },
  // Expanded Seoul landmarks & Han River water segments
  ...seoulLandmarks.map((item) => ({
    x: item.x,
    z: item.z,
    width: item.width,
    depth: item.depth
  })),
  ...seoulWaterColliders
];

export const PROPS = {
  payphone: { x: 0.8, z: 3.3, yaw: Math.PI },
  vending: { x: -6.4, z: -2.98, yaw: 0 },
  mailbox: { x: -11.9, z: 3.2, yaw: Math.PI },
  bench: { x: -22.5, z: 2.95, yaw: Math.PI },
  door: { x: 22.8, z: 0, yaw: -Math.PI / 2 }
} as const;

export const FRAGMENTS = [
  { id: 'fragment-1', x: -14.2, z: -0.8, text: '가로등 아래에서 누군가 내 이름을 불렀다.' },
  { id: 'fragment-2', x: -1.6, z: 2.6, text: '편지는 늘 한 박자 늦게 도착했다.' },
  { id: 'fragment-3', x: 13, z: 2.35, text: '옷장 속 옷들은 아직 주인을 기다린다.' },
  { id: 'fragment-4', x: -17.2, z: 13, text: '필름이 끊긴 자리에서 꿈이 시작됐다.' },
  { id: 'fragment-5', x: 6, z: 18.4, text: '기차는 이 마을에 서지 않는다.' },
  { id: 'fragment-6', x: 26, z: 11.5, text: '고양이는 모든 골목의 끝을 알고 있다.' },
  { id: 'fragment-7', x: 35, z: -13.5, text: '나는 매일 밤 같은 길을 처음 걷는다.' },
  {
    id: 'fragment-8',
    x: -3,
    z: -21.6,
    text: '첫 문장은 잃어버린 게 아니라, 아직 쓰지 않은 것이다.'
  }
] as const;

export const CLUES = [
  {
    id: 'clue-stamp',
    npc: 'postman',
    name: '반송된 우표',
    x: 20,
    z: 12.4,
    text: '반송된 우표 — 받는 사람: 나. 보낸 사람: 나.'
  },
  {
    id: 'clue-tag',
    npc: 'cat',
    name: '이름 없는 옷 태그',
    x: -15.6,
    z: -11.6,
    text: '이름 없는 옷 태그 — 사이즈: 꿈. 세탁: 하지 말 것.'
  },
  {
    id: 'clue-film',
    npc: 'projectionist',
    name: '마지막 필름',
    x: 20,
    z: -15.2,
    text: '마지막 필름 — 마지막 장면에는 아무도 없는 거리를 걷는 내가 있었다.'
  }
] as const;

export const BATTERIES = [
  { id: 'battery-1', x: -15.6, z: 10.5 },
  { id: 'battery-2', x: 30.6, z: -2.6 },
  { id: 'battery-3', x: 8, z: 15.6 }
] as const;

export const NOTES = [
  {
    id: 'note-1',
    x: -22.5,
    y: 0.34,
    z: 2.9,
    title: '벤치 위의 쪽지',
    text: '이 마을의 가로등은 꺼지지 않는다. 꺼진다면, 그건 누군가 잠에서 깨어났다는 뜻이다.'
  },
  {
    id: 'note-2',
    x: -2.6,
    y: 1.1,
    z: -3.27,
    title: '잡화점 셔터의 메모',
    text: '주인 없는 옷은 밤마다 조금씩 작아진다. 아무도 입지 않으면, 결국 이름표만 남는다.'
  },
  {
    id: 'note-3',
    x: 6.2,
    y: 1.25,
    z: -3.22,
    title: '극장 상영표',
    text: '상영 시간: 매일 밤 0시. 관객: 0명. 그래도 영사기는 돈다.'
  },
  {
    id: 'note-4',
    x: 18.84,
    y: 1.2,
    z: 2.8,
    title: '교각에 붙은 전단',
    text: '기차는 이 마을에 서지 않는다. 다만 가끔, 멈춘 척을 한다.'
  },
  {
    id: 'note-5',
    x: 5.6,
    y: 1.2,
    z: 3.64,
    title: '작업실 문틈의 종이',
    text: '주소: 몽상로. 직업: 꿈을 걷는 사람. 퇴근: 없음.'
  }
] as const;

export const NPCS = {
  postman: { name: '반송계 그림자', x: -6.9, z: 2.95, yaw: Math.PI },
  cat: { name: '잡화점 고양이', x: -3.7, z: -2.62, yaw: 0.4 },
  projectionist: { name: '영사기사', x: 7.4, z: -2.75, yaw: 0 }
} as const;

/** Loop the shadow follows while roaming: the main street and the south block. */
export const SHADOW_ROUTE = [
  { x: -26, z: 0 },
  { x: -17.2, z: 0.4 },
  { x: -17.2, z: 16 },
  { x: 4, z: 18.4 },
  { x: 26, z: 16 },
  { x: 26, z: 0.4 },
  { x: 12, z: -0.4 },
  { x: -4, z: 0.4 }
] as const;

export const START_POSE: WorldPose = { x: -25, z: 0.3, yaw: Math.PI / 2 - 0.05, pitch: -0.05 };

export type Interactable = {
  id: string;
  kind:
    | 'flashlight'
    | 'fragment'
    | 'clue'
    | 'battery'
    | 'note'
    | 'npc'
    | 'phone'
    | 'vending'
    | 'mailbox'
    | 'dog'
    | 'door';
  label: string;
  verb: string;
  x: number;
  y: number;
  z: number;
  radius: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const finite = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export function createDog(pose: Pick<WorldPose, 'x' | 'z' | 'yaw'>): DogState {
  return {
    x: pose.x - Math.sin(pose.yaw) * 0.65,
    z: pose.z - Math.cos(pose.yaw) * 0.65,
    yaw: pose.yaw,
    mode: 'follow',
    riding: false,
    timer: 2,
    trail: [{ x: pose.x, z: pose.z }],
    petCooldown: 0
  };
}

export function createGameState(): GameState {
  return {
    version: 1,
    chapter: 0,
    collected: [],
    talked: [],
    flags: {},
    flashlight: { owned: false, on: false, battery: 100 },
    breath: 100,
    checkpoint: { x: START_POSE.x, z: START_POSE.z, yaw: START_POSE.yaw },
    shadow: { state: 'dormant', x: 30, z: 0, timer: 0, exposure: 0, waypoint: 5 },
    blackout: 0,
    blackoutPending: 0,
    phoneRinging: false,
    playTime: 0,
    wakeCount: 0,
    dog: createDog(START_POSE)
  };
}

export function toggleRideDog(
  state: GameState,
  pose?: Pick<WorldPose, 'x' | 'z' | 'yaw'>
): GameEvent[] {
  const next = !state.dog.riding;
  state.dog.riding = next;
  if (next) {
    state.dog.mode = 'ride';
    if (pose) {
      state.dog.x = pose.x;
      state.dog.z = pose.z;
      state.dog.yaw = pose.yaw;
      state.dog.trail = [{ x: pose.x, z: pose.z }];
    }
    return [
      { type: 'sound', cue: 'bark' },
      { type: 'toast', text: '벡독에 올라탔다 · 빠르게 달릴 수 있다 (R 내리기)', tone: 'item' }
    ];
  }
  state.dog.mode = 'follow';
  if (pose) {
    state.dog.x = pose.x - Math.sin(pose.yaw) * 0.65;
    state.dog.z = pose.z - Math.cos(pose.yaw) * 0.65;
    state.dog.yaw = pose.yaw;
  }
  return [{ type: 'toast', text: '벡독에서 내렸다.', tone: 'info' }];
}

export const fragmentCount = (state: GameState) =>
  FRAGMENTS.filter((item) => state.collected.includes(item.id)).length;
export const clueCount = (state: GameState) =>
  CLUES.filter((item) => state.collected.includes(item.id)).length;
export const noteCount = (state: GameState) =>
  NOTES.filter((item) => state.collected.includes(item.id)).length;
export const lampsOn = (state: GameState) => state.blackout <= 0;
export const doorOpen = (state: GameState) => state.flags.doorOpen === true;
export const shadowActive = (state: GameState) =>
  state.chapter < 4 &&
  state.shadow.state !== 'dormant' &&
  state.shadow.state !== 'gone';

export function nearestLampDistance(x: number, z: number): number {
  let best = Infinity;
  for (const lamp of WORLD_LAMPS)
    best = Math.min(best, Math.hypot(lamp.x - x, lamp.z - z));
  return best;
}

export function inLampLight(state: GameState, x: number, z: number) {
  return lampsOn(state) && nearestLampDistance(x, z) < LAMP_SAFE_RADIUS;
}

export function objective(state: GameState): { title: string; detail: string } {
  const fragments = fragmentCount(state);
  if (state.chapter >= 4)
    return {
      title: '새벽의 서울과 마을을 자유롭게 산책하기',
      detail: `꿈 조각 ${fragments}/${FRAGMENTS.length} · 쪽지 ${noteCount(state)}/${NOTES.length} · R 벡독 라이딩`
    };
  if (!state.flashlight.owned)
    return {
      title: '서쪽 가로등 아래에서 손전등을 찾기',
      detail: '빛이 있는 곳으로 걸어가거나 R 키로 벡독을 타 보세요'
    };
  if (state.blackout > 0 || state.blackoutPending > 0)
    return { title: '빛을 지키기', detail: '손전등(F)을 그것에게 비추면 물러납니다' };
  if (state.chapter <= 1)
    return {
      title: `흩어진 꿈 조각 모으기 (${Math.min(fragments, 3)}/3)`,
      detail: '푸르게 떠 있는 조각을 찾아 E로 줍기 · R 벡독 타기'
    };
  if (state.chapter === 2) {
    const clues = clueCount(state);
    if (clues >= CLUE_TOTAL)
      return { title: '울리는 공중전화 받기', detail: '주민 센터 옆 공중전화' };
    const pending = CLUES.find(
      (clue) =>
        state.talked.includes(clue.npc as NpcId) &&
        !state.collected.includes(clue.id)
    );
    return {
      title: `첫 문장의 단서 찾기 (${clues}/${CLUE_TOTAL})`,
      detail: pending
        ? `${pending.name}을(를) 찾으러 가기 · 그림자들에게 말 걸기`
        : '우체국, 잡화점, 극장 앞의 그림자들에게 말 걸기'
    };
  }
  if (!doorOpen(state))
    return {
      title: `꿈 조각 모두 모으기 (${fragments}/${FRAGMENTS.length})`,
      detail: '지도(M)에서 아직 가보지 않은 길을 확인하세요 · R 벡독 타기'
    };
  return { title: '철길 너머의 문으로', detail: '고가 철로 아래를 지나 동쪽으로' };
}

export function availableInteractables(state: GameState): Interactable[] {
  const has = (id: string) => state.collected.includes(id);
  const list: Interactable[] = [];
  if (!state.flashlight.owned)
    list.push({
      id: 'flashlight',
      kind: 'flashlight',
      label: '낡은 손전등',
      verb: '줍기',
      x: -19.6,
      y: 0.32,
      z: 2.55,
      radius: 1.3
    });
  for (const item of FRAGMENTS)
    if (!has(item.id))
      list.push({
        id: item.id,
        kind: 'fragment',
        label: '꿈 조각',
        verb: '줍기',
        x: item.x,
        y: 0.75,
        z: item.z,
        radius: 1.25
      });
  for (const clue of CLUES)
    if (state.talked.includes(clue.npc as NpcId) && !has(clue.id))
      list.push({
        id: clue.id,
        kind: 'clue',
        label: clue.name,
        verb: '줍기',
        x: clue.x,
        y: 0.36,
        z: clue.z,
        radius: 1.25
      });
  for (const item of BATTERIES)
    if (!has(item.id))
      list.push({
        id: item.id,
        kind: 'battery',
        label: '건전지',
        verb: '줍기',
        x: item.x,
        y: 0.3,
        z: item.z,
        radius: 1.1
      });
  for (const note of NOTES)
    list.push({
      id: note.id,
      kind: 'note',
      label: note.title,
      verb: has(note.id) ? '다시 읽기' : '읽기',
      x: note.x,
      y: note.y,
      z: note.z,
      radius: 1.25
    });
  for (const [id, npc] of Object.entries(NPCS))
    list.push({
      id,
      kind: 'npc',
      label: npc.name,
      verb: '말 걸기',
      x: npc.x,
      y: 0.9,
      z: npc.z,
      radius: 1.45
    });
  list.push({
    id: 'payphone',
    kind: 'phone',
    label: '공중전화',
    verb: state.phoneRinging ? '전화 받기' : '수화기 들기',
    x: PROPS.payphone.x,
    y: 0.6,
    z: PROPS.payphone.z - 0.3,
    radius: 1.2
  });
  list.push({
    id: 'vending',
    kind: 'vending',
    label: '깜빡이는 자판기',
    verb: '버튼 누르기',
    x: PROPS.vending.x,
    y: 0.5,
    z: PROPS.vending.z + 0.3,
    radius: 1.15
  });
  list.push({
    id: 'mailbox',
    kind: 'mailbox',
    label: '빨간 우체통',
    verb: '귀 기울이기',
    x: PROPS.mailbox.x,
    y: 0.4,
    z: PROPS.mailbox.z - 0.25,
    radius: 1.05
  });
  if (doorOpen(state) && state.chapter < 4)
    list.push({
      id: 'door',
      kind: 'door',
      label: '첫 문장의 문',
      verb: '문 열기',
      x: PROPS.door.x - 0.2,
      y: 1.2,
      z: PROPS.door.z,
      radius: 1.6
    });
  list.push({
    id: 'veckdog',
    kind: 'dog',
    label: '벡독',
    verb: state.dog.riding ? '쓰다듬기' : '쓰다듬기',
    x: state.dog.x,
    y: 0.3,
    z: state.dog.z,
    radius: 1
  });
  return list;
}

/** Nearest interactable in reach, preferring what the camera faces. */
export function findInteractable(
  state: GameState,
  pose: WorldPose
): Interactable | null {
  const { forward } = worldCameraBasis({ yaw: pose.yaw, pitch: 0 });
  let best: Interactable | null = null;
  let companion: Interactable | null = null;
  let bestScore = Infinity;
  for (const item of availableInteractables(state)) {
    const dx = item.x - pose.x;
    const dz = item.z - pose.z;
    const distance = Math.hypot(dx, dz);
    if (distance > item.radius) continue;
    const facing = distance > 0.01 ? (dx * forward[0] + dz * forward[2]) / distance : 1;
    // Petting is a fallback so the companion cannot obscure story interactions.
    if (item.kind === 'dog') {
      if (!state.dog.riding && facing >= 0.45) companion = item;
      continue;
    }
    const score = distance - facing * 0.45;
    if (score < bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best ?? companion;
}

function enterChapter(state: GameState, index: number, events: GameEvent[]) {
  if (state.chapter >= index) return;
  state.chapter = index;
  const chapter = CHAPTERS[index];
  events.push({ type: 'chapter', index, title: chapter.title, subtitle: chapter.subtitle });
  events.push({ type: 'save' });
}

function checkDoor(state: GameState, events: GameEvent[]) {
  if (
    state.chapter === 3 &&
    state.flags.phoneAnswered &&
    fragmentCount(state) >= FRAGMENTS.length &&
    !state.flags.doorOpen
  ) {
    state.flags.doorOpen = true;
    events.push({ type: 'sound', cue: 'door' });
    events.push({ type: 'shake', amount: 0.5, duration: 1.4 });
    events.push({
      type: 'whisper',
      text: '여덟 번째 조각이 맞춰지자, 철길 너머에서 하얀 빛이 새어 나온다.'
    });
    events.push({ type: 'save' });
  }
}

const npcLines: Record<NpcId, { early: string[]; quest: string[]; waiting: string[]; done: string[] }> = {
  postman: {
    early: ['…아직 우편이 오지 않았어. 가로등이 한 번 꺼지고 나면, 그때 와.'],
    quest: [
      '…또 반송이야. 받는 사람이 없대.',
      '이 마을 사람들은 첫 문장을 잃어버린 뒤로, 편지를 끝까지 못 읽어.',
      '반송된 우표 하나가 바람에 날려 철길 아래로 갔어. 남쪽 끝, 기둥 사이.',
      '찾으면 그건 네 거야. 어차피 아무도 받지 않으니까.'
    ],
    waiting: ['철길 아래, 남쪽 기둥 사이야. 바람이 그쪽으로만 불거든.'],
    done: ['그 우표, 원래 네 편지에 붙어 있던 거야. 몰랐지?']
  },
  cat: {
    early: ['냐.', '(고양이가 당신을 빤히 쳐다보다가 하품을 한다.)'],
    quest: [
      '냐.',
      '(목걸이 대신 낡은 실밥이 매달려 있다.)',
      '…이름표를 찾는 거라면 북쪽 집들 앞마당이야.',
      '주인 없는 옷은 이름부터 잃어버리거든. 서두르는 게 좋아.'
    ],
    waiting: ['북쪽 집들 앞마당. 냐.'],
    done: ['(고양이가 만족스럽게 꼬리를 감는다.)']
  },
  projectionist: {
    early: ['상영은 0시에 시작해. 아직은… 너무 밝아.'],
    quest: [
      '상영은 0시에 시작해. 관객은 늘 없었지만.',
      '마지막 필름이 사라졌어. 그게 없으면 이 꿈은 끝나지 않아.',
      '멈춘 기차 아래를 봐. 그 기차는 한 번도 출발한 적이 없어.'
    ],
    waiting: ['고가 철로의 멈춘 기차, 그 바로 아래야.'],
    done: ['돌려줘서 고마워. 하지만 마지막 장면은… 네가 직접 걸어서 봐야 해.']
  }
};

function talk(state: GameState, npc: NpcId, events: GameEvent[]) {
  const name = NPCS[npc].name;
  const clue = CLUES.find((item) => item.npc === npc)!;
  let lines: string[];
  if (state.chapter < 2) lines = npcLines[npc].early;
  else if (state.collected.includes(clue.id)) lines = npcLines[npc].done;
  else if (state.talked.includes(npc)) lines = npcLines[npc].waiting;
  else {
    lines = npcLines[npc].quest;
    state.talked.push(npc);
    events.push({ type: 'toast', text: `새로운 단서 · ${clue.name}`, tone: 'item' });
    events.push({ type: 'save' });
  }
  events.push({
    type: 'dialogue',
    npc,
    lines: lines.map((text) => ({ speaker: name, text }))
  });
}

export function interact(state: GameState, id: string): GameEvent[] {
  const events: GameEvent[] = [];
  if (id === 'veckdog-ride') return toggleRideDog(state);
  const target = availableInteractables(state).find((item) => item.id === id);
  if (!target) return events;
  switch (target.kind) {
    case 'dog':
      if (state.dog.petCooldown <= 0) {
        state.breath = Math.min(100, state.breath + 25);
        state.dog.petCooldown = 40;
        events.push({ type: 'sound', cue: 'bark' });
        events.push({ type: 'toast', text: '벡독의 따뜻한 털. 숨이 조금 편해졌다.', tone: 'info' });
      } else events.push({ type: 'toast', text: '벡독이 손바닥에 코를 기댄다.', tone: 'info' });
      break;
    case 'flashlight':
      state.flashlight = { owned: true, on: true, battery: 100 };
      events.push({ type: 'sound', cue: 'pickup' });
      events.push({ type: 'toast', text: '손전등을 주웠다 · F 키로 켜고 끄기', tone: 'item' });
      enterChapter(state, 1, events);
      break;
    case 'fragment': {
      state.collected.push(target.id);
      const fragment = FRAGMENTS.find((item) => item.id === target.id)!;
      events.push({ type: 'sound', cue: 'fragment' });
      events.push({ type: 'whisper', text: fragment.text });
      events.push({
        type: 'toast',
        text: `꿈 조각 ${fragmentCount(state)}/${FRAGMENTS.length}`,
        tone: 'item'
      });
      state.breath = Math.min(100, state.breath + 25);
      events.push({ type: 'save' });
      checkDoor(state, events);
      break;
    }
    case 'clue': {
      state.collected.push(target.id);
      const clue = CLUES.find((item) => item.id === target.id)!;
      events.push({ type: 'sound', cue: 'clue' });
      events.push({ type: 'whisper', text: clue.text });
      events.push({
        type: 'toast',
        text: `첫 문장의 단서 ${clueCount(state)}/${CLUE_TOTAL} · ${clue.name}`,
        tone: 'item'
      });
      if (clue.id === 'clue-film') {
        events.push({ type: 'sound', cue: 'train' });
        events.push({ type: 'shake', amount: 0.8, duration: 3.2 });
        events.push({ type: 'flicker', target: 'windows', duration: 3.6 });
      }
      if (clueCount(state) >= CLUE_TOTAL && !state.flags.phoneAnswered) {
        state.phoneRinging = true;
        events.push({ type: 'sound', cue: 'ring' });
        events.push({
          type: 'toast',
          text: '어디선가 공중전화가 울린다… (주민 센터 옆)',
          tone: 'warn'
        });
      }
      events.push({ type: 'save' });
      break;
    }
    case 'battery':
      state.collected.push(target.id);
      state.flashlight.battery = Math.min(100, state.flashlight.battery + 45);
      events.push({ type: 'sound', cue: 'battery' });
      events.push({ type: 'toast', text: '건전지를 끼웠다 · 손전등 +45%', tone: 'item' });
      events.push({ type: 'save' });
      break;
    case 'note': {
      const note = NOTES.find((item) => item.id === target.id)!;
      if (!state.collected.includes(note.id)) {
        state.collected.push(note.id);
        events.push({ type: 'save' });
      }
      events.push({ type: 'sound', cue: 'paper' });
      events.push({ type: 'note', title: note.title, text: note.text });
      break;
    }
    case 'npc':
      talk(state, target.id as NpcId, events);
      break;
    case 'phone':
      if (state.phoneRinging) {
        state.phoneRinging = false;
        state.flags.phoneAnswered = true;
        events.push({ type: 'sound', cue: 'hangup' });
        events.push({
          type: 'dialogue',
          npc: 'phone',
          lines: [
            { speaker: '수화기 너머', text: '……여보세요?' },
            { speaker: '수화기 너머', text: '단서는 다 모였구나. 이제 남은 건 조각들뿐이야.' },
            {
              speaker: '수화기 너머',
              text: '꿈 조각 여덟 개가 모이면, 철길 너머에 문이 하나 열릴 거야.'
            },
            {
              speaker: '수화기 너머',
              text: '그 문 앞에서 첫 문장을 써. 아직 기억나지 않아도 괜찮아.'
            },
            { speaker: '', text: '(뚝. 신호음만 남았다.)' }
          ]
        });
        enterChapter(state, 3, events);
        checkDoor(state, events);
      } else {
        events.push({ type: 'sound', cue: 'click' });
        events.push({
          type: 'note',
          title: '공중전화',
          text: '수화기에서 아주 먼 곳의 빗소리가 들린다. 동전 투입구는 녹슬어 막혀 있다.'
        });
      }
      break;
    case 'vending':
      if (!state.flags.vending) {
        state.flags.vending = true;
        state.flashlight.battery = Math.min(100, state.flashlight.battery + 45);
        events.push({ type: 'sound', cue: 'battery' });
        events.push({
          type: 'toast',
          text: '덜컹. 자판기에서 건전지가 떨어졌다 · +45%',
          tone: 'item'
        });
        events.push({ type: 'save' });
      } else {
        events.push({ type: 'sound', cue: 'empty' });
        events.push({ type: 'toast', text: '모든 버튼에 빨간 품절 불이 들어와 있다.' });
      }
      break;
    case 'mailbox':
      events.push({ type: 'sound', cue: 'paper' });
      events.push({
        type: 'note',
        title: '빨간 우체통',
        text:
          state.chapter >= 2
            ? '안에서 누군가 편지를 다시 쓰는 소리가 난다. 받는 사람 칸만 계속 지워진다.'
            : '안에서 종이 넘기는 소리가 난다. 투입구는 안쪽에서 잠겨 있다.'
      });
      break;
    case 'door':
      state.flags.ending = true;
      state.flags.endingSeen = true;
      state.phoneRinging = false;
      state.shadow.state = 'gone';
      state.blackout = 0;
      events.push({ type: 'sound', cue: 'ending' });
      events.push({ type: 'ending' });
      enterChapter(state, 4, events);
      break;
  }
  return events;
}

function startBlackout(state: GameState, pose: WorldPose, events: GameEvent[]) {
  state.flags.blackoutDone = true;
  state.blackout = 24;
  const behind = (pose.x > 0 ? -1 : 1) * 11;
  state.shadow = {
    state: 'hunt',
    x: clamp(pose.x - behind, -28, 34),
    z: clamp(pose.z, -1.4, 1.4),
    timer: 0,
    exposure: 0,
    waypoint: 0
  };
  events.push({ type: 'sound', cue: 'blackout' });
  events.push({ type: 'shake', amount: 0.35, duration: 0.8 });
  events.push({ type: 'toast', text: '정전이다. …무언가 다가온다.', tone: 'warn' });
  events.push({
    type: 'whisper',
    text: '가로등이 꺼진 거리에서, 그림자 하나가 몸을 일으켰다.'
  });
}

function nearestRouteIndex(x: number, z: number, far = false): number {
  let best = 0;
  let score = far ? -Infinity : Infinity;
  SHADOW_ROUTE.forEach((point, index) => {
    const distance = Math.hypot(point.x - x, point.z - z);
    if (far ? distance > score : distance < score) {
      score = distance;
      best = index;
    }
  });
  return best;
}

function moveShadow(
  state: GameState,
  targetX: number,
  targetZ: number,
  speed: number,
  dt: number,
  away = false
) {
  const shadow = state.shadow;
  let dx = targetX - shadow.x;
  let dz = targetZ - shadow.z;
  const distance = Math.hypot(dx, dz) || 1;
  if (away) {
    dx = -dx;
    dz = -dz;
  }
  const step = Math.min(speed * dt, away ? speed * dt : distance);
  let nextX = shadow.x + (dx / distance) * step;
  let nextZ = shadow.z + (dz / distance) * step;
  // Lit lamps are a hard boundary for the shadow.
  if (lampsOn(state)) {
    for (const lamp of WORLD_LAMPS) {
      const lx = nextX - lamp.x;
      const lz = nextZ - lamp.z;
      const reach = Math.hypot(lx, lz);
      if (reach < LAMP_SAFE_RADIUS + 0.4) {
        const push = (LAMP_SAFE_RADIUS + 0.4) / (reach || 1);
        nextX = lamp.x + lx * push;
        nextZ = lamp.z + lz * push;
      }
    }
  }
  shadow.x = clamp(nextX, -92, 92);
  shadow.z = clamp(nextZ, -80, 80);
}

/** Flashlight cone test from the eye toward the shadow's chest. */
export function flashlightHits(
  pose: WorldPose,
  point: { x: number; y: number; z: number },
  range = 8.5
): boolean {
  const { forward } = worldCameraBasis(pose);
  const dx = point.x - pose.x;
  const dy = point.y - 0.66;
  const dz = point.z - pose.z;
  const distance = Math.hypot(dx, dy, dz);
  if (distance > range || distance < 0.05) return false;
  return (dx * forward[0] + dy * forward[1] + dz * forward[2]) / distance > 0.93;
}

export type StepInput = { pose: WorldPose; dt: number };

/** Follows the actual walked polyline, never a straight line through a house. */
export function stepDog(state: GameState, pose: WorldPose, dt: number): GameEvent[] {
  const dog = state.dog;
  const events: GameEvent[] = [];
  dog.petCooldown = Math.max(0, dog.petCooldown - dt);
  dog.timer = Math.max(0, dog.timer - dt);
  if (dog.riding) {
    dog.x = pose.x;
    dog.z = pose.z;
    dog.yaw = pose.yaw;
    dog.mode = 'ride';
    dog.trail = [{ x: pose.x, z: pose.z }];
    return events;
  }
  const end = dog.trail[dog.trail.length - 1];
  // Wake/checkpoint travel is a discontinuity, not a walked segment through walls.
  if (end && Math.hypot(end.x - pose.x, end.z - pose.z) > 2) {
    dog.x = pose.x; dog.z = pose.z; dog.trail = [];
  }
  if (!end || Math.hypot(end.x - pose.x, end.z - pose.z) > 0.08)
    dog.trail.push({ x: pose.x, z: pose.z });
  if (Math.hypot(dog.x - pose.x, dog.z - pose.z) > 7) {
    const safe = dog.trail.length > 6 ? dog.trail[dog.trail.length - 6] : pose;
    dog.x = safe.x; dog.z = safe.z;
    dog.trail = dog.trail.length > 6 ? dog.trail.slice(-5) : [{ x: pose.x, z: pose.z }];
  }
  if (dog.trail.length > 256) {
    dog.trail = dog.trail.slice(-256);
    // Rejoin a known walked point before discarding history; never cut to it through a wall.
    dog.x = dog.trail[0].x; dog.z = dog.trail[0].z;
  }
  const threat = shadowActive(state) && Math.hypot(dog.x - state.shadow.x, dog.z - state.shadow.z) < 3.2;
  if (threat) {
    dog.yaw = Math.atan2(state.shadow.x - dog.x, state.shadow.z - dog.z);
    dog.mode = 'guard';
    if (dog.timer <= 0) { events.push({ type: 'sound', cue: 'growl' }); dog.timer = 8; }
    return events;
  }
  let remaining = 0;
  let point: { x: number; z: number } = dog;
  for (const next of dog.trail) {
    remaining += Math.hypot(next.x - point.x, next.z - point.z);
    point = next;
  }
  let budget = Math.min(dt * 2.8, Math.max(0, remaining - 0.8));
  const moved = budget > 0.005;
  while (budget > 0.0001 && dog.trail.length) {
    const next = dog.trail[0];
    const dx = next.x - dog.x, dz = next.z - dog.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.015) { dog.trail.shift(); continue; }
    dog.yaw = Math.atan2(dx, dz);
    const step = Math.min(budget, distance);
    dog.x += dx / distance * step; dog.z += dz / distance * step;
    budget -= step;
    if (step >= distance) dog.trail.shift();
  }
  dog.mode = moved ? 'follow' : 'sit';
  if (!moved && state.chapter >= 1 && state.chapter < 4) {
    const nearest = FRAGMENTS.filter(item => !state.collected.includes(item.id))
      .sort((a, b) => Math.hypot(a.x - dog.x, a.z - dog.z) - Math.hypot(b.x - dog.x, b.z - dog.z))[0];
    if (nearest && Math.hypot(nearest.x - dog.x, nearest.z - dog.z) < 8) {
      dog.mode = 'sniff';
      dog.yaw = Math.atan2(nearest.x - dog.x, nearest.z - dog.z);
      if (dog.timer <= 0) { events.push({ type: 'sound', cue: 'bark' }); dog.timer = 12; }
    }
  }
  return events;
}

export function stepGame(state: GameState, input: StepInput): GameEvent[] {
  const events: GameEvent[] = [];
  const dt = clamp(finite(input.dt, 0), 0, 0.1);
  const { pose } = input;
  events.push(...stepDog(state, pose, dt));
  state.playTime += dt;
  if (state.chapter >= 4) {
    state.breath = Math.min(100, state.breath + dt * 10);
    return events;
  }

  if (state.chapter === 1 && fragmentCount(state) >= 3 && !state.flags.blackoutDone) {
    if (state.blackoutPending <= 0) state.blackoutPending = 1.6;
    state.blackoutPending -= dt;
    if (state.blackoutPending <= 0) {
      state.blackoutPending = 0;
      startBlackout(state, pose, events);
    }
  }
  if (state.blackout > 0) {
    state.blackout -= dt;
    if (state.blackout <= 0) {
      state.blackout = 0;
      events.push({ type: 'sound', cue: 'power' });
      events.push({ type: 'flicker', target: 'lamps', duration: 1.4 });
      events.push({
        type: 'toast',
        text: '전기가 돌아왔다. 하지만 그것은 아직 마을에 있다.',
        tone: 'warn'
      });
      enterChapter(state, 2, events);
    }
  }

  const safe = inLampLight(state, pose.x, pose.z);
  if (safe) state.checkpoint = { x: pose.x, z: pose.z, yaw: pose.yaw };

  const light = state.flashlight;
  if (light.on && light.owned) {
    light.battery = Math.max(0, light.battery - dt * 0.9);
    if (light.battery <= 0) {
      light.on = false;
      events.push({ type: 'sound', cue: 'empty' });
      events.push({ type: 'toast', text: '손전등 배터리가 다 됐다. 가로등 아래에서 충전된다.', tone: 'warn' });
    }
  }
  if (safe && light.owned) light.battery = Math.min(100, light.battery + dt * 2.2);

  // The shadow: roams, hunts players outside lamp light, flees the flashlight.
  const shadow = state.shadow;
  let proximity = 0;
  if (shadow.state === 'gone') {
    shadow.timer -= dt;
    if (shadow.timer <= 0 && state.flags.blackoutDone) {
      const index = nearestRouteIndex(pose.x, pose.z, true);
      const spawn = SHADOW_ROUTE[index];
      shadow.state = 'roam';
      shadow.x = spawn.x;
      shadow.z = spawn.z;
      shadow.waypoint = (index + 1) % SHADOW_ROUTE.length;
      shadow.exposure = 0;
    }
  } else if (shadow.state !== 'dormant') {
    const distance = Math.hypot(pose.x - shadow.x, pose.z - shadow.z);
    const lit =
      light.on &&
      light.battery > 0 &&
      flashlightHits(pose, { x: shadow.x, y: 0.95, z: shadow.z });
    if (lit) {
      shadow.state = 'flee';
      shadow.exposure += dt;
      shadow.timer = 1.4;
      moveShadow(state, pose.x, pose.z, 1.9, dt, true);
      if (shadow.exposure >= 1.7) {
        shadow.state = 'gone';
        shadow.timer = state.blackout > 0 ? 7 : 22;
        events.push({ type: 'toast', text: '그림자가 빛 속에서 흩어졌다.', tone: 'info' });
      }
    } else if (shadow.state === 'flee') {
      shadow.timer -= dt;
      shadow.exposure = Math.max(0, shadow.exposure - dt * 0.4);
      moveShadow(state, pose.x, pose.z, 1.2, dt, true);
      if (shadow.timer <= 0) {
        shadow.state = 'roam';
        shadow.waypoint = nearestRouteIndex(shadow.x, shadow.z);
      }
    } else if (distance < (state.blackout > 0 ? 18 : 8.5) && !safe) {
      shadow.state = 'hunt';
      moveShadow(state, pose.x, pose.z, state.blackout > 0 ? 1.25 : 1.05, dt);
    } else {
      shadow.state = 'roam';
      const target = SHADOW_ROUTE[shadow.waypoint % SHADOW_ROUTE.length];
      moveShadow(state, target.x, target.z, 0.75, dt);
      if (Math.hypot(target.x - shadow.x, target.z - shadow.z) < 0.6)
        shadow.waypoint = (shadow.waypoint + 1) % SHADOW_ROUTE.length;
    }
    if (shadow.state === 'hunt' || shadow.state === 'roam')
      proximity = clamp(1 - Math.hypot(pose.x - shadow.x, pose.z - shadow.z) / 4.5, 0, 1);
  }

  if (proximity > 0) state.breath -= dt * 15 * Math.pow(proximity, 1.4);
  else if (safe) state.breath += dt * 7;
  else state.breath += dt * 1.2;
  state.breath = clamp(state.breath, 0, 100);

  if (state.breath <= 0) {
    state.wakeCount += 1;
    state.breath = 70;
    shadow.state = 'gone';
    shadow.timer = 16;
    events.push({ type: 'sound', cue: 'wake' });
    events.push({
      type: 'wake',
      text: state.wakeCount > 1 ? '…또 꿈 밖으로 밀려날 뻔했다.' : '…꿈 밖으로 밀려날 뻔했다.'
    });
    events.push({ type: 'save' });
  }
  return events;
}

/** Proximity of an active shadow, 0..1, for vignette, warp and heartbeat. */
export function shadowProximity(state: GameState, pose: Pick<WorldPose, 'x' | 'z'>) {
  if (!shadowActive(state)) return 0;
  return clamp(1 - Math.hypot(pose.x - state.shadow.x, pose.z - state.shadow.z) / 9, 0, 1);
}

export function toggleFlashlight(state: GameState): GameEvent[] {
  if (!state.flashlight.owned) return [];
  if (!state.flashlight.on && state.flashlight.battery <= 0)
    return [
      { type: 'sound', cue: 'empty' },
      { type: 'toast', text: '배터리가 없다. 가로등 아래에서 기다리거나 건전지를 찾자.', tone: 'warn' }
    ];
  state.flashlight.on = !state.flashlight.on;
  return [{ type: 'sound', cue: 'click' }];
}

/** Respawn point after waking; nudged to the road beside the remembered lamp. */
export function wakePose(state: GameState): WorldPose {
  return { x: state.checkpoint.x, z: state.checkpoint.z, yaw: state.checkpoint.yaw, pitch: -0.05 };
}

const KNOWN_IDS = new Set<string>([
  ...FRAGMENTS.map((item) => item.id),
  ...CLUES.map((item) => item.id),
  ...BATTERIES.map((item) => item.id),
  ...NOTES.map((item) => item.id)
]);

export function serializeGame(state: GameState, pose: WorldPose): string {
  const { dog: _transientDog, ...saved } = state;
  return JSON.stringify({
    ...saved,
    pose: { x: pose.x, z: pose.z, yaw: pose.yaw, pitch: pose.pitch },
    savedAt: Date.now()
  });
}

/** Strict, tolerant reader for localStorage saves; invalid saves return null. */
export function parseGameSave(
  raw: unknown
): { state: GameState; pose: WorldPose; savedAt: number } | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.version !== 1) return null;
  const state = createGameState();
  state.chapter = clamp(Math.round(finite(data.chapter, 0)), 0, 4);
  state.collected = Array.isArray(data.collected)
    ? Array.from(new Set(data.collected.filter((id): id is string => typeof id === 'string' && KNOWN_IDS.has(id))))
    : [];
  state.talked = Array.isArray(data.talked)
    ? Array.from(new Set(data.talked.filter((id): id is NpcId => id === 'postman' || id === 'cat' || id === 'projectionist')))
    : [];
  if (data.flags && typeof data.flags === 'object')
    for (const key of ['blackoutDone', 'phoneAnswered', 'doorOpen', 'vending', 'ending', 'endingSeen'])
      if ((data.flags as Record<string, unknown>)[key] === true) state.flags[key] = true;
  const flashlight = (data.flashlight ?? {}) as Record<string, unknown>;
  state.flashlight = {
    owned: flashlight.owned === true || state.chapter >= 1,
    on: flashlight.on === true,
    battery: clamp(finite(flashlight.battery, 100), 0, 100)
  };
  if (state.chapter === 0 && state.flashlight.owned) state.chapter = 1;
  state.breath = clamp(finite(data.breath, 100), 25, 100);
  state.playTime = Math.max(0, finite(data.playTime, 0));
  state.wakeCount = Math.max(0, Math.round(finite(data.wakeCount, 0)));
  state.phoneRinging =
    state.chapter === 2 && clueCount(state) >= CLUE_TOTAL && !state.flags.phoneAnswered;
  // A save made mid-blackout resumes after it; the shadow returns shortly.
  if (state.flags.blackoutDone) {
    if (state.chapter < 2) state.chapter = 2;
    state.shadow = { state: 'gone', x: 30, z: 0, timer: 8, exposure: 0, waypoint: 5 };
  }
  if (state.chapter >= 4) state.shadow.state = 'gone';
  const pose = (data.pose ?? {}) as Record<string, unknown>;
  const checkpoint = (data.checkpoint ?? {}) as Record<string, unknown>;
  const rawCpX = finite(checkpoint.x, START_POSE.x);
  const rawCpZ = finite(checkpoint.z, START_POSE.z);
  state.checkpoint = {
    x: rawCpX > 96 ? 42 : rawCpX < -96 ? -34 : clamp(rawCpX, -94, 94),
    z: rawCpZ > 84 ? 26 : rawCpZ < -84 ? -28 : clamp(rawCpZ, -82, 82),
    yaw: finite(checkpoint.yaw, START_POSE.yaw)
  };
  const rawPoseX = finite(pose.x, state.checkpoint.x);
  const rawPoseZ = finite(pose.z, state.checkpoint.z);
  const restoredPose = {
    x: rawPoseX > 96 ? 42 : rawPoseX < -96 ? -34 : clamp(rawPoseX, -94, 94),
    z: rawPoseZ > 84 ? 26 : rawPoseZ < -84 ? -28 : clamp(rawPoseZ, -82, 82),
    yaw: finite(pose.yaw, START_POSE.yaw),
    pitch: clamp(finite(pose.pitch, 0), -0.65, 0.5)
  };
  state.dog = createDog(restoredPose);
  state.dog.x = restoredPose.x;
  state.dog.z = restoredPose.z;
  return {
    state,
    pose: restoredPose,
    savedAt: finite(data.savedAt, 0)
  };
}

export type WorldSettings = {
  camera: 'third' | 'first';
  pixel: 'psx' | 'crisp' | 'sharp';
  jitter: boolean;
  dither: boolean;
  wobble: boolean;
  volume: number;
  sensitivity: number;
  invertY: boolean;
};

export const defaultWorldSettings: WorldSettings = {
  camera: 'third',
  pixel: 'psx',
  jitter: true,
  dither: true,
  wobble: true,
  volume: 0.7,
  sensitivity: 1,
  invertY: false
};

export function parseWorldSettings(raw: unknown): WorldSettings {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return { ...defaultWorldSettings };
    }
  }
  if (!value || typeof value !== 'object') return { ...defaultWorldSettings };
  const data = value as Record<string, unknown>;
  return {
    camera: data.camera === 'first' ? 'first' : 'third',
    pixel: data.pixel === 'crisp' || data.pixel === 'sharp' ? data.pixel : 'psx',
    jitter: data.jitter !== false,
    dither: data.dither !== false,
    wobble: data.wobble !== false,
    volume: clamp(finite(data.volume, defaultWorldSettings.volume), 0, 1),
    sensitivity: clamp(finite(data.sensitivity, 1), 0.3, 2.5),
    invertY: data.invertY === true
  };
}

/** Internal render height per pixel mode (CSS upscales with nearest filtering). */
export const PIXEL_HEIGHT: Record<WorldSettings['pixel'], number> = {
  psx: 240,
  crisp: 360,
  sharp: 720
};

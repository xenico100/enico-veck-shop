import { villageBuildings } from './village-buildings';
import type { VillageBuildingId } from './village-buildings';

/** Destination metadata shared by the proxy and approved-asset scenes. */
export type WorldBuilding = {
  id: string;
  name: string;
  caption: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  color: string;
  villageId?: VillageBuildingId;
  private?: boolean;
};

export type SeoulLandmark = {
  id: string;
  name: string;
  district: string;
  caption: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  color: string;
  mesh: string;
};

export const WORLD_BOUNDS = {
  minX: -96,
  maxX: 96,
  minZ: -84,
  maxZ: 84
} as const;
export const PLAYER_RADIUS = 0.36;
export const WORLD_MOVE_SPEED = 4.8;

const footprints: Record<
  VillageBuildingId,
  { x: number; z: number; width: number; depth: number }
> = {
  community: { x: -8.8, z: 6.4, width: 5.2, depth: 5.2 },
  goods: { x: -5.2, z: -5.6, width: 4, depth: 4.4 },
  studio: { x: 7.6, z: -5.6, width: 4.4, depth: 4.4 },
  profile: { x: -2.4, z: 6.4, width: 5.2, depth: 5.2 },
  dating: { x: 0.8, z: -5.6, width: 5.6, depth: 4.4 },
  about: { x: 13.2, z: -6.8, width: 4, depth: 6.8 }
};

/** Core village roads (preserved for existing layout & tests). */
export const worldRoads = [
  { x: 1.2, z: 0, width: 64, depth: 4 },
  { x: -17.2, z: 8.8, width: 3.2, depth: 21.6 },
  { x: 4.4, z: 18.4, width: 46.4, depth: 3.2 },
  { x: 26, z: 9.2, width: 3.2, depth: 21.6 },
  { x: 32, z: -6.8, width: 3.2, depth: 14.4 }
] as const;

/** Expanded Seoul arterial roads connecting Gangseo/Magok, Gwanghwamun, Hongdae, Namsan, Seongsu, Hangang & Gangnam. */
export const seoulRoads = [
  // Sejong-daero & Gwanghwamun avenue (north)
  { x: 1.2, z: -46, width: 7.2, depth: 52, label: '세종대로 · 광화문광장' },
  { x: 1.2, z: -68, width: 32, depth: 12, label: '광화문광장' },
  // Gangseo-ro & Magok Botanic Park avenue (west)
  { x: -62, z: 0, width: 64, depth: 4.4, label: '강서로 · 마곡동로' },
  { x: -68, z: -2, width: 4.2, depth: 52, label: '서울식물원 산책로' },
  // Hongdae Eoulmadang-ro (southwest)
  { x: -46, z: 24, width: 48, depth: 4.2, label: '홍대 어울마당로' },
  // Namsan Sowol-ro & N Seoul Tower trail (southeast hill)
  { x: 42, z: 24, width: 28, depth: 4, label: '남산 소월로' },
  // Seongsu Yeonmujang-gil (east)
  { x: 64, z: 0, width: 62, depth: 4.4, label: '성수 연무장길' },
  { x: 68, z: -8, width: 4.2, depth: 48, label: '성수 아틀리에 거리' },
  // Yeouido Hangang Park promenade (north bank of Hangang)
  { x: 0, z: 36, width: 176, depth: 4.2, label: '여의도 · 한강변 산책로' },
  // Gangnam Teheran-ro & Olympic-ro (south of Hangang)
  { x: 0, z: 66, width: 172, depth: 5.6, label: '강남 테헤란로' },
  { x: -56, z: 62, width: 4.8, depth: 28, label: '양화 · 당산 연결로' },
  { x: -17.2, z: 44, width: 4.8, depth: 52, label: '마포대교 · 여의대로' },
  { x: 26, z: 44, width: 4.8, depth: 52, label: '한강대교 · 강남대로' },
  { x: 68, z: 44, width: 4.8, depth: 52, label: '성수대교 · 영동대로' }
] as const;

/** Four Hangang bridges crossing the river belt (z: 41..55). */
export const seoulBridges = [
  { id: 'bridge-yanghwa', name: '양화대교', x: -56, z: 48, width: 6.4, depth: 15.5 },
  { id: 'bridge-mapo', name: '마포대교', x: -17.2, z: 48, width: 6.8, depth: 15.5 },
  { id: 'bridge-hangang', name: '한강대교', x: 26, z: 48, width: 6.8, depth: 15.5 },
  { id: 'bridge-seongsu', name: '성수대교', x: 68, z: 48, width: 6.4, depth: 15.5 }
] as const;

/** River water segments between the four Hangang bridges so players cross via bridges. */
export const seoulWaterColliders: readonly { x: number; z: number; width: number; depth: number }[] = [
  { x: -77.6, z: 48, width: 35.6, depth: 12.4 },
  { x: -36.6, z: 48, width: 30.8, depth: 12.4 },
  { x: 4.4, z: 48, width: 35.2, depth: 12.4 },
  { x: 47, z: 48, width: 34.4, depth: 12.4 },
  { x: 83.8, z: 48, width: 24, depth: 12.4 }
];

export const seoulLandmarks: readonly SeoulLandmark[] = [
  {
    id: 'seoul-gwanghwamun',
    name: '광화문 · 경복궁',
    district: '종로구 세종대로',
    caption: '서울 중심 광장과 성문 · 북쪽 대로 끝',
    x: 1.2,
    z: -74,
    width: 11,
    depth: 4.6,
    color: '#8b6f56',
    mesh: 'seoul.gwanghwamun'
  },
  {
    id: 'seoul-botanic',
    name: '서울식물원 · 화곡 아틀리에',
    district: '강서구 마곡 · 화곡',
    caption: '유리 온실 돔과 호수원 · 몽상인 본거지 서쪽 끝',
    x: -78,
    z: -14,
    width: 9.2,
    depth: 9.2,
    color: '#4b8f78',
    mesh: 'seoul.botanicDome'
  },
  {
    id: 'seoul-hongdae',
    name: '홍대 어울마당로',
    district: '마포구 서교동',
    caption: '밤의 버스킹 스테이지와 네온 골목',
    x: -52,
    z: 28.5,
    width: 6.4,
    depth: 4.2,
    color: '#c94a6a',
    mesh: 'seoul.hongdaeStage'
  },
  {
    id: 'seoul-namsan',
    name: '남산 N서울타워',
    district: '용산구 남산공원길',
    caption: '서울 밤하늘을 비추는 남산 정상 전파탑',
    x: 46,
    z: 28,
    width: 6.4,
    depth: 6.4,
    color: '#5a86b8',
    mesh: 'seoul.namsanTower'
  },
  {
    id: 'seoul-seongsu',
    name: '성수동 연무장길 스튜디오',
    district: '성동구 성수동',
    caption: '붉은 벽돌 창고형 쇼룸과 공방 거리',
    x: 76,
    z: -14,
    width: 7.6,
    depth: 5.4,
    color: '#a85244',
    mesh: 'seoul.seongsuBrick'
  },
  {
    id: 'seoul-yeouido',
    name: '여의도 한강공원 · 서울달',
    district: '영등포구 여의동로',
    caption: '한강 물빛광장과 밤하늘에 떠오른 계류기구',
    x: -30,
    z: 38.5,
    width: 4.2,
    depth: 4.2,
    color: '#d9b45b',
    mesh: 'seoul.seoulDal'
  },
  {
    id: 'seoul-gangnam',
    name: '강남역 · 테헤란로 타워',
    district: '강남구 테헤란로',
    caption: '한강대교 남단 미디어폴과 초고층 빌딩 숲',
    x: 26,
    z: 74,
    width: 8.4,
    depth: 5.6,
    color: '#4a76a8',
    mesh: 'seoul.gangnamTowers'
  },
  {
    id: 'seoul-jamsil',
    name: '잠실 스카이라인 타워',
    district: '송파구 올림픽로',
    caption: '서울 남동쪽 끝을 지키는 123층 수직 타워',
    x: 76,
    z: 74,
    width: 6.8,
    depth: 6.8,
    color: '#7a8ec4',
    mesh: 'seoul.lotteTower'
  }
] as const;

export function resolveSeoulDistrictName(x: number, z: number): string {
  for (const bridge of seoulBridges) {
    if (
      Math.abs(x - bridge.x) <= bridge.width / 2 + 1.2 &&
      Math.abs(z - bridge.z) <= bridge.depth / 2 + 1.2
    ) {
      return `${bridge.name} (한강)`;
    }
  }
  if (z >= 56) {
    if (x >= 52) return '송파 잠실 · 올림픽로';
    if (x >= 4) return '강남역 · 테헤란로';
    return '영등포 · 당산 남단';
  }
  if (z >= 33) return '여의도 한강공원 · 물빛광장';
  if (z <= -32) return '종로 광화문광장 · 세종대로';
  if (x <= -38) {
    if (z >= 16) return '마포 홍대 어울마당로';
    return '강서 화곡 · 마곡 서울식물원';
  }
  if (x >= 40) {
    if (z >= 16) return '용산 남산공원 · N서울타워';
    return '성동 성수동 연무장길';
  }
  if (z > 16 && x < -20) return '마포 홍대 입구';
  if (z > 16 && x > 22) return '남산 소월로 입구';
  if (Math.abs(z) < 2.4) return '몽상로 (서울 중심 마을)';
  if (z > 8) return '몽상로 남쪽 골목';
  if (z < -10) return '몽상로 북쪽 주택가';
  return '몽상로 뒷길';
}

export const worldBuildings: readonly WorldBuilding[] = [
  ...villageBuildings.map((building) => ({
    id: building.id,
    villageId: building.id,
    name: building.name,
    caption: building.caption,
    ...footprints[building.id],
    color: building.color
  })),
  {
    id: 'dot',
    name: 'dot 작업실',
    caption: '소유자 전용 · 샘플 현황',
    x: 4.4,
    z: 6.4,
    width: 6,
    depth: 5.2,
    color: '#bd9864',
    private: true
  }
];

export type WorldPose = { x: number; z: number; yaw: number; pitch: number };
export type WorldInput = { forward: number; right: number };
export const initialWorldPose: WorldPose = { x: 0, z: 0, yaw: 0, pitch: -0.07 };

export type WorldCollider = {
  x: number;
  z: number;
  width: number;
  depth: number;
};

// These pillars are also drawn by the renderer. Small decorative meshes are not obstacles.
export const plazaPillars: readonly WorldCollider[] = [
  { x: -2.4, z: -13.2, width: 0.55, depth: 0.65 },
  { x: 4.2, z: -13.2, width: 0.55, depth: 0.65 }
];
export const proxyHome: WorldCollider = {
  x: -11.2,
  z: -5.6,
  width: 5.2,
  depth: 4.4
};
const defaultColliders: readonly WorldCollider[] = [
  ...worldBuildings,
  ...plazaPillars,
  proxyHome
];
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const finite = (value: number, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;

export type WorldMovementOptions = {
  colliders?: readonly WorldCollider[];
  radius?: number;
  speedScale?: number;
};

export function worldPositionIsWalkable(
  x: number,
  z: number,
  options: WorldMovementOptions = {}
): boolean {
  const radius = clamp(
    finite(options.radius ?? PLAYER_RADIUS, PLAYER_RADIUS),
    0.04,
    1
  );
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (
    x < WORLD_BOUNDS.minX + radius ||
    x > WORLD_BOUNDS.maxX - radius ||
    z < WORLD_BOUNDS.minZ + radius ||
    z > WORLD_BOUNDS.maxZ - radius
  )
    return false;
  return !(options.colliders ?? defaultColliders).some((box) => {
    const nearestX = clamp(x, box.x - box.width / 2, box.x + box.width / 2);
    const nearestZ = clamp(z, box.z - box.depth / 2, box.z + box.depth / 2);
    return (x - nearestX) ** 2 + (z - nearestZ) ** 2 < radius ** 2 - 1e-8;
  });
}

/** Yaw zero faces +z. Input from keyboard and touch is normalized together. */
export function stepWorldMovement(
  pose: WorldPose,
  input: WorldInput,
  dt: number,
  options: WorldMovementOptions = {}
): WorldPose {
  const radius = clamp(
    finite(options.radius ?? PLAYER_RADIUS, PLAYER_RADIUS),
    0.04,
    1
  );
  const yaw = finite(pose.yaw);
  let x = finite(pose.x, initialWorldPose.x);
  let z = finite(pose.z, initialWorldPose.z);
  const pitch = clamp(finite(pose.pitch), -1.1, 1.1);
  const forward = finite(input.forward);
  const right = finite(input.right);
  const length = Math.max(1, Math.hypot(forward, right));
  // A resumed/background tab never makes the player jump across the scene.
  const distance =
    WORLD_MOVE_SPEED *
    clamp(finite(options.speedScale ?? 1, 1), 0, 3.5) *
    clamp(finite(dt), 0, 0.05);
  const dx =
    (Math.sin(yaw) * (forward / length) - Math.cos(yaw) * (right / length)) *
    distance;
  const dz =
    (Math.cos(yaw) * (forward / length) + Math.sin(yaw) * (right / length)) *
    distance;
  // Circle-vs-AABB checks in small substeps prevent tunneling and slide along walls.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (radius / 3)));
  for (let i = 0; i < steps; i++) {
    const nextX = clamp(
      x + dx / steps,
      WORLD_BOUNDS.minX + radius,
      WORLD_BOUNDS.maxX - radius
    );
    if (worldPositionIsWalkable(nextX, z, options)) x = nextX;
    const nextZ = clamp(
      z + dz / steps,
      WORLD_BOUNDS.minZ + radius,
      WORLD_BOUNDS.maxZ - radius
    );
    if (worldPositionIsWalkable(x, nextZ, options)) z = nextZ;
  }
  return { x, z, yaw, pitch };
}

export function findNearbyBuilding(
  pose: Pick<WorldPose, 'x' | 'z'>,
  maxDistance = 3.4
): WorldBuilding | undefined {
  let nearest: WorldBuilding | undefined;
  let distance = Math.max(0, maxDistance);
  for (const building of worldBuildings) {
    const dx = Math.max(Math.abs(pose.x - building.x) - building.width / 2, 0);
    const dz = Math.max(Math.abs(pose.z - building.z) - building.depth / 2, 0);
    const candidate = Math.hypot(dx, dz);
    if (candidate <= distance) {
      nearest = building;
      distance = candidate;
    }
  }
  return nearest;
}

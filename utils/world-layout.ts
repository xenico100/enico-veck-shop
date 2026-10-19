import { villageBuildings } from './village-buildings';
import type { VillageBuildingId } from './village-buildings';

/** Temporary, hand-built collision scene. This is NOT the approved Blender village. */
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

export const WORLD_BOUNDS = {
  minX: -36,
  maxX: 40,
  minZ: -20,
  maxZ: 27
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

/** Proxy dimensions follow the source street network at reduced scale. */
export const worldRoads = [
  { x: 1.2, z: 0, width: 64, depth: 4 },
  { x: -17.2, z: 8.8, width: 3.2, depth: 21.6 },
  { x: 4.4, z: 18.4, width: 46.4, depth: 3.2 },
  { x: 26, z: 9.2, width: 3.2, depth: 21.6 },
  { x: 32, z: -6.8, width: 3.2, depth: 14.4 }
] as const;

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
const colliders: readonly WorldCollider[] = [
  ...worldBuildings,
  ...plazaPillars,
  proxyHome
];
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const finite = (value: number, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;

export function worldPositionIsWalkable(x: number, z: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (
    x < WORLD_BOUNDS.minX + PLAYER_RADIUS ||
    x > WORLD_BOUNDS.maxX - PLAYER_RADIUS ||
    z < WORLD_BOUNDS.minZ + PLAYER_RADIUS ||
    z > WORLD_BOUNDS.maxZ - PLAYER_RADIUS
  )
    return false;
  return !colliders.some((box) => {
    const nearestX = clamp(x, box.x - box.width / 2, box.x + box.width / 2);
    const nearestZ = clamp(z, box.z - box.depth / 2, box.z + box.depth / 2);
    return (
      (x - nearestX) ** 2 + (z - nearestZ) ** 2 < PLAYER_RADIUS ** 2 - 1e-8
    );
  });
}

/** Yaw zero faces +z. Input from keyboard and touch is normalized together. */
export function stepWorldMovement(
  pose: WorldPose,
  input: WorldInput,
  dt: number
): WorldPose {
  const yaw = finite(pose.yaw);
  let x = finite(pose.x, initialWorldPose.x);
  let z = finite(pose.z, initialWorldPose.z);
  const pitch = clamp(finite(pose.pitch), -1.1, 1.1);
  const forward = finite(input.forward);
  const right = finite(input.right);
  const length = Math.max(1, Math.hypot(forward, right));
  // A resumed/background tab never makes the player jump across the scene.
  const distance = WORLD_MOVE_SPEED * clamp(finite(dt), 0, 0.05);
  const dx =
    (Math.sin(yaw) * (forward / length) + Math.cos(yaw) * (right / length)) *
    distance;
  const dz =
    (Math.cos(yaw) * (forward / length) - Math.sin(yaw) * (right / length)) *
    distance;
  // Circle-vs-AABB checks in small substeps prevent tunneling and slide along walls.
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(dx, dz) / (PLAYER_RADIUS / 3))
  );
  for (let i = 0; i < steps; i++) {
    const nextX = clamp(
      x + dx / steps,
      WORLD_BOUNDS.minX + PLAYER_RADIUS,
      WORLD_BOUNDS.maxX - PLAYER_RADIUS
    );
    if (worldPositionIsWalkable(nextX, z)) x = nextX;
    const nextZ = clamp(
      z + dz / steps,
      WORLD_BOUNDS.minZ + PLAYER_RADIUS,
      WORLD_BOUNDS.maxZ - PLAYER_RADIUS
    );
    if (worldPositionIsWalkable(x, nextZ)) z = nextZ;
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

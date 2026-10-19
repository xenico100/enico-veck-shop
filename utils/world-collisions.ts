import { WORLD_BOUNDS, type WorldCollider } from './world-layout';

export type WorldCollisionMap = {
  version: 1;
  scale: 0.4;
  colliders: WorldCollider[];
  characterAnchor: { x: number; y: number; z: number } | null;
};

/** Small exported walking proxies, independent of visual GLB mesh detail. */
export function parseWorldCollisionMap(value: unknown): WorldCollisionMap {
  if (!value || typeof value !== 'object')
    throw new Error('충돌 지도를 확인하지 못했습니다.');
  const map = value as Record<string, unknown>;
  if (
    map.version !== 1 ||
    map.scale !== 0.4 ||
    !Array.isArray(map.colliders) ||
    !map.colliders.length ||
    map.colliders.length > 256
  )
    throw new Error('지원하지 않는 충돌 지도입니다.');
  const colliders = map.colliders.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object')
      throw new Error('잘못된 충돌체입니다.');
    const box = entry as Record<string, unknown>;
    const { x, z, width, depth } = box;
    if (
      ![x, z, width, depth].every(
        (n) => typeof n === 'number' && Number.isFinite(n)
      ) ||
      (width as number) <= 0 ||
      (depth as number) <= 0 ||
      (width as number) > 100 ||
      (depth as number) > 100 ||
      Math.abs(x as number) > 100 ||
      Math.abs(z as number) > 100
    )
      throw new Error('충돌체 범위가 올바르지 않습니다.');
    return { x, z, width, depth } as WorldCollider;
  });
  let characterAnchor: WorldCollisionMap['characterAnchor'] = null;
  if (map.characterAnchor && typeof map.characterAnchor === 'object') {
    const p = map.characterAnchor as Record<string, unknown>;
    if (
      [p.x, p.y, p.z].every(
        (n) => typeof n === 'number' && Number.isFinite(n)
      ) &&
      (p.x as number) >= WORLD_BOUNDS.minX &&
      (p.x as number) <= WORLD_BOUNDS.maxX &&
      (p.z as number) >= WORLD_BOUNDS.minZ &&
      (p.z as number) <= WORLD_BOUNDS.maxZ
    )
      characterAnchor = { x: p.x, y: p.y, z: p.z } as {
        x: number;
        y: number;
        z: number;
      };
  }
  return { version: 1, scale: 0.4, colliders, characterAnchor };
}

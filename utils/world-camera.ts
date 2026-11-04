import type { WorldCollider, WorldPose } from './world-layout';

export type WorldCameraVector = [number, number, number];
export type WorldCameraBasis = {
  right: WorldCameraVector;
  up: WorldCameraVector;
  forward: WorldCameraVector;
};

/** Y-up camera facing +Z at yaw zero; [right, up, -forward] is right-handed. */
export function worldCameraBasis(
  pose: Pick<WorldPose, 'yaw' | 'pitch'>
): WorldCameraBasis {
  const sy = Math.sin(pose.yaw),
    cy = Math.cos(pose.yaw);
  const sp = Math.sin(pose.pitch),
    cp = Math.cos(pose.pitch);
  return {
    right: [-cy, 0, sy],
    up: [-sy * sp, cp, -cy * sp],
    forward: [sy * cp, sp, cy * cp]
  };
}

export type WorldFollowCamera = { pose: WorldPose; eyeY: number; opacity: number };

/** Rendering-only camera. Player collision, targeting and save coordinates stay unchanged. */
export function resolveWorldCamera(
  player: WorldPose,
  colliders: readonly WorldCollider[] = [],
  mode: 'third' | 'first' = 'third',
  bob = 0
): WorldFollowCamera {
  if (mode === 'first') return { pose: { ...player }, eyeY: 0.66 + bob, opacity: 0 };
  const pitch = Math.max(-0.85, Math.min(0.35, player.pitch - 0.18));
  const basis = worldCameraBasis({ yaw: player.yaw, pitch });
  const dx = -basis.forward[0] * 1.25 + basis.right[0] * 0.18;
  const dz = -basis.forward[2] * 1.25 + basis.right[2] * 0.18;
  let fraction = 1;
  for (const box of colliders) {
    let enter = 0, exit = 1;
    const axes: [number, number, number, number][] = [
      [player.x, dx, box.x - box.width / 2 - 0.075, box.x + box.width / 2 + 0.075],
      [player.z, dz, box.z - box.depth / 2 - 0.075, box.z + box.depth / 2 + 0.075]
    ];
    let hit = true;
    for (const [origin, delta, min, max] of axes) {
      if (Math.abs(delta) < 1e-8) { if (origin < min || origin > max) hit = false; }
      else {
        const a = (min - origin) / delta, b = (max - origin) / delta;
        enter = Math.max(enter, Math.min(a, b));
        exit = Math.min(exit, Math.max(a, b));
        if (enter > exit) hit = false;
      }
    }
    if (hit && exit >= 0 && enter <= 1) fraction = Math.min(fraction, Math.max(0, enter - 0.055));
  }
  const distance = Math.hypot(dx, dz) * fraction;
  return {
    pose: { x: player.x + dx * fraction, z: player.z + dz * fraction, yaw: player.yaw, pitch },
    eyeY: 0.62 - basis.forward[1] * 1.25 * fraction + bob * 0.25,
    opacity: Math.max(0, Math.min(1, (distance - 0.18) / 0.3))
  };
}

import type { WorldPose } from './world-layout';

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

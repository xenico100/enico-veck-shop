import type { WorldPose } from './world-layout';

/** Controller signals only. No approved character rig or animation clip is loaded. */
export type WorldAnimationState =
  | 'idle'
  | 'starting'
  | 'walking'
  | 'stopping'
  | 'turning';
export type WorldAnimationSample = {
  state: WorldAnimationState;
  /** Actual horizontal displacement in world units per second. */
  speed: number;
  /** Signed shortest yaw change in radians per second. */
  turnRate: number;
  /** Seconds elapsed in this state; resets when the state changes. */
  stateTime: number;
  source: 'controller-only';
};

export const initialWorldAnimation: WorldAnimationSample = {
  state: 'idle',
  speed: 0,
  turnRate: 0,
  stateTime: 0,
  source: 'controller-only'
};

const START_SECONDS = 0.12;
const STOP_SECONDS = 0.16;
const MOVE_THRESHOLD = 0.08;
const TURN_THRESHOLD = 0.35;
const TAU = Math.PI * 2;

function yawDelta(previous: number, next: number): number {
  if (!Number.isFinite(previous) || !Number.isFinite(next)) return 0;
  // Reduce each value first, so even large finite yaw values cannot overflow.
  let angle = ((next % TAU) - (previous % TAU)) % TAU;
  if (angle > Math.PI) angle -= TAU;
  if (angle < -Math.PI) angle += TAU;
  return angle;
}

/**
 * Replaceable locomotion state for a future approved rig/clip adapter.
 * Uses actual movement after collision, so pressing against a wall stays idle.
 * Pitch is camera look and does not count as character turning.
 */
export function stepWorldAnimation(
  previousPose: WorldPose,
  nextPose: WorldPose,
  previousAnimation: WorldAnimationSample,
  dt: number,
  paused = false
): WorldAnimationSample {
  if (paused) return { ...initialWorldAnimation };
  // Invalid/zero time freezes the state without manufacturing motion rates.
  if (!Number.isFinite(dt) || dt <= 0) {
    return {
      ...previousAnimation,
      speed: 0,
      turnRate: 0,
      source: 'controller-only'
    };
  }

  const displacement = Math.hypot(
    nextPose.x - previousPose.x,
    nextPose.z - previousPose.z
  );
  const measuredSpeed = displacement / dt;
  const measuredTurnRate = yawDelta(previousPose.yaw, nextPose.yaw) / dt;
  const speed = Number.isFinite(measuredSpeed) ? measuredSpeed : 0;
  const turnRate = Number.isFinite(measuredTurnRate) ? measuredTurnRate : 0;
  const moving = speed > MOVE_THRESHOLD;
  const turning = Math.abs(turnRate) > TURN_THRESHOLD;
  const elapsed =
    Math.max(
      0,
      Number.isFinite(previousAnimation.stateTime)
        ? previousAnimation.stateTime
        : 0
    ) + dt;
  let state: WorldAnimationState;

  if (moving) {
    if (previousAnimation.state === 'walking') state = 'walking';
    else if (previousAnimation.state === 'starting') {
      state = elapsed + 1e-8 >= START_SECONDS ? 'walking' : 'starting';
    } else state = 'starting';
  } else if (
    previousAnimation.state === 'walking' ||
    previousAnimation.state === 'starting'
  ) {
    state = 'stopping';
  } else if (
    previousAnimation.state === 'stopping' &&
    elapsed + 1e-8 < STOP_SECONDS
  ) {
    state = 'stopping';
  } else state = turning ? 'turning' : 'idle';

  return {
    state,
    speed,
    turnRate,
    stateTime: state === previousAnimation.state ? elapsed : 0,
    source: 'controller-only'
  };
}

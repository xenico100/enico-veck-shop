import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initialWorldAnimation,
  stepWorldAnimation
} from '../utils/world-animation.ts';

const spawn = { x: 0, z: 0, yaw: 0, pitch: -0.07 };
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≠ ${expected}`);
const movingPose = (pose, dt = 0.04) => ({ ...pose, z: pose.z + 4.8 * dt });

test('movement starts briefly before walking and exposes measured speed', () => {
  let pose = { ...spawn };
  let next = movingPose(pose);
  let sample = stepWorldAnimation(pose, next, initialWorldAnimation, 0.04);
  assert.equal(sample.state, 'starting');
  assert.equal(sample.stateTime, 0);
  assert.equal(sample.source, 'controller-only');
  near(sample.speed, 4.8);
  for (let i = 0; i < 3; i++) {
    pose = next;
    next = movingPose(pose);
    sample = stepWorldAnimation(pose, next, sample, 0.04);
    assert.equal(sample.state, i < 2 ? 'starting' : 'walking');
  }
  assert.equal(sample.stateTime, 0);
  const walking = stepWorldAnimation(next, movingPose(next), sample, 0.04);
  assert.equal(walking.state, 'walking');
  near(walking.stateTime, 0.04);
});

test('stopping is held for 0.16 seconds and settles to idle', () => {
  let sample = stepWorldAnimation(
    spawn,
    spawn,
    { ...initialWorldAnimation, state: 'walking' },
    0.04
  );
  assert.equal(sample.state, 'stopping');
  for (let i = 0; i < 4; i++) {
    sample = stepWorldAnimation(spawn, spawn, sample, 0.04);
    assert.equal(sample.state, i < 3 ? 'stopping' : 'idle');
  }
  assert.equal(sample.speed, 0);
  assert.equal(sample.turnRate, 0);
});

test('resuming movement interrupts a stop and starts a new transition', () => {
  const stopping = {
    ...initialWorldAnimation,
    state: 'stopping',
    stateTime: 0.08
  };
  const sample = stepWorldAnimation(spawn, movingPose(spawn), stopping, 0.04);
  assert.equal(sample.state, 'starting');
  assert.equal(sample.stateTime, 0);
});

test('pause immediately clears movement states and resumes through starting', () => {
  for (const state of ['starting', 'walking', 'stopping', 'turning']) {
    const paused = stepWorldAnimation(
      spawn,
      movingPose(spawn),
      {
        ...initialWorldAnimation,
        state,
        speed: 4.8,
        turnRate: 1,
        stateTime: 0.06
      },
      0.04,
      true
    );
    assert.deepEqual(paused, initialWorldAnimation);
    assert.equal(
      stepWorldAnimation(spawn, movingPose(spawn), paused, 0.04).state,
      'starting'
    );
  }
});

test('turning uses shortest yaw difference across the angle wrap in both directions', () => {
  const a = { ...spawn, yaw: Math.PI - 0.02 };
  const b = { ...spawn, yaw: -Math.PI + 0.02 };
  const right = stepWorldAnimation(a, b, initialWorldAnimation, 0.04);
  const left = stepWorldAnimation(b, a, initialWorldAnimation, 0.04);
  assert.equal(right.state, 'turning');
  assert.equal(left.state, 'turning');
  near(right.turnRate, 1);
  near(left.turnRate, -1);
  const accumulated = stepWorldAnimation(
    { ...spawn, yaw: -Math.PI * 6 + 0.02 },
    { ...spawn, yaw: Math.PI * 6 - 0.02 },
    initialWorldAnimation,
    0.04
  );
  near(accumulated.turnRate, -1);
  assert.equal(right.speed, 0);
  assert.equal(stepWorldAnimation(b, b, right, 0.04).state, 'idle');
});

test('movement takes precedence over camera yaw and pitch alone does not animate', () => {
  const moving = stepWorldAnimation(
    spawn,
    { ...movingPose(spawn), yaw: 0.2 },
    initialWorldAnimation,
    0.04
  );
  assert.equal(moving.state, 'starting');
  assert.ok(moving.turnRate > 0);
  const lookUp = stepWorldAnimation(
    spawn,
    { ...spawn, pitch: 0.7 },
    initialWorldAnimation,
    0.04
  );
  assert.equal(lookUp.state, 'idle');
  assert.equal(lookUp.turnRate, 0);
  // No displacement after collision means no walking, regardless of intended input.
  assert.equal(
    stepWorldAnimation(spawn, spawn, initialWorldAnimation, 0.04).state,
    'idle'
  );
});

test('invalid time freezes transitions and malformed poses never produce nonfinite rates', () => {
  const sample = {
    ...initialWorldAnimation,
    state: 'starting',
    stateTime: 0.04
  };
  for (const dt of [0, -1, NaN, Infinity]) {
    const frozen = stepWorldAnimation(spawn, movingPose(spawn), sample, dt);
    assert.equal(frozen.state, sample.state);
    assert.equal(frozen.stateTime, sample.stateTime);
    assert.equal(frozen.speed, 0);
    assert.equal(frozen.turnRate, 0);
  }
  const invalid = stepWorldAnimation(
    spawn,
    { ...spawn, x: NaN, yaw: Infinity },
    initialWorldAnimation,
    0.04
  );
  assert.equal(invalid.state, 'idle');
  assert.equal(invalid.speed, 0);
  assert.equal(invalid.turnRate, 0);
  const tinyTime = stepWorldAnimation(
    spawn,
    { ...movingPose(spawn), yaw: 1 },
    initialWorldAnimation,
    Number.MIN_VALUE
  );
  assert.ok(Number.isFinite(tinyTime.speed));
  assert.ok(Number.isFinite(tinyTime.turnRate));
});

test('animation sampling leaves pose and previous state immutable', () => {
  const before = Object.freeze({ ...spawn });
  const after = Object.freeze(movingPose(spawn));
  const prior = Object.freeze({ ...initialWorldAnimation });
  stepWorldAnimation(before, after, prior, 0.04);
  assert.deepEqual(before, spawn);
  assert.deepEqual(prior, initialWorldAnimation);
});

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Node strips TypeScript, while Next resolves extensionless source imports.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './village-buildings' || specifier === './world-layout') {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  }
});
after(() => hooks.deregister());
const {
  worldBuildings,
  worldRoads,
  WORLD_BOUNDS,
  PLAYER_RADIUS,
  WORLD_MOVE_SPEED,
  initialWorldPose,
  stepWorldMovement,
  findNearbyBuilding,
  worldPositionIsWalkable
} = await import('../utils/world-layout.ts');
const { villageBuildings } = await import('../utils/village-buildings.ts');

const near = (actual, expected, epsilon = 1e-7) =>
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≠ ${expected}`);
const walk = (pose, input, count = 90, dt = 1 / 30) => {
  for (let i = 0; i < count; i++) pose = stepWorldMovement(pose, input, dt);
  return pose;
};

test('proxy preserves six existing building destinations plus a private dot destination', () => {
  assert.deepEqual(
    worldBuildings.filter((b) => b.villageId).map((b) => b.villageId),
    villageBuildings.map((b) => b.id)
  );
  assert.equal(new Set(worldBuildings.map((b) => b.id)).size, 7);
  assert.equal(worldBuildings.find((b) => b.id === 'dot').private, true);
  assert.equal(worldRoads.length, 5);
  assert.equal(worldRoads[0].width, 64);
  assert.equal(worldRoads[2].z, 18.4);
  assert.ok(worldPositionIsWalkable(initialWorldPose.x, initialWorldPose.z));
  for (const b of worldBuildings)
    assert.equal(worldPositionIsWalkable(b.x, b.z), false);
});

test('keyboard and touch use the same normalized camera-relative movement', () => {
  const straight = stepWorldMovement(
    initialWorldPose,
    { forward: 1, right: 0 },
    1 / 30
  );
  const diagonal = stepWorldMovement(
    initialWorldPose,
    { forward: 1, right: 1 },
    1 / 30
  );
  const combined = stepWorldMovement(
    initialWorldPose,
    { forward: 2, right: 2 },
    1 / 30
  );
  near(straight.x, 0);
  near(straight.z, WORLD_MOVE_SPEED / 30);
  near(Math.hypot(diagonal.x, diagonal.z), Math.hypot(straight.x, straight.z));
  near(combined.x, diagonal.x);
  near(combined.z, diagonal.z);
  const turned = stepWorldMovement(
    { ...initialWorldPose, yaw: Math.PI / 2 },
    { forward: 1, right: 0 },
    1 / 30
  );
  near(turned.x, WORLD_MOVE_SPEED / 30);
  near(turned.z, 0);
});

test('analog touch magnitude below one changes speed without accelerating diagonals', () => {
  const pose = stepWorldMovement(
    initialWorldPose,
    { forward: 0.4, right: 0.3 },
    1 / 30
  );
  near(Math.hypot(pose.x, pose.z), WORLD_MOVE_SPEED / 60);
  const reverse = stepWorldMovement(
    initialWorldPose,
    { forward: -1, right: -1 },
    1 / 30
  );
  assert.ok(reverse.x < 0 && reverse.z < 0);
});

test('background-tab delta and malformed input cannot teleport the player', () => {
  for (const dt of [1, 60, 10_000]) {
    const next = stepWorldMovement(
      initialWorldPose,
      { forward: 1, right: 1 },
      dt
    );
    near(Math.hypot(next.x, next.z), WORLD_MOVE_SPEED * 0.05);
  }
  for (const dt of [-1, NaN, Infinity]) {
    assert.deepEqual(
      stepWorldMovement(initialWorldPose, { forward: 1, right: 1 }, dt),
      initialWorldPose
    );
  }
  assert.deepEqual(
    stepWorldMovement(
      initialWorldPose,
      { forward: Infinity, right: NaN },
      0.03
    ),
    initialWorldPose
  );
});

test('a circular player stops before building walls, including the private workshop', () => {
  for (const id of ['profile', 'dot', 'community']) {
    const b = worldBuildings.find((building) => building.id === id);
    const before = b.z - b.depth / 2 - PLAYER_RADIUS;
    const pose = walk(
      { ...initialWorldPose, x: b.x, z: 1.5 },
      { forward: 1, right: 0 },
      100,
      5
    );
    assert.ok(pose.z <= before + 1e-7);
    assert.ok(pose.z >= before - 0.13);
    assert.ok(worldPositionIsWalkable(pose.x, pose.z));
  }
});

test('substepped movement slides along a facade instead of freezing both axes', () => {
  const start = { ...initialWorldPose, x: -4, z: 3.43 };
  const pose = walk(start, { forward: 1, right: 1 }, 12);
  assert.ok(pose.x > start.x + 1);
  assert.ok(pose.z <= 3.44 + 1e-7);
  assert.ok(worldPositionIsWalkable(pose.x, pose.z));
});

test('circle-vs-box collision leaves round-corner clearance', () => {
  const b = worldBuildings.find((building) => building.id === 'dot');
  const cornerX = b.x - b.width / 2;
  const cornerZ = b.z - b.depth / 2;
  assert.equal(worldPositionIsWalkable(cornerX - 0.3, cornerZ - 0.3), true);
  assert.equal(worldPositionIsWalkable(cornerX - 0.2, cornerZ - 0.2), false);
  assert.equal(worldPositionIsWalkable(cornerX - PLAYER_RADIUS, b.z), true);
});

test('every world edge stops the player with radius clearance', () => {
  const cases = [
    {
      x: WORLD_BOUNDS.maxX - 1,
      z: 0,
      input: { right: 1, forward: 0 },
      key: 'x',
      expected: WORLD_BOUNDS.maxX - PLAYER_RADIUS
    },
    {
      x: WORLD_BOUNDS.minX + 1,
      z: 0,
      input: { right: -1, forward: 0 },
      key: 'x',
      expected: WORLD_BOUNDS.minX + PLAYER_RADIUS
    },
    {
      x: 0,
      z: WORLD_BOUNDS.maxZ - 1,
      input: { right: 0, forward: 1 },
      key: 'z',
      expected: WORLD_BOUNDS.maxZ - PLAYER_RADIUS
    },
    {
      x: 0,
      z: WORLD_BOUNDS.minZ + 1,
      input: { right: 0, forward: -1 },
      key: 'z',
      expected: WORLD_BOUNDS.minZ + PLAYER_RADIUS
    }
  ];
  for (const c of cases) {
    const pose = walk({ ...initialWorldPose, x: c.x, z: c.z }, c.input);
    near(pose[c.key], c.expected);
    assert.ok(worldPositionIsWalkable(pose.x, pose.z));
  }
});

test('building proximity uses reachable facade distance and the closest destination', () => {
  for (const b of worldBuildings) {
    const towardRoad = b.z < 0 ? 1 : -1;
    const pose = { x: b.x, z: b.z + towardRoad * (b.depth / 2 + 0.6) };
    assert.equal(findNearbyBuilding(pose)?.id, b.id);
    assert.equal(findNearbyBuilding(pose, 0.2), undefined);
  }
  assert.equal(findNearbyBuilding({ x: 38, z: 25 }), undefined);
});

test('movement never mutates pose or shared spawn constants', () => {
  const pose = Object.freeze({ ...initialWorldPose });
  const input = Object.freeze({ forward: 1, right: 1 });
  stepWorldMovement(pose, input, 1 / 30);
  assert.deepEqual(pose, initialWorldPose);
});

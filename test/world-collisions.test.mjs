import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import test, { after } from 'node:test';
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './world-layout' || specifier === './village-buildings')
      return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  }
});
after(() => hooks.deregister());
const { parseWorldCollisionMap } = await import('../utils/world-collisions.ts');
const {
  worldBuildings,
  worldPositionIsWalkable,
  stepWorldMovement,
  initialWorldPose
} = await import('../utils/world-layout.ts');

test('collision map rejects invalid ranges and strips non-runtime metadata', () => {
  const box = { x: 0, z: 1, width: 1, depth: 1 };
  for (const value of [
    null,
    {},
    { version: 1, scale: 1, colliders: [box] },
    { version: 1, scale: 0.4, colliders: [] },
    { version: 1, scale: 0.4, colliders: [{ ...box, x: Infinity }] },
    { version: 1, scale: 0.4, colliders: [{ ...box, width: -1 }] }
  ])
    assert.throws(() => parseWorldCollisionMap(value));
  const parsed = parseWorldCollisionMap({
    version: 1,
    scale: 0.4,
    colliders: [{ ...box, source: 'ignored' }],
    privateManifest: 'ignored',
    characterAnchor: { x: NaN, y: 0, z: 0 }
  });
  assert.deepEqual(parsed.colliders, [box]);
  assert.equal(parsed.characterAnchor, null);
  assert.equal(JSON.stringify(parsed).includes('ignored'), false);
});

test('source collision and human scale apply per explorer without mutating proxy policy', () => {
  const pose = { ...initialWorldPose, x: 0, z: 0 };
  const options = {
    colliders: [{ x: 0, z: 1, width: 1, depth: 1 }],
    radius: 0.144,
    speedScale: 0.4
  };
  const step = stepWorldMovement(
    pose,
    { forward: 1, right: 0 },
    1 / 30,
    options
  );
  assert.ok(Math.abs(step.z - 1.92 / 30) < 1e-7);
  let stopped = pose;
  for (let i = 0; i < 100; i++)
    stopped = stepWorldMovement(stopped, { forward: 1, right: 0 }, 1, options);
  assert.ok(stopped.z <= 0.356 + 1e-7 && stopped.z > 0.3);
  assert.equal(worldPositionIsWalkable(0, 1), true);
  assert.equal(worldPositionIsWalkable(0, 1, options), false);
});

test('actual exported proxies block every building while preserving the main walking route', async () => {
  const value = JSON.parse(
    await readFile(
      new URL('../public/world-assets/colliders.json', import.meta.url),
      'utf8'
    )
  );
  const map = parseWorldCollisionMap(value);
  assert.ok(map.colliders.length >= 19);
  assert.ok(map.characterAnchor);
  const options = { colliders: map.colliders, radius: 0.144, speedScale: 0.4 };
  assert.ok(worldPositionIsWalkable(-18, 0, options));
  for (const building of worldBuildings)
    assert.equal(
      worldPositionIsWalkable(building.x, building.z, options),
      false,
      `${building.id} body blocks movement`
    );
  for (let x = -28; x < 30; x += 1)
    assert.ok(
      worldPositionIsWalkable(x, 0, options),
      `main street remains open at ${x}`
    );
});

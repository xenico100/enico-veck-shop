import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      [
        './world-camera',
        './world-layout',
        './village-buildings',
        './world-game',
        './world-props'
      ].includes(specifier)
    )
      return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  }
});
after(() => hooks.deregister());

const { createWorldProps, modelMatrix, billboardMatrix, cameraMatrix } = await import(
  '../utils/world-props.ts'
);
const { buildWorldFrame, emptySceneFx, flashlightIntensity } = await import(
  '../utils/world-scene.ts'
);
const game = await import('../utils/world-game.ts');
const { worldCameraBasis } = await import('../utils/world-camera.ts');

test('procedural meshes use the 12-float village vertex layout with finite data', () => {
  const meshes = createWorldProps();
  for (const [name, mesh] of Object.entries(meshes)) {
    assert.ok(mesh.vertexCount > 0, `${name} is empty`);
    assert.equal(mesh.vertexCount % 3, 0, `${name} is not triangles`);
    assert.equal(mesh.vertices.length, mesh.vertexCount * 12, `${name} stride`);
    assert.ok(mesh.vertices.every(Number.isFinite), `${name} has non-finite data`);
    assert.equal(mesh.material.textureIndex, null);
  }
  for (const required of ['sky', 'fragment', 'shadow', 'shadowEyes', 'cat', 'rain', 'dust', 'beam', 'doorLight'])
    assert.ok(meshes[required], `${required} missing`);
});

test('matrices place, face and attach props correctly', () => {
  const m = modelMatrix(2, 3, 4, Math.PI / 2, 2);
  // Local +Z maps to world +X at yaw pi/2, matching the camera convention.
  assert.ok(Math.abs(m[8] - 2) < 1e-9 && Math.abs(m[10]) < 1e-9);
  assert.deepEqual([m[12], m[13], m[14]], [2, 3, 4]);
  const basis = worldCameraBasis({ yaw: 0.4, pitch: -0.2 });
  const b = billboardMatrix(0, 0, 0, 1, basis);
  // The disc normal (+Z column) points back toward the camera.
  const facing = b[8] * basis.forward[0] + b[9] * basis.forward[1] + b[10] * basis.forward[2];
  assert.ok(facing < -0.999);
  const c = cameraMatrix([1, 2, 3], basis, [0, 0, -1]);
  const ahead = [c[12] - 1, c[13] - 2, c[14] - 3];
  assert.ok(ahead[0] * basis.forward[0] + ahead[1] * basis.forward[1] + ahead[2] * basis.forward[2] > 0.999);
});

const pose = { x: -7, z: 0.5, yaw: 1.4, pitch: -0.1 };
const frame = (state, extra = {}) =>
  buildWorldFrame({
    state,
    pose,
    time: 12.3,
    settings: game.defaultWorldSettings,
    fx: emptySceneFx(),
    eyeOffset: 0,
    ...extra
  });

test('night frame: lamps lit, at most 8 lights, finite values, PS1 flags follow settings', () => {
  const state = game.createGameState();
  const result = frame(state);
  assert.ok(result.lights.length > 0 && result.lights.length <= 8);
  for (const light of result.lights)
    assert.ok([light.x, light.y, light.z, light.radius, ...light.color].every(Number.isFinite));
  assert.ok(result.instances.some((item) => item.mesh === 'fragment'));
  assert.ok(result.instances.every((item) => item.model.length === 16 && item.model.every(Number.isFinite)));
  assert.equal(result.lightSources, 1);
  assert.equal(result.psx.snap, true);
  const plain = frame(state, { settings: { ...game.defaultWorldSettings, jitter: false, dither: false } });
  assert.equal(plain.psx.snap, false);
  assert.equal(plain.psx.dither, false);
  assert.equal(plain.psx.affine, 0);
});

test('blackout darkens light sources; dawn changes fog and drops rain and stars', () => {
  const state = game.createGameState();
  state.flashlight = { owned: true, on: true, battery: 80 };
  state.chapter = 1;
  state.blackout = 10;
  const dark = frame(state);
  assert.ok(dark.lightSources < 0.1);
  assert.ok(dark.fog.far < 20);
  assert.ok(dark.instances.some((item) => item.mesh === 'beam'));
  assert.equal(flashlightIntensity(state, 1), 1);

  state.blackout = 0;
  state.chapter = 2;
  assert.ok(frame(state).instances.some((item) => item.mesh === 'rain'));

  state.chapter = 4;
  const dawn = frame(state);
  assert.ok(dawn.fog.far > 40);
  assert.ok(!dawn.instances.some((item) => item.mesh === 'rain' || item.mesh === 'stars'));
});

test('active shadow is drawn with eyes and raises screen danger', () => {
  const state = game.createGameState();
  state.chapter = 2;
  state.flags.blackoutDone = true;
  state.shadow = { state: 'hunt', x: pose.x + 1.5, z: pose.z, timer: 0, exposure: 0, waypoint: 0 };
  const result = frame(state);
  assert.ok(result.instances.some((item) => item.mesh === 'shadow'));
  assert.ok(result.instances.some((item) => item.mesh === 'shadowEyes'));
  assert.ok(result.screen.danger > 0.3);
  assert.ok(result.warp > 0);
});

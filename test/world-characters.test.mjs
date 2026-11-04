import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      /^\.\/world-|^\.\/village-buildings$/.test(specifier)
        ? `${specifier}.ts`
        : specifier,
      context
    );
  }
});
after(() => hooks.deregister());
const chars = await import('../utils/world-characters.ts');
const game = await import('../utils/world-game.ts');
const { resolveWorldCamera } = await import('../utils/world-camera.ts');
const { parseWorldGlb } = await import('../utils/world-glb.ts');
const pose = (x = 0, z = 0, yaw = 0) => ({ x, z, yaw, pitch: 0 });

test('third-person rendering camera leaves player pose untouched and first-person remains available', () => {
  const player = pose(3, 4, 0.4),
    before = { ...player };
  const third = resolveWorldCamera(player);
  assert.deepEqual(player, before);
  assert.ok(Math.hypot(third.pose.x - player.x, third.pose.z - player.z) > 1.2);
  assert.equal(third.opacity, 1);
  assert.ok(third.eyeY > 0.7);
  const first = resolveWorldCamera(player, [], 'first', 0.02);
  assert.deepEqual(first.pose, player);
  assert.equal(first.opacity, 0);
  assert.ok(Math.abs(first.eyeY - 0.68) < 1e-9);
});

test('camera retracts before a wall and fades the avatar only when the camera is close', () => {
  const player = pose();
  const wall = { x: 0, z: -0.65, width: 2, depth: 0.3 };
  const camera = resolveWorldCamera(player, [wall]);
  assert.ok(camera.pose.z > -0.425, 'eye crossed the padded wall');
  assert.ok(camera.opacity < 1 && camera.opacity >= 0);
  assert.equal(resolveWorldCamera(player, [{ ...wall, z: 2 }]).opacity, 1);
});

test('approved-style avatar is finite, low-poly and moves its limbs at walking/running speeds', () => {
  const meshes = chars.createWorldCharacterMeshes();
  assert.ok(Object.keys(meshes).length >= 7);
  let triangles = 0;
  for (const mesh of Object.values(meshes)) {
    assert.equal(mesh.vertexCount % 3, 0);
    assert.equal(mesh.vertices.length, mesh.vertexCount * 12);
    assert.ok(mesh.vertices.every(Number.isFinite));
    triangles += mesh.vertexCount / 3;
  }
  assert.ok(triangles < 2500, `avatar has ${triangles} triangles`);
  const idle = chars.buildMongsangnyeoInstances(pose(), 0, 0, 0, 1);
  const walk = chars.buildMongsangnyeoInstances(pose(), 0, 1.9, 0.6, 1);
  const run = chars.buildMongsangnyeoInstances(pose(), 0, 3.3, 0.6, 1);
  assert.equal(idle.length, 10);
  assert.notDeepEqual(idle[2].model, walk[2].model);
  assert.notDeepEqual(walk[2].model, run[2].model);
  assert.deepEqual(chars.buildMongsangnyeoInstances(pose(), 0, 0, 0, 1, 0), []);
  assert.ok(
    chars
      .buildMongsangnyeoInstances(pose(), 0, 0, 0, 1, 0.4)
      .every((i) => i.blend === 'alpha')
  );
});

test('approved companion triangle partition preserves every triangle and keeps mouth parts on the head', async () => {
  const bytes = readFileSync(
    new URL('../public/world-assets/companion.glb', import.meta.url)
  );
  const scene = await parseWorldGlb(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  );
  const digest = () =>
    createHash('sha256')
      .update(
        Buffer.concat(scene.batches.map((b) => Buffer.from(b.vertices.buffer)))
      )
      .digest('hex');
  const original = digest();
  const anchor = JSON.parse(
    readFileSync(
      new URL('../public/world-assets/colliders.json', import.meta.url)
    )
  ).characterAnchor;
  const rig = chars.createCompanionRig(scene, anchor);
  assert.equal(
    Object.values(rig.meshes).reduce((n, m) => n + m.vertexCount / 3, 0),
    scene.triangleCount
  );
  assert.equal(digest(), original, 'source vertex data changed');
  for (const index of [5, 9, 10])
    assert.ok(
      rig.parts
        .filter((p) => p.mesh.endsWith(`.${index}`))
        .every((p) => p.part === 'head')
    );
  for (const part of ['head', 'tail', 'frontL', 'frontR', 'backL', 'backR'])
    assert.ok(
      rig.parts.some((p) => p.part === part),
      `missing ${part}`
    );
  assert.equal(chars.classifyDogTriangle([-0.2, 0.05, 0.1], 9), 'head');
  for (const m of Object.values(rig.meshes))
    assert.ok(m.vertices.every(Number.isFinite));
  const dog = game.createDog(pose());
  const follow = chars.buildCompanionInstances(dog, rig, 1);
  dog.mode = 'sit';
  assert.notDeepEqual(follow, chars.buildCompanionInstances(dog, rig, 1));
  scene.dispose();
});

test('companion follows a right-angle walked path without cutting the corner', () => {
  const state = game.createGameState();
  state.dog = { ...game.createDog(pose()), x: 0, z: 0, trail: [] };
  for (let i = 0; i <= 200; i++) {
    const p = i <= 100 ? pose(i * 0.02, 0) : pose(2, (i - 100) * 0.02);
    game.stepDog(state, p, 0.02);
    assert.ok(
      Math.abs(state.dog.z) < 0.01 || Math.abs(state.dog.x - 2) < 0.02,
      'cut across the corner'
    );
  }
  assert.ok(state.dog.z > 0.9);
  assert.ok(state.dog.trail.length <= 256);
});

test('checkpoint travel rejoins the player without crossing the old path', () => {
  const state = game.createGameState();
  game.stepDog(state, pose(20, 18), 0.1);
  assert.ok(Math.hypot(state.dog.x - 20, state.dog.z - 18) < 1);
});

test('long guarded trails stay bounded and rejoin a retained walked point', () => {
  const state = game.createGameState();
  state.chapter = 1;
  state.dog = {
    ...game.createDog(pose()),
    x: 0,
    z: 0,
    trail: Array.from({ length: 300 }, (_, i) => ({
      x: Math.sin(i * 0.05),
      z: Math.cos(i * 0.05)
    }))
  };
  const safe = { ...state.dog.trail[44] };
  state.shadow = { ...state.shadow, state: 'hunt', x: safe.x, z: safe.z };
  game.stepDog(state, { ...state.dog.trail[299], yaw: 0, pitch: 0 }, 0.01);
  assert.equal(state.dog.trail.length, 256);
  assert.equal(state.dog.x, safe.x);
  assert.equal(state.dog.z, safe.z);
});

test('petting restores breath once per cooldown and must be faced to show the prompt', () => {
  const state = game.createGameState();
  const player = pose(-30, 14);
  state.dog = { ...game.createDog(player), x: -30, z: 14.6 };
  state.breath = 40;
  assert.equal(game.findInteractable(state, player)?.kind, 'dog');
  assert.notEqual(
    game.findInteractable(state, { ...player, yaw: Math.PI })?.kind,
    'dog'
  );
  game.interact(state, 'veckdog');
  assert.equal(state.breath, 65);
  game.interact(state, 'veckdog');
  assert.equal(state.breath, 65);
  game.stepDog(state, player, 40.1);
  game.interact(state, 'veckdog');
  assert.equal(state.breath, 90);
});

test('sniffing points to an uncollected fragment; guarding does not modify shadow AI', () => {
  const state = game.createGameState();
  state.chapter = 1;
  state.dog = {
    ...game.createDog(pose(-15, 0)),
    x: -15,
    z: 0,
    trail: [{ x: -15, z: 0 }]
  };
  game.stepDog(state, pose(-15, 0), 0.1);
  assert.equal(state.dog.mode, 'sniff');
  state.shadow = { ...state.shadow, state: 'hunt', x: -14, z: 0 };
  const shadow = { ...state.shadow };
  state.dog.timer = 0;
  assert.ok(
    game.stepDog(state, pose(-15, 0), 0.1).some((e) => e.cue === 'growl')
  );
  assert.equal(state.dog.mode, 'guard');
  assert.deepEqual(state.shadow, shadow);
});

test('old saves still load, transient dog data cannot inflate or poison a save, camera setting migrates', () => {
  const state = game.createGameState();
  state.dog.trail = Array.from({ length: 100 }, () => ({ x: 0, z: 0 }));
  const raw = game.serializeGame(state, pose(2, 3));
  assert.equal(JSON.parse(raw).dog, undefined);
  const restored = game.parseGameSave({
    ...JSON.parse(raw),
    dog: { x: Infinity, trail: 'bad' }
  });
  assert.equal(restored.state.dog.x, 2);
  assert.equal(restored.state.dog.z, 3);
  assert.ok(Array.isArray(restored.state.dog.trail));
  assert.equal(game.parseWorldSettings({}).camera, 'third');
  assert.equal(game.parseWorldSettings({ camera: 'first' }).camera, 'first');
  assert.equal(
    game.parseWorldSettings({ camera: 'malicious' }).camera,
    'third'
  );
});

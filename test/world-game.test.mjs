import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      ['./world-camera', './world-layout', './village-buildings', './world-game'].includes(
        specifier
      )
    )
      return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  }
});
after(() => hooks.deregister());

const game = await import('../utils/world-game.ts');
const { worldPositionIsWalkable, stepWorldMovement } = await import('../utils/world-layout.ts');
const { parseWorldCollisionMap } = await import('../utils/world-collisions.ts');

const collisionMap = parseWorldCollisionMap(
  JSON.parse(readFileSync(new URL('../public/world-assets/colliders.json', import.meta.url)))
);
const movement = {
  colliders: [...collisionMap.colliders, ...game.GAME_COLLIDERS],
  radius: 0.144,
  speedScale: 0.4
};
const pose = (x, z, yaw = 0) => ({ x, z, yaw, pitch: 0 });
const run = (state, at, seconds, dt = 1 / 30) => {
  const events = [];
  for (let t = 0; t < seconds; t += dt) events.push(...game.stepGame(state, { pose: at, dt }));
  return events;
};
const take = (state, id) => game.interact(state, id);

test('every pickup, NPC and prop is reachable outside walls', () => {
  const state = game.createGameState();
  state.chapter = 2;
  state.talked = ['postman', 'cat', 'projectionist'];
  state.flags.doorOpen = true;
  for (const item of game.availableInteractables(state)) {
    // The player must be able to stand somewhere within reach of it.
    let reachable = false;
    for (let angle = 0; angle < Math.PI * 2 && !reachable; angle += Math.PI / 8)
      for (const reach of [0.2, 0.5, 0.8])
        if (
          reach < item.radius &&
          worldPositionIsWalkable(
            item.x + Math.cos(angle) * reach,
            item.z + Math.sin(angle) * reach,
            movement
          )
        )
          reachable = true;
    assert.ok(reachable, `${item.id} at ${item.x},${item.z} cannot be reached`);
  }
  assert.ok(worldPositionIsWalkable(game.START_POSE.x, game.START_POSE.z, movement));
});

test('north houses are now solid', () => {
  let p = pose(-15.6, -11, Math.PI);
  for (let i = 0; i < 120; i++) p = stepWorldMovement(p, { forward: 1, right: 0 }, 1 / 30, movement);
  assert.ok(p.z > -13.6, `walked into the house: ${p.z}`);
});

test('complete story: flashlight, blackout, clues, phone, door and dawn', () => {
  const state = game.createGameState();
  assert.equal(state.chapter, 0);
  assert.match(game.objective(state).title, /손전등/);
  assert.deepEqual(take(state, 'fragment-1').length > 0, true, 'fragments can be found early');
  const flash = take(state, 'flashlight');
  assert.ok(flash.some((event) => event.type === 'chapter' && event.index === 1));
  assert.ok(state.flashlight.owned && state.flashlight.on);

  take(state, 'fragment-2');
  assert.equal(state.flags.blackoutDone, undefined);
  take(state, 'fragment-3');
  const blackout = run(state, pose(-25, 0), 2);
  assert.ok(blackout.some((event) => event.type === 'sound' && event.cue === 'blackout'));
  assert.ok(state.blackout > 0);
  assert.ok(!game.lampsOn(state));
  assert.match(game.objective(state).title, /빛/);

  // NPCs are atmospheric before chapter two and give no clue yet.
  const early = run(state, pose(-25, 0), 30);
  assert.ok(early.some((event) => event.type === 'chapter' && event.index === 2));
  assert.ok(game.lampsOn(state));

  for (const npc of ['postman', 'cat', 'projectionist']) {
    const talk = take(state, npc);
    assert.ok(talk.some((event) => event.type === 'dialogue'));
  }
  assert.equal(state.talked.length, 3);
  take(state, 'clue-stamp');
  take(state, 'clue-tag');
  const film = take(state, 'clue-film');
  assert.ok(film.some((event) => event.type === 'sound' && event.cue === 'train'));
  assert.ok(state.phoneRinging);
  assert.match(game.objective(state).title, /공중전화/);

  const phone = take(state, 'payphone');
  assert.ok(phone.some((event) => event.type === 'chapter' && event.index === 3));
  assert.equal(game.doorOpen(state), false);
  for (const fragment of game.FRAGMENTS) take(state, fragment.id);
  assert.equal(game.fragmentCount(state), 8);
  assert.ok(game.doorOpen(state));
  assert.match(game.objective(state).title, /문/);
  const ending = take(state, 'door');
  assert.ok(ending.some((event) => event.type === 'ending'));
  assert.equal(state.chapter, 4);
  assert.equal(game.shadowActive(state), false);
});

test('the shadow hunts in darkness, respects lamps and flees the flashlight', () => {
  const state = game.createGameState();
  take(state, 'flashlight');
  state.flashlight.on = false;
  state.flags.blackoutDone = true;
  state.chapter = 2;
  state.shadow = { state: 'roam', x: -1, z: 2, timer: 0, exposure: 0, waypoint: 0 };
  // Player between lamps, in the dark, facing away (+x is behind at yaw -pi/2).
  const player = pose(-1.5 + 0, 8.5, Math.PI);
  run(state, player, 0.5);
  assert.equal(state.shadow.state, 'hunt');
  const before = Math.hypot(state.shadow.x - player.x, state.shadow.z - player.z);
  run(state, player, 1);
  assert.ok(Math.hypot(state.shadow.x - player.x, state.shadow.z - player.z) < before);

  // Face the shadow with the light on: it retreats and eventually scatters.
  state.flashlight.on = true;
  const yaw = Math.atan2(state.shadow.x - player.x, state.shadow.z - player.z);
  const facing = { ...player, yaw };
  const scattered = run(state, facing, 3);
  assert.ok(scattered.some((event) => event.type === 'toast' && /흩어/.test(event.text)));
  assert.equal(state.shadow.state, 'gone');

  // Lamp light is a boundary.
  const lamp = game.WORLD_LAMPS[2];
  state.shadow = { state: 'hunt', x: lamp.x + 6, z: lamp.z, timer: 0, exposure: 0, waypoint: 0 };
  state.flashlight.on = false;
  run(state, pose(lamp.x, lamp.z), 12);
  assert.ok(Math.hypot(state.shadow.x - lamp.x, state.shadow.z - lamp.z) >= game.LAMP_SAFE_RADIUS);
});

test('losing all breath wakes the player at the last lamp without losing progress', () => {
  const state = game.createGameState();
  take(state, 'flashlight');
  take(state, 'fragment-1');
  state.flashlight.on = false;
  state.flags.blackoutDone = true;
  state.chapter = 2;
  run(state, pose(-7.6, 1.6), 0.5);
  const checkpoint = { ...state.checkpoint };
  state.shadow = { state: 'hunt', x: 3, z: 9, timer: 0, exposure: 0, waypoint: 0 };
  const events = run(state, pose(3, 9.2), 30);
  assert.ok(events.some((event) => event.type === 'wake'));
  assert.equal(state.wakeCount, 1);
  assert.ok(state.collected.includes('fragment-1'));
  assert.deepEqual(game.wakePose(state).x, checkpoint.x);
});

test('flashlight battery drains, recharges under lamps and batteries refill it', () => {
  const state = game.createGameState();
  take(state, 'flashlight');
  run(state, pose(-1.5, 9), 20);
  assert.ok(state.flashlight.battery < 85);
  const low = state.flashlight.battery;
  run(state, pose(5.2, 1.6), 5);
  assert.ok(state.flashlight.battery > low - 5 + 5);
  state.flashlight.battery = 10;
  take(state, 'battery-1');
  assert.equal(state.flashlight.battery, 55);
  take(state, 'vending');
  assert.equal(state.flashlight.battery, 100);
  assert.ok(take(state, 'vending').some((event) => event.type === 'toast' && /품절/.test(event.text)));
});

test('saves round-trip and reject tampered data', () => {
  const state = game.createGameState();
  take(state, 'flashlight');
  take(state, 'fragment-4');
  take(state, 'note-2');
  state.playTime = 321;
  const raw = game.serializeGame(state, pose(3, 4, 1));
  const loaded = game.parseGameSave(raw);
  assert.ok(loaded);
  assert.equal(loaded.state.chapter, 1);
  assert.deepEqual(loaded.state.collected.sort(), ['fragment-4', 'note-2']);
  assert.equal(loaded.pose.x, 3);
  assert.equal(game.parseGameSave('{bad'), null);
  assert.equal(game.parseGameSave({ version: 2 }), null);
  const tampered = game.parseGameSave({
    version: 1,
    chapter: 99,
    collected: ['fragment-1', 'admin', 42],
    flashlight: { battery: 9999 },
    pose: { x: 1e9, z: NaN }
  });
  assert.equal(tampered.state.chapter, 4);
  assert.deepEqual(tampered.state.collected, ['fragment-1']);
  assert.equal(tampered.state.flashlight.battery, 100);
  assert.ok(tampered.pose.x <= 42);
});

test('settings parse with safe defaults', () => {
  assert.deepEqual(game.parseWorldSettings('nope'), game.defaultWorldSettings);
  const parsed = game.parseWorldSettings({ pixel: 'sharp', volume: 4, sensitivity: -1, jitter: false });
  assert.equal(parsed.pixel, 'sharp');
  assert.equal(parsed.volume, 1);
  assert.equal(parsed.sensitivity, 0.3);
  assert.equal(parsed.jitter, false);
});

test('interaction prefers what the camera faces', () => {
  const state = game.createGameState();
  // Standing between the bench note and the flashlight pickup radius.
  const facingFlashlight = game.findInteractable(state, pose(-19.9, 2.0, Math.atan2(0.3, 0.55)));
  assert.equal(facingFlashlight?.id, 'flashlight');
});


test('nearby companion does not take priority over reachable story interactions', () => {
  const state = game.createGameState();
  const fragment = game.FRAGMENTS[0];
  const player = pose(fragment.x, fragment.z + 1.2);
  state.dog = { ...game.createDog(player), x: player.x, z: player.z + 0.1 };
  assert.equal(game.findInteractable(state, player)?.id, fragment.id);
  take(state, fragment.id);
  assert.equal(game.findInteractable(state, player)?.kind, 'dog');
});

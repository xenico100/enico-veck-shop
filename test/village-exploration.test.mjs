import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dreamPoints,
  readCollected,
  DREAM_COUNT,
  drawVillageGround
} from '../utils/village-exploration.ts';

test('progress ignores malformed storage, duplicates and out-of-range IDs', () => {
  for (const value of [null, '{', '{}', 'null', 'true'])
    assert.deepEqual(readCollected(value), []);
  assert.deepEqual(readCollected('[0,0,7,8,-1,2.5,"1",null]'), [0, 7]);
});
test('all eight collectibles remain within the playable mobile and desktop worlds', () => {
  for (const width of [1280, 1480, 1920]) {
    const points = dreamPoints(width);
    assert.equal(points.length, DREAM_COUNT);
    assert.equal(new Set(points.map((p) => p.id)).size, DREAM_COUNT);
    for (const p of points) {
      assert.ok(p.x > 40 && p.x < width - 40);
      assert.ok(p.y > 120 && p.y < 4300);
    }
  }
});
test('ground paints a full viewport and restores camera transform', () => {
  const calls = [];
  const ctx = new Proxy(
    {},
    {
      get:
        (_, key) =>
        (...args) =>
          calls.push([key, ...args]),
      set: () => true
    }
  );
  drawVillageGround(ctx, 390, 844, 400, 120, 1480);
  assert.deepEqual(calls[0], ['fillRect', 0, 0, 390, 844]);
  assert.deepEqual(calls[2], ['translate', -400, -120]);
  assert.deepEqual(calls.at(-1), ['restore']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  villageBuildings,
  findBuilding,
  buildingDoor
} from '../utils/village-buildings.ts';

test('every feature has a unique, validated destination', () => {
  assert.deepEqual(
    villageBuildings.map((b) => b.id),
    ['community', 'goods', 'studio', 'profile', 'dating', 'about']
  );
  assert.equal(findBuilding('admin'), undefined);
  assert.equal(findBuilding(null), undefined);
  assert.equal(
    new Set(villageBuildings.map((b) => b.id)).size,
    villageBuildings.length
  );
});
test('doors are reachable and building footprints do not overlap', () => {
  for (const width of [1280, 1480, 1920]) {
    for (const b of villageBuildings) {
      const door = buildingDoor(b.id, width);
      assert.ok(door.x > 40 && door.x < width - 40);
      assert.ok(door.y > 120 && door.y < 1700);
      for (const other of villageBuildings.filter((o) => o.id !== b.id)) {
        assert.ok(
          Math.abs(b.x - other.x) >= 240 || Math.abs(b.y - other.y) >= 270
        );
      }
    }
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceStory,
  emptyStory,
  fragments,
  isRestored,
  nextStoryRoom,
  readStory,
  residents
} from '../utils/village-story.ts';
import { villageBuildings } from '../utils/village-buildings.ts';

test('invalid or future save data cannot invent a completed story', () => {
  for (const raw of [
    null,
    'broken',
    'null',
    '[]',
    '{"completed":true}',
    '{"fragments":["fake",1,null],"completed":true}'
  ]) {
    assert.deepEqual(readStory(raw), emptyStory);
  }
  assert.deepEqual(
    readStory('{"fragments":["stamp","stamp","unknown"]}').fragments,
    ['stamp']
  );
});
test('exploration can be completed without accounts, purchases or posting', () => {
  let state = advanceStory(emptyStory, 'start');
  assert.equal(nextStoryRoom(state), 'community');
  for (const fragment of fragments) {
    state = advanceStory(state, fragment.id);
    state = advanceStory(state, fragment.id);
  }
  assert.equal(state.fragments.length, 3);
  assert.equal(nextStoryRoom(state), 'about');
  assert.equal(advanceStory(emptyStory, 'complete').completed, false);
  assert.equal(advanceStory(state, 'complete').completed, true);
  assert.deepEqual(readStory(JSON.stringify(state)), state);
});
test('sentence puzzle accepts only the complete original sequence', () => {
  assert.equal(isRestored(['stamp', 'label', 'reel']), true);
  for (const order of [
    [],
    ['stamp'],
    ['reel', 'label', 'stamp'],
    ['stamp', 'stamp', 'reel'],
    ['stamp', 'label', 'reel', 'reel']
  ])
    assert.equal(isRestored(order), false);
});
test('every existing feature has a resident, choice and inspectable object', () => {
  for (const building of villageBuildings) {
    const resident = residents[building.id];
    for (const field of [
      'name',
      'role',
      'greeting',
      'question',
      'answer',
      'action',
      'clue'
    ])
      assert.ok(resident[field]?.length > 0);
  }
});
test('replay clears only the device-local narrative state', () => {
  const completed = readStory(
    '{"fragments":["stamp","label","reel"],"completed":true}'
  );
  assert.equal(completed.completed, true);
  assert.deepEqual(advanceStory(completed, 'reset'), emptyStory);
  assert.equal(nextStoryRoom(advanceStory(completed, 'reset')), 'community');
});

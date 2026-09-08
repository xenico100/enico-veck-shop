import test from 'node:test';
import assert from 'node:assert/strict';
import { observeVillageViewport } from '../utils/village-viewport.ts';

function fakeWindow(withViewport = true) {
  const values = new Map();
  const host = Object.assign(new EventTarget(), {
    innerHeight: 844,
    document: {
      documentElement: {
        style: {
          getPropertyValue: (key) => values.get(key) || '',
          setProperty: (key, value) => values.set(key, value),
          removeProperty: (key) => values.delete(key)
        }
      }
    },
    visualViewport: withViewport
      ? Object.assign(new EventTarget(), {
          height: 844,
          offsetTop: 0,
          scale: 1
        })
      : null
  });
  return { host, values };
}

test('rooms track keyboard height and viewport pan, then restore on close', () => {
  const { host, values } = fakeWindow();
  const cleanup = observeVillageViewport(host);
  assert.equal(values.get('--village-viewport-height'), '844px');
  Object.assign(host.visualViewport, { height: 390, offsetTop: 42 });
  host.visualViewport.dispatchEvent(new Event('resize'));
  assert.equal(values.get('--village-viewport-height'), '390px');
  assert.equal(values.get('--village-viewport-top'), '42px');
  Object.assign(host.visualViewport, { height: 844, offsetTop: 0 });
  host.visualViewport.dispatchEvent(new Event('scroll'));
  assert.equal(values.get('--village-viewport-height'), '844px');
  cleanup();
  host.visualViewport.dispatchEvent(new Event('resize'));
  assert.equal(values.size, 0);
});

test('native pinch zoom does not shrink or reposition the room layout', () => {
  const { host, values } = fakeWindow();
  const cleanup = observeVillageViewport(host);
  Object.assign(host.visualViewport, { height: 422, scale: 2, offsetTop: 90 });
  host.visualViewport.dispatchEvent(new Event('resize'));
  assert.equal(values.get('--village-viewport-height'), '100dvh');
  assert.equal(values.get('--village-viewport-top'), '0px');
  cleanup();
});

test('fallback tracks window resize and cleans up without deleting prior styles', () => {
  const { host, values } = fakeWindow(false);
  values.set('--village-viewport-top', '8px');
  const cleanup = observeVillageViewport(host);
  host.innerHeight = 390;
  host.dispatchEvent(new Event('resize'));
  assert.equal(values.get('--village-viewport-height'), '390px');
  cleanup();
  host.dispatchEvent(new Event('resize'));
  assert.deepEqual([...values], [['--village-viewport-top', '8px']]);
});

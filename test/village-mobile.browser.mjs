// Optional production-server smoke test: node test/village-mobile.browser.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const origin = process.env.VILLAGE_TEST_URL || 'http://localhost:3000';
const session = `village-mobile-${process.pid}`;
function browser(...args) {
  return execFileSync(
    'npx',
    ['--yes', 'agent-browser@0.37.1', '--session', session, ...args],
    { encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024 }
  ).trim();
}
function inspect(source) {
  const result = JSON.parse(browser('eval', `JSON.stringify(${source})`));
  return typeof result === 'string' ? JSON.parse(result) : result;
}
const rooms = ['community', 'goods', 'studio', 'profile', 'dating', 'about'];
const dimensions = [
  [320, 700],
  [390, 844],
  [844, 390]
];
try {
  browser('open', origin);
  for (const [width, height] of dimensions) {
    browser('set', 'viewport', String(width), String(height));
    browser('open', origin);
    browser('wait', '[aria-label="여행 수첩"]');
    const journal = inspect(`(() => {
      const el = document.querySelector('aside[aria-label="여행 수첩"]');
      return { rect: el.getBoundingClientRect().toJSON(), width: innerWidth, height: innerHeight };
    })()`);
    assert.ok(
      journal.rect.top >= 0 && journal.rect.bottom <= height,
      'journal stays on screen'
    );
    browser('click', '[aria-label="메뉴 열기"]');
    browser('wait', '[role="dialog"][aria-label="마을 메뉴"]');
    browser('click', '[aria-label="메뉴 닫기"]');
    assert.equal(
      inspect('document.querySelectorAll("[role=dialog]").length'),
      0,
      'closed menu must not pause movement'
    );
    browser('click', '[aria-label="마을 지도 열기"]');
    browser('click', 'nav[aria-label="마을 목적지"] button:nth-child(2)');
    browser('wait', '[role="dialog"]');
    assert.equal(
      inspect('document.querySelector("[role=dialog] h2").textContent'),
      '몽상 잡화점',
      'avatar reaches selected building after menu close'
    );
    for (const room of rooms) {
      browser('open', `${origin}/?room=${room}`);
      browser('wait', '[role="dialog"]');
      const metrics = inspect(`(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const header = dialog.querySelector('header');
        return {
          width: innerWidth, height: innerHeight,
          overflow: document.documentElement.scrollWidth > innerWidth,
          room: dialog.getBoundingClientRect().toJSON(),
          buttons: Array.from(header.querySelectorAll('button')).map(el => el.getBoundingClientRect().toJSON()),
          error: Boolean(document.querySelector('[data-nextjs-dialog]'))
        };
      })()`);
      assert.equal(metrics.overflow, false, `${room}: horizontal overflow`);
      assert.equal(metrics.error, false, `${room}: framework error`);
      assert.ok(
        Math.abs(metrics.room.height - height) <= 1,
        `${room}: visible viewport height`
      );
      for (const rect of metrics.buttons) {
        assert.ok(
          rect.left >= 0 && rect.right <= width,
          `${room}: header buttons fit`
        );
        assert.ok(
          rect.height >= 44 && rect.width >= 44,
          `${room}: header touch targets`
        );
      }
      if (room === 'community')
        browser('screenshot', `/tmp/village-mobile-${width}x${height}.png`);
    }
    console.log(
      `PASS ${width}x${height}: journal, menu close, walking, six rooms, header targets, overflow`
    );
  }
  assert.equal(browser('errors'), '', 'no uncaught browser errors');
  console.log(
    'PASS mobile viewport browser regression checks (not a physical iOS keyboard test)'
  );
} finally {
  browser('close');
}

// Local-only browser verification. Requires Playwright and an already running server.
// WORLD_TEST_URL=http://127.0.0.1:3214 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs
// PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chromium node test/world.browser.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const origin = process.env.WORLD_TEST_URL || 'http://127.0.0.1:3214';
assert.ok(
  /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin),
  'tests are limited to a local preview'
);
const output = resolve(
  process.env.WORLD_TEST_OUTPUT || '../world-verification'
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
  chromiumSandbox: false,
  args: [
    '--enable-webgl',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader'
  ]
});
const results = [];
const errors = [];
const open = async (options, noWebgl = false, failAssets = false) => {
  const context = await browser.newContext({
    ...options,
    deviceScaleFactor: 1
  });
  if (failAssets)
    await context.route('**/world-assets/village.glb', (route) =>
      route.abort()
    );
  if (noWebgl)
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        if (kind === 'webgl') return null;
        return original.call(this, kind, ...args);
      };
    });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.stack));
  await page.goto(`${origin}/world`, { waitUntil: 'networkidle' });
  if (!noWebgl)
    await page.waitForFunction(
      () => document.querySelector('canvas')?.width >= 160
    );
  else await page.locator('p[role=alert]').waitFor();
  if (!noWebgl)
    await page.waitForFunction(
      (expected) =>
        document.querySelector('canvas')?.dataset.worldAssetState === expected,
      failAssets ? 'error' : 'ready'
    );
  return { page, context };
};
const position = async (page) =>
  (await page.getByLabel('현재 위치', { exact: true }).innerText())
    .match(/-?\d+\.\d+/g)
    .map(Number);
const assertFits = async (page, selector) => {
  const rect = await page.locator(selector).boundingBox();
  assert.ok(
    rect &&
      rect.x >= -1 &&
      rect.y >= -1 &&
      rect.x + rect.width <= page.viewportSize().width + 1 &&
      rect.y + rect.height <= page.viewportSize().height + 1,
    `${selector} fits viewport`
  );
};
const walk = async (page, key, duration = 650) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  await page.keyboard.up(key);
  await page.waitForTimeout(160);
};

try {
  const { page, context } = await open({
    viewport: { width: 1440, height: 900 }
  });
  await page.screenshot({ path: `${output}/desktop-welcome.png` });
  await page.getByRole('button', { name: '산책 시작', exact: true }).click();
  const start = await position(page);
  await walk(page, 'w');
  assert.ok(
    (await position(page))[0] > start[0] + 0.5,
    'W moves in camera direction'
  );
  const compass = page.getByLabel('현재 위치', { exact: true }).locator('svg');
  const heading = await compass.getAttribute('style');
  await page.mouse.move(1050, 610);
  await page.mouse.down();
  await page.mouse.move(1090, 610, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(180);
  assert.notEqual(
    await compass.getAttribute('style'),
    heading,
    'mouse drag changes camera'
  );
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '지도 열기', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.screenshot({ path: `${output}/desktop-map.png` });
  const beforeMap = await position(page);
  await walk(page, 'w', 300);
  assert.deepEqual(await position(page), beforeMap, 'map pauses movement');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await walk(page, 'w');
  assert.notDeepEqual(
    await position(page),
    beforeMap,
    'W works immediately after map closes'
  );
  await page.getByRole('button', { name: '목록 열기', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: /길 찾기$/ }).count(), 7);
  await page.getByRole('button', { name: /dot 작업실 소유자 전용/ }).click();
  await page
    .getByText('소유자의 개인 작업실입니다.', { exact: true })
    .waitFor();
  assert.equal(
    await page.locator('[role=dialog] a[href*="drive.google.com"]').count(),
    0
  );
  await page.getByRole('button', { name: '기존 계정으로 로그인' }).waitFor();
  await page.screenshot({ path: `${output}/desktop-workshop-locked.png` });
  const denied = await page.request.get(`${origin}/api/world/workshop`);
  assert.equal(denied.status(), 401);
  assert.match(denied.headers()['cache-control'], /private.*no-store/);
  assert.equal(
    JSON.stringify(await denied.json()).includes('drive.google.com'),
    false
  );
  const forged = await page.request.get(`${origin}/api/world/workshop`, {
    headers: { Cookie: 'role=owner; world_owner=true', 'x-user-role': 'owner' }
  });
  assert.equal(
    forged.status(),
    401,
    'client role headers/cookies do not grant owner access'
  );
  await page.getByRole('button', { name: '공간 정보 닫기' }).click();
  await page.getByRole('button', { name: '목록 열기', exact: true }).click();
  await page.getByRole('button', { name: /몽상 잡화점.*의류/ }).click();
  await page.getByRole('button', { name: '기존 공간 열기' }).click();
  await page
    .getByRole('dialog')
    .filter({
      has: page.getByRole('heading', { name: '몽상 잡화점', exact: true })
    })
    .waitFor();
  const beforeInterior = await position(page);
  await walk(page, 'w', 300);
  assert.deepEqual(
    await position(page),
    beforeInterior,
    'existing interior pauses 3D movement'
  );
  await page.getByRole('button', { name: '마을로', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  const beforePause = await position(page);
  await walk(page, 'w', 300);
  assert.deepEqual(
    await position(page),
    beforePause,
    'manual pause stops movement'
  );
  await page.keyboard.press('p');
  await walk(page, 'w', 300);
  assert.notDeepEqual(
    await position(page),
    beforePause,
    'P resumes after header button focus'
  );
  await page.screenshot({ path: `${output}/desktop-walk.png` });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth
    ),
    false
  );
  results.push(
    'desktop: WASD, mouse camera, map/list, modal pause/resume, existing shop adapter, anonymous/forged-owner denial'
  );
  await context.close();

  for (const [width, height] of [
    [390, 844],
    [844, 390],
    [320, 700]
  ]) {
    const { page, context } = await open({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true
    });
    await page.screenshot({
      path: `${output}/mobile-${width}x${height}-welcome.png`
    });
    await page.getByRole('button', { name: '산책 시작', exact: true }).click();
    const pad = page.getByRole('group', { name: '터치 이동 패드' });
    await pad.waitFor({ state: 'visible' });
    await assertFits(page, '[aria-label="터치 이동 패드"]');
    const before = await position(page);
    const cdp = await context.newCDPSession(page);
    const padBox = await pad.boundingBox();
    const touchX = padBox.x + padBox.width / 2;
    const touchY = padBox.y + padBox.height / 2;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: touchX, y: touchY }]
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: touchX, y: touchY - 35 }]
    });
    await page.waitForTimeout(600);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });
    await page.waitForTimeout(160);
    assert.notDeepEqual(await position(page), before, 'touch stick moves');
    const stopped = await position(page);
    await page.waitForTimeout(200);
    assert.deepEqual(await position(page), stopped, 'released stick stops');
    const canvas = page.locator('canvas');
    const beforeCamera = await page
      .getByLabel('현재 위치', { exact: true })
      .locator('svg')
      .getAttribute('style');
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: width - 30, y: height / 2 }]
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: width - 90, y: height / 2 }]
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });
    await page.waitForTimeout(180);
    assert.notEqual(
      await page
        .getByLabel('현재 위치', { exact: true })
        .locator('svg')
        .getAttribute('style'),
      beforeCamera,
      'touch drag rotates camera'
    );
    await page.screenshot({
      path: `${output}/mobile-${width}x${height}-walk.png`
    });
    await page.getByRole('button', { name: '지도 열기', exact: true }).click();
    await assertFits(page, '[role=dialog]');
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false
    );
    await page.screenshot({
      path: `${output}/mobile-${width}x${height}-map.png`
    });
    results.push(
      `mobile ${width}×${height}: touch movement/release, touch camera, visible controls, map, no horizontal overflow`
    );
    await context.close();
  }

  const companion = await open({ viewport: { width: 1440, height: 900 } });
  assert.equal(
    await companion.page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .some((r) => r.name.endsWith('/companion.glb'))
    ),
    false,
    'companion is deferred at arrival'
  );
  await companion.page
    .getByRole('button', { name: '산책 시작', exact: true })
    .click();
  // The game starts at the west end of the street; walk east, then toward the house.
  await walk(companion.page, 'w', 7000);
  await walk(companion.page, 'a', 1200);
  await companion.page.waitForFunction(
    () =>
      document.querySelector('canvas')?.dataset.worldCharacterState === 'ready'
  );
  assert.equal(
    await companion.page.evaluate(
      () =>
        performance
          .getEntriesByType('resource')
          .filter((r) => r.name.endsWith('/companion.glb')).length
    ),
    1,
    'companion loads once when approached'
  );
  await companion.page.screenshot({
    path: `${output}/desktop-companion-static.png`
  });
  results.push(
    'actual companion: initial download deferred, proximity load succeeds, static current pose only'
  );
  await companion.context.close();
  const failedAsset = await open(
    { viewport: { width: 390, height: 844 } },
    false,
    true
  );
  assert.equal(
    await failedAsset.page.locator('canvas').getAttribute('data-world-scene'),
    'placeholder'
  );
  await failedAsset.page
    .getByText('임시 충돌 장면 · 실제 자산 로딩 실패', { exact: false })
    .waitFor();
  // Before starting, the title menu is the entry point to the accessible list.
  await failedAsset.page
    .getByRole('button', { name: '목록으로 둘러보기', exact: true })
    .click();
  assert.equal(
    await failedAsset.page.getByRole('button', { name: /길 찾기$/ }).count(),
    7
  );
  results.push(
    'actual asset failure: explicitly labeled proxy fallback, list remains accessible'
  );
  await failedAsset.context.close();

  const fallback = await open({ viewport: { width: 390, height: 844 } }, true);
  await fallback.page
    .getByRole('button', { name: '공간 목록 열기', exact: true })
    .click();
  await fallback.page.getByRole('dialog').waitFor();
  assert.equal(
    await fallback.page.getByRole('button', { name: /길 찾기$/ }).count(),
    7
  );
  results.push('WebGL unavailable: accessible list fallback works');
  await fallback.context.close();
  assert.deepEqual(errors, [], 'no uncaught browser errors');
  console.log(
    JSON.stringify(
      { passed: results, screenshots: output, uncaughtErrors: errors.length },
      null,
      2
    )
  );
} finally {
  await browser.close();
}

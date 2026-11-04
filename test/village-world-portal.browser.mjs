// Local-only, real pointer/touch travel through the pixel village's WORLD portal.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.WORLD_TEST_URL || 'http://127.0.0.1:3227';
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const output = resolve(process.env.WORLD_TEST_OUTPUT || '../world-portal-verification');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
  args: ['--enable-webgl', '--enable-unsafe-swiftshader']
});
const results = [];
try {
  for (const [width, height, touch] of [
    [1440, 900, false],
    [320, 700, true],
    [390, 844, true],
    [844, 390, true]
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch });
    // Keep the destination pending while inspecting the short portal transition.
    let continueDestination;
    const destinationReady = new Promise(resolveReady => { continueDestination = resolveReady; });
    await context.route(url => url.pathname === '/world', async route => {
      await destinationReady;
      await route.continue().catch(() => {});
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
    const portal = page.getByRole('button', { name: 'WORLD 포탈로 이동', exact: true });
    await portal.waitFor();
    const avatar = page.locator('canvas[data-world-portal-state]');
    await avatar.waitFor();
    assert.equal(new URL(page.url()).pathname, '/', 'arrival stays in the original pixel village');
    const position = async () => [Number(await avatar.getAttribute('data-player-x')), Number(await avatar.getAttribute('data-player-y'))];
    const before = await position();
    const rect = await portal.boundingBox();
    assert.ok(rect && rect.x >= -1 && rect.x + rect.width <= width + 1, `${width}: portal fits horizontally`);
    await page.screenshot({ path: `${output}/portal-${width}x${height}.png` });
    if (touch) await portal.tap(); else await portal.click();
    const loading = page.getByRole('status', { name: 'WORLD 이동 중', exact: true });
    await loading.waitFor({ state: 'visible', timeout: 20000 });
    const arrived = await position();
    assert.ok(Math.hypot(arrived[0] - before[0], arrived[1] - before[1]) > 25, 'the character walks to the portal');
    const overlay = page.locator('[data-world-portal-loading="true"]');
    const overlayRect = await overlay.boundingBox();
    assert.ok(overlayRect && Math.abs(overlayRect.x) < 1 && Math.abs(overlayRect.y) < 1 && Math.abs(overlayRect.width - width) < 1 && Math.abs(overlayRect.height - height) < 1, 'loading covers the viewport');
    await page.waitForFunction(() => Boolean(document.elementFromPoint(20, 20)?.closest('[data-world-portal-loading="true"]')), null, { timeout: 5000 });
    await page.screenshot({ path: `${output}/loading-${width}x${height}.png` });
    continueDestination();
    await page.waitForURL(`${origin}/world`, { timeout: 30000 });
    await page.getByRole('button', { name: '산책 시작', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.worldAssetState === 'ready', null, { timeout: 60000 });
    await page.getByRole('button', { name: '산책 시작', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.worldCharacterRig === 'articulated', null, { timeout: 60000 });
    await page.screenshot({ path: `${output}/world-${width}x${height}.png` });
    assert.deepEqual(errors, [], `${width}: no uncaught browser errors`);
    results.push(`${width}x${height}: original village → walk → fullscreen loading → WORLD with articulated companion`);
    await context.close();
  }

  // Hold the destination response to exercise an actual slow navigation and cancellation.
  const slowContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  let releaseDestination;
  const destinationGate = new Promise(resolveGate => { releaseDestination = resolveGate; });
  await slowContext.route(url => url.pathname === '/world', async route => {
    await destinationGate;
    await route.continue().catch(() => {});
  });
  const slowPage = await slowContext.newPage();
  await slowPage.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
  await slowPage.getByRole('button', { name: 'WORLD 포탈로 이동', exact: true }).click();
  await slowPage.getByRole('status', { name: 'WORLD 이동 중', exact: true }).waitFor();
  await slowPage.getByRole('button', { name: '마을에 머무르기', exact: true }).click({ timeout: 16000 });
  await slowPage.getByRole('status', { name: 'WORLD 이동 중', exact: true }).waitFor({ state: 'hidden' });
  releaseDestination();
  await slowPage.waitForTimeout(1000);
  assert.equal(new URL(slowPage.url()).pathname, '/', 'cancellation prevents delayed arrival in WORLD');
  await slowPage.waitForFunction(() => document.querySelector('canvas[data-world-portal-state]')?.dataset.worldPortalState === 'idle');
  const beforeCancelWalk = await slowPage.locator('canvas[data-player-x]').getAttribute('data-player-x');
  await slowPage.keyboard.down('ArrowLeft');
  await slowPage.waitForTimeout(250);
  await slowPage.keyboard.up('ArrowLeft');
  assert.notEqual(await slowPage.locator('canvas[data-player-x]').getAttribute('data-player-x'), beforeCancelWalk, 'movement resumes after cancellation');
  await slowContext.close();
  results.push('slow navigation: loading, cancellation, no delayed redirect, movement recovery');
  console.log(JSON.stringify({ passed: results, screenshots: output }, null, 2));
} finally {
  await browser.close();
}

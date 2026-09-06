import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const channel = process.argv[3] ?? 'chromium';
const tag = process.argv[4] ?? 'v08';
if (!/^[a-z0-9_-]+$/i.test(tag)) throw new Error('Use an alphanumeric artifact tag');
if (!['chromium', 'chrome', 'msedge'].includes(channel)) throw new Error('Channel must be chromium, chrome or msedge');
const browser = await chromium.launch({ headless: true, ...(channel === 'chromium' ? {} : { channel }) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const failedRequests = [];
const warnings = [];
let wreckLoaded = false;
page.on('response', response => { if (response.url().endsWith('/assets/prop-plane-wreck-v8-source.png') && response.ok()) wreckLoaded = true; });
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); if (message.type() === 'error') errors.push(message.text()); });
page.on('requestfailed', request => failedRequests.push(request.url()));
try {
  await mkdir('.artifacts', { recursive: true });
  const retryPage = await browser.newPage();
  const retriedAssets = ['portrait-miller-v8-keyed-source.png', 'prop-plane-wreck-v8-source.png'];
  for (const asset of retriedAssets) {
    let blocked = true;
    const pattern = `**/assets/${asset}`;
    await retryPage.route(pattern, route => blocked ? route.abort() : route.continue());
    await retryPage.goto(process.argv[2] ?? 'http://127.0.0.1:4173');
    await retryPage.getByRole('button', { name: /ПОВТОРИТЬ/ }).waitFor();
    blocked = false;
    await retryPage.locator('#start-button').click();
    await retryPage.getByRole('button', { name: 'Начать', exact: true }).waitFor();
    await retryPage.locator('#start-button').click();
    await retryPage.locator('#dialogue-panel').waitFor({ state: 'visible' });
    await retryPage.unroute(pattern);
  }
  await retryPage.close();
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:4173');
  await page.locator('#start-button').click();
  await page.locator('#dialogue-panel').waitFor({ state: 'visible' });
  await page.screenshot({ path: `.artifacts/production-${tag}-${channel}-dialogue.png` });
  await page.locator('#dialogue-skip').click();
  await page.locator('#hud').waitFor({ state: 'visible' });
  if (!wreckLoaded) throw new Error('Required suburb wreck did not load in production');
  if (await page.evaluate(() => '__GAME__' in window)) throw new Error('Production unexpectedly exposes the development scene handle');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(650);
  await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyJ', { delay: 30 });
  await page.keyboard.press('ShiftLeft', { delay: 30 });
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Пауза' }).waitFor();
  await page.getByRole('button', { name: /НАЧАТЬ ЗАНОВО/ }).click();
  await page.locator('#dialogue-skip').click();
  await page.waitForTimeout(150);
  const health = await page.locator('#health-label').innerText();
  if (health !== '100 / 100') throw new Error(`Restart health: ${health}`);
  await page.locator('#fullscreen-button').click();
  await page.waitForFunction(() => document.fullscreenElement && (() => {
    const r = document.querySelector('canvas').getBoundingClientRect();
    return Math.abs(r.top - (innerHeight - r.bottom)) < 2;
  })());
  await page.screenshot({ path: `.artifacts/production-${tag}-${channel}-fullscreen.png` });
  await page.evaluate(() => document.exitFullscreen());
  await page.screenshot({ path: `.artifacts/production-${tag}-${channel}.png` });
  if (errors.length || failedRequests.length || warnings.some(w => /Cannot (pause|resume).*Scene/.test(w))) throw new Error(JSON.stringify({ errors, failedRequests, warnings }));
  console.log(JSON.stringify({ productionSmoke: 'passed', browser: channel, version: browser.version(), fullscreenCentered: true, assetErrorRetry: true, retriedAssets, wreckLoaded, start: true, dialogue: true, input: true, pause: true, restart: true, health, devHandleAbsent: true, errors, failedRequests, warnings }));
} finally {
  await browser.close();
}

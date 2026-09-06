import { chromium } from '@playwright/test';

const channel = process.argv[3] ?? 'chromium';
if (!['chromium', 'chrome', 'msedge'].includes(channel)) throw new Error('Channel must be chromium, chrome or msedge');
const browser = await chromium.launch({ headless: true, ...(channel === 'chromium' ? {} : { channel }) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const failedRequests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('requestfailed', request => failedRequests.push(request.url()));
try {
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:4173');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await page.locator('#hud').waitFor({ state: 'visible' });
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
  await page.waitForTimeout(150);
  const health = await page.locator('#health-label').innerText();
  if (health !== '100 / 100') throw new Error(`Restart health: ${health}`);
  await page.locator('#fullscreen-button').click();
  await page.waitForFunction(() => document.fullscreenElement && (() => {
    const r = document.querySelector('canvas').getBoundingClientRect();
    return Math.abs(r.top - (innerHeight - r.bottom)) < 2;
  })());
  await page.screenshot({ path: `.artifacts/production-v06-${channel}-fullscreen.png` });
  await page.evaluate(() => document.exitFullscreen());
  await page.screenshot({ path: `.artifacts/production-v06-${channel}.png` });
  if (errors.length || failedRequests.length) throw new Error(JSON.stringify({ errors, failedRequests }));
  console.log(JSON.stringify({ productionSmoke: 'passed', browser: channel, version: browser.version(), fullscreenCentered: true, start: true, input: true, pause: true, restart: true, health, devHandleAbsent: true, errors, failedRequests }));
} finally {
  await browser.close();
}

import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

// Read-only local hosting check: production must work without root-level assets.
const root = resolve('dist');
const tag = process.argv[2] ?? 'v06';
if (!/^[a-z0-9_-]+$/i.test(tag)) throw new Error('Use an alphanumeric artifact tag');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav' };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (!pathname.startsWith('/game/')) { response.writeHead(404).end(); return; }
  const file = resolve(root, decodeURIComponent(pathname.slice(6) || 'index.html'));
  if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try {
    const content = await readFile(file);
    response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(content);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const errors = [], failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failed.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failed.push(response.url()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/game/`);
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await page.keyboard.down('KeyD'); await page.waitForTimeout(400); await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyJ', { delay: 20 }); await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /НАЧАТЬ ЗАНОВО/ }).click();
  const health = await page.locator('#health-label').innerText();
  const isolated = await page.evaluate(() => !('__GAME__' in window));
  if (health !== '100 / 100' || !isolated || errors.length || failed.length) throw new Error(JSON.stringify({ health, isolated, errors, failed }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `.artifacts/production-${tag}-subpath-dpr2.png` });
  console.log(JSON.stringify({ passed: true, subpath: '/game/', deviceScaleFactor: 2, health, isolated, errors, failed }));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

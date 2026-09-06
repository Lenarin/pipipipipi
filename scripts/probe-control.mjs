import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Explicit empty-street fixture. Keyboard commands still pass through Phaser input.
const tag = process.argv[2] ?? 'current';
await mkdir(`.artifacts/control-${tag}`, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 },
  ...(process.argv.includes('--video') ? { recordVideo: { dir: `.artifacts/control-${tag}`, size: { width: 1152, height: 800 } } } : {}) });
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').player.grounded);
  await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    s.enemies.getChildren().forEach(e => e.disableBody(true, true));
    s.__controlFrames = [];
    s.events.on('postupdate', (_time, dt) => s.__controlFrames.push({
      at: performance.now(), dt, x: s.player.x, y: s.player.y, vx: s.player.body.velocity.x,
      phase: s.attack.state.phase, step: s.attack.state.step, frame: s.player.frame.name,
      camera: s.cameras.main.scrollX, d: s.keys.right.isDown, a: s.keys.left.isDown,
    }));
  });
  if (process.argv.includes('--camera')) {
    await page.evaluate(() => { const s=window.__GAME__.scene.getScene('Game'); s.player.body.reset(600,285.875); s.cameras.main.centerOn(600,180); });
    await page.waitForTimeout(500);
  }
  const snap = () => page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    return { at: performance.now(), x: s.player.x, y: s.player.y, vx: s.player.body.velocity.x, camera: s.cameras.main.scrollX };
  });
  const walkStart = await snap();
  await page.keyboard.down('KeyD'); await page.waitForTimeout(process.argv.includes('--camera') ? 1200 : 350); await page.keyboard.up('KeyD');
  const released = await snap(); await page.waitForTimeout(260); const stopped = await snap();
  const swings = [];
  await page.keyboard.press('KeyJ', { delay: 20 });
  for (const step of [1, 2]) {
    await page.waitForFunction(n => { const s=window.__GAME__.scene.getScene('Game'); return s.attack.state.step===n && s.attack.state.phase==='recovery'; }, step, { polling: 'raf' });
    swings.push(await snap()); await page.keyboard.press('KeyJ', { delay: 20 });
  }
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').attack.state.phase==='idle');
  const afterCombo = await snap(); await page.waitForTimeout(250);
  await page.screenshot({ path: `.artifacts/control-${tag}/rest.png` });
  const frames = await page.evaluate(() => window.__GAME__.scene.getScene('Game').__controlFrames);
  const result = { tag, walkDistance: released.x-walkStart.x, releaseDrift: stopped.x-released.x,
    cameraDriftAfterRelease: stopped.camera-released.camera, noDirectionComboDrift: afterCombo.x-stopped.x,
    peakAttackVelocity: Math.max(...frames.filter(f=>f.phase!=='idle').map(f=>Math.abs(f.vx))),
    swingMarkers: swings, errors };
  await writeFile(`.artifacts/control-${tag}/metrics.json`, JSON.stringify({ result, frames }, null, 2));
  console.log(JSON.stringify(result));
} finally { await context.close(); await browser.close(); }

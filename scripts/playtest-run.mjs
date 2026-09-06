import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// End-to-end route/combat probe. The page context is read-only: no teleport,
// damage/health/cooldown injection, enemy removal or hidden stage commands.
const tag = process.argv[2] ?? 'v06';
const requestedFps = Number(process.argv[3] ?? 0);
if (requestedFps && ![30, 60, 120].includes(requestedFps)) throw new Error('Supported probe frequencies: 30, 60, 120');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], samples = [], held = new Set();
const read = () => page.evaluate(() => {
  const s = window.__GAME__.scene.getScene('Game');
  return { t: s.rules.elapsed, mode: s.rules.mode, stage: s.rules.stage, hp: s.rules.hp, maxHp: s.rules.maxHp,
    flasks: s.rules.flasks, kills: s.rules.kills, weapon: s.rules.weaponLevel, healing: s.rules.healing,
    cache: s.rules.cacheChoiceOpen, ready: s.rules.dashReady, exit: s.level.exitX,
    p: { x: s.player.x, y: s.player.y, ground: s.player.grounded, dash: s.player.isDashing },
    enemies: s.enemies.getChildren().map(e => ({ id: e.id, kind: e.kind, x: e.x, y: e.y, hp: e.hp,
      phase: e.state, facing: e.attackFacing, attack: e.attackProfile?.attack, enraged: e.enraged })),
    hz: window.__GAME__.loop.actualFps, objects: s.children.length, bodies: s.physics.world.bodies.size,
    particles: s.children.getChildren().filter(c => c.type === 'ParticleEmitter').reduce((n, e) => n + e.getAliveParticleCount(), 0) };
});
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
async function key(code, down) {
  if (down && !held.has(code)) { await page.keyboard.down(code); held.add(code); }
  if (!down && held.has(code)) { await page.keyboard.up(code); held.delete(code); }
}
async function move(dir) { await key('KeyD', dir > 0); await key('KeyA', dir < 0); }
async function until(fn, timeout = 18000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const s = await read(); if (fn(s)) return s;
    if (s.mode !== 'playing') throw new Error(`Route ended in ${s.mode}`);
    await page.waitForTimeout(25);
  }
  throw new Error(`Route timeout: ${JSON.stringify(await read())}`);
}
async function go(x) {
  const s = await read(), dir = x > s.p.x ? 1 : -1;
  await move(dir); await until(s => (x - s.p.x) * dir < 3); await move(0);
}
async function doubleJump() {
  await key('Space', true); await page.waitForTimeout(350); await key('Space', false);
  await page.waitForTimeout(35); await key('Space', true); await page.waitForTimeout(350); await key('Space', false);
  await until(s => s.p.ground, 3000);
}
let lastAttack = -1000, observedWindup = null, observedAt = 0, routeDone = false, lastStage = 0;
try {
  await mkdir('.artifacts', { recursive: true });
  if (requestedFps) await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch(), original = await response.text();
    const body = original.replace('pixelArt: true,', `fps: { target: ${requestedFps}, forceSetTimeOut: true, smoothStep: false }, pixelArt: true,`);
    if (body === original) throw new Error('Cannot configure native Phaser probe frequency');
    await route.fulfill({ response, body });
  });
  await page.goto('http://127.0.0.1:5173'); await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await until(s => s.p.ground);
  const deadline = Date.now() + 210000;
  let lastSample = -1000;
  while (Date.now() < deadline) {
    const s = await read();
    if (s.t - lastSample > 1000) { samples.push(s); lastSample = s.t; }
    if (s.stage !== lastStage) {
      console.log(JSON.stringify({ milestone: 'stage', stage: s.stage, hp: s.hp, kills: s.kills, elapsed: s.t }));
      await page.screenshot({ path: `.artifacts/${tag}-run-stage-${s.stage}.png` }); lastStage = s.stage;
    }
    if (s.mode !== 'playing') break;
    if (s.p.dash || s.healing) { await page.waitForTimeout(25); continue; }
    if (s.hp <= s.maxHp - 35 && s.flasks > 0 && !s.enemies.some(e => Math.hypot(e.x - s.p.x, e.y - s.p.y) < 240)) {
      await move(0); await page.keyboard.press('KeyQ', { delay: 25 }); await page.waitForTimeout(800); continue;
    }
    const target = s.enemies.filter(e => Math.abs(e.y - s.p.y) < 65)
      .sort((a, b) => Math.abs(a.x - s.p.x) - Math.abs(b.x - s.p.x))[0];
    if (!target) {
      if (s.stage === 0 && s.enemies.length && !routeDone) {
        await go(720); await doubleJump();
        await go(790); await page.keyboard.press('KeyE', { delay: 25 });
        await page.getByRole('button', { name: /УРОН/ }).click();
        await move(1); await key('Space', true); await page.waitForTimeout(250); await move(0);
        await page.waitForTimeout(130); await key('Space', false); await until(s => s.p.ground, 2500);
        routeDone = true;
        console.log(JSON.stringify({ milestone: 'roof reached by keyboard', state: await read() }));
      } else if (!s.enemies.length) {
        await go(s.exit); await page.keyboard.press('KeyE', { delay: 30 }); await page.waitForTimeout(100);
      } else {
        const e = s.enemies[0]; await go(e.x); await doubleJump();
      }
      continue;
    }
    const dx = target.x - s.p.x, dir = dx < 0 ? -1 : 1;
    if (target.phase === 'windup') {
      if (observedWindup !== target.id) { observedWindup = target.id; observedAt = s.t; }
      if (s.ready && s.t - observedAt > 200 && Math.abs(dx) < 66) {
        await move(dir); await page.keyboard.press('ShiftLeft', { delay: 25 });
      } else if (Math.abs(dx) > 65) await move(dir);
      else await move(s.ready ? 0 : -dir);
    } else if (target.phase === 'active') {
      observedWindup = null;
      await move(target.facing === -dir ? 0 : -dir);
    } else {
      observedWindup = null;
      if (Math.abs(dx) > 37) await move(dir);
      else {
        await move(dir); await page.waitForTimeout(18); await move(0);
        if (s.t - lastAttack > 170) { await page.keyboard.press('KeyJ', { delay: 25 }); lastAttack = s.t; }
      }
    }
    await page.waitForTimeout(25);
  }
  await move(0); await key('Space', false);
  const result = await read();
  await page.screenshot({ path: `.artifacts/${tag}-run-outcome.png` });
  const report = { noGameplayMutations: true, requestedFps: requestedFps || 'native RAF', result, errors, samples };
  await writeFile(`.artifacts/${tag}-run.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: result.mode === 'won', noMutations: true, result, errors }));
  if (result.mode !== 'won' || errors.length) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  await page.screenshot({ path: `.artifacts/${tag}-run-failure.png` });
  await writeFile(`.artifacts/${tag}-run.json`, JSON.stringify({ failure: error.message, state: await read(), errors, samples }, null, 2));
  process.exitCode = 1;
} finally { await browser.close(); }

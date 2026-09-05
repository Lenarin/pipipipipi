import { chromium } from '@playwright/test';

// Isolated boss fixture: placement and other-enemy removal only.
// After setup, all fighting is ordinary keyboard input; no HP/immunity/cooldown mutation.
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const held = new Set();
const read = () => page.evaluate(() => {
  const s = window.__GAME__.scene.getScene('Game');
  const e = s.enemies.getChildren().find(e => e.kind === 'boss');
  return { t: s.rules.elapsed, hp: s.rules.hp, mode: s.rules.mode, x: s.player.x, dash: s.player.isDashing,
    ready: s.rules.dashReady, boss: e ? { x: e.x, hp: e.hp, phase: e.state, attack: e.attackProfile?.attack, facing: e.attackFacing, enraged: e.enraged } : null };
});
async function move(direction) {
  for (const [key, wanted] of [['KeyD', direction > 0], ['KeyA', direction < 0]]) {
    if (wanted && !held.has(key)) { await page.keyboard.down(key); held.add(key); }
    if (!wanted && held.has(key)) { await page.keyboard.up(key); held.delete(key); }
  }
}
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    s.rules.stage = 2; s.buildStage(2); s.bossActivated = true;
    const boss = s.enemies.getChildren().find(e => e.kind === 'boss');
    [...s.enemies.getChildren()].forEach(e => { if (e !== boss) e.destroy(); });
    s.player.body.reset(boss.x - 90, 275);
  });
  let lastAttack = -1000;
  let windupAt = null;
  const seen = new Set();
  const deadline = Date.now() + 55000;
  while (Date.now() < deadline) {
    const s = await read();
    const e = s.boss;
    if (!e || s.mode !== 'playing') break;
    const dx = e.x - s.x;
    const dir = dx < 0 ? -1 : 1;
    seen.add(`${e.attack ?? 'idle'}:${e.phase}:${e.enraged ? 'enraged' : 'normal'}`);
    if (s.dash) { await page.waitForTimeout(25); continue; }
    if (e.phase === 'windup') {
      windupAt ??= s.t;
      if (s.ready && s.t - windupAt > 200 && Math.abs(dx) < 65) {
        await move(dir);
        await page.keyboard.press('ShiftLeft', { delay: 30 });
      } else await move(Math.abs(dx) > 35 ? dir : 0);
    } else if (e.phase === 'active') {
      windupAt = null;
      // On the safe rear side, don't chase back into the committed wave.
      await move(e.facing === -dir ? -dir : 0);
    } else {
      windupAt = null;
      if (Math.abs(dx) > 40) await move(dir);
      else {
        await move(dir); await page.waitForTimeout(18); await move(0);
        if (s.t - lastAttack > 160) { await page.keyboard.press('KeyJ', { delay: 25 }); lastAttack = s.t; }
      }
    }
    await page.waitForTimeout(25);
  }
  await move(0);
  const outcome = await read();
  await page.screenshot({ path: '.artifacts/v03-boss-fight-outcome.png' });
  console.log(JSON.stringify({ fixture: 'port placement only; natural input thereafter; no health/immunity/cooldown mutation', passed: !outcome.boss && outcome.mode === 'playing', outcome, seen: [...seen], errors }));
  if (outcome.boss || errors.length) process.exitCode = 1;
} finally { await browser.close(); }

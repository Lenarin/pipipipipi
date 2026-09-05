import { chromium } from '@playwright/test';

// Explicit encounter fixture, not a natural route/difficulty claim.
// Enter the port, isolate boss and place the hero; do not alter health or grant immunity.
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    s.rules.stage = 2; s.buildStage(2); s.bossActivated = true;
    const boss = s.enemies.getChildren().find(e => e.kind === 'boss');
    s.enemies.getChildren().forEach(e => { if (e !== boss) e.setActive(false).setVisible(false); });
    s.player.body.reset(boss.x - 90, 275);
  });
  const phases = [];
  for (const [attack, phase] of [['boss-slam', 'windup'], ['boss-slam', 'active'], ['boss-slam', 'recovery'], ['boss-volley', 'windup'], ['boss-volley', 'recovery']]) {
    await page.waitForFunction(({ attack, phase }) => {
      const e = window.__GAME__.scene.getScene('Game').enemies.getChildren().find(e => e.kind === 'boss');
      return e.state === phase && e.attackProfile?.attack === attack;
    }, { attack, phase }, { timeout: 7000, polling: 'raf' });
    phases.push(await page.evaluate(() => {
      const s = window.__GAME__.scene.getScene('Game');
      const e = s.enemies.getChildren().find(e => e.kind === 'boss');
      return { attack: e.attackProfile.attack, phase: e.state, playerHp: s.rules.hp, shots: s.projectiles.countActive(true) };
    }));
    await page.screenshot({ path: `.artifacts/v03-${attack}-${phase}.png` });
  }
  console.log(JSON.stringify({ fixture: 'isolated port boss; position setup only, no HP/immunity modifications', phases, errors }));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }

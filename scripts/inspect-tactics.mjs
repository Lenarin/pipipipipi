import { chromium } from '@playwright/test';

// Kick and weapon capture use ordinary input only. Cache UI uses an explicitly
// separate position fixture, not a claim of natural platform traversal.
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const read = () => page.evaluate(() => {
  const s = window.__GAME__.scene.getScene('Game');
  const e = s.enemies.getChildren().find(e => e.id === 'yard-walker-1');
  return { x: s.player.x, hp: s.rules.hp, weapon: 'pipe',
    abilityReady: s.rules.abilityReady, kick: s.kick.active,
    enemy: { x: e.x, hp: e.hp, state: e.state }, attack: s.attack.state.phase };
});
async function until(predicate, timeout = 6000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await read();
    if (predicate(state)) return state;
    await page.waitForTimeout(20);
  }
  throw new Error(`Condition timed out: ${JSON.stringify(await read())}`);
}
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await page.keyboard.down('KeyD');
  const before = await until(s => s.enemy.state === 'windup' && s.enemy.x - s.x < 44);
  await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyF', { delay: 30 });
  const kicked = await until(s => s.enemy.state === 'stagger', 1000);
  await page.screenshot({ path: '.artifacts/tactics-v03-kick.png' });
  if (kicked.abilityReady || kicked.enemy.state !== 'stagger' || kicked.hp !== 100) {
    throw new Error(`Kick failed: ${JSON.stringify({ before, kicked })}`);
  }
  await until(s => !s.kick);
  await page.keyboard.press('KeyJ', { delay: 30 });
  await until(s => s.attack === 'windup');
  await page.screenshot({ path: '.artifacts/tactics-v04-pipe.png' });
  const weaponLabel = await page.locator('#weapon-label').innerText();
  if (!weaponLabel.includes('ТРУБА')) throw new Error(`Missing pipe label: ${weaponLabel}`);

  // From here onwards this is a cache position fixture.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /НАЧАТЬ ЗАНОВО/ }).click();
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    const cache = s.caches[0];
    s.player.body.reset(cache.data.x, cache.data.y);
  });
  await page.keyboard.press('KeyE', { delay: 35 });
  await page.locator('#cache-choice').waitFor({ state: 'visible' });
  await page.screenshot({ path: '.artifacts/tactics-v03-cache-desktop.png' });
  await page.setViewportSize({ width: 680, height: 500 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: '.artifacts/tactics-v03-cache-small.png' });
  const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
    buttons: ['cache-damage', 'cache-health', 'cache-cancel'].map(id => {
      const r = document.getElementById(id).getBoundingClientRect();
      return { id, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }) }));
  if (layout.scroll > layout.width || layout.buttons.some(b => b.left < 0 || b.right > 680 || b.top < 0 || b.bottom > 500)) {
    throw new Error(`Small UI is clipped: ${JSON.stringify(layout)}`);
  }
  await page.locator('#cache-health').click();
  await page.waitForTimeout(100);
  const afterChoice = await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    return { maxHp: s.rules.maxHp, open: s.rules.cacheChoiceOpen, attack: s.attack.state.phase, paused: s.physics.world.isPaused };
  });
  if (afterChoice.maxHp !== 120 || afterChoice.open || afterChoice.paused || afterChoice.attack !== 'idle') {
    throw new Error(`Choice failed: ${JSON.stringify(afterChoice)}`);
  }
  if (errors.length) throw new Error(JSON.stringify(errors));
  console.log(JSON.stringify({ passed: true, naturalKick: { before, kicked }, weaponLabel, cachePositionFixture: true, layout, afterChoice, errors }));
} catch (error) {
  console.error(error.message);
  await page.screenshot({ path: '.artifacts/tactics-v03-failure.png' });
  process.exitCode = 1;
} finally {
  await browser.close();
}

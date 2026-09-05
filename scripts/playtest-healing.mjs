import { chromium } from '@playwright/test';

// Natural input: receive a real enemy hit, create distance, try interrupted and completed healing.
// evaluate reads only; no fixture HP, AI, immunity, cooldown or position modifications.
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const read = () => page.evaluate(() => {
  const s = window.__GAME__.scene.getScene('Game');
  return { hp: s.rules.hp, flasks: s.rules.flasks, x: s.player.x, mode: s.rules.mode,
    enemy: s.enemies.getChildren().find(e => e.id === 'yard-walker-1')?.x };
});
async function until(predicate, timeout = 6000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await read();
    if (predicate(state)) return state;
    await page.waitForTimeout(25);
  }
  throw new Error(`Condition timed out: ${JSON.stringify(await read())}`);
}
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await page.keyboard.down('KeyD');
  await until(s => s.x > 396);
  await page.keyboard.up('KeyD');
  await until(s => s.hp < 100);
  await page.keyboard.down('KeyA');
  await until(s => s.enemy - s.x > 200);
  await page.keyboard.up('KeyA');
  const before = await read();
  await page.keyboard.press('KeyQ', { delay: 30 });
  await page.waitForTimeout(180);
  const channel = await read();
  if (channel.hp !== before.hp || channel.flasks !== before.flasks) throw new Error(`Healing was immediate: ${JSON.stringify({ before, channel })}`);
  await page.screenshot({ path: '.artifacts/healing-v03-channel.png' });
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(140);
  await page.keyboard.up('KeyA');
  await page.waitForTimeout(400);
  const cancelled = await read();
  if (cancelled.hp !== before.hp || cancelled.flasks !== before.flasks) throw new Error('Movement did not cancel the heal without spending a flask');
  await page.keyboard.press('KeyQ', { delay: 30 });
  await until(s => s.hp > before.hp, 1800);
  const completed = await read();
  if (completed.flasks !== before.flasks - 1) throw new Error('Completed heal did not consume exactly one flask');
  await page.screenshot({ path: '.artifacts/healing-v03-completed.png' });
  if (errors.length) throw new Error(JSON.stringify(errors));
  console.log(JSON.stringify({ passed: true, noMutations: true, before, channel, cancelled, completed, errors }));
} catch (error) {
  console.error(error.message);
  await page.screenshot({ path: '.artifacts/healing-v03-failure.png' });
  process.exitCode = 1;
} finally {
  await browser.close();
}

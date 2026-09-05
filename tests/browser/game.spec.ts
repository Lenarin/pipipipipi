import { expect, test } from '@playwright/test';
test('loads the local Phaser game and starts with healthy hero', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ })).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#health-label')).toHaveText('100 / 100');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Пауза' })).toBeVisible();
  await page.getByRole('button', { name: /ПРОДОЛЖИТЬ/ }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  expect(errors).toEqual([]);
});

async function start(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
}
async function playerState(page: import('@playwright/test').Page) {
  return page.evaluate(() => { const s = (window as any).__GAME__.scene.getScene('Game'); return { x: s.player.x, y: s.player.y, vy: s.player.body.velocity.y, grounded: s.player.grounded, hp: s.rules.hp, mode: s.rules.mode, elapsed: s.rules.elapsed }; });
}
test('movement, double jump, landing and dash use the real Arcade body', async ({ page }) => {
  await start(page);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(500); await page.keyboard.up('KeyD');
  expect((await playerState(page)).x).toBeGreaterThan(185);
  await page.keyboard.press('Space', { delay: 40 }); await page.waitForTimeout(120);
  const first = await playerState(page); expect(first.y).toBeLessThan(275);
  await page.keyboard.press('Space', { delay: 40 }); await page.waitForTimeout(120);
  const second = await playerState(page); expect(second.y).toBeLessThan(first.y - 20);
  await page.keyboard.press('Space', { delay: 40 }); await page.waitForTimeout(120);
  expect((await playerState(page)).vy).toBeGreaterThan(-180);
  await expect.poll(async () => (await playerState(page)).grounded).toBe(true);
  const before = (await playerState(page)).x;
  await page.keyboard.press('ShiftLeft', { delay: 40 }); await page.waitForTimeout(160);
  expect((await playerState(page)).x).toBeGreaterThan(before + 45);
  await expect(page.locator('#dash-label')).toHaveText(/ВОССТАНОВЛЕНИЕ/);
});

test('keyboard pause, blur and restart clear held movement and freeze the run', async ({ page }) => {
  await start(page);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(100);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading', { name: 'Пауза' })).toBeVisible();
  const paused = await playerState(page);
  await page.waitForTimeout(200);
  expect((await playerState(page)).elapsed).toBe(paused.elapsed);
  await page.keyboard.up('KeyD'); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.keyboard.press('Escape', { delay: 40 });
  await expect(page.locator('#overlay')).toBeHidden();
  await page.waitForTimeout(200);
  expect(Math.abs((await playerState(page)).x - paused.x)).toBeLessThan(5);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'НАЧАТЬ ЗАНОВО' }).click();
  await expect(page.locator('#health-label')).toHaveText('100 / 100');
  expect((await playerState(page)).x).toBeCloseTo(110, 0);
});

test('upper courtyard platform and its health cache are reachable by jumping', async ({ page }) => {
  await start(page);
  // Immunity isolates route validation; the entire street-to-balcony traversal uses real input.
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.grantImmunity(10000));
  await page.keyboard.down('KeyD'); await page.waitForTimeout(2700); await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyD');
  await page.keyboard.press('Space', { delay: 40 }); await page.waitForTimeout(200);
  await page.keyboard.press('Space', { delay: 40 }); await page.waitForTimeout(310);
  await page.keyboard.up('KeyD');
  await expect.poll(async () => { const p = await playerState(page); return p.grounded && p.y < 215; }, { timeout: 2500 }).toBe(true);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(330); await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyE', { delay: 40 });
  await page.getByRole('button', { name: /ЗДОРОВЬЕ \+20/ }).click();
  await expect(page.locator('#health-label')).toHaveText('120 / 120');
});

test('small viewport has no horizontal overflow and settings stay operable', async ({ page }) => {
  await page.setViewportSize({ width: 680, height: 500 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#sound-button').click();
  await expect(page.locator('#sound-button')).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: '.artifacts/small.png' });
});

test('balcony leads to the rooftop encounter without losing the street from view', async ({ page }) => {
  await start(page);
  await expect(page.locator('#chapter-label')).toHaveText('01 / ДВОР БЕЗ ГАРАНТИЙ');
  // Start on the established balcony; reach the higher roof using only real jump input.
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    s.rules.grantImmunity(10000);
    s.player.body.reset(775, 174);
  });
  await expect.poll(async () => (await playerState(page)).grounded).toBe(true);
  await page.keyboard.down('KeyD');
  await page.keyboard.press('Space', { delay: 40 });
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyD');
  await expect.poll(async () => { const p = await playerState(page); return p.grounded && p.y < 140; }).toBe(true);
  const view = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    const e = s.enemies.getChildren().find((e: any) => e.id === 'yard-spitter-1');
    return { enemyY: e.y, bottom: s.cameras.main.worldView.bottom, top: s.cameras.main.worldView.top };
  });
  expect(view.enemyY).toBeLessThan(150);
  expect(view.bottom).toBeGreaterThanOrEqual(312);
  expect(view.top).toBeLessThan(85);
  await page.screenshot({ path: '.artifacts/rooftop-v02.png' });
});

test('melee kills a real enemy, healing updates UI, and enemy damage leads to clean replay', async ({ page }) => {
  await start(page);
  for (let n = 0; n < 4; n++) {
    const exists = await page.evaluate(() => { const s = (window as any).__GAME__.scene.getScene('Game'); const e = s.enemies.getChildren().find((e: any) => e.id === 'yard-walker-1'); if (!e) return false; s.player.body.reset(e.x - 42, Math.min(e.y - 8, 280)); return true; });
    if (!exists) break;
    await page.keyboard.press('KeyJ', { delay: 40 }); await page.waitForTimeout(250);
  }
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.kills)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').attack.state.phase)).toBe('idle');
  await page.evaluate(() => { (window as any).__GAME__.scene.getScene('Game').rules.hp = 40; });
  await page.keyboard.press('KeyQ', { delay: 40 });
  await expect(page.locator('#health-label')).toHaveText('75 / 100', { timeout: 1600 });
  await page.evaluate(() => { const s = (window as any).__GAME__.scene.getScene('Game'); const e = s.enemies.getChildren()[0]; s.rules.hp = 1; s.player.body.reset(e.x - 35, Math.min(e.y - 8, 280)); });
  await expect(page.getByRole('heading', { name: 'Не в эту ночь.' })).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: /ЕЩЁ ОДНА НОЧЬ/ }).click();
  await expect(page.locator('#health-label')).toHaveText('100 / 100');
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.kills)).toBe(0);
});

test('all three stage gates, boss combat, victory and replay work together', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await start(page);
  // Controlled encounter fixtures isolate progression: ordinary attacks still deal every point of damage.
  // Movement/jumps and damage vulnerability are tested separately above; this isn't a difficulty benchmark.
  for (let stage = 0; stage < 3; stage++) {
    await page.evaluate(() => { const s = (window as any).__GAME__.scene.getScene('Game'); s.rules.grantImmunity(120000); s.player.body.reset(s.level.exitX, 285); });
    await page.keyboard.press('KeyE', { delay: 40 });
    expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.stage)).toBe(stage);
    const ids = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').enemies.getChildren().map((e: any) => e.id));
    for (const id of ids) {
      let alive = true;
      for (let swing = 0; swing < 30 && alive; swing++) {
        alive = await page.evaluate((id: string) => { const s = (window as any).__GAME__.scene.getScene('Game'); const e = s.enemies.getChildren().find((e: any) => e.id === id); if (!e) return false; s.player.body.reset(e.x - 40, Math.min(e.y - 8, 280)); s.player.facing = 1; return true; }, id);
        if (!alive) break;
        await page.keyboard.press('KeyJ', { delay: 40 }); await page.waitForTimeout(240);
      }
      expect(alive, `${id} should be defeated by melee`).toBe(false);
    }
    await page.evaluate(() => { const s = (window as any).__GAME__.scene.getScene('Game'); s.player.body.reset(s.level.exitX, 285); });
    await page.keyboard.press('KeyE', { delay: 40 });
    if (stage < 2) await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.stage)).toBe(stage + 1);
  }
  await expect(page.getByRole('heading', { name: 'Утро наступило.' })).toBeVisible();
  await page.screenshot({ path: '.artifacts/victory.png' });
  await page.getByRole('button', { name: /ЕЩЁ ОДНА НОЧЬ/ }).click();
  await expect(page.locator('#health-label')).toHaveText('100 / 100');
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.stage)).toBe(0);
  expect(errors).toEqual([]);
});

import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
});

test('defeat removes gameplay body and awards once while a full-body collapse continues', async ({ page }) => {
  const initial = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'), e = s.enemies.getChildren()[0];
    const count = s.enemies.countActive(true), kills = s.rules.kills;
    e.receiveHit(1000, 1, true); s.damageEnemy(e, 1000); s.damageEnemy(e, 1000);
    const remains = s.children.getByName('enemy-remains');
    return { count: s.enemies.countActive(true), previousCount: count, kills: s.rules.kills - kills,
      remains: Boolean(remains), body: Boolean(remains?.body), frame: remains?.frame.name, animation: remains?.anims.currentAnim?.key };
  });
  expect(initial.count).toBe(initial.previousCount - 1); expect(initial.kills).toBe(1);
  expect(initial.remains).toBe(true); expect(initial.body).toBe(false);
  expect(initial.frame).toBe(52); expect(initial.animation).toBe('walker-death');
  await page.waitForTimeout(240);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').children.getByName('enemy-remains')?.frame.name)).toBeGreaterThan(52);
  await expect.poll(() => page.evaluate(() => Boolean((window as any).__GAME__.scene.getScene('Game').children.getByName('enemy-remains')))).toBe(false);
});

test('pause freezes collapse and restart clears transient remains', async ({ page }) => {
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'), e = s.enemies.getChildren()[0];
    e.receiveHit(1000); s.damageEnemy(e, 1000);
  });
  await page.keyboard.press('Escape');
  const before = await page.evaluate(() => { const r = (window as any).__GAME__.scene.getScene('Game').children.getByName('enemy-remains'); return { frame: r?.frame.name, alpha: r?.alpha }; });
  expect(before.frame).toBeDefined();
  await page.waitForTimeout(450);
  expect(await page.evaluate(() => { const r = (window as any).__GAME__.scene.getScene('Game').children.getByName('enemy-remains'); return { frame: r?.frame.name, alpha: r?.alpha }; })).toEqual(before);
  await page.getByRole('button', { name: 'НАЧАТЬ ЗАНОВО' }).click();
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').children.getChildren().filter((c: any) => c.name === 'enemy-remains').length)).toBe(0);
  await page.waitForTimeout(900);
  await expect(page.locator('#health-label')).toHaveText('100 / 100');
});

test('an airborne defeated enemy settles visually on the surface below, not in midair', async ({ page }) => {
  const initial = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'), e = s.enemies.getChildren()[0];
    e.body.reset(450, 180); e.body.updateFromGameObject();
    e.receiveHit(1000); s.damageEnemy(e, 1000);
    const r = s.children.getByName('enemy-remains');
    return { y: r.y, ground: s.level.groundY };
  });
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').children.getByName('enemy-remains').y)).toBeGreaterThan(initial.y + 20);
  await page.waitForTimeout(230);
  const settled = await page.evaluate(() => {
    const r = (window as any).__GAME__.scene.getScene('Game').children.getByName('enemy-remains');
    return { feet: r.y + (112 - r.originY * 128) * r.scaleY, body: Boolean(r.body) };
  });
  expect(settled.feet).toBeCloseTo(initial.ground, 0);
  expect(settled.body).toBe(false);
});

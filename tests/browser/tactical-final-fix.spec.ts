import { expect, test, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
}

async function openFirstCache(page: Page) {
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const cache = scene.caches[0];
    scene.player.body.reset(cache.data.x, cache.data.y);
    scene.__pauseProbe = 0;
    scene.time.delayedCall(80, () => { scene.__pauseProbe++; });
  });
  await page.keyboard.press('KeyE', { delay: 35 });
  await expect(page.getByRole('group', { name: 'Выбор тайника' })).toBeVisible();
}

test('cache cancel after the pause button cannot resume physics or timers', async ({ page }) => {
  await start(page);
  await openFirstCache(page);
  await page.locator('#pause-button').click();
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').handleCommand('cache-cancel'));
  await page.waitForTimeout(160);

  expect(await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return { mode: scene.rules.mode, cacheOpen: scene.rules.cacheChoiceOpen, physics: scene.physics.world.isPaused, time: scene.time.paused, delayed: scene.__pauseProbe };
  })).toEqual({ mode: 'paused', cacheOpen: false, physics: true, time: true, delayed: 0 });
});

test('cache choice after blur cannot apply an upgrade or thaw the focused pause', async ({ page }) => {
  await start(page);
  await openFirstCache(page);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').handleCommand('cache-health'));
  await page.waitForTimeout(160);

  expect(await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return { mode: scene.rules.mode, cacheOpen: scene.rules.cacheChoiceOpen, physics: scene.physics.world.isPaused, time: scene.time.paused, delayed: scene.__pauseProbe, maxHp: scene.rules.maxHp, flasks: scene.rules.flasks };
  })).toEqual({ mode: 'paused', cacheOpen: false, physics: true, time: true, delayed: 0, maxHp: 100, flasks: 2 });
});

test('stage transition cancels a real healing channel before the new stage can spend it', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    scene.enemies.getChildren().forEach((enemy: any) => enemy.destroy());
    scene.rules.hp = 40;
  });
  await page.keyboard.press('KeyQ', { delay: 25 });
  await page.waitForTimeout(300);
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.healing)).toBe(true);
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    scene.player.body.reset(scene.level.exitX, 285);
  });
  await page.keyboard.press('KeyE', { delay: 35 });
  await page.waitForTimeout(600);

  expect(await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return { stage: scene.rules.stage, healing: scene.rules.healing, hp: scene.rules.hp, flasks: scene.rules.flasks };
  })).toEqual({ stage: 1, healing: false, hp: 40, flasks: 2 });
});

test('stage transition clears a live kick and queued player movement actions', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    scene.enemies.getChildren().forEach((enemy: any) => enemy.destroy());
    scene.player.body.reset(scene.level.exitX, 285);
  });
  await page.keyboard.press('KeyF', { delay: 20 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').kick.active)).toBe(true);
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').dashBufferMs = 120);
  await page.keyboard.press('KeyE', { delay: 25 });

  expect(await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return { stage: scene.rules.stage, kick: scene.kick.active, dashing: scene.player.isDashing, dashBuffered: scene.dashBufferMs > 0 };
  })).toEqual({ stage: 1, kick: false, dashing: false, dashBuffered: false });
});

test('enemy health and time-to-impact bars render in separate vertical lanes', async ({ page }) => {
  await start(page);
  const lanes = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const enemy = scene.enemies.getChildren().find((item: any) => item.id === 'yard-walker-1');
    enemy.body.reset(scene.player.x + 40, scene.player.y);
    enemy.activate();
    enemy.cooldownMs = 0;
    enemy.updateAi(scene.player, 16, true, true);
    scene.updateEnemyHealthBar(enemy);
    const presentation = scene.enemyPresentations.get(enemy.id);
    const cueRows: Array<{ y: number; height: number }> = [];
    const healthRows: Array<{ y: number; height: number }> = [];
    const cueFill = presentation.cue.fillRect.bind(presentation.cue);
    presentation.cue.fillRect = (x: number, y: number, width: number, height: number) => { cueRows.push({ y, height }); return cueFill(x, y, width, height); };
    const health = enemy.getData('healthBar');
    const healthFill = health.fillRect.bind(health);
    health.fillRect = (x: number, y: number, width: number, height: number) => { healthRows.push({ y, height }); return healthFill(x, y, width, height); };
    presentation.update(enemy);
    scene.updateEnemyHealthBar(enemy);
    return {
      cueBottom: Math.max(...cueRows.map((row) => row.y + row.height)),
      healthTop: Math.min(...healthRows.map((row) => row.y)),
    };
  });

  expect(lanes.healthTop - lanes.cueBottom).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: '.artifacts/timing-health-lanes-v03.png' });
});

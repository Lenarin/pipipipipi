import { expect, test, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
}

test('Q channels healing, movement cancels it for free, and completion spends one flask', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { (window as any).__GAME__.scene.getScene('Game').rules.hp = 40; });

  await page.keyboard.press('KeyQ', { delay: 25 });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => {
    const rules = (window as any).__GAME__.scene.getScene('Game').rules;
    return { hp: rules.hp, flasks: rules.flasks, healing: rules.healing };
  })).toEqual({ hp: 40, flasks: 2, healing: true });
  await expect(page.locator('#heal-label')).toContainText('ЛЕЧЕНИЕ');

  await page.keyboard.press('KeyA', { delay: 40 });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => {
    const rules = (window as any).__GAME__.scene.getScene('Game').rules;
    return { hp: rules.hp, flasks: rules.flasks, healing: rules.healing };
  })).toEqual({ hp: 40, flasks: 2, healing: false });

  await page.keyboard.press('KeyQ', { delay: 25 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.hp)).toBe(75);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.flasks)).toBe(1);
});

test('R changes the readable weapon and a heavy live swing keeps its committed profile', async ({ page }) => {
  await start(page);
  await expect(page.locator('#weapon-label')).toContainText('ТРУБА');
  await page.keyboard.press('KeyR', { delay: 35 });
  await expect(page.locator('#weapon-label')).toContainText('КУВАЛДА');
  await page.keyboard.press('KeyJ', { delay: 35 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').attack.activeWeapon)).toBe('heavy');

  await page.keyboard.press('KeyR', { delay: 35 });
  expect(await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return { selected: scene.rules.currentWeapon, active: scene.attack.activeWeapon, reach: scene.attack.currentProfile.reach };
  })).toEqual({ selected: 'pipe', active: 'heavy', reach: 96 });
});

test('a dash requested during the heavy active stroke waits for recovery and then fires', async ({ page }) => {
  await start(page);
  await page.keyboard.press('KeyR', { delay: 35 });
  await page.keyboard.press('KeyJ', { delay: 35 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').attack.state.phase)).toBe('active');
  await page.keyboard.down('KeyD');
  await page.keyboard.press('ShiftLeft', { delay: 30 });
  const committed = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return { phase: scene.attack.state.phase, dashing: scene.player.isDashing, buffered: scene.dashBufferMs > 0 };
  });
  expect(committed).toEqual({ phase: 'active', dashing: false, buffered: true });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.isDashing), { timeout: 700 }).toBe(true);
  await page.keyboard.up('KeyD');
});

test('a buffered heavy dash does not erase hitstop before its legal cancel window', async ({ page }) => {
  await start(page);
  await page.keyboard.press('KeyR', { delay: 35 });
  await page.keyboard.press('KeyJ', { delay: 35 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').attack.state.phase)).toBe('active');
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').beginHitStop(240));
  await page.keyboard.press('ShiftLeft', { delay: 30 });
  await page.waitForTimeout(50);

  expect(await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return { hitStop: scene.hitStopActive, dashing: scene.player.isDashing, buffered: scene.dashBufferMs > 0 };
  })).toEqual({ hitStop: true, dashing: false, buffered: true });
});

test('F cannot bypass a committed heavy active stroke or spend its cooldown', async ({ page }) => {
  await start(page);
  await page.keyboard.press('KeyR', { delay: 35 });
  await page.keyboard.press('KeyJ', { delay: 35 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').attack.state.phase)).toBe('active');
  await page.keyboard.press('KeyF', { delay: 10 });

  expect(await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return { weapon: scene.attack.activeWeapon, phase: scene.attack.state.phase, kick: scene.kick.active, abilityReady: scene.rules.abilityReady };
  })).toEqual({ weapon: 'heavy', phase: 'active', kick: false, abilityReady: true });
});

test('Q refuses to start during an attack, dash, kick, or already-held movement', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { (window as any).__GAME__.scene.getScene('Game').rules.hp = 40; });

  await page.keyboard.press('KeyJ', { delay: 30 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').attack.state.phase)).not.toBe('idle');
  await page.keyboard.press('KeyQ', { delay: 20 });
  const duringAttack = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.healing);

  await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').cancelAttack());
  await page.keyboard.press('ShiftLeft', { delay: 30 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.isDashing)).toBe(true);
  await page.keyboard.press('KeyQ', { delay: 20 });
  const duringDash = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.healing);

  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.isDashing)).toBe(false);
  await page.keyboard.press('KeyF', { delay: 20 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').kick.active)).toBe(true);
  await page.keyboard.press('KeyQ', { delay: 20 });
  const duringKick = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.healing);

  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').kick.active)).toBe(false);
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(30);
  await page.keyboard.press('KeyQ', { delay: 20 });
  const duringMovement = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.healing);
  await page.keyboard.up('KeyA');

  expect({ duringAttack, duringDash, duringKick, duringMovement }).toEqual({ duringAttack: false, duringDash: false, duringKick: false, duringMovement: false });
  expect(await page.evaluate(() => {
    const rules = (window as any).__GAME__.scene.getScene('Game').rules;
    return { hp: rules.hp, flasks: rules.flasks };
  })).toEqual({ hp: 40, flasks: 2 });
});

test('F shows a connecting kick and interrupts an ordinary enemy windup', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    scene.enemies.getChildren().forEach((enemy: any) => { if (enemy !== walker) enemy.setActive(false).setVisible(false); });
    scene.player.body.reset(400, 276);
    walker.body.reset(445, 276);
    walker.activate();
    walker.cooldownMs = 0;
    walker.updateAi(scene.player, 16, true, true);
  });
  expect(await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1').state;
  })).toBe('windup');

  await page.keyboard.press('KeyF', { delay: 30 });
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    const bounds = scene.combatEffects.kickBounds;
    return { state: walker.state, visibleWidth: bounds?.width ?? 0, ready: scene.rules.abilityReady };
  })).toMatchObject({ state: 'stagger', ready: false });
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').combatEffects.kickBounds?.width ?? 0)).toBeGreaterThan(40);
});

test('cache tray pauses combat, applies one keyboard choice, and resets on replay', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const cache = scene.caches[0];
    scene.player.body.reset(cache.data.x, cache.data.y);
  });
  await page.keyboard.press('KeyE', { delay: 35 });
  await expect(page.getByRole('group', { name: 'Выбор тайника' })).toBeVisible();
  expect(await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return { mode: scene.rules.mode, paused: scene.physics.world.isPaused };
  })).toEqual({ mode: 'playing', paused: true });

  await page.keyboard.press('Digit1');
  await expect(page.getByRole('group', { name: 'Выбор тайника' })).toBeHidden();
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.weaponLevel)).toBe(2);
  await page.keyboard.press('KeyE', { delay: 35 });
  await expect(page.getByRole('group', { name: 'Выбор тайника' })).toBeHidden();

  await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').handleCommand('restart'));
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const cache = scene.caches[0];
    scene.player.body.reset(cache.data.x, cache.data.y);
  });
  await page.keyboard.press('KeyE', { delay: 35 });
  await expect(page.getByRole('group', { name: 'Выбор тайника' })).toBeVisible();
});

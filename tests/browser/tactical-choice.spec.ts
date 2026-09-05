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

test('R no longer switches weapons and the HUD describes the single pipe combo', async ({ page }) => {
  await start(page);
  await expect(page.locator('#weapon-label')).toContainText('ТРУБА');
  await page.keyboard.press('KeyR', { delay: 35 });
  await expect(page.locator('#weapon-label')).toContainText('КОМБО 1–1–2');
  await expect(page.locator('#weapon-label')).not.toContainText('КУВАЛДА');
  expect(await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    return { swap: s.keys.swap, switchWeapon: typeof s.rules.switchWeapon };
  })).toEqual({ swap: undefined, switchWeapon: 'undefined' });
});

test('a ready dash cancels a live pipe strike, including its hitstop', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    s.attack.request(1); s.attack.advance(65); s.beginHitStop(350);
  });
  await page.keyboard.press('ShiftLeft', { delay: 30 });
  expect(await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    return { phase: s.attack.state.phase, dashing: s.player.isDashing, hitstop: s.hitStopActive };
  })).toEqual({ phase: 'idle', dashing: true, hitstop: false });
});

test('F can cancel a pipe strike and consumes one kick cooldown', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    s.attack.request(1); s.attack.advance(65);
  });
  await page.keyboard.press('KeyF', { delay: 20 });
  expect(await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    return { phase: s.attack.state.phase, kick: s.kick.active, abilityReady: s.rules.abilityReady };
  })).toEqual({ phase: 'idle', kick: true, abilityReady: false });
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
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').combatEffects.kickBounds?.width ?? 0)).toBeGreaterThan(20);
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

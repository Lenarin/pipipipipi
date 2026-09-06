import { expect, test, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/');
  await page.locator('#start-button').click();
  await expect(page.locator('#dialogue-speaker')).toHaveText('Настя');
}
async function state(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    return { mode: s.rules.mode, hp: s.rules.hp, x: s.player.x, y: s.player.y,
      elapsed: s.rules.elapsed, cooldown: s.rules.abilityCooldownProgress,
      stage: s.rules.stage, flasks: s.rules.flasks, campaign: s.campaign?.snapshot() };
  });
}

test('opening call freezes the world, HP and cooldowns; skip resumes chapter one', async ({ page }) => {
  await start(page);
  const before = await state(page);
  await page.keyboard.down('KeyD');
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(350);
  expect(await state(page)).toEqual(before);
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await page.keyboard.up('KeyD');
  await expect(page.locator('#dialogue-panel')).toBeHidden();
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
  expect((await state(page)).stage).toBe(0);
});

test('reveal and advance are separate, held Enter and focused button cannot double advance', async ({ page }) => {
  await start(page);
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter');
  await page.waitForTimeout(150);
  await page.keyboard.up('Enter');
  await expect(page.locator('#dialogue-text')).toHaveText('Ларик, я очень хочу хачапури. Если не поем — убью себя.');
  await expect(page.locator('#dialogue-panel')).toHaveAttribute('data-line', '0');
  await page.locator('#dialogue-next').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialogue-panel')).toHaveAttribute('data-line', '1');
  await expect(page.locator('#dialogue-speaker')).toHaveText('Ларик');
});

test('Enter starts at the first unrevealed line and Tab makes skip keyboard accessible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Начать', exact: true })).toBeEnabled();
  await page.keyboard.press('Enter', { delay: 40 });
  await expect(page.locator('#dialogue-panel')).toHaveAttribute('data-line', '0');
  await expect(page.locator('#dialogue-panel')).toHaveAttribute('data-finished-typing', 'false');
  for (let tabs = 0; tabs < 10 && await page.evaluate(() => document.activeElement?.id) !== 'dialogue-skip'; tabs++) await page.keyboard.press('Tab');
  await expect(page.locator('#dialogue-skip')).toBeFocused();
  await page.keyboard.press('Space', { delay: 40 });
  await expect(page.locator('#dialogue-panel')).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
  expect((await state(page)).campaign.completedScenes).toEqual(['phone-call']);
});

test('a fresh movement press after focus returns works even when keyup happened outside the window', async ({ page }) => {
  await start(page); await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
  await page.keyboard.down('KeyD');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading', { name: 'Пауза' })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('button', { name: /ПРОДОЛЖИТЬ/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').scene.isActive())).toBe(true);
  const before = (await state(page)).x;
  // The OS reports a fresh press; the old release occurred while this window was unfocused.
  await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd', keyCode: 68, repeat: false, bubbles: true, cancelable: true })));
  await page.waitForTimeout(160);
  expect((await state(page)).x).toBeGreaterThan(before + 10);
  await page.keyboard.up('KeyD');
});

test('focus loss and Escape preserve dialogue progress, restart invalidates its callback', async ({ page }) => {
  const lifecycleWarnings: string[] = [];
  page.on('console', message => { if (message.type() === 'warning' && /Cannot (pause|resume).*Scene/.test(message.text())) lifecycleWarnings.push(message.text()); });
  await start(page);
  const session = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').campaign.current);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading', { name: 'Пауза' })).toBeVisible();
  const text = await page.locator('#dialogue-text').textContent();
  await page.waitForTimeout(300);
  expect(await page.locator('#dialogue-text').textContent()).toBe(text);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('button', { name: /ПРОДОЛЖИТЬ/ }).click();
  await expect(page.locator('#dialogue-panel')).toBeVisible();
  expect((await state(page)).mode).toBe('dialogue');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'НАЧАТЬ ЗАНОВО' }).click();
  await expect(page.locator('#dialogue-panel')).toHaveAttribute('data-line', '0');
  await page.evaluate(async old => {
    const { bridge } = await import('/src/game/bridge.ts');
    bridge.emit('dialogue-complete', old);
  }, session);
  expect((await state(page)).mode).toBe('dialogue');
  expect((await state(page)).campaign.completedScenes).toEqual([]);
  expect(lifecycleWarnings).toEqual([]);
});

test('arena entry freezes projectiles and all world clocks, ducks music, and discards held combat input', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    s.enemies.getChildren().filter((e: any) => e.kind !== 'boss').forEach((e: any) => e.destroy());
    s.player.body.reset(s.level.bossIntroX, 280);
    s.rules.hp = 83; s.rules.useAbility();
    s.time.delayedCall(500, () => s.registry.set('world-timer-fired', true));
    const p = s.physics.add.image(100, 100, '__WHITE'); s.projectiles.add(p); p.body.setAllowGravity(false); p.setVelocityX(100);
  });
  await page.keyboard.down('KeyD'); await page.keyboard.down('KeyJ'); await page.keyboard.down('Space');
  await page.keyboard.press('KeyE', { delay: 40 });
  await expect(page.locator('#dialogue-panel')).toHaveAttribute('data-scene', 'last-khachapuri');
  const before = await state(page);
  const projectile = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').projectiles.getChildren()[0].x);
  await page.waitForTimeout(700);
  expect(await state(page)).toEqual(before);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').projectiles.getChildren()[0].x)).toBe(projectile);
  expect(await page.evaluate(() => (window as any).__GAME__.registry.get('world-timer-fired'))).not.toBe(true);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').ambience.volume)).toBeCloseTo(0.048);
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await page.evaluate(() => {
    for (const [code, keyCode] of [['KeyD', 68], ['KeyJ', 74], ['Space', 32]] as const) document.body.dispatchEvent(new KeyboardEvent('keydown', { code, keyCode, key: code === 'Space' ? ' ' : code.slice(-1).toLowerCase(), repeat: true, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(120);
  await page.keyboard.up('KeyD'); await page.keyboard.up('KeyJ'); await page.keyboard.up('Space');
  const after = await state(page);
  expect(Math.abs(after.x - before.x)).toBeLessThan(2);
  expect(await page.evaluate(() => { const s = (window as any).__GAME__.scene.getScene('Game'); return [s.attack.state.phase, s.projectiles.countActive(true)]; })).toEqual(['idle', 0]);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').ambience.volume)).toBeCloseTo(0.16);
});

test('skipping a scene and losing focus in the same frame keeps the native world paused', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', message => { if (message.type() === 'warning' && /Cannot (pause|resume).*Scene/.test(message.text())) warnings.push(message.text()); });
  await start(page);
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('#dialogue-skip')!.click();
    window.dispatchEvent(new Event('blur'));
  });
  await expect(page.getByRole('heading', { name: 'Пауза' })).toBeVisible();
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').scene.isPaused())).toBe(true);
  expect(warnings).toEqual([]);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('button', { name: /ПРОДОЛЖИТЬ/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').scene.isActive())).toBe(true);
  expect((await state(page)).mode).toBe('playing');
  expect((await state(page)).campaign.completedScenes).toEqual(['phone-call']);
});

test('focus loss in the same frame as starting a dialogue also freezes its first line', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Начать', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('#start-button')!.click();
    window.dispatchEvent(new Event('blur'));
  });
  await expect(page.getByRole('heading', { name: 'Пауза' })).toBeVisible();
  await page.waitForTimeout(200);
  const before = await page.locator('#dialogue-text').textContent();
  await page.waitForTimeout(300);
  expect(await page.locator('#dialogue-text').textContent()).toBe(before);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('button', { name: /ПРОДОЛЖИТЬ/ }).click();
  await expect(page.locator('#dialogue-panel')).toBeVisible();
  await expect.poll(async () => (await page.locator('#dialogue-text').textContent())!.length).toBeGreaterThan(before!.length);
});

test('restart before queued dialogue creation preserves only the current paused session', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Начать', exact: true })).toBeEnabled();
  const listeners = () => page.evaluate(() => (window as any).__GAME__.scene.getScene('Dialogue').events.listenerCount('create'));
  const beforeListeners = await listeners();
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('#start-button')!.click();
    window.dispatchEvent(new Event('blur'));
    document.querySelector<HTMLButtonElement>('#restart-button')!.click();
    window.dispatchEvent(new Event('blur'));
  });
  await expect(page.getByRole('heading', { name: 'Пауза' })).toBeVisible();
  await page.waitForTimeout(150);
  const before = await page.locator('#dialogue-text').textContent();
  await page.waitForTimeout(300);
  expect(await page.locator('#dialogue-text').textContent()).toBe(before);
  expect(await listeners()).toBe(beforeListeners);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('button', { name: /ПРОДОЛЖИТЬ/ }).click();
  await page.locator('#dialogue-skip').click();
  expect((await state(page)).campaign.completedScenes).toEqual(['phone-call']);
});

test('the arena boss cannot be damaged before its introduction', async ({ page }) => {
  await start(page); await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    const boss = s.enemies.getChildren().find((e: any) => e.kind === 'boss');
    s.player.body.reset(boss.x - 35, boss.y); s.player.facing = 1;
    boss.body.updateFromGameObject();
    s.queueAttack(); s.resolveAttackEvents(s.attack.advance(s.attack.currentProfile.windupMs));
    s.combatEffects.update(s.player, s.attack.state, s.attack.phaseProgress);
    s.resolveActiveAttack();
    return { hp: boss.hp, engaged: boss.engaged };
  });
  expect(result).toEqual({ hp: 360, engaged: false });
});

for (const read of [false, true]) test(`all seven scenes and three bosses complete with ${read ? 'full reading' : 'skip'}`, async ({ page }) => {
  test.setTimeout(60000);
  await start(page);
  async function finish(id: string) {
    await expect(page.locator('#dialogue-panel')).toHaveAttribute('data-scene', id);
    if (!read) await page.getByRole('button', { name: 'Пропустить сцену' }).click();
    else {
      // Every line remains available until the player advances; reveal is an independent command.
      for (let guard = 0; guard < 20 && await page.locator('#dialogue-panel').isVisible(); guard++) {
        await page.getByRole('button', { name: 'Далее', exact: true }).click();
      }
    }
    await expect(page.locator('#dialogue-panel')).toBeHidden();
    await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').scene.isActive())).toBe(true);
  }
  await finish('phone-call');
  await page.evaluate(() => { const s = (window as any).__GAME__.scene.getScene('Game'); s.rules.hp = 61; s.rules.flasks = 1; s.rules.grantImmunity(120000); });
  for (const [stage, intro, exit] of [[0, 'last-khachapuri', 'wanted'], [1, 'airport-chief', 'rough-landing'], [2, 'food-threat', 'delivered']] as const) {
    // Encounter fixtures remove route enemies; story is triggered through real E interaction.
    await page.evaluate(() => {
      const s = (window as any).__GAME__.scene.getScene('Game');
      s.enemies.getChildren().filter((e: any) => e.kind !== 'boss').forEach((e: any) => e.destroy());
      s.player.body.reset(s.level.bossIntroX, 280);
    });
    await page.keyboard.press('KeyE', { delay: 40 });
    await finish(intro);
    await page.evaluate(() => {
      const s = (window as any).__GAME__.scene.getScene('Game');
      const boss = s.enemies.getChildren().find((e: any) => e.kind === 'boss');
      boss.cancelActions(); boss.receiveHit(10000, 1);
      s.resolveBossReinforcements(boss); s.damageEnemy(boss, 10000);
      s.player.body.reset(s.level.exitX, 280);
    });
    expect((await state(page)).mode).toBe('playing');
    expect((await state(page)).campaign.defeatedBosses).toHaveLength(stage + 1);
    if (stage === 2) {
      await page.keyboard.press('KeyE', { delay: 40 });
      await expect(page.locator('#dialogue-panel')).toBeHidden();
      await page.evaluate(() => {
        const s = (window as any).__GAME__.scene.getScene('Game');
        [...s.enemies.getChildren()].forEach((e: any) => { e.receiveHit(10000, 1); s.damageEnemy(e, 10000); });
      });
    }
    await page.keyboard.press('KeyE', { delay: 40 });
    await finish(exit);
    const after = await state(page);
    expect(after.hp).toBe(61);
    expect(after.flasks).toBe(1);
    expect(after.campaign.hasPackage).toBe(true);
    expect(after.stage).toBe(Math.min(2, stage + 1));
  }
  await expect(page.getByRole('heading', { name: 'Заказ доставлен' })).toBeVisible();
  expect((await state(page)).campaign.completedScenes).toHaveLength(7);
});

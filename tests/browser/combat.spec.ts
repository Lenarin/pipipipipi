import { expect, test } from '@playwright/test';

async function start(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
}

async function placeAtWalker(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const enemy = scene.enemies.getChildren().find((item: any) => item.id === 'yard-walker-1');
    scene.rules.grantImmunity(10000);
    scene.player.body.reset(enemy.x - 36, Math.min(enemy.y - 8, 280));
    scene.player.facing = 1;
    return { hp: enemy.hp, maxHp: enemy.maxHp };
  });
}

test('a held J produces one real swing hit, and a post-dash swing still damages', async ({ page }) => {
  await start(page);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.texture.key)).toBe('hero-full');
  const before = await placeAtWalker(page);
  await page.keyboard.down('KeyJ');
  await page.waitForTimeout(420);
  await page.keyboard.up('KeyJ');
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').enemies.getChildren().find((item: any) => item.id === 'yard-walker-1').hp)).toBe(before.hp - 16);

  await placeAtWalker(page);
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').queueAttack());
  await page.waitForTimeout(90);
  await page.keyboard.press('ShiftLeft', { delay: 40 });
  await page.waitForTimeout(10);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').attack.state.phase)).toBe('idle');
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const enemy = scene.enemies.getChildren().find((item: any) => item.id === 'yard-walker-2');
    scene.player.body.reset(enemy.x - 36, Math.min(enemy.y - 8, 280));
    scene.player.dashMs = 0;
  });
  const afterDash = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').enemies.getChildren().find((item: any) => item.id === 'yard-walker-2').hp);
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').queueAttack());
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').enemies.getChildren().find((item: any) => item.id === 'yard-walker-2').hp), { timeout: 1000 }).toBeLessThan(afterDash);
});

test('a disabled shake setting suppresses a confirmed third-hit shake', async ({ page }) => {
  await start(page);
  await placeAtWalker(page);
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const enemy = scene.enemies.getChildren().find((item: any) => item.id === 'yard-walker-1');
    scene.player.body.moves = false; enemy.body.moves = false;
    enemy.hp = 100; enemy.maxHp = 100;
    scene.shakeEnabled = false;
    scene.__combatShakeCalls = 0;
    scene.cameras.main.shake = () => { scene.__combatShakeCalls++; };
    scene.attack.request(1); scene.player.beginAttack();
    scene.events.on('postupdate', () => { if (scene.attack.state.phase === 'recovery' && scene.attack.state.step < 3) scene.attack.request(1); });
  });
  // Observe the durable result of all three confirmed hits, not a sub-100ms active window.
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').enemies.getChildren().find((item: any) => item.id === 'yard-walker-1').hp), { timeout: 3000 }).toBe(36);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').__combatShakeCalls)).toBe(0);
});

test('pause during confirmed hitstop remains paused after the timer would have elapsed', async ({ page }) => {
  await start(page);
  await placeAtWalker(page);
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const enemy = scene.enemies.getChildren().find((item: any) => item.id === 'yard-walker-1');
    scene.player.body.moves = false; enemy.body.moves = false;
    // This fixture isolates hitstop lifecycle, so place the bodies on the same strike plane.
    scene.player.body.reset(enemy.x - 32, enemy.y);
    scene.player.facing = 1;
  });
  const atImpact = await page.evaluate(() => new Promise(resolve => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const begin = scene.beginHitStop.bind(scene);
    scene.beginHitStop = () => {
      begin(240);
      resolve({ active: scene.hitStopActive, animationPaused: scene.player.anims.isPaused, physicsPaused: scene.physics.world.isPaused });
    };
    scene.queueAttack();
  }));
  expect(atImpact).toEqual({ active: true, animationPaused: true, physicsPaused: true });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(320);
  expect(await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return { mode: scene.rules.mode, paused: scene.physics.world.isPaused };
  })).toEqual({ mode: 'paused', paused: true });
});

test('the rendered strike segment follows the player and only hits a body it actually reaches', async ({ page }) => {
  await start(page);
  const geometry = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const enemy = scene.enemies.getChildren().find((item: any) => item.id === 'yard-walker-1');
    scene.player.body.moves = false; enemy.body.moves = false;
    enemy.body.reset(scene.player.x + 500, scene.player.y);
    scene.queueAttack();
    // Geometry fixture: enter active synchronously through the real combat controller.
    scene.resolveAttackEvents(scene.attack.advance(scene.attack.currentProfile.windupMs));
    scene.combatEffects.update(scene.player, scene.attack.state, scene.attack.phaseProgress);
    const before = scene.combatEffects.strikeSegment;
    if (!before) return null;
    scene.player.body.reset(scene.player.x + 24, scene.player.y);
    scene.combatEffects.update(scene.player, scene.attack.state, scene.attack.phaseProgress);
    const after = scene.combatEffects.strikeSegment;
    const beforeHp = enemy.hp;
    enemy.body.reset(after.x2 + 100, after.y2 + 100);
    scene.resolveActiveAttack();
    const afterMiss = enemy.hp;
    enemy.body.reset((after.x1 + after.x2) / 2, (after.y1 + after.y2) / 2);
    // Phaser reset uses the full frame's top-left until the next body sync.
    enemy.body.updateFromGameObject();
    scene.resolveActiveAttack();
    return { beforeX: before.x1, afterX: after.x1, beforeHp, afterMiss, afterHit: enemy.hp };
  });
  expect(geometry).not.toBeNull();
  expect(geometry!.afterX - geometry!.beforeX).toBeGreaterThan(20);
  expect(geometry!.afterMiss).toBe(geometry!.beforeHp);
  expect(geometry!.afterHit).toBeLessThan(geometry!.beforeHp);
});

test('windup movement is reduced, active movement lunges, and stagger survives before AI recovery', async ({ page }) => {
  await start(page);
  const movement = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const player = scene.player; const startX = player.x;
    scene.attack.request(1); scene.player.beginAttack();
    scene.attack.advance(32); player.updateMovement({ left: false, right: true, jumpPressed: false, dashPressed: false }, 32, true, { ...scene.attack.state, lunge: scene.attack.currentProfile.lunge, progress: scene.attack.phaseProgress });
    const windupVelocity = player.body.velocity.x;
    scene.attack.advance(88); player.updateMovement({ left: false, right: true, jumpPressed: false, dashPressed: false }, 33, true, { ...scene.attack.state, lunge: scene.attack.currentProfile.lunge, progress: scene.attack.phaseProgress });
    const activeVelocity = player.body.velocity.x;
    const enemy = scene.enemies.getChildren().find((item: any) => item.id === 'yard-walker-1');
    enemy.receiveHit(1, 1);
    const stagger = { state: enemy.state, velocity: enemy.body.velocity.x };
    enemy.updateAi(player, 80, true);
    const sustained = { state: enemy.state, velocity: enemy.body.velocity.x };
    enemy.updateAi(player, 100, true);
    enemy.updateAi(player, 100, true);
    return { startX, windupVelocity, activeVelocity, stagger, sustained, recovered: enemy.state };
  });
  expect(Math.abs(movement.windupVelocity)).toBeLessThan(100);
  expect(movement.activeVelocity).toBeGreaterThan(movement.windupVelocity);
  expect(movement.stagger).toMatchObject({ state: 'stagger' });
  expect(movement.stagger.velocity).toBeGreaterThan(0);
  expect(movement.sustained).toMatchObject({ state: 'stagger' });
  expect(movement.sustained.velocity).toBeGreaterThan(0);
  expect(movement.recovered).not.toBe('stagger');
});

test('a failed dash input does not release hitstop, while pause, death, and restart clear combat state', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    scene.beginHitStop(400);
    scene.rules.useCooldown('dash', 1000);
  });
  await page.keyboard.press('ShiftLeft', { delay: 40 });
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').hitStopActive)).toBe(true);
  const lifecycle = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const snapshot = () => ({ phase: scene.attack.state.phase, queued: scene.attack.state.queued, swing: scene.activeSwing, hitstop: scene.hitStopActive });
    const seedCombat = () => {
      scene.attack.request(1); scene.attack.request(1);
      scene.activeSwing = scene.rules.beginSwing(); scene.beginHitStop(400);
    };
    seedCombat();
    scene.handleCommand('pause');
    const paused = snapshot();
    scene.rules.mode = 'playing'; scene.time.paused = false; seedCombat(); scene.onDeath();
    const dead = snapshot();
    scene.rules.mode = 'playing'; scene.time.paused = false; seedCombat();
    scene.handleCommand('restart');
    return { paused, dead, restarted: snapshot() };
  });
  expect(lifecycle.paused).toEqual({ phase: 'idle', queued: false, swing: null, hitstop: false });
  expect(lifecycle.dead).toEqual({ phase: 'idle', queued: false, swing: null, hitstop: false });
  expect(lifecycle.restarted).toEqual({ phase: 'idle', queued: false, swing: null, hitstop: false });
});

test('boss keeps an ordinary windup through repeated ordinary hits and completes its telegraph', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    scene.rules.start(); scene.buildStage(2); scene.bossActivated = true;
    const boss = scene.enemies.getChildren().find((item: any) => item.kind === 'boss');
    scene.player.body.reset(boss.x - 60, boss.y);
    boss.activate(); boss.cooldownMs = 0;
  });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').enemies.getChildren().find((item: any) => item.kind === 'boss').state)).toBe('windup');
  for (let hit = 0; hit < 3; hit++) {
    expect(await page.evaluate(() => {
      const boss = (window as any).__GAME__.scene.getScene('Game').enemies.getChildren().find((item: any) => item.kind === 'boss');
      return boss.receiveHit(1, 1);
    })).toBe(true);
    expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').enemies.getChildren().find((item: any) => item.kind === 'boss').state)).toBe('windup');
    await page.waitForTimeout(100);
  }
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').enemies.getChildren().find((item: any) => item.kind === 'boss').state !== 'windup'), { timeout: 1500 }).toBe(true);
});

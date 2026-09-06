import { expect, test, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
}

test('the chief shield blocks only frontal guard hits and drops for recovery', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(async () => {
    const { Enemy } = await import('/src/gameplay/Enemy.ts');
    const scene = (window as any).__GAME__.scene.getScene('Game');
    scene.scene.pause();
    const chief = new Enemy(scene, 'test-chief', 'boss', 700, 260, { bossId: 'chief', faction: 'police' });
    scene.enemies.add(chief);
    chief.activate(); chief.cooldownMs = 0;
    scene.player.body.reset(chief.x + 70, chief.y);
    chief.updateAi(scene.player, 1, true, true);

    const before = chief.hp;
    const frontAccepted = chief.receiveHit(16, -1);
    const afterFront = chief.hp;
    const backAccepted = chief.receiveHit(16, 1);
    const afterBack = chief.hp;
    chief.updateAi(scene.player, chief.attackProfile.windupMs + chief.attackProfile.activeMs, true, true);
    chief.hitLockMs = 0;
    const recoveryAccepted = chief.receiveHit(16, -1);

    return {
      bossId: chief.bossId, faction: chief.faction, attack: chief.attackProfile?.attack,
      before, frontAccepted, afterFront, backAccepted, afterBack, recoveryAccepted,
      afterRecovery: chief.hp, guardingInRecovery: chief.isBlocking, phase: chief.state,
    };
  });

  expect(result).toEqual({
    bossId: 'chief', faction: 'police', attack: 'chief-charge', before: 360,
    frontAccepted: false, afterFront: 360, backAccepted: true, afterBack: 344,
    recoveryAccepted: true, afterRecovery: 328, guardingInRecovery: false, phase: 'recovery',
  });
});

test('native boss actors keep readable commitments, locked aim, and distinct Arcade motion', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(async () => {
    const { Enemy } = await import('/src/gameplay/Enemy.ts');
    const scene = (window as any).__GAME__.scene.getScene('Game');
    scene.scene.pause();
    const create = (id: string, bossId: 'mark' | 'chief' | 'miller', x: number) => {
      const enemy = new Enemy(scene, id, 'boss', x, 260, { bossId });
      scene.enemies.add(enemy); enemy.activate(); enemy.cooldownMs = 0;
      return enemy;
    };

    const mark = create('test-mark', 'mark', 500);
    scene.player.body.reset(590, 260);
    mark.updateAi(scene.player, 1, true, true);
    const markWindup = mark.attackProfile.windupMs;
    mark.updateAi(scene.player, 519, true, true);
    const markStillPreparing = mark.state;
    mark.updateAi(scene.player, markWindup - 519, true, true);
    const markVelocity = mark.body.velocity.x;

    const miller = create('test-miller', 'miller', 900);
    scene.player.body.reset(760, 235);
    miller.updateAi(scene.player, 1, true, true);
    const lockedAim = { ...miller.aimTarget };
    const lockedFacing = miller.attackFacing;
    scene.player.body.reset(1080, 290);
    const volleyEvents = miller.updateAi(scene.player, miller.attackProfile.windupMs, true, true);
    const aimAfterPlayerMoved = { ...miller.aimTarget };
    volleyEvents.forEach((event: any) => scene.resolveEnemyEvent(event));
    const shots = scene.projectiles.getChildren().map((shot: any) => ({ x: shot.body.velocity.x, y: shot.body.velocity.y }));
    miller.updateAi(scene.player, miller.attackProfile.activeMs, true, true);

    return {
      mark: { attack: mark.attackProfile.attack, windup: markWindup, recovery: mark.attackProfile.recoveryMs, stillPreparing: markStillPreparing, velocity: markVelocity },
      miller: { attack: miller.attackProfile.attack, windup: miller.attackProfile.windupMs, recovery: miller.attackProfile.recoveryMs,
        lockedAim, aimAfterPlayerMoved, lockedFacing, facingAfterPlayerMoved: miller.attackFacing,
        recoveryPhase: miller.state, recoveryVelocity: miller.body.velocity.x, shots },
    };
  });

  expect(result.mark).toMatchObject({ attack: 'mark-lunge', stillPreparing: 'windup' });
  expect(result.mark.windup).toBeGreaterThanOrEqual(520);
  expect(result.mark.recovery).toBeGreaterThanOrEqual(500);
  expect(result.mark.velocity).toBeGreaterThan(0);
  expect(result.miller).toMatchObject({ attack: 'miller-volley', recoveryPhase: 'recovery', lockedFacing: -1, facingAfterPlayerMoved: -1 });
  expect(result.miller.windup).toBeGreaterThanOrEqual(520);
  expect(result.miller.recovery).toBeGreaterThanOrEqual(500);
  expect(result.miller.aimAfterPlayerMoved).toEqual(result.miller.lockedAim);
  expect(result.miller.recoveryVelocity).toBeGreaterThan(0);
  expect(result.miller.shots).toHaveLength(3);
  expect(result.miller.shots[1].x).toBeLessThan(0);
  expect(result.miller.shots[1].y).toBeLessThan(0);
});

test('a blocked pipe strike produces a compact shield cue and a non-impact sound', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(async () => {
    const { Enemy } = await import('/src/gameplay/Enemy.ts');
    const { EnemyAttackPresentation } = await import('/src/game/EnemyAttackPresentation.ts');
    const scene = (window as any).__GAME__.scene.getScene('Game');
    scene.scene.pause();
    const chief = new Enemy(scene, 'test-chief-feedback', 'boss', 700, 260, { bossId: 'chief' });
    scene.enemies.add(chief);
    scene.enemyPresentations.set(chief.id, new EnemyAttackPresentation(scene));
    scene.player.body.reset(chief.x + 32, chief.y);
    scene.player.facing = -1;
    chief.activate(); chief.cooldownMs = 0;
    chief.updateAi(scene.player, 1, true, true);
    const beforeHp = chief.hp;
    const soundsBefore = scene.sound.sounds.length;

    scene.queueAttack(-1);
    scene.resolveAttackEvents(scene.attack.advance(scene.attack.currentProfile.windupMs));
    scene.combatEffects.update(scene.player, scene.attack.state, scene.attack.phaseProgress);
    scene.resolveActiveAttack();

    return {
      beforeHp, afterHp: chief.hp,
      cueCount: scene.children.getChildren().filter((child: any) => child.name === 'boss-block-cue').length,
      newSoundKeys: scene.sound.sounds.slice(soundsBefore).map((sound: any) => sound.key),
      damageCueCount: scene.children.getChildren().filter((child: any) => child.name === 'pipe-damage').length,
    };
  });

  expect(result.afterHp).toBe(result.beforeHp);
  expect(result.cueCount).toBe(1);
  expect(result.newSoundKeys).toContain('dash');
  expect(result.damageCueCount).toBe(0);
});

test('Miller adds one Arcade pair to the shared enemy pressure and clearance group', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(async () => {
    const { Enemy } = await import('/src/gameplay/Enemy.ts');
    const scene = (window as any).__GAME__.scene.getScene('Game');
    scene.scene.pause();
    const miller = new Enemy(scene, 'test-miller-reinforcements', 'boss', 900, 260, { bossId: 'miller', faction: 'federal' });
    scene.enemies.add(miller);
    const before = scene.enemies.countActive(true);

    miller.receiveHit(miller.maxHp / 2 + 1, 1);
    scene.resolveBossReinforcements(miller);
    const afterFirst = scene.enemies.countActive(true);
    miller.hitLockMs = 0;
    miller.receiveHit(10, 1);
    scene.resolveBossReinforcements(miller);
    const afterSecond = scene.enemies.countActive(true);
    const helpers = scene.enemies.getChildren().filter((enemy: any) => enemy.id.startsWith('miller-agent-'));

    return {
      before, afterFirst, afterSecond,
      helpers: helpers.map((enemy: any) => ({ kind: enemy.kind, faction: enemy.faction, hasArcadeBody: Boolean(enemy.body?.enable) })),
      clearanceCount: scene.enemies.countActive(true),
    };
  });

  expect(result.afterFirst - result.before).toBe(2);
  expect(result.afterSecond).toBe(result.afterFirst);
  expect(result.helpers).toEqual([
    { kind: 'walker', faction: 'federal', hasArcadeBody: true },
    { kind: 'spitter', faction: 'federal', hasArcadeBody: true },
  ]);
  expect(result.clearanceCount).toBe(result.before + 2);
});

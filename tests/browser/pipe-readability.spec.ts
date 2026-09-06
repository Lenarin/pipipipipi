import { expect, test, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
}

// Catches a short/height-dependent strike, a close-range blind spot, or invisible reach.
test('each forward stroke covers close and readable pipe range for standing and low targets', async ({ page }) => {
  await start(page);
  const results = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.scene.pause();
    s.player.body.reset(400, 285.875); s.player.body.updateFromGameObject();
    const results = [];
    for (const kind of ['walker', 'hound']) for (const facing of [1, -1]) for (const gap of [18, 40, 62, 95, -40]) {
      const enemy = s.enemies.getChildren().find((e: any) => e.kind === kind);
      s.cancelAttack(); s.attack.request(facing);
      const damage = [];
      for (let step = 1; step <= 3; step++) {
        enemy.hp = 500; enemy.hitLockMs = 0;
        enemy.body.reset(400 + facing * gap, 312 - enemy.body.height / 2);
        enemy.body.updateFromGameObject();
        const p = s.attack.currentProfile;
        s.resolveAttackEvents(s.attack.advance(p.windupMs));
        for (const progress of [0, .15, .3, .5, .7, .9, .999]) {
          s.combatEffects.update(s.player, s.attack.state, progress, p);
          s.resolveActiveAttack(); s.cancelHitStop();
        }
        damage.push(500 - enemy.hp);
        s.attack.advance(p.activeMs + p.recoveryMs - 100);
        if (step < 3) s.attack.request(facing);
        s.attack.advance(100);
      }
      results.push({kind, facing, gap, damage});
    }
    return results;
  });
  for (const r of results) expect(r.damage, JSON.stringify(r)).toEqual(r.gap > 0 && r.gap < 90 ? [16, 16, 32] : [0, 0, 0]);
});

// Catches a return to nearly instantaneous windup keyframes, not just phase duration.
test('the strongest loaded silhouette is held long enough to see before the first contact', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.scene.pause();
    s.attack.request(1);
    const samples = [];
    for (let time = 0; time < 140; time += 10) {
      if (time > 0) s.attack.advance(10);
      s.combatEffects.update(s.player, s.attack.state, s.attack.phaseProgress);
      samples.push({time, frame:s.player.frame.name, contact:!!s.combatEffects.strikeSegment});
    }
    return samples;
  });
  const loaded = result.filter(p => p.time >= 50 && p.time <= 120);
  expect(new Set(loaded.map(p => p.frame)).size).toBe(1);
  expect(loaded.every(p => !p.contact)).toBe(true);
});

// Hand-checked points inside the diagonal stroke's drawn ribbon, away from its edges.
// Tiny real Arcade bodies expose a perimeter-only collision check's hollow interior.
test('the swept ribbon is solid and includes intermediate poses skipped by a slow frame', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.scene.pause();
    s.player.body.reset(400, 285.875); s.player.body.updateFromGameObject();
    const e = s.enemies.getChildren()[0]; e.body.setSize(2, 2, false);
    const results = [];
    for (const sample of [{x:442, y:274, progress:.3}, {x:462, y:281, progress:.999}]) {
      s.cancelAttack(); s.attack.request(1); s.resolveAttackEvents(s.attack.advance(s.attack.currentProfile.windupMs));
      e.hp = 500; e.hitLockMs = 0; e.body.position.set(sample.x - 1, sample.y - 1);
      s.combatEffects.update(s.player, s.attack.state, 0);
      s.combatEffects.update(s.player, s.attack.state, sample.progress);
      s.resolveActiveAttack(); s.cancelHitStop();
      results.push(500 - e.hp);
    }
    return results;
  });
  expect(result).toEqual([16, 16]);
});

test('a target entering a faded trail is not damaged by an already-passed area', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.scene.pause();
    s.player.body.reset(400, 285.875); s.player.body.updateFromGameObject();
    const e = s.enemies.getChildren()[0]; e.hp = 500; e.hitLockMs = 0; e.body.setSize(2, 2, false);
    e.body.position.set(900, 100);
    s.attack.request(1); s.resolveAttackEvents(s.attack.advance(s.attack.currentProfile.windupMs));
    s.combatEffects.update(s.player, s.attack.state, 0);
    s.combatEffects.update(s.player, s.attack.state, .3); s.resolveActiveAttack();
    e.body.position.set(441, 273);
    s.combatEffects.update(s.player, s.attack.state, .35); s.resolveActiveAttack();
    return 500 - e.hp;
  });
  expect(result).toBe(0);
});

for (const kind of ['walker', 'hound']) for (const facing of [1, -1]) {
  test(`keyboard combo keeps its ${kind} target at edge range, facing ${facing}, with real recoil`, async ({ page }) => {
    await start(page);
    await page.evaluate(({kind, facing}) => {
      const s = (window as any).__GAME__.scene.getScene('Game');
      const e = s.enemies.getChildren().find((e: any) => e.kind === kind);
      s.enemies.getChildren().filter((other: any) => other !== e).forEach((other: any) => other.disableBody(true, true));
      s.player.body.reset(400, 285.875); s.player.facing = facing; s.player.setFlipX(facing < 0);
      e.body.reset(400 + facing * 62, 312 - e.body.height / 2); e.hp = 200; e.engaged = false;
      // Stationary-target fixture suppresses awareness ONLY. Real hit reaction,
      // stagger decay, Arcade body motion, input and attack timing still run.
      const update = e.updateAi.bind(e);
      e.updateAi = (player: unknown, delta: number, bossAllowed: boolean) => update(player, delta, bossAllowed, false);
    }, {kind, facing});
    await page.keyboard.press('KeyJ', {delay:20});
    for (const step of [1, 2]) {
      await expect.poll(() => page.evaluate(step => {
        const s = (window as any).__GAME__.scene.getScene('Game');
        return s.attack.state.step === step && s.attack.state.phase === 'recovery';
      }, step), {intervals:[10]}).toBe(true);
      await page.keyboard.press('KeyJ', {delay:20});
    }
    await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').attack.state.phase), {intervals:[15]}).toBe('idle');
    const result = await page.evaluate(kind => {
      const s = (window as any).__GAME__.scene.getScene('Game');
      const e = s.enemies.getChildren().find((e: any) => e.kind === kind);
      return {hp:e.hp, playerX:s.player.x, gap:Math.abs(e.x-s.player.x)};
    }, kind);
    expect(result.hp).toBe(136);
    expect(result.playerX).toBeCloseTo(400, 2);
    expect(result.gap).toBeGreaterThan(62);
  });
}

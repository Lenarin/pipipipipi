import { expect, test, type Page } from '@playwright/test';

const runtimeErrors = new WeakMap<Page, string[]>();
test.afterEach(async ({ page }) => { expect(runtimeErrors.get(page) ?? []).toEqual([]); });

test.beforeEach(async ({ page }) => {
  const errors: string[] = []; runtimeErrors.set(page, errors);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/'); await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
});

test('a press released between two game updates still starts exactly one attack', async ({ page }) => {
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.__swings = 0;
    const begin = s.rules.beginSwing.bind(s.rules);
    s.rules.beginSwing = () => { s.__swings++; return begin(); };
  });
  await page.keyboard.press('KeyJ', { delay: 0 }); await page.waitForTimeout(440);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').__swings)).toBe(1);
});

test('a stationary full combo connects all three hits without driving through its target', async ({ page }) => {
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'), e = s.enemies.getChildren()[0];
    s.player.body.reset(400, 285.875); s.player.facing = 1;
    e.body.reset(441, 294.75); e.hp = 200; e.cooldownMs = 5000; e.activate();
  });
  await page.keyboard.press('KeyJ', { delay: 30 });
  for (const step of [1, 2]) {
    await expect.poll(() => page.evaluate(n => { const s=(window as any).__GAME__.scene.getScene('Game'); return s.attack.state.step === n && s.attack.state.phase === 'recovery'; }, step), { intervals: [15] }).toBe(true);
    await page.keyboard.press('KeyJ', { delay: 30 });
  }
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').attack.state.phase), { intervals:[15] }).toBe('idle');
  const state = await page.evaluate(() => { const s=(window as any).__GAME__.scene.getScene('Game'), e=s.enemies.getChildren()[0]; return { hp:e.hp, gap:e.x-s.player.x, phase:s.attack.state.phase }; });
  expect(state.hp).toBe(136); expect(state.gap).toBeGreaterThan(15); expect(state.phase).toBe('idle');
});

test('pipe preparation/contact/settling contain full-body transitions and miss trails', async ({ page }) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.scene.pause();
    s.attack.request(1); const frames = [], trails = [];
    for (const dt of [0, 25, 25, 80, 10, 30, 30, 30, 30, 80, 40, 30]) {
      s.attack.advance(dt); s.combatEffects.update(s.player, s.attack.state, s.attack.phaseProgress, s.attack.currentProfile);
      frames.push(s.player.frame.name); trails.push(s.combatEffects.trail?.visible ?? false);
    }
    return { frames, trails, count: s.textures.get('hero-full').frameTotal - 1 };
  });
  expect(new Set(result.frames).size).toBeGreaterThanOrEqual(7);
  expect(result.count).toBe(76);
  expect(result.trails.some(Boolean)).toBe(true);
});

test('contact feedback is localized and group hits spend hitstop only once', async ({ page }) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.scene.pause();
    s.player.body.reset(400, 285); s.player.body.updateFromGameObject();
    s.attack.request(1); s.resolveAttackEvents(s.attack.advance(s.attack.currentProfile.windupMs));
    s.combatEffects.update(s.player, s.attack.state, 0, s.attack.currentProfile);
    const line = s.combatEffects.strikeSegment;
    const enemies = s.enemies.getChildren().slice(0, 2);
    for (const e of enemies) { e.hp = 200; e.hitLockMs = 0; e.body.reset((line.x1 + line.x2) / 2, (line.y1 + line.y2) / 2); e.body.updateFromGameObject(); }
    s.resolveActiveAttack(); const timer = s.hitStopTimer;
    const impact = s.children.getChildren().filter((c: any) => c.name === 'pipe-impact').map((c: any) => ({ x: c.x, y: c.y }));
    const firstHp = enemies.map((e: any) => e.hp);
    s.resolveActiveAttack();
    return { impact, target: { x: enemies[0].body.x, y: enemies[0].body.y, r: enemies[0].body.right, b: enemies[0].body.bottom },
      line: { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 }, firstHp, hp: enemies.map((e: any) => e.hp), sameTimer: timer === s.hitStopTimer, delay: timer?.delay };
  });
  expect(result.impact.length).toBe(2);
  for (const p of result.impact) {
    expect(p.x).toBeGreaterThanOrEqual(result.target.x - 3); expect(p.x).toBeLessThanOrEqual(result.target.r + 3);
    expect(p.y).toBeGreaterThanOrEqual(result.target.y - 3); expect(p.y).toBeLessThanOrEqual(result.target.b + 3);
    const l=result.line, dx=l.x2-l.x1, dy=l.y2-l.y1;
    const t=Math.max(0,Math.min(1,((p.x-l.x1)*dx+(p.y-l.y1)*dy)/(dx*dx+dy*dy)));
    expect(Math.hypot(p.x-l.x1-t*dx,p.y-l.y1-t*dy)).toBeLessThanOrEqual(4);
  }
  expect(result.firstHp).toEqual([184, 184]); expect(result.hp).toEqual(result.firstHp);
  expect(result.sameTimer).toBe(true); expect(result.delay).toBe(50);
});

test('light recoil decays, finisher is stronger and enemies use real hurt poses', async ({ page }) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.scene.pause();
    const e = s.enemies.getChildren()[0]; e.hp = 500;
    e.receiveHit(16, 1, false); e.renderPose();
    const frame = e.frame.name, texture = e.texture.key, phase = e.state, light = e.body.velocity.x;
    e.updateAi(s.player, 80, true, true); const decayed = e.body.velocity.x;
    e.hitLockMs = 0; e.receiveHit(32, 1, true); const strong = e.body.velocity.x;
    return { frame, texture, phase, light, decayed, strong };
  });
  // The dedicated v0.8 street atlas stores its authored recoil at10 (legacy atlas:16–19).
  expect({ texture: result.texture, frame: result.frame, phase: result.phase }).toEqual({ texture: 'enemy-street-walker', frame: 10, phase: 'stagger' });
  expect(result.decayed).toBeLessThan(result.light);
  expect(result.strong).toBeGreaterThan(result.light * 2);
});

test('a real miss plays only pipe air, contact adds impact and finisher has a distinct voice', async ({ page }) => {
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.__voices = [];
    const play = s.sound.play.bind(s.sound);
    s.sound.play = (key: string, config: unknown) => { s.__voices.push(key); return play(key, config); };
  });
  await page.keyboard.press('KeyJ', { delay: 30 }); await page.waitForTimeout(450);
  const miss = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').__voices);
  expect(miss).toHaveLength(1); expect(miss[0]).toMatch(/^pipe-swing-/);
  const hits = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.scene.pause(); s.__voices = [];
    const e = s.enemies.getChildren()[0]; e.hp = 500;
    s.attack.request(1);
    for (let step = 1; step <= 3; step++) {
      const p = s.attack.currentProfile; s.attack.advance(p.windupMs);
      s.resolveAttackEvents([{ type: 'active', step, facing: 1 }]);
      s.combatEffects.update(s.player, s.attack.state, 0, p);
      const l = s.combatEffects.strikeSegment;
      e.body.reset((l.x1+l.x2)/2, (l.y1+l.y2)/2); e.body.updateFromGameObject(); e.hitLockMs = 0;
      s.resolveActiveAttack(); s.cancelHitStop();
      s.attack.advance(p.activeMs+p.recoveryMs-100); s.attack.request(1); s.attack.advance(100);
    }
    return s.__voices;
  });
  expect(hits.filter((x: string) => x.startsWith('pipe-hit-'))).toHaveLength(2);
  expect(hits.filter((x: string) => x.startsWith('pipe-heavy-'))).toHaveLength(1);
  expect(new Set(hits.filter((x: string) => x.startsWith('pipe-swing-'))).size).toBe(3);
});

test('heavy contact uses a restrained camera impulse and respects the effects switch', async ({ page }) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.scene.pause();
    s.combatEffects.confirmHit(300, 270, 32, true, 1, true);
    const effect = s.cameras.main.shakeEffect, intensity = effect.intensity.x;
    effect.reset();
    s.combatEffects.confirmHit(300, 270, 32, true, 1, false);
    return { intensity, disabled: effect.isRunning };
  });
  expect(result.intensity).toBeGreaterThan(0);
  expect(result.intensity).toBeLessThanOrEqual(.004);
  expect(result.disabled).toBe(false);
});

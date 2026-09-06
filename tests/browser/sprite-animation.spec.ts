import { expect, test, type Page } from '@playwright/test';
import { HERO_PIPE_POSES, HERO_LAYOUT, posePoint } from '../../src/game/spriteFrames';

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
}

test('all 172 packed frames contain artwork, no magenta, and contact markers land on visible pixels', async ({ page }) => {
  await start(page);
  const markers = HERO_PIPE_POSES.flatMap((pose, i) => pose.contact ? [0, 2].map(j => {
    const p = posePoint(pose, pose.contact![j], pose.contact![j + 1]);
    return { frame: i + 40, x: HERO_LAYOUT.anchorX + p.x, y: HERO_LAYOUT.anchorY + p.y };
  }) : []);
  const result = await page.evaluate(markers => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    const counts = [], empty = [], pink = [], clipped = [];
    for (const [key, count] of [['hero-full', 76], ['enemy-full', 64], ['boss-full', 32]] as const) {
      const source = s.textures.get(key).getSourceImage();
      const c = source.getContext('2d');
      counts.push(s.textures.get(key).frameTotal - 1);
      for (let i = 0; i < count; i++) {
        const f = s.textures.getFrame(key, i);
        const data = c.getImageData(f.cutX, f.cutY, f.cutWidth, f.cutHeight).data;
        let opaque = 0, touchesEdge = false;
        for (let p = 0; p < data.length; p += 4) if (data[p + 3] > 100) {
          opaque++;
          const pixel = p / 4, x = pixel % f.cutWidth, y = Math.floor(pixel / f.cutWidth);
          if (x === 0 || y === 0 || x === f.cutWidth - 1 || y === f.cutHeight - 1) touchesEdge = true;
          if (data[p] > 180 && data[p + 2] > 180 && data[p + 1] < 80) pink.push(`${key}:${i}`);
        }
        if (touchesEdge) clipped.push(`${key}:${i}`);
        if (opaque < 120) empty.push(`${key}:${i}`);
      }
    }
    const misses = markers.filter(m => {
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
        if (s.textures.getPixelAlpha(m.x + x, m.y + y, 'hero-full', m.frame) > 100) return false;
      }
      return true;
    });
    return { counts, empty, pink, clipped, misses };
  }, markers);
  expect(result).toEqual({ counts: [76, 64, 32], empty: [], pink: [], clipped: [], misses: [] });
});

test('three full-body strikes hit forward only, in both facings, for 16 / 16 / 32 damage', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    s.scene.pause();
    const enemy = s.enemies.getChildren()[0];
    s.player.body.reset(400, 285); s.player.body.updateFromGameObject();
    enemy.hp = 1000;
    const bodyBefore = { w: s.player.body.width, h: s.player.body.height, bottom: s.player.body.bottom };
    const hits = [];
    for (const facing of [1, -1]) {
      s.attack.cancel(); s.attack.request(facing);
      for (let step = 1; step <= 3; step++) {
        const p = s.attack.currentProfile;
        s.attack.advance(p.windupMs);
        s.activeSwing = s.rules.beginSwing();
        s.player.facing = facing; s.player.setFlipX(facing < 0);
        s.combatEffects.update(s.player, { phase: 'idle', step: 0, facing }, 0);
        s.combatEffects.update(s.player, s.attack.state, 0);
        const line = s.combatEffects.strikeSegment;
        const before = enemy.hp;
        enemy.body.reset(400 - facing * 45, 285); enemy.body.updateFromGameObject();
        enemy.hitLockMs = 0; s.resolveActiveAttack();
        const behind = enemy.hp;
        enemy.body.reset((line.x1 + line.x2) / 2, (line.y1 + line.y2) / 2); enemy.body.updateFromGameObject();
        s.resolveActiveAttack(); s.resolveActiveAttack();
        hits.push({ step, facing, frame: s.player.frame.name, damage: before - enemy.hp, behindDamage: before - behind });
        s.cancelHitStop();
        s.attack.advance(p.activeMs + p.recoveryMs - 100);
        if (step < 3) s.attack.request(facing);
        s.attack.advance(100);
      }
    }
    s.player.body.updateFromGameObject();
    return { hits, bodyBefore, bodyAfter: { w: s.player.body.width, h: s.player.body.height, bottom: s.player.body.bottom } };
  });
  expect(result.hits.map(h => h.damage)).toEqual([16, 16, 32, 16, 16, 32]);
  expect(result.hits.map(h => h.behindDamage)).toEqual([0, 0, 0, 0, 0, 0]);
  expect(result.hits.map(h => h.frame)).toEqual([44, 56, 68, 44, 56, 68]);
  expect(result.bodyAfter).toEqual(result.bodyBefore);
  expect(result.bodyAfter.w).toBeCloseTo(20.625);
  expect(result.bodyAfter.h).toBeCloseTo(41.25);
});

test('roll and healing use distinct body frames and death animation completes while physics is frozen', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    s.__frames = [];
    s.events.on('postupdate', () => s.__frames.push(s.player.frame.name));
  });
  await page.keyboard.press('ShiftLeft', { delay: 20 });
  await page.waitForTimeout(210);
  const roll = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').__frames);
  for (const frame of [24, 25, 26, 27]) expect(roll).toContain(frame);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    s.rules.hp = 40; s.__frames = [];
  });
  await page.keyboard.press('KeyQ', { delay: 20 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.hp)).toBe(75);
  const heal = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').__frames);
  for (const frame of [28, 29, 30, 31]) expect(heal).toContain(frame);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    s.__frames = []; s.rules.immunityUntil = 0;
    s.rules.takeDamage(1000); s.onPlayerHurt();
  });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.frame.name)).toBe(35);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').physics.world.isPaused)).toBe(true);
  await page.getByRole('button', { name: /НОВАЯ ДОСТАВКА/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.texture.key)).toBe('hero-full');
});

test('enemy attack phases select complete poses without rotating or resizing the physics body', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    s.scene.pause();
    const enemy = s.enemies.getChildren()[0];
    const frames = [], scales = [];
    enemy.body.reset(445, 285); s.player.body.reset(400, 285);
    enemy.activate(); enemy.cooldownMs = 0;
    enemy.updateAi(s.player, 0, true, true);
    for (const dt of [0, 600, 90, 60, 250]) {
      enemy.updateAi(s.player, dt, true, true); enemy.renderPose();
      frames.push(enemy.frame.name); scales.push([enemy.scaleX, enemy.scaleY, enemy.angle]);
    }
    return { frames, scales };
  });
  expect(result.frames).toEqual([28, 32, 33, 34, 35]);
  expect(result.scales).toEqual(Array(5).fill([1.15, 1.15, 0]));
});

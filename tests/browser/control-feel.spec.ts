import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
});

test('attacking without directional input never carries the player forward', async ({ page }) => {
  const before = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.x);
  await page.keyboard.press('KeyJ', { delay: 20 });
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    return { x: s.player.x, phase: s.attack.state.phase, vx: s.player.body.velocity.x };
  });
  expect(after.phase).toBe('idle');
  expect(Math.abs(after.x - before)).toBeLessThanOrEqual(2);
  expect(after.vx).toBe(0);
});

test('a directional attack is slower than walking and releasing direction stops it immediately', async ({ page }) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.scene.pause();
    const p = s.player;
    p.updateMovement({ left:false, right:true }, 16, true, { phase:'idle', facing:1, progress:0 });
    const walk = p.body.velocity.x;
    s.attack.request(1); s.attack.advance(s.attack.currentProfile.windupMs + 20);
    const combat = { ...s.attack.state, progress:s.attack.phaseProgress };
    p.updateMovement({ left:false, right:true }, 16, true, combat);
    const forward = p.body.velocity.x;
    p.updateMovement({ left:false, right:false }, 16, true, combat);
    const release = p.body.velocity.x;
    p.updateMovement({ left:true, right:false }, 16, true, combat);
    const retreat = p.body.velocity.x;
    return { walk, forward, release, retreat };
  });
  expect(result.forward).toBeGreaterThan(0);
  expect(result.forward).toBeLessThan(result.walk * .8);
  expect(result.release).toBe(0);
  expect(result.retreat).toBeLessThan(0);
});

test('a short directional tap gives a controlled step without a long coast', async ({ page }) => {
  const first = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.x);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(400); await page.keyboard.up('KeyD');
  const release = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.x);
  await page.waitForTimeout(140);
  const stop = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.x);
  expect(release - first).toBeGreaterThan(40);
  expect(release - first).toBeLessThan(70);
  expect(stop - release).toBeLessThan(3);
  await page.keyboard.down('KeyA'); await page.waitForTimeout(40);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.body.velocity.x)).toBeLessThan(0);
  await page.keyboard.up('KeyA');
});

test('dash crosses a melee footprint without the old burst of excessive speed', async ({ page }) => {
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.__dashPeak = 0;
    s.events.on('postupdate', () => { if (s.player.isDashing) s.__dashPeak = Math.max(s.__dashPeak, Math.abs(s.player.body.velocity.x)); });
  });
  const before = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.x);
  await page.keyboard.press('ShiftLeft', { delay: 30 }); await page.waitForTimeout(250);
  const result = await page.evaluate(() => { const s=(window as any).__GAME__.scene.getScene('Game'); return { x:s.player.x, peak:s.__dashPeak }; });
  expect(result.x - before).toBeGreaterThan(55);
  expect(result.x - before).toBeLessThan(85);
  expect(result.peak).toBeLessThanOrEqual(400);
});

test('camera settles promptly after movement release instead of carrying the street onward', async ({ page }) => {
  await page.evaluate(() => {
    const s=(window as any).__GAME__.scene.getScene('Game');
    s.enemies.getChildren().forEach((e:any)=>e.disableBody(true,true));
    s.player.body.reset(600,285.875); s.cameras.main.centerOn(600,180);
  });
  await page.waitForTimeout(500);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(1200); await page.keyboard.up('KeyD');
  const release = await page.evaluate(() => { const s=(window as any).__GAME__.scene.getScene('Game'); return {x:s.player.x,camera:s.cameras.main.scrollX}; });
  await page.waitForTimeout(260);
  const settled = await page.evaluate(() => { const s=(window as any).__GAME__.scene.getScene('Game'); return {x:s.player.x,camera:s.cameras.main.scrollX}; });
  expect(settled.x - release.x).toBeLessThan(3);
  expect(settled.camera - release.camera).toBeLessThan(12);
});

test('restart and disabling shake discard an already-running camera impulse', async ({ page }) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    s.cameras.main.shake(500, .004); s.handleCommand('restart');
    const afterRestart = s.cameras.main.shakeEffect.isRunning;
    s.cameras.main.shake(500, .004); s.handleCommand('shake');
    return { afterRestart, afterDisable: s.cameras.main.shakeEffect.isRunning, enabled: s.shakeEnabled };
  });
  expect(result.enabled).toBe(false);
  expect(result.afterRestart).toBe(false); expect(result.afterDisable).toBe(false);
});

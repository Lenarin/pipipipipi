import { expect, test } from '@playwright/test';

test('a tick crossing into recovery resolves the final forward contact exactly once', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
  const result = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.scene.pause();
    s.player.body.reset(400, 285.875); s.player.body.updateFromGameObject();
    const e = s.enemies.getChildren()[0]; e.hp = 500; e.hitLockMs = 0;
    e.body.setSize(2, 2, false); e.body.position.set(460, 310);
    s.attack.request(1); s.resolveAttackEvents(s.attack.advance(s.attack.currentProfile.windupMs + 78));
    s.combatEffects.update(s.player, s.attack.state, s.attack.phaseProgress);
    s.resolveActiveAttack();
    const before = e.hp;
    // Native scene update sees active progress .65 -> recovery on this 50ms tick.
    s.update(0, 50); const boundary = e.hp;
    s.cancelHitStop(); s.update(0, 16);
    return {before, boundary, after:e.hp, phase:s.attack.state.phase};
  });
  expect(result).toEqual({before:500, boundary:484, after:484, phase:'recovery'});
});

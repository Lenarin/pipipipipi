import { expect, test } from '@playwright/test';

async function start(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
}

test('a lethal active hit at the gate can transition in the same frame without freezing the new stage', async ({ page }) => {
  await start(page);

  const transition = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const [target, ...otherEnemies] = scene.enemies.getChildren();
    otherEnemies.forEach((enemy: any) => enemy.destroy());
    scene.player.body.reset(scene.level.exitX - 42, 280);
    scene.player.facing = 1;
    target.body.reset(scene.player.x + 34, scene.player.y);
    // Synchronize the wide atlas frame's body offset before same-frame collision assertions.
    target.body.updateFromGameObject();
    target.body.moves = false;
    target.hp = scene.rules.damage;

    scene.queueAttack();
    scene.resolveAttackEvents(scene.attack.advance(65));
    scene.combatEffects.update(scene.player, scene.attack.state, scene.attack.phaseProgress);
    scene.resolveActiveAttack();
    const lethalHitStartedHitStop = !target.active && scene.hitStopActive;
    scene.interact();
    scene.player.body.reset(100, 80);

    return {
      lethalHitStartedHitStop,
      stage: scene.rules.stage,
      hitStopActive: scene.hitStopActive,
      physicsPaused: scene.physics.world.isPaused,
      tweensPaused: scene.tweens.paused,
      timePaused: scene.time.paused,
      player: { x: scene.player.x, y: scene.player.y },
    };
  });

  expect(transition).toMatchObject({
    lethalHitStartedHitStop: true,
    stage: 1,
    hitStopActive: false,
    physicsPaused: false,
    tweensPaused: false,
    timePaused: false,
  });

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(180);
  await page.keyboard.up('KeyD');
  const afterMotion = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return { x: scene.player.x, y: scene.player.y, velocityY: scene.player.body.velocity.y };
  });
  expect(afterMotion.x).toBeGreaterThan(transition.player.x + 15);
  expect(afterMotion.y).toBeGreaterThan(transition.player.y + 5);
  expect(afterMotion.velocityY).toBeGreaterThan(0);
});

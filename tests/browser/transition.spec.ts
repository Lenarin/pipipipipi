import { expect, test } from '@playwright/test';

async function start(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
}

test('a lethal active hit at the exit can open the outcome in the same frame and resume the new chapter', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    s.enemies.getChildren().filter((e: any) => e.kind !== 'boss').forEach((e: any) => e.destroy());
    s.player.body.reset(s.level.bossIntroX, 280); s.interact();
  });
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();

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
    scene.resolveAttackEvents(scene.attack.advance(scene.attack.currentProfile.windupMs));
    scene.combatEffects.update(scene.player, scene.attack.state, scene.attack.phaseProgress);
    scene.resolveActiveAttack();
    const lethalHitStartedHitStop = !target.active && scene.hitStopActive;
    scene.interact();
    return {
      lethalHitStartedHitStop,
      stage: scene.rules.stage,
      mode: scene.rules.mode,
      hitStopActive: scene.hitStopActive,
    };
  });

  expect(transition).toMatchObject({
    lethalHitStartedHitStop: true,
    stage: 0,
    mode: 'dialogue',
    hitStopActive: false,
  });
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  const newChapter = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    s.player.body.reset(100, 80);
    return { stage: s.rules.stage, physicsPaused: s.physics.world.isPaused, tweensPaused: s.tweens.paused, timePaused: s.time.paused };
  });
  expect(newChapter).toEqual({ stage: 1, physicsPaused: false, tweensPaused: false, timePaused: false });

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(180);
  await page.keyboard.up('KeyD');
  const afterMotion = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return { x: scene.player.x, y: scene.player.y, velocityY: scene.player.body.velocity.y };
  });
  expect(afterMotion.x).toBeGreaterThan(115);
  expect(afterMotion.y).toBeGreaterThan(85);
  expect(afterMotion.velocityY).toBeGreaterThan(0);
});

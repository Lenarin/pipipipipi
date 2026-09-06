import { expect, test } from '@playwright/test';

for (const kind of ['walker', 'spitter', 'hound']) test(`${kind} telegraph progresses through full-body preparation poses without resizing its body`, async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  const result = await page.evaluate(kind => {
    const s = (window as any).__GAME__.scene.getScene('Game'); s.scene.pause();
    const e = s.enemies.getChildren().find((e: any) => e.kind === kind);
    s.player.setPosition(e.x - 40, e.y);
    e.activate(); e.cooldownMs = 0; e.updateAi(s.player, 1, true, true);
    const frames = [], sizes = [];
    for (let i=0; i<4; i++) {
      if (i) e.attackCycle.advance(e.attackProfile.windupMs / 4);
      e.state = e.attackCycle.state.phase; e.renderPose();
      frames.push(e.frame.name); sizes.push([e.body.width, e.body.height, e.angle]);
    }
    return { frames, sizes, phase:e.state };
  }, kind);
  expect(result.phase).toBe('windup');
  expect(new Set(result.frames).size).toBe(4);
  expect(new Set(result.sizes.map(x => JSON.stringify(x))).size).toBe(1);
});

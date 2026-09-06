import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const evidence = '.artifacts/v08-final-fix';

for (const mode of ['read', 'skip']) test(`${mode} rough landing resumes beside a transparent nonblocking wreck with the package`, async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  // Use real campaign prerequisites to reach the airport exit; the transition itself is native.
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    const finish = (id: string) => s.campaign.complete(s.campaign.begin(id));
    finish('last-khachapuri'); s.campaign.defeatBoss('mark'); finish('wanted');
    finish('airport-chief'); s.campaign.defeatBoss('chief');
    s.rules.stage = 1; s.buildStage(1);
    [...s.enemies.getChildren()].forEach((e: any) => e.destroy());
    s.player.body.reset(s.level.exitX, 280);
  });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
  await page.keyboard.press('KeyE', { delay: 40 });
  await expect(page.locator('#dialogue-panel')).toHaveAttribute('data-scene', 'rough-landing');
  if (mode === 'skip') await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  else {
    for (let step = 0; step < 20 && await page.locator('#dialogue-panel').isVisible(); step++) {
      await page.getByRole('button', { name: 'Далее', exact: true }).click();
    }
  }
  await expect(page.locator('#dialogue-panel')).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
  const opening = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    const wreck = s.children.getByName('landmark-wreck');
    const bounds = wreck?.getBounds();
    return {
      stage: s.rules.stage, hasPackage: s.campaign.hasPackage, mode: s.rules.mode,
      active: s.scene.isActive(), physicsPaused: s.physics.world.isPaused, x: s.player.x,
      platforms: s.platforms.getChildren().map((p: any) => [p.body.x, p.body.y, p.body.width, p.body.height]),
      wreck: wreck && { texture: wreck.texture.key, visible: wreck.visible, alpha: wreck.alpha, hasBody: Boolean(wreck.body),
        behindPlayer: wreck.depth < s.player.depth, bounds: { left: bounds.left, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height },
        inView: s.cameras.main.worldView.contains(bounds.centerX, bounds.centerY) },
    };
  });
  expect(opening).toMatchObject({ stage: 2, hasPackage: true, mode: 'playing', active: true, physicsPaused: false });
  expect(opening.x).toBeCloseTo(110, 1);
  expect(opening.wreck).toMatchObject({ texture: 'landmark-wreck', visible: true, alpha: 1, hasBody: false, behindPlayer: true, inView: true });
  expect(opening.wreck.bounds.bottom).toBeCloseTo(312, 1);
  expect(opening.wreck.bounds.left).toBeGreaterThanOrEqual(0);
  expect(opening.wreck.bounds.right).toBeLessThan(280);
  expect(opening.wreck.bounds.width).toBeGreaterThan(140);
  expect(opening.wreck.bounds.height).toBeGreaterThan(55);
  expect(opening.platforms).toEqual([[0, 312, 2400, 44], [277.5, 227, 145, 18], [640, 193, 180, 18], [1015, 239, 130, 18], [1515, 219, 150, 18], [1870, 181, 180, 18]]);
  await mkdir(evidence, { recursive: true });
  const native = await page.evaluate(() => new Promise<string>(resolve => (window as any).__GAME__.renderer.snapshot((image: HTMLImageElement) => resolve(image.src.split(',')[1]))));
  await writeFile(`${evidence}/suburb-opening-${mode}-logical.png`, Buffer.from(native, 'base64'));
  await page.locator('#fullscreen-button').click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.screenshot({ path: `${evidence}/suburb-opening-${mode}-fullscreen.png` });
  await page.evaluate(() => document.exitFullscreen());
  await page.keyboard.down('KeyD');
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.x)).toBeGreaterThan(290);
  await page.keyboard.up('KeyD');
  const traversed = await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    return { hasPackage: s.campaign.hasPackage, feet: s.player.body.bottom, grounded: s.player.grounded };
  });
  expect(traversed).toMatchObject({ hasPackage: true, grounded: true });
  expect(traversed.feet).toBeCloseTo(312, 1);
});

test('missing required wreck blocks startup and retry loads its transparent cutout', async ({ page }) => {
  let blocked = true;
  await page.route('**/assets/prop-plane-wreck-v8-source.png', route => blocked ? route.abort() : route.continue());
  await page.goto('/');
  await expect(page.getByRole('button', { name: /ПОВТОРИТЬ/ })).toBeVisible();
  await expect(page.locator('#loading-status')).toContainText('landmark-wreck');
  blocked = false;
  await page.locator('#start-button').click();
  await page.getByRole('button', { name: 'Начать', exact: true }).click();
  const alpha = await page.evaluate(() => {
    const frame = (window as any).__GAME__.textures.get('landmark-wreck').get();
    const image = frame.source.image;
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0, opaque = 0;
    for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] === 0) transparent++; if (pixels[i] >= 100) opaque++; }
    return { transparent, opaque, total: pixels.length / 4 };
  });
  expect(alpha.transparent / alpha.total).toBeGreaterThan(.25);
  expect(alpha.opaque / alpha.total).toBeGreaterThan(.1);
});

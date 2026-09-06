import { expect, test } from '@playwright/test';

test('fullscreen keeps the Phaser canvas centered without double CSS offsets', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1920, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.locator('#fullscreen-button').click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await expect.poll(() => page.evaluate(() => {
      const r = document.querySelector('canvas')!.getBoundingClientRect();
      return Math.max(Math.abs(r.top - (innerHeight - r.bottom)), Math.abs(r.left - (innerWidth - r.right)));
    })).toBeLessThan(2);
    const ratio = await page.evaluate(() => {
      const r = document.querySelector('canvas')!.getBoundingClientRect();
      return r.width / r.height;
    });
    expect(ratio).toBeCloseTo(16 / 9, 2);
    await page.evaluate(() => document.exitFullscreen());
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  }
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /НАЧАТЬ ЗАНОВО/ }).click();
  await expect(page.locator('#health-label')).toHaveText('100 / 100');
});

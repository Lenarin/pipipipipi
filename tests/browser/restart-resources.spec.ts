import { expect, test } from '@playwright/test';

test('repeated UI restarts release old scenery textures and update-list objects', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await page.waitForTimeout(300);
  const counts = () => page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game');
    return { textures: Object.keys(s.textures.list).length, updates: s.sys.updateList.getActive().length, children: s.children.length };
  });
  const before = await counts();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /НАЧАТЬ ЗАНОВО/ }).click();
    await page.getByRole('button', { name: 'Пропустить сцену' }).click();
    await page.waitForTimeout(100);
  }
  expect(await counts()).toEqual(before);
  await expect(page.locator('#health-label')).toHaveText('100 / 100');
});

test('paired focus loss and return resume native audio and release completed one-shots', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await expect.poll(() => page.evaluate(() => { const a = (window as any).__GAME__.sound; return !a.locked && a.context.state === 'running' && a.context.currentTime > .25; })).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.sound.context.state)).toBe('suspended');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('button', { name: /ПРОДОЛЖИТЬ/ }).click();
  await page.keyboard.press('KeyJ'); await page.waitForTimeout(600);
  expect(await page.evaluate(() => ({ context: (window as any).__GAME__.sound.context.state,
    voices: (window as any).__GAME__.sound.sounds.length }))).toEqual({ context: 'running', voices: 1 });
});

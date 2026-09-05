import { expect, test } from '@playwright/test';

const muted = (page: import('@playwright/test').Page) => page.locator('#sound-button').getAttribute('aria-pressed');

test('M toggles sound from the title and from paused gameplay', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ })).toBeEnabled();

  const titleValue = await muted(page);
  await page.keyboard.press('KeyM', { delay: 40 });
  await expect.poll(() => muted(page)).not.toBe(titleValue);

  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await page.keyboard.press('Escape', { delay: 40 });
  await expect(page.getByRole('heading', { name: 'Пауза' })).toBeVisible();
  const pausedValue = await muted(page);
  await page.keyboard.press('KeyM', { delay: 40 });
  await expect.poll(() => muted(page)).not.toBe(pausedValue);
});

test('a failed visual asset offers retry and recovers on reload', async ({ page }) => {
  let shouldFail = true;
  await page.route('**/assets/hero-source.png', async route => {
    if (shouldFail) await route.abort();
    else await route.continue();
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /ПОВТОРИТЬ ЗАГРУЗКУ/ })).toBeEnabled();
  await expect(page.locator('#loading-status')).toHaveText(/hero-source/);
  shouldFail = false;
  await page.getByRole('button', { name: /ПОВТОРИТЬ ЗАГРУЗКУ/ }).click();
  await expect(page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ })).toBeEnabled();
});

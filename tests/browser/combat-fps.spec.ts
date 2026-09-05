import { expect, test } from '@playwright/test';

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus || page.isClosed()) return;
  const diagnostic = await page.evaluate(() => {
    const game = (window as any).__GAME__, boot = game?.scene.getScene('Boot');
    return {
      visibility: document.visibilityState,
      loop: game && { running: game.loop.running, frame: game.loop.frame, fps: game.loop.actualFps },
      scenes: game?.scene.scenes.map((s: any) => ({ key: s.sys.settings.key, status: s.sys.settings.status })),
      loader: boot && { state: boot.load.state, progress: boot.load.progress, inflight: boot.load.inflight.size, processing: boot.load.queue.size },
    };
  });
  await testInfo.attach('Phaser startup and loop state', { body: JSON.stringify(diagnostic), contentType: 'application/json' });
});

for (const fps of [30, 60, 120]) test(`real Phaser ${fps}Hz loop keeps combo damage, spacing and cancellation`, async ({ page }) => {
  // Test-only bootstrap substitution uses Phaser's own timeout-backed loop, allowing
  // 120Hz verification even when headless Chromium's display RAF is limited to 60Hz.
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch(); const original = await response.text();
    const body = original.replace('pixelArt: true,', `fps: { target: ${fps}, forceSetTimeOut: true, smoothStep: false }, pixelArt: true,`);
    if (body === original) throw new Error('Could not configure the Phaser test loop');
    await route.fulfill({ response, body });
  });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type()==='error') errors.push(m.text()); });
  await page.goto('/'); await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
  await page.evaluate(() => {
    const s = (window as any).__GAME__.scene.getScene('Game'), e = s.enemies.getChildren()[0];
    s.player.body.reset(400,285.875); s.player.facing=1;
    e.body.reset(441,294.75); e.hp=200; e.cooldownMs=5000; e.activate();
    s.__deltas=[]; s.events.on('update', (_: number, dt: number) => s.__deltas.push(dt));
  });
  await page.keyboard.press('KeyJ', { delay: 10 });
  for (const step of [1,2]) {
    await expect.poll(() => page.evaluate(n => { const s=(window as any).__GAME__.scene.getScene('Game'); return s.attack.state.step===n && s.attack.state.phase==='recovery'; },step),{ intervals:[10] }).toBe(true);
    await page.keyboard.press('KeyJ', { delay: 10 });
  }
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').attack.state.phase), { intervals:[15] }).toBe('idle');
  const result = await page.evaluate(() => {
    const s=(window as any).__GAME__.scene.getScene('Game'), e=s.enemies.getChildren()[0];
    return { hp:e.hp, gap:e.x-s.player.x, hz:1000/(s.__deltas.reduce((a:number,b:number)=>a+b,0)/s.__deltas.length) };
  });
  console.log(JSON.stringify({ requestedHz:fps, ...result }));
  expect(result.hp).toBe(136); expect(result.gap).toBeGreaterThan(15);
  expect(result.hz).toBeGreaterThan(fps*.7); expect(result.hz).toBeLessThan(fps*1.15);
  await page.keyboard.press('KeyJ', { delay:10 }); await page.keyboard.press('ShiftLeft', { delay:10 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.isDashing),{intervals:[10]}).toBe(true);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').attack.state.phase)).toBe('idle');
  expect(errors).toEqual([]);
});

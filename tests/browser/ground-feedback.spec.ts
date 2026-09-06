import { expect, test } from '@playwright/test';

test('the hero casts a ground contact shadow that stays on the surface during a jump', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button',{name:/ВОЙТИ В ГОРОД/}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
  const grounded = await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('Game'), shadow=s.children.getByName('hero-shadow');
    return shadow && {x:shadow.x,y:shadow.y,width:shadow.displayWidth,alpha:shadow.alpha,heroX:s.player.x,feet:s.player.body.bottom};
  });
  expect(grounded).toBeTruthy();
  expect(grounded.x).toBeCloseTo(grounded.heroX,0);
  expect(grounded.y).toBeCloseTo(grounded.feet,0);
  expect(grounded.alpha).toBeGreaterThan(.2);
  await page.keyboard.press('Space',{delay:40}); await page.waitForTimeout(120);
  const airborne = await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('Game'), shadow=s.children.getByName('hero-shadow');
    return {y:shadow.y,width:shadow.displayWidth,feet:s.player.body.bottom};
  });
  expect(airborne.y).toBeCloseTo(grounded.y,0);
  expect(airborne.width).toBeLessThan(grounded.width);
  expect(airborne.feet).toBeLessThan(airborne.y-15);
});

test('running and landing create small ground droplets, idle does not continuously emit', async ({page})=>{
  await page.goto('/'); await page.getByRole('button',{name:/ВОЙТИ В ГОРОД/}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
  await page.waitForTimeout(500);
  const idle=await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('Game');return s.children.getByName('ground-droplets')?.getAliveParticleCount()??-1;});
  expect(idle).toBe(0);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(450);
  const moving=await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('Game');return s.children.getByName('ground-droplets')?.getAliveParticleCount()??0;});
  await page.keyboard.up('KeyD');
  expect(moving).toBeGreaterThan(0);
  expect(moving).toBeLessThan(12);
  await page.keyboard.press('Space',{delay:40});
  await expect.poll(()=>page.evaluate(()=>(window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(false);
  await page.waitForFunction(()=>(window as any).__GAME__.scene.getScene('Game').player.grounded);
  expect(await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('Game');return s.children.getByName('ground-droplets').getAliveParticleCount();})).toBeGreaterThan(0);
});

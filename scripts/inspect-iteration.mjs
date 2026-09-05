import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto('http://127.0.0.1:5173');
await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).waitFor();
await page.screenshot({ path: '.artifacts/title-v02.png' });
await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
await page.waitForTimeout(700);
await page.keyboard.down('KeyD');
await page.waitForTimeout(1550);
await page.keyboard.up('KeyD');
await page.keyboard.down('KeyJ');
await page.waitForTimeout(130);
await page.keyboard.up('KeyJ');
await page.screenshot({ path: '.artifacts/combat-v02.png' });
await page.waitForTimeout(500);
console.log(JSON.stringify(await page.evaluate(() => {
  const scene = window.__GAME__.scene.getScene('Game');
  return { mode: scene.rules.mode, hp: scene.rules.hp, player: { x: scene.player.x, y: scene.player.y }, camera: { y: scene.cameras.main.scrollY, zoom: scene.cameras.main.zoom }, enemies: scene.enemies.getChildren().map(e => ({ id: e.id, x: e.x, y: e.y, state: e.state })) };
})));
await page.evaluate(() => {
  const scene = window.__GAME__.scene.getScene('Game');
  scene.rules.grantImmunity(10000);
  scene.player.body.reset(755, 178);
});
await page.waitForTimeout(650);
await page.screenshot({ path: '.artifacts/courtyard-v02.png' });
console.log(JSON.stringify({ errors }));
await browser.close();

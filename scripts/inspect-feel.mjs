import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const tag = process.argv[2] ?? 'v05';
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await page.waitForTimeout(450);
  await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    s.scene.pause(); s.physics.pause(); s.time.paused = true;
    s.player.body.reset(400, 285.875); s.player.body.updateFromGameObject();
    s.player.facing = 1; s.player.setFlipX(false);
    const enemies = s.enemies.getChildren(), e = enemies[0];
    enemies.slice(1).forEach(x => x.setVisible(false));
    e.body.reset(439, 294.75); e.body.updateFromGameObject(); e.setFlipX(true); e.hp = 200;
    s.cameras.main.stopFollow().setScroll(110, 30);
    document.getElementById('toast').hidden = true;
    s.combatEffects.update(s.player, { phase: 'active', step: 3, facing: 1 }, 0);
    s.combatEffects.update(s.player, { phase: 'active', step: 3, facing: 1 }, .6);
    e.receiveHit(32, 1, true); e.clearTint(); e.renderPose();
    s.combatEffects.confirmHit(431, 293, 32, true, 1, false);
  });
  await page.screenshot({ path: `.artifacts/feel-${tag}-contact.png` });
  await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    s.sound.mute = true;
    s.children.getChildren().filter(c => c.type === 'Text').forEach(c => c.setVisible(false));
  });
  await page.screenshot({ path: `.artifacts/feel-${tag}-no-numbers.png` });
  await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    s.children.getChildren().forEach(c => c.setVisible?.(false));
    s.cameras.main.stopFollow().setZoom(1).setScroll(0, 0);
    s.add.rectangle(0, 0, 640, 360, 0x142a34).setOrigin(0).setDepth(100);
    for (let i=0; i<24; i++) {
      const x=40+i%8*80, y=92+Math.floor(i/8)*107;
      s.add.image(x,y,'hero-full',40+i).setOrigin(.5,128/144).setScale(.82).setDepth(101);
      s.add.text(x,y+5,String(i),{fontSize:'10px',color:'#b7cfc7'}).setOrigin(.5).setDepth(102);
    }
  });
  await page.screenshot({ path: `.artifacts/feel-${tag}-poses.png` });
  if(errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ inspected: ['contact','muted contact without damage numbers','24 pipe poses'], errors }));
} finally { await browser.close(); }

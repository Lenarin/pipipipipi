import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await page.waitForTimeout(350);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(1200); await page.keyboard.up('KeyD');
  await page.screenshot({ path: '.artifacts/sprites-v04-game.png' });
  const contacts = await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    s.physics.pause(); s.time.paused = true; s.scene.pause();
    s.player.body.reset(400, 285); s.player.facing = 1; s.player.hurtMs = 0; s.player.dashMs = 0;
    const enemy = s.enemies.getChildren()[0]; enemy.body.reset(447, 295);
    const rows = [];
    for (let step = 1; step <= 3; step++) for (const progress of [0, .8]) {
      s.combatEffects.update(s.player, { phase: 'active', step, facing: 1 }, progress);
      const l = s.combatEffects.strikeSegment;
      rows.push({ step, progress, frame: s.player.frame.name, line: { x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2 } });
    }
    return rows;
  });
  console.log(JSON.stringify({ contacts, errors }));
  await page.screenshot({ path: '.artifacts/sprites-v04-contact.png' });
  for (const sheet of ['hero', 'enemy']) {
    await page.evaluate(sheet => {
      const g = window.__GAME__, s = g.scene.getScene('Game');
      document.getElementById('hud').hidden = true;
      document.querySelectorAll('.toast').forEach(e => { e.hidden = true; });
      s.children.getChildren().forEach(c => c.setVisible?.(false));
      s.cameras.main.stopFollow().setZoom(1).setScroll(0, 0);
      s.add.rectangle(0, 0, 640, 360, 0x152a34).setOrigin(0).setDepth(100);
      const frames = sheet === 'hero' ? 32 : 28;
      for (let i = 0; i < frames; i++) {
        const x = 43 + i % 8 * 79, y = 76 + Math.floor(i / 8) * 85;
        const texture = sheet === 'hero' ? 'hero-full' : i < 16 ? 'enemy-full' : 'boss-full';
        const frame = sheet === 'hero' ? i + 8 : i < 16 ? i : i - 16;
        s.add.image(x, y, texture, frame).setOrigin(.5, sheet === 'hero' ? 128 / 144 : 112 / 128).setScale(sheet === 'hero' ? .83 : .95).setDepth(101);
        s.add.text(x, y + 3, String(frame), { fontSize: '9px', color: '#a7c2bb' }).setOrigin(.5).setDepth(102);
      }
    }, sheet);
    await page.screenshot({ path: `.artifacts/sprites-v04-${sheet}-sheet.png` });
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); }

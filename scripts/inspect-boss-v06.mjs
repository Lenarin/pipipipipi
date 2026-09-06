import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  await page.goto('http://127.0.0.1:5173'); await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  for (let row = 0; row < 2; row++) {
    await page.evaluate(row => {
      const s = window.__GAME__.scene.getScene('Game'); s.scene.pause(); s.physics.pause();
      s.children.getChildren().forEach(c => c.setVisible?.(false));
      s.cameras.main.stopFollow().setZoom(1).setScroll(0, 0);
      s.add.rectangle(0, 0, 640, 360, 0x192d36).setOrigin(0).setDepth(100);
      for (let i = 0; i < 8; i++) {
        const x = 70 + i % 4 * 155, y = 132 + Math.floor(i / 4) * 165;
        s.add.image(x, y, 'boss-full', 16 + row * 8 + i).setOrigin(.5, 112 / 128).setDepth(101);
        s.add.graphics().setDepth(102).lineStyle(1, 0x7ab4a7, .4).strokeRect(x - 22, y - 62, 44, 62);
        s.add.text(x + 50, y - 4, String(16 + row * 8 + i), { fontSize: '9px', color: '#c3cbb6' }).setDepth(102);
      }
      document.getElementById('hud').hidden = true;
      document.getElementById('toast').hidden = true;
    }, row);
    await page.screenshot({ path: `.artifacts/v06-boss-poses-${row + 1}.png` });
  }
  console.log('16 boss attack frames at game scale, fixed body boxes overlaid');
} finally { await browser.close(); }

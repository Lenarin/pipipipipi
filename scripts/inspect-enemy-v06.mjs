import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  await page.goto('http://127.0.0.1:5173'); await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await page.evaluate(() => {
    const s=window.__GAME__.scene.getScene('Game'); s.scene.pause(); s.physics.pause();
    s.children.getChildren().forEach(c=>c.setVisible?.(false));
    s.cameras.main.stopFollow().setZoom(1).setScroll(0,0);
    s.add.rectangle(0,0,640,360,0x192d36).setOrigin(0).setDepth(100);
    for(let i=0;i<24;i++) {
      const x=40+i%8*80, y=100+Math.floor(i/8)*105;
      s.add.image(x,y,'enemy-full',28+i).setOrigin(.5,112/128).setScale(1.15).setDepth(101);
      s.add.text(x,y+8,String(28+i),{fontSize:'10px',color:'#c3cbb6'}).setOrigin(.5).setDepth(102);
      const g=s.add.graphics().setDepth(102), w=(i<16?18:26)*1.15,h=(i<16?30:18)*1.15;
      g.lineStyle(1,0x7ab4a7,.4).strokeRect(x-w/2,y-h,w,h);
    }
    document.getElementById('toast').hidden=true;
  });
  await page.screenshot({path:'.artifacts/enemy-v06-poses.png'});
  console.log('24 full-body enemy attack poses captured at game scale');
} finally { await browser.close(); }

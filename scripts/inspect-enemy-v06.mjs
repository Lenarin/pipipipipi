import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  await page.goto('http://127.0.0.1:5173'); await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await page.evaluate((death) => {
    const s=window.__GAME__.scene.getScene('Game'); s.scene.pause(); s.physics.pause();
    s.children.getChildren().forEach(c=>c.setVisible?.(false));
    s.cameras.main.stopFollow().setZoom(1).setScroll(0,0);
    s.add.rectangle(0,0,640,360,0x192d36).setOrigin(0).setDepth(100);
    for(let i=0;i<(death ? 16 : 24);i++) {
      const x=40+i%(death ? 4 : 8)*(death ? 155 : 80), y=death ? 65+Math.floor(i/4)*83 : 100+Math.floor(i/8)*105;
      s.add.image(x,y,death && i>=12 ? 'boss-full' : 'enemy-full',death ? (i<12 ? 52+i : i) : 28+i).setOrigin(.5,112/128).setScale(death && i>=12 ? 1 : 1.15).setDepth(101);
      s.add.text(x,y+8,String(death ? (i<12 ? 52+i : i) : 28+i),{fontSize:'10px',color:'#c3cbb6'}).setOrigin(.5).setDepth(102);
      const g=s.add.graphics().setDepth(102), w=(death ? (i<8?18:i<12?26:44) : (i<16?18:26))*1.15,h=(death ? (i<8?30:i<12?18:62) : (i<16?30:18))*1.15;
      g.lineStyle(1,0x7ab4a7,.4).strokeRect(x-w/2,y-h,w,h);
    }
    document.getElementById('toast').hidden=true;
  }, process.argv.includes('--death'));
  await page.screenshot({path:process.argv.includes('--death') ? '.artifacts/enemy-v06-death.png' : '.artifacts/enemy-v06-poses.png'});
  console.log('Full-body enemy poses captured at game scale');
} finally { await browser.close(); }

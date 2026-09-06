import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').player.grounded);
  await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game'); s.scene.pause();
    s.player.body.reset(400, 285.875); s.player.body.updateFromGameObject();
    const e = s.enemies.getChildren()[0]; e.body.reset(461, 294.75); e.body.updateFromGameObject(); e.hp = 500;
    s.enemies.getChildren().slice(1).forEach(e => e.setVisible(false));
    s.cameras.main.stopFollow().setScroll(110, 30);
    document.getElementById('toast').hidden = true;
  });
  for (const [phase, progress, name] of [['windup', .6, 'loaded'], ['active', .3, 'contact'], ['active', .8, 'follow-through']]) {
    await page.evaluate(({phase,progress}) => {
      const s = window.__GAME__.scene.getScene('Game');
      if (phase === 'windup') s.combatEffects.clear();
      else if (progress === .3) s.combatEffects.update(s.player,{phase:'active',step:1,facing:1},0);
      s.combatEffects.update(s.player,{phase,step:1,facing:1},progress);
    }, {phase,progress});
    await page.screenshot({path:`.artifacts/pipe-v07-${name}.png`});
  }
  await page.evaluate(() => {
    const s=window.__GAME__.scene.getScene('Game');
    s.children.getChildren().forEach(c=>c.setVisible?.(false));
    s.cameras.main.stopFollow().setZoom(1).setScroll(0,0);
    s.add.rectangle(0,0,640,360,0x142a34).setOrigin(0).setDepth(100);
    s.__posePreview=[];
  });
  for (let step=1;step<=3;step++) {
    await page.evaluate(step=>{
      const s=window.__GAME__.scene.getScene('Game');
      s.__posePreview.forEach(p=>p.destroy()); s.__posePreview=[];
      for(let i=0;i<12;i++) {
        const x=66+i%4*160,y=93+Math.floor(i/4)*107;
        s.__posePreview.push(s.add.image(x,y,'hero-full',40+(step-1)*12+i).setOrigin(.5,128/144).setScale(.6875).setDepth(101));
        s.__posePreview.push(s.add.text(x,y+5,`${step}:${i}`,{fontSize:'9px',color:'#b7cfc7'}).setOrigin(.5).setDepth(102));
      }
    },step);
    await page.screenshot({path:`.artifacts/pipe-v07-poses-${step}.png`});
  }
  if(errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({inspected:['loaded','contact','follow-through','36 full-body poses'],errors}));
} finally { await browser.close(); }

import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173');
  console.log(JSON.stringify(await page.evaluate(async () => {
    const { findSpriteComponents } = await import('/src/game/spriteAtlas.ts');
    const { keyBackground } = await import('/src/game/spriteImport.ts');
    const results = [];
    for (const name of ['diagonal', 'sweep', 'heavy', 'locomotion']) {
      const image = new Image(); image.src = `/assets/hero-${name === 'locomotion' ? name : `pipe-${name}`}-v7-source.png`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, image.width, image.height); keyBackground(pixels.data);
      const { components } = findSpriteComponents(pixels.data, image.width, image.height, name === 'locomotion' ? 8 : 12);
      results.push({name, width:image.width, height:image.height, components});
    }
    return results;
  }), null, 2));
} finally { await browser.close(); }

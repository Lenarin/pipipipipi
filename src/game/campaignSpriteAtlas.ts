import type Phaser from 'phaser';
import { BOSSES, CAMPAIGN_LAYOUT, FACTIONS, ROLES } from './campaignArt';
import { findSpriteComponents } from './spriteAtlas';
import { keyedCanvas, registerCanvas } from './portraitAtlas';
import { addPixelOutline } from './spriteImport';

const bossRoots: Record<string, readonly number[]> = {
  mark: [122, 375, 606, 850, 128, 359, 590, 798, 96, 391, 633, 868, 130, 356, 608, 872, 124, 361, 608, 845, 110, 341, 611, 872],
  chief: [137, 365, 587, 871, 138, 363, 600, 866, 126, 371, 606, 862, 133, 362, 584, 851, 116, 372, 616, 837, 123, 353, 599, 873],
  miller: [133, 384, 612, 860, 125, 366, 610, 863, 127, 365, 616, 861, 146, 365, 610, 860, 131, 381, 611, 858, 123, 354, 622, 873],
};

function importActor(scene: Phaser.Scene, key: string, count: number, visualHeight: number, roots?: readonly number[]): void {
  const source = keyedCanvas(scene, `${key}-source`);
  const sourcePixels = source.getContext('2d')!.getImageData(0, 0, source.width, source.height).data;
  const { labels, components } = findSpriteComponents(sourcePixels, source.width, source.height, count);
  const { width, height, anchorX, anchorY } = CAMPAIGN_LAYOUT;
  const canvas = document.createElement('canvas'); canvas.width = width * 4; canvas.height = height * count / 4;
  const context = canvas.getContext('2d')!; context.imageSmoothingEnabled = false;
  const scale = visualHeight / (components[0].bottom - components[0].top + 1);
  components.forEach((bounds, index) => {
    const sw = bounds.right - bounds.left + 1, sh = bounds.bottom - bounds.top + 1;
    const cutout = document.createElement('canvas'); cutout.width = sw; cutout.height = sh;
    const cutContext = cutout.getContext('2d')!, data = cutContext.createImageData(sw, sh);
    let footSum = 0, footCount = 0;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const from = (bounds.top + y) * source.width + bounds.left + x;
      if (labels[from] !== bounds.id) continue;
      data.data.set(sourcePixels.subarray(from * 4, from * 4 + 4), (y * sw + x) * 4);
      if (y >= sh - 8) { footSum += bounds.left + x; footCount++; }
    }
    cutContext.putImageData(data, 0, 0);
    const root = roots?.[index] ?? (index === 11 ? (bounds.left + bounds.right) / 2 : footSum / footCount);
    const dx = anchorX + Math.round((bounds.left - root) * scale), dy = anchorY - Math.round(sh * scale);
    const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
    if (dx < 2 || dy < 2 || dx + dw > width - 2 || dy + dh > height - 2) throw new Error(`Обрезанный кадр: ${key}/${index}`);
    const fx = index % 4 * width, fy = Math.floor(index / 4) * height;
    context.drawImage(cutout, fx + dx, fy + dy, dw, dh);
    const frame = context.getImageData(fx, fy, width, height);
    addPixelOutline(frame.data, width, height, [30, 39, 48]); context.putImageData(frame, fx, fy);
  });
  registerCanvas(scene, key, canvas, width, height);
  for (const [suffix, frames, fps, repeat] of [
    ['walk', [0, 1, 0, 2], 8, -1], ['death', count === 24 ? [20, 21, 22, 23] : [10, 11, 11], count === 24 ? 8 : 7, 0],
  ] as const) scene.anims.create({ key: `${key}-${suffix}`, frames: scene.anims.generateFrameNumbers(key, { frames: [...frames] }), frameRate: fps, repeat });
}

export function importCampaignSprites(scene: Phaser.Scene): void {
  for (const boss of BOSSES) importActor(scene, `boss-${boss}`, 24, 62, bossRoots[boss]);
  for (const faction of FACTIONS) for (const role of ROLES) importActor(scene, `enemy-${faction}-${role}`, 12, role === 'hound' ? 26 : 36);
  // Actual thrown bottle from the street thrower's detached contact effect.
  const bottleSource = keyedCanvas(scene, 'enemy-street-spitter-source');
  const bottle = document.createElement('canvas'); bottle.width = 12; bottle.height = 12;
  const context = bottle.getContext('2d')!; context.imageSmoothingEnabled = false;
  context.drawImage(bottleSource, 1445, 450, 62, 41, 1, 3, 10, 6);
  registerCanvas(scene, 'projectile-bottle', bottle);
  // The selected source has two isolated components. Register them separately so
  // both the jet and its detached wing can rest on the same world floor.
  const wreck = keyedCanvas(scene, 'landmark-wreck-source');
  const pixels = wreck.getContext('2d')!.getImageData(0, 0, wreck.width, wreck.height).data;
  const { labels, components } = findSpriteComponents(pixels, wreck.width, wreck.height, 2);
  components.forEach((bounds, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = bounds.right - bounds.left + 1; canvas.height = bounds.bottom - bounds.top + 1;
    const context = canvas.getContext('2d')!, data = context.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const from = (bounds.top + y) * wreck.width + bounds.left + x;
      if (labels[from] === bounds.id) data.data.set(pixels.subarray(from * 4, from * 4 + 4), (y * canvas.width + x) * 4);
    }
    context.putImageData(data, 0, 0);
    registerCanvas(scene, index === 0 ? 'landmark-wreck' : 'landmark-wreck-debris', canvas);
  });
}

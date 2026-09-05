import Phaser from 'phaser';
import { addPixelOutline, keyBackground } from './spriteImport';
import { decorateArchitecture, drawStructuralPlatform } from './architecture';

/** Standard sprite import: key the source background, trim each cell, align feet. */
export function importHeroSheet(scene: Phaser.Scene) {
  const source = scene.textures.get('hero-source').getSourceImage() as HTMLImageElement;
  const scratch = document.createElement('canvas');
  scratch.width = source.width; scratch.height = source.height;
  const context = scratch.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(source, 0, 0);
  const pixels = context.getImageData(0, 0, source.width, source.height);
  keyBackground(pixels.data); context.putImageData(pixels, 0, 0);
  const atlas = document.createElement('canvas'); atlas.width = 512; atlas.height = 80;
  const output = atlas.getContext('2d')!; output.imageSmoothingEnabled = false;
  const cw = Math.floor(source.width / 4), ch = Math.floor(source.height / 2);
  for (let frame = 0; frame < 8; frame++) {
    const ox = frame % 4 * cw, oy = Math.floor(frame / 4) * ch;
    let left = cw, top = ch, right = 0, bottom = 0;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      if (pixels.data[((oy + y) * source.width + ox + x) * 4 + 3] > 100) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    if (right <= left || bottom <= top) throw new Error(`Пустой кадр ${frame + 1}`);
    const sw = right - left + 1, sh = bottom - top + 1;
    // Same source scale across poses, so a crouch doesn't grow a giant head.
    const scale = Math.min(72 / (ch * .9), 58 / sw);
    const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
    output.drawImage(scratch, ox + left, oy + top, sw, sh, frame * 64 + Math.round((64 - dw) / 2), 77 - dh, dw, dh);
    const framePixels = output.getImageData(frame * 64, 0, 64, 80);
    addPixelOutline(framePixels.data, 64, 80, [147, 163, 157]);
    output.putImageData(framePixels, frame * 64, 0);
  }
  const imported = scene.textures.addCanvas('hero', atlas)!;
  scene.textures.addSpriteSheet('', imported, { frameWidth: 64, frameHeight: 80 });
  scene.anims.create({ key: 'hero-idle', frames: scene.anims.generateFrameNumbers('hero', { frames: [0, 1] }), frameRate: 2.5, repeat: -1 });
  scene.anims.create({ key: 'hero-run', frames: scene.anims.generateFrameNumbers('hero', { frames: [2, 3, 4, 5] }), frameRate: 10, repeat: -1 });
  scene.anims.create({ key: 'hero-jump', frames: [{ key: 'hero', frame: 6 }], frameRate: 1 });
  scene.anims.create({ key: 'hero-attack', frames: [{ key: 'hero', frame: 7 }], frameRate: 1 });
}

type PixelRect = [number, number, number, number, number];
function texture(scene: Phaser.Scene, name: string, w: number, h: number, rects: PixelRect[]) {
  const enemyIndex = ['enemy-walker', 'enemy-spitter', 'enemy-hound', 'boss'].indexOf(name);
  if (enemyIndex >= 0 && scene.textures.exists('enemy-source')) {
    importEnemy(scene, name, enemyIndex, w, h);
    return;
  }
  const g = scene.make.graphics({ x: 0, y: 0 });
  for (const [x, y, rw, rh, color] of rects) g.fillStyle(color).fillRect(x, y, rw, rh);
  g.generateTexture(name, w, h); g.destroy();
}

function importEnemy(scene: Phaser.Scene, name: string, index: number, width: number, height: number) {
  const source = scene.textures.get('enemy-source').getSourceImage() as HTMLImageElement;
  const splits = [0, .245, .465, .678, 1];
  const ox = Math.round(source.width * splits[index]);
  const cw = Math.round(source.width * splits[index + 1]) - ox;
  const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = source.height;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(source, ox, 0, cw, source.height, 0, 0, cw, source.height);
  const pixels = context.getImageData(0, 0, cw, source.height);
  keyBackground(pixels.data); context.putImageData(pixels, 0, 0);
  let left = cw, right = 0, top = source.height, bottom = 0;
  for (let y = 0; y < source.height; y++) for (let x = 0; x < cw; x++) if (pixels.data[(y * cw + x) * 4 + 3] > 100) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  const sprite = document.createElement('canvas'); sprite.width = width; sprite.height = height;
  const output = sprite.getContext('2d')!; output.imageSmoothingEnabled = false;
  // Source enemies face left; texture faces right, matching all actor-facing rules.
  output.translate(width, 0); output.scale(-1, 1);
  output.drawImage(canvas, left, top, right - left + 1, bottom - top + 1, 1, 1, width - 2, height - 2);
  const spritePixels = output.getImageData(0, 0, width, height);
  addPixelOutline(spritePixels.data, width, height, [159, 151, 132]);
  output.putImageData(spritePixels, 0, 0);
  scene.textures.addCanvas(name, sprite);
}
export function createTextures(scene: Phaser.Scene) {
  texture(scene, 'particle', 3, 3, [[0, 0, 3, 3, 0xc3e6d5]]);
  texture(scene, 'rain', 1, 7, [[0, 0, 1, 7, 0x7694a1]]);
  texture(scene, 'platform', 16, 16, [[0, 0, 16, 16, 0x273c46], [0, 0, 16, 2, 0x60818a], [1, 4, 14, 1, 0x344c56], [8, 5, 1, 11, 0x1a2c36]]);
  texture(scene, 'projectile', 10, 6, [[2, 0, 6, 6, 0xbac996], [0, 2, 10, 2, 0xdfe3ae], [6, 2, 3, 2, 0xf4d2a5]]);
  texture(scene, 'weapon', 8, 40, [[3, 0, 3, 2, 0xc5cfba], [2, 2, 4, 27, 0x839b9a], [2, 2, 1, 27, 0xc0d7ce], [5, 3, 1, 25, 0x4d696d], [4, 8, 2, 3, 0x977c5c], [3, 20, 2, 2, 0x657979], [1, 29, 6, 2, 0xa89671], [2, 31, 4, 8, 0x283a3f], [2, 33, 4, 1, 0x84745c], [2, 36, 4, 1, 0x84745c], [1, 39, 6, 1, 0x9fb2a6]]);
  texture(scene, 'cache-health', 24, 26, [[7, 0, 10, 4, 0xa2b9a6], [9, 1, 6, 3, 0x233a3e], [0, 4, 24, 22, 0x182f36], [2, 5, 20, 18, 0x4e766b], [2, 5, 20, 2, 0xc4d5b4], [4, 8, 16, 12, 0x769280], [10, 9, 4, 10, 0xe0d8ad], [7, 12, 10, 4, 0xe0d8ad], [2, 23, 20, 2, 0x94b1a0], [1, 11, 2, 6, 0xb2bd96], [21, 11, 2, 6, 0xb2bd96]]);
  texture(scene, 'cache-damage', 24, 26, [[6, 1, 12, 3, 0xb5a274], [8, 2, 8, 2, 0x23343c], [0, 5, 24, 21, 0x1a3038], [2, 6, 20, 18, 0x81634f], [2, 6, 20, 2, 0xd0ac7b], [3, 9, 18, 7, 0x9e7f59], [2, 17, 20, 2, 0x342f30], [10, 13, 4, 7, 0xd6bf8a], [3, 21, 18, 2, 0xa68e68], [1, 9, 2, 14, 0xb8a57c], [21, 9, 2, 14, 0xb8a57c]]);
  texture(scene, 'exit-gate', 32, 88, [[0, 5, 4, 83, 0x637873], [28, 5, 4, 83, 0x637873], [3, 2, 26, 5, 0x8c9e87], [7, 0, 18, 3, 0x405b5c], [5, 6, 22, 79, 0x132932], [7, 18, 2, 64, 0x71877d], [14, 18, 2, 64, 0x71877d], [21, 18, 2, 64, 0x71877d], [5, 39, 22, 3, 0x8b9478], [5, 69, 22, 3, 0x526b66], [24, 43, 2, 8, 0xd8b879], [8, 8, 16, 8, 0x47716a], [11, 11, 10, 2, 0xcee4c1], [18, 9, 2, 6, 0xcee4c1], [1, 7, 1, 78, 0xbbbaa0], [29, 7, 1, 78, 0xbbbaa0]]);
  texture(scene, 'enemy-walker', 24, 36, [[7, 1, 12, 11, 0x131d26], [8, 2, 11, 7, 0x668078], [12, 5, 9, 3, 0x182b32], [14, 5, 5, 2, 0xeebb88], [5, 11, 15, 17, 0x253e44], [6, 12, 3, 15, 0x527278], [2, 14, 5, 14, 0x39535a], [19, 14, 4, 15, 0x39535a], [2, 26, 5, 4, 0x78978e], [18, 27, 5, 4, 0x78978e], [6, 26, 5, 9, 0x182830], [15, 26, 5, 9, 0x182830], [4, 34, 8, 2, 0x4d666b], [14, 34, 8, 2, 0x4d666b], [10, 12, 7, 2, 0x877561]]);
  texture(scene, 'enemy-spitter', 24, 34, [[7, 0, 11, 5, 0x2e3442], [5, 5, 15, 10, 0x544a58], [8, 7, 13, 5, 0x151e2b], [12, 9, 8, 2, 0xc5a8bd], [4, 14, 17, 15, 0x4b4053], [5, 15, 3, 12, 0x716076], [10, 17, 5, 8, 0x998e8b], [1, 18, 5, 10, 0x64546b], [20, 18, 4, 9, 0x64546b], [7, 28, 5, 6, 0x252834], [15, 28, 6, 6, 0x252834]]);
  texture(scene, 'enemy-hound', 30, 22, [[3, 8, 20, 10, 0x3e4b4c], [5, 5, 16, 10, 0x536161], [20, 4, 8, 10, 0x637372], [24, 10, 6, 5, 0x45504f], [20, 1, 3, 7, 0x252e35], [27, 2, 2, 6, 0x252e35], [25, 7, 3, 2, 0xf1a883], [5, 16, 4, 6, 0x29383f], [19, 16, 4, 6, 0x29383f], [0, 7, 5, 3, 0x697770], [7, 6, 11, 2, 0x84948a]]);
  texture(scene, 'boss', 56, 72, [[18, 1, 22, 16, 0x192833], [17, 3, 25, 5, 0x666951], [15, 8, 29, 3, 0x93916c], [23, 12, 17, 6, 0x597775], [26, 12, 13, 3, 0xe5b277], [9, 20, 38, 32, 0x364d51], [11, 22, 7, 28, 0x67817b], [23, 19, 4, 33, 0x1c303b], [29, 27, 10, 12, 0x293e47], [3, 24, 9, 29, 0x455f62], [45, 24, 10, 28, 0x536b69], [2, 50, 11, 10, 0x88917c], [46, 48, 10, 12, 0x88917c], [13, 50, 12, 21, 0x253740], [32, 50, 12, 21, 0x253740], [9, 67, 18, 5, 0x647578], [31, 67, 18, 5, 0x647578], [13, 39, 32, 4, 0x92805c], [27, 38, 6, 6, 0xccae72]]);
}

export function drawPlatform(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
  drawStructuralPlatform(scene, x, y, w, h);
}

export function decorateLevel(scene: Phaser.Scene, stage: number, width: number) {
  for (let i = 0; i < 3; i++) {
    const city = scene.add.image(i * 640, 0, 'city').setOrigin(0).setDisplaySize(640, 360).setScrollFactor(.18, 0).setDepth(-30);
    city.setTint([0x829ba4, 0x85909f, 0x80a5a5][stage]);
  }
  scene.add.rectangle(0, 0, width, 360, 0x17303e, .2).setOrigin(0).setDepth(-20);
  const g = scene.add.graphics().setDepth(-10);
  // Near-ground masonry and wet paving catch the distant shop lights.
  g.fillStyle(0x10202a).fillRect(0, 312, width, 48);
  g.fillStyle(0x587780).fillRect(0, 312, width, 2);
  for (let x = 0; x < width; x += 32) {
    g.fillStyle(0x233c46).fillRect(x + 2, 317, 28, 10);
    g.fillStyle(0x1d343e).fillRect(x - 12, 332, 29, 14);
    g.fillStyle(0x3f6068, .7).fillRect(x + 4, 315, 20, 1);
    if (x % 96 === 0) g.fillStyle(0x8d9d85, .35).fillRect(x + 3, 309, 23, 2);
  }
  for (let x = 180; x < width; x += 390) {
    g.fillStyle(0x263d47).fillRect(x, 194, 4, 118);
    g.fillStyle(0x415963).fillRect(x + 1, 193, 1, 118);
    g.fillStyle(0x233c47).fillRect(x - 9, 190, 25, 4);
    g.fillStyle(0xd0bd87).fillRect(x - 7, 194, 20, 3);
    g.fillStyle(0xd4bd78, .045).fillTriangle(x - 5, 198, x - 42, 311, x + 48, 311);
    g.fillStyle(0xb2a977, .4).fillRect(x - 22, 310, 45, 1);
  }
  // Place-specific silhouettes: courtyard clotheslines, block balconies, port cranes.
  if (stage < 2) {
    for (let x = 610; x < width; x += 640) {
      g.lineStyle(1, 0x273e49).lineBetween(x - 100, 125, x + 165, 144);
      for (let n = 0; n < 5; n++) {
        const px = x - 70 + n * 39, py = 130 + n * 3;
        g.fillStyle([0x52626b, 0x4d555f, 0x675b5b][n % 3]);
        if (n % 2 === 0) {
          g.fillRect(px + 3, py, 13, 23).fillRect(px - 1, py + 2, 5, 7).fillRect(px + 15, py + 2, 5, 7);
          g.fillStyle(0x304651).fillRect(px + 8, py, 4, 2).fillRect(px + 6, py + 6, 1, 16);
        } else {
          g.fillRect(px + 3, py, 14, 8).fillRect(px + 3, py + 8, 6, 18).fillRect(px + 11, py + 8, 6, 18);
          g.fillStyle(0x304651).fillRect(px + 4, py + 2, 12, 1);
        }
        g.fillStyle(0xb7a67d).fillRect(px + 4, py - 1, 1, 3).fillRect(px + 14, py - 1, 1, 3);
      }
    }
  } else {
    for (let x = 500; x < width; x += 760) {
      g.lineStyle(4, 0x263d46).lineBetween(x, 100, x, 312).lineBetween(x, 100, x + 180, 68);
      g.lineStyle(1, 0x617579).lineBetween(x + 170, 70, x + 170, 215);
      g.fillStyle(0x394e53).fillRect(x + 15, 268, 100, 44);
      for (let n = 0; n < 10; n++) g.fillStyle(0x5b6d6a).fillRect(x + 19 + n * 10, 272, 2, 37);
    }
  }
  decorateArchitecture(scene, stage, width);
  // Phaser emitter owns animation and particle lifecycle, including scene pause.
  scene.add.particles(0, 0, 'rain', {
    x: { min: -60, max: 710 }, y: -10, lifespan: 1700,
    speedX: { min: -75, max: -45 }, speedY: { min: 240, max: 330 },
    quantity: 2, frequency: 30, alpha: { start: .3, end: .08 },
    scaleX: 1, scaleY: { min: .7, max: 1.5 }, angle: 12,
  }).setScrollFactor(0).setDepth(15);
}

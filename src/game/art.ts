import Phaser from 'phaser';
import { decorateArchitecture, drawStructuralPlatform } from './architecture';

type PixelRect = [number, number, number, number, number];
function texture(scene: Phaser.Scene, name: string, w: number, h: number, rects: PixelRect[]) {
  const g = scene.make.graphics({ x: 0, y: 0 });
  for (const [x, y, rw, rh, color] of rects) g.fillStyle(color).fillRect(x, y, rw, rh);
  g.generateTexture(name, w, h); g.destroy();
}

export function createTextures(scene: Phaser.Scene) {
  texture(scene, 'particle', 3, 3, [[0, 0, 3, 3, 0xc3e6d5]]);
  texture(scene, 'rain', 1, 7, [[0, 0, 1, 7, 0x7694a1]]);
  texture(scene, 'platform', 16, 16, [[0, 0, 16, 16, 0x273c46], [0, 0, 16, 2, 0x60818a], [1, 4, 14, 1, 0x344c56], [8, 5, 1, 11, 0x1a2c36]]);
  texture(scene, 'projectile', 10, 6, [[2, 0, 6, 6, 0xbac996], [0, 2, 10, 2, 0xdfe3ae], [6, 2, 3, 2, 0xf4d2a5]]);
  texture(scene, 'cache-health', 24, 26, [[7, 0, 10, 4, 0xa2b9a6], [9, 1, 6, 3, 0x233a3e], [0, 4, 24, 22, 0x182f36], [2, 5, 20, 18, 0x4e766b], [2, 5, 20, 2, 0xc4d5b4], [4, 8, 16, 12, 0x769280], [10, 9, 4, 10, 0xe0d8ad], [7, 12, 10, 4, 0xe0d8ad], [2, 23, 20, 2, 0x94b1a0], [1, 11, 2, 6, 0xb2bd96], [21, 11, 2, 6, 0xb2bd96]]);
  texture(scene, 'cache-damage', 24, 26, [[6, 1, 12, 3, 0xb5a274], [8, 2, 8, 2, 0x23343c], [0, 5, 24, 21, 0x1a3038], [2, 6, 20, 18, 0x81634f], [2, 6, 20, 2, 0xd0ac7b], [3, 9, 18, 7, 0x9e7f59], [2, 17, 20, 2, 0x342f30], [10, 13, 4, 7, 0xd6bf8a], [3, 21, 18, 2, 0xa68e68], [1, 9, 2, 14, 0xb8a57c], [21, 9, 2, 14, 0xb8a57c]]);
  texture(scene, 'exit-gate', 32, 88, [[0, 5, 4, 83, 0x637873], [28, 5, 4, 83, 0x637873], [3, 2, 26, 5, 0x8c9e87], [7, 0, 18, 3, 0x405b5c], [5, 6, 22, 79, 0x132932], [7, 18, 2, 64, 0x71877d], [14, 18, 2, 64, 0x71877d], [21, 18, 2, 64, 0x71877d], [5, 39, 22, 3, 0x8b9478], [5, 69, 22, 3, 0x526b66], [24, 43, 2, 8, 0xd8b879], [8, 8, 16, 8, 0x47716a], [11, 11, 10, 2, 0xcee4c1], [18, 9, 2, 6, 0xcee4c1], [1, 7, 1, 78, 0xbbbaa0], [29, 7, 1, 78, 0xbbbaa0]]);
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

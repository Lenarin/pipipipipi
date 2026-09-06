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
  texture(scene, 'projectile-round', 10, 4, [[0, 0, 10, 4, 0x493324], [1, 1, 8, 2, 0xffd678]]);
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
  const theme = (['batumi', 'airport', 'suburb'] as const)[stage];
  scene.data.set('campaign-theme', theme);
  scene.cameras.main.setBackgroundColor(0xbce4ec);
  for (let i = 0; i < 3; i++) {
    scene.add.image(i * 960, 0, `scene-${theme}`).setOrigin(0).setDisplaySize(960, 360)
      .setScrollFactor(.18, 0).setDepth(-30).setName(`background-${theme}`);
  }
  decorateArchitecture(scene, stage, width);
}

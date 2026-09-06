import type Phaser from 'phaser';
import { keyBackground } from './spriteImport';
import { PORTRAIT_SPEAKERS, STORY_PANELS } from './campaignArt';

export function keyedCanvas(scene: Phaser.Scene, key: string): HTMLCanvasElement {
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(source, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  keyBackground(pixels.data);
  // A few compressed hot-pink fringe pixels have uneven red/blue channels.
  for (let p = 0; p < pixels.data.length; p += 4) {
    if (pixels.data[p] > 150 && pixels.data[p + 2] > 150 && pixels.data[p + 1] < 60) pixels.data[p + 3] = 0;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

export function registerCanvas(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement, width?: number, height?: number): void {
  const texture = scene.textures.addCanvas(key, canvas)!;
  if (width && height) scene.textures.addSpriteSheet('', texture, { frameWidth: width, frameHeight: height });
}

export function importPortraits(scene: Phaser.Scene): void {
  for (const speaker of PORTRAIT_SPEAKERS) {
    const source = keyedCanvas(scene, `portrait-${speaker}-source`);
    // Measured panel seams. Chief and Miller have shoulders beyond nominal 384px cells.
    const columns = speaker === 'miller' ? [45, 410, 762, 1105, 1465]
      : speaker === 'chief' ? [45, 407, 764, 1117, 1470] : [0, source.width / 4, source.width / 2, source.width * 3 / 4, source.width];
    const rows = speaker === 'nastya' ? [0, 361, 723, 1086] : [0, 339, 672, 1024];
    const output = document.createElement('canvas'); output.width = 108 * 4; output.height = 108 * 3;
    const context = output.getContext('2d')!; context.imageSmoothingEnabled = false;
    const pixels = source.getContext('2d')!.getImageData(0, 0, source.width, source.height).data;
    const bounds = [];
    for (let row = 0; row < 3; row++) for (const col of [0, 1, 3, 2]) {
      let left = source.width, right = 0, top = source.height, bottom = 0;
      for (let y = rows[row]; y < rows[row + 1]; y++) for (let x = columns[col]; x < columns[col + 1]; x++) {
        if (pixels[(y * source.width + x) * 4 + 3] < 100) continue;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      if (right <= left || bottom <= top) throw new Error(`Пустой портрет: ${speaker}/${row}/${col}`);
      bounds.push({ left, top, width: right - left + 1, height: bottom - top + 1 });
    }
    const scale = Math.min(...bounds.map(b => 102 / Math.max(b.width, b.height)));
    bounds.forEach((b, index) => {
      const w = Math.round(b.width * scale), h = Math.round(b.height * scale);
      context.drawImage(source, b.left, b.top, b.width, b.height, index % 4 * 108 + Math.floor((108 - w) / 2), Math.floor(index / 4) * 108 + 105 - h, w, h);
    });
    registerCanvas(scene, `portrait-${speaker}`, output, 108, 108);
  }
  const source = scene.textures.get('story-v8-source').getSourceImage() as HTMLImageElement;
  // Measured magenta gutters are 8px, not six equal source cells.
  STORY_PANELS.forEach((name, index) => {
    const x = index % 2 ? 772 : 9, y = [8, 348, 682][Math.floor(index / 2)];
    const canvas = document.createElement('canvas'); canvas.width = 316; canvas.height = 178;
    const context = canvas.getContext('2d')!; context.imageSmoothingEnabled = false;
    context.drawImage(source, x, y, index % 2 ? 755 : 752, [329, 324, 333][Math.floor(index / 2)], 0, 0, 316, 178);
    registerCanvas(scene, `story-v8-${name}`, canvas);
  });
}

import Phaser from 'phaser';
import { addPixelOutline, keyBackground } from './spriteImport';
import { BOSS_POSES, ENEMY_POSES, ENEMY_RECOIL_POSES, HERO_PIPE_POSES, HERO_ACTION_POSES, HERO_COMBAT_POSES, HERO_LAYOUT, HERO_LOCOMOTION_POSES, type SpritePose } from './spriteFrames';

/** Connected-component slicing avoids cutting off weapons that cross the source's nominal grid. */
export function findSpriteComponents(pixels: Uint8ClampedArray, width: number, height: number, count: number) {
  const labels = new Int32Array(width * height);
  const queue = new Int32Array(width * height);
  const components: { id: number; size: number; left: number; right: number; top: number; bottom: number }[] = [];
  let id = 0;
  for (let start = 0; start < labels.length; start++) {
    if (labels[start] || pixels[start * 4 + 3] < 100) continue;
    const component = { id: ++id, size: 0, left: width, right: 0, top: height, bottom: 0 };
    let head = 0, tail = 1; queue[0] = start; labels[start] = id;
    while (head < tail) {
      const current = queue[head++], x = current % width, y = Math.floor(current / width);
      component.size++; component.left = Math.min(component.left, x); component.right = Math.max(component.right, x);
      component.top = Math.min(component.top, y); component.bottom = Math.max(component.bottom, y);
      for (const next of [x > 0 ? current - 1 : -1, x < width - 1 ? current + 1 : -1, current - width, current + width]) {
        if (next < 0 || next >= labels.length || labels[next] || pixels[next * 4 + 3] < 100) continue;
        labels[next] = id; queue[tail++] = next;
      }
    }
    components.push(component);
  }
  const selected = components.sort((a, b) => b.size - a.size).slice(0, count).sort((a, b) => a.top - b.top);
  if (selected.length !== count || selected.some(c => c.size < 1000)) throw new Error('Неполный лист анимации');
  const ordered = [];
  for (let row = 0; row < count / 4; row++) ordered.push(...selected.slice(row * 4, row * 4 + 4).sort((a, b) => a.left - b.left));
  return { labels, components: ordered };
}

function pack(scene: Phaser.Scene, sourceKey: string, poses: readonly SpritePose[], output: CanvasRenderingContext2D, offset: number, width: number, height: number, anchorX: number, anchorY: number) {
  const source = scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement;
  const scratch = document.createElement('canvas'); scratch.width = source.width; scratch.height = source.height;
  const context = scratch.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(source, 0, 0);
  const pixels = context.getImageData(0, 0, source.width, source.height);
  keyBackground(pixels.data);
  const { labels, components } = findSpriteComponents(pixels.data, source.width, source.height, poses.length);
  poses.forEach((pose, index) => {
    const bounds = components[index], sw = bounds.right - bounds.left + 1, sh = bounds.bottom - bounds.top + 1;
    const cutout = document.createElement('canvas'); cutout.width = sw; cutout.height = sh;
    const cutContext = cutout.getContext('2d')!;
    const cropped = cutContext.createImageData(sw, sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const from = (bounds.top + y) * source.width + bounds.left + x;
      if (labels[from] === bounds.id) cropped.data.set(pixels.data.subarray(from * 4, from * 4 + 4), (y * sw + x) * 4);
    }
    cutContext.putImageData(cropped, 0, 0);
    const columns = output.canvas.width / width;
    const fx = (offset + index) % columns * width, fy = Math.floor((offset + index) / columns) * height;
    output.save();
    output.beginPath(); output.rect(fx, fy, width, height); output.clip();
    output.translate(fx + anchorX, fy + anchorY);
    output.scale(pose.flip ? -1 : 1, 1);
    output.drawImage(cutout, Math.round((bounds.left - pose.anchorX) * pose.scale), Math.round((bounds.top - pose.feetY) * pose.scale), Math.round(sw * pose.scale), Math.round(sh * pose.scale));
    output.restore();
    const frame = output.getImageData(fx, fy, width, height);
    addPixelOutline(frame.data, width, height, [112, 132, 129]);
    output.putImageData(frame, fx, fy);
  });
}

function register(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement, frameWidth: number, frameHeight: number) {
  const texture = scene.textures.addCanvas(key, canvas)!;
  scene.textures.addSpriteSheet('', texture, { frameWidth, frameHeight });
}

export function importAnimationSheets(scene: Phaser.Scene) {
  const { width, height, anchorX, anchorY } = HERO_LAYOUT;
  const hero = document.createElement('canvas'); hero.width = width * 8; hero.height = height * 8;
  const out = hero.getContext('2d')!; out.imageSmoothingEnabled = false;
  pack(scene, 'hero-locomotion-source', HERO_LOCOMOTION_POSES, out, 0, width, height, anchorX, anchorY);
  pack(scene, 'hero-combat-source', HERO_COMBAT_POSES, out, 8, width, height, anchorX, anchorY);
  pack(scene, 'hero-actions-source', HERO_ACTION_POSES, out, 24, width, height, anchorX, anchorY);
  pack(scene, 'hero-pipe-source', HERO_PIPE_POSES, out, 40, width, height, anchorX, anchorY);
  register(scene, 'hero-full', hero, width, height);
  const animation = (key: string, texture: string, frames: number[], fps: number, repeat = -1) => {
    if (scene.anims.exists(key)) scene.anims.remove(key);
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(texture, { frames }), frameRate: fps, repeat });
  };
  animation('hero-idle', 'hero-full', [0, 1], 2.5);
  animation('hero-run', 'hero-full', [2, 3, 4, 5, 6, 7], 12);
  animation('hero-death', 'hero-full', [32, 33, 34, 35], 8, 0);
  const enemies = document.createElement('canvas'); enemies.width = 128 * 7; enemies.height = 128 * 4;
  const enemyOut = enemies.getContext('2d')!; enemyOut.imageSmoothingEnabled = false;
  pack(scene, 'enemy-animation-source', ENEMY_POSES, enemyOut, 0, 128, 128, 64, 112);
  pack(scene, 'enemy-recoil-source', ENEMY_RECOIL_POSES, enemyOut, 16, 128, 128, 64, 112);
  register(scene, 'enemy-full', enemies, 128, 128);
  animation('walker-walk', 'enemy-full', [0, 1, 2, 3], 8);
  animation('spitter-walk', 'enemy-full', [8, 11], 4);
  animation('hound-walk', 'enemy-full', [12, 15], 10);
  const boss = document.createElement('canvas'); boss.width = 128 * 12; boss.height = 128;
  const bossOut = boss.getContext('2d')!; bossOut.imageSmoothingEnabled = false;
  pack(scene, 'boss-animation-source', BOSS_POSES, bossOut, 0, 128, 128, 64, 112);
  register(scene, 'boss-full', boss, 128, 128);
  animation('boss-walk', 'boss-full', [0, 1, 0, 2], 5);
}

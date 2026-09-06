import Phaser from 'phaser';
import { createTextures } from '../game/art';
import { importAnimationSheets } from '../game/spriteAtlas';
import { showLoadError } from '../ui';
export class BootScene extends Phaser.Scene {
  private failed = false;
  constructor() { super('Boot'); }
  preload() {
    const base = import.meta.env.BASE_URL;
    this.load.image('city', `${base}assets/batumi.png`);
    this.load.image('hero-locomotion-source', `${base}assets/hero-locomotion-v4-source.png`);
    this.load.image('hero-combat-source', `${base}assets/hero-combat-v4-source.png`);
    this.load.image('hero-pipe-source', `${base}assets/hero-combat-v5-source.png`);
    this.load.image('enemy-recoil-source', `${base}assets/enemy-recoil-v5-source.png`);
    this.load.image('enemy-attack-source', `${base}assets/enemy-attacks-v6-source.png`);
    this.load.image('hero-actions-source', `${base}assets/hero-actions-v4-source.png`);
    this.load.image('enemy-animation-source', `${base}assets/enemy-animation-v4-source.png`);
    this.load.image('boss-animation-source', `${base}assets/boss-animation-v4-source.png`);
    for (const name of ['slash', 'hit', 'jump', 'dash', 'heal', 'kill', 'ambience']) this.load.audio(name, `${base}assets/audio/${name}.wav`);
    for (const family of ['swing', 'hit', 'heavy', 'kill']) for (let i = 1; i <= 3; i++) {
      const key = `pipe-${family}-${i}-v5`; this.load.audio(key, `${base}assets/audio/${key}.wav`);
    }
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      // Sound is optional; a missing visual asset is not silently hidden.
      if (file.type === 'audio') return;
      this.failed = true;
      showLoadError(`Не загрузился ресурс «${file.key}». Нажми, чтобы повторить.`);
    });
  }
  create() {
    if (this.failed) return;
    try { createTextures(this); importAnimationSheets(this); this.scene.start('Game'); }
    catch (error) { showLoadError(`Не удалось подготовить персонажа: ${error instanceof Error ? error.message : 'ошибка изображения'}`); }
  }
}

import Phaser from 'phaser';
import { createTextures, importHeroSheet } from '../game/art';
import { showLoadError } from '../ui';
export class BootScene extends Phaser.Scene {
  private failed = false;
  constructor() { super('Boot'); }
  preload() {
    const base = import.meta.env.BASE_URL;
    this.load.image('city', `${base}assets/batumi.png`);
    this.load.image('hero-source', `${base}assets/hero-source.png`);
    this.load.image('enemy-source', `${base}assets/enemy-source.png`);
    for (const name of ['slash', 'hit', 'jump', 'dash', 'heal', 'kill', 'ambience']) this.load.audio(name, `${base}assets/audio/${name}.wav`);
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      // Sound is optional; a missing visual asset is not silently hidden.
      if (file.type === 'audio') return;
      this.failed = true;
      showLoadError(`Не загрузился ресурс «${file.key}». Нажми, чтобы повторить.`);
    });
  }
  create() {
    if (this.failed) return;
    try { importHeroSheet(this); createTextures(this); this.scene.start('Game'); }
    catch (error) { showLoadError(`Не удалось подготовить персонажа: ${error instanceof Error ? error.message : 'ошибка изображения'}`); }
  }
}

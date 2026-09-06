// Scene/bootstrap structure adapted from Phaser Studio's official MIT Vite/TS template.
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { DialogueScene } from './scenes/DialogueScene';
import { bridge } from './game/bridge';
import { mountUI, showLoadError } from './ui';
import './style.css?v=0.7.0';

let fullyReady = false;
const reportStartupError = (event: ErrorEvent) => {
  if (!fullyReady) showLoadError(`Не удалось запустить игру: ${event.error instanceof Error ? event.error.message : event.message || 'неизвестная ошибка'}`);
};
const markReady = () => { fullyReady = true; window.removeEventListener('error', reportStartupError); };
window.addEventListener('error', reportStartupError);
bridge.once('ready', markReady);

try {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 640, height: 360,
    backgroundColor: '#142530',
    pixelArt: true, roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 850 }, debug: false } },
    input: { keyboard: true, mouse: true },
    audio: { disableWebAudio: false },
    scene: [BootScene, GameScene, DialogueScene],
  });
  mountUI(game);
  if (import.meta.env.DEV) (window as unknown as { __GAME__: Phaser.Game }).__GAME__ = game;
} catch (error) {
  bridge.off('ready', markReady);
  showLoadError(`Не удалось запустить игру: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
}

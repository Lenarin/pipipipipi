import Phaser from 'phaser';
export interface GameSnapshot {
  mode: 'title' | 'playing' | 'paused' | 'dead' | 'won'; stage: number; location: string;
  hp: number; maxHp: number; flasks: number; kills: number; totalEnemies: number; shards: number; elapsed: number;
  dashReady: boolean; bossHp: number; bossMaxHp: number; objective: string; message: string; weaponLevel: number;
  healing: boolean; healingProgress: number; abilityReady: boolean; abilityCooldownProgress: number;
  cacheChoiceOpen: boolean;
}
export type GameCommand = 'start' | 'resume' | 'pause' | 'restart' | 'heal' | 'mute' | 'shake'
  | 'cache-damage' | 'cache-health' | 'cache-cancel';
export const bridge = new Phaser.Events.EventEmitter();

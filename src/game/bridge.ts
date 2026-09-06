import Phaser from 'phaser';
import type { RunMode } from '../gameplay/Rules';
import type { StorySession, SpeakerId } from '../story/story';
export interface DialogueSnapshot {
  session: StorySession; speaker: SpeakerId; name: string; fullText: string;
  visibleText: string; lineIndex: number; lineCount: number; finishedTyping: boolean;
}
export interface GameSnapshot {
  mode: RunMode; stage: number; location: string;
  hp: number; maxHp: number; flasks: number; kills: number; totalEnemies: number; shards: number; elapsed: number;
  dashReady: boolean; bossHp: number; bossMaxHp: number; objective: string; message: string; weaponLevel: number;
  healing: boolean; healingProgress: number; abilityReady: boolean; abilityCooldownProgress: number;
  cacheChoiceOpen: boolean;
  bossName: string; hasPackage: boolean;
}
export type GameCommand = 'start' | 'resume' | 'pause' | 'restart' | 'heal' | 'mute' | 'shake'
  | 'cache-damage' | 'cache-health' | 'cache-cancel' | 'dialogue-next' | 'dialogue-skip';
export const bridge = new Phaser.Events.EventEmitter();

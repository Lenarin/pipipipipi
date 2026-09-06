import type { BossId, StoryId } from '../story/story';

export type EnemyKind = 'walker' | 'spitter' | 'hound' | 'boss';
export type EnemyFaction = 'street' | 'police' | 'federal';
export interface PlatformData { x: number; y: number; width: number; height?: number; }
export interface EnemySpawn { id: string; kind: EnemyKind; x: number; y?: number; bossId?: BossId; faction?: EnemyFaction; }
export interface CacheData { x: number; y: number; upgrade: 'health' | 'damage'; }
export interface LevelData {
  theme: 'batumi' | 'airport' | 'suburb';
  name: string;
  width: number;
  groundY: number;
  exitX: number;
  bossIntroX: number;
  bossId: BossId;
  introScene: StoryId;
  exitScene: StoryId;
  platforms: PlatformData[];
  enemies: EnemySpawn[];
  caches: CacheData[];
}

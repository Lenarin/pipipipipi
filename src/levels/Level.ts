export type EnemyKind = 'walker' | 'spitter' | 'hound' | 'boss';
export interface PlatformData { x: number; y: number; width: number; height?: number; }
export interface EnemySpawn { id: string; kind: EnemyKind; x: number; y?: number; }
export interface CacheData { x: number; y: number; upgrade: 'health' | 'damage'; }
export interface LevelData {
  name: string;
  width: number;
  groundY: number;
  exitX: number;
  platforms: PlatformData[];
  enemies: EnemySpawn[];
  caches: CacheData[];
}

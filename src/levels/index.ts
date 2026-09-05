import { courtyard } from './courtyard';
import { district } from './district';
import { port } from './port';
import type { LevelData } from './Level';

export const levels: readonly LevelData[] = [courtyard, district, port];
export type { CacheData, EnemyKind, EnemySpawn, LevelData, PlatformData } from './Level';

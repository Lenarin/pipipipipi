import type { LevelData } from '../levels';

/** Cosmetic surface lookup for shadows/remains; never used to resolve actor physics. */
export function groundSurfaceBelow(x: number, feet: number, level: LevelData): number {
  let floor = level.groundY;
  for (const p of level.platforms) {
    const top = p.y - (p.height ?? 18) / 2;
    if (x >= p.x - p.width / 2 && x <= p.x + p.width / 2 && top >= feet - 2) floor = Math.min(floor, top);
  }
  return floor;
}

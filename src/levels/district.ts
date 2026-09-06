import type { LevelData } from './Level';

export const district: LevelData = {
  theme: 'airport',
  name: 'Особо опасная выпечка', width: 2200, groundY: 312, exitX: 2110,
  bossIntroX: 1940, bossId: 'chief', introScene: 'airport-chief', exitScene: 'rough-landing',
  platforms: [{ x: 330, y: 250, width: 150 }, { x: 610, y: 198, width: 180 }, { x: 980, y: 230, width: 130 }, { x: 1320, y: 185, width: 190 }, { x: 1740, y: 230, width: 150 }],
  enemies: [
    { id: 'district-walker-1', kind: 'walker', x: 470 }, { id: 'district-spitter-1', kind: 'spitter', x: 665 },
    { id: 'district-hound-1', kind: 'hound', x: 850 }, { id: 'district-walker-2', kind: 'walker', x: 1100 },
    { id: 'district-spitter-2', kind: 'spitter', x: 1370 }, { id: 'district-hound-2', kind: 'hound', x: 1610 },
    { id: 'district-walker-3', kind: 'walker', x: 1860 },
    { id: 'airport-chief', kind: 'boss', bossId: 'chief', faction: 'police', x: 2050 },
  ],
  caches: [{ x: 680, y: 166, upgrade: 'damage' }, { x: 1400, y: 153, upgrade: 'health' }],
};

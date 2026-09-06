import type { LevelData } from './Level';

export const port: LevelData = {
  theme: 'suburb',
  name: 'Ничего декларировать', width: 2400, groundY: 312, exitX: 2300,
  bossIntroX: 1710, bossId: 'miller', introScene: 'food-threat', exitScene: 'delivered',
  platforms: [{ x: 350, y: 236, width: 145 }, { x: 730, y: 202, width: 180 }, { x: 1080, y: 248, width: 130 }, { x: 1590, y: 228, width: 150 }, { x: 1960, y: 190, width: 180 }],
  enemies: [
    { id: 'port-walker-1', kind: 'walker', x: 500 }, { id: 'port-spitter-1', kind: 'spitter', x: 760 },
    { id: 'port-hound-1', kind: 'hound', x: 1010 }, { id: 'port-walker-2', kind: 'walker', x: 1210 },
    { id: 'port-spitter-2', kind: 'spitter', x: 1360 }, { id: 'port-boss', kind: 'boss', bossId: 'miller', faction: 'federal', x: 1910 },
  ],
  caches: [{ x: 780, y: 170, upgrade: 'health' }, { x: 2010, y: 158, upgrade: 'damage' }],
};

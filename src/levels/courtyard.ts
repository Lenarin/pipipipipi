import type { LevelData } from './Level';

export const courtyard: LevelData = {
  theme: 'batumi',
  name: 'Последний с сыром', width: 1900, groundY: 312, exitX: 1815,
  bossIntroX: 1710, bossId: 'mark', introScene: 'last-khachapuri', exitScene: 'wanted',
  platforms: [
    { x: 250, y: 280, width: 80 },
    { x: 365, y: 244, width: 120 },
    { x: 545, y: 274, width: 76 },
    { x: 720, y: 218, width: 190 },
    { x: 855, y: 148, width: 180 },
    { x: 1110, y: 258, width: 140 },
    { x: 1260, y: 198, width: 150 },
    { x: 1440, y: 224, width: 160 },
    { x: 1640, y: 270, width: 100 },
  ],
  enemies: [
    { id: 'yard-walker-1', kind: 'walker', x: 500 }, { id: 'yard-hound-1', kind: 'hound', x: 900 },
    { id: 'yard-spitter-1', kind: 'spitter', x: 850, y: 119 }, { id: 'yard-walker-2', kind: 'walker', x: 1130 },
    { id: 'yard-hound-2', kind: 'hound', x: 1460 }, { id: 'yard-spitter-2', kind: 'spitter', x: 1640 },
    { id: 'bakery-mark', kind: 'boss', bossId: 'mark', faction: 'street', x: 1790 },
  ],
  caches: [{ x: 790, y: 186, upgrade: 'health' }, { x: 1510, y: 192, upgrade: 'damage' }],
};

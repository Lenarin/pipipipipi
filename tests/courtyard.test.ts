import { expect, it } from 'vitest';
import { courtyard } from '../src/levels/courtyard';

it('places an encounter on a reachable roof, with a balcony below it', () => {
  const elevated = courtyard.enemies.filter(enemy => enemy.y !== undefined && enemy.y < 200);
  expect(elevated.length).toBeGreaterThan(0);
  for (const enemy of elevated) {
    const roof = courtyard.platforms.find(p => Math.abs(p.x - enemy.x) < p.width / 2 && p.y > enemy.y! && p.y - enemy.y! < 45);
    expect(roof).toBeDefined();
    const approach = courtyard.platforms.find(p => p.y > roof!.y && p.y - roof!.y <= 90 && Math.abs(p.x - roof!.x) < 200);
    expect(approach).toBeDefined();
  }
});
it('keeps both optional upgrades supported and the exit clear of overhead platforms', () => {
  for (const cache of courtyard.caches) {
    expect(courtyard.platforms.some(p => Math.abs(cache.x - p.x) <= p.width / 2 && p.y - cache.y >= 24 && p.y - cache.y <= 40)).toBe(true);
  }
  expect(courtyard.platforms.every(p => p.x + p.width / 2 < courtyard.exitX - 50)).toBe(true);
});

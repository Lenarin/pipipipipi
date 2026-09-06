import { describe, expect, it } from 'vitest';
import { levels } from '../src/levels';
import { campaignAttackFrame, volleyAngle } from '../src/game/campaignArt';
import { BossPattern } from '../src/gameplay/BossPattern';
import { attackShapeAt } from '../src/gameplay/EnemyAttackCycle';

describe('campaign location art contract', () => {
  it('gives every playable map a distinct authored sunny location', () => {
    expect(levels.map(level => (level as typeof level & { theme?: string }).theme)).toEqual(['batumi', 'airport', 'suburb']);
  });
});

it('selects the visible contact instead of the chief raised baton or Mark raised umbrella', () => {
  expect(campaignAttackFrame('chief-baton', 'active', 0)).toBe(8);
  expect(campaignAttackFrame('mark-heavy', 'active', 0)).toBe(17);
  expect(campaignAttackFrame('miller-volley', 'active', 1)).toBe(9);
  expect(campaignAttackFrame('mark-lunge', 'recovery', 1)).toBe(10);
});

it('keeps new melee collision inside measured umbrella, baton and shield endpoints', () => {
  for (const [boss, endpoints] of [['mark', [55, 35]], ['chief', [38, 42]]] as const) {
    const pattern = new BossPattern(boss);
    for (const endpoint of endpoints) {
      const profile = pattern.nextProfile();
      const right = attackShapeAt(100, 200, profile, 1), left = attackShapeAt(100, 200, profile, -1);
      expect(right.x + right.width).toBeLessThanOrEqual(100 + endpoint);
      expect(left.x).toBeGreaterThanOrEqual(100 - endpoint);
    }
  }
});

it('keeps every volley ray in its locked forward direction even when the target is behind the muzzle', () => {
  for (const facing of [-1, 1] as const) for (const spread of [-1, 0, 1]) {
    const angle = volleyAngle({ x: 100 + facing * 32, y: 85 }, { x: 100 + facing * 8, y: 120 }, facing, spread);
    expect(Math.cos(angle) * facing).toBeGreaterThan(0);
    expect(Math.sin(angle)).toBeGreaterThan(0);
  }
});

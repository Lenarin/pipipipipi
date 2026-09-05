import { describe, expect, it } from 'vitest';
import { AttackChain, PIPE_ATTACKS } from '../src/gameplay/Combat';
import { pipeFrame, contactInWorld, HERO_PIPE_POSES, HERO_COMBAT_POSES, HERO_LAYOUT, kickFrame } from '../src/game/spriteFrames';

describe('sprite-driven pipe combat', () => {
  it('has exactly three strikes, with damage 1 / 1 / 2 and a longer finisher recovery', () => {
    expect(PIPE_ATTACKS.map(p => p.damageMultiplier)).toEqual([1, 1, 2]);
    expect(PIPE_ATTACKS[2].recoveryMs).toBeGreaterThan(PIPE_ATTACKS[1].recoveryMs);
    const chain = new AttackChain();
    chain.request(1); chain.advance(220); chain.request(1); chain.advance(110); chain.advance(250); chain.request(1); chain.advance(120);
    expect(chain.currentProfile?.damageMultiplier).toBe(2);
    expect(chain.request(1)).toBe(false);
  });

  it('selects anticipation, two forward contacts and recovery from the authoritative phase', () => {
    for (let step = 1; step <= 3; step++) {
      const base = (step - 1) * 8;
      expect(pipeFrame(step, 'windup', .9)).toBe(base + 2);
      expect(pipeFrame(step, 'active', 0)).toBe(base + 3);
      expect(pipeFrame(step, 'active', .9)).toBe(base + 4);
      expect(pipeFrame(step, 'recovery', 0)).toBe(base + 5);
      for (const frame of [base + 3, base + 4]) {
        const pose = HERO_PIPE_POSES[frame];
        const right = contactInWorld(pose, 100, 200, .6875, 1)!;
        const left = contactInWorld(pose, 100, 200, .6875, -1)!;
        expect(right.x2).toBeGreaterThan(right.x1);
        expect(right.x1).toBeGreaterThan(100);
        expect(left.x2).toBeLessThan(left.x1);
        expect(left.x1).toBeLessThan(100);
        expect(right.x2 - 100).toBeCloseTo(100 - left.x2);
        expect(right.y2).toBeCloseTo(left.y2);
      }
      expect(contactInWorld(HERO_PIPE_POSES[base], 0, 0, 1, 1)).toBeNull();
    }
    expect(HERO_LAYOUT.anchorX).toBe(HERO_LAYOUT.width / 2);
  });

  it('only exposes a kick contact on the extended boot frame', () => {
    expect([0, .2, .5, .95].map(kickFrame)).toEqual([12, 13, 14, 15]);
    expect(HERO_COMBAT_POSES.filter(p => p.contact).length).toBe(7);
  });
});

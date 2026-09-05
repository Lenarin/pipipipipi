import { describe, expect, it } from 'vitest';
import { EnemyAttackCycle, type EnemyAttackProfile } from '../src/gameplay/EnemyAttackCycle';

const melee: EnemyAttackProfile = {
  attack: 'melee',
  windupMs: 600,
  activeMs: 140,
  recoveryMs: 500,
  damage: 14,
  reach: 58,
  thickness: 34,
  motion: 'thrust',
};

describe('EnemyAttackCycle', () => {
  it('commits facing at start and exposes anticipation, active, and recovery progress', () => {
    const cycle = new EnemyAttackCycle();
    expect(cycle.start(melee, -1)).toBe(true);
    expect(cycle.state).toMatchObject({ phase: 'windup', facing: -1, attack: 'melee' });

    cycle.advance(300);
    expect(cycle.progress).toBeCloseTo(0.5, 5);
    expect(cycle.isActive).toBe(false);

    cycle.advance(300);
    expect(cycle.state).toMatchObject({ phase: 'active', facing: -1 });
    expect(cycle.isActive).toBe(true);
    cycle.advance(140);
    expect(cycle.state.phase).toBe('recovery');
    expect(cycle.isRecovering).toBe(true);
  });

  it('finishes a committed miss even when one update crosses every remaining phase', () => {
    const cycle = new EnemyAttackCycle();
    cycle.start(melee, 1);

    const events = cycle.advance(1_240);

    expect(events.map((event) => event.type)).toEqual(['active', 'recovery', 'idle']);
    expect(cycle.state).toEqual({ phase: 'idle', attack: null, facing: 1 });
  });

  it('allows at most one successful damage token during an active attack', () => {
    const cycle = new EnemyAttackCycle();
    cycle.start(melee, 1);
    cycle.advance(600);

    expect(cycle.consumeHit()).toBe(true);
    expect(cycle.consumeHit()).toBe(false);
    cycle.advance(140 + 500);
    expect(cycle.consumeHit()).toBe(false);
  });

  it('cancel clears phase, profile, progress, and any unused hit token', () => {
    const cycle = new EnemyAttackCycle();
    cycle.start(melee, -1);
    cycle.advance(600);
    cycle.cancel();

    expect(cycle.state).toEqual({ phase: 'idle', attack: null, facing: -1 });
    expect(cycle.profile).toBeUndefined();
    expect(cycle.progress).toBe(0);
    expect(cycle.consumeHit()).toBe(false);
  });
});

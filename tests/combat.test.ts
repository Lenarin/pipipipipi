import { describe, expect, it } from 'vitest';
import { AttackChain, PIPE_ATTACKS } from '../src/gameplay/Combat';

describe('AttackChain', () => {
  it('advances through the first swing windup, active, and recovery timings', () => {
    const chain = new AttackChain();
    expect(chain.request(1)).toBe(true);
    expect(chain.state).toMatchObject({ phase: 'windup', step: 1, facing: 1, queued: false });

    expect(chain.advance(64)).toEqual([]);
    expect(chain.state.phase).toBe('windup');
    expect(chain.advance(1)).toEqual([{ type: 'active', step: 1, facing: 1 }]);
    expect(chain.advance(70)).toEqual([{ type: 'recovery', step: 1, facing: 1 }]);
    expect(chain.advance(120)).toEqual([{ type: 'idle' }]);
  });

  it('reports continuously increasing phase progress for renderer-driven sweeps', () => {
    const chain = new AttackChain();
    chain.request(1);
    chain.advance(32.5);
    expect(chain.phaseProgress).toBeCloseTo(0.5, 4);
    chain.advance(32.5);
    expect(chain.phaseProgress).toBe(0);
  });

  it('buffers one follow-up and starts the second chain step after recovery', () => {
    const chain = new AttackChain();
    chain.request(-1);
    expect(chain.request(1)).toBe(true);
    expect(chain.request(1)).toBe(false);

    chain.advance(65 + 70 + 120);
    expect(chain.state).toMatchObject({ phase: 'windup', step: 2, facing: 1, queued: false });
  });

  it('honours buffered facing on every new swing while preserving the finisher profile', () => {
    const chain = new AttackChain();
    chain.request(-1);
    chain.request(1);
    chain.advance(65 + 70 + 120);
    chain.request(-1);
    chain.advance(75 + 75 + 130);

    expect(chain.state).toMatchObject({ phase: 'windup', step: 3, facing: -1 });
    expect(chain.currentProfile).toMatchObject({ damageMultiplier: 2, reach: 42, lunge: 78, windupMs: 110, activeMs: 100, recoveryMs: 220 });
  });

  it('reverses a buffered second swing toward the latest attack intent', () => {
    const chain = new AttackChain();
    chain.request(1);
    chain.request(-1);
    chain.advance(255);

    expect(chain.state.facing).toBe(-1);
  });

  it('lets held movement intent override an older buffered direction at the next swing boundary', () => {
    const chain = new AttackChain();
    chain.request(1);
    chain.request(1);
    chain.advance(255, -1);

    expect(chain.state).toMatchObject({ phase: 'windup', step: 2, facing: -1 });
  });

  it('cancels an in-flight swing and clears a buffered follow-up for a dash or reset', () => {
    const chain = new AttackChain();
    chain.request(1);
    chain.request(1);
    chain.advance(65);
    chain.cancel();

    expect(chain.state).toEqual({ phase: 'idle', step: 0, facing: 1, queued: false });
    expect(chain.advance(500)).toEqual([]);
    expect(chain.request(-1)).toBe(true);
    expect(chain.state.facing).toBe(-1);
  });

  it('keeps exactly one pipe profile with a double-damage third strike', () => {
    expect(PIPE_ATTACKS).toHaveLength(3);
    expect(PIPE_ATTACKS.map(profile => profile.damageMultiplier)).toEqual([1, 1, 2]);
  });
});

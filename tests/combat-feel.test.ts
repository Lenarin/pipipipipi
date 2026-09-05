import { describe, expect, it } from 'vitest';
import * as combat from '../src/gameplay/Combat';

describe('P0 pipe rhythm and input lifetime', () => {
  it('keeps preparation visible, then releases contact before settling', () => {
    const chain = new combat.AttackChain(); chain.request(1);
    expect(chain.advance(99)).toEqual([]);
    expect(chain.advance(1)).toEqual([{ type: 'active', step: 1, facing: 1 }]);
    expect(chain.advance(80)).toEqual([{ type: 'recovery', step: 1, facing: 1 }]);
    expect(chain.advance(150)).toEqual([{ type: 'idle' }]);
  });
  it('does not execute an old preparation-time press after a full swing', () => {
    const chain = new combat.AttackChain(); chain.request(1); chain.request(1);
    chain.advance(330);
    expect(chain.state.phase).toBe('idle');
  });
  it('accepts one recent recovery press and clears it when dodging', () => {
    const chain = new combat.AttackChain(); chain.request(1); chain.advance(220);
    chain.request(1); chain.request(1); chain.advance(110);
    expect(chain.state).toMatchObject({ step: 2, phase: 'windup', queued: false });
    chain.request(1); chain.cancel(); chain.advance(1000);
    expect(chain.state).toMatchObject({ step: 0, phase: 'idle', queued: false });
  });
  it('refreshes one queued intent without adding another automatic swing', () => {
    const chain = new combat.AttackChain(); chain.request(1); chain.request(1);
    chain.advance(200); chain.request(-1); chain.advance(130);
    expect(chain.state).toMatchObject({ step: 2, facing: -1 });
    chain.advance(370);
    expect(chain.state.phase).toBe('idle');
  });
  it.each([30, 60, 120])('has the same three forward contact events at %i Hz', hz => {
    const chain = new combat.AttackChain(); chain.request(1);
    const contacts: number[] = [];
    for (let time = 0; time < 1500; time += 1000 / hz) {
      if (chain.state.phase === 'recovery') chain.request(1);
      for (const e of chain.advance(1000 / hz)) if (e.type === 'active') contacts.push(e.step);
    }
    expect(contacts).toEqual([1, 2, 3]);
    expect(chain.state.phase).toBe('idle');
  });
  it('releases an attack impulse gradually and mirrors it without changing walking', () => {
    const velocity = (combat as any).attackVelocity;
    expect(typeof velocity).toBe('function');
    expect(velocity(210, 'active', 0, 1, 0)).toBe(0);
    expect(velocity(210, 'active', .25, 1, 0)).toBeGreaterThan(180);
    expect(velocity(210, 'recovery', .8, 1, 0)).toBeLessThan(10);
    expect(velocity(210, 'recovery', 1, 1, 0)).toBe(0);
    expect(velocity(210, 'active', .5, -1, 0)).toBe(-velocity(210, 'active', .5, 1, 0));
    expect(velocity(210, 'active', .5, 1, -1)).toBeLessThanOrEqual(0);
  });
});

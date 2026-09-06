import { describe, expect, it } from 'vitest';
import * as combat from '../src/gameplay/Combat';

describe('P0 pipe rhythm and input lifetime', () => {
  it('gives preparation time to read while retaining a prompt first contact', () => {
    const chain = new combat.AttackChain(); chain.request(1);
    expect(chain.advance(139)).toEqual([]);
    expect(chain.state.phase).toBe('windup');
    expect(chain.advance(1)).toEqual([{ type:'active', step:1, facing:1 }]);
    expect(chain.advance(120)).toEqual([{ type:'recovery', step:1, facing:1 }]);
    expect(chain.advance(159)).toEqual([]);
    expect(chain.state.phase).toBe('recovery');
    expect(chain.advance(1)).toEqual([{ type:'idle' }]);
  });

  it('keeps one fresh recovery press through the longer visual follow-through', () => {
    const chain = new combat.AttackChain(); chain.request(1); chain.advance(220);
    chain.request(1); chain.advance(200);
    expect(chain.state).toMatchObject({ step:2, phase:'windup', queued:false });
    expect(chain.phaseProgress).toBe(0);
  });
  it('does not execute an old preparation-time press after a full swing', () => {
    const chain = new combat.AttackChain(); chain.request(1); chain.request(1);
    chain.advance(420);
    expect(chain.state.phase).toBe('idle');
  });
  it('accepts one recent recovery press and clears it when dodging', () => {
    const chain = new combat.AttackChain(); chain.request(1); chain.advance(220);
    chain.request(1); chain.request(1); chain.advance(200);
    expect(chain.state).toMatchObject({ step: 2, phase: 'windup', queued: false });
    chain.request(1); chain.cancel(); chain.advance(1000);
    expect(chain.state).toMatchObject({ step: 0, phase: 'idle', queued: false });
  });
  it('refreshes one queued intent without adding another automatic swing', () => {
    const chain = new combat.AttackChain(); chain.request(1); chain.request(1);
    chain.advance(260); chain.request(-1); chain.advance(160);
    expect(chain.state).toMatchObject({ step: 2, facing: -1 });
    chain.advance(460);
    expect(chain.state.phase).toBe('idle');
  });
  it.each([30, 60, 120])('has the same three forward contact events at %i Hz', hz => {
    const chain = new combat.AttackChain(); chain.request(1);
    const contacts: number[] = [];
    for (let time = 0; time < 2000; time += 1000 / hz) {
      if (chain.state.phase === 'recovery') chain.request(1);
      for (const e of chain.advance(1000 / hz)) if (e.type === 'active') contacts.push(e.step);
    }
    expect(contacts).toEqual([1, 2, 3]);
    expect(chain.state.phase).toBe('idle');
  });
  // v0.6 deliberately removes the automatic attack impulse. Its replacement is
  // verified through real Player/Arcade input in browser/control-feel.spec.ts.
});

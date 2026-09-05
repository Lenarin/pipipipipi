import { describe, expect, it } from 'vitest';
import { formatTime, resultContent } from '../src/game/presentation';
describe('run presentation', () => {
  it('formats time across minute boundary without rounding up', () => {
    expect(formatTime(59.9)).toBe('00:59');
    expect(formatTime(61.2)).toBe('01:01');
  });
  it('only a paused run offers resume, never a dead or completed run', () => {
    expect(resultContent('paused', 0).resume).toBe(true);
    expect(resultContent('dead', 1).resume).toBe(false);
    expect(resultContent('won', 2).resume).toBe(false);
  });
  it('death and victory explain their outcome', () => {
    expect(resultContent('dead', 0).description.length).toBeGreaterThan(10);
    expect(resultContent('won', 2).title).not.toBe(resultContent('dead', 2).title);
  });
});

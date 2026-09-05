import { describe, expect, it } from 'vitest';
import { CacheChoiceState, HealingChannel, KickAction } from '../src/gameplay/ActionState';

describe('ActionState', () => {
  it('reports healing progress without completing before its duration', () => {
    const channel = new HealingChannel(750);
    expect(channel.begin()).toBe(true);
    expect(channel.advance(375)).toBe(false);
    expect(channel.progress).toBe(0.5);
    expect(channel.advance(375)).toBe(true);
    expect(channel.active).toBe(false);
  });

  it('lets a cache commit only once until the run resets', () => {
    const choice = new CacheChoiceState();
    expect(choice.open('cache-a')).toBe(true);
    expect(choice.choose('damage')).toEqual({ cacheId: 'cache-a', choice: 'damage' });
    expect(choice.open('cache-a')).toBe(false);
    choice.reset();
    expect(choice.open('cache-a')).toBe(true);
  });

  it('gives a kick one short active window and clears hit targets afterward', () => {
    const kick = new KickAction(160);
    expect(kick.begin(1)).toBe(true);
    expect(kick.hit('walker')).toBe(true);
    expect(kick.hit('walker')).toBe(false);
    expect(kick.advance(159)).toBe(false);
    expect(kick.advance(1)).toBe(true);
    expect(kick.active).toBe(false);
  });
});

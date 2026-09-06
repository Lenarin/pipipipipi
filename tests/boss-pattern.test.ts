import { describe, expect, it } from 'vitest';
import { BossPattern } from '../src/gameplay/BossPattern';
import { EnemyAttackCycle } from '../src/gameplay/EnemyAttackCycle';

describe('BossPattern', () => {
  it('gives every authored strike a visible windup, a punishable recovery, and a locked direction', () => {
    for (const bossId of ['mark', 'chief', 'miller'] as const) {
      const pattern = new BossPattern(bossId);
      for (let attackIndex = 0; attackIndex < pattern.attackCount; attackIndex++) {
        const profile = pattern.nextProfile();
        const cycle = new EnemyAttackCycle();

        cycle.start(profile, -1);
        cycle.advance(519);
        expect(cycle.state).toMatchObject({ phase: 'windup', facing: -1 });

        cycle.advance(profile.windupMs - 519);
        expect(cycle.state).toMatchObject({ phase: 'active', facing: -1 });

        cycle.advance(profile.activeMs);
        expect(cycle.state).toMatchObject({ phase: 'recovery', facing: -1 });
        cycle.advance(499);
        expect(cycle.state.phase).toBe('recovery');
      }
    }
  });

  it('cycles Mark between lunge and heavy, the chief between charge and baton, and Miller through an aimed volley', () => {
    const mark = new BossPattern('mark');
    const chief = new BossPattern('chief');
    const miller = new BossPattern('miller');

    expect([mark.nextProfile().attack, mark.nextProfile().attack, mark.nextProfile().attack])
      .toEqual(['mark-lunge', 'mark-heavy', 'mark-lunge']);
    expect([chief.nextProfile().attack, chief.nextProfile().attack, chief.nextProfile().attack])
      .toEqual(['chief-charge', 'chief-baton', 'chief-charge']);
    expect([miller.nextProfile().attack, miller.nextProfile().attack])
      .toEqual(['miller-volley', 'miller-volley']);
  });

  it('requests Miller reinforcements exactly once when damage crosses half health', () => {
    const miller = new BossPattern('miller');

    miller.observeHealth(360, 181, 360);
    expect(miller.consumeReinforcements()).toBe(false);
    miller.observeHealth(181, 180, 360);
    expect(miller.consumeReinforcements()).toBe(true);
    expect(miller.consumeReinforcements()).toBe(false);

    miller.observeHealth(180, 240, 360);
    miller.observeHealth(240, 160, 360);
    expect(miller.consumeReinforcements()).toBe(false);
  });

  it('never requests reinforcements for Mark or the chief', () => {
    for (const bossId of ['mark', 'chief'] as const) {
      const pattern = new BossPattern(bossId);
      pattern.observeHealth(360, 120, 360);
      expect(pattern.consumeReinforcements()).toBe(false);
    }
  });
});

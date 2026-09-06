import { describe, expect, it } from 'vitest';
import { RunRules } from '../src/gameplay/Rules';

describe('RunRules', () => {
  it('ignores damage during immunity and accepts it after expiry', () => {
    const rules = new RunRules();
    rules.start();
    rules.grantImmunity(300);
    expect(rules.takeDamage(20)).toBe(false);
    rules.tick(301);
    expect(rules.takeDamage(20)).toBe(true);
    expect(rules.hp).toBe(80);
  });

  it('registers each target only once per swing', () => {
    const rules = new RunRules();
    rules.start();
    const swing = rules.beginSwing();
    expect(rules.hitTarget(swing, 'hound-1')).toBe(true);
    expect(rules.hitTarget(swing, 'hound-1')).toBe(false);
    expect(rules.hitTarget(swing, 'hound-2')).toBe(true);
  });

  it('creates independent swing identities without a second cadence gate', () => {
    const rules = new RunRules();
    rules.start();
    const first = rules.beginSwing();
    const second = rules.beginSwing();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
    expect(rules.hitTarget(second, 'walker-1')).toBe(true);
  });

  it('retires earlier swing tokens and keeps only the current hit set in a long run', () => {
    const rules = new RunRules(); rules.start();
    const stale = rules.beginSwing();
    for (let i = 0; i < 10_000; i++) {
      const swing = rules.beginSwing();
      expect(rules.hitTarget(swing, 'walker')).toBe(true);
      expect(rules.hitTarget(swing, 'walker')).toBe(false);
    }
    expect(rules.hitTarget(stale, 'untouched-target')).toBe(false);
    expect((rules as unknown as { swingHits: Map<number, Set<string>> }).swingHits.size).toBe(1);
  });

  it('cannot reuse a pre-restart token after a new attack starts', () => {
    const rules = new RunRules(); rules.start();
    const stale = rules.beginSwing();
    rules.start(); const current = rules.beginSwing();
    expect(current).not.toBe(stale);
    expect(rules.hitTarget(stale, 'walker')).toBe(false);
    expect(rules.hitTarget(current, 'walker')).toBe(true);
  });

  it('spends a flask and heals only after an uninterrupted 750 ms channel', () => {
    const rules = new RunRules();
    rules.start();
    rules.hp = 40;

    expect(rules.beginHealing()).toBe(true);
    expect(rules.advanceHealing(400)).toBe(false);
    expect({ hp: rules.hp, flasks: rules.flasks }).toEqual({ hp: 40, flasks: 2 });
    expect(rules.advanceHealing(350)).toBe(true);
    expect(rules.hp).toBe(75);
    expect(rules.flasks).toBe(1);
  });

  it('cancels healing without spending a flask or applying health', () => {
    const rules = new RunRules();
    rules.start();
    rules.hp = 40;
    rules.beginHealing();
    rules.advanceHealing(400);

    expect(rules.cancelHealing()).toBe(true);
    expect(rules.advanceHealing(500)).toBe(false);
    expect({ hp: rules.hp, flasks: rules.flasks, healing: rules.healing }).toEqual({ hp: 40, flasks: 2, healing: false });
  });

  it('enforces cooldown before an action can be reused', () => {
    const rules = new RunRules();
    rules.start();
    expect(rules.useCooldown('dash', 500)).toBe(true);
    expect(rules.useCooldown('dash', 500)).toBe(false);
    rules.tick(500);
    expect(rules.useCooldown('dash', 500)).toBe(true);
  });

  it('prevents actions after death', () => {
    const rules = new RunRules();
    rules.start();
    rules.takeDamage(100);
    expect(rules.mode).toBe('dead');
    expect(rules.beginSwing()).toBeNull();
    expect(rules.beginHealing()).toBe(false);
    expect(rules.useCooldown('dash', 500)).toBe(false);
  });

  it('wins only when the final boss is defeated in the port', () => {
    const rules = new RunRules();
    rules.start();
    rules.completeStage(false);
    expect(rules.mode).toBe('playing');
    rules.completeStage(true);
    expect(rules.stage).toBe(2);
    expect(rules.mode).toBe('playing');
    rules.completeStage(true);
    expect(rules.mode).toBe('won');
  });

  it('resets run state and invalidates stale combat actions on restart', () => {
    const rules = new RunRules();
    rules.start();
    const staleSwing = rules.beginSwing();
    expect(rules.hitTarget(staleSwing, 'stale-target')).toBe(true);
    rules.takeDamage(30);
    rules.beginHealing();
    rules.advanceHealing(750);
    rules.addShards(12);
    rules.setWeaponLevel(3);
    rules.upgradeMaxHp();
    rules.recordKill();
    rules.advanceStage();
    rules.tick(750);
    expect(rules.useCooldown('dash', 500)).toBe(true);
    rules.start();
    expect({ hp: rules.hp, maxHp: rules.maxHp, flasks: rules.flasks, shards: rules.shards, kills: rules.kills, weaponLevel: rules.weaponLevel, stage: rules.stage, elapsed: rules.elapsed, mode: rules.mode })
      .toEqual({ hp: 100, maxHp: 100, flasks: 2, shards: 0, kills: 0, weaponLevel: 1, stage: 0, elapsed: 0, mode: 'playing' });
    expect(rules.immune).toBe(false);
    expect(rules.dashReady).toBe(true);
    expect(rules.hitTarget(staleSwing, 'new-target')).toBe(false);
    expect(rules.useCooldown('dash', 500)).toBe(true);
    expect(rules.beginSwing()).not.toBeNull();
  });

  it('gates the kick ability with its own cooldown', () => {
    const rules = new RunRules();
    rules.start();

    expect(rules.useAbility()).toBe(true);
    expect(rules.abilityReady).toBe(false);
    rules.tick(1_699);
    expect(rules.useAbility()).toBe(false);
    rules.tick(1);
    expect(rules.useAbility()).toBe(true);
  });

  it('applies one cache choice once, preserves it across stages, and resets it on replay', () => {
    const rules = new RunRules();
    rules.start();
    expect(rules.openCacheChoice('courtyard-0')).toBe(true);
    expect(rules.applyCacheChoice('damage')).toBe(true);
    expect(rules.weaponLevel).toBe(2);
    rules.advanceStage();
    expect(rules.openCacheChoice('courtyard-0')).toBe(false);
    expect(rules.weaponLevel).toBe(2);

    rules.start();
    expect(rules.weaponLevel).toBe(1);
    expect(rules.openCacheChoice('courtyard-0')).toBe(true);
    expect(rules.applyCacheChoice('health')).toBe(true);
    expect({ hp: rules.hp, maxHp: rules.maxHp }).toEqual({ hp: 120, maxHp: 120 });
  });
});

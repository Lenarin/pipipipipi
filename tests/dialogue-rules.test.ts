import { expect, it } from 'vitest';
import { RunRules } from '../src/gameplay/Rules';

it('dialogue suspends combat clocks and survives pause/resume without returning to combat', () => {
  const rules = new RunRules();
  rules.start(); rules.useAbility(); rules.tick(100);
  rules.beginDialogue();
  const cooldown = rules.abilityCooldownProgress;
  rules.tick(1000);
  expect(rules.takeDamage(10)).toBe(false);
  expect(rules.elapsed).toBe(100);
  expect(rules.pause()).toBe(true);
  expect(rules.resume()).toBe(true);
  expect(rules.mode).toBe('dialogue');
  expect(rules.abilityCooldownProgress).toBe(cooldown);
  rules.endDialogue();
  expect(rules.mode).toBe('playing');
});

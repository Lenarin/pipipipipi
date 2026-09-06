import { expect, it } from 'vitest';
import { montageKey, portraitFrame } from '../src/story/dialoguePresentation';

it('a fast reader still sees descent and wreck at their corresponding lines', () => {
  expect(montageKey('rough-landing', 0, 0)).toBe('story-v8-flight');
  expect(montageKey('rough-landing', 0, 2)).toBe('story-v8-descent');
  expect(montageKey('rough-landing', 0, 3)).toBe('story-v8-wreck');
  expect(montageKey('rough-landing', 2000, 0)).toBe('story-v8-wreck');
});

it('the delivered scene shows eating while the final shared-meal lines remain readable', () => {
  expect(montageKey('delivered', 0, 0)).toBe('story-v8-food');
  expect(montageKey('delivered', 0, 4)).toBe('story-v8-eating');
  expect(montageKey('phone-call', 5000, 0)).toBeNull();
});

it('talking and blinking select supplied frames inside the active emotion row', () => {
  expect(portraitFrame('neutral', false, 0)).toBe(0);
  expect(portraitFrame('warm', true, 0)).toBe(5);
  expect(portraitFrame('warm', true, 120)).toBe(6);
  expect(portraitFrame('intense', false, 2950)).toBe(11);
  expect(portraitFrame('intense', false, 3100)).toBe(8);
});

import { expect, it } from 'vitest';
import { addPixelOutline, keyBackground } from '../src/game/spriteImport';
it('imports chroma-key sheet without deleting glasses, skin or shoe highlights', () => {
  const pixels = new Uint8ClampedArray([255,0,255,255, 220,10,221,255, 25,25,30,255, 255,230,200,255, 245,245,245,255]);
  keyBackground(pixels);
  expect([...pixels]).toEqual([255,0,255,0, 220,10,221,0, 25,25,30,255, 255,230,200,255, 245,245,245,255]);
});
it('keys darker magenta edge pixels left by source encoding', () => {
  const pixels = new Uint8ClampedArray([95, 10, 89, 255]);
  keyBackground(pixels);
  expect(pixels[3]).toBe(0);
});
it('adds a one-pixel cardinal rim without changing the character or filling the background', () => {
  const pixels = new Uint8ClampedArray(5 * 5 * 4);
  pixels.set([24, 25, 30, 255], (2 * 5 + 2) * 4);
  addPixelOutline(pixels, 5, 5, [145, 167, 160]);
  expect([...pixels.slice(48, 52)]).toEqual([24, 25, 30, 255]);
  expect([...pixels.slice(28, 32)]).toEqual([145, 167, 160, 255]);
  expect([...pixels].filter((_, i) => i % 4 === 3 && pixels[i] > 0)).toHaveLength(5);
  expect(pixels[3]).toBe(0);
});
it('does not wrap outline pixels across row or sprite-cell boundaries', () => {
  const pixels = new Uint8ClampedArray(3 * 2 * 4);
  pixels.set([25, 25, 30, 255], 2 * 4);
  addPixelOutline(pixels, 3, 2, [145, 167, 160]);
  expect(pixels[3 * 4 + 3]).toBe(0);
  expect(pixels[5 * 4 + 3]).toBe(255);
});

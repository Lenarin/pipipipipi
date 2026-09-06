import type { Emotion, StoryId } from './story';

/** Portrait sheets: three emotion rows, neutral / talk / wide talk / blink. */
export function portraitFrame(emotion: Emotion, typing: boolean, elapsed: number): number {
  const row = { neutral: 0, warm: 1, intense: 2 }[emotion];
  const blink = elapsed % 3100 >= 2940;
  return row * 4 + (blink ? 3 : typing ? 1 + Math.floor(elapsed / 110) % 2 : 0);
}

/** Montage timing never advances a dialogue line or delays skip. */
export function montageKey(id: StoryId, elapsed: number, lineIndex: number): string | null {
  if (id === 'wanted') return 'story-v8-wanted';
  if (id === 'rough-landing') {
    const progress = Math.max(elapsed, lineIndex >= 3 ? 1800 : lineIndex >= 2 ? 900 : 0);
    return progress < 900 ? 'story-v8-flight' : progress < 1800 ? 'story-v8-descent' : 'story-v8-wreck';
  }
  if (id === 'delivered') return lineIndex >= 4 ? 'story-v8-eating' : 'story-v8-food';
  return null;
}

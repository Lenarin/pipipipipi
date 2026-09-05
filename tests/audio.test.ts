import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

describe('original pipe sound assets', () => {
  it('generates distinct, audible, unclipped PCM variations into the requested directory', () => {
    const output = mkdtempSync(join(tmpdir(), 'batumi-audio-test-'));
    try {
      execFileSync(process.execPath, ['scripts/generate-audio.mjs', output]);
      const fingerprints = new Set<string>();
      for (const family of ['swing', 'hit', 'heavy', 'kill']) for (let variant = 1; variant <= 3; variant++) {
        const file = join(output, `pipe-${family}-${variant}-v5.wav`);
        expect(existsSync(file), file).toBe(true);
        const wav = readFileSync(file);
        expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
        expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
        expect(wav.readUInt32LE(24)).toBe(22050);
        let energy = 0, peak = 0;
        for (let i = 44; i < wav.length; i += 2) { const x = wav.readInt16LE(i) / 32768; energy += x*x; peak = Math.max(peak, Math.abs(x)); }
        expect(Math.sqrt(energy / ((wav.length - 44) / 2))).toBeGreaterThan(.015);
        expect(peak).toBeLessThan(.95);
        fingerprints.add(wav.toString('base64'));
      }
      expect(fingerprints.size).toBe(12);
    } finally { rmSync(output, { recursive: true }); }
  });
});

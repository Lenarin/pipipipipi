// Original procedural audio assets, deterministic PCM WAV. Playback uses Phaser sound.
import { mkdirSync, writeFileSync } from 'node:fs';
const dir = new URL('../public/assets/audio/', import.meta.url);
mkdirSync(dir, { recursive: true });
let seed = 73;
const noise = () => { seed = (seed * 16807) % 2147483647; return seed / 1073741824 - 1; };
function wav(name, duration, sample) {
  const rate = 22050, count = Math.floor(duration * rate), data = Buffer.alloc(44 + count * 2);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample(i / rate, i / count))) * 20000), 44 + i * 2);
  writeFileSync(new URL(`${name}.wav`, dir), data);
}
wav('slash', .17, (t, p) => (noise() * .6 + Math.sin(t * 1300 * (1 - p)) * .15) * (1 - p) ** 2);
wav('hit', .2, (t, p) => (noise() * .5 + Math.sin(t * 420 * (1 - p)) * .55) * (1 - p) ** 3);
wav('jump', .16, (t, p) => Math.sin(t * (1300 + p * 2500)) * Math.sin(p * Math.PI) * .25);
wav('dash', .24, (t, p) => noise() * Math.sin(p * Math.PI) * .22 + Math.sin(t * 350) * (1 - p) * .12);
wav('heal', .65, (t, p) => (Math.sin(t * 2200) + Math.sin(t * 2772) + Math.sin(t * 3300)) * Math.sin(p * Math.PI) * .1);
wav('kill', .32, (t, p) => (Math.sin(t * 780 * (1 - p * .7)) + noise() * .4) * (1 - p) ** 2 * .35);
let low = 0;
wav('ambience', 8, (t, p) => { low = low * .96 + noise() * .04; return (low * .65 + Math.sin(t * Math.PI * 2 * 55) * .025 + Math.sin(t * Math.PI * 2 * 82.5) * .015) * Math.min(1, p * 80, (1 - p) * 80); });
console.log('Generated 7 original WAV assets.');

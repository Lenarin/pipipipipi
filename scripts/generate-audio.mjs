// Original procedural audio assets, deterministic PCM WAV. Playback uses Phaser sound.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = process.argv[2] ? pathToFileURL(resolve(process.argv[2]) + '/') : new URL('../public/assets/audio/', import.meta.url);
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
// Pipe feedback: separate air movement, body transient and resonating metal.
for (let variant = 1; variant <= 3; variant++) {
  const pitch = .93 + variant * .055;
  let air = 0, rumble = 0;
  wav(`pipe-swing-${variant}-v5`, .21, (t, p) => {
    air = air * .62 + noise() * .38;
    return (air * .8 + Math.sin(2*Math.PI*(340*pitch*t - 430*t*t))*.12) * Math.sin(Math.PI*p) ** 1.7;
  });
  wav(`pipe-hit-${variant}-v5`, .30, (t) => {
    rumble = rumble * .7 + noise() * .3;
    const body = Math.sin(2*Math.PI*105*pitch*t) * Math.exp(-t*38) * .56;
    const contact = noise() * Math.exp(-t*150) * .48;
    const ring = (Math.sin(2*Math.PI*510*pitch*t) + .38*Math.sin(2*Math.PI*1381*pitch*t)) * Math.exp(-t*19) * .17;
    return (body + contact + ring + rumble * Math.exp(-t*32)*.22) * Math.min(1,t*1800);
  });
  wav(`pipe-heavy-${variant}-v5`, .43, (t) => {
    rumble = rumble * .82 + noise() * .18;
    const thump = Math.sin(2*Math.PI*(77*pitch*t-26*t*t)) * Math.exp(-t*20) * .72;
    const clang = (Math.sin(2*Math.PI*370*pitch*t)+.3*Math.sin(2*Math.PI*1013*pitch*t)) * Math.exp(-t*13) * .21;
    return (thump + clang + noise()*Math.exp(-t*130)*.38 + rumble*Math.exp(-t*18)*.28) * Math.min(1,t*1800);
  });
  wav(`pipe-kill-${variant}-v5`, .4, (t, p) => {
    rumble = rumble * .77 + noise() * .23;
    return (Math.sin(2*Math.PI*(125*pitch*t-95*t*t))*.5 + rumble*.45) * Math.exp(-t*13) * Math.min(1,p*45);
  });
}
console.log('Generated 7 legacy and 12 original pipe WAV assets.');

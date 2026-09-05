import type Phaser from 'phaser';

/** Original PCM variants; Phaser owns decoding, mixing, mute and playback lifecycle. */
export class CombatAudio {
  private readonly variants = { swing: 0, hit: 0, heavy: 0, kill: 0 };
  constructor(private readonly scene: Phaser.Scene) {}
  swing(step: number): void { this.play('swing', step === 3 ? .42 : .30, step === 3 ? .86 : 1); }
  impact(step: number): void { this.play(step === 3 ? 'heavy' : 'hit', step === 3 ? .62 : .49); }
  kill(): void { this.play('kill', .43); }
  private play(family: keyof CombatAudio['variants'], volume: number, rate = 1): void {
    const variant = this.variants[family] = this.variants[family] % 3 + 1;
    const key = `pipe-${family}-${variant}-v5`;
    if (this.scene.cache.audio.exists(key)) this.scene.sound.play(key, { volume, rate });
  }
}

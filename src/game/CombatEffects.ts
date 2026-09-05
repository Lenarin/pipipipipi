import Phaser from 'phaser';
import type { AttackProfile, AttackState } from '../gameplay/Combat';
import type { KickAction } from '../gameplay/ActionState';
import type { Player } from '../gameplay/Player';
import { pipeFrame, contactInWorld, HERO_COMBAT_POSES, HERO_PIPE_POSES, kickFrame } from './spriteFrames';

/** Visual-only combat feedback. Physics and timing remain in GameScene and AttackChain. */
export class CombatEffects {
  private readonly channel: Phaser.GameObjects.Graphics;
  private previousStrike: Phaser.Geom.Line | null = null;
  private sweptSegments: Phaser.Geom.Line[] = [];
  private currentSegment: Phaser.Geom.Line | null = null;
  private currentKick: Phaser.Geom.Rectangle | null = null;
  private previousSwing = 0;
  private readonly trail: Phaser.GameObjects.Graphics;
  private trailHistory: { line: Phaser.Geom.Line; age: number }[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.trail = scene.add.graphics().setDepth(4).setName('pipe-trail').setVisible(false);
    this.channel = scene.add.graphics().setDepth(11).setVisible(false);
  }

  update(player: Player, attack: AttackState, progress: number, _profile?: AttackProfile, delta = 16.667): void {
    const frame = pipeFrame(attack.step, attack.phase, progress);
    if (attack.phase !== 'idle' && !player.isDashing && !player.isHurt) player.showPipePose(frame);
    const contact = attack.phase === 'active' && !player.isDashing && !player.isHurt
      ? contactInWorld(HERO_PIPE_POSES[frame], player.x, player.y, player.scaleX, attack.facing) : null;
    this.currentSegment = contact ? new Phaser.Geom.Line(contact.x1, contact.y1, contact.x2, contact.y2) : null;
    this.sweptSegments = this.currentSegment ? [this.currentSegment] : [];
    if (this.currentSegment && this.previousStrike && this.previousSwing === attack.step) {
      this.sweptSegments.push(new Phaser.Geom.Line(this.previousStrike.x2, this.previousStrike.y2, this.currentSegment.x2, this.currentSegment.y2));
      this.sweptSegments.push(new Phaser.Geom.Line(this.previousStrike.x1, this.previousStrike.y1, this.currentSegment.x1, this.currentSegment.y1));
    }
    this.drawTrail(attack, delta);
    this.previousStrike = this.currentSegment;
    this.previousSwing = attack.step;
  }

  clear(): void {
    this.previousStrike = this.currentSegment = null;
    this.sweptSegments = []; this.currentKick = null;
    this.trailHistory = []; this.trail.clear().setVisible(false);
    this.channel.clear().setVisible(false);
  }

  private drawTrail(attack: AttackState, delta: number): void {
    this.trail.clear();
    if (attack.phase === 'windup' || attack.step !== this.previousSwing) this.trailHistory = [];
    this.trailHistory = this.trailHistory.map(p => ({ ...p, age: p.age + delta })).filter(p => p.age < 90);
    if (this.currentSegment) this.trailHistory.push({ line: Phaser.Geom.Line.Clone(this.currentSegment), age: 0 });
    this.trail.setVisible(this.trailHistory.length > 0);
    for (let i = 0; i < this.trailHistory.length; i++) {
      const { line, age } = this.trailHistory[i], alpha = (1 - age / 90) * .48;
      const previous = this.trailHistory[i - 1]?.line;
      if (previous) {
        this.trail.fillStyle(attack.step === 3 ? 0xe9ba80 : 0xc4dfd5, alpha * .5);
        this.trail.fillPoints([new Phaser.Math.Vector2(Math.round(previous.x1), Math.round(previous.y1)), new Phaser.Math.Vector2(Math.round(previous.x2), Math.round(previous.y2)), new Phaser.Math.Vector2(Math.round(line.x2), Math.round(line.y2)), new Phaser.Math.Vector2(Math.round(line.x1), Math.round(line.y1))], true);
        this.trail.lineStyle(attack.step === 3 ? 3 : 2, 0xffe6b2, alpha);
        this.trail.lineBetween(Math.round(previous.x2), Math.round(previous.y2), Math.round(line.x2), Math.round(line.y2));
      }
      this.trail.lineStyle(2, 0xe9eee0, alpha).lineBetween(Math.round(line.x1), Math.round(line.y1), Math.round(line.x2), Math.round(line.y2));
    }
  }

  /** Source-pixel contact markers, transformed with the visible full-body frame. */
  get strikeSegment(): Phaser.Geom.Line | null { return this.currentSegment; }
  get strikeSweep(): readonly Phaser.Geom.Line[] { return this.sweptSegments; }
  get strikeThickness(): number { return 5; }
  get kickBounds(): Phaser.Geom.Rectangle | null { return this.currentKick; }

  updateKick(player: Player, kick: KickAction): void {
    this.currentKick = null;
    if (!kick.active || player.isDashing || player.isHurt) return;
    const frame = kickFrame(kick.progress);
    player.setFlipX(kick.facing < 0).showCombatPose(frame);
    if (frame !== 14) return;
    const boot = contactInWorld(HERO_COMBAT_POSES[frame], player.x, player.y, player.scaleX, kick.facing)!;
    // Only the drawn leg and boot, not a detached extended hit rectangle.
    this.currentKick = new Phaser.Geom.Rectangle(Math.min(boot.x1, boot.x2) - 4, Math.min(boot.y1, boot.y2) - 6,
      Math.abs(boot.x2 - boot.x1) + 8, Math.abs(boot.y2 - boot.y1) + 12);
  }

  updateHealing(player: Player, active: boolean, progress: number): void {
    this.channel.clear().setVisible(active);
    if (!active) return;
    player.showActionPose(4 + Math.min(3, Math.floor(progress * 4)));
    this.channel.lineStyle(3, 0xbce8dc, 0.9).beginPath();
    this.channel.arc(player.x, player.y + 4, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    this.channel.strokePath();
  }

  dashBurst(x: number, y: number, facing: 1 | -1, ending = false): void {
    const sparks = this.scene.add.particles(x, y, 'particle', {
      speedX: facing === 1 ? { min: ending ? -35 : -90, max: -15 } : { min: 15, max: ending ? 35 : 90 },
      speedY: { min: -24, max: 24 },
      lifespan: ending ? 180 : 260,
      quantity: ending ? 5 : 9,
      tint: [0xbce8dc, 0x789f9a],
      alpha: { start: 0.75, end: 0 },
      emitting: false,
    });
    sparks.explode();
    this.scene.time.delayedCall(300, () => sparks.destroy());
  }

  confirmHit(x: number, y: number, damage: number, finisher: boolean, facing: 1 | -1, shakeEnabled: boolean): void {
    const flash = this.scene.add.graphics({ x, y }).setDepth(5.5).setName('pipe-impact');
    const size = finisher ? 11 : 7;
    flash.fillStyle(0xfff1c7, 1).fillRect(-size, -1, size * 2, 3).fillRect(-1, -size, 3, size * 2);
    flash.fillStyle(0xe69562, .8).fillRect(-4, -4, 3, 3).fillRect(3, 3, 3, 3);
    // Scene clock advances through hitstop: flash blooms at contact, not after the pause.
    this.scene.time.delayedCall(finisher ? 105 : 80, () => flash.destroy());
    const sparks = this.scene.add.particles(x, y, 'particle', {
      speed: { min: finisher ? 75 : 45, max: finisher ? 175 : 120 },
      speedX: facing === 1 ? { min: finisher ? 55 : 35, max: finisher ? 145 : 105 } : { min: finisher ? -145 : -105, max: finisher ? -55 : -35 },
      lifespan: finisher ? 260 : 180,
      quantity: finisher ? 14 : 8,
      tint: finisher ? [0xfff0b8, 0xff9c7d] : [0xffd4aa, 0x9ac8c1],
      emitting: false,
    });
    sparks.setDepth(5.4).setName('pipe-fragments');
    sparks.explode();
    this.scene.time.delayedCall(470, () => sparks.destroy());
    if (damage > 0) {
      const label = this.scene.add.text(x, y - 9, `-${damage}`, { fontFamily: 'monospace', fontSize: finisher ? '15px' : '12px', color: finisher ? '#fff1bc' : '#ffe2b8', stroke: '#14242d', strokeThickness: 3 }).setOrigin(0.5).setDepth(8);
      this.scene.tweens.add({ targets: label, y: y - 20, alpha: 0, scale: finisher ? 1.24 : 1, duration: 440, onComplete: () => label.destroy() });
    }
    if (finisher && shakeEnabled) this.scene.cameras.main.shake(95, 0.008);
  }

  destroy(): void { this.channel.destroy(); this.trail.destroy(); }
}

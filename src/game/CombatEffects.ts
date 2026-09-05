import Phaser from 'phaser';
import type { AttackProfile, AttackState, WeaponKind } from '../gameplay/Combat';
import type { KickAction } from '../gameplay/ActionState';
import type { Player } from '../gameplay/Player';

/** Visual-only combat feedback. Physics and timing remain in GameScene and AttackChain. */
export class CombatEffects {
  private readonly blade: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  private readonly heavyShaft: Phaser.GameObjects.Rectangle;
  private readonly heavyHead: Phaser.GameObjects.Rectangle;
  private readonly kickStroke: Phaser.GameObjects.Rectangle;
  private readonly kickPose: Phaser.GameObjects.Graphics;
  private readonly channel: Phaser.GameObjects.Graphics;
  private readonly trail: Phaser.GameObjects.Graphics;
  private strikeActive = false;
  private previousStrike: Phaser.Geom.Line | null = null;
  private sweptSegments: Phaser.Geom.Line[] = [];
  private currentSegment: Phaser.Geom.Line | null = null;
  private currentThickness = 6;

  constructor(private readonly scene: Phaser.Scene) {
    this.blade = scene.textures.exists('weapon')
      ? scene.add.image(0, 0, 'weapon').setOrigin(0.5, 0.88).setDepth(9).setVisible(false)
      : scene.add.rectangle(0, 0, 4, 31, 0xd6edf2, 0.95).setOrigin(0.5, 0.92).setDepth(9).setVisible(false);
    this.heavyShaft = scene.add.rectangle(0, 0, 7, 70, 0x738f8d, 1).setStrokeStyle(1, 0xd0c092).setOrigin(0.5, 1).setDepth(9).setVisible(false);
    this.heavyHead = scene.add.rectangle(0, 0, 24, 10, 0x9c765b, 1).setStrokeStyle(1, 0xe1c28e).setDepth(10).setVisible(false);
    this.kickStroke = scene.add.rectangle(0, 0, 62, 22, 0xbce8dc, 0).setDepth(10).setVisible(false);
    this.kickPose = scene.add.graphics().setDepth(10).setVisible(false);
    this.channel = scene.add.graphics().setDepth(11).setVisible(false);
    this.trail = scene.add.graphics().setDepth(8).setVisible(false);
  }

  update(player: Player, attack: AttackState, progress: number, profile?: AttackProfile, weapon: WeaponKind = 'pipe'): void {
    const shownWeapon = attack.phase === 'idle' ? weapon : weapon;
    const facing = attack.phase === 'idle' ? player.facing : attack.facing;
    const trajectory = attack.step === 2
      ? { windup: 1.55 - progress * 0.4, active: 1.15 - progress * 1.75, recovery: -0.6 + progress * 0.75 }
      : attack.step === 3
        ? { windup: -1.5 + progress * 0.35, active: -1.15 + progress * 2.85, recovery: 1.7 - progress * 0.65 }
        : { windup: -0.9 + progress * 0.65, active: 0.65 + progress * 1.1, recovery: 1.4 - progress * 0.62 };
    const rightAngle = attack.phase === 'windup' ? trajectory.windup
      : attack.phase === 'active' ? trajectory.active
        : attack.phase === 'recovery' ? trajectory.recovery : 0.72;
    // A rectangle's unrotated long axis points upward. Positive rotation therefore sweeps its tip right.
    const angle = facing === 1 ? rightAngle : -rightAngle;
    const idle = attack.phase === 'idle';
    const handX = player.x + facing * (idle ? 5 : attack.step === 3 ? 12 : attack.step === 2 ? 13 : 15);
    const handY = player.y + (idle ? 12 : attack.phase === 'windup' ? (attack.step === 3 ? -8 : 0) : attack.phase === 'active' ? (attack.step === 2 ? 8 : 2) : 5);
    const reach = profile?.reach ?? (shownWeapon === 'heavy' ? 96 : 64);
    const tipAngle = angle - Math.PI / 2;
    const tipX = handX + Math.cos(tipAngle) * reach;
    const tipY = handY + Math.sin(tipAngle) * reach;
    this.blade.setVisible(shownWeapon === 'pipe').setPosition(handX, handY).setRotation(angle).setDisplaySize(8, reach / 0.88);
    this.heavyShaft.setVisible(shownWeapon === 'heavy').setPosition(handX, handY).setRotation(angle).setDisplaySize(7, reach);
    this.heavyHead.setVisible(shownWeapon === 'heavy').setPosition(tipX, tipY).setRotation(angle).setDisplaySize(25, 10);
    this.trail.clear().setVisible(attack.phase === 'active');
    this.strikeActive = attack.phase === 'active';
    if (attack.phase === 'active') {
      this.trail.lineStyle(2, 0xdffcff, 0.8);
      this.trail.beginPath();
      this.trail.arc(handX, handY, reach, tipAngle - facing * 0.7, tipAngle, facing < 0);
      this.trail.strokePath();
      this.currentSegment = new Phaser.Geom.Line(handX, handY, tipX, tipY);
      this.currentThickness = shownWeapon === 'heavy' ? 25 : 8;
      const current = this.currentSegment;
      this.sweptSegments = current ? [current] : [];
      if (current && this.previousStrike) {
        this.sweptSegments.push(new Phaser.Geom.Line(this.previousStrike.x2, this.previousStrike.y2, current.x2, current.y2));
        this.sweptSegments.push(new Phaser.Geom.Line(this.previousStrike.x1, this.previousStrike.y1, current.x1, current.y1));
      }
      this.previousStrike = current;
    } else {
      this.previousStrike = null;
      this.sweptSegments = [];
      this.currentSegment = null;
    }
  }

  /** The current rendered blade segment; collision consumes this exact transform. */
  get strikeSegment(): Phaser.Geom.Line | null {
    return this.currentSegment;
  }

  get strikeSweep(): readonly Phaser.Geom.Line[] { return this.sweptSegments; }
  get strikeThickness(): number { return this.currentThickness; }
  get kickBounds(): Phaser.Geom.Rectangle | null { return this.kickStroke.visible ? this.kickStroke.getBounds() : null; }

  updateKick(player: Player, kick: KickAction): void {
    this.kickPose.clear().setVisible(kick.active);
    if (!kick.active) { this.kickStroke.setVisible(false); return; }
    const width = 62 * (0.72 + kick.progress * 0.28);
    this.kickStroke.setVisible(true).setDisplaySize(width, 22 - kick.progress * 6)
      .setPosition(player.x + kick.facing * (27 + width / 2), player.y + 13)
      .setAlpha(0);
    const facing = kick.facing;
    const hipX = player.x + facing * 3;
    const hipY = player.y + 13;
    const kneeX = player.x + facing * 15;
    const kneeY = player.y + 20;
    const bootX = player.x + facing * 32;
    const bootY = player.y + 14;
    this.kickPose.lineStyle(7, 0x17272f, 1).beginPath().moveTo(hipX, hipY).lineTo(kneeX, kneeY).lineTo(bootX, bootY).strokePath();
    this.kickPose.lineStyle(3, 0x9eb9ae, 1).beginPath().moveTo(hipX, hipY).lineTo(kneeX, kneeY).lineTo(bootX, bootY).strokePath();
    this.kickPose.fillStyle(0x1c3037, 1).fillRect(facing > 0 ? bootX - 1 : bootX - 11, bootY - 3, 12, 7);
    this.kickPose.lineStyle(2, 0xcff8eb, 0.78 - kick.progress * 0.28);
    for (let index = 0; index < 3; index++) {
      const start = 38 + index * 12 + kick.progress * 5;
      const length = 9 - index;
      const y = player.y + 7 + index * 6;
      this.kickPose.beginPath().moveTo(player.x + facing * start, y).lineTo(player.x + facing * (start + length), y).strokePath();
    }
    const tipX = player.x + facing * (79 + kick.progress * 5);
    const tipY = player.y + 13;
    this.kickPose.beginPath().moveTo(tipX - facing * 7, tipY - 6).lineTo(tipX, tipY).lineTo(tipX - facing * 7, tipY + 6).strokePath();
  }

  updateHealing(player: Player, active: boolean, progress: number): void {
    this.channel.clear().setVisible(active);
    if (!active) return;
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
    const sparks = this.scene.add.particles(x, y, 'particle', {
      speed: { min: finisher ? 75 : 45, max: finisher ? 175 : 120 },
      speedX: facing === 1 ? { min: finisher ? 55 : 35, max: finisher ? 145 : 105 } : { min: finisher ? -145 : -105, max: finisher ? -55 : -35 },
      lifespan: finisher ? 430 : 300,
      quantity: finisher ? 16 : 8,
      tint: finisher ? [0xfff0b8, 0xff9c7d] : [0xffd4aa, 0x9ac8c1],
      emitting: false,
    });
    sparks.explode();
    this.scene.time.delayedCall(470, () => sparks.destroy());
    if (damage > 0) {
      const label = this.scene.add.text(x, y - 27, `-${damage}`, { fontFamily: 'monospace', fontSize: finisher ? '15px' : '12px', color: finisher ? '#fff1bc' : '#ffe2b8', stroke: '#14242d', strokeThickness: 3 }).setOrigin(0.5).setDepth(12);
      this.scene.tweens.add({ targets: label, y: y - 48, alpha: 0, scale: finisher ? 1.24 : 1, duration: 440, onComplete: () => label.destroy() });
    }
    if (finisher && shakeEnabled) this.scene.cameras.main.shake(95, 0.008);
  }

  destroy(): void {
    this.blade.destroy();
    this.heavyShaft.destroy();
    this.heavyHead.destroy();
    this.kickStroke.destroy();
    this.kickPose.destroy();
    this.channel.destroy();
    this.trail.destroy();
  }

  private currentStrikeSegment(): Phaser.Geom.Line | null { return this.strikeActive ? this.currentSegment : null; }
}

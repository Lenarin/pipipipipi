import Phaser from 'phaser';
import { attackVelocity } from './Combat';
import { pipeFrame, HERO_LAYOUT } from '../game/spriteFrames';

export interface PlayerInput { left: boolean; right: boolean; jumpPressed: boolean; jumpHeld?: boolean; dashPressed: boolean; }
export interface PlayerStep { dashed: boolean; dashEnded: boolean; jumped: boolean; }
export interface PlayerCombatState { phase: 'idle' | 'windup' | 'active' | 'recovery'; facing: 1 | -1; lunge: number; progress: number; step?: number; }

/** Sprite and movement affordances; damage, cooldowns and run status live in RunRules. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: 1 | -1 = 1;
  private coyoteMs = 0;
  private jumpBufferMs = 0;
  private jumps = 2;
  private dashMs = 0;
  private dashFacing: 1 | -1 = 1;
  private attackPhase: PlayerCombatState['phase'] = 'idle';
  private hurtMs = 0;
  private landingMs = 0;
  private wasGrounded = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'hero-full', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(.6875).setOrigin(.5, HERO_LAYOUT.originY / HERO_LAYOUT.height);
    // Expanded frame; exactly the old Arcade body's size and position in world coordinates.
    (this.body as Phaser.Physics.Arcade.Body).setSize(30, 60, false).setOffset(81, 68);
    this.setCollideWorldBounds(true);
    this.setDepth(5);
  }

  resetAt(x: number, y: number): void {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.facing = 1;
    this.coyoteMs = 0;
    this.jumpBufferMs = 0;
    this.jumps = 2;
    this.dashMs = 0;
    this.dashFacing = 1;
    this.attackPhase = 'idle';
    this.setAngle(0);
    this.clearTint();
  }

  updateMovement(input: PlayerInput, deltaMs: number, allowDash: boolean, combat: PlayerCombatState): PlayerStep {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const delta = Math.min(Math.max(0, deltaMs), 50);
    const grounded = body.blocked.down || body.touching.down;
    if (grounded) { this.coyoteMs = 120; this.jumps = 2; }
    else this.coyoteMs = Math.max(0, this.coyoteMs - delta);
    if (input.jumpPressed) this.jumpBufferMs = 120;
    else this.jumpBufferMs = Math.max(0, this.jumpBufferMs - delta);

    let jumped = false;
    if (this.jumpBufferMs > 0 && (grounded || this.coyoteMs > 0 || this.jumps > 0)) {
      body.setVelocityY(-410);
      if (!grounded && this.coyoteMs <= 0) this.jumps--;
      else this.jumps = 1;
      this.jumpBufferMs = 0;
      this.coyoteMs = 0;
      jumped = true;
    }

    if (!input.jumpHeld && body.velocity.y < -330) body.setVelocityY(-330);

    const direction = Number(input.right) - Number(input.left);
    this.attackPhase = combat.phase;
    let dashed = false;
    let dashEnded = false;
    if (this.dashMs > 0) {
      this.dashMs = Math.max(0, this.dashMs - delta);
      this.facing = this.dashFacing;
      body.setVelocityX(this.dashFacing * 510);
      if (this.dashMs === 0) {
        dashEnded = true;
        this.setAlpha(1).clearTint();
      }
    } else if (input.dashPressed && allowDash) {
      this.dashFacing = direction === 0 ? this.facing : direction > 0 ? 1 : -1;
      this.facing = this.dashFacing;
      this.dashMs = 150;
      body.setVelocityX(this.dashFacing * 510);
      this.setAlpha(0.72).setTint(0xbce8dc);
      dashed = true;
    } else {
      if (combat.phase !== 'idle') this.facing = combat.facing;
      else if (direction !== 0) this.facing = direction > 0 ? 1 : -1;
      body.setVelocityX(combat.phase === 'idle' ? direction * 185
        : attackVelocity(combat.lunge * 5, combat.phase, combat.progress, combat.facing, direction));
    }

    this.setFlipX(this.facing < 0);
    this.setAngle(0);

    this.hurtMs = Math.max(0, this.hurtMs - delta);
    if (grounded && !this.wasGrounded) this.landingMs = 70;
    else this.landingMs = Math.max(0, this.landingMs - delta);
    this.wasGrounded = grounded;
    this.updateAnimation(grounded, body.velocity.x, body.velocity.y, combat);
    return { dashed, dashEnded, jumped };
  }

  get isDashing(): boolean { return this.dashMs > 0; }
  get grounded(): boolean { const body = this.body as Phaser.Physics.Arcade.Body; return body.blocked.down || body.touching.down; }
  beginAttack(): void { this.attackPhase = 'windup'; this.showPipePose(0); }
  get dashProgress(): number { return 1 - this.dashMs / 150; }
  get isHurt(): boolean { return this.hurtMs > 0; }
  showPipePose(frame: number): void { this.anims.stop(); this.setFrame(40 + frame); }
  showCombatPose(frame: number): void { this.anims.stop(); this.setFrame(8 + frame); }
  showActionPose(frame: number): void { this.anims.stop(); this.setFrame(24 + frame); }
  showHurt(): void { this.hurtMs = 170; this.showActionPose(8); }

  /** Clears transient player actions without changing airborne velocity or remaining jumps. */
  cancelActions(): void {
    this.jumpBufferMs = 0;
    this.dashMs = 0;
    this.dashFacing = this.facing;
    this.attackPhase = 'idle';
    this.hurtMs = 0; this.landingMs = 0;
    this.play('hero-idle', true);
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
    this.setAlpha(1).setAngle(0).clearTint();
  }

  private updateAnimation(grounded: boolean, velocityX: number, velocityY: number, combat: PlayerCombatState): void {
    if (this.isDashing) this.showActionPose(Math.min(3, Math.floor(this.dashProgress * 4)));
    else if (this.hurtMs > 0) this.showActionPose(this.hurtMs > 85 ? 8 : 9);
    else if (this.attackPhase !== 'idle') this.showPipePose(pipeFrame(combat.step ?? 1, combat.phase, combat.progress));
    else if (!grounded) this.showActionPose(velocityY < -270 ? 12 : velocityY < 20 ? 13 : 14);
    else if (this.landingMs > 0 && Math.abs(velocityX) < 20) this.showActionPose(15);
    else if (Math.abs(velocityX) > 20) this.play('hero-run', true);
    else this.play('hero-idle', true);
  }
}

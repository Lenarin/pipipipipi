import Phaser from 'phaser';
import type { LevelData } from '../levels';
import type { Player } from '../gameplay/Player';
import { groundSurfaceBelow } from './groundSurface';

/** Ground contact feedback only. Arcade still decides when the actor is grounded. */
export class GroundEffects {
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly droplets: Phaser.GameObjects.Particles.ParticleEmitter;
  private wasGrounded = false;
  private previousX: number | undefined;
  private stepDistance = 0;
  private foot = 1;

  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.ellipse(0, 0, 25, 4, 0x101f26, .5).setDepth(3.5).setName('hero-shadow').setVisible(false);
    this.droplets = scene.add.particles(0, 0, 'particle', {
      speedX: {min:-30,max:30}, speedY: {min:-45,max:-20}, gravityY:260,
      lifespan:220, scale:{start:.38,end:.12}, alpha:{start:.5,end:0},
      tint:[0x7ca6a5,0xaaa990], emitting:false,
    }).setDepth(3.7).setName('ground-droplets');
  }

  update(player: Player, level: LevelData, walking: boolean): void {
    const body = player.body as Phaser.Physics.Arcade.Body;
    const floor = groundSurfaceBelow(player.x, body.bottom, level);
    const height = Math.max(0, floor - body.bottom), closeness = Math.max(.2, 1 - height / 150);
    this.shadow.setVisible(true).setPosition(player.x, floor).setScale(.45 + closeness * .55, 1).setAlpha(.14 + closeness * .36);
    const grounded = player.grounded;
    if (grounded && !this.wasGrounded) {
      this.droplets.explode(6, player.x, body.bottom - 1);
      this.stepDistance = 0;
    }
    if (grounded && walking && !player.isDashing && Math.abs(body.velocity.x) > 30) {
      this.stepDistance += this.previousX === undefined ? 0 : Math.abs(player.x - this.previousX);
      if (this.stepDistance >= 44) {
        this.stepDistance %= 44; this.foot *= -1;
        this.droplets.explode(3, player.x + this.foot * 5, body.bottom - 1);
      }
    } else this.stepDistance = 0;
    this.wasGrounded = grounded;
    this.previousX = player.x;
  }

  pause(): void { this.droplets.setActive(false); }
  resume(): void { this.droplets.setActive(true); }
  destroy(): void { this.shadow.destroy(); this.droplets.destroy(); }
}

import Phaser from 'phaser';
import type { Enemy } from '../gameplay/Enemy';
import type { LevelData } from '../levels';
import { groundSurfaceBelow } from './groundSurface';

/** Short, non-blocking full-body collapses. Defeated bodies never remain in Arcade. */
export class DefeatEffects {
  private readonly remains = new Set<Phaser.GameObjects.Sprite>();

  constructor(private readonly scene: Phaser.Scene, private readonly level: LevelData) {}

  show(enemy: Enemy, paused: boolean): void {
    const sprite = this.scene.add.sprite(enemy.x, enemy.y, enemy.texture.key)
      .setOrigin(enemy.originX, enemy.originY).setScale(enemy.scaleX, enemy.scaleY)
      .setFlipX(enemy.flipX).setDepth(3.9).setName('enemy-remains');
    this.remains.add(sprite);
    sprite.once(Phaser.GameObjects.Events.DESTROY, () => this.remains.delete(sprite));
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.scene.tweens.add({ targets: sprite, alpha: 0, delay: 100, duration: 280, onComplete: () => sprite.destroy() });
    });
    const feet = enemy.y + (112 - enemy.originY * 128) * enemy.scaleY;
    const drop = Math.max(0, groundSurfaceBelow(enemy.x, feet, this.level) - feet);
    if (drop > 1) {
      // Visual settling only: a native tween, no residual collider or second physics step.
      this.scene.tweens.add({ targets: sprite, y: sprite.y + drop, duration: Phaser.Math.Clamp(drop * 3, 180, 450), ease: 'Quad.easeIn' });
    }
    sprite.play(`${enemy.kind}-death`);
    if (paused) sprite.anims.pause();
  }

  pause(): void { this.remains.forEach(sprite => sprite.anims.pause()); }
  resume(): void { this.remains.forEach(sprite => sprite.anims.resume()); }
  destroy(): void { this.remains.forEach(sprite => sprite.destroy()); this.remains.clear(); }
}

import Phaser from 'phaser';
import type { Enemy } from '../gameplay/Enemy';

const AMBER = 0xd6a35f;
const DANGER = 0xb95847;
const RECOVERY = 0x7faeaa;
const INK = 0x172a31;

/** Supplemental danger and recovery cues. The enemy's sprite owns its entire body/weapon pose. */
export class EnemyAttackPresentation {
  private readonly footprint: Phaser.GameObjects.Graphics;
  private readonly cue: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.footprint = scene.add.graphics().setDepth(2);
    this.cue = scene.add.graphics().setDepth(15);
  }

  update(enemy: Enemy): void {
    this.footprint.clear();
    enemy.renderPose();
    this.cue.clear();
    const profile = enemy.attackProfile;
    const shape = enemy.attackShape;
    const phase = enemy.state;
    if (!profile || !shape || phase === 'idle' || phase === 'stagger') return;

    const facing = enemy.attackFacing;
    const progress = enemy.attackProgress;
    if (phase === 'windup') {
      this.footprint.fillStyle(AMBER, 0.055).fillRect(shape.x, shape.y, shape.width, shape.height);
      this.drawCorners(shape.x, shape.y, shape.width, shape.height, AMBER, 0.88, 1.5);
      const closing = shape.width * (1 - progress);
      const edgeX = facing === 1 ? shape.x + closing : shape.x + shape.width - closing;
      this.footprint.lineStyle(2, 0xf2c677, 0.95).lineBetween(edgeX, shape.y, edgeX, shape.y + shape.height);
      this.drawDirectionalNotches(shape.x, shape.y, shape.width, shape.height, facing, AMBER, 0.85);
    } else if (phase === 'active') {
      this.footprint.fillStyle(DANGER, 0.16).fillRect(shape.x, shape.y, shape.width, shape.height);
      this.drawCorners(shape.x, shape.y, shape.width, shape.height, 0xe07a62, 0.96, 2);
      const strikeX = facing === 1 ? shape.x + shape.width : shape.x;
      this.footprint.lineStyle(3, 0xf0a083, 0.95).lineBetween(strikeX, shape.y - 2, strikeX, shape.y + shape.height + 2);
      this.drawDirectionalNotches(shape.x, shape.y, shape.width, shape.height, facing, DANGER, 0.9);
      if (profile.motion === 'slam') {
        // The anchor launches a ground shockwave; this is the actual advertised area attack.
        const floor = enemy.y + 31;
        this.footprint.fillStyle(0xe8a56f, .7);
        for (let offset = 0; offset < shape.width; offset += 9) {
          const x = shape.x + offset;
          const height = 5 + Math.sin(offset * .7 + progress * 8) * 3;
          this.footprint.fillRect(x, floor - height, 4, height);
        }
        this.footprint.lineStyle(2, 0xf6c38b, .9).lineBetween(shape.x, floor, shape.x + shape.width, floor);
      }
    } else {
      this.footprint.lineStyle(1, RECOVERY, 0.52);
      this.footprint.lineBetween(shape.x, shape.y + shape.height, shape.x + shape.width * 0.3, shape.y + shape.height);
      this.footprint.lineBetween(shape.x + shape.width * 0.7, shape.y + shape.height, shape.x + shape.width, shape.y + shape.height);
    }

    this.drawTimeCue(enemy, phase, progress);
  }

  destroy(): void {
    this.footprint.destroy();
    this.cue.destroy();
  }

  private drawTimeCue(enemy: Enemy, phase: 'windup' | 'active' | 'recovery', progress: number): void {
    const color = phase === 'windup' ? AMBER : phase === 'active' ? DANGER : RECOVERY;
    const width = enemy.kind === 'boss' ? 48 : 30;
    const x = enemy.x - width / 2;
    const y = enemy.y - (enemy.kind === 'boss' ? 62 : 48);
    this.cue.fillStyle(INK, 0.8).fillRect(x - 1, y - 1, width + 2, 5);
    this.cue.fillStyle(color, phase === 'recovery' ? 0.55 : 0.96).fillRect(x, y, width * (phase === 'windup' ? progress : 1 - progress), 3);
    if (phase === 'windup') {
      this.cue.lineStyle(1, 0xf3ddb0, 0.65);
      this.cue.lineBetween(x + width / 3, y, x + width / 3, y + 3).lineBetween(x + width * 2 / 3, y, x + width * 2 / 3, y + 3);
    }
  }

  private drawDirectionalNotches(x: number, y: number, width: number, height: number, facing: 1 | -1, color: number, alpha: number): void {
    const tipX = facing === 1 ? x + width : x;
    const insetX = tipX - facing * 8;
    this.footprint.lineStyle(1, color, alpha);
    this.footprint.lineBetween(insetX, y + 4, tipX, y + height / 2);
    this.footprint.lineBetween(tipX, y + height / 2, insetX, y + height - 4);
  }

  private drawCorners(x: number, y: number, width: number, height: number, color: number, alpha: number, thickness: number): void {
    const length = Math.min(11, width * 0.2, height * 0.35);
    this.footprint.lineStyle(thickness, color, alpha);
    this.footprint.lineBetween(x, y + length, x, y).lineBetween(x, y, x + length, y);
    this.footprint.lineBetween(x + width - length, y, x + width, y).lineBetween(x + width, y, x + width, y + length);
    this.footprint.lineBetween(x, y + height - length, x, y + height).lineBetween(x, y + height, x + length, y + height);
    this.footprint.lineBetween(x + width - length, y + height, x + width, y + height).lineBetween(x + width, y + height, x + width, y + height - length);
  }
}

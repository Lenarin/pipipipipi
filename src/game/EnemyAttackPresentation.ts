import Phaser from 'phaser';
import type { Enemy } from '../gameplay/Enemy';
import type { EnemyAttackShape } from '../gameplay/EnemyAttackCycle';

const AMBER = 0xd6a35f;
const DANGER = 0xb95847;
const RECOVERY = 0x7faeaa;
const INK = 0x172a31;
const STEEL = 0xc3d2c8;

/** Code-native enemy limbs, weapons, and phase geometry. Kept separate from the enemy sprite texture. */
export class EnemyAttackPresentation {
  private readonly footprint: Phaser.GameObjects.Graphics;
  private readonly limb: Phaser.GameObjects.Graphics;
  private readonly cue: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.footprint = scene.add.graphics().setDepth(2);
    this.limb = scene.add.graphics().setDepth(5);
    this.cue = scene.add.graphics().setDepth(6);
  }

  update(enemy: Enemy): void {
    this.footprint.clear();
    this.limb.clear();
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
    } else {
      this.footprint.lineStyle(1, RECOVERY, 0.52);
      this.footprint.lineBetween(shape.x, shape.y + shape.height, shape.x + shape.width * 0.3, shape.y + shape.height);
      this.footprint.lineBetween(shape.x + shape.width * 0.7, shape.y + shape.height, shape.x + shape.width, shape.y + shape.height);
    }

    this.drawPose(enemy, phase, progress, facing, shape);
    this.drawTimeCue(enemy, phase, progress);
  }

  destroy(): void {
    this.footprint.destroy();
    this.limb.destroy();
    this.cue.destroy();
  }

  private drawPose(enemy: Enemy, phase: 'windup' | 'active' | 'recovery', progress: number, facing: 1 | -1, shape: EnemyAttackShape): void {
    if (enemy.kind === 'hound') {
      const muzzleX = enemy.x + facing * (phase === 'windup' ? 9 : phase === 'active' ? 20 : 13);
      const muzzleY = enemy.y + (phase === 'windup' ? 5 : 1);
      this.limb.fillStyle(phase === 'active' ? DANGER : STEEL, 0.9);
      this.limb.fillTriangle(muzzleX, muzzleY - 4, muzzleX + facing * 14, muzzleY, muzzleX, muzzleY + 4);
      this.limb.lineStyle(2, INK, 0.9);
      this.limb.lineBetween(enemy.x - facing * 4, enemy.y + 8, enemy.x + facing * 11, enemy.y + (phase === 'windup' ? 12 : 8));
      if (phase === 'active') {
        const strikeTipX = facing === 1 ? shape.x + shape.width : shape.x;
        this.limb.lineStyle(3, INK, 0.95).lineBetween(muzzleX, muzzleY - 3, strikeTipX, shape.centerY - 4);
        this.limb.lineStyle(1.5, 0xe8b286, 0.95).lineBetween(muzzleX, muzzleY - 3, strikeTipX, shape.centerY - 4);
        this.limb.lineBetween(muzzleX, muzzleY + 3, strikeTipX, shape.centerY + 5);
        this.limb.lineStyle(1, 0xe8b286, 0.75);
        for (let row = -1; row <= 1; row++) this.limb.lineBetween(enemy.x - facing * 24, enemy.y + row * 5, enemy.x - facing * 8, enemy.y + row * 5);
      }
      return;
    }

    const boss = enemy.kind === 'boss';
    const cast = enemy.attackProfile?.motion === 'cast';
    const shoulderX = enemy.x + facing * (boss ? 11 : 5);
    const shoulderY = enemy.y - (boss ? 13 : 7);
    const handX = phase === 'windup' ? enemy.x - facing * (boss ? 13 : 8)
      : phase === 'active' ? enemy.x + facing * (boss ? 28 : 20 + progress * 9)
        : enemy.x + facing * (boss ? 19 : 13);
    const handY = phase === 'windup' ? enemy.y - (boss ? 31 : 19)
      : phase === 'active' ? enemy.y + (cast ? -8 : boss ? 7 : 1)
        : enemy.y + (boss ? 5 : 0);
    const poseColor = phase === 'windup' ? AMBER : phase === 'active' ? 0xe18368 : RECOVERY;

    this.limb.lineStyle(boss ? 6 : 4, INK, 0.96).lineBetween(shoulderX, shoulderY, handX, handY);
    this.limb.lineStyle(boss ? 3 : 2, poseColor, 0.96).lineBetween(shoulderX, shoulderY, handX, handY);
    const baseWeaponLength = boss ? 36 : cast ? 25 : 29;
    const weaponLength = phase === 'recovery' ? baseWeaponLength * 0.62 : baseWeaponLength;
    const angle = cast ? (phase === 'windup' ? -0.75 : phase === 'active' ? 0 : 0.55)
      : phase === 'windup' ? -1.55 : phase === 'active' ? -0.18 + progress * 0.72 : 0.15;
    const tipX = handX + facing * Math.cos(angle) * weaponLength;
    const tipY = handY + Math.sin(angle) * weaponLength;
    this.limb.lineStyle(boss ? 6 : 4, INK, 1).lineBetween(handX, handY, tipX, tipY);
    this.limb.lineStyle(boss ? 3 : 2, STEEL, 1).lineBetween(handX, handY, tipX, tipY);
    if (cast) {
      this.limb.fillStyle(poseColor, 1).fillRect(tipX - 3, tipY - 3, 6, 6);
    } else {
      const head = (boss ? 10 : 7) * (phase === 'recovery' ? 0.72 : 1);
      const handleX = facing * Math.cos(angle);
      const handleY = Math.sin(angle);
      const perpendicularX = -handleY;
      const perpendicularY = handleX;
      const toolHead = (span: number, depth: number) => [
        new Phaser.Math.Vector2(tipX + perpendicularX * span - handleX * depth, tipY + perpendicularY * span - handleY * depth),
        new Phaser.Math.Vector2(tipX - perpendicularX * span - handleX * depth, tipY - perpendicularY * span - handleY * depth),
        new Phaser.Math.Vector2(tipX - perpendicularX * span + handleX * depth, tipY - perpendicularY * span + handleY * depth),
        new Phaser.Math.Vector2(tipX + perpendicularX * span + handleX * depth, tipY + perpendicularY * span + handleY * depth),
      ];
      this.limb.fillStyle(INK, 1).fillPoints(toolHead(head + 2, 4), true);
      this.limb.fillStyle(phase === 'active' ? 0xb86a54 : 0x9aa9a3, 1).fillPoints(toolHead(head, 2.5), true);
      this.limb.lineStyle(1, phase === 'windup' ? 0xf0c77f : 0xd7e0d4, 0.85)
        .lineBetween(tipX + perpendicularX * (head - 2), tipY + perpendicularY * (head - 2), tipX - perpendicularX * (head - 2), tipY - perpendicularY * (head - 2));
    }

    if (boss) {
      const armorColor = enemy.enraged ? 0xdc6b55 : poseColor;
      this.limb.lineStyle(3, armorColor, 0.9);
      this.limb.strokeRoundedRect(enemy.x - 25, enemy.y - 30, 50, 23, 7);
      this.limb.fillStyle(armorColor, phase === 'active' ? 0.28 : 0.15).fillTriangle(enemy.x - 27, enemy.y - 24, enemy.x - 38, enemy.y - 13, enemy.x - 22, enemy.y - 11);
      this.limb.fillTriangle(enemy.x + 27, enemy.y - 24, enemy.x + 38, enemy.y - 13, enemy.x + 22, enemy.y - 11);
      if (enemy.attackProfile?.motion === 'slam' && phase === 'active') {
        const start = facing === 1 ? shape.x : shape.x + shape.width;
        const step = facing * 18;
        this.limb.lineStyle(2, 0xe18368, 0.95).lineBetween(shape.x, shape.y + shape.height, shape.x + shape.width, shape.y + shape.height);
        for (let distance = 12; distance < shape.width; distance += 18) {
          const waveX = start + facing * distance;
          const waveHeight = 7 + Math.min(10, distance / 12);
          this.limb.fillStyle(DANGER, 0.7).fillTriangle(waveX, shape.y + shape.height, waveX + step * 0.45, shape.y + shape.height - waveHeight, waveX + step, shape.y + shape.height);
        }
      }
    }
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

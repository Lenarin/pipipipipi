import Phaser from 'phaser';
import type { EnemyKind } from '../levels';
import {
  attackShapeAt,
  EnemyAttackCycle,
  type EnemyAttack,
  type EnemyAttackEvent,
  type EnemyAttackProfile,
  type EnemyAttackShape,
  type EnemyPhase,
} from './EnemyAttackCycle';

export type { EnemyAttack, EnemyAttackProfile, EnemyPhase } from './EnemyAttackCycle';
export type EnemyEvent = EnemyAttackEvent & { enemy: Enemy };

const stats: Record<EnemyKind, { hp: number; speed: number; awareness: number; texture: string }> = {
  walker: { hp: 42, speed: 66, awareness: 265, texture: 'enemy-walker' },
  spitter: { hp: 34, speed: 48, awareness: 310, texture: 'enemy-spitter' },
  hound: { hp: 48, speed: 94, awareness: 280, texture: 'enemy-hound' },
  boss: { hp: 360, speed: 82, awareness: 460, texture: 'boss' },
};

const profiles: Record<EnemyAttack, EnemyAttackProfile> = {
  melee: { attack: 'melee', windupMs: 600, activeMs: 150, recoveryMs: 500, damage: 14, reach: 62, thickness: 38, motion: 'thrust', speed: 105 },
  projectile: { attack: 'projectile', windupMs: 620, activeMs: 110, recoveryMs: 520, damage: 12, reach: 255, thickness: 20, motion: 'cast' },
  'boss-slam': { attack: 'boss-slam', windupMs: 650, activeMs: 230, recoveryMs: 650, damage: 24, reach: 132, thickness: 62, motion: 'slam', speed: 65 },
  'boss-volley': { attack: 'boss-volley', windupMs: 720, activeMs: 140, recoveryMs: 620, damage: 18, reach: 300, thickness: 44, motion: 'cast' },
};

const houndProfile: EnemyAttackProfile = {
  attack: 'melee', windupMs: 560, activeMs: 360, recoveryMs: 540,
  damage: 18, reach: 72, thickness: 34, motion: 'charge', speed: 285,
};

const names: Record<EnemyKind, string> = {
  walker: 'Должник', spitter: 'Домовой чат', hound: 'Просроченный пёс', boss: 'Старший по порту',
};

/** Enemy decisions and attack state. Arcade Physics still owns body movement and contacts. */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly id: string;
  readonly kind: EnemyKind;
  readonly maxHp: number;
  readonly attackCycle = new EnemyAttackCycle();
  hp: number;
  state: EnemyPhase = 'idle';
  engaged = false;
  enraged = false;
  private cooldownMs = 500;
  private hitLockMs = 0;
  private staggerMs = 0;
  private healthBarMs = 0;
  private motionMs = 0;
  private nextBossAttack: EnemyAttack = 'boss-slam';

  constructor(scene: Phaser.Scene, id: string, kind: EnemyKind, x: number, y: number) {
    super(scene, x, y, stats[kind].texture);
    this.id = id;
    this.kind = kind;
    this.maxHp = stats[kind].hp;
    this.hp = this.maxHp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(4);
    if (kind !== 'boss') this.setScale(1.15);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (kind === 'hound') body.setSize(26, 18, true);
    else if (kind === 'boss') body.setSize(44, 62, true);
    else body.setSize(18, 30, true);
  }

  updateAi(player: Phaser.Physics.Arcade.Sprite, deltaMs: number, bossAllowed: boolean, canStartAttack = true): EnemyEvent[] {
    if (!this.active) return [];
    const delta = Math.max(0, deltaMs);
    const motionDelta = Math.min(delta, 50);
    this.motionMs += motionDelta;
    this.cooldownMs = Math.max(0, this.cooldownMs - delta);
    this.hitLockMs = Math.max(0, this.hitLockMs - delta);
    this.healthBarMs = Math.max(0, this.healthBarMs - delta);
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.staggerMs > 0) {
      this.staggerMs = Math.max(0, this.staggerMs - delta);
      this.setAngle(Math.sin(this.motionMs / 34) * 5);
      if (this.staggerMs <= 0) { this.state = 'idle'; this.setAngle(0); }
      return [];
    }
    if (this.kind === 'boss' && !bossAllowed) { body.setVelocityX(0); return []; }

    const dx = player.x - this.x;
    const distance = Math.abs(dx);
    const direction: 1 | -1 = dx < 0 ? -1 : 1;
    if (!this.engaged && canStartAttack && distance <= stats[this.kind].awareness) { this.engaged = true; this.healthBarMs = 1100; }
    if (!this.engaged) { body.setVelocityX(0); return []; }
    if (this.kind === 'boss' && this.hp <= this.maxHp / 2) this.enraged = true;

    if (this.attackCycle.state.phase !== 'idle') {
      const events = this.attackCycle.advance(delta);
      this.state = this.attackCycle.state.phase;
      this.applyAttackMotion(body);
      if (events.some((event) => event.type === 'idle')) this.cooldownMs = this.enraged ? 430 : 720;
      return events.map((event) => ({ ...event, enemy: this }));
    }

    this.setAngle(0);
    this.setScale(this.kind === 'boss' ? 1 : 1.15);
    if (Math.abs(player.y - this.y) > 68) { body.setVelocityX(0); return []; }

    const inAttackRange = this.kind === 'spitter' ? distance < 260 : this.kind === 'boss' ? distance < 125 : this.kind === 'hound' ? distance < 76 : distance < 58;
    if (inAttackRange && this.cooldownMs <= 0 && canStartAttack) {
      const attack = this.chooseAttack();
      const baseProfile = this.kind === 'hound' ? houndProfile : profiles[attack];
      const profile = this.enraged ? { ...baseProfile, windupMs: Math.max(520, baseProfile.windupMs - 100) } : baseProfile;
      this.attackCycle.start(profile, direction);
      this.state = 'windup';
      this.setFlipX(direction < 0);
      body.setVelocityX(0);
      this.applyAttackMotion(body);
      return [];
    }

    const preferred = this.kind === 'spitter' ? 190 : this.kind === 'hound' ? 58 : 42;
    body.setVelocityX(distance > preferred ? direction * stats[this.kind].speed * (this.enraged ? 1.2 : 1) : 0);
    this.setFlipX(direction < 0);
    this.setAngle(Math.sin(this.motionMs / 80) * (Math.abs(body.velocity.x) > 1 ? 2 : 0.6));
    return [];
  }

  activate(): void { this.engaged = true; this.healthBarMs = 1100; }
  consumeChargeHit(): boolean { return this.kind === 'hound' && this.attackCycle.consumeHit(); }
  consumeAttackHit(): boolean { return this.attackCycle.consumeHit(); }

  /** Clears terminal-scene action state. Pause deliberately does not call this. */
  cancelActions(): void {
    this.attackCycle.cancel();
    this.state = 'idle';
    this.staggerMs = 0;
    this.cooldownMs = Math.max(this.cooldownMs, 720);
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
    this.setAngle(0).setScale(this.kind === 'boss' ? 1 : 1.15);
  }

  receiveHit(damage: number, direction: 1 | -1 = 1): boolean {
    if (this.hitLockMs > 0 || damage <= 0) return false;
    this.hitLockMs = 90;
    this.hp = Math.max(0, this.hp - damage);
    this.healthBarMs = 1100;
    this.setTint(0xffd2d2);
    this.scene.time.delayedCall(70, () => this.active && this.clearTint());
    if (!this.defeated) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (this.kind === 'boss' && this.attackCycle.state.phase !== 'idle') body.setVelocityX(direction * 55);
      else {
        this.attackCycle.cancel();
        this.staggerMs = this.kind === 'boss' ? 80 : 145;
        this.state = 'stagger';
        body.setVelocityX(direction * (this.kind === 'boss' ? 105 : 170));
      }
    }
    return true;
  }

  /** The kick breaks ordinary commitments and pushes them without damaging bosses. */
  receiveKick(direction: 1 | -1): boolean {
    if (!this.active || this.kind === 'boss') return false;
    this.attackCycle.cancel();
    this.staggerMs = 230;
    this.state = 'stagger';
    this.healthBarMs = 700;
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(direction * 235);
    this.setTint(0xbce8dc).setAngle(direction * 9);
    this.scene.time.delayedCall(120, () => this.active && this.clearTint());
    return true;
  }

  get defeated(): boolean { return this.hp <= 0; }
  get isTelegraphing(): boolean { return this.state === 'windup'; }
  get isAttacking(): boolean { return this.state === 'windup' || this.state === 'active'; }
  get showsHealthBar(): boolean { return this.healthBarMs > 0 || this.attackCycle.state.phase !== 'idle'; }
  get displayName(): string { return names[this.kind]; }
  get attackFacing(): 1 | -1 { return this.attackCycle.state.facing; }
  get attackProgress(): number { return this.attackCycle.progress; }
  get attackHitAvailable(): boolean { return this.attackCycle.canHit; }
  get attackProfile(): EnemyAttackProfile | undefined { return this.attackCycle.profile; }
  get attackShape(): EnemyAttackShape | undefined {
    return this.attackCycle.profile ? attackShapeAt(this.x, this.y, this.attackCycle.profile, this.attackFacing) : undefined;
  }

  private applyAttackMotion(body: Phaser.Physics.Arcade.Body): void {
    const phase = this.attackCycle.state.phase;
    const profile = this.attackCycle.profile;
    if (!profile) return;
    this.setFlipX(this.attackFacing < 0);
    if (phase === 'windup') {
      body.setVelocityX(0);
      const crouch = profile.motion === 'charge' ? 0.88 : 0.96;
      this.setScale(this.kind === 'boss' ? 1.04 : 1.15, (this.kind === 'boss' ? 1 : 1.15) * crouch);
      this.setAngle(this.attackFacing * (-10 + this.attackProgress * 4));
    } else if (phase === 'active') {
      body.setVelocityX(this.attackFacing * (profile.speed ?? 0));
      this.setScale(this.kind === 'boss' ? 1.06 : 1.2, this.kind === 'boss' ? 0.96 : 1.08);
      this.setAngle(this.attackFacing * (profile.motion === 'slam' ? 12 : 7));
    } else if (phase === 'recovery') {
      body.setVelocityX(0);
      this.setScale(this.kind === 'boss' ? 1.02 : 1.13, this.kind === 'boss' ? 0.97 : 1.1);
      this.setAngle(this.attackFacing * (8 - this.attackProgress * 8));
    }
  }

  private chooseAttack(): EnemyAttack {
    if (this.kind === 'spitter') return 'projectile';
    if (this.kind === 'boss') {
      const attack = this.nextBossAttack;
      this.nextBossAttack = attack === 'boss-slam' ? 'boss-volley' : 'boss-slam';
      return attack;
    }
    return 'melee';
  }
}

import Phaser from 'phaser';
import type { EnemyKind } from '../levels';
import type { EnemyFaction } from '../levels/Level';
import type { BossId } from '../story/story';
import { enemyAttackFrame, bossAttackFrame } from '../game/spriteFrames';
import {
  attackShapeAt,
  EnemyAttackCycle,
  type EnemyAttack,
  type EnemyAttackEvent,
  type EnemyAttackProfile,
  type EnemyAttackShape,
  type EnemyPhase,
} from './EnemyAttackCycle';
import { BossPattern } from './BossPattern';

export type { EnemyAttack, EnemyAttackProfile, EnemyPhase } from './EnemyAttackCycle';
export type EnemyEvent = EnemyAttackEvent & { enemy: Enemy };
export interface EnemyOptions { bossId?: BossId; faction?: EnemyFaction; }
export interface AimTarget { x: number; y: number; }

const stats: Record<EnemyKind, { hp: number; speed: number; awareness: number; texture: string }> = {
  walker: { hp: 42, speed: 66, awareness: 265, texture: 'enemy-full' },
  spitter: { hp: 34, speed: 48, awareness: 310, texture: 'enemy-full' },
  hound: { hp: 48, speed: 94, awareness: 280, texture: 'enemy-full' },
  boss: { hp: 360, speed: 82, awareness: 460, texture: 'boss-full' },
};

type LegacyEnemyAttack = Extract<EnemyAttack, 'melee' | 'projectile' | 'boss-slam' | 'boss-volley'>;
type LegacyBossAttack = Extract<LegacyEnemyAttack, 'boss-slam' | 'boss-volley'>;
const profiles: Record<LegacyEnemyAttack, EnemyAttackProfile> = {
  melee: { attack: 'melee', windupMs: 600, activeMs: 150, recoveryMs: 500, damage: 14, reach: 24, thickness: 30, motion: 'thrust', speed: 105 },
  projectile: { attack: 'projectile', windupMs: 620, activeMs: 110, recoveryMs: 520, damage: 12, reach: 255, thickness: 20, motion: 'cast' },
  'boss-slam': { attack: 'boss-slam', windupMs: 650, activeMs: 230, recoveryMs: 650, damage: 24, reach: 132, thickness: 62, motion: 'slam', speed: 65 },
  'boss-volley': { attack: 'boss-volley', windupMs: 720, activeMs: 140, recoveryMs: 620, damage: 18, reach: 300, thickness: 44, motion: 'cast' },
};

const houndProfile: EnemyAttackProfile = {
  attack: 'melee', windupMs: 560, activeMs: 360, recoveryMs: 540,
  damage: 18, reach: 20, thickness: 26, motion: 'charge', speed: 285,
};

const names: Record<EnemyKind, string> = {
  walker: 'Должник', spitter: 'Домовой чат', hound: 'Просроченный пёс', boss: 'Старший по порту',
};
const bossNames: Readonly<Record<BossId, string>> = { mark: 'Марк', chief: 'Начальник полиции', miller: 'Миллер' };

/** Enemy decisions and attack state. Arcade Physics still owns body movement and contacts. */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly id: string;
  readonly kind: EnemyKind;
  readonly bossId?: BossId;
  readonly faction?: EnemyFaction;
  readonly maxHp: number;
  readonly attackCycle = new EnemyAttackCycle();
  aimTarget?: Readonly<AimTarget>;
  hp: number;
  state: EnemyPhase = 'idle';
  engaged = false;
  enraged = false;
  private cooldownMs = 500;
  private hitLockMs = 0;
  private staggerMs = 0;
  private staggerDuration = 180;
  private recoilVelocity = 0;
  private healthBarMs = 0;
  private nextBossAttack: LegacyBossAttack = 'boss-slam';
  private readonly bossPattern?: BossPattern;

  constructor(scene: Phaser.Scene, id: string, kind: EnemyKind, x: number, y: number, options: EnemyOptions = {}) {
    const bossTexture = options.bossId ? `boss-${options.bossId}` : '';
    super(scene, x, y, kind === 'boss' && bossTexture && scene.textures.exists(bossTexture) ? bossTexture : stats[kind].texture);
    this.id = id;
    this.kind = kind;
    this.bossId = kind === 'boss' ? options.bossId : undefined;
    this.faction = options.faction;
    this.bossPattern = this.bossId ? new BossPattern(this.bossId) : undefined;
    this.maxHp = stats[kind].hp;
    this.hp = this.maxHp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(4);
    if (kind !== 'boss') this.setScale(1.15);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const width = kind === 'hound' ? 26 : kind === 'boss' ? 44 : 18;
    const height = kind === 'hound' ? 18 : kind === 'boss' ? 62 : 30;
    this.setOrigin(.5, (112 - height / 2) / 128);
    body.setSize(width, height, false).setOffset(64 - width / 2, 112 - height);
    this.renderPose();
  }

  updateAi(player: Phaser.Physics.Arcade.Sprite, deltaMs: number, bossAllowed: boolean, canStartAttack = true): EnemyEvent[] {
    if (!this.active) return [];
    const delta = Math.max(0, deltaMs);
    this.cooldownMs = Math.max(0, this.cooldownMs - delta);
    this.hitLockMs = Math.max(0, this.hitLockMs - delta);
    this.healthBarMs = Math.max(0, this.healthBarMs - delta);
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.staggerMs > 0) {
      this.staggerMs = Math.max(0, this.staggerMs - delta);
      body.setVelocityX(this.recoilVelocity * (this.staggerMs / this.staggerDuration) ** 2);
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
      if (events.some((event) => event.type === 'idle')) {
        this.cooldownMs = this.enraged ? 430 : 720;
        this.aimTarget = undefined;
      }
      return events.map((event) => ({ ...event, enemy: this }));
    }

    this.setAngle(0);
    this.setScale(this.kind === 'boss' ? 1 : 1.15);
    if (Math.abs(player.y - this.y) > 68) { body.setVelocityX(0); return []; }

    const bossRange = this.bossId === 'miller' ? 340 : this.bossId === 'mark' ? 170 : this.bossId === 'chief' ? 145 : 125;
    const inAttackRange = this.kind === 'spitter' ? distance < 260 : this.kind === 'boss' ? distance < bossRange : this.kind === 'hound' ? distance < 76 : distance < 58;
    if (inAttackRange && this.cooldownMs <= 0 && canStartAttack) {
      const baseProfile = this.chooseProfile();
      const profile = this.enraged ? { ...baseProfile, windupMs: Math.max(520, baseProfile.windupMs - 100) } : baseProfile;
      this.aimTarget = this.bossId === 'miller' ? Object.freeze({ x: player.x, y: player.y }) : undefined;
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
    return [];
  }

  activate(): void { this.engaged = true; this.healthBarMs = 1100; }
  consumeChargeHit(): boolean { return this.kind === 'hound' && this.attackCycle.consumeHit(); }
  consumeAttackHit(): boolean { return this.attackCycle.consumeHit(); }
  consumeReinforcements(): boolean { return this.bossPattern?.consumeReinforcements() ?? false; }

  /** Clears terminal-scene action state. Pause deliberately does not call this. */
  cancelActions(): void {
    this.attackCycle.cancel();
    this.state = 'idle';
    this.staggerMs = 0;
    this.aimTarget = undefined;
    this.cooldownMs = Math.max(this.cooldownMs, 720);
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
    this.setAngle(0).setScale(this.kind === 'boss' ? 1 : 1.15);
  }

  receiveHit(damage: number, direction: 1 | -1 = 1, finisher = false): boolean {
    if (this.hitLockMs > 0 || damage <= 0) return false;
    if (this.isBlocking && direction === -this.attackFacing) {
      this.healthBarMs = 1100;
      return false;
    }
    const previousHp = this.hp;
    this.hitLockMs = 90;
    this.hp = Math.max(0, this.hp - damage);
    this.bossPattern?.observeHealth(previousHp, this.hp, this.maxHp);
    this.healthBarMs = 1100;
    this.setTint(0xffefd6).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => this.active && this.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
    if (!this.defeated) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (this.kind === 'boss' && this.attackCycle.state.phase !== 'idle') body.setVelocityX(direction * 55);
      else {
        this.attackCycle.cancel();
        this.staggerDuration = this.kind === 'boss' ? 80 : finisher ? 260 : 180;
        this.staggerMs = this.staggerDuration;
        this.state = 'stagger';
        this.recoilVelocity = direction * (this.kind === 'boss' ? 60 : finisher ? 180 : 55);
        body.setVelocityX(this.recoilVelocity);
        this.renderPose();
      }
    }
    return true;
  }

  /** The kick breaks ordinary commitments and pushes them without damaging bosses. */
  receiveKick(direction: 1 | -1): boolean {
    if (!this.active || this.kind === 'boss') return false;
    this.attackCycle.cancel();
    this.staggerMs = this.staggerDuration = 230;
    this.recoilVelocity = direction * 235;
    this.state = 'stagger';
    this.healthBarMs = 700;
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(direction * 235);
    this.setTint(0xbce8dc);
    this.scene.time.delayedCall(120, () => this.active && this.clearTint());
    return true;
  }

  get defeated(): boolean { return this.hp <= 0; }
  get isTelegraphing(): boolean { return this.state === 'windup'; }
  get isAttacking(): boolean { return this.state === 'windup' || this.state === 'active'; }
  get isBlocking(): boolean { return this.bossPattern?.isBlocking(this.state, this.attackCycle.state.attack) ?? false; }
  get showsHealthBar(): boolean { return this.healthBarMs > 0 || this.attackCycle.state.phase !== 'idle'; }
  get displayName(): string { return this.bossId ? bossNames[this.bossId] : names[this.kind]; }
  get attackFacing(): 1 | -1 { return this.attackCycle.state.facing; }
  get attackProgress(): number { return this.attackCycle.progress; }
  get attackHitAvailable(): boolean { return this.attackCycle.canHit; }
  get attackProfile(): EnemyAttackProfile | undefined { return this.attackCycle.profile; }
  get attackShape(): EnemyAttackShape | undefined {
    return this.attackCycle.profile ? attackShapeAt(this.x, this.y, this.attackCycle.profile, this.attackFacing) : undefined;
  }

  /** Full-body keyframes are driven by the same attack phase used by collision. */
  renderPose(): void {
    const phase = this.state;
    const progress = this.attackProgress;
    const moving = Math.abs((this.body as Phaser.Physics.Arcade.Body).velocity.x) > 1;
    if (phase === 'idle' && moving) { this.play(`${this.kind}-walk`, true); return; }
    this.anims.stop();
    if (phase === 'idle') { this.setFrame(this.kind === 'spitter' ? 8 : this.kind === 'hound' ? 12 : 0); return; }
    if (phase === 'stagger') {
      const frame = Math.min(3, Math.floor((1 - this.staggerMs / this.staggerDuration) * 4));
      this.setFrame(this.kind === 'boss' ? 3 : (this.kind === 'spitter' ? 20 : this.kind === 'hound' ? 24 : 16) + frame); return;
    }
    if (this.kind !== 'boss') this.setFrame(enemyAttackFrame(this.kind, phase, progress));
    else this.setFrame(bossAttackFrame(phase, progress, this.attackProfile?.motion === 'cast'));
  }

  private applyAttackMotion(body: Phaser.Physics.Arcade.Body): void {
    const phase = this.attackCycle.state.phase;
    const profile = this.attackCycle.profile;
    if (!profile) return;
    this.setFlipX(this.attackFacing < 0).setAngle(0);
    if (phase === 'active') body.setVelocityX(this.attackFacing * (profile.speed ?? 0));
    else if (phase === 'recovery') body.setVelocityX(-this.attackFacing * (profile.recoverySpeed ?? 0));
    else body.setVelocityX(0);
  }

  private chooseProfile(): EnemyAttackProfile {
    if (this.bossPattern) return this.bossPattern.nextProfile();
    if (this.kind === 'hound') return houndProfile;
    if (this.kind === 'spitter') return profiles.projectile;
    if (this.kind === 'boss') {
      const attack = this.nextBossAttack;
      this.nextBossAttack = attack === 'boss-slam' ? 'boss-volley' : 'boss-slam';
      return profiles[attack];
    }
    return profiles.melee;
  }
}

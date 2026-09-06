import type { BossId } from '../story/story';
import type { EnemyAttackProfile, EnemyPhase } from './EnemyAttackCycle';

const attacks: Readonly<Record<BossId, readonly EnemyAttackProfile[]>> = {
  mark: [
    { attack: 'mark-lunge', windupMs: 540, activeMs: 220, recoveryMs: 520, damage: 18, reach: 112, thickness: 38, motion: 'thrust', speed: 260 },
    { attack: 'mark-heavy', windupMs: 860, activeMs: 260, recoveryMs: 900, damage: 28, reach: 158, thickness: 70, motion: 'slam', speed: 55 },
  ],
  chief: [
    { attack: 'chief-charge', windupMs: 780, activeMs: 460, recoveryMs: 850, damage: 22, reach: 54, thickness: 54, motion: 'charge', speed: 230 },
    { attack: 'chief-baton', windupMs: 620, activeMs: 180, recoveryMs: 560, damage: 18, reach: 82, thickness: 44, motion: 'thrust', speed: 75 },
  ],
  miller: [
    { attack: 'miller-volley', windupMs: 900, activeMs: 140, recoveryMs: 900, damage: 17, reach: 360, thickness: 24, motion: 'cast', recoverySpeed: 110 },
  ],
};

/** Authored boss sequence and progression signals; Enemy owns the live Phaser action cycle. */
export class BossPattern {
  private nextAttackIndex = 0;
  private reinforcementPending = false;
  private reinforcementsRequested = false;

  constructor(readonly id: BossId) {}

  get attackCount(): number { return attacks[this.id].length; }

  nextProfile(): EnemyAttackProfile {
    const sequence = attacks[this.id];
    const profile = sequence[this.nextAttackIndex];
    this.nextAttackIndex = (this.nextAttackIndex + 1) % sequence.length;
    return { ...profile };
  }

  isBlocking(phase: EnemyPhase, attack: EnemyAttackProfile['attack'] | null): boolean {
    return this.id === 'chief' && attack === 'chief-charge' && (phase === 'windup' || phase === 'active');
  }

  observeHealth(previousHp: number, currentHp: number, maxHp: number): void {
    if (this.id !== 'miller' || this.reinforcementsRequested || previousHp <= maxHp / 2 || currentHp > maxHp / 2) return;
    this.reinforcementsRequested = true;
    this.reinforcementPending = true;
  }

  consumeReinforcements(): boolean {
    if (!this.reinforcementPending) return false;
    this.reinforcementPending = false;
    return true;
  }
}

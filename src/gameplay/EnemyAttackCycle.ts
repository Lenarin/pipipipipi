export type EnemyPhase = 'idle' | 'windup' | 'active' | 'recovery' | 'stagger';
export type EnemyAttack = 'melee' | 'projectile' | 'boss-slam' | 'boss-volley';
export type EnemyAttackMotion = 'thrust' | 'charge' | 'slam' | 'cast';

export interface EnemyAttackProfile {
  attack: EnemyAttack;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  damage: number;
  reach: number;
  thickness: number;
  motion: EnemyAttackMotion;
  speed?: number;
}

export interface EnemyAttackState {
  phase: EnemyPhase;
  attack: EnemyAttack | null;
  facing: 1 | -1;
}

export interface EnemyAttackShape {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/** Shared directional footprint used by both the rendered tell and active collision. */
export function attackShapeAt(
  originX: number,
  originY: number,
  profile: EnemyAttackProfile,
  facing: 1 | -1,
): EnemyAttackShape {
  const x = facing === 1 ? originX + 10 : originX - 10 - profile.reach;
  const y = originY - profile.thickness / 2 + (profile.motion === 'slam' ? 12 : 5);
  return {
    x,
    y,
    width: profile.reach,
    height: profile.thickness,
    centerX: x + profile.reach / 2,
    centerY: y + profile.thickness / 2,
  };
}

export type EnemyAttackEvent =
  | { type: 'active'; attack: EnemyAttack; facing: 1 | -1 }
  | { type: 'recovery'; attack: EnemyAttack; facing: 1 | -1 }
  | { type: 'idle' };

/** Framework-independent, single-hit enemy attack timing. */
export class EnemyAttackCycle {
  state: EnemyAttackState = { phase: 'idle', attack: null, facing: 1 };
  profile: EnemyAttackProfile | undefined;
  private phaseRemainingMs = 0;
  private hitAvailable = false;

  get progress(): number {
    if (!this.profile || this.state.phase === 'idle' || this.state.phase === 'stagger') return 0;
    const duration = this.durationFor(this.state.phase);
    return Math.min(1, Math.max(0, 1 - this.phaseRemainingMs / duration));
  }

  get isActive(): boolean { return this.state.phase === 'active'; }
  get isRecovering(): boolean { return this.state.phase === 'recovery'; }
  get canHit(): boolean { return this.isActive && this.hitAvailable; }

  start(profile: EnemyAttackProfile, facing: 1 | -1): boolean {
    if (this.state.phase !== 'idle') return false;
    this.profile = { ...profile };
    this.state = { phase: 'windup', attack: profile.attack, facing };
    this.phaseRemainingMs = this.boundedDuration(profile.windupMs);
    this.hitAvailable = false;
    return true;
  }

  advance(deltaMs: number): EnemyAttackEvent[] {
    let remaining = Math.max(0, deltaMs);
    const events: EnemyAttackEvent[] = [];
    while (this.profile && this.state.phase !== 'idle' && remaining >= this.phaseRemainingMs) {
      remaining -= this.phaseRemainingMs;
      if (this.state.phase === 'windup') {
        this.state.phase = 'active';
        this.phaseRemainingMs = this.boundedDuration(this.profile.activeMs);
        this.hitAvailable = true;
        events.push({ type: 'active', attack: this.profile.attack, facing: this.state.facing });
      } else if (this.state.phase === 'active') {
        this.state.phase = 'recovery';
        this.phaseRemainingMs = this.boundedDuration(this.profile.recoveryMs);
        this.hitAvailable = false;
        events.push({ type: 'recovery', attack: this.profile.attack, facing: this.state.facing });
      } else {
        this.state = { phase: 'idle', attack: null, facing: this.state.facing };
        this.profile = undefined;
        this.phaseRemainingMs = 0;
        this.hitAvailable = false;
        events.push({ type: 'idle' });
      }
    }
    if (this.profile && this.state.phase !== 'idle') this.phaseRemainingMs -= remaining;
    return events;
  }

  consumeHit(): boolean {
    if (!this.isActive || !this.hitAvailable) return false;
    this.hitAvailable = false;
    return true;
  }

  cancel(): void {
    this.state = { phase: 'idle', attack: null, facing: this.state.facing };
    this.profile = undefined;
    this.phaseRemainingMs = 0;
    this.hitAvailable = false;
  }

  private durationFor(phase: Exclude<EnemyPhase, 'idle' | 'stagger'>): number {
    if (phase === 'windup') return this.boundedDuration(this.profile!.windupMs);
    if (phase === 'active') return this.boundedDuration(this.profile!.activeMs);
    return this.boundedDuration(this.profile!.recoveryMs);
  }

  private boundedDuration(durationMs: number): number {
    return Math.min(5_000, Math.max(1, durationMs));
  }
}

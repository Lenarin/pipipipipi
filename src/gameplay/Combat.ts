/** Framework-independent timing for the player's buffered, dash-cancellable three-hit chain. */
export type AttackPhase = 'idle' | 'windup' | 'active' | 'recovery';
export type AttackFacing = 1 | -1;

export interface AttackProfile {
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  damageMultiplier: number;
  reach: number;
  lunge: number;
}

export interface AttackState {
  phase: AttackPhase;
  step: number;
  facing: AttackFacing;
  queued: boolean;
}

export type AttackEvent =
  | { type: 'active'; step: number; facing: AttackFacing }
  | { type: 'recovery'; step: number; facing: AttackFacing }
  | { type: 'idle' };

export const PIPE_ATTACKS: readonly AttackProfile[] = [
  { windupMs: 100, activeMs: 80, recoveryMs: 150, damageMultiplier: 1, reach: 45, lunge: 42 },
  { windupMs: 120, activeMs: 80, recoveryMs: 170, damageMultiplier: 1, reach: 50, lunge: 56 },
  { windupMs: 180, activeMs: 100, recoveryMs: 240, damageMultiplier: 2, reach: 42, lunge: 78 },
];

/** Attack-only weight; normal walking remains immediately responsive. */
export function attackVelocity(peak: number, phase: AttackPhase, progress: number, facing: AttackFacing, direction: number): number {
  const p = Math.min(1, Math.max(0, progress));
  if (direction !== 0 && direction !== facing) return direction * 90;
  if (phase === 'windup') return direction * 70 * (1 - p);
  const envelope = phase === 'active' ? (p < .25 ? Math.sin(p * Math.PI * 2) : 1 - (p - .25))
    : phase === 'recovery' ? .25 * (1 - p) ** 2 : 0;
  return facing * peak * envelope;
}

/**
 * An input may start an idle chain or buffer precisely one next swing. Facing is
 * captured when the first swing begins, intentionally preventing mid-swing aim changes.
 */
export class AttackChain {
  state: AttackState = { phase: 'idle', step: 0, facing: 1, queued: false };
  currentProfile: AttackProfile | undefined;
  private phaseRemainingMs = 0;
  private queuedFacing: AttackFacing | undefined;
  private queuedMs = 0;

  get phaseProgress(): number {
    if (this.state.phase === 'idle' || !this.currentProfile) return 0;
    const duration = this.state.phase === 'windup' ? this.currentProfile.windupMs
      : this.state.phase === 'active' ? this.currentProfile.activeMs : this.currentProfile.recoveryMs;
    return Math.min(1, Math.max(0, 1 - this.phaseRemainingMs / duration));
  }

  request(facing: AttackFacing): boolean {
    if (this.state.phase === 'idle') {
      this.start(1, facing);
      return true;
    }
    if (this.state.step < PIPE_ATTACKS.length) {
      const accepted = !this.state.queued;
      this.state.queued = true;
      this.queuedFacing = facing;
      this.queuedMs = 180;
      return accepted;
    }
    return false;
  }

  advance(deltaMs: number, currentIntent?: AttackFacing): AttackEvent[] {
    let remaining = Math.max(0, deltaMs);
    const events: AttackEvent[] = [];
    while (this.state.phase !== 'idle' && remaining >= this.phaseRemainingMs) {
      this.ageQueue(this.phaseRemainingMs);
      remaining -= this.phaseRemainingMs;
      if (this.state.phase === 'windup') {
        this.state.phase = 'active';
        this.phaseRemainingMs = this.currentProfile!.activeMs;
        events.push({ type: 'active', step: this.state.step, facing: this.state.facing });
      } else if (this.state.phase === 'active') {
        this.state.phase = 'recovery';
        this.phaseRemainingMs = this.currentProfile!.recoveryMs;
        events.push({ type: 'recovery', step: this.state.step, facing: this.state.facing });
      } else if (this.state.queued && this.state.step < PIPE_ATTACKS.length) {
        this.start(this.state.step + 1, currentIntent ?? this.queuedFacing ?? this.state.facing);
      } else {
        this.state = { phase: 'idle', step: 0, facing: this.state.facing, queued: false };
        this.currentProfile = undefined;
        this.phaseRemainingMs = 0;
        events.push({ type: 'idle' });
      }
    }
    if (this.state.phase !== 'idle') { this.ageQueue(remaining); this.phaseRemainingMs -= remaining; }
    return events;
  }

  cancel(): void {
    this.state = { phase: 'idle', step: 0, facing: 1, queued: false };
    this.currentProfile = undefined;
    this.phaseRemainingMs = 0;
    this.queuedFacing = undefined;
    this.queuedMs = 0;
  }

  private ageQueue(delta: number): void {
    this.queuedMs = Math.max(0, this.queuedMs - delta);
    if (this.queuedMs === 0) { this.state.queued = false; this.queuedFacing = undefined; }
  }

  private start(step: number, facing: AttackFacing): void {
    this.currentProfile = PIPE_ATTACKS[step - 1];
    this.state = { phase: 'windup', step, facing, queued: false };
    this.phaseRemainingMs = this.currentProfile.windupMs;
    this.queuedFacing = undefined;
    this.queuedMs = 0;
  }
}

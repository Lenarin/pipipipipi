/** Framework-independent timing for the player's buffered, dash-cancellable three-hit chain. */
export type AttackPhase = 'idle' | 'windup' | 'active' | 'recovery';
export type AttackFacing = 1 | -1;

export interface AttackProfile {
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  damageMultiplier: number;
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
  { windupMs: 140, activeMs: 120, recoveryMs: 160, damageMultiplier: 1 },
  { windupMs: 150, activeMs: 120, recoveryMs: 190, damageMultiplier: 1 },
  { windupMs: 200, activeMs: 150, recoveryMs: 270, damageMultiplier: 2 },
];

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
      this.queuedMs = 240;
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

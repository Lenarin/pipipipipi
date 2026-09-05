export type CacheUpgrade = 'damage' | 'health';

/** Framework-independent channel timer. Resources remain owned by RunRules. */
export class HealingChannel {
  active = false;
  private elapsedMs = 0;

  constructor(readonly durationMs = 750) {}

  get progress(): number {
    return this.active ? Math.min(1, this.elapsedMs / this.durationMs) : 0;
  }

  begin(): boolean {
    if (this.active) return false;
    this.active = true;
    this.elapsedMs = 0;
    return true;
  }

  cancel(): boolean {
    if (!this.active) return false;
    this.active = false;
    this.elapsedMs = 0;
    return true;
  }

  advance(deltaMs: number): boolean {
    if (!this.active) return false;
    this.elapsedMs += Math.max(0, deltaMs);
    if (this.elapsedMs < this.durationMs) return false;
    this.active = false;
    this.elapsedMs = 0;
    return true;
  }

  reset(): void {
    this.active = false;
    this.elapsedMs = 0;
  }
}

/** One open tray and one irreversible choice per cache within a run. */
export class CacheChoiceState {
  openCacheId: string | null = null;
  private readonly committed = new Set<string>();

  get openChoice(): boolean { return this.openCacheId !== null; }

  open(cacheId: string): boolean {
    if (this.openChoice || this.committed.has(cacheId)) return false;
    this.openCacheId = cacheId;
    return true;
  }

  choose(choice: CacheUpgrade): { cacheId: string; choice: CacheUpgrade } | null {
    if (!this.openCacheId) return null;
    const result = { cacheId: this.openCacheId, choice };
    this.committed.add(this.openCacheId);
    this.openCacheId = null;
    return result;
  }

  cancel(): boolean {
    if (!this.openCacheId) return false;
    this.openCacheId = null;
    return true;
  }

  hasCommitted(cacheId: string): boolean { return this.committed.has(cacheId); }

  reset(): void {
    this.openCacheId = null;
    this.committed.clear();
  }
}

/** Short active window with a per-use target token for the visible kick. */
export class KickAction {
  active = false;
  facing: 1 | -1 = 1;
  private elapsedMs = 0;
  private readonly hits = new Set<string>();

  constructor(readonly durationMs = 160) {}

  get progress(): number { return this.active ? Math.min(1, this.elapsedMs / this.durationMs) : 0; }

  begin(facing: 1 | -1): boolean {
    if (this.active) return false;
    this.active = true;
    this.facing = facing;
    this.elapsedMs = 0;
    this.hits.clear();
    return true;
  }

  hit(targetId: string): boolean {
    if (!this.active || this.hits.has(targetId)) return false;
    this.hits.add(targetId);
    return true;
  }

  advance(deltaMs: number): boolean {
    if (!this.active) return false;
    this.elapsedMs += Math.max(0, deltaMs);
    if (this.elapsedMs < this.durationMs) return false;
    this.cancel();
    return true;
  }

  cancel(): void {
    this.active = false;
    this.elapsedMs = 0;
    this.hits.clear();
  }
}

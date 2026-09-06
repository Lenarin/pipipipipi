import { CacheChoiceState, HealingChannel, type CacheUpgrade } from './ActionState';

export type RunMode = 'title' | 'playing' | 'paused' | 'dead' | 'won';
export type CooldownName = 'dash' | 'heal' | 'hurt' | 'ability';
export const ABILITY_COOLDOWN_MS = 1_700;

/** Framework-independent run state and combat rules. Phaser only supplies input and collisions. */
export class RunRules {
  mode: RunMode = 'title';
  hp = 100;
  maxHp = 100;
  flasks = 2;
  shards = 0;
  kills = 0;
  weaponLevel = 1;
  stage = 0;
  elapsed = 0;
  private now = 0;
  private immunityUntil = 0;
  private swingNumber = 0;
  private cooldownUntil = new Map<CooldownName, number>();
  private swingHits = new Map<number, Set<string>>();
  private readonly healingChannel = new HealingChannel(750);
  private readonly cacheChoice = new CacheChoiceState();

  start(): void {
    this.mode = 'playing';
    this.hp = 100;
    this.maxHp = 100;
    this.flasks = 2;
    this.shards = 0;
    this.kills = 0;
    this.weaponLevel = 1;
    this.stage = 0;
    this.elapsed = 0;
    this.now = 0;
    this.immunityUntil = 0;
    this.cooldownUntil.clear();
    this.swingHits.clear();
    this.healingChannel.reset();
    this.cacheChoice.reset();
  }

  tick(deltaMs: number): void {
    if (this.mode !== 'playing') return;
    const elapsed = Math.max(0, deltaMs);
    this.now += elapsed;
    this.elapsed += elapsed;
  }

  pause(): boolean {
    if (this.mode !== 'playing') return false;
    this.mode = 'paused';
    return true;
  }

  resume(): boolean {
    if (this.mode !== 'paused') return false;
    this.mode = 'playing';
    return true;
  }

  grantImmunity(durationMs: number): void {
    if (this.mode !== 'playing') return;
    this.immunityUntil = Math.max(this.immunityUntil, this.now + Math.max(0, durationMs));
  }

  get immune(): boolean { return this.now < this.immunityUntil; }
  get damage(): number { return 16 + (this.weaponLevel - 1) * 6; }
  get dashReady(): boolean { return this.mode === 'playing' && this.ready('dash'); }
  get abilityReady(): boolean { return this.mode === 'playing' && this.ready('ability'); }
  get abilityCooldownProgress(): number {
    return this.abilityReady ? 0 : Math.min(1, Math.max(0, ((this.cooldownUntil.get('ability') ?? this.now) - this.now) / ABILITY_COOLDOWN_MS));
  }
  get healing(): boolean { return this.healingChannel.active; }
  get healingProgress(): number { return this.healingChannel.progress; }
  get cacheChoiceOpen(): boolean { return this.cacheChoice.openChoice; }
  get openCacheId(): string | null { return this.cacheChoice.openCacheId; }

  takeDamage(amount: number): boolean {
    if (this.mode !== 'playing' || this.immune || amount <= 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.grantImmunity(700);
    if (this.hp === 0) this.mode = 'dead';
    return true;
  }

  useCooldown(name: CooldownName, durationMs: number): boolean {
    if (this.mode !== 'playing' || !this.ready(name)) return false;
    this.cooldownUntil.set(name, this.now + Math.max(0, durationMs));
    return true;
  }

  beginSwing(): number | null {
    if (this.mode !== 'playing') return null;
    const swing = ++this.swingNumber;
    // Only one player stroke is active. Retired tokens cannot hit or accumulate for the entire run.
    this.swingHits.clear();
    this.swingHits.set(swing, new Set());
    return swing;
  }

  hitTarget(swing: number | null, targetId: string): boolean {
    if (this.mode !== 'playing' || swing === null) return false;
    const hits = this.swingHits.get(swing);
    if (!hits || hits.has(targetId)) return false;
    hits.add(targetId);
    return true;
  }

  private heal(): boolean {
    if (this.mode !== 'playing' || this.hp >= this.maxHp || this.flasks <= 0 || !this.useCooldown('heal', 550)) return false;
    this.hp = Math.min(this.maxHp, this.hp + 35);
    this.flasks--;
    return true;
  }

  beginHealing(): boolean {
    if (this.mode !== 'playing' || this.hp >= this.maxHp || this.flasks <= 0) return false;
    return this.healingChannel.begin();
  }

  cancelHealing(): boolean { return this.healingChannel.cancel(); }

  advanceHealing(deltaMs: number): boolean {
    if (!this.healingChannel.advance(deltaMs)) return false;
    return this.heal();
  }

  useAbility(): boolean { return this.useCooldown('ability', ABILITY_COOLDOWN_MS); }

  openCacheChoice(cacheId: string): boolean {
    return this.mode === 'playing' && this.cacheChoice.open(cacheId);
  }

  cancelCacheChoice(): boolean { return this.cacheChoice.cancel(); }

  applyCacheChoice(choice: CacheUpgrade): boolean {
    if (this.mode !== 'playing') return false;
    const committed = this.cacheChoice.choose(choice);
    if (!committed) return false;
    if (choice === 'health') this.upgradeMaxHp();
    else this.setWeaponLevel(this.weaponLevel + 1);
    this.recoverFlask();
    return true;
  }

  hasUsedCache(cacheId: string): boolean { return this.cacheChoice.hasCommitted(cacheId); }

  addShards(amount: number): void { if (this.mode === 'playing') this.shards += Math.max(0, amount); }
  recordKill(shards = 1): void { if (this.mode === 'playing') { this.kills++; this.addShards(shards); } }
  setWeaponLevel(level: number): void { this.weaponLevel = Math.max(1, Math.floor(level)); }
  upgradeMaxHp(): void { this.maxHp += 20; this.hp = Math.min(this.maxHp, this.hp + 20); }
  recoverFlask(): void { this.flasks = Math.min(2, this.flasks + 1); }
  advanceStage(): void { if (this.mode === 'playing') this.stage = Math.min(2, this.stage + 1); }

  completeStage(finalBossDefeated: boolean): void {
    if (this.mode !== 'playing') return;
    if (finalBossDefeated && this.stage === 2) this.mode = 'won';
    else this.advanceStage();
  }

  private ready(name: CooldownName): boolean { return this.now >= (this.cooldownUntil.get(name) ?? 0); }
}

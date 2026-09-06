import type { BossId, StoryEffect, StoryId, StorySession } from './story';

const sequence = Object.freeze([
  'phone-call',
  'last-khachapuri',
  'wanted',
  'airport-chief',
  'rough-landing',
  'food-threat',
  'delivered',
] as const satisfies readonly StoryId[]);

const exitPrerequisites: Readonly<Partial<Record<StoryId, BossId>>> = Object.freeze({
  wanted: 'mark',
  'rough-landing': 'chief',
  delivered: 'miller',
});

export interface CampaignSnapshot {
  stage: 0 | 1 | 2;
  hasPackage: boolean;
  wanted: boolean;
  delivered: boolean;
  current: Readonly<StorySession> | null;
  nextScene: StoryId | null;
  completedScenes: readonly StoryId[];
  defeatedBosses: readonly BossId[];
  activeBoss: BossId | null;
}

export class Campaign {
  private sceneIndex = 0;
  private tokenCounter = 0;
  private currentSession: Readonly<StorySession> | null = null;
  private currentStage: 0 | 1 | 2 = 0;
  private packageReceived = false;
  private isWanted = false;
  private isDelivered = false;
  private activeBossId: BossId | null = null;
  private readonly completedScenes = new Set<StoryId>();
  private readonly defeatedBosses = new Set<BossId>();

  get stage(): 0 | 1 | 2 { return this.currentStage; }
  get hasPackage(): boolean { return this.packageReceived; }
  get wanted(): boolean { return this.isWanted; }
  get delivered(): boolean { return this.isDelivered; }
  get current(): Readonly<StorySession> | null { return this.currentSession; }
  get nextScene(): StoryId | null { return sequence[this.sceneIndex] ?? null; }

  reset(): void {
    this.sceneIndex = 0;
    this.currentSession = null;
    this.currentStage = 0;
    this.packageReceived = false;
    this.isWanted = false;
    this.isDelivered = false;
    this.activeBossId = null;
    this.completedScenes.clear();
    this.defeatedBosses.clear();
  }

  begin(id: StoryId): Readonly<StorySession> | null {
    if (this.currentSession || id !== this.nextScene) return null;
    const prerequisite = exitPrerequisites[id];
    if (prerequisite && !this.defeatedBosses.has(prerequisite)) return null;

    this.currentSession = Object.freeze({ id, token: ++this.tokenCounter });
    return this.currentSession;
  }

  complete(session: StorySession): StoryEffect | null {
    if (
      !this.currentSession
      || session.id !== this.currentSession.id
      || session.token !== this.currentSession.token
    ) return null;

    const id = this.currentSession.id;
    this.currentSession = null;
    this.completedScenes.add(id);
    this.sceneIndex++;

    switch (id) {
      case 'phone-call':
        return { kind: 'resume' };
      case 'last-khachapuri':
        this.activeBossId = 'mark';
        return { kind: 'boss', boss: 'mark' };
      case 'wanted':
        this.packageReceived = true;
        this.isWanted = true;
        this.currentStage = 1;
        return { kind: 'stage', stage: 1 };
      case 'airport-chief':
        this.activeBossId = 'chief';
        return { kind: 'boss', boss: 'chief' };
      case 'rough-landing':
        this.currentStage = 2;
        return { kind: 'stage', stage: 2 };
      case 'food-threat':
        this.activeBossId = 'miller';
        return { kind: 'boss', boss: 'miller' };
      case 'delivered':
        this.isDelivered = true;
        return { kind: 'victory' };
    }
  }

  defeatBoss(id: BossId): boolean {
    if (this.activeBossId !== id || this.defeatedBosses.has(id)) return false;
    this.defeatedBosses.add(id);
    this.activeBossId = null;
    return true;
  }

  snapshot(): Readonly<CampaignSnapshot> {
    return Object.freeze({
      stage: this.currentStage,
      hasPackage: this.packageReceived,
      wanted: this.isWanted,
      delivered: this.isDelivered,
      current: this.currentSession,
      nextScene: this.nextScene,
      completedScenes: Object.freeze([...this.completedScenes]),
      defeatedBosses: Object.freeze([...this.defeatedBosses]),
      activeBoss: this.activeBossId,
    });
  }
}

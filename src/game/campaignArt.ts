import type Phaser from 'phaser';
import type { EnemyFaction } from '../levels/Level';
import type { BossId } from '../story/story';
import type { EnemyAttack, EnemyPhase } from '../gameplay/EnemyAttackCycle';

export const CAMPAIGN_LAYOUT = { width: 192, height: 160, anchorX: 96, anchorY: 144 } as const;
export const LEGACY_ENEMY_LAYOUT = { width: 128, height: 128, anchorX: 64, anchorY: 112 } as const;
export const PORTRAIT_SPEAKERS = ['larik', 'nastya', 'baker', 'mark', 'chief', 'miller'] as const;
export const FACTIONS: readonly EnemyFaction[] = ['street', 'police', 'federal'];
export const ROLES = ['walker', 'spitter', 'hound'] as const;
export const BOSSES: readonly BossId[] = ['mark', 'chief', 'miller'];
export const STORY_PANELS = ['wanted', 'flight', 'descent', 'wreck', 'food', 'eating'] as const;

/** Registered contact-frame gun tips / throwing hand, in unscaled actor coordinates. */
export function campaignProjectileOrigin(actor: { x: number; y: number; scaleX: number; scaleY: number; bossId?: BossId; faction?: EnemyFaction }, facing: 1 | -1) {
  const offset = actor.bossId === 'miller' ? [32, -15] : actor.faction === 'police' ? [22, -9]
    : actor.faction === 'federal' ? [20, -12] : actor.faction === 'street' ? [20, -7] : [0, -5];
  if (!actor.bossId && !actor.faction) return { x: actor.x, y: actor.y - 5 };
  return { x: actor.x + facing * offset[0] * actor.scaleX, y: actor.y + offset[1] * actor.scaleY };
}

/** Frozen target projected into the committed forward cone; close targets never reverse a gun. */
export function volleyAngle(origin: { x: number; y: number }, target: { x: number; y: number }, facing: 1 | -1, spread = 0): number {
  const forward = Math.max(24, (target.x - origin.x) * facing);
  const local = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, Math.atan2(target.y - origin.y, forward)));
  return (facing === 1 ? local : Math.PI - local) + spread * .11;
}

export function loadCampaignArt(scene: Phaser.Scene, base: string): void {
  for (const speaker of PORTRAIT_SPEAKERS) {
    const keyed = ['mark', 'chief', 'miller'].includes(speaker) ? '-keyed' : '';
    scene.load.image(`portrait-${speaker}-source`, `${base}assets/portrait-${speaker}-v8${keyed}-source.png`);
  }
  for (const boss of BOSSES) scene.load.image(`boss-${boss}-source`, `${base}assets/boss-${boss}-v8-source.png`);
  for (const faction of FACTIONS) for (const role of ROLES) scene.load.image(`enemy-${faction}-${role}-source`, `${base}assets/enemy-${faction}-${role}-v8-source.png`);
  for (const theme of ['batumi', 'airport', 'suburb']) scene.load.image(`scene-${theme}`, `${base}assets/scene-${theme}-v8.png`);
  scene.load.image('story-v8-source', `${base}assets/story-v8-source.png`);
  scene.load.image('landmark-wreck-source', `${base}assets/prop-plane-wreck-v8-source.png`);
}

const phaseFrames: Partial<Record<EnemyAttack, readonly (readonly number[])[]>> = {
  'mark-lunge': [[3, 4, 5, 6], [7, 8], [9, 10]],
  'mark-heavy': [[12, 13, 14, 15, 16], [17], [18, 19]],
  'chief-baton': [[3, 4, 5, 6, 7], [8, 9], [10]],
  'chief-charge': [[12, 13, 14, 15], [16, 17], [18, 19]],
  'miller-volley': [[3, 4, 5, 6, 7], [8, 9], [10, 11, 16, 17, 18, 19]],
};

/** Source pose order is authored from inspected pixels, independently of legacy atlas indices. */
export function campaignAttackFrame(attack: EnemyAttack | undefined, phase: EnemyPhase, progress: number): number {
  const rows = (attack && phaseFrames[attack]) || [[3, 4, 5, 6], [7, 8], [9]];
  const frames = rows[phase === 'windup' ? 0 : phase === 'active' ? 1 : 2];
  return frames[Math.min(frames.length - 1, Math.floor(Math.max(0, progress) * frames.length))];
}

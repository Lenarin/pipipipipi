import type { AttackPhase } from '../gameplay/Combat';

/** Pixel registration is shared by atlas packing and collision, never a second animation clock. */
export const HERO_LAYOUT = { width: 192, height: 144, anchorX: 96, anchorY: 128, originY: 90 } as const;
export interface SpritePose {
  anchorX: number;
  feetY: number;
  scale: number;
  flip?: boolean;
  contact?: readonly [number, number, number, number];
}
const heroPose = (anchorX: number, feetY: number, contact?: SpritePose['contact']): SpritePose => ({ anchorX, feetY, scale: 72 / 270, contact });
// Hand -> pipe tip (or hip -> boot) measured on hero-combat-v4-source.png, 1254 x 1254.
export const HERO_COMBAT_POSES: readonly SpritePose[] = [
  heroPose(157, 329), heroPose(430, 329, [559, 176, 669, 160]),
  heroPose(765, 329, [861, 260, 938, 313]), heroPose(1064, 329),
  heroPose(143, 623), heroPose(410, 623, [559, 490, 684, 488]),
  heroPose(750, 623, [889, 552, 971, 605]), heroPose(1065, 623),
  heroPose(133, 906), heroPose(406, 906, [510, 843, 586, 894]),
  heroPose(737, 906, [870, 878, 961, 897]), heroPose(1066, 906),
  heroPose(144, 1193), heroPose(402, 1193),
  heroPose(690, 1193, [742, 1102, 875, 1055]), heroPose(1044, 1193),
];
export const HERO_LOCOMOTION_POSES: readonly SpritePose[] = [
  [261,411], [669,411], [1090,411], [1483,411],
  [247,800], [666,800], [1091,800], [1492,800],
].map(([anchorX, feetY]) => ({ anchorX, feetY, scale: 72 / 330 }));

// v0.5: eight full-body poses per forward stroke, source 1024x1536.
const pipePose = (anchorX: number, feetY: number, contact?: SpritePose['contact']): SpritePose => ({ anchorX, feetY, scale: 72 / 198, contact });
export const HERO_PIPE_POSES: readonly SpritePose[] = [
  pipePose(124,269), pipePose(368,269), pipePose(604,269), pipePose(811,269,[905,155,988,150]),
  pipePose(98,528,[149,452,215,508]), pipePose(322,528), pipePose(604,528), pipePose(847,528),
  pipePose(124,787), pipePose(369,787), pipePose(604,787), pipePose(811,787,[905,677,988,669]),
  pipePose(98,1046,[149,971,215,1025]), pipePose(325,1046), pipePose(605,1046), pipePose(847,1046),
  pipePose(124,1301), pipePose(347,1301), pipePose(580,1301), pipePose(789,1301,[864,1234,941,1276]),
  pipePose(96,1533,[209,1465,294,1478]), pipePose(375,1533), pipePose(604,1533), pipePose(848,1533),
];
export const ENEMY_RECOIL_POSES: readonly SpritePose[] = [
  [203,411], [510,413], [773,411], [1088,411],
  [204,831], [516,835], [774,835], [1080,832],
  [173,1164], [466,1161], [781,1161], [1093,1161],
].map(([anchorX, feetY], i) => ({ anchorX, feetY, scale: i < 4 ? 36 / 330 : i < 8 ? 34 / 345 : 24 / 160 }));

// v0.6: four anticipation, two contact and two recovery poses per ordinary enemy.
// Preserve standing scale within each creature; never enlarge a compressed pose.
export const ENEMY_ATTACK_POSES: readonly SpritePose[] = [
  [172,271], [466,271], [766,271], [1045,271],
  [151,508], [450,508], [756,508], [1033,508],
  [157,759], [463,759], [760,759], [1039,759],
  [175,964], [459,964], [758,964], [1035,964],
  [159,1100], [460,1100], [773,1100], [1047,1100],
  [159,1230], [469,1230], [788,1230], [1075,1230],
].map(([anchorX, feetY], i) => ({ anchorX, feetY, scale: i < 8 ? 36 / 224 : i < 16 ? 34 / 216 : 24 / 101 }));

export function enemyAttackFrame(kind: 'walker' | 'spitter' | 'hound', phase: 'windup' | 'active' | 'recovery', progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  const offset = phase === 'windup' ? Math.min(3, Math.floor(p * 4)) : phase === 'active' ? (p < .5 ? 4 : 5) : p < .45 ? 6 : 7;
  return 28 + (kind === 'walker' ? 0 : kind === 'spitter' ? 8 : 16) + offset;
}

export function pipeFrame(step: number, phase: AttackPhase, progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  const offset = phase === 'windup' ? (p < .25 ? 0 : p < .6 ? 1 : 2)
    : phase === 'active' ? (p < .5 ? 3 : 4) : p < .35 ? 5 : p < .75 ? 6 : 7;
  return Math.max(0, Math.min(2, step - 1)) * 8 + offset;
}
export const HERO_ACTION_POSES: readonly SpritePose[] = [
  [155,246], [466,246], [754,246], [1060,246],
  [148,595], [439,595], [757,595], [1063,595],
  [169,869], [453,869], [753,869], [1065,869],
  [149,1175], [442,1145], [752,1175], [1062,1175],
].map(([anchorX, feetY]) => ({ anchorX, feetY, scale: 72 / 280 }));

export const ENEMY_POSES: readonly SpritePose[] = [
  [175,301], [461,301], [769,301], [1076,301],
  [163,599], [461,599], [752,599], [1054,599],
  [146,913], [440,913], [749,913], [1075,913],
  [151,1176], [450,1176], [775,1176], [1080,1176],
].map(([anchorX, feetY], i) => ({ anchorX, feetY, scale: i < 8 ? 36 / 255 : i < 12 ? 34 / 267 : 24 / 150 }));
export const BOSS_POSES: readonly SpritePose[] = [
  [222,305], [572,305], [925,305], [1294,305],
  [222,633], [590,633], [931,637], [1307,633],
  [172,966], [471,966], [847,966], [1266,966],
].map(([anchorX, feetY], i) => ({ anchorX, feetY, scale: 70 / 275, flip: i < 8 || i === 11 }));

export function attackFrame(step: number, phase: AttackPhase, progress: number): number {
  const offset = phase === 'windup' ? 0 : phase === 'active' ? (progress < .5 ? 1 : 2) : 3;
  return Math.max(0, Math.min(2, step - 1)) * 4 + offset;
}
export function kickFrame(progress: number): number {
  return progress < .15 ? 12 : progress < .3 ? 13 : progress < .8 ? 14 : 15;
}
export function posePoint(pose: SpritePose, x: number, y: number): { x: number; y: number } {
  return { x: Math.round((x - pose.anchorX) * pose.scale), y: Math.round((y - pose.feetY) * pose.scale) };
}
export function contactInWorld(pose: SpritePose, x: number, y: number, scale: number, facing: 1 | -1) {
  if (!pose.contact) return null;
  const a = posePoint(pose, pose.contact[0], pose.contact[1]);
  const b = posePoint(pose, pose.contact[2], pose.contact[3]);
  const feet = y + (HERO_LAYOUT.anchorY - HERO_LAYOUT.originY) * scale;
  return { x1: x + a.x * scale * facing, y1: feet + a.y * scale, x2: x + b.x * scale * facing, y2: feet + b.y * scale };
}

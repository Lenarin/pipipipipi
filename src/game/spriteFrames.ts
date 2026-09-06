import type { AttackPhase } from '../gameplay/Combat';

/** Pixel registration is shared by atlas packing and collision, never a second animation clock. */
export const HERO_LAYOUT = { width: 224, height: 144, anchorX: 112, anchorY: 128, originY: 90 } as const;
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
  [250,374], [645,374], [1080,374], [1463,374],
  [251,773], [658,773], [1094,773], [1466,773],
].map(([anchorX, feetY]) => ({ anchorX, feetY, scale: 72 / 275 }));

// v0.7: twelve full-body poses per stroke, three independent 1536x1024 sheets.
// Four preparations, four forward contacts, four recoveries. Anatomical scale is
// fixed within each sheet; low poses are never enlarged to standing height.
const pipePose = (anchorX: number, feetY: number, contact?: SpritePose['contact']): SpritePose => ({ anchorX, feetY, scale: 72 / 210, contact });
export const PIPE_POSES_PER_STROKE = 12;
export const HERO_PIPE_POSES: readonly SpritePose[] = [
  pipePose(170,329), pipePose(552,329), pipePose(913,329), pipePose(1290,329),
  pipePose(155,643,[248,487,372,408]), pipePose(492,643,[605,516,766,510]),
  pipePose(870,643,[998,553,1154,588]), pipePose(1251,643,[1377,598,1517,648]),
  pipePose(119,953), pipePose(534,953), pipePose(886,953), pipePose(1253,953),
  pipePose(155,334), pipePose(568,334), pipePose(917,334), pipePose(1293,334),
  pipePose(118,648,[214,523,392,471]), pipePose(480,648,[600,536,776,532]),
  pipePose(849,648,[968,558,1128,595]), pipePose(1223,648,[1334,602,1497,650]),
  pipePose(107,955), pipePose(529,955), pipePose(882,955), pipePose(1234,955),
  pipePose(161,329), pipePose(552,329), pipePose(938,329), pipePose(1302,329),
  pipePose(151,644,[279,468,376,393]), pipePose(487,644,[605,519,784,515]),
  pipePose(871,644,[987,574,1139,622]), pipePose(1252,644,[1376,616,1510,655]),
  pipePose(125,953), pipePose(536,953), pipePose(892,953), pipePose(1246,953),
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

// Collapse keeps a fixed anatomical scale and a shared ground registration per creature.
export const ENEMY_DEATH_POSES: readonly SpritePose[] = [
  [149,382], [447,382], [750,382], [1075,382],
  [148,746], [447,746], [750,746], [1075,746],
  [160,1147], [460,1147], [762,1147], [1065,1147],
].map(([anchorX, feetY], i) => ({ anchorX, feetY, scale: i < 4 ? 36 / 276 : i < 8 ? 34 / 275 : 24 / 145 }));

export const BOSS_DEATH_POSES: readonly SpritePose[] = [
  [323,582], [866,582], [1400,582], [1890,582],
].map(([anchorX, feetY], i) => ({ anchorX, feetY, scale: 70 / 445, flip: i < 3 }));

export const BOSS_ATTACK_POSES: readonly SpritePose[] = [
  [225,263], [585,263], [930,263], [1289,263],
  [203,494], [550,503], [925,501], [1284,504],
  [212,738], [591,744], [938,738], [1240,740],
  [223,970], [557,969], [928,972], [1249,974],
].map(([anchorX, feetY]) => ({ anchorX, feetY, scale: 70 / 210 }));

export function bossAttackFrame(phase: 'windup' | 'active' | 'recovery', progress: number, casting: boolean): number {
  return 16 + (casting ? 8 : 0) + enemyPoseOffset(phase, progress);
}

function enemyPoseOffset(phase: 'windup' | 'active' | 'recovery', progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return phase === 'windup' ? Math.min(3, Math.floor(p * 4)) : phase === 'active' ? (p < .5 ? 4 : 5) : p < .45 ? 6 : 7;
}

export function enemyAttackFrame(kind: 'walker' | 'spitter' | 'hound', phase: 'windup' | 'active' | 'recovery', progress: number): number {
  return 28 + (kind === 'walker' ? 0 : kind === 'spitter' ? 8 : 16) + enemyPoseOffset(phase, progress);
}

export function pipeFrame(step: number, phase: AttackPhase, progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  // Settle into the loaded silhouette quickly, then HOLD it. More drawings alone
  // do not create readable anticipation when every drawing lasts a single tick.
  const offset = phase === 'windup' ? (p < .15 ? 0 : p < .32 ? 1 : p < .92 ? 2 : 3)
    : phase === 'active' ? (p < .22 ? 4 : p < .48 ? 5 : p < .72 ? 6 : 7)
      : p < .4 ? 8 : p < .68 ? 9 : p < .87 ? 10 : 11;
  return Math.max(0, Math.min(2, step - 1)) * PIPE_POSES_PER_STROKE + offset;
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

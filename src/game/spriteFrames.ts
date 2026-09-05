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

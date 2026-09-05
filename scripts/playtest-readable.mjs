import { chromium } from '@playwright/test';

// Natural-input acceptance probe: page.evaluate ONLY reads live state.
// No reset/teleport, artificial immunity, damage injection or AI changes.
const scenario = process.argv[2] ?? 'dodge';
const tag = process.argv[3] ?? 'v03';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const milestones = [];
const held = new Set();
page.on('pageerror', error => errors.push(error.message));
const read = () => page.evaluate(() => {
  const s = window.__GAME__.scene.getScene('Game');
  return {
    t: Math.round(s.rules.elapsed), mode: s.rules.mode, hp: s.rules.hp, kills: s.rules.kills,
    player: { x: s.player.x, y: s.player.y, facing: s.player.facing, grounded: s.player.grounded, dash: s.player.isDashing },
    attack: { ...s.attack.state }, dashReady: s.rules.dashReady,
    enemies: s.enemies.getChildren().map(e => ({ id: e.id, kind: e.kind, x: e.x, y: e.y, hp: e.hp, state: e.state, facing: e.attackFacing ?? (e.flipX ? -1 : 1), progress: e.attackProgress ?? e.cycle?.progress })),
  };
});
async function move(direction) {
  for (const [key, wanted] of [['KeyD', direction > 0], ['KeyA', direction < 0]]) {
    if (wanted && !held.has(key)) { await page.keyboard.down(key); held.add(key); }
    if (!wanted && held.has(key)) { await page.keyboard.up(key); held.delete(key); }
  }
}
async function mark(name) {
  const state = await read();
  milestones.push({ name, ...state });
  await page.screenshot({ path: `.artifacts/${tag}-${scenario}-${name}.png` });
  return state;
}
async function until(predicate, ms = 7000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const state = await read();
    if (predicate(state)) return state;
    if (state.mode !== 'playing') throw new Error(`Run ended: ${state.mode}, HP ${state.hp}`);
    await page.waitForTimeout(25);
  }
  throw new Error(`Timed out: ${JSON.stringify(await read())}`);
}
const first = state => state.enemies.find(e => e.id === 'yard-walker-1');
const target = state => scenario === 'group'
  ? state.enemies.filter(e => e.kind !== 'spitter').sort((a, b) => Math.abs(a.x - state.player.x) - Math.abs(b.x - state.player.x))[0]
  : first(state);
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: /ВОЙТИ В ГОРОД/ }).click();
  await until(s => s.player.grounded);
  await move(1);
  await until(s => first(s)?.state === 'windup');
  await move(0);
  const telegraph = await mark('windup');
  // Give the player a realistic recognition delay, not a frame-perfect response.
  await page.waitForTimeout(200);
  if (scenario === 'retreat') {
    await move(-1);
    await until(s => Math.abs(s.player.x - first(s).x) > 110);
    await move(0);
    await until(s => first(s)?.state === 'recovery' || first(s)?.state === 'idle', 2500);
    const escaped = await mark('escaped');
    if (escaped.hp !== telegraph.hp) throw new Error(`Retreat took damage: ${telegraph.hp} -> ${escaped.hp}`);
  } else if (scenario === 'observe') {
    await until(s => first(s)?.state === 'active' || first(s)?.state === 'charge', 2500);
    await mark('active');
    await until(s => first(s)?.state === 'recovery' || first(s)?.state === 'idle', 2500);
    await mark('recovery');
  } else {
    await move(1);
    await page.keyboard.press('ShiftLeft', { delay: 35 });
    await mark('dodge');
    await until(s => !s.player.dash, 1200);
    await move(0);
    await until(s => first(s)?.state === 'recovery' || first(s)?.state === 'idle', 2500);
    const behind = await mark('behind');
    if (behind.hp !== telegraph.hp) throw new Error(`Dodge through the committed attack took damage: ${telegraph.hp} -> ${behind.hp}`);
    let lastHitAt = 0;
    let tells = 1;
    let maxCommittedThreats = 0;
    let seenWindup = false;
    const fightEnd = Date.now() + (scenario === 'group' ? 20000 : 12000);
    while (Date.now() < fightEnd) {
      const s = await read();
      maxCommittedThreats = Math.max(maxCommittedThreats, s.enemies.filter(enemy => enemy.state === 'windup' || enemy.state === 'active').length);
      const e = target(s);
      if (!e || s.mode !== 'playing' || (scenario === 'group' && !first(s) && !s.enemies.some(enemy => enemy.id === 'yard-hound-1'))) break;
      const dx = e.x - s.player.x;
      const dir = dx < 0 ? -1 : 1;
      if (e.state === 'windup') {
        if (!seenWindup) { tells++; seenWindup = true; }
        if (s.dashReady) {
          await page.waitForTimeout(200);
          await move(dir);
          await page.keyboard.press('ShiftLeft', { delay: 35 });
          await until(n => !n.player.dash, 1200);
          await move(0);
        } else await move(-dir);
      } else if (e.state === 'active' || e.state === 'charge') {
        // A missed charge is not an invitation to run into its active hitbox.
        await move(-dir);
      } else {
        seenWindup = false;
        if (Math.abs(dx) > 38) await move(dir);
        else {
          await move(dir); await page.waitForTimeout(20); await move(0);
          if (s.t - lastHitAt > 160) { await page.keyboard.press('KeyJ', { delay: 30 }); lastHitAt = s.t; }
        }
      }
      await page.waitForTimeout(25);
    }
    await move(0);
    const outcome = await mark('outcome');
    const passed = outcome.mode === 'playing' && !first(outcome)
      && (scenario !== 'group' || !outcome.enemies.some(enemy => enemy.id === 'yard-hound-1'));
    console.log(JSON.stringify({ acceptance: { passed, noJump: true, noMutations: true, survived: outcome.mode === 'playing', firstEnemyDefeated: !first(outcome), hpBefore: telegraph.hp, hpAfter: outcome.hp, tells, maxCommittedThreats } }));
    if (!passed || maxCommittedThreats > 1) process.exitCode = 1;
  }
  console.log(JSON.stringify({ scenario, tag, milestones, errors }, null, 2));
} catch (error) {
  await move(0);
  console.error(error.message);
  console.log(JSON.stringify({ scenario, tag, milestones, final: await read(), errors }, null, 2));
  await page.screenshot({ path: `.artifacts/${tag}-${scenario}-failure.png` });
  process.exitCode = 1;
} finally {
  await browser.close();
}

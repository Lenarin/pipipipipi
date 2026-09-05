# Readable Combat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Execute tasks sequentially with task review; controller independently plays the game.

**Goal:** Implement the approved P0/P1 combat baseline, making readable attacks and non-jump evasion the first acceptance gate.

**Architecture:** Keep Phaser actors and Arcade bodies. Extract enemy attack timing/shape decisions and short player action rules into small game-specific modules where independently testable. Scene orchestrates these modules and owns rendering/input/lifecycle; no second simulation loop.

**Tech Stack:** Phaser 4.2.1, TypeScript, Vite, Vitest, Playwright.

**Spec:** docs/superpowers/specs/2026-09-05-readable-combat-design.md

## Global Constraints

- Phaser 4 + TypeScript + Vite. Phaser owns simulation, rendering, input and lifecycle.
- Preserve the photograph-based protagonist, pixel art, Batumi, municipal black comedy and three-stage route.
- Do not initialize Git, install an engine, replace source images or remove existing user work.
- Keyboard/mouse browser gameplay. No mobile, network, parry, stamina or procedural-generation expansion.

## Task 1: Replace ambiguous combat with readable, escapable encounters

**Files:** src/gameplay/{Combat,Player,Enemy,Rules}.ts; src/scenes/GameScene.ts; src/game/{CombatEffects,art}.ts; src/levels/index.ts if encounter spacing needs it. Create focused enemy timing/presentation modules under src/gameplay or src/game. Tests: tests/combat.test.ts, new tests/enemy-attacks.test.ts and tests/browser/readable-combat.spec.ts; update existing behavioural tests only where the approved contract intentionally changes.

**Interfaces:** Keep AttackChain.request(facing), advance(delta), cancel(), state/currentProfile/phaseProgress; allow an optional current-intent argument to advance. Keep Player.updateMovement and Enemy.updateAi orchestration, extending typed input/profile fields explicitly. New pure EnemyAttackCycle module exports start/advance/cancel and state, facing, progress, active/recovery indicators; no Phaser dependency. Scene consumes enemy attack shape from the same profile used by its rendered telegraph and weapon.

- [x] Write and run RED regression tests proving current combo reversal and enemy attack ambiguity. First independent pure test:
```ts
const chain = new AttackChain();
chain.request(1); chain.request(-1); chain.advance(255);
expect(chain.state.facing).toBe(-1); // each next swing honours buffered/current intent
```
Real-browser checks include: a ready dash while holding opposite movement travels in that direction; moving behind a committed enemy causes no hit; jumping does not freeze the enemy's active/recovery transition; standing inside a visible active strike DOES hurt; recovery cannot deal damage. Use fixture setup only to isolate collision rules, separate natural play.
- [x] Implement EnemyAttackCycle with fixed facing, real active/recovery phases and bounded timers; begin with generous reaction windows (roughly 500–650ms regular anticipation and 400–650ms recovery), then tune by browser evidence. Hound charges are fixed-direction, not homing. Boss alternates slam/volley, armoured and readable when enraged.
```ts
// Shape and presentation consume this single authoritative state:
type EnemyPhase = 'idle' | 'windup' | 'active' | 'recovery' | 'stagger';
// An active attack consumes at most one successful player damage per attack.
// Vertical separation only gates NEW attacks, never advances already-committed timers.
```
- [x] Integrate directional damage and visible anticipation/stroke/recovery. Replace symmetric range damage and circle-only tells. Use code-native weapon/arm/silhouette movement plus existing sprite poses. Swept player strike coverage uses Phaser geometry, no custom physics. Limit simultaneous attack starts and suppress new offscreen threats.
- [x] Repair player intent, dash direction/buffering/visible immunity, variable jump, combo cancellation and distinct swing trajectories. Keep platform traversal viable. Clear queued actions at pause/death/restart/transition; preserve hitstop responsiveness.
- [x] GREEN: focused tests, full unit suite, build, readable-combat browser suite. Existing tests whose expectations encode old facing locks must be corrected to the approved behavior, not deleted wholesale. Self-review and report test evidence.

## Task 2: Add the minimum tactical choices and readable controls

**Files:** src/gameplay/{Combat,Rules,Player}.ts and small ActionState module; src/scenes/GameScene.ts; src/game/{CombatEffects,bridge}.ts; src/ui.ts, index.html, src/style.css (confirm actual stylesheet path); tests/rules.test.ts and new action tests/browser tactical-choice tests; README.md, DESIGN.md.

**Interfaces:** WeaponKind = 'pipe' | 'heavy'; current weapon state belongs to RunRules and is reflected in GameSnapshot. AttackChain takes a weapon profile when starting an idle chain, without changing a live swing underneath collision. Ability cooldown uses RunRules. Healing uses begin/cancel/advance semantics, calls existing heal only on completion. Cache choice is a short scene/UI state, reset by lifecycle actions.

- [x] RED: tests for delayed healing (HP/flasks unchanged until completion, interruption spends nothing); two weapons produce different timing/reach outcomes; ability respects cooldown and interrupts normal enemies; cache choices apply exactly once and reset on replay.
```ts
// Representative independently-derived acceptance assertions:
// start heal at 40 HP, advance 400 ms -> 40 HP, 2 flasks;
// finish 750 ms uninterrupted -> 75 HP, 1 flask;
// cancel at 400 ms then advance -> 40 HP, 2 flasks.
```
- [x] Implement pipe/heavy swap on R, kick on F, channel Q, cache E then 1/2 choice. Holding movement, attacking, dashing or taking a hit cancels healing. Heavy active stroke is deliberately committed but dash request buffers until its legal cancel window; HUD/pose makes risk visible.
- [x] Add concise Russian HUD labels and control hints, healing/ability/roll progress cues. Keep existing settings and mobile-sized shell functional. Do not let DOM choices trigger combat under the overlay.
- [x] GREEN: pure and real-browser tactical tests, all regression suites, build. Update docs with actual controls and testable mechanics. Self-review and task report.

## Task 3: Whole-game verification and handoff (controller)

**Files:** scripts/playtest-readable.mjs, docs/VERIFICATION-0.3.md, this plan and task ledger; implementation fixes route to responsible worker.

- [x] Play the first fight with real keyboard input, no player/AI mutations or artificial immunity. Record positions/phases/HP read-only and capture windup, active, recovery, dodge, punish. Repeat retreat defence and two-enemy sequence.
- [x] Run `npm test`, `npm run test:browser`, `npm run build`; production preview smoke without DEV globals. Review screenshot legibility and browser console. Check pause/focus/restart and all gates.
- [x] Independent final review of changed code vs spec and natural-play evidence; fix important defects, rerun covering tests.
- [x] Record exact coverage and remaining subjective limitations in docs/VERIFICATION-0.3.md. Mark completed tasks only when evidenced; hand off a working local URL with short controls.

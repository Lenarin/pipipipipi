# Combat feel P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver the entire user-approved P0 list: readable weighted forward pipe combat with reliable input and unambiguous feedback.

**Architecture:** Retain Phaser scene/Arcade ownership and the existing AttackChain. One authoritative attack phase drives sprite poses, contact geometry, forward impulse, trail and audio. Feedback never increases the damaging reach. These integration tasks share that contract and execute sequentially in the existing feature checkout.

**Tech Stack:** Phaser 4.2.1, TypeScript, Vite, Vitest, Playwright. No new dependencies.

**Spec:** User-approved P0 table in the conversation, 2026-09-06, transcribed below.

## Global Constraints

- One pipe only; three forward strikes, damage 1 / 1 / 2; no automatic backwards strike or hammer.
- Initial windup/active/recovery timings: 100/80/150, 120/80/170, 180/100/240 milliseconds (330/370/520 total).
- Add complete-body preparation and follow-through poses; preserve photograph-derived hero identity, black clothing, pixel art and Batumi setting.
- Weighted attack movement only. Walking acceleration, landing polish, new enemy death animation and other P1 features are excluded.
- Draw a short pixel trail along the visible pipe sweep, including misses. Impact flash and directed fragments originate at actual contact, never on misses.
- Hitstop 50/55/85 ms for the three steps, once per swing; input remains accepted; group hits cannot extend it.
- Light recoil retains ordinary enemies in combo range, finisher recoil is stronger and decays. Boss committed attacks remain resistant to interruption.
- Distinct swing/impact/finisher/kill sounds with deterministic variants, played through Phaser sound.
- One next-attack buffer, expires after 180 ms of simulation time, refreshing an existing buffer does not create extra actions. Dash cancels all attack phases and flushes buffer/geometry.
- Existing enemy tells stay readable and retain actual damage timing. Effect layers must not cover overhead danger cues.
- Verify real browser movement, collisions, animations, pause/focus/restart and 1v1/1v2 combat; do not equate test success with human approval of feel.

## Task 1: Combat timing, buffering and impulse contract

**Files:** modify `src/gameplay/Combat.ts`, `src/gameplay/Player.ts`, `tests/combat.test.ts`; create `tests/combat-feel.test.ts`.

**Interfaces:** retain AttackChain.request/advance/cancel and AttackProfile. Add `attackVelocity(peak, phase, progress, facing, direction)` as pure attack-only velocity envelope; Player applies it with Arcade velocity. Use profile.lunge × 5 as peak velocity for compatibility.

- [x] Add failing tests for exact phase boundaries, stale buffered input, fresh recovery input and cancel clearing, same chain across 30/60/120 Hz.
  ```ts
  const chain = new AttackChain(); chain.request(1); chain.request(1);
  chain.advance(330); expect(chain.state.phase).toBe('idle');
  chain.request(1); chain.advance(220); chain.request(1); chain.advance(110);
  expect(chain.state.step).toBe(2);
  ```
- [x] Run `npm test -- tests/combat.test.ts tests/combat-feel.test.ts`; confirm behavior fails, then implement timings, bounded queue and phase-aware impulse.
  ```ts
  // Active interval: rapid acceleration then deceleration; recovery releases momentum.
  const envelope = progress < .25 ? Math.sin(progress * Math.PI * 2) : 1 - (progress - .25);
  // Recovery continues from 25% peak and decays quadratically to zero.
  ```
- [x] Run focused tests, then all unit tests. Update fixtures that intentionally encoded superseded timings without weakening behavioral assertions.

## Task 2: Weighted full-body art and shared geometry

**Files:** new `public/assets/hero-combat-v5-source.png`, `src/game/spriteFrames.ts`, `src/game/spriteAtlas.ts`, `src/scenes/BootScene.ts`, `src/gameplay/Player.ts`, sprite tests.

**Interfaces:** append 24 hero poses at atlas frame40; preserve legacy kick/actions indexes. New `pipeFrame(step, phase, progress)` returns source pose 0..23, `HERO_PIPE_POSES` registers source pixel hand/tip coordinates. Use existing contactInWorld transformation; no second animation clock.

- [x] Add browser tests requiring nonblank new frames, visible contact markers and more than four distinct full-body attack poses.
- [x] Generate reference-preserving 24-pose sheet with built-in imagegen. Inspect output, import with existing component packing, register feet at stable scale and hand/tip coordinates on the actual image.
  ```ts
  const offset = (step - 1) * 8;
  // windup: 0,1,2; active:3,4; recovery:5,6,7
  ```
- [x] Check both facings, atlas clipping and unchanged Arcade body; retain jump/roll/heal/hurt/death behavior.

## Task 3: Trail, localized contact, recoil and hitstop

**Files:** `src/game/CombatEffects.ts`, `src/scenes/GameScene.ts`, `src/gameplay/Enemy.ts`, `src/game/EnemyAttackPresentation.ts`; browser combat-feel tests.

**Interfaces:** CombatEffects owns decorative Phaser Graphics trail/impact; strikeSweep remains authoritative geometry. `Enemy.receiveHit(damage, direction, finisher = false)` differentiates recoil. Resolve hit position from intersecting strike/target bounds. Frame/geometry/timing share phase progress.

- [x] Add failing browser checks: miss trail/no contact flash; impact within target and near weapon; once-per-swing hitstop even for multiple targets; light/strong recoil distance; dodge clears attacks and queued input during hitstop.
- [x] Render a translucent short-lived pixel ribbon connecting consecutive pipe positions, on depth4 below actors/cues. Draw compact contact stars and directed particles at depth5; retain damage labels below enemy cue lane.
- [x] Make recoil velocity decay during stagger; use light peak55/stagger180ms, finisher peak180/stagger260ms initially. Keep bosses resistant while committed; protect enemy facing from knockback-driven flips.
- [x] Render distinct recoil poses; add reaction sheet if existing poses cannot communicate impact. Raise danger cues above decorative feedback, retain existing telegraph collision contract.
- [x] Run focused browser tests and existing readable-combat/tactical regressions. Review screenshots at gameplay scale.

## Task 4: Layered pipe sound

**Files:** `scripts/generate-audio.mjs`, new versioned WAVs in `public/assets/audio`, `src/game/CombatAudio.ts`, `src/scenes/BootScene.ts`, `src/scenes/GameScene.ts`, `tests/audio.test.ts`.

**Interfaces:** `CombatAudio.swing(step)`, `.impact(step)`, `.kill()` use Phaser sound with small nonrepeating variant rotation. No custom runtime audio engine.

- [x] Add failing generated-asset checks (valid PCM, bounded peaks, non-silent and distinct variants) and browser sound-event checks for misses versus hits.
- [x] Extend deterministic generator with pipe air-swish, transient/body/ringing impact layers, lower/heavier third impact and kill confirmation. Save separate versioned names; don't overwrite old assets.
- [x] Load optional audio; preserve mute and pause. Limit overlapping impact sounds per swing while retaining per-target visual confirmation.
- [x] Generate WAVs, run audio tests and inspect waveform statistics; verify real Phaser playback/mute calls in the browser. Human listening remains a documented acceptance limitation.

## Task 5: Integration verification and handoff

**Files:** browser tests, `README.md`, `ASSETS.md`, version metadata, `docs/VERIFICATION-0.5.md`, prompt provenance JSON.

- [x] Run `npm test`, `npm run build`, `npm run test:browser` and production smoke. Check console errors and missing assets.
- [x] Exercise ordinary-input 1v1 and 1v2 dodge/combo encounters, resistant boss cancellation semantics and 30/60/120-Hz timing/geometry invariants; inspect no-number/without-audio readability.
- [x] Record evidence, limitations and exact image prompts. Request independent code review, address concrete findings, rerun affected checks.
- [x] Run `git diff --check`; commit verified scoped changes on the current feature branch. No merge, push or remote publication.

## Progress

- Baseline: clean `feat/sprite-combat` at 5669b26; 38 unit tests passed.
- Execution: inline, because animation, collision, impulse and feedback share a single attack-phase contract; no independent implementation agents.
- Completed: new 24-pose pipe and 12-pose recoil sheets; authoritative phase/geometry/impulse integration; local trail/contact feedback; once-per-swing hitstop; decaying recoil; 12 original PCM variants; finite input latch/buffer.
- Additional red/green fixes: preserve down/up taps between updates and cap attack movement before crossing a nearby target. Existing timing fixtures updated without dropping their behavioral assertions.
- Final verification: 47/47 unit tests, 54/54 Chromium tests in one run without retries, TypeScript/Vite build, production smoke, ordinary-input dodge/group probes, both-facings contact review and gameplay-scale sprite inspection. Details and limitations: `docs/VERIFICATION-0.5.md`.
- Independent review: no critical/important findings; minor contact-Y/segment-distance assertions added. P0 committed on the current feature branch; merge/push awaits user direction.

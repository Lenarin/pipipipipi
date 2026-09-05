# After Rain Implementation Plan

> **Implementation resumed and prototype delivered, 2026-09-05.** Phaser 4 + TypeScript + Vite is running. The original milestone breakdown is retained below. See README.md for current launch instructions and docs/VERIFICATION.md for evidence. The directory is still not a Git repository.

**Goal:** Deliver a playable, complete browser pixel-art action game set in Batumi with a photo-referenced protagonist.

**Architecture:** Phaser scenes use the engine's rendering, Arcade Physics, cameras, input, animation, loading, sound and effects. TypeScript modules describe combat, enemies, level data and run progression. Vite serves development and builds a static site without a backend.

**Tech Stack:** Phaser 4, TypeScript, Vite, built-in Arcade Physics. No separate rendering or physics library.

**Spec:** `docs/superpowers/specs/2026-09-05-after-rain-design.md`

## Global Constraints

- Russian UI; desktop keyboard and optional mouse attack.
- Original protagonist based on supplied photograph; fictional gloomy Batumi.
- Complete run, three enemy types, boss, death and restart.
- No accounts, remote state, paid runtime services or external image references.
- Start from an official Phaser TypeScript/Vite template; verify any reused platformer example's license and Phaser 4 compatibility.
- Use Phaser systems for engine responsibilities. Do not implement a separate renderer, physics solver or game loop.
- Working content decisions: city-mysticism enemies, salvaged blade, health/damage caches, exits gated by clearing enemies. These are provisional prototype choices, not separately approved story canon.

## Task 1: One playable courtyard

Planned files: `src/main.ts`, `src/game/config.ts`, `src/scenes/BootScene.ts`, `src/scenes/GameScene.ts`, `src/gameplay/Player.ts`, `src/levels/courtyard.ts`, `package.json`, `tsconfig.json`, `vite.config.ts`.

Engine boundary: Phaser.Game owns the loop and scene lifecycle. GameScene creates Arcade Physics bodies/colliders, binds Phaser input and manages camera following. Player translates input into engine-body movement and game-specific action state. Typed level data supplies platform placement. Interfaces will follow the selected starter's established structure.

- [x] Select and inspect the official TypeScript/Vite starter and license; use built-in Arcade Physics without copying a platformer example.
- [x] Replace the preliminary package scripts and custom-simulation test contract with the selected Phaser project structure. Do not create `src/simulation.js` to satisfy old fixtures.
- [x] Implement one courtyard with Phaser bodies and colliders, camera following, running, jumping and dodging.
- [x] Verify movement, landing, jump limits, viewport resizing, focus loss and input release in the actual browser runtime.
- [x] Make the courtyard available for movement review; validate and refine movement in the browser before final full-route verification.

## Task 2: One complete combat encounter

Planned files: `src/gameplay/Combat.ts`, `src/gameplay/Enemy.ts`, `src/gameplay/RunState.ts`, `src/scenes/HudScene.ts`, game-rule tests, character and enemy assets under `public/assets/`.

Engine boundary: Phaser overlap/collision events feed combat rules; animation and time events drive attack phases. Game rules own health, hit registration, action cooldowns and run status. The engine owns animation playback, sound and visual feedback.

- [x] Validate character-art transparency, aligned frame bounds and consistent scale; prepare Phaser animations.
- [x] Add one enemy, readable attack windup, melee attacks, dodging, damage and death/restart.
- [x] Test game-specific immunity, one-hit-per-swing and healing bounds with meaningful fixtures. Verify their integration with engine overlaps in the browser.
- [x] Tune combat with the one-encounter build before expanding enemy variety.

## Task 3: Full route and presentation

Planned files: the remaining level descriptions, enemy behaviors, boss logic, upgrade rules, menu/result scenes and local game assets.

- [x] Apply clearly stated provisional content decisions when the user resumes implementation: city mysticism, salvaged blade, caches, gated exits.
- [x] Expand the courtyard into the residential district and port, with three enemy types and a final boss.
- [x] Add the agreed upgrades, transitions, victory and immediate replay.
- [x] Use Phaser systems for rain, hit effects, camera shake, animation and sound. Add title, pause, settings and control hints.

## Task 4: Delivery verification

- [x] Provide Vite development and production-build commands, producing a portable static site in `dist`.
- [x] Run the game-rule tests and verify complete progression, boss victory, death/restart and pause/resume in the browser.
- [x] Verify the production build, inspect desktop screenshots and check smaller viewports for layout overflow.
- [x] Document controls, scope, asset provenance/licensing and local run/deployment instructions; keep the preview running for handoff.

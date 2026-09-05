# Black Comedy Combat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the core fight feel physical and readable inside a playable, darkly funny Batumi courtyard.

**Architecture:** Retain the Phaser scene and Arcade actors. Extract attack timing into a small pure module and combat visuals into a Phaser-owned effects helper. The scene integrates them; architectural decoration and level data stay separate.

**Tech Stack:** Phaser 4.2.1, TypeScript, Vite, Vitest, Playwright.

**Spec:** docs/superpowers/specs/2026-09-05-black-comedy-combat.md

## Global Constraints

- Phaser 4 + TypeScript + Vite remain the approved engine stack. Phaser owns physics, rendering, animation and time.
- Keep the photo-referenced bespectacled hero and existing three-stage run.
- Retain keyboard controls and optional shake/sound.
- No new engine, unrelated dependencies, copied Dead Cells assets or editor tooling.
- This checkout has no Git metadata. Preserve files in place, retain review artifacts, and do not create a repository or claim commits.

### Task 1: Combat feel and actor reactions

Requirements and exact interfaces are in `.superpowers/sdd/2026-09-05-black-comedy-combat/task-1-brief.md`.

- [x] Add failing tests for attack phases, queued combo, finisher recovery, cancellation and per-swing hits.
- [x] Implement phase-driven combat and Phaser effects; integrate movement, enemy reactions, hitstop and lifecycle cleanup.
- [x] Run focused tests and build, self-review, then independent task review.

### Task 2: Playable city and black-comedy presentation

Files: `src/game/art.ts`, new `src/game/architecture.ts`, `src/levels/courtyard.ts`, `src/game/spriteImport.ts`, `src/game/presentation.ts`, `index.html`, `src/style.css`, docs and focused tests. Main agent owns this task alongside the independent combat task, without touching its files.

- [x] Test one-pixel outline import preservation and elevated courtyard encounter / route constraints before implementation.
- [x] Add architectural platform supports, shopfronts, balcony rails, air conditioners, roof fixtures and municipal comedy signage. Keep architecture behind actors and landable edges in front.
- [x] Add a connected upper route and an elevated enemy to the courtyard. Preserve ground route and existing upgrades.
- [x] Outline imported actors, lower backdrop contrast, add dark-comedy title/result/world copy and clear combo instructions.
- [x] Verify pure tests, then integrate with Task 1 and run browser tests.

### Task 3: Verify integrated run and handoff

- [x] Exercise visible combat phases, hit reactions, dash cancel, pause during hitstop, death/restart, rooftop access and all-stage progression with Playwright.
- [x] Inspect title/gameplay/action screenshots. Fix concrete readability or reachability issues.
- [x] Run full unit/browser suites and production build. Obtain independent whole-change review and handle findings.
- [x] Update product/design/readme and verification evidence; keep the local game available.

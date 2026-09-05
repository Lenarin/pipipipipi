# После дождя: first-version design

The user accepted a complete mini-game scope, supplied a hero photograph, and specified a gloomy Georgian city, Tbilisi or Batumi. The working design chooses a fictional Batumi and desktop keyboard controls. On 2026-09-05 the user approved Phaser 4 + TypeScript + Vite and later explicitly resumed implementation. The playable prototype now follows this design; README.md documents actual scope and commands.

## Gameplay

The accepted scope is a short side-scrolling run with jumping, melee combat, dodging, three enemy types and a final boss. The proposed route has three neighborhoods: courtyard, concrete district, port. Proposed details include a second jump, a short attack combo, invulnerable dodge, two healing charges, optional side paths and upgrade caches. Three enemy behaviors are proposed: melee pursuit, ranged attacks and fast charges. Victory and death offer a clean restart. Estimated first run is 5–10 minutes; actual timing depends on skill.

For implementation, the agent stated provisional choices: city-mysticism enemies, a salvaged blade, health/damage caches with flask recovery, and gates unlocked by clearing the current stage. These are reversible working choices, not individually approved story details. Upper platforms are one-way for fluid jumping; ground remains solid. The prototype uses six caches across three stages. These choices do not change the approved engine.

## Architecture

Phaser 4 + TypeScript + Vite, shipped as a static browser game. Phaser owns rendering, the game loop, Arcade Physics, scenes, cameras, input, animations, resource loading, sound, timers, tweens and particles. Physics and rendering must use the engine's systems. No separate PixiJS, Rapier or `@pixi/sound` integration is planned.

Start from an official Phaser TypeScript/Vite template and evaluate a compatible, appropriately licensed platformer example before reusing it. No specific example is selected yet. Planned project boundaries:

- `src/main.ts`: start a Phaser.Game using the shared configuration.
- `src/game/config.ts`: engine, resolution, scaling and Arcade Physics configuration.
- `src/scenes/`: loading, menu, gameplay, HUD and run-result scenes.
- `src/gameplay/`: player actions, enemy behaviors, hit/damage rules and run progression.
- `src/levels/`: typed level descriptions, platforms, encounter placements and transitions.
- `public/assets/`: local character, environment, animation and audio resources.

The first playable milestone is one courtyard, the photo-referenced hero and one enemy. It establishes movement and combat before expanding into the full run. A visual level editor is not required.

The preliminary custom-simulation scaffold was replaced with Vite scripts, pure rule tests and real Phaser browser integration tests. Do not reintroduce the obsolete custom engine API.

## Controls

A/D or arrows: move. Space/W/up: jump. J or left mouse button: attack. K/Shift: dodge. E: open nearby cache or travel through an unlocked exit. Q: heal. Escape: pause. M: mute. Menus support keyboard focus and Enter.

## Art

Original pixel-art sprites based on the supplied photo, retaining hair, glasses, beard and black casual clothing. Generated character art is a source asset until frame alignment, consistent scale and true transparency have been verified. City art is combined with Phaser-rendered scenery and effects. Approved game assets will be copied into `public/assets`; the game must not depend on the original photo path or a remote image service at runtime.

## Failure handling and verification

Use Phaser scene and physics pause/resume handling on blur or a hidden document, clear held input and prevent time catch-up on returning. Guard localStorage and audio availability. Missing art shows an explicit load error with retry. Verify movement and collision in the real Phaser runtime; test game-specific damage immunity, one-hit-per-swing, healing bounds and progression rules independently where appropriate. Verify death/restart, boss victory, browser interactions and the Vite production build; inspect real screenshots. Documentation changes alone do not establish any of these checks as passing.

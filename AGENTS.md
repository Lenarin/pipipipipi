# Project guidance

## Approved technology decision

Use **Phaser 4 + TypeScript + Vite**. The user explicitly chose a framework with more built-in game systems and approved this decision on 2026-09-05.

- Use Phaser's scene lifecycle, renderer, Arcade Physics, cameras, input, animation manager, loader, sound, timers, tweens and particles.
- Do not introduce PixiJS, Rapier, `@pixi/sound`, a custom physics solver, or an independent rendering/game loop. Implement game-specific rules on top of Phaser.
- Bootstrap/configuration follows the official Phaser TypeScript/Vite template (MIT, attribution in THIRD_PARTY_NOTICES.md). No external platformer-example code is used. Check license and Phaser 4 compatibility before adding any in the future.
- Store level data in project files. A separate visual level editor is not required for the first version.

## Scope and current phase

The project is a short browser pixel-art action platformer inspired by Dead Cells. Version 0.8 is “Ларик. Пока горячий”: a sunny comic delivery campaign through Batumi, its airport and an American suburb. Retain the supplied photographs as Larik and Mark character references, the existing combat tuning, and the approved seven-scene story. The newer campaign specification supersedes the old gloomy-city direction. See README.md and the design documents for details.

The user explicitly resumed implementation on 2026-09-05. The project now has a Phaser/Vite runtime. Preserve the existing gameplay and use the browser tests when changing engine integration.

The obsolete custom-simulation test scaffold has been replaced by `tests/rules.test.ts` and browser integration tests. Do not introduce `src/simulation.js` or a separate engine loop.

## Verification

Test game-specific combat and progression rules separately where useful. Verify movement, collision, animation, pause/resume, focus loss and restart in the actual Phaser browser runtime. Do not claim the game runs or tests pass until those checks have been performed.

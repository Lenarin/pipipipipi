# После дождя

## Register

product

## Users

Players who want a short browser action platformer inspired by Dead Cells. The first version targets a computer with a keyboard and a landscape display.

## Product Purpose

A complete single-player run through a fictional, gloomy Batumi, from an old residential courtyard to the waterfront. Move, jump, dodge readable attacks, fight three enemy types, collect upgrades, and defeat a port guardian. Death allows immediate replay.

## Technology Decision

The user approved Phaser 4 + TypeScript + Vite on 2026-09-05 to maximize reuse of built-in game systems and subsequently resumed implementation. Use Phaser's Arcade Physics, scenes, cameras, input, animations, loading, sound and effects. Game-specific combat and progression rules sit on top of the engine. Level data stays in project files; no separate visual editor is needed.

## Brand Personality

Black comedy in an atmospheric, tactile city. The apocalypse is another municipal inconvenience: rent, closed offices, exhausted neighbors and eternal utility bills. Humor targets bureaucracy and everyday absurdity, never Georgian identity. The hero is based on the user's photograph: dark swept hair, rectangular black glasses, beard, black sweatshirt and trousers. The city combines Georgian balconies, concrete apartment buildings, rain, warm shop windows and port infrastructure.

## Anti-references

No medieval castle setting, glossy website dashboard, stock hero character, or busy interface obscuring enemies. The photograph is a character reference, not a UI image.

## Design Principles

- Movement and combat feedback are the core of the experience.
- A physical three-hit rhythm, readable anticipation and strong contact matter more than adding more enemies or levels.
- The city should feel like a place, with different landmarks along the route.
- Balconies and roofs are playable, architecturally supported surfaces, not floating platforms in front of a city picture.
- Enemy attacks must be readable before they deal damage.
- The player always knows the next destination and can restart immediately.
- Use original art informed by the reference, not Dead Cells assets.

## Accessibility & Inclusion

Russian UI, visible keyboard controls, high-contrast attack telegraphs, optional camera shake and sound, pause on focus loss, and keyboard-operable menus. Health and cooldowns use labels as well as color. Touch and gamepad controls are outside this first version.

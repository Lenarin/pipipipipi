# Ларик. Пока горячий

## Register

product

## Users

Players who want a short browser action platformer inspired by Dead Cells. The first version targets a computer with a keyboard and a landscape display.

## Product Purpose

A complete single-player delivery from sunny Batumi through its airport to an American suburb. Three chapters, seven scenes and 43 lines connect the existing pipe combat and upgrade routes. Mark, the police chief and Agent Miller each guard a chapter; E explicitly starts their introduction and the post-combat outcome. Death allows immediate replay from Nastya's opening call.

## Technology Decision

The user approved Phaser 4 + TypeScript + Vite on 2026-09-05 to maximize reuse of built-in game systems and subsequently resumed implementation. Use Phaser's Arcade Physics, scenes, cameras, input, animations, loading, sound and effects. Game-specific combat and progression rules sit on top of the engine. Level data stays in project files; no separate visual editor is needed.

## Brand Personality

Absurd black comedy about delivering one khachapuri while it is hot. Bright sunny comic visuals supersede the earlier noir direction. Humor targets bureaucracy and everyday absurdity, never Georgian identity. Larik retains the user's photograph reference: dark swept hair, rectangular black glasses, beard and black clothes. Mark uses the user's second photograph interpreted as a simplified cartoon. Raw photographs never appear in the game. Georgian balconies and a bakery, airport terminal and American suburban house distinguish the chapters.

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

Russian UI, visible keyboard controls, high-contrast attack telegraphs, optional camera shake and sound, pause on focus loss, and keyboard-operable menus. Dialogue can be revealed, advanced or skipped with the same story outcome; it freezes combat, projectiles and world clocks. Health and cooldowns use labels as well as color. Touch, gamepads, voice acting, branching and run saves are outside this version.

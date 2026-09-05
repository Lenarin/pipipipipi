# v0.4 — sprite combat verification

Status: verified and ready for user playtest.

Date: 2026-09-06. Branch: `feat/sprite-combat`; baseline: `3e95cbe` on `main`.

## Implemented

- Five new generated source sheets, 68 full-body frames: 40 hero, 16 ordinary enemies, 12 boss. Hero idle/run retain the pipe; attacks, kick, roll, healing, hurt/death and jump/landing have their own poses. Enemy walk, anticipation, contact and recovery use sprite frames. No overlay limbs or stretched weapon rectangles.
- Only the pipe remains. Three forward strokes, damage multipliers 1 / 1 / 2 (16 / 16 / 32 at level 1); timings 65/70/120, 75/75/130, 110/100/220 ms remain for anticipation/contact/recovery. Input buffers one follow-up. A ready dash cancels any pipe phase. F cancels pipe attacks and interrupts ordinary enemies, not the boss.
- Contact markers are measured on the selected source pose; atlas registration and collision share those coordinates. Finite segment sweep connects successive active contact frames, with a 5-world-pixel pipe thickness. Kick contact exists only on the extended boot frame. No backward active poses.
- Hero Arcade body remains 20.625×41.25 world pixels with the previous position relative to the actor. Enemy bodies do not stretch or rotate with their attack pose. Ordinary walker/hound reach was shortened to their actual hand/jaw silhouette; the boss retains a 132 px directional, visibly drawn ground shockwave.
- Original reference-derived source art is preserved. New art and the full built-in-imagegen prompt set are documented in `ASSETS.md` and `SPRITE-PROMPTS-0.4.json`.

## Verification record

- `npm test`: 38 tests passed across 8 files on final gameplay source.
- `npm run build`: TypeScript and Vite production build passed.
- `node scripts/smoke-production.mjs`: production 4173 start, keyboard input, pause, restart, 100/100 HP, no development scene handle, no page errors or failed requests.
- Final `npm run test:browser`: 45/45 Chromium tests passed in one full run (2.2 min), including all three stage gates, boss combat, victory, pause/resume, focus loss and replay.
- New browser cases verify all 68 atlas frames contain artwork without magenta, pipe/boot markers touch opaque pixels, all three strokes hit only forward in both facings, damage 16/16/32 once per target, fixed body geometry, four roll/heal poses, death animation with frozen physics and clean replay, enemy pose selection without scaling/rotation.

Earlier failures and fixes: the geometry and same-frame gate-transition fixtures assumed `Body.reset()` immediately applies sprite offsets. Phaser's reset uses the full frame top-left until synchronization; the fixtures now explicitly call `body.updateFromGameObject()` before synchronous collision assertions. Their real collision/transition checks are preserved. The new death/replay test initially looked for the pause-screen replay text; corrected to the actual death-screen button. Dedicated rerun: 5/5 sprite/transition tests passed.

## Ordinary-input probes

These automated probes read scene state to choose input but do not teleport, grant immunity, change HP, or rewrite AI during the fight. They are not a substitute for a human playtest of subjective feel.

- `node scripts/playtest-readable.mjs dodge v04`: dodged through the committed first attack and defeated the first walker with 100 HP, no jumps, at most one committed enemy attack.
- `node scripts/playtest-readable.mjs group v04`: first walker and first hound defeated; 3 kills total, 100 HP, no jumps; seven observed telegraphs and at most one committed threat.
- `node scripts/playtest-readable.mjs retreat v04`: walking out of the telegraphed attack avoided damage, without jumping or dashing.
- `node scripts/inspect-tactics.mjs`: natural-input kick visibly connected and interrupted the walker without HP damage; pipe HUD correct. Separate, explicitly positioned cache fixture verified one health upgrade, resumed combat and unclipped 680×500 choice UI.
- `node scripts/inspect-sprites.mjs`: inspected live game, six pipe contact poses and hero/enemy/boss contact sheets at game scale. Inspected natural kick screenshot and production screenshot as well. Artifacts are in ignored `.artifacts/`; scripts reproduce them.

## Limits

Desktop Chromium tested. No claim of Firefox/Safari, touch/gamepad or low-end-device acceptance. Animation is discrete pixel-art key poses (four per attack/action), not skeletal interpolation. Three stage gates, boss combat, victory and replay are integration fixtures; a complete unassisted human run has not been measured. User feedback still determines whether combat feels good.

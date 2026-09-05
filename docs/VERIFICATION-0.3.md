# v0.3 verification record

Status: v0.3 implementation complete. Final reviewed source:36unit/42browser tests and production build/smoke passed. The chronological record below includes earlier failures and their corrections; gameplay feel remains subject to user feedback.

## Approved scope

See [readable combat spec](superpowers/specs/2026-09-05-readable-combat-design.md) and [execution plan](superpowers/plans/2026-09-05-readable-combat.md).

## Baseline evidence

- Before production changes: `npm test`, 22 tests passed; `npm run build`, TypeScript/Vite passed.
- These tests did not establish good combat feel. Existing mechanics had whole-chain facing lock, damage before enemy lunge, continuous enemy tracking and windup frozen by vertical separation.
- `node scripts/playtest-readable.mjs observe baseline`: first windup at approximately 1.8s, 100 HP; active/charge at approximately 2.24s, 86 HP while the enemy had not yet travelled. Screenshot shows essentially idle enemy pose when damage occurs.
- `node scripts/playtest-readable.mjs dodge baseline`: normal-input first fight, no jump or state mutation, defeated first walker with 86 HP remaining. Enemy follows the player behind after the first dodge.

## Evidence classification

`tests/browser/*` can use fixture setup to isolate collision/lifecycle/progression. Those fixtures are not a natural-play or difficulty claim.

`scripts/playtest-readable.mjs` uses only normal keyboard/menu input to act. `page.evaluate` only reads positions, phases and HP. It includes a recognition delay before responding to a tell. It does not use jump, healing, artificial immunity, teleportation or AI changes. It is a deterministic input probe, not a substitute for the user's subjective assessment.

Screenshots under `.artifacts/` are inspected for silhouettes, visible stroke, danger/recovery distinction, HUD occlusion and camera framing.

## Final verification

Controller results after connected kick/boot presentation, before the action-overlap review fix:

- `npm test`: 7 files,36 tests passed.
- `npm run build`: TypeScript passed; Vite transformed26modules and produced the production bundle in605ms.
- `npm run test:browser`:35passed in1.6min; inherited `NO_COLOR` removed only from the command's process environment, so output is free of the earlier colour-setting notice.
- `node scripts/smoke-production.mjs`: start, keyboard input, pause, restart and100HP all pass on4173; no DEV `__GAME__` handle, browser errors or failed requests. Inspected production screenshot.
- `node scripts/playtest-healing.mjs`: rerun after final build passed with86HP/2flasks during channel and cancellation,100HP/1flask after completion; no browser errors.
- Task2 review found two uncovered overlaps: F could cancel heavy-active commitment, and Q could start inside an existing attack/dash/kick. Both were reproduced in RED browser cases, fixed and approved by scoped re-review.

After that review fix and final copy adjustment, the controller reran:

- `npm test`:36passed in7files.
- `npm run test:browser`:37passed in1.7min, including both new action-overlap regressions; no colour-environment warning.
- `npm run build`:TypeScript/Vite GREEN,26modules,586ms.
- `node scripts/smoke-production.mjs`:production start/input/pause/restart pass,100HP reset, no dev handle/errors/failed requests.
- `node scripts/playtest-healing.mjs`:normal-input delayed/cancel/completed healing remains GREEN with86→100HP and exactly one flask spent only at completion.

Broad final review found two cross-feature lifecycle defects not covered by those37tests: cancelling a cache under global pause resumed physics/time, and a healing/kick action survived a stage transition. One final fixwave also separates an overlapped enemy timing cue/HP bar. These runs do not yet cover that fixwave and do not imply a subjective fun guarantee.

### Final reviewed source

- All final-review findings were fixed in one wave and approved by scoped re-review; no introduced breakage found. New final-fix browser file reproduced4failures/1pass before correction and passed5/5 afterwards;25covering browser cases passed.
- Root inspected `.artifacts/timing-health-lanes-v03.png`: segmented anticipation row and solid HP row are separated with a visible gap.
- Fresh controller `npm test`:36passed in7files. `npm run build`:26modules,574ms, TypeScript/Vite GREEN.
- Refreshed production smoke on the final game source passed: startup/input/pause/restart,100HP, no dev handle/browser errors/failed requests.
- The first final42case run had41passes and1failure in the older melee/heal/replay fixture: it pressed Q after a fixed250ms delay while attack recovery could still be active. The approved guard correctly kept HP40. The fixture now waits for actual attack idle, preserving all HP/replay assertions and all production behavior. Focused repetition passed3/3; the full42case rerun passed42/42 in1.9min with no environment warnings.
- Independent broad review and the single final scoped re-review are approved. The subsequent one-line fixture wait was checked by the controller; no production behavior changed.
- Working development URL: http://127.0.0.1:5173. Verified built preview: http://127.0.0.1:4173. No publish/PR/merge was performed. Source snapshots and review artifacts remain under `.superpowers/sdd/2026-09-05-readable-combat/` because this workspace has no Git history.

Normal-input acceptance after the ground-stroke corrections:

| Probe | Result | Qualification |
| --- | --- | --- |
| First walker, dodge and counter |100HP, enemy defeated,2tells|No jump/heal/player or AI mutations|
| First walker, retreat |100HP, enemy misses and recovers|Walking only|
| First group |3kills,82HP,6tells, maximum1committed attack|Both walkers and first hound defeated; no jumps/heal/mutations|
| Kick interruption |100HP, first walker windup becomes stagger, cooldown consumed|Normal approach and F; kick pushes/interrupts, not a damage attack|
| Healing |86HP/2flasks during channel/cancellation;100HP/1flask on completion|Real enemy injury and normal keys|
| Boss fixture fight |52HP, boss defeated, both patterns and enrage observed|Port placement/other-enemy removal fixture; real keys thereafter, no HP/immunity/cooldown edits|

`scripts/inspect-tactics.mjs` also inspected the heavy windup and weapon label. Its separate cache-position fixture opens the tray, applies health once (120maxHP), and resumes idle/unpaused without an attack. At680x500 document width is680 and all three buttons fit inside the viewport. Inspected desktop/compact screenshots: clear focus/choice, no clipping. A detached debug-like kick rectangle was replaced by a connected leg/boot and directional shove strokes; re-captured and checked visually.

One boss probe was interrupted by Vite hot reload while source was still being edited (`__GAME__` unavailable mid-run); the stable-source rerun passed. This is not counted as a gameplay failure or hidden from the record.

## Limits of this verification

- Ordinary-input acceptance covers the first grounded fights, retreat, dodge, kick and healing. The entire three-stage route/victory is covered by integration fixtures; this record does not claim a fresh-start, unaided full-run victory.
- The boss fight starts from an isolated port fixture. Its combat uses normal keys, but its result is not a measure of complete-run difficulty.
- Browser coverage is desktop Chromium. The680x500 check verifies responsive keyboard UI, not touch/mobile support.
- This remains a prototype with initial timing/reach tuning and existing reference-based sprite assets. Readability and dodge affordances are improved and tested; whether the combat now feels satisfying is for play feedback, not automated assertions.

### Core preview, before final task reviews

- `node scripts/playtest-readable.mjs observe core-preview`: captured separate windup, active and recovery. Standing still takes 14 damage during active, not anticipation. Enemy remains committed left throughout recovery.
- `node scripts/playtest-readable.mjs dodge core-preview`: first walker defeated, 100 HP remaining, two tells encountered, no jumps/stat mutation. Enemy misses to the original side after the player crosses behind.
- `node scripts/playtest-readable.mjs retreat core-preview`: walked out of range, retained 100 HP, enemy reached recovery normally.
- Inspected three phase screenshots. Found round placeholder weapon head and recovery tip below pavement; requested angular tool detail and grounded recovery, plus less debug-like warning brackets. This preview is not the final visual acceptance.

### Reviewed core implementation

- Implementer final core run: 28 unit tests, 25 browser tests, build passed. Report and exact RED/GREEN evidence retained under `.superpowers/sdd/2026-09-05-readable-combat/task-1-report.md`.
- Tightened `group` probe requires the first hound actually defeated, not merely any two kills. It passed with both walkers and the first hound defeated, 82 HP remaining, nine tells, ordinary ground input only.
- `node scripts/inspect-boss.mjs`: explicit port fixture (isolate boss and position player; no HP or immunity modification). Slam windup100HP, active76HP, recovery76HP, volley windup76HP then58HP. Captured/inspected warning extent, armoured silhouette, slam wave and cast pose. This does not claim natural completion of the port.
- Task review identified volley-hit ownership and stale player dash/jump buffers on pause. Fix round1 covering26browser/build passed; scoped re-review approved both fixes. Enemy world phases remain frozen through pause, rather than cancelled for free.
- `node scripts/playtest-boss.mjs`: port-position/other-enemy-removal fixture only; fighting thereafter uses real keys with no HP/immunity/cooldown modification. Boss defeated in approximately10s at58HP remaining, both slam/volley and enraged phases observed, no browser errors. A bot positioning branch was subsequently corrected; final whole-game pass will rerun the corrected probe.

### Tactical layer RED

`node scripts/playtest-healing.mjs` initially exits1: a real enemy injury gives86HP/2flasks, Q immediately changes it to100HP/1flask. The probe will require delayed completion and movement cancellation with no resource spend.

### Tactical layer independent preview

- `node scripts/playtest-healing.mjs` GREEN with ordinary input and actual enemy damage: before/channel/cancelled all86HP/2flasks; uninterrupted completion100HP/1flask. No browser errors. Inspected healing progress screenshot: literal Q progress and scene channel cue are visible, and the incoming enemy remains unobscured.
- `node scripts/playtest-readable.mjs dodge tactical-preview` GREEN: first walker defeated with100HP, two tells, maximum one committed enemy threat, no jumps or state mutation. Inspected windup screenshot and compact weapon/F/Q/Shift status strip.

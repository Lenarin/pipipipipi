# Autonomous control and visual polish, 2026-09-06

User direction: controls feel too fast and the added inertia is frustrating. Work autonomously for approximately 2-3 hours; do not stop after one quick pass. Preserve Phaser 4, the photo-derived protagonist, Batumi, one pipe and forward 1/1/2 combo. No merge or publication.

Work started: 2026-09-05 23:57:52 UTC (02:57 local). This is an execution journal, not a completed-release claim.

## First checkpoint

- Baseline v0.5 empty-street probe: 62.65 world pixels of involuntary movement over an unsteered combo; peak attack velocity 359.3 px/s versus 185 walking. Walk-release drift 3.08 px (one Arcade frame).
- Removed automatic lunge entirely. Position follows held input: walking 150 px/s, all attack phases 90 px/s, release immediately requests zero velocity. Dash is 380 px/s for 180 ms, and no longer retains dash velocity on its final inactive frame. Old reach/lunge fields and unused impulse helper removed.
- Revised full stroke timings: 120/100/200, 140/100/220, 190/130/300 ms (420/460/620 totals). One finite input buffer lasts 240 ms, covering a fresh recovery press without restoring early ghost attacks. Damage stays 16/16/32.
- Camera release probe found 19.53 px of extra scroll in 260 ms after stopping. Phaser follow now uses a 55 ms time-based coefficient, reducing that to 9.49 px. Follow freezes on pause/cache/hitstop; fixed vertical framing and deadzone preserved.
- New generated enemy attack sheet supplies four full-body anticipation, two contact and two recovery poses per ordinary enemy. Old bodies, attack shapes, commitment and boss rules unchanged. At this checkpoint: 128 packed frames (64 hero, 52 enemies, 12 boss).
- Native Phaser ground shadow follows the nearest actual level surface, shrinks with jump height, and restrained pooled droplets mark steps/landings. No added physics or independent update loop.
- Red/green checks reproduced involuntary attack movement, excessive active/dash speed, camera coasting, frozen enemy anticipation and missing ground contact feedback before their implementation.
- Checkpoint verification: 47 unit tests; one full 64/64 Chromium run without retries, including traversal, boss, victory, focus/pause, restart, all packed frames and contact markers. FPS probes requested 30/60/120 Hz, measured approximately 27.6/60.0/110.6; all retained full combo damage. New speeds required traversal fixtures to stop by position rather than old fixed hold durations.

## Second checkpoint

- Independent read-only review of2bc6ca8..40a1209 found no critical/important defects. Minor ground-emitter pause issue reproduced and fixed with a browser regression.
-16 ordinary/boss defeat poses and16 boss attack poses added after the first24 ordinary enemy anticipation poses. Total160 packed frames; complete silhouettes inspected at game scale. Source prompts inSPRITE-PROMPTS-0.6.json.
- Defeat is non-blocking: gameplay body/reward/gate resolution is immediate and idempotent. Native sprite animation collapses, then fades. A cosmetic Phaser tween lowers airborne remains to a surface; no residual enemy collider or custom physics step. Pause/focus/hitstop/restart own its lifecycle.
- Smaller directional impact chips and fragments leave actors visible. Damage labels moved above contact; heavy camera impulse reduced from0.008 to0.0035, player-hurt impulse to0.004. Restart and disabling shake reset any current impulse.
- Ground emitter freezes with pause/cache/hitstop; shadows and remains share a cosmetic surface lookup. Nearby code-native architecture gains irregular plaster wear, recessed arcades, shutter grooves, balcony detail and wet paving highlights, without changing geometry.
-10,000-swing unit stress test exposed stale-token retention. RunRules now retains only the current hit set and never reuses pre-restart tokens. Red/green coverage confirms both.
- Natural-input group/retreat probes preserved100HP, with no jump, HP/immunity injection or AI changes. Isolated boss fight (placement/removal fixture only) passed with100HP, both attack types and both health phases.
- A full natural-input route passed all three stages and19 enemies, acquired one damage cache, climbed to the rooftop spitter, healed normally and reached victory with87HP/one flask. About119.3s simulation time; this is a controller that knows the route, not a novice playtime claim. Artifact:.artifacts/v06-first-run.json; reproduce withnode scripts/playtest-run.mjs.
- Full70-test Chromium run passed without retries after boss animation import.49 unit tests and TypeScript/Vite build passed; the subsequent two cosmetic edge-case fixes passed12 targeted browser checks. Longer production checks still pending at this journal entry.

## Extended-lifecycle findings

The first production soak was invalidated because synthetic blur was not paired with focus. Web Audio was correctly suspended, but the already-focused headless window could not emit the OS focus event when the test clicked Resume. Three queued one-shots stayed alive while its audio clock was stopped; a focus event restarted the clock and released them. The harness now pairs focus events and a browser regression checks native audio unlock/return.

A separate real cleanup leak remained: after eight ordinary UI restarts, textures grew from 44 to 116 and update-list entries from 14 to 30, with the visible child count unchanged. Installed Phaser source confirmed that DisplayList.removeAll(true) means detach with skipped callbacks, not destroy. Stage rebuilding now calls each remaining GameObject's native destroy() on a stable copy, releasing text canvases, rain emitters and update entries. The repeat-restart regression now keeps all three counts identical; six targeted lifecycle/death/transition tests passed after this correction. A fresh 90-round production soak is running against the corrected build.

## Continuing work

Prepare and inspect short non-blocking defeat animations, refine contact visuals and nearby material detail, then repeat natural-input combat and extended lifecycle/runtime checks. User playtest remains necessary to judge subjective feel. Any experimental change that fails acceptance will be left out of the release.

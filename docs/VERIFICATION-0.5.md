# v0.5 — P0 weighted pipe combat verification

Date: 2026-09-06. Branch: `feat/sprite-combat`; implementation baseline: `5669b26` (v0.4). No new dependencies, renderer, physics solver or engine loop.

## Delivered contract

- Three forward pipe strikes, damage 16 / 16 / 32 at level 1. Windup / active / recovery: 100/80/150, 120/80/170, 180/100/240 ms. No hammer or backward strike.
- Eight complete-body poses per stroke, driven by the same phase/progress as the contact markers and attack movement. New 24-pose hero and 12-pose enemy-recoil sources; fixed body sizes, hero likeness, existing actions and Batumi retained. 104 packed frames including 12 unused legacy pipe frames.
- Attack-only acceleration/deceleration envelope and forward movement cap at a nearby target. Light stagger peaks at 55 px/s for 180 ms; finisher at 180 px/s for 260 ms, both decay. Ordinary walking remains responsive; committed boss attacks retain resistance.
- A short translucent pipe trail also appears on misses. Contact stars and directional fragments originate at the intersecting body/weapon location. Decorative history does not enlarge damaging reach. Overhead danger cues render above contact effects.
- Hitstop 50 / 55 / 85 ms, once per swing, not per target. Fresh input is captured while stopped. One 180 ms simulation-time buffer; refresh cannot add a second command. Ready dash cancels attack, buffer, hitstop and geometry. Very short keyboard taps survive release between updates.
- Twelve original PCM assets: three variants each for swing, impact, heavy impact and kill. Phaser owns loading, playback, volume and mute. Old audio preserved. Sources and exact built-in-imagegen prompts: `ASSETS.md`, `SPRITE-PROMPTS-0.5.json`.

## Verification record

- `npm test`: 47 tests across 10 files passed on the implemented gameplay source.
- `npm run build`: TypeScript and Vite production build passed.
- `node scripts/smoke-production.mjs`: production start, keyboard input, pause and restart; 100/100 HP; no development scene handle, page errors or failed requests.
- Final `npm run test:browser`: 54/54 Chromium checks passed together in one run (2.8 minutes), without retries.
- New unit coverage: phase boundaries, stale/fresh/refresh input, cancellation, event order at 30/60/120 Hz and attack impulse. Audio tests generate real WAVs into a temporary test directory and check PCM headers, non-silence, bounded peaks and distinct variants.
- New browser coverage: brief real keypress; stationary full combo without crossing its target; full-body poses/trails; localized two-target contact and one hitstop timer; decaying recoil; Phaser sound events distinguishing misses, hits and finisher. Existing movement, double jump, landing, dash, pause/resume, blur, healing, kick, cache, stage transition, boss and replay coverage retained.
- FPS browser probes configure Phaser's own timeout-backed loop at bootstrap, only through a Playwright route. Latest full-run measurements: requested 30 / 60 / 120 Hz, observed 27.2 / 58.8 / 108.0 Hz. All three preserved 64 total damage, a positive target gap and dash cancellation. Three separate repetitions of each configuration also passed (9/9). This is not a native 120 Hz display or low-end hardware certification.
- Independent read-only code review: no critical or important findings. Addressed the minor request to assert contact Y bounds and distance to the weapon segment. Reviewer additionally exercised delayed second-target hits after the first hitstop, in both facings: damage applied without restarting hitstop.

## Red/green findings and test corrections

- A new real-keyboard stationary-combo test initially exposed the forward lunge crossing its target (negative final gap). Fixed by capping attack intent through Arcade velocity against living bodies ahead, without teleporting or adding a custom solver. The complete combo now retains forward contact.
- An ultra-short real keypress exposed Phaser `JustDown` losing down/up within one update interval. A Phaser keyboard event latch now captures discrete actions, with lifecycle cleanup. Holding the key still cannot autofire.
- Phaser 4 removed the old color-argument `setTintFill` API. The reaction flash now uses `setTint` and `TintModes.FILL` with an explicit restore; the browser console check caught the incompatible call before delivery.
- Earlier fixtures encoded v0.4's shorter windups and effectively infinite attack queue. They now enter phases through current profiles and queue fresh recovery input. All-stage boss progression presses after recovery instead of using the obsolete 280 ms repeat interval. Stage-transition kick setup now seeds the movement buffer after kick startup, avoiding an unintended dash race.
- Three old browser checks intermittently missed short phases through default polling or raced the end of hitstop. The shake check observes durable three-hit damage; the hitstop check captures animation/physics state at the actual hitstop event; the geometry fixture synchronously advances the real controller to active. Each corrected case passed three consecutive repetitions (9/9) before the final suite.
- One earlier full run stalled on the loading overlay in the test-only 120 Hz bootstrap. It did not reproduce in nine subsequent focused FPS probes or the FPS portion of the final run. No speculative gameplay change was made. Failed FPS cases now attach Phaser loop, loader and scene state for diagnosis if it returns.

## Ordinary-input and visual probes

- `node scripts/playtest-readable.mjs dodge v05`: first walker defeated, 100 HP, no jump, two observed tells and at most one committed enemy attack.
- `node scripts/playtest-readable.mjs group v05`: first walker and first hound defeated, two kills, 100 HP, no jumps, seven observed tells and at most one committed attack.
- These scripts select ordinary keys from read-only scene observations. They do not teleport, grant immunity, change HP or rewrite AI during the fight. They are automated probes, not human playtests.
- `node scripts/inspect-feel.mjs`: actual Phaser screenshots inspected at game scale: localized contact, the same contact without damage numbers and with sound muted, and all 24 pipe poses. No clipped weapon/body or magenta; preparation, forward contacts and follow-through remain distinct. Captures are explicit positioned/paused visual fixtures, not evidence of a natural run. Reproducible artifacts are ignored under `.artifacts/feel-v05-*.png`.

## Limits

P0 implementation only. Walking acceleration, landing polish, camera redesign and new death animations remain P1. Desktop Chromium tested; no claim of Firefox, Safari, touch, gamepad or low-end-device acceptance. Audio waveform/content and real playback calls are verified, but human listening on speakers/headphones is still needed. Automated tests and inspected still frames cannot approve subjective combat feel: the next acceptance check is the user's playtest.

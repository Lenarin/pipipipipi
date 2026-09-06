# v0.6 — direct control and readable enemy animation

Date: 2026-09-06. Branch: `feat/sprite-combat`; baseline: `2bc6ca8` (v0.5). Phaser 4.2.1, TypeScript and Vite retained. No dependencies, custom physics or independent game loop added. No merge, push or publication.

## Delivered contract

- Walk speed 150 px/s; attack movement 90 px/s only while a direction is held. No automatic attack lunge, acceleration or release coast. Dash 380 px/s for 180 ms, with no residual dash velocity on its final inactive frame.
- Three forward pipe strikes remain 16 / 16 / 32 damage. Windup / active / recovery are 120/100/200, 140/100/220 and 190/130/300 ms. One finite 240 ms input buffer; holding attack cannot autofire. Existing dash/kick cancellation, coyote time and variable/double jump retained.
- Native camera follow settles with a 55 ms coefficient and freezes during hitstop, pause and cache choice. Smaller finisher/hurt impulses; restart and disabling effects clear an impulse already in progress.
- 56 new complete enemy/boss poses: 24 ordinary attack, 12 ordinary defeat, 16 boss attack and 4 boss defeat. All 160 packed frames are nonempty, have transparent outer borders and no magenta key fringe. Source registration preserves body sizes and existing numeric frame indexes.
- Four anticipation poses precede every enemy attack. Defeated actors stop participating in combat immediately; visual-only native sprites collapse and fade. Airborne remains settle with a native tween, never a residual collider. These visuals pause and clean up with the scene.
- Directional contact chips, quieter fragments, higher damage labels, ground shadows and pooled step/landing droplets improve contact without covering enemy cues. Local plaster, shutters, arcades and paving gain material detail without changing collision geometry.
- Stage rebuild destroys old native Phaser objects rather than detaching them. Current swing hit bookkeeping is bounded and token IDs cannot alias across restarts. Fullscreen uses Phaser centering alone, without a second CSS layout offset.

## Verification

| Check | Observed result |
| --- | --- |
| `npm test` | 49 tests across 10 files passed |
| `npm run build` | TypeScript and Vite production build passed; current JS `index-D9OFtuXd.js` |
| `npx playwright test --reporter=line` | 75/75 Chromium checks together twice: 4.4 and 4.5 minutes, no retries |
| Native Phaser timeout-loop combat probes | Requested 30 / 60 / 120 Hz; measured 27.48 / 59.03 / 110.68 Hz; all retained 64 combo damage, positive spacing and dash cancellation; repeat measured 28.31 / 59.20 / 110.32 Hz |
| Installed Edge production smoke | 152.0.4191.62: start, input, pause, restart, centered fullscreen and exit passed |
| Installed Chrome production smoke | 151.0.7922.138: same checks passed |
| Production development isolation | No `window.__GAME__`, page errors or failed asset requests in either channel smoke |
| Repeated real UI restart regression | Textures, update-list entries and display children remain identical across 8 restarts |
| Focus/audio lifecycle | Paired blur/focus suspends/resumes native Web Audio; completed one-shots release to the single ambience voice |
| 90-round production soak after cleanup fix | 560.6 seconds, reward earned in all rounds, no deaths or browser/request errors; listeners remain 98, DOM +12 then plateau, forced-GC heap +1.04 MiB |
| Subfolder hosting and high-DPI | Real local static server mounted only at `/game/`, device scale factor 2: assets, start, input and restart passed |
| Repeat soak on final packaged build | Another 90/90 rewarded rounds, 561.2 seconds; zero errors/deaths, listeners 98, DOM +12 then plateau, forced-GC heap +1.85 MiB |
| Fullscreen geometry | 1440×1000 and 1920×800: symmetric margins, 16:9 canvas, exit/restart functional |

The soak measures retained growth after forced GC, not peak memory or low-end hardware performance. The two outputs are `.artifacts/v06-fixed-production-soak.json` and `.artifacts/v06-release-production-soak.json`. A first soak with unmatched synthetic blur was invalidated, not counted as a game audio defect; the real object cleanup leak was then separately reproduced and fixed. See `NIGHT-0.6.md` for the investigation.

## Control measurements and complete routes

Empty-street controller fixture (`scripts/probe-control.mjs`) measured involuntary three-hit movement falling from 62.65 world pixels to zero. Unsteered attack peak velocity fell from 359.3 px/s to zero. After movement release, extra camera travel over 260 ms fell from 19.53 to 9.49 pixels. This camera comparison uses the revised walk speed on both sides.

Ordinary-input probes choose real keyboard events from read-only scene observations. They do not teleport, remove opponents or inject health, immunity, damage, cooldowns or stage commands during the route:

- Group and retreat probes: 100 HP, no jumping; group probe defeated the first walker and hound with at most one committed threat at a time.
- Complete default-loop route: all three stages, rooftop spitter, cache upgrade, ordinary healing and all 19 enemies; victory with 87 HP and one flask in 119.3 simulation seconds.
- Complete requested-30-Hz route on final gameplay: same full route; victory with 81 HP and one flask in 113.6 simulation seconds, final observed rate 27.79 Hz. Artifact: `.artifacts/v06-final-30-run.json`.
- Complete requested-120-Hz route on final gameplay: victory with 87 HP and one flask in 123.4 simulation seconds, final observed rate 110.27 Hz. Artifact: `.artifacts/v06-final-120-run.json`.
- Isolated boss probe uses an explicit positioning/removal fixture, then ordinary input: both attacks and both phases survived with 100 HP. It is not presented as a whole-run result.

These are route-aware automated controllers, not human playtests or estimates of first-time completion speed.

## Visual inspection and review

Actual Phaser captures were inspected at game scale: contact with and without numbers, all pipe poses, ordinary attack/death poses and both pages of boss poses. The first boss diagnostic capture clipped raised anchor tips at its viewport edge; splitting it into two pages fixed the artifact. The frame-border regression separately verifies the atlas itself is not clipped.

New raster assets were authored with built-in imagegen using existing art as identity references. Saved source paths and exact prompts: `ASSETS.md` and `SPRITE-PROMPTS-0.6.json`. The original personal photograph is not shipped. Environmental detail and combat/ground effects remain code-native Phaser graphics.

Two independent read-only reviews found no critical or important issues. The first review's ground-particle pause finding and the second review's diagnostic capture finding were addressed and rechecked. A follow-up review also confirmed the fullscreen change and its regression test.

## Reproduce

```sh
npm test
npm run test:browser
npm run build
# With dev on :5173 and production preview on :4173:
node scripts/playtest-run.mjs v06-check-30 30
node scripts/soak-production.mjs 90 v06-check
node scripts/smoke-production.mjs http://127.0.0.1:4173 msedge
node scripts/smoke-production.mjs http://127.0.0.1:4173 chrome
node scripts/smoke-subpath.mjs
node scripts/inspect-boss-v06.mjs
```

Do not rebuild `dist` while the production soak is running. Probe captures and JSON live in ignored `.artifacts/`; generated source assets and prompts are committed.

## Limits

Desktop Chromium and installed Chromium-based browsers tested. No Firefox, Safari, touch, gamepad, native 120 Hz display or low-end-device certification. Waveform/content and actual Phaser audio playback events are checked, but human listening on speakers/headphones is still needed. The user's next playtest is the acceptance check for subjective combat feel.

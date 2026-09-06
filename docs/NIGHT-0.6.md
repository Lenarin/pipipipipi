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

## Continuing work

Prepare and inspect short non-blocking defeat animations, refine contact visuals and nearby material detail, then repeat natural-input combat and extended lifecycle/runtime checks. User playtest remains necessary to judge subjective feel. Any experimental change that fails acceptance will be left out of the release.

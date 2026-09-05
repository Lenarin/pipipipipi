# Readable combat / v0.3

Approved in chat: the P0/P1 mechanics table, followed by “Да, все верно. Вперед в работу”. This is an architectural revision of the existing combat flow, not a new engine or game.

## Constraints

- Phaser 4 + TypeScript + Vite. Phaser owns simulation, rendering, input and lifecycle.
- Preserve the photograph-based protagonist, pixel art, Batumi, municipal black comedy and three-stage route.
- Do not initialize Git, install an engine, replace source images or remove existing user work.
- Keyboard/mouse browser gameplay. No mobile, network, parry, stamina or procedural-generation expansion.

## P0 combat contract

1. Enemy attacks have distinct anticipation, active and recovery phases. The actual damage occurs during the visible active phase only, in a directional shape matching the visible weapon/lunge/projectile.
2. Enemy facing/aim is committed at attack start; crossing behind avoids the attack. Vertical separation does not freeze an attack already underway. Every miss completes and has a punish window.
3. Telegraphs use pose plus shape/direction plus a time-to-impact cue, with optional sound. Amber preparation, red active danger, subdued/cyan recovery; geometry and pose distinguish them without colour alone. No flashing generic circles as the only cue.
4. Normal strikes are interruptible. Boss attacks are visibly armoured; regular attacks cannot erase a committed boss move. Hound charges have a fixed direction and single-hit token.
5. A real dash has fixed travel direction, immediate immunity, readable start/end and cooldown. Movement input chooses its direction even during a combo. It passes through enemies and ordinary attacks; cooldown can buffer a slightly early request. Ordinary combo phases are dash-cancellable; no stale buffered attack fires afterwards.
6. Player movement does not reverse held input during a lunge. Each new combo swing uses current intent. Inputs survive hitstop and obey pause/restart/focus clearing. Variable-height jump, coyote allowance and double jump remain usable for existing balconies.
7. Player swings have distinguishable pose/trajectory/rhythm. Use existing source poses and code-native weapon/limb animation; do not edit reference rasters. Damage geometry is derived from the shown stroke and swept between updates to avoid missed hits at low frame rates. Sound plays on an actual swing, not queue acceptance.
8. Hit reactions/short hitstop/particles are readable, not occluding. Existing post-hit immunity becomes visible and prevents multi-hit bursts. Pause/focus loss clears stale player input buffers and dash travel without refilling air jumps; enemy phases/projectiles freeze and resume at their remaining timing, so pause cannot erase an enemy attack. Death, transition and restart clear action state and never freeze the new scene. A launched visible projectile has its own active lifetime, independent of caster recovery; each cast/volley shares one successful-hit token.
9. Encounter scheduling limits overlapping threats: first melee encounter isolated, later enemies take attack slots with spacing. Offscreen enemies do not start unannounced attacks. Camera shows useful space in front and keeps the street visible.
10. Acceptance: from a fresh start, normal input only, no jump/heal/stat mutation, approach the first melee enemy, wait for a tell, dodge through, punish its recovery and survive. Also verify retreat-to-miss and two-opponent readability. Integration fixtures remain explicitly labelled, never passed off as natural gameplay.

## P1 minimum depth

- Preserve and differentiate walker, spitter, hound and boss roles. Boss alternates learnable patterns with a readable enraged phase, rather than random untelegraphed choices.
- Provide two deliberately distinct weapons: fast close pipe and slower long/heavy tool, switchable with a documented key. Their reach/risk/animation differ and their hit shapes match the artwork.
- One active ability with a meaningful tactical role: a short-range kick/shockwave that interrupts/pushes ordinary threats on cooldown, no blanket permanent safety.
- Healing is channelled and interruptible by hurt or explicit combat/movement actions; no flask is consumed before successful completion. A visible progress cue explains the commitment.
- At a cache choose damage or health, visibly preview both choices, commit once and keep choice through stage transitions; restart resets the run. Existing short route, boss, victory and quick replay remain.
- HUD and concise Russian controls document weapons, ability, dash, healing and cache choices without covering enemy cues. Preserve settings, pause and responsive shell.

## Verification

Unit tests for pure action rules and real Phaser browser tests for integration. Each gameplay change starts with a reproducing failing test. Capture enemy windup/active/recovery and an ordinary-input first fight. Run all unit tests, browser tests, build and production smoke. Record exact results and limits in docs/VERIFICATION-0.3.md; never equate a green suite with subjective combat quality.

# Visual system

## Scene and atmosphere

A player at a desktop in the evening enters a rainy coastal city; the game fills the center of a quiet dark page. Petroleum-blue stone and faded plaster contrast with warm shop lights and pale mint combat effects.

## Palette

Full palette with named roles: ink surfaces, fog text, sea-glass actions, amber wayfinding, rust-red danger. CSS uses OKLCH; Phaser rendering uses equivalent sRGB colors.

## Typography and layout

Russian condensed display title, readable monospace secondary labels. A restrained top wordmark, chapter location, sound and fullscreen controls surround a dominant 16:9 game viewport. Pixel-edged controls and restrained borders. No decorative cards or dashboard metrics.

## Game rendering

Phaser 4 rendering at 640 by 360 logical game resolution and nearest-neighbor scaling, with a closer gameplay camera. Generated Batumi background and photo-referenced character sprites; a restrained one-pixel actor rim separates black clothing from the dark city. Keep the distant panorama muted and architectural foreground surfaces clearly edged. Georgian wood-and-iron balconies, open arcades, service kiosks and roofs use the actual landable platform coordinates. Use Phaser's animation, camera and effects systems. Verify sprite-frame alignment and actual transparency before using generated art. A subtle vignette is allowed; it must not obscure enemies.

## Tone and combat

Dry municipal black comedy lives in shop signs, enemy names and short result copy. Keep moment-to-moment instructions literal. Combat has visible anticipation, whole-body sprite keyframes, directional contact sparks, brief hitstop, stagger and a heavier third strike. Warm danger cues and pale mint player attacks must remain distinguishable; effects never become opaque disks over the fight.

## Interaction

Mint primary action, amber interact prompts, rust-red damage. Menus use semantic HTML buttons. Combat UI only shows health, healing charges, weapon, progress and the current objective. Screen overlays handle title, pause, death and victory.

The compact combat strip names the single pipe, its upgrade level and the 1–1–2 damage combo. F kick cooldown, Q healing channel and Shift dash state are text, never colour alone. There is no weapon switch. All three strokes make contact in front; the third has double damage and a longer recovery. A ready dash can cancel any pipe phase.

Full-body sprites own the arms, legs and pipe; do not overlay line-drawn limbs or stretch/rotate the standing sprite to simulate attacks. Contact markers come from the selected source pose. Idle/run/death use Phaser animations; combat, kick, healing and enemy commitments select keyframes from their authoritative action phase. Freeze those phases on pause/focus loss and hitstop. Collision bodies retain fixed dimensions across poses. Ordinary enemy melee ranges match their hands/jaws; the boss anchor additionally sends a visibly marked ground shockwave.

A cache opens an inline choice tray inside the game shell. Its two semantic buttons preview damage +6 or maximum health +20, including the shared flask recovery. Keyboard alternatives 1 and 2 are visible; Escape cancels. The tray freezes combat and clears held input before returning to play, without becoming a generic page modal.

Version 0.6: attacks use eight authored full-body poses and 420/460/620-ms phase schedules. Immediate input registration is separate from a finite 240-ms one-action buffer. Remove involuntary attack advance: held input directly requests walking at150px/s or attack movement at90px/s, and release requests zero immediately. The180-ms dash peaks at380px/s. Native camera follow uses a55-ms time coefficient and stops following during hitstop/pause. Light recoil keeps targets available to the next stroke, while the finisher gives a stronger decaying push. Pipe trails sit behind actors; compact impact flashes sit below overhead danger cues. Hitstop is 50/55/85 ms, once per swing, with input still accepted. Avoid impact effects on misses and avoid sound/stop stacking when hitting groups. Four full-body anticipation poses precede every enemy attack, including both boss commitments. Four-pose defeat animations remain visual-only: gameplay removal and rewards are immediate, no corpse can block a gate. A native tween settles airborne remains onto the cosmetic surface below before fading. Ground shadows and restrained pooled droplets give jump/landing contact; they freeze with the action. Nearby plaster, shutters, arcades and paving gain irregular wear and recess depth without changing landable geometry. Preserve readable edges and the dark clear space behind combat.

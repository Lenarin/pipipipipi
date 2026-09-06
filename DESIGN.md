# Visual system

## Scene and atmosphere

Version 0.8 uses sunny comic daylight: Batumi bakery balconies, an airport terminal and an American suburban house. A warm paper page surrounds the game. This approved campaign supersedes the earlier rainy noir direction; existing hero controls and combat tuning remain unchanged.

## Palette

Warm paper surfaces, dark ink text, teal actions, terracotta accents, amber wayfinding and rust-red danger. CSS uses OKLCH; Phaser rendering uses equivalent sRGB colors.

## Typography and layout

Russian condensed display title, readable monospace secondary labels. A restrained top wordmark, chapter location, sound and fullscreen controls surround a dominant 16:9 game viewport. Pixel-edged controls and restrained borders. No decorative cards or dashboard metrics.

## Game rendering

Six generated portrait identities each have neutral, warm and intense expressions, speaking and blinking variants. Dialogue positions look inward and leave the semantic HTML text panel clear. Enter/Space first reveals a line and then advances it; skip applies the same campaign effect exactly once. A separate native Dialogue scene runs while Game is paused; Escape/focus loss pauses both and resume preserves the current line. Background montages change with chapter transitions. Final asset paths and exact generation requests: `docs/SPRITE-PROMPTS-0.8.json`.

Phaser 4 rendering at 640 by 360 logical game resolution and nearest-neighbor scaling, with a closer gameplay camera. Generated chapter backgrounds and photo-referenced character sprites use readable outlines against sunny architecture. Keep the distant panorama moderate in contrast and architectural foreground surfaces clearly edged. Georgian wood-and-iron balconies, open arcades, terminal canopies and suburb roofs use actual landable platform coordinates. Use Phaser's animation, camera and effects systems. Verify sprite-frame alignment and actual transparency before using generated art. Do not reintroduce the old rain or dark vignette.

## Tone and combat

Dry municipal black comedy lives in shop signs, enemy names and short result copy. Keep moment-to-moment instructions literal. Combat has visible anticipation, whole-body sprite keyframes, directional contact sparks, brief hitstop, stagger and a heavier third strike. Warm danger cues and pale mint player attacks must remain distinguishable; effects never become opaque disks over the fight.

## Interaction

Mint primary action, amber interact prompts, rust-red damage. Menus use semantic HTML buttons. Combat UI only shows health, healing charges, weapon, progress and the current objective. Screen overlays handle title, pause, death and victory.

The compact combat strip names the single pipe, its upgrade level and the 1–1–2 damage combo. F kick cooldown, Q healing channel and Shift dash state are text, never colour alone. There is no weapon switch. All three strokes make contact in front; the third has double damage and a longer recovery. A ready dash can cancel any pipe phase.

Full-body sprites own the arms, legs and pipe; do not overlay line-drawn limbs or stretch/rotate the standing sprite to simulate attacks. Contact markers come from the selected source pose. Idle/run/death use Phaser animations; combat, kick, healing and enemy commitments select keyframes from their authoritative action phase. Freeze those phases on pause/focus loss and hitstop. Collision bodies retain fixed dimensions across poses. Ordinary enemy melee ranges match their hands/jaws. Mark's commitments, the chief's frontal shield and recovery, and Miller's forward volley and reinforcement call remain visually distinct.

A cache opens an inline choice tray inside the game shell. Its two semantic buttons preview damage +6 or maximum health +20, including the shared flask recovery. Keyboard alternatives 1 and 2 are visible; Escape cancels. The tray freezes combat and clears held input before returning to play, without becoming a generic page modal.

Version 0.7: attacks use twelve authored full-body poses with unchanged total 420/460/620-ms schedules. Preparation/active/recovery are 140/120/160, 150/120/190 and 200/150/270 ms. A strongly coiled silhouette is held for the middle 60% of preparation; four forward contact poses trace each stroke. Diagonal, lower sweep and overhead finisher remain three forward attacks with 1/1/2 damage. The visibly longer steel pipe also appears in idle/run. Transparent frame padding is wider, never the Arcade body. Source-measured pipe edges and their swept interiors share the same geometry as the mint/amber translucent trail. Include crossed keyframes and the active-to-recovery boundary exactly once. Faded trails cannot hit new targets. Small contact tolerance is 3.5 px per side, not an invisible range extension. Verify close targets, low hounds and a stationary full combo at 62 px with real recoil in both facings.

Immediate input registration is separate from a finite 240-ms one-action buffer. No involuntary attack advance: held input directly requests walking at 150 px/s or attack movement at 90 px/s, and release requests zero immediately. The 180-ms dash peaks at 380 px/s. Native camera follow uses a 55-ms time coefficient and stops following during hitstop/pause. Light recoil keeps targets available to the next stroke, while the finisher gives a stronger decaying push. Pipe trails sit behind actors; compact impact flashes sit below overhead danger cues. Hitstop is 50/55/85 ms, once per swing, with input still accepted. Avoid impact effects on misses and avoid sound/stop stacking when hitting groups. Each campaign faction and boss uses its own authored anticipation/contact/recovery frames, including Mark's lunge/heavy strike, the chief's charge/baton and Miller's volley/retreat. Variant-specific collapse frames remain visual-only: gameplay removal and rewards are immediate, no corpse can block a gate. A native tween settles airborne remains onto the cosmetic surface below before fading. Ground shadows and restrained neutral dust mark steps and landings; they freeze with the action. Nearby plaster, shutters, arcades and paving gain irregular wear and recess depth without changing landable geometry. Preserve readable edges and uncluttered daylight space behind combat.

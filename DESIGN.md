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

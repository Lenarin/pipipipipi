# Larik Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved bright three-chapter delivery campaign, seven talking-head scenes and three distinct bosses without losing v0.7 combat feel.

**Architecture:** Typed narrative data and transactional campaign rules are independent of presentation. Phaser owns dialogue presentation, world suspension, actors and effects; the existing bridge exposes accessible text and commands. Enemy role, boss identity and level art are data-driven.

**Tech Stack:** Phaser 4.2.1, TypeScript, Vite, Vitest and Playwright; existing local imagegen asset pipeline.

**Spec:** `docs/superpowers/specs/2026-09-06-larik-delivery-design.md`

## Global Constraints

- Стек остаётся Phaser 4 + TypeScript + Vite.
- Оружие одно — труба; три удара вперёд, относительный урон 1–1–2.
- Семь коротких линейных диалоговых вставок с говорящими головами.
- Никакого второго рендерера, игрового цикла, физического решателя, диалогового сервиса или новых внешних зависимостей.
- Все изображения и звук лежат в `public/assets`.
- Полное чтение и немедленный пропуск каждой сцены приводят к одинаковому состоянию кампании.
- Новый забег сбрасывает все сюжетные флаги и начинает со звонка.
- The user explicitly requested immediate plan execution without another approval round. Stay in the existing `feat/sprite-combat` checkout; no worktree creation, merge, push or publication.
- Root produces the imagegen source assets while one implementation worker at a time owns its listed code. Root does not modify a worker's code during its task. Preserve all earlier assets. Exact prompts and final paths go in `docs/SPRITE-PROMPTS-0.8.json`.

## File / interface map

`src/story/story.ts`: speaker/emotion/line/scene data and validation. `src/story/Campaign.ts`: scene admission, one-shot effects and reset safety. `src/gameplay/BossPattern.ts`: boss action selection and profile data. `Enemy.ts`: native actors using those profiles. `src/scenes/DialogueScene.ts`: native presentation clock and portrait animation. `src/game/portraitAtlas.ts`: source registration. `GameScene.ts`: encounter/transition integration. `src/levels/`: three campaign maps. `src/game/campaignArt.ts`: bright architectural dressing. `ui.ts`, `style.css`, `index.html`: accessible dialogue and bright game shell.

## Task 1: Narrative data and transactional campaign rules

**Files:** Create `src/story/story.ts`, `src/story/Campaign.ts`, `tests/story.test.ts`. Read spec sections 1, 3 and 5. Do not change engine, UI or level files.

**Interfaces:**

```ts
export type StoryId = 'phone-call' | 'last-khachapuri' | 'wanted' | 'airport-chief' | 'rough-landing' | 'food-threat' | 'delivered';
export type BossId = 'mark' | 'chief' | 'miller';
export type SpeakerId = 'larik' | 'nastya' | 'baker' | 'mark' | 'chief' | 'miller';
export type Emotion = 'neutral' | 'warm' | 'intense';
export interface StoryLine { speaker: SpeakerId; emotion: Emotion; text: string; }
export interface StoryScene { id: StoryId; title: string; lines: readonly StoryLine[]; }
export interface StorySession { id: StoryId; token: number; }
export type StoryEffect = { kind: 'resume' } | { kind: 'boss'; boss: BossId } | { kind: 'stage'; stage: 1 | 2 } | { kind: 'victory' };
// story.ts exports characters, storyScenes, getStoryScene(id), validateStoryData(): string[].
// Campaign exposes reset(), begin(id): StorySession|null, complete(session): StoryEffect|null,
// defeatBoss(id): boolean; getters stage, hasPackage, wanted, delivered, current, nextScene,
// and snapshot() for bridge/dev inspection. Tokens never repeat after reset.
```

- [ ] Write behavior tests first. A duplicate finish or stale session must not move the chapter, a boss must be defeated before its exit scene, and all seven scenes can be completed to victory in order.

```ts
const campaign = new Campaign();
const call = campaign.begin('phone-call')!;
expect(campaign.complete(call)).toEqual({ kind: 'resume' });
expect(campaign.complete(call)).toBeNull();
expect(campaign.begin('wanted')).toBeNull();
campaign.reset();
const newCall = campaign.begin('phone-call')!;
expect(campaign.complete(call)).toBeNull();
expect(campaign.current).toEqual(newCall);
```

- [ ] Run `npx vitest run tests/story.test.ts` and record the expected RED before implementation.
- [ ] Implement the exact seven dialogues from spec, speaker definitions and validation for empty/invalid references. Implement sequence guards, boss prerequisites, one active session and idempotent completion; stage/package/wanted/delivery effects are committed only at completion. Do not expose mutable collections.
- [ ] Test early/out-of-order begin, repeated boss events, invalid data, all completion effects, and reset while a session is open; run focused tests, then `npm test` and `npm run build`.
- [ ] Commit only this task's files and report RED/GREEN evidence. Reviewer checks spec and quality before Task 2.

## Task 2: Distinct native boss encounters

**Files:** Create `src/gameplay/BossPattern.ts`, `tests/boss-pattern.test.ts`, `tests/browser/campaign-boss.spec.ts`. Modify `src/gameplay/Enemy.ts`, `src/gameplay/EnemyAttackCycle.ts`, `src/game/EnemyAttackPresentation.ts`, `src/levels/Level.ts`. Only necessary attack-resolution hooks in `GameScene.ts` may change; no story/UI integration yet.

**Interfaces:** Consume `BossId` from Task 1. Extend spawn data with optional `bossId?: BossId` and `faction?: 'street' | 'police' | 'federal'`. Extend `Enemy` constructor with optional options object `{bossId?, faction?}`; old calls remain valid. Expose `bossId`, `faction`, `isBlocking`, `aimTarget` and `consumeReinforcements(): boolean`. Boss sprites will use `boss-mark`, `boss-chief`, `boss-miller` after Task 4; until their registered textures exist, current art is an intermediate fallback, not final output.

- [ ] Write independent behavior tests for direction lock, visible windup, recovery opening, a shield rejecting a frontal hit only in guard, and exactly one reinforcement request across half HP. Example:

```ts
// Test through the real boss rule object / native actor, not a mocked hit handler.
// Arrange chief in shown guard, facing right; attacker is in front.
expect(chief.receiveHit(16, -1)).toBe(false);
expect(chief.hp).toBe(before);
// Recovery lowers guard: the same hit now damages him.
```

- [ ] Observe RED, then implement Mark's lunge/heavy recovery rhythm, chief's guard/baton/charge and Miller's aimed volley/reposition/reload. Keep native Phaser movement, visible preparation of at least 520 ms, locked facing/aim before contact, and punishable recovery of at least 500 ms. Use current action-cycle machinery rather than a second update loop.
- [ ] Add a one-shot half-HP reinforcement signal for Miller, consumed by GameScene to spawn two ordinary agents through Arcade. Preserve shared attack-slot arbitration. Helpers count toward arena clearance. A block produces a distinct compact cue and sound, not normal damage feedback.
- [ ] Add focused native browser tests using real actors for frontal/back/recovery shield behavior, readable/dodgeable attacks and reinforcement cardinality. Retain existing generic enemy behavior when options are absent.
- [ ] Run focused tests, `npm test`, build and relevant existing combat browser tests. Commit/report and task review.

## Task 3: Seven playable dialogue scenes and campaign flow

**Files:** Create `src/scenes/DialogueScene.ts`, `src/story/dialoguePresentation.ts`, `tests/browser/story-flow.spec.ts`. Modify `src/gameplay/Rules.ts`, `src/game/bridge.ts`, `src/scenes/GameScene.ts`, `src/main.ts`, `src/ui.ts`, `index.html`, `src/style.css`, `src/levels/Level.ts`, `src/levels/{courtyard,district,port}.ts` and test helpers where the new opening dialogue requires dismissal.

**Interfaces:** Consume Task 1 Campaign and scene data, Task 2 boss options. Dialogue launch accepts `{session: StorySession}`; commands are `dialogue-next` and `dialogue-skip`; completion emits that exact session on the bridge. Native presentation exposes speaker, full text, visible text, line index and finished-typing state to accessible UI. Add `dialogue` to run mode with pause/resume restoring the prior playing/dialogue mode. LevelData adds `bossIntroX`, `bossId`, `introScene`, `exitScene`; all three maps contain their named boss.

- [ ] Write browser tests that start a run and require the call dialogue with frozen HP, world position and cooldowns; skipping must resume chapter 1. Observe RED on existing runtime.

```ts
await page.getByRole('button', { name: 'Начать', exact: true }).click();
await expect(page.locator('#dialogue-speaker')).toHaveText('Настя');
await page.getByRole('button', { name: 'Пропустить сцену' }).click();
await expect(page.locator('#dialogue-panel')).toBeHidden();
```

- [ ] Implement Phaser dialogue presentation using its own scene/time/animation systems and six portrait keys (`portrait-larik` etc., frame = emotionIndex*4 + neutral/talk/blink state). Do not draw facial features with code. Root supplies source assets; Task 4 registers them. Intermediate missing portraits may show a neutral loading surface while working, but final delivery must use generated heads.
- [ ] Wire one command route with non-repeating key presses, two-step reveal/advance and a keyboard-accessible skip button. Escape and focus loss pause dialogue, resume restores the same line/progress, and old session callbacks after restart do nothing. Clear held input and attack buffers on entry/exit. Suspend all world clocks, physics, animations and projectiles, but not the dialogue clock while focused.
- [ ] Replace final-stage-only boss activation with data. After route clearance E at arena opens the boss scene; after boss/helper clearance E at exit opens its outcome scene. Apply completion effects once, including package/next-stage; final door dialogue precedes won. No extra heal on transition. Add proper objectives, boss names and package status.
- [ ] Add native montage for wanted poster, plane flight/descent/wreck and delivered scene; each belongs to its dialogue and is immediately skippable. Use root supplied `story-v8-*` images, not raw user photo. All seven texts remain manually readable.
- [ ] Style the shell/dialogue as warm paper, teal/terracotta accents and clear dark ink. Keep existing semantic controls/fullscreen behavior, high-contrast actor telegraphs, simple disabled/focus states and a dominant game viewport. Update all currently visible old title/noir/result copy. Avoid unrelated layout redesign.
- [ ] Test all scene triggers/effects, full reading versus skipping, focus/pause/restart during dialogue, held keys, no double Enter, final boss alone not winning, package persistence and no extra healing. Update existing test setup to explicitly skip the opening scene rather than disabling story in production.
- [ ] Run `npm test`, build, focused story tests and relevant previous browser tests; commit/report and task review.

## Task 4: New campaign assets and bright locations

**Files:** Create `src/game/campaignArt.ts`, `src/game/portraitAtlas.ts`, `src/game/campaignSpriteAtlas.ts`, `tests/campaign-art.test.ts`, `tests/browser/campaign-art.spec.ts`. Modify `src/scenes/BootScene.ts`, `src/game/spriteAtlas.ts`, `src/game/architecture.ts`, `src/game/art.ts`, `src/game/EnemyAttackPresentation.ts`, `src/game/DefeatEffects.ts`, level maps and only the needed GameScene art hooks. Root provides generated versioned PNGs plus `docs/SPRITE-PROMPTS-0.8.json`.

**Interfaces / asset contracts:** Root provides six portrait sources `portrait-{larik,nastya,baker,mark,chief,miller}-v8-source.png`, three boss sheets `boss-{mark,chief,miller}-v8-source.png`, three faction sheets `enemy-{street,police,federal}-v8-source.png`, three backgrounds `scene-{batumi,airport,suburb}-v8.png`, and a `story-v8-source.png` montage source. Portraits have 3 expression rows x4 mouth/blink columns; boss/faction sheets have row-major poses described in the saved prompt manifest. Read actual pixels and register measured anchors, never assume generated grid alignment. Existing hero sheets/physics are unchanged.

- [ ] Write tests that current maps have distinct readable themes and all portraits/bosses/faction pose mappings load nonempty, unclipped frames; observe RED before registration.
- [ ] Inspect source components and measure foot/grip roots. Reuse deterministic chroma-key/alpha/component registration and nearest-neighbor packing. Register new texture/animation keys; preserve fixed physical body dimensions. Different boss poses must match their actual attack direction and phase. No code-drawn body or weapon substitutes.
- [ ] Create sunny architectural foregrounds from real landable platforms: Batumi balconies/market/bakery; airport barriers/terminal/baggage; suburban fences/porches/mailboxes/house. Use generated background layers for depth. Remove constant rain/fog/vignette/night overlay. Retain navigable routes and caches; make intro/exit interactions visually obvious.
- [ ] Adapt contact/telegraph contrast to the light backdrops, keep blade trails behind actors, show shield block feedback separately. Use short neutral dust/contact effects instead of rainy splashes when appropriate.
- [ ] Inspect representative gameplay at logical resolution and fullscreen, every portrait expression/talk frame and each boss anticipation/contact/recovery; correct clipping, mismatched facing or empty frames.
- [ ] Run focused art/browser checks, `npm test`, build; commit/report and task review.

## Task 5: Full campaign verification and handoff

**Files:** Update affected browser tests and `scripts/playtest-run.mjs`, `scripts/smoke-production.mjs`, `scripts/smoke-subpath.mjs`, `scripts/soak-production.mjs`. Write `docs/VERIFICATION-0.8.md`; update README, PRODUCT, DESIGN, ASSETS, AGENTS scope sentence, package/version metadata. Do not rewrite historical evidence or weaken combat assertions merely to get green.

- [ ] Run the complete unit and browser suites. Reproduce each failure with a focused command and distinguish intentional narrative contract changes from combat regressions. Fix proven bugs with regression tests.
- [ ] Adapt the route-aware natural-key player for new boss/interaction gates. Complete all three chapters with normal game state, then a second route skipping scenes. Record observed FPS, outcome, errors and any automation assistance precisely; no injected invulnerability/damage/teleport in claimed playthroughs.
- [ ] Build once, smoke Edge and Chrome production, fullscreen/DPR2/subpath, asset-error/retry. Run repeated combat/dialogue/pause/restart cycles and inspect error/listener/resource trends.
- [ ] Final independent code review across this plan's commits plus visual inspection. Fix concrete findings and re-run their covering checks. Save test commands and actual outcomes, original asset paths/prompts, and remaining real limitations.
- [ ] Synchronize product docs with the new campaign; preserve Phaser stack, photo reference and existing Git history. Commit checked changes locally. Leave dev server available, no merge/push/publication. User receives a playable game, not another approval request.

## Execution record

- Baseline `43e734b`: clean feature branch; `npm test` 49/49 on 2026-09-06.
- User explicitly replaced intermediate approval gates with immediate execution. Written spec is accepted for this implementation.

# Task 2 report: distinct native boss encounters

## Result

Implemented three authored boss patterns on the existing `EnemyAttackCycle` and Phaser Arcade actor:

- Mark alternates a 540 ms lunge with an 860 ms heavy swing; both retain at least 500 ms recovery.
- The chief alternates shield charge and baton. Only a frontal hit during the committed charge guard is rejected; back and recovery hits damage normally.
- Miller locks a visible aim point for a three-shot volley, repositions with Arcade velocity during a 900 ms reload, and emits one reinforcement request when damage crosses half HP.
- Miller's one walker/spitter pair joins the existing enemy Arcade group, so the shared attack-slot arbitration and exit-clearance count include both helpers.
- A shield block uses a compact named cue and low-pitched `dash` sound, without normal hit feedback.
- Constructor options are optional; unnamed enemies and the legacy unnamed boss preserve their previous texture, stats, profiles, and attack alternation.

## RED evidence

1. `npm test -- tests/boss-pattern.test.ts` — exit 1: suite failed because the new `BossPattern` module did not exist.
2. `npx playwright test tests/browser/campaign-boss.spec.ts` — exit 1: 3 failed; chief accepted frontal damage and exposed no boss metadata, Miller had no aimed pattern, and GameScene had no reinforcement consumer.
3. After adding the cue/projectile assertions and deliberately removing their hooks, `npx playwright test tests/browser/campaign-boss.spec.ts` — exit 1: 2 passed, 2 failed; Miller created zero shots and the blocked strike created zero shield cues.

## GREEN and regression evidence

1. `npm test -- tests/boss-pattern.test.ts` — exit 0: 1 file, 4 tests passed.
2. `npx playwright test tests/browser/campaign-boss.spec.ts` — exit 0: initial 3 actor tests passed; strengthened and final runs each passed all 4 tests.
3. `npx playwright test tests/browser/combat.spec.ts tests/browser/readable-combat.spec.ts tests/browser/enemy-animation-feel.spec.ts` — exit 0: 23 tests passed, including legacy boss profiles and lifecycle checks.
4. `npm test` — exit 0: 12 files, 62 tests passed.
5. `npm run build` — final exit 0: `tsc --noEmit` and Vite production build succeeded. Two earlier build runs exposed and then localized legacy attack-union typing; the final field/table types carry their actual narrow domains.
6. `git diff --check` — exit 0.

## Files

- Created `src/gameplay/BossPattern.ts`.
- Modified `src/gameplay/Enemy.ts`, `src/gameplay/EnemyAttackCycle.ts`, `src/game/EnemyAttackPresentation.ts`, `src/levels/Level.ts`, and attack-resolution/reinforcement hooks in `src/scenes/GameScene.ts`.
- Created `tests/boss-pattern.test.ts` and `tests/browser/campaign-boss.spec.ts`.
- Did not modify or stage the concurrently generated PNG assets.

## Self-review

- All authored/enraged windups remain at least 520 ms; every recovery is at least 500 ms.
- Facing remains owned and locked by `EnemyAttackCycle`; Miller's frozen aim is used by the actual projectile vectors after the player moves.
- Chief guard is phase- and direction-specific, and a block does not set damage hit-lock or show normal damage feedback.
- Reinforcements are armed only once per Miller pattern, consumed once by GameScene, use native Arcade bodies, enter the shared group, and therefore block the exit until defeated.
- No second update/render/physics loop was introduced. Existing unnamed `Enemy` calls still take the legacy path.
- Named texture selection checks Phaser's texture registry and falls back to `boss-full`; Task 4 still owns registration/final visuals. Stage/story boss spawn wiring remains outside this task's GameScene ownership boundary.

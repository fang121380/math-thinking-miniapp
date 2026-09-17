# Random Thinking Games And Answer Equivalence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver three locally generated, non-repeating thinking games with persisted progress and robust mathematical-expression equivalence.

**Architecture:** Put game generation and validation in a pure `game-engine.js` module, persistence transitions in `game-progress.js`, and answer canonicalization in `math-answer.js`. Keep the existing shared game page but render three mode-specific WXML sections based on `type`, while the hub passes explicit type parameters and shows completion-driven state.

**Tech Stack:** Native WeChat Mini Program JavaScript/WXML/WXSS, local storage, Node test runner, deterministic injected RNG.

---

### Task 1: Mathematical answer equivalence

**Files:**
- Create: `miniprogram/utils/math-answer.js`
- Create: `tests/math-answer.test.js`
- Modify: `miniprogram/pages/question/question.js`
- Modify: `miniprogram/pages/test/test.js`

- [ ] Add failing tests for ordinary/full-width/zero-width spaces, full-width parentheses, division aliases, multiplication aliases, minus variants, and structurally wrong formulas.
- [ ] Run `node --test tests/math-answer.test.js` and confirm the module or assertions fail for the expected reason.
- [ ] Implement `canonicalizeMathAnswer(value)` and `answersEquivalent(actual, expected)` without evaluating arbitrary JavaScript.
- [ ] Replace both page-local normalizers with the shared utility.
- [ ] Run the focused test and the existing adaptive/diagnostic suites.

### Task 2: Pure random game engine

**Files:**
- Create: `miniprogram/utils/game-engine.js`
- Create: `tests/game-engine.test.js`

- [ ] Add failing tests proving generated puzzle boards are solvable and not complete, hints are legal after player deviations, pattern answers and distractors are valid, partition shapes and both halves are connected, recent signatures are excluded, and seeded runs are reproducible.
- [ ] Run `node --test tests/game-engine.test.js` and confirm the new API is missing.
- [ ] Implement `createSeededRandom`, `difficultyForCompletions`, `generatePuzzle`, `solvePuzzleNextMove`, `generatePattern`, `generatePartition`, `evaluatePartition`, and `generateChallenge`.
- [ ] Run at least 200 generated challenges per type in tests to exercise the invariants across random seeds.

### Task 3: Persisted game rounds and rewards

**Files:**
- Create: `miniprogram/utils/game-progress.js`
- Modify: `miniprogram/utils/storage.js`
- Modify: `tests/storage.test.js`
- Create: `tests/game-progress.test.js`

- [ ] Add failing tests for per-type defaults, unfinished-round resume, recent-signature eviction at 10, one-time star reward, completion counts, clearing active state, and 100-ID reward history cap.
- [ ] Run focused tests and confirm the expected missing-state failures.
- [ ] Add normalized storage defaults and pure transitions `startOrResumeRound`, `completeRound`, and `abandonRound`.
- [ ] Run focused tests and corrupt-storage fallback tests.

### Task 4: Game hub routing and recommendation

**Files:**
- Modify: `miniprogram/pages/games/games.js`
- Modify: `miniprogram/pages/games/games.wxml`
- Modify: `miniprogram/pages/games/games.wxss`
- Modify: `tests/project-structure.test.js`

- [ ] Add failing static tests requiring all three rows to bind `openGame`, carry `data-type`, and navigate with `?type=`.
- [ ] Add a pure tested `pickDailyGameType(learnerId, date)` helper to rotate recommendations.
- [ ] Render completion counts and recommended type from persisted progress.
- [ ] Run static and game-engine tests.

### Task 5: Complete shared game page

**Files:**
- Modify: `miniprogram/pages/game/game.js`
- Modify: `miniprogram/pages/game/game.wxml`
- Modify: `miniprogram/pages/game/game.wxss`
- Modify: `tests/project-structure.test.js`

- [ ] Add failing static tests for `puzzle`, `pattern`, and `partition` sections plus reset, hint, submit/check, resume, and next-round handlers.
- [ ] Load or resume the selected type through `game-progress.js` and expose stable view data.
- [ ] Implement legal puzzle movement and dynamic solver hint.
- [ ] Implement pattern option selection and answer feedback.
- [ ] Implement partition cell toggling and connectivity validation.
- [ ] Implement one-time completion reward and next random round.
- [ ] Run focused tests and full `npm test`.

### Task 6: DevTools interaction and regression verification

**Files:**
- Modify: `design-qa.md`
- Modify: `codex_showcase/preview-checklist.md`

- [ ] Run `npm test`, syntax checks for all JavaScript, UTF-8 JSON parsing, asset checks, package-size check, and secret scan.
- [ ] Compile in WeChat DevTools and separate project-owned errors from guest-mode SDK warnings.
- [ ] Play multiple generated rounds of Number Puzzle, Pattern Detective, and Shape Partition through completion.
- [ ] Verify reset, hint, invalid move/answer, back/resume, next random round, recent non-repeat, one-time star reward, and daily recommendation.
- [ ] Submit the screenshot expression with harmless format variants and confirm it no longer creates a mistake record.
- [ ] Capture final game hub and one screen per game, update QA evidence, and set `final result: passed` only when no P0/P1/P2 issue remains.

### Execution record, 2026-07-15

- [x] Mathematical answer equivalence completed and regression tested.
- [x] Random generators completed with 386 unique pattern signatures across the 600-seed diversity run.
- [x] Persisted active rounds, recent-ten exclusion, completion counts, and one-time rewards completed.
- [x] Game hub and all three shared-page modes completed.
- [x] Child-facing activity errors, persisted local audio, and open-app learning reminders completed.
- [x] Final automated verification passed 77/77 tests; syntax, JSON, package size, assets, and secret checks passed.
- [x] WeChat DevTools interaction verification completed for all three games, next rounds, puzzle resume, settings, and reminder. No P0/P1/P2 project issue remained.

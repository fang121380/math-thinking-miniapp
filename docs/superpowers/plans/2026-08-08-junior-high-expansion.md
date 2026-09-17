# 初中数学扩展 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete junior-high (grades 7-9) learning support for eight textbook editions while preserving existing primary-school records and behavior.

**Architecture:** Keep the native WXML/WXSS/JavaScript application and introduce `schoolStage` as a first-class setting. Primary and junior banks share the existing selection, adaptive, mistake, and audit interfaces, while junior-specific curriculum maps, diagnostic models, and game metadata live in focused modules. The bank always selects by textbook, stage, grade, difficulty, type, and knowledge point.

**Tech Stack:** Native WeChat Mini Program, CommonJS modules, Node built-in test runner, local `wx` storage.

## Global Constraints

- Support `primary` grades 1-6 and `junior` grades 7-9; existing records without a stage normalize to `primary`.
- Preserve historical completed IDs, mistakes, stars, streaks, and learner ID when changing stage or grade; reset only active learning profile state.
- Ship eight junior editions with namespaced IDs `jr-rjb`, `jr-bsd`, `jr-suk`, `jr-huk`, `jr-luj`, `jr-xj`, `jr-hsd`, `jr-zj`; each receives an edition-specific junior curriculum map and distinct prompt families.
- Every junior edition x grade x difficulty x type pool contains at least 24 questions, eight knowledge points, and multiple thinking patterns. Build and cache only the current junior scope rather than pre-building all junior objects at startup.
- Every question is original, offline, answer/solution/audit complete, and never claims to reproduce external commercial content.
- Do not add network calls, credentials, user-data collection, or licensed third-party question content.
- Run every changed test before production code, then run `npm test` and a WeChat DevTools compile before completion.

---

### Task 1: School-stage setting and backward-compatible storage

**Files:**
- Modify: `miniprogram/utils/learning-settings.js`
- Modify: `miniprogram/utils/storage.js`
- Modify: `tests/storage.test.js`
- Create: `tests/learning-settings.test.js`

**Interfaces:**
- Produces `schoolStageOptions`, `getGradeOptions(stage)`, `normalizeLearningSettings(value)` with `{ schoolStage, grade }`.
- Produces `createProgressStore().changeSchoolStage(progress, schoolStage)` and `confirmInitialLearningLevel(progress, schoolStage, grade)`.
- Consumes existing `resetLearningProfile(progress, settings)` to retain history but clear active diagnostic/daily/self-practice state.

- [ ] **Step 1: Write failing stage-normalization tests**

```js
test('junior settings accept grades seven through nine only', () => {
  assert.deepEqual(getGradeOptions('junior').map((item) => item.value), [7, 8, 9]);
  assert.deepEqual(normalizeLearningSettings({ schoolStage: 'junior', grade: 8 }), {
    ...DEFAULT_LEARNING_SETTINGS, schoolStage: 'junior', grade: 8,
  });
});

test('legacy settings normalize to the saved primary grade', () => {
  assert.equal(normalizeLearningSettings({ grade: 5 }).schoolStage, 'primary');
  assert.equal(normalizeLearningSettings({ grade: 8 }).schoolStage, 'junior');
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/learning-settings.test.js tests/storage.test.js`

Expected: failure because `getGradeOptions`, `schoolStage`, and the new storage methods do not exist.

- [ ] **Step 3: Add stage-aware settings and storage migration**

```js
const schoolStageOptions = [
  { value: 'primary', label: '小学' },
  { value: 'junior', label: '初中' },
];
const gradeOptionsByStage = { primary: [1, 2, 3, 4, 5, 6], junior: [7, 8, 9] };
function getGradeOptions(stage) {
  return (gradeOptionsByStage[stage] || gradeOptionsByStage.primary)
    .map((value) => ({ value, label: `${value}年级`, available: true }));
}
```

Set `DEFAULT_LEARNING_SETTINGS.schoolStage` to `primary`, derive stage from a valid incoming grade when older storage lacks it, increase the confirmation version, and add `changeSchoolStage` plus `confirmInitialLearningLevel` that call `resetLearningProfile` without replacing historical arrays.

- [ ] **Step 4: Run focused settings/storage tests and verify GREEN**

Run: `node --test tests/learning-settings.test.js tests/storage.test.js`

Expected: all pass, including legacy record preservation tests for mistakes, stars, and learner ID.

### Task 2: Junior textbook curriculum catalog

**Files:**
- Modify: `miniprogram/utils/textbook-catalog.js`
- Modify: `miniprogram/utils/textbook-edition-profiles.js`
- Create: `miniprogram/utils/junior-high-curriculum.js`
- Modify: `tests/textbook-editions.test.js`

**Interfaces:**
- Produces `getLearningMap(textbookId, grade, schoolStage)` for grades 1-9.
- Produces `getJuniorTopics(textbookId, grade)` and `getJuniorEditionProfile(textbookId, grade)`.
- Consumes existing eight textbook IDs and keeps all primary map output stable.

- [ ] **Step 1: Write failing curriculum tests**

```js
test('every edition has a distinct junior curriculum map for grades seven to nine', () => {
  getTextbookOptions('junior').forEach((edition) => [7, 8, 9].forEach((grade) => {
    const map = getLearningMap(edition.value, grade, 'junior');
    assert.equal(map.schoolStage, 'junior');
    assert.equal(map.grade, grade);
    assert.ok(map.knowledgePoints.length >= 8);
    assert.match(map.unitLabel, new RegExp(edition.label));
  }));
});
```

- [ ] **Step 2: Run the focused catalog test and verify RED**

Run: `node --test tests/textbook-editions.test.js`

Expected: failure because grade 7 maps are clamped to grade 6 or have no junior topics.

- [ ] **Step 3: Build the dedicated junior curriculum module**

Implement `JUNIOR_GRADE_TOPICS` with eight key topics per grade and edition profile modifiers. Use grade 7 keys `rational_number`, `algebraic_expression`, `linear_equation`, `angle_line`, `triangle_intro`, `data_statistics`, `inequality_intro`, `coordinate_plane`; grade 8 keys `congruent_triangle`, `axis_symmetry`, `linear_function`, `fraction_expression`, `pythagorean`, `data_analysis`, `real_number`, `geometry_proof`; grade 9 keys `quadratic_function`, `circle`, `similar_triangle`, `right_triangle`, `probability`, `quadratic_equation`, `geometry_comprehensive`, `data_inference`. Give each edition unique contexts, labels, and emphasis text.

- [ ] **Step 4: Extend catalog lookup without altering primary maps**

```js
function getLearningMap(textbookId, grade, schoolStage) {
  const stage = schoolStage === 'junior' || Number(grade) >= 7 ? 'junior' : 'primary';
  return stage === 'junior'
    ? getJuniorLearningMap(textbookId, Number(grade))
    : getPrimaryLearningMap(textbookId, Number(grade));
}
```

- [ ] **Step 5: Run catalog tests and verify GREEN**

Run: `node --test tests/textbook-editions.test.js`

Expected: every primary map remains valid and all 24 junior edition-grade maps are valid and distinct.

### Task 3: Structured junior answer contracts and scope-aware selectors

**Files:**
- Modify: `miniprogram/utils/math-answer.js`
- Modify: `miniprogram/utils/question-bank.js`
- Modify: `miniprogram/utils/adaptive.js`
- Modify: `miniprogram/utils/diagnostic.js`
- Modify: `tests/math-answer.test.js`
- Modify: `tests/question-bank.test.js`

**Interfaces:**
- Produces `answersEquivalent(actual, expected, answerUnit, answerSpec)` for number, fraction, equation, coordinate, interval, and choice answers.
- Produces `scopeKeyOf({ schoolStage, textbookId, grade })` and applies it to selector filters and deterministic seeds.
- Keeps existing two/three-argument answer checks compatible with primary content.

- [ ] **Step 1: Write failing structured-answer tests**

```js
test('junior answer contracts validate equations and coordinates without accepting a different value', () => {
  assert.equal(answersEquivalent('x=5', '5', '', { kind: 'equation', variable: 'x', value: '5' }), true);
  assert.equal(answersEquivalent('5', '5', '', { kind: 'equation', variable: 'x', value: '5' }), true);
  assert.equal(answersEquivalent('x=6', '5', '', { kind: 'equation', variable: 'x', value: '5' }), false);
  assert.equal(answersEquivalent('(2,-3)', '2,-3', '', { kind: 'coordinate', value: '2,-3' }), true);
});
```

- [ ] **Step 2: Run answer/selector tests and verify RED**

Run: `node --test tests/math-answer.test.js tests/question-bank.test.js tests/adaptive.test.js tests/diagnostic.test.js`

Expected: failure because no `answerSpec` contract or `scopeKey` selector exists.

- [ ] **Step 3: Implement answer contracts and explicit scope filters**

Implement `normalizeAnswerSpec` and keep bare expected answers as `{ kind: 'text' }`. Add `schoolStage` to selector predicates, daily/self-practice/recovery seeds, and mistake records. Primary items normalize to `primary`; selectors reject a mismatched explicit stage even when grades differ.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/math-answer.test.js tests/question-bank.test.js tests/adaptive.test.js tests/diagnostic.test.js`

Expected: all legacy primary checks pass while structured junior examples pass their positive and negative cases.

### Task 4: Original junior question bank, lazy scope cache, and audit rules

**Files:**
- Create: `miniprogram/utils/question-bank-junior-data.js`
- Modify: `miniprogram/utils/question-bank-edition-data.js`
- Modify: `miniprogram/utils/question-bank.js`
- Modify: `miniprogram/utils/question-bank-manifest.js`
- Modify: `tests/question-bank.test.js`
- Create: `tests/junior-question-bank.test.js`

**Interfaces:**
- Produces `getJuniorQuestionBank(scope)`, `buildJuniorDiagnosticQuestions(scope)`, and `buildJuniorPracticeQuestions(scope)`.
- Every junior item includes `schoolStage: 'junior'`, `textbookId`, `grade`, `difficulty`, `type`, `examPattern`, `solution`, `knowledgeSummary`, `mistakeSummary`, `sourceRegion`, `sourceYear`, `reviewStatus`, and `reviewedAt`.
- Extends `auditQuestion(item)` with `junior_missing_condition`, `junior_invalid_domain`, `junior_option_ambiguity`, and existing answer/unit/calculation checks.

- [ ] **Step 1: Write failing bank coverage and integrity tests**

```js
test('every junior edition-grade-difficulty-type pool is large, distinct, and explained', () => {
  getTextbookOptions('junior').forEach((edition) => [7, 8, 9].forEach((grade) => {
    ['easy', 'medium', 'hard'].forEach((difficultyMode) => ['choice', 'fill', 'problem'].forEach((type) => {
      const pool = getQuestions({ textbookId: edition.value, schoolStage: 'junior', grade, difficultyMode, type });
      assert.ok(pool.length >= 24, `${edition.value} g${grade} ${difficultyMode} ${type}`);
      assert.ok(new Set(pool.map((item) => item.prompt)).size === pool.length);
      assert.ok(new Set(pool.map((item) => item.examPattern)).size >= 3);
      assert.ok(pool.every((item) => item.solution.steps.length >= 2 && item.knowledgeSummary && item.mistakeSummary.length));
    }));
  }));
});
```

- [ ] **Step 2: Run the junior bank tests and verify RED**

Run: `node --test tests/junior-question-bank.test.js tests/question-bank.test.js`

Expected: failure because no junior questions exist and selectors do not accept `schoolStage`.

- [ ] **Step 3: Implement grade-specific original question generators and cache only one scope**

Create pure generator functions for integer/linear-equation/geometry/data patterns in grade 7, function/proof/pythagorean/data patterns in grade 8, and quadratic/circle/similarity/probability/comprehensive patterns in grade 9. For every pattern, generate 12 numeric variants across the three difficulty levels and use edition profile wording to vary context and prompt family. Store a calculation expression where deterministic calculation is possible; use `answerSpec` and structured `auditRule` for equation, coordinate, graph, and domain questions. Cache question arrays in a `Map` keyed by `scopeKeyOf(scope)` and never call the 24-scope generator from module initialization.

- [ ] **Step 4: Add strict junior condition audits**

```js
function auditJuniorQuestion(item) {
  const issues = [];
  if (item.knowledgePoint === 'linear_function' && !/x|y|函数|图像/.test(item.prompt)) issues.push('junior_missing_condition');
  if (item.knowledgePoint === 'circle' && !/半径|直径|圆心|弧/.test(item.prompt)) issues.push('junior_missing_condition');
  if (item.type === 'choice' && item.options.filter((option) => answersEquivalent(option, item.answer, item.answerUnit)).length !== 1) issues.push('junior_option_ambiguity');
  return issues;
}
```

- [ ] **Step 5: Include junior banks in all selectors and content manifest**

Use stable IDs prefixed `j-d-` and `j-p-` with the namespaced junior textbook ID. Bump the manifest version and catalog totals only after the bank audit returns no issues.

- [ ] **Step 6: Run junior bank and existing bank tests and verify GREEN**

Run: `node --test tests/junior-question-bank.test.js tests/question-bank.test.js tests/textbook-editions.test.js`

Expected: all primary and junior pools pass coverage, distinctness, answer, unit, solution, and audit checks.

### Task 4: Five-question junior entry diagnostic

**Files:**
- Modify: `miniprogram/utils/question-bank-entry-diagnostic.js`
- Modify: `miniprogram/utils/diagnostic.js`
- Modify: `tests/diagnostic.test.js`
- Modify: `tests/all-grades-and-self-practice.test.js`

**Interfaces:**
- Extends `buildEntryDiagnosticQuestions()` to accept 1-9 by selecting primary or junior slot lists.
- Each junior combination returns exactly five lightweight questions spanning calculation, concept, model, geometry/function, and data/reasoning.

- [ ] **Step 1: Write failing diagnostic tests**

```js
test('every junior textbook and grade selects five lightweight representative diagnostics', () => {
  textbookOptions.forEach((edition) => [7, 8, 9].forEach((grade) => {
    const questions = selectEntryDiagnosticQuestions({ textbookId: edition.value, schoolStage: 'junior', grade, difficultyMode: 'medium', attempt: 0 });
    assert.equal(questions.length, 5);
    assert.equal(new Set(questions.map((item) => item.entrySlot)).size, 5);
    assert.ok(questions.every((item) => item.schoolStage === 'junior' && item.solution.steps.length >= 2));
  }));
});
```

- [ ] **Step 2: Run diagnostic tests and verify RED**

Run: `node --test tests/diagnostic.test.js tests/all-grades-and-self-practice.test.js`

Expected: failure because entry diagnostics only generate grades 1-6.

- [ ] **Step 3: Add junior diagnostic slot models**

Add five slots per grade. Grade 7: signed-number operation, equation, variable relation, line-angle/triangle, data table. Grade 8: algebraic fraction, function relation, congruence condition, pythagorean application, data conclusion. Grade 9: quadratic root/function relation, similarity/circle condition, probability, geometric modeling, multi-step data interpretation. Keep numbers small and all responses answerable without drawing external diagrams.

- [ ] **Step 4: Run diagnostic tests and verify GREEN**

Run: `node --test tests/diagnostic.test.js tests/all-grades-and-self-practice.test.js`

Expected: every primary and junior edition-grade set selects a stable, resumable set of five valid questions.

### Task 5: Two-level learner selection and learning page propagation

**Files:**
- Modify: `miniprogram/pages/intro/intro.js`
- Modify: `miniprogram/pages/intro/intro.wxml`
- Modify: `miniprogram/pages/mine/mine.js`
- Modify: `miniprogram/pages/mine/mine.wxml`
- Modify: `miniprogram/pages/home/home.js`
- Modify: `miniprogram/pages/practice/practice.js`
- Modify: `miniprogram/pages/result/result.js`
- Modify: `tests/project-structure.test.js`
- Modify: `tests/storage.test.js`

**Interfaces:**
- Intro exposes `schoolStageOptions`, `gradeOptions`, `selectedSchoolStage`, `selectSchoolStage(event)`, and `selectInitialGrade(event)`.
- Mine exposes `selectSchoolStage(event)` then filters grade buttons through `getGradeOptions(stage)`.
- Home/practice/result get their learning label from `getLearningMap(progress.textbookId, progress.grade, progress.schoolStage)`.

- [ ] **Step 1: Write failing UI/source tests**

```js
test('intro asks for a school stage before listing the matching grades', () => {
  assert.match(introJs, /selectSchoolStage\(event\)/);
  assert.match(introWxml, /小学/);
  assert.match(introWxml, /初中/);
  assert.match(introWxml, /wx:if="\{\{selectedSchoolStage\}\}"/);
});

test('settings let learners switch stage and only render matching grades', () => {
  assert.match(mineJs, /getGradeOptions/);
  assert.match(mineWxml, /schoolStageOptions/);
  assert.match(mineWxml, /selectSchoolStage/);
});
```

- [ ] **Step 2: Run structure and storage tests and verify RED**

Run: `node --test tests/project-structure.test.js tests/storage.test.js`

Expected: failure because current pages only show one flat grade grid.

- [ ] **Step 3: Implement stage-first selection**

Render two compact stage buttons, reveal the filtered grade grid only after a stage is picked, default the first new learner to primary before selection, and preserve the default RJB textbook. On confirmation, call `confirmInitialLearningLevel`. In settings, call `changeSchoolStage` before `changeGrade`; show a child-facing notice that the new grade starts with a five-question diagnostic while previous records remain saved.

- [ ] **Step 4: Propagate stage to labels and selectors**

Pass `progress.schoolStage` into every `getLearningMap`, `getQuestions`, daily set, self-practice, and diagnostic selector call. Do not rely only on numeric grade inference at consumer boundaries.

- [ ] **Step 5: Run page/flow tests and verify GREEN**

Run: `node --test tests/project-structure.test.js tests/storage.test.js tests/all-grades-and-self-practice.test.js`

Expected: source tests pass and stage switching retains historical records while restarting only active learning state.

### Task 6: Junior-adaptive games and route safeguards

**Files:**
- Modify: `miniprogram/utils/game-engine.js`
- Modify: `miniprogram/utils/game-progress.js`
- Modify: `miniprogram/pages/games/games.js`
- Modify: `miniprogram/pages/game/game.js`
- Modify: `miniprogram/pages/game/game.wxml`
- Modify: `tests/game-engine.test.js`
- Modify: `tests/game-progress.test.js`
- Modify: `tests/project-structure.test.js`

**Interfaces:**
- Extends `getGamesForGrade(grade, schoolStage)` and `generateChallenge(type, options)` with junior game types `equation`, `functionMatch`, `geometryClue`, `probability`.
- Uses the existing persisted per-type progress; invalid legacy active rounds are replaced instead of rendered.

- [ ] **Step 1: Write failing junior game tests**

```js
test('junior grades receive five age-appropriate games and no primary-only puzzle route', () => {
  [7, 8, 9].forEach((grade) => {
    const games = getGamesForGrade(grade, 'junior');
    assert.equal(games.length, 5);
    assert.ok(games.some((game) => game.type === 'equation'));
    assert.ok(games.some((game) => game.type === 'functionMatch' || game.type === 'geometryClue'));
  });
});

test('every generated junior challenge has one visible answer and a consistent hint', () => {
  ['equation', 'functionMatch', 'geometryClue', 'probability'].forEach((type) => {
    const challenge = generateChallenge(type, { difficulty: 'medium', rng: createSeededRandom(`junior-${type}`), recentSignatures: [] });
    assert.equal(validateGameChallenge(challenge).valid, true);
  });
});
```

- [ ] **Step 2: Run game tests and verify RED**

Run: `node --test tests/game-engine.test.js tests/game-progress.test.js`

Expected: failure because junior game types and stage filtering do not exist.

- [ ] **Step 3: Implement junior game metadata and self-contained generators**

Create equation rounds such as `3x + 5 = 20`, function-match rounds using text tables rather than graphics, geometry-clue rounds with all required conditions stated, and probability rounds with explicit sample spaces. Reuse choice-answer rendering where possible; add no game that depends on an unseen diagram or a hidden condition.

- [ ] **Step 4: Filter games by stage and prevent mismatched routes**

Pass `progress.schoolStage` from `pages/games/games.js`, include it in active-round signatures, and reject a saved round whose `schoolStage` differs from the learner's current stage.

- [ ] **Step 5: Run game tests and verify GREEN**

Run: `node --test tests/game-engine.test.js tests/game-progress.test.js tests/project-structure.test.js`

Expected: all generated junior rounds validate and primary game behavior remains unchanged.

### Task 7: Release metadata, audit samples, package budget, and preview evidence

**Files:**
- Modify: `miniprogram/utils/question-bank-manifest.js`
- Modify: `docs/question-bank-catalog-all-grades.md`
- Modify: `docs/question-bank-review-process.md`
- Modify: `codex_showcase/preview-checklist.md`
- Modify: `tests/project-structure.test.js`
- Modify: `tests/question-bank.test.js`

**Interfaces:**
- Manifest catalog contains separate primary and junior counts, updated version/date, and release note.
- Review documentation labels junior content as original pattern references and records automatic sampling coverage.

- [ ] **Step 1: Write failing manifest and package tests**

```js
test('content manifest records junior coverage and a newer version', () => {
  assert.deepEqual(questionBankManifest.enabledGrades, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(questionBankManifest.catalog.junior.textbooks, 8);
  assert.equal(questionBankManifest.catalog.junior.grades, 3);
});
```

- [ ] **Step 2: Run release tests and verify RED**

Run: `node --test tests/question-bank.test.js tests/project-structure.test.js`

Expected: failure because the manifest has only elementary coverage.

- [ ] **Step 3: Update manifest and audit records**

Write the final generated counts into the manifest, raise content version, and add sampling rules for all 24 junior edition-grade combinations. Keep the BGM media unchanged and ensure the source bundle remains under the real-device 2 MiB threshold.

- [ ] **Step 4: Run complete verification**

Run: `npm test`

Expected: zero failures across all tests, including primary compatibility, junior bank coverage, storage migration, game validation, and package size.

- [ ] **Step 5: Compile and inspect in WeChat DevTools**

Open the existing project, compile without errors, select “初中 → 初二 → 人教版,” finish five diagnostic questions, open daily practice, switch to another junior edition, and open one junior game. Record actual visible results and any remaining limitation in `codex_showcase/preview-checklist.md`.

## Plan Self-Review

- Spec coverage: Tasks 1-7 cover stage selection, all editions, grades 7-9, question types, diagnostics, self-practice, mistakes, games, audits, compatibility, package limits, and DevTools verification.
- Placeholder scan: no deferred implementation, no undefined APIs beyond interfaces introduced in the relevant task.
- Type consistency: `schoolStage` is always `primary` or `junior`; grade is numeric; textbook uses existing `textbookId`; selectors use all four dimensions.
- Repository note: no Git executable is available in this workspace, so local test evidence replaces commit checkpoints.

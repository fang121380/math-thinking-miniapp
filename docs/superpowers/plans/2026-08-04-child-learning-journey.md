# Child Learning Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give children a short, encouraging loop that lets them choose review or challenge, recover from a wrong answer in small steps, and see meaningful learning growth without turning study into a ranking system.

**Architecture:** Keep the existing native WeChat Mini Program pages and local-storage model. Add pure selection and journey helpers in `utils/`, persist only small local state additions, and reuse the existing question page for recovery questions so answer validation, audio, and accessibility stay consistent.

**Tech Stack:** Native WeChat Mini Program (JavaScript, WXML, WXSS), Node.js built-in test runner, existing local `wx` storage adapter.

## Global Constraints

- Keep all learning content offline-first and do not add accounts, cloud storage, rankings, chat, payment, or remote analytics.
- Keep the user flow suitable for primary-school children: one clear next action and short Chinese copy.
- Do not replace a daily task or grant daily-star completion for recovery or games.
- Retain existing question-bank selection guarantees: grade, textbook, difficulty, type coverage, stable daily IDs, and unseen-first ordering.
- Recovery questions must use original in-app questions only, have a different ID from the original, and gracefully fall back to the current analysis flow when no safe candidate exists.
- Keep the main package below the existing 1.75 MiB automated limit and do not add media assets.
- All new behaviour must be covered by deterministic Node tests before UI integration.

---

## File Structure

- `miniprogram/utils/adaptive.js`: daily mission-mode selection, recovery candidate selection, and existing learning-state updates.
- `miniprogram/utils/storage.js`: persistence and validation of mission, recovery, and game-journey state.
- `miniprogram/utils/learning-journey.js`: pure, testable conversion from ability/knowledge state into child-friendly journey rows.
- `miniprogram/utils/game-engine.js`: game-to-ability metadata and deterministic recommended-game selection.
- `miniprogram/pages/home/*`: daily review/challenge choice and compact next-growth signal.
- `miniprogram/pages/question/*` and `miniprogram/pages/analysis/*`: guided mistake recovery flow using existing answer controls.
- `miniprogram/pages/growth/*` and `miniprogram/pages/games/*`: learning journey display and optional weak-area game recommendation.
- `tests/*.test.js`: unit and structural regression coverage.

### Task 1: Persist Safe Learning-Journey State

**Files:**
- Modify: `miniprogram/utils/storage.js`
- Modify: `tests/storage.test.js`

**Interfaces:**
- Produces `progress.dailyMissionMode` as `'' | 'review' | 'challenge'`.
- Produces `progress.recoveryState` as `{ originalQuestionId, bridgeQuestionId, remixQuestionId, stage, source, nextIndex, contentBankVersion } | null`.
- Produces `progress.gameJourneyCounts` as `{ calculation, problem, geometry, pattern }` with non-negative integer values.

- [ ] **Step 1: Write failing storage-normalization tests**

```js
test('normalizes only valid mission, recovery, and journey fields', () => {
  const store = createProgressStore(memoryAdapter({
    dailyMissionMode: 'invalid',
    recoveryState: { originalQuestionId: 7, stage: 'bad' },
    gameJourneyCounts: { calculation: -2, pattern: 3.8, other: 99 },
  }));
  const progress = store.load();
  assert.equal(progress.dailyMissionMode, '');
  assert.equal(progress.recoveryState, null);
  assert.deepEqual(progress.gameJourneyCounts, {
    calculation: 0, problem: 0, geometry: 0, pattern: 4,
  });
});

test('changing grade clears active daily and recovery state but retains no stale IDs', () => {
  const next = changeGrade(seedProgress({
    dailyMissionMode: 'challenge',
    dailyQuestionIds: ['q1'],
    recoveryState: validRecoveryState,
  }), 5);
  assert.equal(next.dailyMissionMode, '');
  assert.deepEqual(next.dailyQuestionIds, []);
  assert.equal(next.recoveryState, null);
});
```

- [ ] **Step 2: Run the storage test to verify it fails**

Run: `node --test tests/storage.test.js`

Expected: FAIL because the new fields are absent or unvalidated.

- [ ] **Step 3: Add narrow normalizers and defaults in `storage.js`**

```js
const journeyAbilityKeys = ['calculation', 'problem', 'geometry', 'pattern'];

function normalizeRecoveryState(value) {
  const stages = ['explain', 'bridge', 'remix'];
  if (!value || typeof value !== 'object' || !stages.includes(value.stage)) return null;
  if (![value.originalQuestionId, value.bridgeQuestionId, value.remixQuestionId].every(
    (id) => typeof id === 'string' && id,
  )) return null;
  return {
    originalQuestionId: value.originalQuestionId,
    bridgeQuestionId: value.bridgeQuestionId,
    remixQuestionId: value.remixQuestionId,
    stage: value.stage,
    source: value.source === 'self' ? 'self' : 'daily',
    nextIndex: Math.max(0, Number(value.nextIndex) || 0),
    contentBankVersion: typeof value.contentBankVersion === 'string' ? value.contentBankVersion : '',
  };
}
```

Add the default values, merge normalizers in `load()`, and clear `dailyMissionMode` and `recoveryState` in the existing textbook/grade reset helper.

- [ ] **Step 4: Run the focused test and full storage test**

Run: `node --test tests/storage.test.js`

Expected: PASS with all existing storage tests still green.

### Task 2: Add Deterministic Daily Modes and Recovery Selection

**Files:**
- Modify: `miniprogram/utils/adaptive.js`
- Create: `tests/adaptive-learning-journey.test.js`

**Interfaces:**
- Produces `normalizeDailyMissionMode(value)` returning `'review'` or `'challenge'`.
- Extends `buildDailySet(bank, profile, context)` to accept `context.missionMode`.
- Produces `buildRecoverySet(bank, original, profile, context)` returning `{ bridgeQuestion, remixQuestion } | null`.

- [ ] **Step 1: Write failing daily-mode and recovery tests**

```js
test('review prioritizes due and weak knowledge while retaining the requested types', () => {
  const ids = buildDailySet(bank, reviewProfile, { ...context, missionMode: 'review', goal: 3 })
    .map((item) => item.id);
  assert.equal(new Set(ids).size, 3);
  assert.deepEqual(ids.map((id) => byId[id].type).sort(), ['choice', 'fill', 'problem']);
  assert.ok(ids.some((id) => byId[id].knowledgePoint === 'due_point'));
});

test('challenge uses the selected difficulty and includes a non-calculation thinking pattern', () => {
  const questions = buildDailySet(bank, challengeProfile, { ...context, missionMode: 'challenge', goal: 3 });
  assert.ok(questions.every((item) => item.difficulty === 2));
  assert.ok(questions.some((item) => item.examPattern !== 'calculation_model'));
});

test('recovery returns an easier bridge and a distinct same-level remix', () => {
  const recovery = buildRecoverySet(bank, original, profile, context);
  assert.notEqual(recovery.bridgeQuestion.id, original.id);
  assert.notEqual(recovery.remixQuestion.id, original.id);
  assert.notEqual(recovery.bridgeQuestion.id, recovery.remixQuestion.id);
  assert.equal(recovery.bridgeQuestion.knowledgePoint, original.knowledgePoint);
  assert.equal(recovery.remixQuestion.knowledgePoint, original.knowledgePoint);
  assert.ok(recovery.bridgeQuestion.difficulty <= original.difficulty);
  assert.equal(recovery.remixQuestion.difficulty, original.difficulty);
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `node --test tests/adaptive-learning-journey.test.js`

Expected: FAIL because the new exported helpers and mission-mode behaviour do not exist.

- [ ] **Step 3: Implement mission-mode ranking without changing the legacy default**

```js
function normalizeDailyMissionMode(value) {
  return value === 'challenge' ? 'challenge' : 'review';
}

function isThinkingPattern(item) {
  return item.examPattern && item.examPattern !== 'calculation_model';
}
```

Use the existing `rankCandidates` and deterministic shuffle seed. In review mode, retain due/weak/mastery ordering. In challenge mode, filter and rank `isThinkingPattern(item)` candidates first, then use the normal eligible pool when the selected textbook/grade cannot supply one. Add `missionMode` to the seed so review and challenge do not produce the same ordering.

- [ ] **Step 4: Implement safe bridge/remix selection**

```js
function buildRecoverySet(bank, original, profile, context = {}) {
  const matching = bank.filter((item) => (
    item.id !== original.id
    && item.grade === original.grade
    && (item.textbookId || 'rjb') === (original.textbookId || 'rjb')
    && item.knowledgePoint === original.knowledgePoint
  ));
  const bridge = chooseRecoveryCandidate(matching, original, 'bridge', context);
  const remix = chooseRecoveryCandidate(matching, original, 'remix', context, new Set([bridge && bridge.id]));
  return bridge && remix ? { bridgeQuestion: bridge, remixQuestion: remix } : null;
}
```

`bridge` must prefer `difficulty < original.difficulty`, then same difficulty with a different `examPattern`; `remix` must use the original difficulty and prefer a different `examPattern` from both original and bridge. Both selections must be deterministic from learner, date, original ID, and stage. Return `null` when two distinct safe questions do not exist.

- [ ] **Step 5: Run adaptive tests**

Run: `node --test tests/adaptive-learning-journey.test.js tests/question-bank.test.js`

Expected: PASS; existing bank coverage and uniqueness checks remain green.

### Task 3: Build the Child-Friendly Learning Journey and Game Recommendation

**Files:**
- Create: `miniprogram/utils/learning-journey.js`
- Modify: `miniprogram/utils/game-engine.js`
- Create: `tests/learning-journey.test.js`
- Modify: `tests/game-engine.test.js`

**Interfaces:**
- Produces `buildLearningJourney(progress, questions)` returning four rows with `key`, `label`, `state`, `stateText`, `masteredCount`, `gameCount`, and `nextAction`.
- Produces `getJourneyFocus(progress, questions)` returning the lowest-priority domain row with deterministic tie-breaking.
- Produces `pickRecommendedGameType(progress, date, games)` returning an allowed game type or `''`.

- [ ] **Step 1: Write failing pure-function tests**

```js
test('journey maps knowledge mastery and ability to positive states', () => {
  const rows = buildLearningJourney({
    abilities: { calculation: 82, geometry: 58, pattern: 72, problem: 74 },
    knowledgeState: { perimeter: { mastery: 71 }, angle: { mastery: 42 } },
    gameJourneyCounts: { calculation: 1, geometry: 2, pattern: 0, problem: 0 },
  }, questions);
  assert.equal(rows.find((row) => row.key === 'calculation').stateText, '会用了');
  assert.equal(rows.find((row) => row.key === 'geometry').stateText, '认识了');
});

test('recommended game targets the weak journey domain and remains deterministic', () => {
  const first = pickRecommendedGameType(progressWithWeakGeometry, '2026-08-04', games);
  const second = pickRecommendedGameType(progressWithWeakGeometry, '2026-08-04', games);
  assert.equal(first, second);
  assert.equal(getGameMeta(first).ability, 'geometry');
});
```

- [ ] **Step 2: Run the new journey and game tests to verify they fail**

Run: `node --test tests/learning-journey.test.js tests/game-engine.test.js`

Expected: FAIL because journey and recommendation exports do not exist.

- [ ] **Step 3: Implement compact journey state calculation**

```js
const DOMAINS = [
  { key: 'calculation', label: '计算思路' },
  { key: 'geometry', label: '图形观察' },
  { key: 'pattern', label: '规律发现' },
  { key: 'problem', label: '解决问题' },
];

function stateFor(ability, masteredCount) {
  if (ability >= 85 || masteredCount >= 4) return { state: 'growing', stateText: '正在变强' };
  if (ability >= 70 || masteredCount >= 2) return { state: 'using', stateText: '会用了' };
  return { state: 'meeting', stateText: '认识了' };
}
```

Build a knowledge-point-to-ability map from `questions`. Treat mastery `>= 65` as mastered. Sort `getJourneyFocus` by lower ability, then lower mastered count, then the `DOMAINS` declaration order.

- [ ] **Step 4: Add ability metadata and deterministic game choice**

```js
const GAME_TYPES = {
  // existing metadata
  numberPuzzle: { /* existing fields */, ability: 'calculation' },
  patternDetective: { /* existing fields */, ability: 'pattern' },
};

function pickRecommendedGameType(progress, date, games) {
  const candidates = games.filter((type) => getGameMeta(type));
  const focus = getWeakAbilityKey(progress);
  const matching = candidates.filter((type) => getGameMeta(type).ability === focus);
  return pickDailyGameType(progress.learnerId || 'local-learner', date, matching.length ? matching : candidates);
}
```

Give every existing game type exactly one of `calculation`, `problem`, `geometry`, or `pattern`; leave the existing daily random picker intact for fallback.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/learning-journey.test.js tests/game-engine.test.js`

Expected: PASS with every existing game test passing.

### Task 4: Add Daily Path Choice on the Home Page

**Files:**
- Modify: `miniprogram/pages/home/home.js`
- Modify: `miniprogram/pages/home/home.wxml`
- Modify: `miniprogram/pages/home/home.wxss`
- Modify: `tests/project-structure.test.js`

**Interfaces:**
- Consumes `buildDailySet(..., { missionMode })`, `normalizeDailyMissionMode`, `buildLearningJourney`, and `getJourneyFocus`.
- Produces `chooseMissionMode(event)` and `showMissionChoice` page state.

- [ ] **Step 1: Write a structural regression test for the new home actions**

```js
test('home page exposes the two daily path actions and handler', () => {
  const script = readMiniProgramFile('pages/home/home.js');
  const view = readMiniProgramFile('pages/home/home.wxml');
  assert.match(script, /chooseMissionMode\(event\)/);
  assert.match(view, /data-mode="review"/);
  assert.match(view, /data-mode="challenge"/);
});
```

- [ ] **Step 2: Run the structure test to verify it fails**

Run: `node --test tests/project-structure.test.js`

Expected: FAIL because the two mode controls do not exist.

- [ ] **Step 3: Persist choice and regenerate only an untouched daily task**

```js
chooseMissionMode(event) {
  const mode = normalizeDailyMissionMode(event.currentTarget.dataset.mode);
  const progress = createProgressStore().load();
  if (progress.dailyCompleted > 0) return;
  const dailySetNonce = Date.now() + Math.floor(Math.random() * 1000000);
  const dailyQuestionIds = buildDailySet(practiceQuestions, { ...progress, dailySetNonce }, {
    learnerId: progress.learnerId, date: todayKey(), dailySetNonce, missionMode: mode,
  }).map((item) => item.id);
  createProgressStore().save({ ...progress, dailyMissionMode: mode, dailySetNonce, dailyQuestionIds });
  this.onShow();
}
```

When a new day begins, leave the mode empty until the child chooses. Preserve an already-generated old daily task as review rather than changing it mid-day. Show choice only for unfinished, newly created daily tasks.

- [ ] **Step 4: Add a compact, accessible choice panel and next-focus line**

```xml
<view wx:if="{{showMissionChoice}}" class="mission-choice" aria-label="选择今天的学习方式">
  <button class="mission-choice__button" data-mode="review" bindtap="chooseMissionMode">复习一下</button>
  <button class="mission-choice__button mission-choice__button--challenge" data-mode="challenge" bindtap="chooseMissionMode">挑战一下</button>
</view>
<text class="journey-next">下一站：{{journeyFocus.label}} · {{journeyFocus.stateText}}</text>
```

Use the existing colors, spacing, `safeTop`, and audio `tap`/`navigate` vocabulary; do not add a modal, icon asset, or extra screen.

- [ ] **Step 5: Run the home structural test**

Run: `node --test tests/project-structure.test.js`

Expected: PASS.

### Task 5: Implement Guided Mistake Recovery in Existing Question and Analysis Pages

**Files:**
- Modify: `miniprogram/pages/question/question.js`
- Modify: `miniprogram/pages/question/question.wxml`
- Modify: `miniprogram/pages/analysis/analysis.js`
- Modify: `miniprogram/pages/analysis/analysis.wxml`
- Modify: `tests/project-structure.test.js`

**Interfaces:**
- Consumes `buildRecoverySet`, `CONTENT_BANK_VERSION`, and persisted `recoveryState`.
- Uses routes `/pages/question/question?recovery=bridge` and `/pages/question/question?recovery=remix`.
- Does not create a second mistake record for a recovery failure.

- [ ] **Step 1: Write the recovery route/guard structural test**

```js
test('question and analysis pages guard and route recovery stages', () => {
  const question = readMiniProgramFile('pages/question/question.js');
  const analysis = readMiniProgramFile('pages/analysis/analysis.js');
  assert.match(question, /recovery=bridge/);
  assert.match(question, /recovery=remix/);
  assert.match(question, /buildRecoverySet/);
  assert.match(analysis, /startRecovery/);
  assert.match(analysis, /contentBankVersion/);
});
```

- [ ] **Step 2: Run the structure test to verify it fails**

Run: `node --test tests/project-structure.test.js`

Expected: FAIL because recovery state is not consumed by either page.

- [ ] **Step 3: Create recovery state when a normal question is wrong**

```js
const recovery = buildRecoverySet(practiceQuestions, question, progress, {
  learnerId: progress.learnerId, date: todayKey(), source: this.isSelfPractice ? 'self' : 'daily',
});
const recoveryState = recovery ? {
  originalQuestionId: question.id,
  bridgeQuestionId: recovery.bridgeQuestion.id,
  remixQuestionId: recovery.remixQuestion.id,
  stage: 'explain',
  source: this.isSelfPractice ? 'self' : 'daily',
  nextIndex: index + 1,
  contentBankVersion: CONTENT_BANK_VERSION,
} : null;
```

Save this alongside the original mistake record. Existing daily completion/stars stay unchanged; original mistakes are only removed by the app's normal correct-retry behaviour.

- [ ] **Step 4: Route and score recovery attempts**

At question initialization, accept only a recovery state whose version matches `CONTENT_BANK_VERSION`, whose original/bridge/remix IDs exist, and whose requested route stage matches the saved state. On any invalid state, clear it, show `补会练习暂时不可用`, and return to the source flow.

For a bridge or remix attempt: update skill, knowledge, and weak-knowledge state using the existing functions; never change `dailyCompleted`, `stars`, `completionDates`, or `selfPracticeIndex`. A wrong recovery answer returns to analysis with the original mistake ID. A correct bridge advances `recoveryState.stage` to `remix`; a correct remix clears it and returns to the saved daily/self next position.

- [ ] **Step 5: Add the smallest analysis-page action set**

```xml
<button wx:if="{{hasRecovery}}" class="primary-button" bindtap="startRecovery">
  {{recoveryActionLabel}}
</button>
<button class="secondary-button" bindtap="continueLearning">继续原来的练习</button>
```

`stage === 'explain'` labels the primary action `小台阶题`; `stage === 'remix'` labels it `同类再试`; after a recovery failure the action remains available. Keep the current analysis, source question, knowledge summary, and error feedback visible.

- [ ] **Step 6: Run recovery structure and regression tests**

Run: `node --test tests/project-structure.test.js tests/adaptive-learning-journey.test.js tests/storage.test.js`

Expected: PASS.

### Task 6: Surface Journey Growth and Optional Game Guidance

**Files:**
- Modify: `miniprogram/pages/growth/growth.js`
- Modify: `miniprogram/pages/growth/growth.wxml`
- Modify: `miniprogram/pages/growth/growth.wxss`
- Modify: `miniprogram/pages/games/games.js`
- Modify: `miniprogram/pages/games/games.wxml`
- Modify: `miniprogram/pages/game/game.js`
- Modify: `tests/project-structure.test.js`

**Interfaces:**
- Consumes `buildLearningJourney`, `getJourneyFocus`, and `pickRecommendedGameType`.
- Persists only one increment to `gameJourneyCounts[getGameMeta(type).ability]` per completed game round.

- [ ] **Step 1: Write structural tests for journey and game guidance**

```js
test('growth and games render learning guidance without a ranking system', () => {
  const growth = readMiniProgramFile('pages/growth/growth.wxml');
  const games = readMiniProgramFile('pages/games/games.js');
  const game = readMiniProgramFile('pages/game/game.js');
  assert.match(growth, /journeyRows/);
  assert.match(games, /pickRecommendedGameType/);
  assert.match(game, /gameJourneyCounts/);
  assert.doesNotMatch(growth + games, /排行榜|排名|leaderboard/i);
});
```

- [ ] **Step 2: Run the structure test to verify it fails**

Run: `node --test tests/project-structure.test.js`

Expected: FAIL because the journey UI and game recommendation are absent.

- [ ] **Step 3: Render the four compact journey rows in growth**

```xml
<view class="journey-section" aria-label="我的数学思路成长">
  <view class="section-title">我的数学思路</view>
  <view wx:for="{{journeyRows}}" wx:key="key" class="journey-row">
    <text>{{item.label}}</text><text class="journey-state">{{item.stateText}}</text>
    <text class="journey-copy">{{item.nextAction}}</text>
  </view>
</view>
```

Use `buildLearningJourney(progress, practiceQuestions)` in `onShow()`. Do not imply measured weekly gains that are not stored; use only state and a forward-looking `nextAction`.

- [ ] **Step 4: Recommend but do not force one suitable game**

```js
const recommendedType = pickRecommendedGameType(progress, todayKey(), availableGames.map((item) => item.type));
const availableGames = getGamesForGrade(progress.grade).map((game) => ({
  ...game,
  recommended: game.type === recommendedType,
}));
```

Display one `适合现在练一练` label in WXML. Keep every grade-appropriate game usable. In `game.js`, increment the matching journey ability only after the existing engine reports a round complete, and keep that counter separate from ability and textbook mastery.

- [ ] **Step 5: Run structure and game regression tests**

Run: `node --test tests/project-structure.test.js tests/game-engine.test.js tests/game-progress.test.js`

Expected: PASS.

### Task 7: Full Regression, Package Check, and WeChat DevTools Verification

**Files:**
- Modify: `codex_showcase/preview-checklist.md`

- [ ] **Step 1: Run the complete automated suite serially**

Run: `npm test`

Expected: every test passes with no skipped new journey, recovery, storage, or selector test.

- [ ] **Step 2: Measure the package and verify no oversized media was introduced**

Run: `node --test tests/project-structure.test.js`

Expected: PASS including the existing main-package limit under 1.75 MiB.

- [ ] **Step 3: Compile and exercise the main navigation in WeChat DevTools**

Use the existing project in WeChat DevTools. Verify: a fresh daily path displays review/challenge, each choice opens the requested first question, a wrong answer reaches analysis, `小台阶题` then `同类再试` follow the correct routes, the growth page shows four rows, and games show one optional recommendation. Record actual observed timing/error output without treating a WeChat SDK-only timeout as an app failure unless a project stack frame or broken route is present.

- [ ] **Step 4: Update the acceptance record with actual results**

```markdown
## 2026-08-04 Child Learning Journey

- Automated suite: `PASS` / actual count.
- Main package: actual bytes and threshold.
- DevTools: list verified navigation paths and any SDK-only diagnostics.
- Out of scope: cloud sync, rankings, and remote analytics remain disabled.
```

- [ ] **Step 5: Re-run the full automated suite after documenting results**

Run: `npm test`

Expected: PASS.

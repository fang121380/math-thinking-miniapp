# Adaptive Bank And Safe Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver varied, learner-aware daily questions and safe custom headers on every supported phone screen.

**Architecture:** Keep all content local and original. A pure selection module ranks questions by weak knowledge point, difficulty, and unseen status, then uses a deterministic learner/date seed to choose variants. The app calculates status-bar height once and pages bind it to their root padding.

**Tech Stack:** Native WeChat Mini Program, JavaScript, WXML/WXSS, Node test runner.

---

### Task 1: Add learner-aware daily selection tests

**Files:**
- Modify: `tests/adaptive.test.js`
- Test: `tests/adaptive.test.js`

- [ ] **Step 1: Write failing tests for seeded diversity and seen-question avoidance**

```js
test('daily sets are stable per learner and date but differ across learners', () => {
  const profile = { weakKnowledgePoints: ['division_estimation'], level: 1, completedIds: [] };
  const first = buildDailySet(practiceQuestions, profile, { learnerId: 'learner-a', date: '2026-07-15' });
  const repeat = buildDailySet(practiceQuestions, profile, { learnerId: 'learner-a', date: '2026-07-15' });
  const other = buildDailySet(practiceQuestions, profile, { learnerId: 'learner-b', date: '2026-07-15' });
  assert.deepEqual(first.map((item) => item.id), repeat.map((item) => item.id));
  assert.notDeepEqual(first.map((item) => item.id), other.map((item) => item.id));
});

test('daily selection avoids completed variants while alternatives exist', () => {
  const first = buildDailySet(practiceQuestions, { weakKnowledgePoints: ['division_estimation'], level: 1, completedIds: [] }, { learnerId: 'learner-a', date: '2026-07-15' });
  const next = buildDailySet(practiceQuestions, { weakKnowledgePoints: ['division_estimation'], level: 1, completedIds: first.map((item) => item.id) }, { learnerId: 'learner-a', date: '2026-07-16' });
  assert.equal(next.some((item) => first.some((previous) => previous.id === item.id)), false);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because selection has no seed input**

Run: `node --test tests/adaptive.test.js`

- [ ] **Step 3: Implement seeded candidate ordering in `miniprogram/utils/adaptive.js`**

```js
function createSeededRandom(seedText) {
  let state = Array.from(String(seedText)).reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function seededShuffle(items, seedText) {
  const random = createSeededRandom(seedText);
  return [...items].sort(() => random() - 0.5);
}
```

- [ ] **Step 4: Run focused tests and confirm they pass**

Run: `node --test tests/adaptive.test.js`

### Task 2: Expand the original local practice bank

**Files:**
- Modify: `miniprogram/utils/question-bank.js`
- Modify: `tests/question-bank.test.js`
- Test: `tests/question-bank.test.js`

- [ ] **Step 1: Add a failing test requiring at least four variants per type for the core division strand**

```js
test('practice bank offers multiple original variants for each daily question type', () => {
  ['choice', 'fill', 'problem'].forEach((type) => {
    assert.ok(practiceQuestions.filter((item) => item.knowledgePoint === 'division_estimation' && item.type === type).length >= 4);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails on the current fixed bank**

Run: `node --test tests/question-bank.test.js`

- [ ] **Step 3: Add parameterized original question variants with unique IDs, answers, hints, and solution steps**

```js
const divisionPracticeVariants = [
  { dividend: 480, divisor: 16, answer: '30' },
  { dividend: 840, divisor: 21, answer: '40' },
  { dividend: 720, divisor: 24, answer: '30' },
  { dividend: 960, divisor: 32, answer: '30' },
];
```

Create matching choice, fill, and two-step application variants from these verified parameter sets, preserving `curriculum`, `commonMistakes`, and `solution.steps` fields.

- [ ] **Step 4: Run focused tests and confirm the variant counts and question metadata pass**

Run: `node --test tests/question-bank.test.js`

### Task 3: Persist learner identity and daily-set state

**Files:**
- Modify: `miniprogram/utils/storage.js`
- Modify: `tests/storage.test.js`
- Test: `tests/storage.test.js`

- [ ] **Step 1: Write a failing storage test for missing learner identity**

```js
test('progress assigns and preserves a local learner ID', () => {
  const adapter = memoryAdapter(undefined);
  const store = createProgressStore(adapter, () => 'learner-test');
  const first = store.ensureLearner(store.load());
  const second = store.ensureLearner(store.load());
  assert.equal(first.learnerId, 'learner-test');
  assert.equal(second.learnerId, 'learner-test');
});
```

- [ ] **Step 2: Run focused test and confirm it fails because `ensureLearner` does not exist**

Run: `node --test tests/storage.test.js`

- [ ] **Step 3: Add `learnerId`, `dailySetDate`, `dailyQuestionIds`, and `contentBankVersion` defaults plus `ensureLearner`**

```js
function ensureLearner(progress) {
  if (progress.learnerId) return progress;
  return save({ ...progress, learnerId: createLearnerId() });
}
```

- [ ] **Step 4: Run focused test and confirm it passes**

Run: `node --test tests/storage.test.js`

### Task 4: Use persisted daily questions in the home and question pages

**Files:**
- Modify: `miniprogram/pages/home/home.js`
- Modify: `miniprogram/pages/question/question.js`
- Test: `tests/adaptive.test.js`

- [ ] **Step 1: Write a failing test for returning the saved set on the same date**

```js
test('daily selection retains a learner daily set until its date changes', () => {
  const profile = { learnerId: 'learner-a', dailySetDate: '2026-07-15', dailyQuestionIds: ['p-choice-division-1', 'p-fill-division-1', 'p-problem-division-1'] };
  assert.deepEqual(resolveDailyQuestionIds(practiceQuestions, profile, '2026-07-15'), profile.dailyQuestionIds);
});
```

- [ ] **Step 2: Run focused test and confirm it fails because `resolveDailyQuestionIds` does not exist**

Run: `node --test tests/adaptive.test.js`

- [ ] **Step 3: Implement `resolveDailyQuestionIds` and use it from both pages**

```js
const ids = resolveDailyQuestionIds(practiceQuestions, progress, todayKey());
store.save({ ...progress, dailySetDate: todayKey(), dailyQuestionIds: ids, dailyCompleted: isSameDay ? progress.dailyCompleted : 0 });
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

### Task 5: Apply runtime safe-area padding to custom pages

**Files:**
- Modify: `miniprogram/app.js`
- Create: `miniprogram/utils/layout.js`
- Modify: each `miniprogram/pages/*/*.js` page data initializer
- Modify: each `miniprogram/pages/*/*.wxml` root `.page` view
- Modify: `tests/project-structure.test.js`

- [ ] **Step 1: Write a failing static test that every page root binds `safeTop`**

```js
assert.match(wxml, /style="padding-top: \{\{safeTop\}\}px;"/);
```

- [ ] **Step 2: Run focused test and confirm it fails on the current root views**

Run: `node --test tests/project-structure.test.js`

- [ ] **Step 3: Read `statusBarHeight` once and expose it to pages**

```js
function getSafeTop() {
  const app = getApp();
  return Math.max(24, Number(app.globalData.safeTop || 24));
}
```

Bind `safeTop` to every root page view and retain existing bottom `env(safe-area-inset-bottom)` padding.

- [ ] **Step 4: Run focused test and confirm it passes**

Run: `node --test tests/project-structure.test.js`

### Task 6: Verify in WeChat DevTools

**Files:**
- Verify: `project.config.json`

- [ ] **Step 1: Run final automated checks**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Recompile in WeChat DevTools and inspect a cutout simulator**

Expected: custom page headers begin below the status bar and no system indicator overlaps the title, back button, or progress badge.

- [ ] **Step 3: Inspect daily questions for two local learner profiles**

Expected: both sets contain choice, fill, and application questions, use the learner's weak area when variants exist, and differ by learner/date.

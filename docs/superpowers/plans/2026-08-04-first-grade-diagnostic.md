# First Grade Diagnostic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require a first-time learner to select a grade before a concise five-question, grade-matched diagnostic.

**Architecture:** Keep grade and migration state in the existing local progress store. Let `diagnostic.js` select a five-slot lightweight blueprint from the existing textbook-grade bank, while the intro and diagnostic pages render the selection and dynamic total.

**Tech Stack:** Native WeChat Mini Program JavaScript, WXML/WXSS, Node built-in test runner.

## Global Constraints

- Default textbook remains `rjb`.
- Never erase a learner's history during the storage migration.
- A diagnostic has exactly five questions, each with an answer, hint, solution, knowledge summary and mistake summary.
- Keep the main package below `1.75 MiB`.

---

### Task 1: Persist first-grade confirmation

**Files:**
- Modify: `miniprogram/utils/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Produces `progress.initialGradeConfirmed: boolean`.
- Produces `store.confirmInitialGrade(progress, grade)`.

- [ ] **Step 1: Write failing storage tests**

```js
const fresh = store.load();
assert.equal(fresh.initialGradeConfirmed, false);
const confirmed = store.confirmInitialGrade(fresh, 6);
assert.equal(confirmed.grade, 6);
assert.equal(confirmed.textbookId, 'rjb');
assert.equal(confirmed.initialGradeConfirmed, true);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/storage.test.js`
Expected: FAIL because the new field and method do not exist.

- [ ] **Step 3: Implement minimal normalization and migration**

```js
function hasHistoricLearning(progress) {
  return Boolean(progress.diagnosticComplete || progress.diagnosticInProgress || progress.dailyCompleted || progress.stars || progress.mistakes?.length);
}

function confirmInitialGrade(progress, grade) {
  return save({ ...changeGrade(progress, grade), initialGradeConfirmed: true });
}
```

- [ ] **Step 4: Re-run focused storage tests**

Run: `node --test tests/storage.test.js`
Expected: PASS.

### Task 2: Select a five-question lightweight blueprint

**Files:**
- Modify: `miniprogram/utils/diagnostic.js`
- Test: `tests/diagnostic.test.js`

**Interfaces:**
- Exports `ENTRY_DIAGNOSTIC_COUNT` with value `5`.
- `selectDiagnosticSet(bank, context)` returns exactly five grade/textbook-matched questions.

- [ ] **Step 1: Write failing diagnostic selection tests**

```js
const set = selectDiagnosticSet(diagnosticQuestions, { learnerId: 'new', textbookId: 'rjb', grade: 2, attempt: 1 });
assert.equal(set.length, 5);
assert.ok(set.every((item) => item.grade === 2 && item.textbookId === 'rjb'));
assert.equal(new Set(set.map((item) => item.id)).size, 5);
assert.equal(new Set(set.map((item) => item.knowledgePoint)).size, 5);
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test tests/diagnostic.test.js`
Expected: FAIL because selection returns eight questions.

- [ ] **Step 3: Implement an entry blueprint**

```js
const ENTRY_DIAGNOSTIC_COUNT = 5;
function getEntrySlots(bank, grade, textbookId) {
  return getDiagnosticSlots(bank, grade, textbookId)
    .filter((slot) => !slot.includes('two_step') && !slot.includes('decimal_money'))
    .slice(0, ENTRY_DIAGNOSTIC_COUNT);
}
```

Use topic/ability fallback selection to maintain four ability categories and all three question types for every textbook-grade group.

- [ ] **Step 4: Re-run focused diagnostic tests**

Run: `node --test tests/diagnostic.test.js`
Expected: PASS for every grade, textbook and difficulty mode.

### Task 3: Add the first-run grade selection and dynamic copy

**Files:**
- Modify: `miniprogram/pages/intro/intro.js`
- Modify: `miniprogram/pages/intro/intro.wxml`
- Modify: `miniprogram/pages/intro/intro.wxss`
- Modify: `miniprogram/pages/test/test.js`
- Modify: `miniprogram/pages/test/test.wxml`
- Test: `tests/project-structure.test.js`

**Interfaces:**
- Intro exposes `selectInitialGrade(event)`.
- Diagnostic page uses the selected question count, never a hard-coded total.

- [ ] **Step 1: Write failing structure tests**

```js
assert.match(introJs, /selectInitialGrade\(event\)/);
assert.match(introWxml, /data-grade="\{\{item\.value\}\}"/);
assert.match(introWxml, /人教版/);
assert.match(testJs, /ENTRY_DIAGNOSTIC_COUNT|attempt\.questions\.length/);
assert.doesNotMatch(testJs, /total:\s*8/);
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test tests/project-structure.test.js`
Expected: FAIL because the selection controls and dynamic count are absent.

- [ ] **Step 3: Implement the UI behavior**

```js
selectInitialGrade(event) {
  const grade = Number(event.currentTarget.dataset.grade);
  const progress = this.store.confirmInitialGrade(this.store.load(), grade);
  this.setData({ progress, initialGradeConfirmed: true });
  this.startTest();
}
```

Show an explicit disabled state before grade selection. Display “人教版” as the fixed textbook label and “5 道起点小测，约 3 分钟” after confirmation.

- [ ] **Step 4: Re-run focused UI structure tests**

Run: `node --test tests/project-structure.test.js`
Expected: PASS.

### Task 4: Verify regression, package budget and DevTools preview

**Files:**
- Modify: `codex_showcase/preview-checklist.md`

- [ ] **Step 1: Run full automated regression**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Measure main package**

Run: `Get-ChildItem miniprogram -Recurse -File | Measure-Object Length -Sum`
Expected: total below `1.75 MiB`.

- [ ] **Step 3: Use WeChat DevTools local compile and walkthrough**

Observe: a clean local compile; grade chooser appears on clean storage; selecting grade opens five matching questions; completed flow reaches the result page.

- [ ] **Step 4: Record evidence**

Update `codex_showcase/preview-checklist.md` with pass/fail evidence and any DevTools limitation.

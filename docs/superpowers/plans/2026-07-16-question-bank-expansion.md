# Question Bank Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Grade 4 local practice bank to at least 80 reviewed original questions while preventing repeated prompts and repeated mistake retries.

**Architecture:** Keep the existing diagnostic bank stable. Move supplementary daily-practice questions into a dedicated local content module, merge it into the current practice bank, and make the manifest the source of the content version. Strengthen selection and retry rules through pure utility functions with Node tests.

**Tech Stack:** Native WeChat Mini Program JavaScript, Node built-in test runner, local storage.

---

### Task 1: Add content-quality regression tests

**Files:**
- Modify: `tests/question-bank.test.js`
- Modify: `tests/adaptive.test.js`

- [x] **Step 1: Write failing content tests**

```js
test('practice bank has release-ready coverage without diagnostic prompt duplicates', () => {
  assert.ok(practiceQuestions.length >= 80);
  assert.equal(new Set(practiceQuestions.map((item) => item.prompt)).size, practiceQuestions.length);
  const diagnosticPrompts = new Set(diagnosticQuestions.map((item) => item.prompt));
  assert.equal(practiceQuestions.some((item) => diagnosticPrompts.has(item.prompt)), false);
  const counts = practiceQuestions.reduce((result, item) => {
    result[item.knowledgePoint] = (result[item.knowledgePoint] || 0) + 1;
    return result;
  }, {});
  assert.ok(Object.values(counts).every((count) => count >= 4));
});

test('ten-question daily sets use broad knowledge coverage when alternatives exist', () => {
  const set = buildDailySet(practiceQuestions, profile, { goal: 10, date: '2026-07-16' });
  const counts = set.reduce((result, item) => {
    result[item.knowledgePoint] = (result[item.knowledgePoint] || 0) + 1;
    return result;
  }, {});
  assert.ok(Object.keys(counts).length >= 4);
  assert.ok(Object.values(counts).every((count) => count <= 2));
});
```

- [x] **Step 2: Run tests and confirm failure**

Run: `node --test tests/question-bank.test.js tests/adaptive.test.js`

Expected: failure because the current practice bank is below 80 questions, has prompt overlaps, and does not cap topics.

### Task 2: Add unit-organized local content

**Files:**
- Create: `miniprogram/utils/question-bank-content.js`
- Modify: `miniprogram/utils/question-bank.js`
- Modify: `miniprogram/utils/question-bank-manifest.js`

- [x] **Step 1: Define supplemental content groups**

Create local original item groups for large numbers, angle and line relationships, multiplication and division, operation laws, observation, decimals, triangles, perimeter, average/statistics, and optimization. Every item must include the common question shape:

```js
{
  id: 'p-fill-angle-1', grade: 4, term: '上册', unit: '角的度量',
  knowledgePoint: 'angle_measure', ability: 'geometry', type: 'fill', difficulty: 1,
  prompt: '一个平角是 ____ 度。', answer: '180',
  hint: '想一想一条直线形成的角。',
  solution: { summary: '平角等于 180 度。', steps: ['平角像一条直线。', '所以平角是 180 度。'] },
  commonMistakes: ['angle_unit', 'right_angle_confusion'],
}
```

- [x] **Step 2: Merge supplemental content without changing diagnostic IDs**

```js
const { supplementalPracticeQuestions } = require('./question-bank-content');
practiceQuestions.push(...supplementalPracticeQuestions.map(question));
```

- [x] **Step 3: Publish the content release**

Set `version` to `2026.07.16.1`, `updatedAt` to `2026-07-16`, and record release counts in the manifest.

- [x] **Step 4: Run question bank tests**

Run: `node --test tests/question-bank.test.js`

Expected: all question-bank tests pass.

### Task 3: Make daily selection diverse

**Files:**
- Modify: `miniprogram/utils/adaptive.js`
- Modify: `tests/adaptive.test.js`

- [x] **Step 1: Rank candidates with a topic cap**

```js
function chooseDailyCandidate(candidates, selectedKnowledgeCounts, goal) {
  const cap = goal >= 10 ? 2 : Number.POSITIVE_INFINITY;
  return candidates.find((item) => (selectedKnowledgeCounts[item.knowledgePoint] || 0) < cap)
    || candidates[0];
}
```

- [x] **Step 2: Track selected knowledge points during `buildDailySet`**

```js
const selectedKnowledgeCounts = {};
// After a candidate is selected:
selectedKnowledgeCounts[chosen.knowledgePoint] = (selectedKnowledgeCounts[chosen.knowledgePoint] || 0) + 1;
```

- [x] **Step 3: Run selection tests**

Run: `node --test tests/adaptive.test.js`

Expected: ten-question sets remain unique, contain all three types, use four or more knowledge points, and do not exceed the topic cap while alternatives exist.

### Task 4: Stop mistake retries from repeating the source question

**Files:**
- Modify: `miniprogram/utils/adaptive.js`
- Modify: `tests/adaptive.test.js`

- [x] **Step 1: Write a failing retry test**

```js
test('mistake retry chooses a different matching variant', () => {
  const source = practiceQuestions.find((item) => item.id === 'p-problem-division-1');
  const record = createMistakeRecord(source, '0', practiceQuestions);
  assert.notEqual(record.retryQuestionId, source.id);
  const retry = practiceQuestions.find((item) => item.id === record.retryQuestionId);
  assert.equal(retry.knowledgePoint, source.knowledgePoint);
  assert.equal(retry.type, source.type);
});
```

- [x] **Step 2: Exclude the source ID before matching**

```js
const siblingVariants = practiceBank.filter((candidate) => (
  candidate.id !== item.id
  && candidate.knowledgePoint === item.knowledgePoint
  && candidate.type === item.type
));
const retry = siblingVariants[0] || practiceBank.find((candidate) => candidate.id !== item.id && candidate.type === item.type);
```

- [x] **Step 3: Run retry tests**

Run: `node --test tests/adaptive.test.js`

Expected: retry uses a different question whenever a sibling variant exists.

### Task 5: Verify locally and in DevTools

**Files:**
- Modify: `docs/superpowers/specs/2026-07-16-question-bank-expansion-design.md`

- [ ] **Step 1: Run all tests**

Run: `node --test tests/*.test.js`

Expected: zero failures.

- [ ] **Step 2: Run static content report**

Run: `node -e "const b=require('./miniprogram/utils/question-bank'); console.log(b.practiceQuestions.length)"`

Expected: a value of at least `80`.

- [ ] **Step 3: Compile in WeChat DevTools**

Expected: no project-owned compile errors; the 10-question setting renders a mixed set and a wrong answer opens a different same-topic retry.

- [ ] **Step 4: Update the design specification**

Record the actual published content count and manifest version after verification.

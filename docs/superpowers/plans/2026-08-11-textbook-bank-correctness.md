# Textbook Bank Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the primary and junior generated banks so a learner receives unambiguous, non-repeated, edition-scoped questions with matching knowledge points, units, answers, and explanations.

**Architecture:** Introduce an explicit curriculum manifest with `textbookId`, grade, term, chapter, topic, and allowed model forms. Questions receive a content signature and result schema at generation time. The primary and junior generators use those contracts instead of using shared grade topics plus cosmetic edition labels; a quality gate rejects duplicates, missing conditions, wrong units, and curriculum mismatches before a question can be published.

**Tech Stack:** Native WeChat Mini Program JavaScript, Node.js built-in test runner, local generated question bank.

## Global Constraints

- Keep all questions original; reference public curriculum structure and common exam forms without copying external questions.
- Do not publish, upload, delete learner progress, or change the existing AppID.
- Preserve the public question-bank APIs used by adaptive practice, mistakes, diagnostics, and games.
- Every new rule must first be expressed as a failing Node test.
- A question may only use a textbook scope declared in the curriculum manifest; no cosmetic cross-edition relabeling.
- Geometry, measure, money, time, and count questions must declare their result dimension and unit policy instead of relying on keyword inference.

---

### Task 1: Establish Bank Quality Gates

**Files:**
- Create: `tests/question-bank-quality-gates.test.js`
- Modify: `miniprogram/utils/question-bank.js`

**Interfaces:**
- Produces `auditQuestionBankQuality(questions, options)` returning an array of issue objects with `code`, `questionIds`, and `message`.
- Uses `contentSignature`, `curriculum`, and `resultSchema` stored on every generated item.

- [ ] **Step 1: Write failing quality tests**

```js
assert.equal(auditQuestionBankQuality(allQuestions).length, 0);
assert.equal(findVisibleDuplicates(bankForScope).length, 0);
assert.equal(findDiagnosticPracticeOverlap(bankForScope).length, 0);
assert.equal(findCrossEditionCoreDuplicates(primaryPractice).length, 0);
assert.equal(findCurriculumMismatches(allQuestions).length, 0);
assert.equal(findResultSchemaIssues(allQuestions).length, 0);
```

- [ ] **Step 2: Run `node --test tests/question-bank-quality-gates.test.js`**

Expected initial result: failure for current junior diagnostic/practice overlap, cosmetic cross-edition duplicates, and missing curriculum/result metadata.

- [ ] **Step 3: Add pure quality-audit helpers**

```js
function auditQuestionBankQuality(questions, options = {}) {
  return [
    ...findVisibleDuplicates(questions, options),
    ...findDiagnosticPracticeOverlap(questions, options),
    ...findCrossEditionCoreDuplicates(questions, options),
    ...findCurriculumMismatches(questions, options),
    ...findResultSchemaIssues(questions, options),
  ];
}
```

- [ ] **Step 4: Re-run the focused test after each later generator task**

Expected final result: `0` quality issues across all published primary and junior questions.

### Task 2: Define Curriculum and Result Contracts

**Files:**
- Create: `miniprogram/utils/textbook-curriculum.js`
- Modify: `miniprogram/utils/textbook-catalog.js`
- Modify: `miniprogram/utils/junior-high-curriculum.js`

**Interfaces:**
- Produces `getCurriculumScope(textbookId, grade, topicKey, variant)` with `{ term, chapterId, chapterLabel, allowedForms, requiredConceptTokens }`.
- Produces `getEditionTopics(textbookId, grade, term)` and `getJuniorTopics(textbookId, grade, term)` backed by edition-specific chapter records.
- Produces `resultSchema` with `{ dimension, unitPolicy, acceptedUnit, finalAnswerFormat }`.

- [ ] **Step 1: Write failing scope assertions**

```js
const scope = getCurriculumScope('rjb', 6, 'volume_cone', 1);
assert.equal(scope.chapterId, 'g6-cone-volume');
assert.deepEqual(scope.requiredConceptTokens, ['圆锥', '底面积', '高', '除以3']);
assert.equal(getCurriculumScope('jr-rjb', 9, 'similar_triangle', 1).term, '上册');
```

- [ ] **Step 2: Add the primary and junior edition chapter manifests**

Each record defines an actual chapter id, term, compatible topic keys, allowed model forms, and required mathematical conditions. Shared national-core topics may remain available across editions only when their chapter records explicitly allow it; their model form and content signature must still differ by edition.

- [ ] **Step 3: Add result schemas for dimensions**

```js
const RESULT_SCHEMAS = {
  none: { dimension: 'none', unitPolicy: 'forbidden', acceptedUnit: '' },
  length: { dimension: 'length', unitPolicy: 'required' },
  area: { dimension: 'area', unitPolicy: 'required' },
  volume: { dimension: 'volume', unitPolicy: 'required' },
  money: { dimension: 'money', unitPolicy: 'required' },
  time: { dimension: 'time', unitPolicy: 'required' },
  count: { dimension: 'count', unitPolicy: 'optional' },
};
```

- [ ] **Step 4: Run curriculum and result-schema tests**

Expected result: every generated question resolves exactly one declared chapter and result schema.

### Task 3: Repair the Primary Generator

**Files:**
- Modify: `miniprogram/utils/question-bank-edition-data.js`
- Modify: `miniprogram/utils/question-bank-grade-data.js`
- Modify: `tests/question-bank.test.js`
- Modify: `tests/textbook-editions.test.js`

**Interfaces:**
- `createItem()` receives a curriculum scope and publishes `chapterId`, `contentSignature`, `resultSchema`, and `requiredConceptTokens`.
- `createThinkingForm()` only changes model form when the topic explicitly permits the form.

- [ ] **Step 1: Write failures for known incorrect primary forms**

```js
assert.match(findQuestion('volume_cone').prompt, /圆锥/);
assert.match(findQuestion('volume_cone').solution.steps.join(' '), /除以\s*3/);
assert.match(findQuestion('area_rectangle_g3').prompt, /长.*厘米.*宽.*厘米/);
assert.equal(findQuestion('area_rectangle_g3').answerUnit, '平方厘米');
assert.doesNotMatch(findQuestion('length_compare').prompt, /^\d+\s*[<>＝=]/);
```

- [ ] **Step 2: Replace unsafe generic model use**

Only arithmetic topics may use reverse reasoning or estimate checks. Unit, area, perimeter, circle, money, time, geometry, data, and concept topics keep their stated conditions and receive form-specific instructions such as `判断并说明理由` or `根据表中数据回答`.

- [ ] **Step 3: Correct topic models**

Implement separate models for whole-yuan money counting, clock reading, length comparison with measured objects, right-angle identification, two-digit-divisor division, rectangle/polygon area, cone volume, ratio simplification, and proportion equations.

- [ ] **Step 4: Make primary edition variants mathematically distinct**

Use each curriculum scope's allowed model forms and edition seed to choose direct calculation, inverse relation, contextual quantity, data table, estimation check, or condition-filter form. The model form and numerical relation are included in `contentSignature`; identical cross-edition core conditions are rejected.

- [ ] **Step 5: Run focused primary tests**

Run: `node --test tests/question-bank.test.js tests/textbook-editions.test.js tests/question-bank-quality-gates.test.js`

Expected result: all tests pass with no primary duplicate, curriculum, semantic, or unit issue.

### Task 4: Rebuild the Junior Generator

**Files:**
- Modify: `miniprogram/utils/question-bank-junior-data.js`
- Modify: `miniprogram/utils/junior-high-curriculum.js`
- Modify: `tests/junior-question-bank.test.js`
- Modify: `tests/junior-question-audit.test.js`

**Interfaces:**
- `renderQuestion(identity)` includes `identity.diagnostic`, chapter scope, and edition model form in its seed and signature.
- `buildMathModel(topic, options)` receives declared `allowedForms` and returns all visible conditions needed for a unique answer.

- [ ] **Step 1: Write failures for the known junior defects**

```js
assert.notEqual(diagnostic.contentSignature, practice.contentSignature);
assert.match(similarTriangle.prompt, /△ABC.*△DEF.*对应边/);
assert.match(similarTriangle.solution.steps.join(' '), /相似比/);
assert.match(geometryProof.prompt, /已知|求证/);
assert.match(geometryComprehensive.prompt, /圆|相似/);
```

- [ ] **Step 2: Separate diagnostic and practice variants**

Make the diagnostic bank select five lightweight chapter representative forms, and make practice select three different model forms per type/difficulty. Bank kind must change both content seed and content signature, not only question id.

- [ ] **Step 3: Replace cosmetic edition modes**

For each junior edition chapter manifest, create visible data, construction, measurement, discussion, or constraint material only when that form is selected. Remove artificial `任务序号` and mode prefixes that do not add mathematical conditions.

- [ ] **Step 4: Repair incomplete and mislabeled models**

Generate explicit corresponding triangles for similarity, real proof premises/conclusions for geometry proof, circle-plus-similarity conditions for comprehensive geometry, and reduce fractions to integers when the denominator is one.

- [ ] **Step 5: Run focused junior tests**

Run: `node --test tests/junior-question-bank.test.js tests/junior-question-audit.test.js tests/junior-canonical-correctness.test.js tests/question-bank-quality-gates.test.js`

Expected result: no diagnostic/practice overlap, no cross-edition core duplicate, and every junior prompt has sufficient visible conditions.

### Task 5: Wire Curriculum Scope Into Selection and Release Verification

**Files:**
- Modify: `miniprogram/utils/question-bank.js`
- Modify: `miniprogram/utils/adaptive.js`
- Modify: `miniprogram/utils/question-bank-manifest.js`
- Modify: `tests/adaptive.test.js`
- Modify: `codex_showcase/preview-checklist.md`

**Interfaces:**
- Question selectors accept optional `term` and `chapterId`; when supplied, they never leak a different edition, grade, term, or chapter.
- Manifest version changes only after the regenerated bank passes quality gates.

- [ ] **Step 1: Write selector isolation tests**

```js
const selected = getQuestions({ schoolStage: 'junior', textbookId: 'jr-rjb', grade: 9, term: '上册' });
assert.ok(selected.every((item) => item.textbookId === 'jr-rjb' && item.grade === 9 && item.term === '上册'));
```

- [ ] **Step 2: Preserve history and active learner settings**

Existing saved questions remain resolvable by id; new selection honors the active scope and uses replacement questions when an old generated id is unavailable.

- [ ] **Step 3: Run final verification**

Run `npm test`, parse every Mini Program JavaScript file with `node --check`, measure the main package, reopen the exact project in WeChat DevTools, and record any remaining simulator limitation honestly in `codex_showcase/preview-checklist.md`.

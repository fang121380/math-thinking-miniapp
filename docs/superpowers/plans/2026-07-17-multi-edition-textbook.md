# Multi-Edition Textbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make eight primary-school textbook editions provide version-aware learning maps and isolated original question sets across grades 1-6.

**Architecture:** A textbook catalogue owns edition labels and 48 grade learning maps. An edition-question generator creates original, curriculum-aligned diagnostic and practice items carrying `textbookId` and `editionUnitKey`; existing questions are explicitly migrated to `rjb`. Shared selectors filter all learner flows by selected edition before applying grade, topic, type, and difficulty rules.

**Tech Stack:** Native WeChat Mini Program JavaScript, CommonJS modules, Node built-in test runner.

---

### Task 1: Define catalogue contract

**Files:**
- Create: `miniprogram/utils/textbook-catalog.js`
- Test: `tests/textbook-editions.test.js`

- [ ] **Step 1: Write the failing tests** for eight selectable editions, six grade maps per edition, and valid current-learning data.
- [ ] **Step 2: Run the test** with `node --test tests/textbook-editions.test.js`; expect imports/exports to be absent.
- [ ] **Step 3: Implement the catalogue** with edition metadata, grade-specific unit labels, knowledge points, and learning-card summaries.
- [ ] **Step 4: Re-run the focused test**; expect the catalogue assertions to pass.

### Task 2: Add edition-owned question records

**Files:**
- Create: `miniprogram/utils/question-bank-edition-data.js`
- Modify: `miniprogram/utils/question-bank.js`
- Test: `tests/textbook-editions.test.js`

- [ ] **Step 1: Add failing tests** that each edition and grade exposes original choice, fill, and problem questions with unit metadata and explanations.
- [ ] **Step 2: Run the focused test**; expect the edition bank assertions to fail.
- [ ] **Step 3: Generate deterministic original practice and diagnostic variants** from each edition/grade map, and tag legacy records as `rjb`.
- [ ] **Step 4: Re-run the focused test**; expect all content integrity checks to pass.

### Task 3: Enforce edition isolation in learning flow

**Files:**
- Modify: `miniprogram/utils/adaptive.js`
- Modify: `miniprogram/utils/diagnostic.js`
- Modify: `miniprogram/utils/storage.js`
- Test: `tests/textbook-editions.test.js`

- [ ] **Step 1: Add failing tests** for daily/self-practice/diagnostic edition filtering, legacy RJB normalization, and switch-reset preservation.
- [ ] **Step 2: Run the focused test**; expect cross-edition data to appear or missing switch handling.
- [ ] **Step 3: Filter selection by `textbookId`, persist edition metadata in mistakes, and add a narrow active-set reset helper.**
- [ ] **Step 4: Re-run focused tests**; expect no selection to mix editions.

### Task 4: Bind settings and learning views

**Files:**
- Modify: `miniprogram/utils/learning-settings.js`
- Modify: `miniprogram/pages/mine/mine.js`
- Modify: `miniprogram/pages/practice/practice.js`
- Modify: `miniprogram/pages/growth/growth.js`
- Modify: `miniprogram/pages/analysis/analysis.js`
- Test: `tests/project-structure.test.js`

- [ ] **Step 1: Add failing UI-wiring assertions** for all textbook options and current-learning data binding.
- [ ] **Step 2: Run the affected tests**; expect static labels or generic content.
- [ ] **Step 3: Use catalogue data in the Mine learning card, scope topic choices and mistakes to the selected edition, and clear only active sets on edition change.**
- [ ] **Step 4: Re-run the affected tests**; expect all bindings to be present.

### Task 5: Verify audio and preview behavior

**Files:**
- Modify: `miniprogram/pages/result/result.js`
- Test: `tests/background-music.test.js`

- [ ] **Step 1: Add a failing routing assertion** for explicitly pausing BGM on Result.
- [ ] **Step 2: Implement the smallest explicit pause route.**
- [ ] **Step 3: Run `npm test`, syntax checks, asset checks, and a WeChat DevTools recompile.**
- [ ] **Step 4: Exercise audio toggle, question feedback, edition switching, daily practice, self-practice, diagnostic, and mistake analysis in the simulator.**

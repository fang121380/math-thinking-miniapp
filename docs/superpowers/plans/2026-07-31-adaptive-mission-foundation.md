# Adaptive Mission Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local knowledge mastery and spaced review so daily missions adapt to a learner without sacrificing question diversity.

**Architecture:** `adaptive.js` owns pure mastery, review, and mission-selection functions. `storage.js` persists normalized state. The existing question page sends answer outcomes into the pure engine, while the home page renders the resulting mission focus.

**Tech Stack:** Native WeChat Mini Program JavaScript, Node.js built-in test runner.

## Global Constraints

- Keep all data on-device and do not add network requests or personal information.
- Preserve grade, textbook, difficulty, type coverage, and non-repetition guarantees.
- Preserve the user-selectable daily goals of 3, 5, and 10.
- Use test-first development and keep `npm test` passing.

---

### Task 1: Knowledge Review State

**Files:**
- Modify: `miniprogram/utils/adaptive.js`
- Modify: `miniprogram/utils/storage.js`
- Test: `tests/adaptive.test.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Produces `updateKnowledgeState(current, result, date)` and `getDueKnowledgePoints(knowledgeState, date)`.
- Stores `knowledgeState` as an object indexed by knowledge point.

- [ ] Write failing tests for independent correct, hinted correct, wrong answers, due dates, and corrupt storage.
- [ ] Implement normalized mastery state and review-date calculation.
- [ ] Save `knowledgeState` through the existing progress store.
- [ ] Run `npm test -- --test-name-pattern="knowledge|review"`.

### Task 2: Mission Selector

**Files:**
- Modify: `miniprogram/utils/adaptive.js`
- Test: `tests/adaptive.test.js`

**Interfaces:**
- Extends `buildDailySet(bank, profile, context)` without changing its return type.
- Produces `describeMissionFocus(profile, questions, date)` for UI copy.

- [ ] Write failing tests that require due reviews first in a five-question set while retaining unique IDs and all three types.
- [ ] Rank candidates using due, mastery, seen history, question type, and deterministic learner/date seed.
- [ ] Implement short focus labels from the selected mission composition.
- [ ] Run `npm test -- --test-name-pattern="daily|mission|due"`.

### Task 3: Answer And Home Integration

**Files:**
- Modify: `miniprogram/pages/question/question.js`
- Modify: `miniprogram/pages/home/home.js`
- Modify: `miniprogram/pages/home/home.wxml`
- Test: `tests/project-structure.test.js`

**Interfaces:**
- Question submission calls `updateKnowledgeState` before saving progress.
- Home derives and renders one `missionFocus` value.

- [ ] Write failing structure tests for the new update call and home focus binding.
- [ ] Persist answer outcomes with the existing save path.
- [ ] Render concise mission focus beside the existing daily route.
- [ ] Run the focused tests and then the full test suite.

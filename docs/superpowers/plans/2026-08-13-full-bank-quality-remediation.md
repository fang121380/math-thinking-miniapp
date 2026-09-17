# Full Bank Quality Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every published primary and junior question pass explicit correctness, readability, metadata, option, unit, and duplicate-condition checks before the next release.

**Architecture:** Fix the source generators and static data rather than hiding defects in the UI. Each generated item must derive learner-visible wording, solution guidance, answer options, and its exam-pattern classification from the actual topic model. The final audit regenerates every scope and checks all emitted questions.

**Tech Stack:** Native WeChat Mini Program JavaScript, Node.js built-in test runner.

## Global Constraints

- Keep question maths, answer, answer unit, prompt and explanation internally consistent.
- Never display internal template labels, fake context tags, unavailable figures, placeholder answers, or ambiguous rounding targets.
- Preserve all supported textbook scopes: 8 primary editions for grades 1-6 and 8 junior editions for grades 7-9.
- New behavior must have a test that failed before its implementation.
- Do not upload, publish, or remove learner progress as part of this task.

---

### Task 1: Repair Junior Source Semantics and Collisions

**Files:**
- Modify: `miniprogram/utils/question-bank-junior-data.js`
- Modify: `tests/junior-question-bank.test.js`
- Modify: `tests/learner-facing-language.test.js`

- [ ] Add failing tests for deterministic topic-aligned exam patterns, no `如图` without an asset, no bare context labels, topic-specific explanations, and no repeated complete math conditions within a junior scope across diagnostic/practice, difficulty, and type.
- [ ] Map each junior topic to a real exam pattern, and replace random pattern selection.
- [ ] Remove artificial context labels; vary actual condition values and wording where needed.
- [ ] Make axis symmetry, geometry proof, and angle-line values use collision-resistant identity slots while staying age-appropriate.
- [ ] Replace generic junior hints, knowledge summaries, and mistake summaries with topic-specific guidance.
- [ ] Run junior source, canonical correctness, learner-language, and quality-gate tests.

### Task 2: Repair Primary Source Readability and Choice Contracts

**Files:**
- Modify: `miniprogram/utils/question-bank-edition-data.js`
- Modify: `tests/primary-question-generator-quality.test.js`

- [ ] Add failing tests for no generic quantity-relation phrasing on non-application topics, no placeholder options, and topic-aligned hints/summaries/mistake reminders.
- [ ] Restrict wording variants to neutral or topic-appropriate phrasing.
- [ ] Generate four meaningful, unique option values without `其他结果` or generic error placeholders.
- [ ] Derive learning guidance from the mathematical topic rather than the edition-wide profile.
- [ ] Run primary generator and quality-gate tests.

### Task 3: Strengthen Whole-Bank Audits and Serving De-duplication

**Files:**
- Modify: `miniprogram/utils/question-bank.js`
- Modify: `miniprogram/utils/adaptive.js` only if the existing selector can serve a previously-seen math condition despite unused alternatives.
- Modify: corresponding `tests/*.test.js`

- [ ] Add a regression test for any remaining duplicate condition found after Tasks 1-2.
- [ ] Ensure formal audits reject invalid option count, missing units for measured results, ambiguous estimates, unreadable source tokens, and duplicate complete conditions in a learner scope.
- [ ] If selection is the remaining duplicate source, persist condition signatures and prefer unseen mathematical conditions before falling back.
- [ ] Run all audit and adaptive tests.

### Task 4: Release Readiness Verification

**Files:**
- Modify: `miniprogram/utils/question-bank-manifest.js`
- Modify: `tests/question-bank.test.js` if the manifest version changes.

- [ ] Bump the local content version only after all audit gates pass.
- [ ] Regenerate all 21,261 published items and record counts, audit violations, exact prompt collisions, complete-condition collisions, bad option tokens, unit omissions, and estimate-target omissions.
- [ ] Run `npm test` with serial execution and inspect the completed result.
- [ ] Measure the Mini Program main package before DevTools testing.

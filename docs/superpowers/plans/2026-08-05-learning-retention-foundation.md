# Learning Retention Foundation Implementation Plan

> **For agentic workers:** Execute inline in this session. This workspace has no usable Git client, so do not create commits.

**Goal:** Make daily learning feel fresh, make recovery visibly rewarding, and make bundled content releases visible while preserving the current offline-first learning flow.

**Architecture:** Add pure theme helpers and extend the existing adaptive selector with an optional theme preference. Store only two normalized scalar fields. Reuse Home and Growth for display, and increment recovery progress only at the existing final recovery success point.

**Tech Stack:** Native WeChat Mini Program JavaScript/WXML/WXSS, Node built-in test runner, local `wx` storage adapter.

## Global Constraints

- Keep all question selection offline-first and scoped to the selected textbook, grade, difficulty, daily goal, and question types.
- Preserve due-review priority, challenge-mode thinking-pattern priority, daily ID stability, and unseen-first selection.
- Do not add rankings, social features, push notifications, cloud storage, media assets, or a new page.
- Keep recovery separate from daily completion and daily-star rewards.
- Use TDD: each production behavior starts with a focused failing Node test.

---

## File Structure

- `miniprogram/utils/daily-theme.js`: pure date-to-theme rotation and valid theme metadata.
- `miniprogram/utils/adaptive.js`: optional theme-ability preference in daily selection.
- `miniprogram/utils/storage.js`: normalized `recoveryWins` and `seenContentVersion` fields.
- `miniprogram/utils/question-bank-manifest.js`: release note metadata for the currently bundled bank.
- `miniprogram/pages/question/question.js`: increment the recovery total only after a correct remix answer.
- `miniprogram/pages/home/*`: show today's theme and the one-time content notice.
- `miniprogram/pages/growth/*`: show the recovery total as a positive progress statistic.
- `tests/*`: deterministic behavior and page-structure regression coverage.

### Task 1: Theme helper and themed daily selection

**Files:** Create `miniprogram/utils/daily-theme.js`; modify `miniprogram/utils/adaptive.js`; create `tests/daily-theme.test.js`.

- [ ] Write tests for valid date rotation, seven unique themes, invalid-date fallback, and a three-question set that includes a matching theme ability when such an eligible question exists.
- [ ] Run `node --test tests/daily-theme.test.js` and confirm it fails because the helper and selection preference do not exist.
- [ ] Implement `getDailyTheme(date)` and add a theme candidate preference after saved due-review and challenge choices but before ordinary type fallback.
- [ ] Run `node --test tests/daily-theme.test.js tests/adaptive-mission.test.js` and confirm all pass.

### Task 2: Persist recovery and release-notice state

**Files:** Modify `miniprogram/utils/storage.js`, `miniprogram/utils/question-bank-manifest.js`, `tests/storage.test.js`.

- [ ] Write tests proving invalid fields normalize, content acknowledgement persists, and fields survive unrelated settings updates.
- [ ] Run `node --test tests/storage.test.js` and confirm the new assertions fail.
- [ ] Add `recoveryWins: 0` and `seenContentVersion: ''` defaults plus strict normalizers. Add a plain release-note object to the bundled manifest.
- [ ] Run `node --test tests/storage.test.js tests/question-bank.test.js` and confirm all pass.

### Task 3: Count completed recovery chains

**Files:** Modify `miniprogram/pages/question/question.js`; modify `tests/project-structure.test.js`.

- [ ] Write a structural regression assertion requiring a recovery-win update only in the final `remix` correct-answer branch.
- [ ] Run `node --test tests/project-structure.test.js` and confirm it fails.
- [ ] Persist `recoveryWins + 1` only when `this.isRecovery`, `correct`, and `this.recoveryStage === 'remix'`; leave daily count and star calculations unchanged.
- [ ] Run `node --test tests/project-structure.test.js` and confirm it passes.

### Task 4: Present theme, release notice, and recovery progress

**Files:** Modify `miniprogram/pages/home/home.js`, `miniprogram/pages/home/home.wxml`, `miniprogram/pages/home/home.wxss`, `miniprogram/pages/growth/growth.js`, `miniprogram/pages/growth/growth.wxml`, `miniprogram/pages/growth/growth.wxss`, and `tests/project-structure.test.js`.

- [ ] Write structure tests for a visible daily theme, a dismissible version notice, and a recovery-progress label on Growth.
- [ ] Run `node --test tests/project-structure.test.js` and confirm it fails.
- [ ] Derive Home theme from the local date; show an update notice only when the manifest version is different from `seenContentVersion`; save the acknowledgement in the dismissal handler. Add a concise Growth recovery stat.
- [ ] Run `node --test tests/project-structure.test.js` and confirm it passes.

### Task 5: Regression verification

**Files:** Modify `codex_showcase/preview-checklist.md`.

- [ ] Run `npm test` and confirm zero failures.
- [ ] Record the exact automated result and any DevTools limitation without claiming unperformed true-device verification.
- [ ] Open the existing project through the DevTools CLI only; do not clear data, preview, upload, or publish.

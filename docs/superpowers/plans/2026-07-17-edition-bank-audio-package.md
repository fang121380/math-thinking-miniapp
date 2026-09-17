# Edition Bank, Audio, and Package Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each enabled textbook edition and grade select distinct randomized questions, separate audio feedback by interaction role, and reduce the true-device main package below 1.5 MB with all image and audio resources below 200 KB.

**Architecture:** Replace the shared offset-based question generator with structured edition-grade curriculum profiles that provide distinct topic families and wording. Persist an attempt nonce for stable daily sets and varying new sets. Keep short interaction feedback local and preload only page-required roles; move optional licensed BGM off the source package.

**Tech Stack:** Native WeChat Mini Program, CommonJS, Node built-in test runner, `wx.createInnerAudioContext`.

## Global Constraints

- Keep all question selection inside the selected textbook and grade.
- Preserve unfinished daily sets; new sets use a fresh persisted nonce.
- BGM remains optional and defaults off; only licensed online recordings are used.
- True-device main package must remain below 1.5 MB.
- Main-package images and audio combined must remain below 200 KB.
- Do not publish or upload a release in this task.

---

### Task 1: Guard the true-device package limit

**Files:**
- Modify: `tests/project-structure.test.js`
- Modify: `miniprogram/utils/background-music.js`
- Delete: `miniprogram/assets/audio/fur-elise.mp3`, `turkish-march.mp3`, `bach-minuet.mp3`, `learning-bgm.mp3`, `learning-bgm.wav`

**Interfaces:**
- Produces `BGM_TRACKS[*].source` as an HTTPS URL rather than a bundled music path.

- [x] Write a test that calculates the miniprogram source bytes and asserts the package is below 1.5 MB, image/audio resources are below 200 KB, and BGM sources are HTTPS.
- [x] Run the test and confirm it fails against bundled MP3 files.
- [x] Replace BGM paths with permitted remote sources and remove obsolete bundled BGM files.
- [x] Run the package test again and confirm it passes.

### Task 2: Make curriculum data edition-grade specific

**Files:**
- Modify: `tests/textbook-editions.test.js`
- Create: `miniprogram/utils/textbook-edition-profiles.js`
- Modify: `miniprogram/utils/question-bank-edition-data.js`

**Interfaces:**
- `getEditionGradeProfile(textbookId, grade)` returns an edition-specific topic family list.
- `buildEditionPracticeQuestions()` returns questions with distinct `knowledgePoint`, `editionUnitKey`, and prompt sets for every edition and grade.

- [x] Add tests that two editions at one grade cannot share a normalized prompt signature or ordered knowledge-point signature.
- [x] Run the tests and confirm they fail with the offset generator.
- [x] Define per-edition, per-grade curriculum profiles and generate choice, fill, and application variants from those profiles.
- [x] Run the edition tests and confirm every selected question remains valid and explained.

### Task 3: Persist varied attempt ordering

**Files:**
- Modify: `tests/textbook-editions.test.js`
- Modify: `tests/storage.test.js`
- Modify: `miniprogram/utils/storage.js`
- Modify: `miniprogram/utils/adaptive.js`
- Modify: `miniprogram/pages/home/home.js`
- Modify: `miniprogram/pages/question/question.js`

**Interfaces:**
- Progress includes `dailySetNonce`.
- `resolveDailyQuestionIds(bank, profile, date)` is stable for an active day and includes `dailySetNonce` in a fresh selection seed.

- [x] Add tests proving same saved daily set is stable while changing the nonce creates a different order without crossing textbook boundaries.
- [x] Run those tests and confirm the previous seed model fails the nonce expectation.
- [x] Persist and reset the nonce on a new daily set or changed learning setting.
- [x] Run adaptive and storage tests.

### Task 4: Assign audio by interaction role and reduce prepared contexts

**Files:**
- Modify: `tests/audio-feedback.test.js`
- Modify: `tests/project-structure.test.js`
- Modify: `miniprogram/utils/audio-feedback.js`
- Modify: `miniprogram/pages/home/home.js`
- Modify: `miniprogram/pages/games/games.js`
- Modify: `miniprogram/pages/growth/growth.js`
- Modify: `miniprogram/pages/mine/mine.js`
- Modify: `miniprogram/pages/question/question.js`
- Modify: `miniprogram/pages/test/test.js`
- Modify: `miniprogram/pages/practice/practice.js`
- Modify: `miniprogram/pages/game/game.js`

**Interfaces:**
- `createAudioFeedback({ preloadKinds })` prepares only requested role pools.
- `navigate` and `setting` are distinct role sources; navigation handlers use `navigate`.

- [x] Add failing tests for selective preload counts and separate navigation/setting role usage.
- [x] Run audio tests and confirm they fail because role sources and selective preload are absent.
- [x] Add roles, preload only the needed roles on each page, and call audio before rendering or navigation.
- [x] Run audio and structure tests.

### Task 5: Full regression and source-size verification

**Files:**
- Verify: `miniprogram/**`, `tests/**`

- [x] Run `npm test`.
- [x] Measure `miniprogram` source bytes and image/audio bytes with PowerShell and confirm they are below 1.5 MB and 200 KB respectively.
- [x] Inspect changed BGM sources, question signatures, and audio role tests before reporting results.

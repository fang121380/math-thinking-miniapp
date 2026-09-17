# Fan Math Settings And Diagnostic Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the confirmed 梵数学 brand, interactive learning settings, varied diagnostic attempts, a versioned question-bank catalog, and a colored rabbit asset.

**Architecture:** Add pure settings and diagnostic-selection helpers around the existing local storage and adaptive selector. Keep question content local and versioned. Drive the existing Today and Question pages from persisted daily IDs of variable length, and keep unsupported grades visibly unavailable.

**Tech Stack:** Native WeChat Mini Program, JavaScript, WXML/WXSS, Node test runner, generated PNG asset.

---

### Task 1: Settings model and persistence

**Files:**
- Create: `miniprogram/utils/learning-settings.js`
- Modify: `miniprogram/utils/storage.js`
- Modify: `tests/storage.test.js`

- [ ] Add failing tests for default difficulty, daily goal, edition, grade, and normalized allowed values.
- [ ] Run `node --test tests/storage.test.js` and confirm the new assertions fail.
- [ ] Implement settings constants and persisted defaults with safe normalization.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Difficulty and variable daily goals

**Files:**
- Modify: `miniprogram/utils/adaptive.js`
- Modify: `miniprogram/pages/home/home.js`
- Modify: `miniprogram/pages/home/home.wxml`
- Modify: `miniprogram/pages/question/question.js`
- Modify: `miniprogram/pages/question/question.wxml`
- Modify: `tests/adaptive.test.js`

- [ ] Add failing tests proving easy, medium, and hard choose different difficulty ranges and goals return 3, 5, and 10 unique IDs.
- [ ] Run `node --test tests/adaptive.test.js` and confirm failures.
- [ ] Extend daily selection to accept `difficultyMode` and `goal`, preserving all three question types.
- [ ] Replace hard-coded totals and step labels with generated question data.
- [ ] Run focused and full tests.

### Task 3: Varied eight-slot diagnostic attempts

**Files:**
- Modify: `miniprogram/utils/question-bank.js`
- Create: `miniprogram/utils/diagnostic.js`
- Modify: `miniprogram/pages/test/test.js`
- Modify: `miniprogram/pages/intro/intro.js`
- Create: `tests/diagnostic.test.js`

- [ ] Add failing tests for eight required slots, attempt stability, attempt-to-attempt diversity, and difficulty eligibility.
- [ ] Run `node --test tests/diagnostic.test.js` and confirm failures.
- [ ] Add original equivalent variants and the seeded diagnostic selector.
- [ ] Persist unfinished attempt IDs and increment attempt number after completion.
- [ ] Run focused and full tests.

### Task 4: Interactive Mine settings and brand update

**Files:**
- Modify: `miniprogram/pages/mine/mine.js`
- Modify: `miniprogram/pages/mine/mine.wxml`
- Modify: `miniprogram/pages/mine/mine.wxss`
- Modify: brand labels in `miniprogram/pages/*/*.wxml`, `miniprogram/app.js`, `miniprogram/sitemap.json`, and `project.config.json`
- Modify: `tests/project-structure.test.js`

- [ ] Add failing static tests for 梵数学 branding and the three interactive settings.
- [ ] Run the focused tests and confirm failures.
- [ ] Implement segmented difficulty/goal controls and edition/grade pickers with unavailable-grade feedback.
- [ ] Save settings and invalidate the daily set when selection changes.
- [ ] Run focused and full tests.

### Task 5: Versioned question-bank catalog

**Files:**
- Create: `miniprogram/utils/question-bank-manifest.js`
- Create: `docs/question-bank-catalog.md`
- Modify: `tests/question-bank.test.js`

- [ ] Add failing tests for manifest version, update date, edition, grade, and original-content provenance.
- [ ] Implement the manifest and catalog counts from the current bank.
- [ ] Run focused tests and validate every question remains structurally valid.

### Task 6: Colored rabbit asset

**Files:**
- Create: `miniprogram/assets/thinking-rabbit-color.png`
- Modify: rabbit references in WXML files
- Modify: `miniprogram/assets/SOURCES.md`

- [ ] Inspect the current rabbit line art and generate a colorized transparent-background variant preserving pose and outline.
- [ ] Validate dimensions, alpha corners, subject coverage, and absence of watermark/text.
- [ ] Update references and provenance without overwriting the original asset.

### Task 7: Verification in WeChat DevTools

**Files:**
- Create or update: `design-qa.md`

- [ ] Run `npm test`, JavaScript syntax checks, JSON parsing, asset checks, and secret scan.
- [ ] Recompile the project in WeChat DevTools.
- [ ] Verify Mine settings interactions, daily totals, difficulty changes, diagnostic variation, colored rabbit, branding, and safe-area layout.
- [ ] Record visual comparison and final result in `design-qa.md`.

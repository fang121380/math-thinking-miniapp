# 学段入口与思维任务体验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the coarse stage selector and quiz-like game presentation with a polished stage entry, interactive primary challenges, and mature junior thinking missions.

**Architecture:** `pages/intro` owns stage selection. `pages/games` becomes a stage-aware hub and routes primary users to the shared game page and junior users to a new mission page. Primary challenge modes extend the existing game engine; junior mission modes use a focused engine and render page while persisting through the existing game-progress contract.

**Tech Stack:** Native WeChat Mini Program WXML/WXSS/JavaScript, Node built-in test runner, existing local storage and bundled icons/audio.

## Global Constraints

- Keep existing learner records, current textbook defaults, and `schoolStage` / grade scope behavior.
- Do not add network requests, third-party packages, commercial assets, or large media files.
- Keep main package below `1.75 * 1024 * 1024` bytes and media below `1.3 * 1024 * 1024` bytes.
- Run a failing focused test before each production-code change, then run the relevant test green.
- This workspace has no usable Git executable; verify each task with tests instead of adding a commit step.

---

### Task 1: Build the stage-card entry

**Files:**
- Modify: `miniprogram/pages/intro/intro.js`
- Modify: `miniprogram/pages/intro/intro.wxml`
- Modify: `miniprogram/pages/intro/intro.wxss`
- Modify: `tests/project-structure.test.js`

**Interfaces:**
- Consumes: `schoolStageOptions`, `getGradeOptions(stage)`, `confirmInitialLearningLevel(progress, stage, grade)`.
- Produces: `stageCards`, `selectedStageCard`, and stage-specific grade rendering without changing confirmation persistence.

- [ ] **Step 1: Write the failing structural test**

```js
assert.match(introWxml, /stage-card/);
assert.match(introWxml, /data-stage="\{\{item\.value\}\}"/);
assert.match(introWxml, /成长岛闯关/);
assert.match(introWxml, /思维实验室/);
assert.match(introWxml, /wx:if="\{\{selectedSchoolStage\}\}"/);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/project-structure.test.js`

Expected: FAIL because the current segment control has no stage-card presentation.

- [ ] **Step 3: Implement the entry card view and selected state**

```js
const stageCards = schoolStageOptions.map((item) => ({
  ...item,
  title: item.value === 'primary' ? '成长岛闯关' : '思维实验室',
  description: item.value === 'primary' ? '短关卡，动手发现数学规律' : '用推理和建模解决真实任务',
  icon: item.value === 'primary' ? '/assets/thinking-rabbit-color.png' : '/assets/icons/chart-no-axes-column-increasing.svg',
}));
```

Render each card as a button with `data-stage`, preserve `selectInitialStage`, and add responsive CSS for selected, primary, and junior variants.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/project-structure.test.js`

Expected: PASS.

### Task 2: Add reusable primary interaction modes

**Files:**
- Modify: `miniprogram/utils/game-engine.js`
- Modify: `miniprogram/pages/game/game.js`
- Modify: `miniprogram/pages/game/game.wxml`
- Modify: `miniprogram/pages/game/game.wxss`
- Modify: `tests/game-engine.test.js`
- Modify: `tests/project-structure.test.js`

**Interfaces:**
- Consumes: `generateChallenge(type, options)`, `startOrResumeRound`, `updateActiveRound`, `completeRound`.
- Produces: `challenge.mode` values `construct`, `matching`, and `route`; player objects with mode-specific persisted state.

- [ ] **Step 1: Write failing generator and renderer tests**

```js
['change-maker', 'target-number', 'unit-station'].forEach((type) => {
  const challenge = generateChallenge(type, { difficulty: 'medium', rng: createSeededRandom(type), recentSignatures: [] });
  assert.equal(challenge.mode, 'construct');
  assert.ok(challenge.tokens.length >= 4);
  assert.ok(challenge.expectedValue !== undefined);
});
assert.match(gameWxml, /challenge\.mode === 'construct'/);
assert.match(gameWxml, /challenge\.mode === 'matching'/);
assert.match(gameWxml, /challenge\.mode === 'route'/);
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `node --test tests/game-engine.test.js tests/project-structure.test.js`

Expected: FAIL because most named games currently produce `choice` and the shared page does not render the three mode branches.

- [ ] **Step 3: Implement minimal mode contracts and player reducers**

```js
function initialPlayer(type, challenge) {
  if (challenge.mode === 'construct') return { tokens: [], step: 0, mistakes: 0 };
  if (challenge.mode === 'matching') return { selectedKeys: [], clearedKeys: [], attempts: 0 };
  if (challenge.mode === 'route') return { checkpoint: 0, mistakes: 0 };
  // existing puzzle, partition, and choice behavior remains below
}
```

Create deterministic, validated challenges for at least one type per new mode; route each existing named type only when its generator supplies a valid contract. Add token placement/removal, pair selection, and checkpoint choice handlers that persist before rendering the next state.

- [ ] **Step 4: Render board state, hint, reset, and completion correctly**

Add WXML branches by `challenge.mode`, 86rpx-or-larger buttons, and mode-specific completion feedback. Keep the current puzzle and partition branches unchanged except for shared state cleanup.

- [ ] **Step 5: Run focused tests and verify they pass**

Run: `node --test tests/game-engine.test.js tests/project-structure.test.js`

Expected: PASS with deterministic, non-choice challenges and structural renderer coverage.

### Task 3: Implement the junior mission engine and page

**Files:**
- Create: `miniprogram/utils/mission-engine.js`
- Create: `miniprogram/pages/mission/mission.js`
- Create: `miniprogram/pages/mission/mission.wxml`
- Create: `miniprogram/pages/mission/mission.wxss`
- Modify: `miniprogram/app.json`
- Modify: `tests/game-engine.test.js`
- Modify: `tests/project-structure.test.js`

**Interfaces:**
- Consumes: `createSeededRandom`, `getGamesForGrade`, `game-progress` round functions, active progress scope.
- Produces: `generateMission(type, options)`, `validateMission(mission)`, and a `pages/mission/mission` route that persists `round.player`.

- [ ] **Step 1: Write failing mission tests**

```js
['transform', 'coordinate', 'proof-chain', 'data-board'].forEach((mode) => {
  const mission = generateMission(mode, { grade: 8, difficulty: 'medium', rng: createSeededRandom(mode), recentSignatures: [] });
  assert.equal(validateMission(mission).valid, true);
  assert.equal(mission.mode, mode);
  assert.ok(mission.explanation.includes(String(mission.answer)));
});
assert.ok(config.pages.includes('pages/mission/mission'));
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `node --test tests/game-engine.test.js tests/project-structure.test.js`

Expected: FAIL because no mission engine or mission route exists.

- [ ] **Step 3: Implement deterministic, grade-scoped missions**

```js
function generateMission(type, options) {
  const mission = missionBuilders[type](normalizeMissionOptions(type, options));
  const validation = validateMission(mission);
  if (!validation.valid) throw new Error(`Invalid mission: ${validation.issues.join(', ')}`);
  return mission;
}
```

Map grade 7 to equation/data/geometry tasks, grade 8 to function/geometry/data tasks, and grade 9 to quadratic/geometry/probability tasks. Each mission exposes instructions, evidence cards or coordinate cells, one answer, hint, explanation, signature, and recent-signature avoidance.

- [ ] **Step 4: Implement the mission interaction page**

Use task header, progress indicator, mode-specific working area, and a compact “推理记录” summary. Reuse the existing local save, audio, safe-top and feedback patterns. Support reset, hint, retry save, next task, and back navigation. Do not reuse the primary choice-mode markup.

- [ ] **Step 5: Run focused tests and verify they pass**

Run: `node --test tests/game-engine.test.js tests/project-structure.test.js`

Expected: PASS with all four task modes valid and route declared.

### Task 4: Make the hub stage-aware and route correctly

**Files:**
- Modify: `miniprogram/pages/games/games.js`
- Modify: `miniprogram/pages/games/games.wxml`
- Modify: `miniprogram/pages/games/games.wxss`
- Modify: `tests/project-structure.test.js`

**Interfaces:**
- Consumes: `progress.schoolStage`, `getGamesForGrade(grade, stage)`, `getGameMeta(type)`.
- Produces: primary “成长岛闯关” and junior “思维任务” labels and correct `/pages/game` or `/pages/mission` navigation.

- [ ] **Step 1: Write the failing routing test**

```js
assert.match(gamesJs, /schoolStage === 'junior'/);
assert.match(gamesJs, /\/pages\/mission\/mission/);
assert.match(gamesWxml, /\{\{hubTitle\}\}/);
assert.match(gamesWxml, /\{\{hubCopy\}\}/);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/project-structure.test.js`

Expected: FAIL because the hub currently labels both audiences “思维游戏” and always routes to `pages/game`.

- [ ] **Step 3: Implement the stage-aware hub**

```js
const isJunior = progress.schoolStage === 'junior';
const destination = isJunior ? '/pages/mission/mission' : '/pages/game/game';
wx.navigateTo({ url: `${destination}?type=${type}&schoolStage=${stage}&grade=${grade}` });
```

Set junior copy to “任务目标、推理记录、完成复盘”, set primary copy to “短关卡、动手操作、发现规律”, and swap the active navigation label to “任务” only for junior.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/project-structure.test.js`

Expected: PASS.

### Task 5: Complete regression, size, and compiler verification

**Files:**
- Modify: `codex_showcase/preview-checklist.md`

**Interfaces:**
- Consumes: all implementation changes and the declared Mini Program routes.
- Produces: dated local verification record including automated tests, package size, and DevTools compile result.

- [ ] **Step 1: Run all automated tests**

Run: `npm test`

Expected: PASS with no skipped mission or primary-mode tests.

- [ ] **Step 2: Measure true-device main-package limits**

Run: `node --test tests/project-structure.test.js`

Expected: PASS for the existing main-package and media byte ceilings.

- [ ] **Step 3: Validate JSON and declared page folders**

Run: `node -e "const fs=require('fs'); const c=JSON.parse(fs.readFileSync('miniprogram/app.json','utf8')); c.pages.forEach(p=>['.js','.wxml','.wxss'].forEach(e=>{if(!fs.existsSync('miniprogram/'+p+e))throw new Error(p+e)})); console.log('routes valid')"`

Expected: `routes valid`.

- [ ] **Step 4: Compile locally in WeChat DevTools without upload**

Run the installed DevTools CLI against the existing project directory and inspect the generated local compile log. Do not issue preview, upload, publish, or desktop-input commands.

- [ ] **Step 5: Record verification evidence**

Update `codex_showcase/preview-checklist.md` with exact test totals, package byte total, timestamp, and any DevTools infrastructure timeout separated from code-level compile failures.

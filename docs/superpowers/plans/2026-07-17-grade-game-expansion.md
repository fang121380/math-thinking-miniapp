# Grade Game Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver grade-aware, randomized math-thinking games with immediate interaction feedback and distinct, shared short audio cues across the entire mini program.

**Architecture:** Keep generators and validation in `utils/game-engine.js`, with a declarative catalogue describing grade availability and display metadata. Preserve one generic game page, extending it with small interaction-mode renderers and persistent per-game rounds. The audio helper maps event roles to bundled local clips and permits rapid sequential events.

**Tech Stack:** Native WeChat Mini Program, JavaScript, WXML, WXSS, Node built-in test runner.

## Global Constraints

- Run entirely offline with no new network dependency.
- Keep existing learner progress, stars, sound setting, and safe-area handling compatible.
- Support selected grades 1 through 6, with five playable games visible for each grade band.
- Generate varied, solvable rounds and exclude each game's latest ten completed signatures.
- Keep each interaction usable by touch and provide feedback for invalid choices, load failure, and save failure.

---

### Task 1: Add Grade-Aware Catalogue And Generator Contracts

**Files:**
- Modify: `miniprogram/utils/game-engine.js`
- Modify: `tests/game-engine.test.js`

**Interfaces:**
- Produces `getGamesForGrade(grade)`, `getGameMeta(type)`, and `generateChallenge(type, options)`.
- `generateChallenge` returns `{ type, difficulty, signature, title, instruction, explanation, mode, answer, choices }` with game-specific board fields.

- [ ] Write failing tests proving grades 1, 4, and 6 expose five appropriate games, every catalogue game generates a challenge, and repeated seeded generation excludes a recent signature.
- [ ] Run `node --test tests/game-engine.test.js` and confirm the new expectations fail because catalogue functions and generators are absent.
- [ ] Implement the catalogue and ten lightweight generators: number chain, calculation match, shape hunt, change maker, order maze, target number, calculation sprint, fraction match, unit station, ratio reasoning, logic seats, and math cipher; retain puzzle, pattern, and partition.
- [ ] Run `node --test tests/game-engine.test.js` and confirm all game-engine tests pass.

### Task 2: Generalize Progress For New Game Types

**Files:**
- Modify: `miniprogram/utils/game-progress.js`
- Modify: `tests/game-progress.test.js`

**Interfaces:**
- Consumes `GAME_TYPES` from `game-engine.js`.
- Produces default, normalized, resumable, and reward-safe state for every catalogue type.

- [ ] Write failing tests proving newly available types get isolated default progress and an in-progress target-number round resumes without changing another type's progress.
- [ ] Run `node --test tests/game-progress.test.js` and confirm the tests fail because progress knows only three types.
- [ ] Replace the duplicated local type list with the engine catalogue type list while retaining corruption repair, latest-ten signatures, and one-time star rewards.
- [ ] Run `node --test tests/game-progress.test.js` and confirm all progress tests pass.

### Task 3: Upgrade Shared Sound Roles And Bundled Audio

**Files:**
- Modify: `miniprogram/utils/audio-feedback.js`
- Modify: `miniprogram/pages/question/question.js`
- Modify: `miniprogram/pages/test/test.js`
- Modify: `miniprogram/pages/home/home.js`
- Modify: `miniprogram/pages/practice/practice.js`
- Modify: `miniprogram/pages/analysis/analysis.js`
- Modify: `miniprogram/pages/growth/growth.js`
- Create: `miniprogram/assets/audio/tap.wav`
- Create: `miniprogram/assets/audio/move.wav`
- Create: `miniprogram/assets/audio/streak.wav`
- Modify: `miniprogram/assets/audio/correct.wav`
- Modify: `miniprogram/assets/audio/wrong.wav`
- Modify: `miniprogram/assets/audio/complete.wav`
- Modify: `tests/audio-feedback.test.js`

**Interfaces:**
- `createAudioFeedback().play(kind)` accepts `tap`, `move`, `correct`, `wrong`, `complete`, and `streak`.
- Rapid calls use independent contexts so a new event does not stop a sound that just began.
- All learning pages create the helper with the saved `soundEnabled` setting and call only the role matching the learner-visible event.

- [ ] Write failing tests proving every sound role resolves to a local clip and two rapid calls create and play two contexts.
- [ ] Run `node --test tests/audio-feedback.test.js` and confirm the new expectations fail.
- [ ] Implement role mapping and non-blocking context cleanup; add locally generated short WAV clips with clearly different pitch patterns; connect correct, wrong, completion, tap, and reminder events in question, diagnostic, home, practice, analysis, growth, and game pages.
- [ ] Run `node --test tests/audio-feedback.test.js` and confirm all audio tests pass.

### Task 4: Render And Play Every Grade Game

**Files:**
- Modify: `miniprogram/pages/games/games.js`
- Modify: `miniprogram/pages/games/games.wxml`
- Modify: `miniprogram/pages/games/games.wxss`
- Modify: `miniprogram/pages/game/game.js`
- Modify: `miniprogram/pages/game/game.wxml`
- Modify: `miniprogram/pages/game/game.wxss`
- Modify: `tests/project-structure.test.js`

**Interfaces:**
- Games page reads `progress.selectedGrade` and `getGamesForGrade` to render the matching catalogue.
- Game page consumes challenge `mode` and routes tap events through `selectChoice`, `selectItem`, `checkAnswer`, `hint`, `resetGame`, and `nextRound`.

- [ ] Write failing page contract tests requiring the games page to read grade-filtered catalogue data and the game page to contain selection, ordering, matching, and calculation interaction hooks.
- [ ] Run `node --test tests/project-structure.test.js` and confirm the new checks fail.
- [ ] Implement compact game list and generic game renderer with immediate `setData` updates, pressed/selected states, concise feedback, distinct audio calls, retry recovery, and compact-screen responsive grids.
- [ ] Run `npm test`, then import the project in WeChat DevTools and manually complete one game in grades 1, 4, and 6 with sound enabled and disabled.

### Task 5: Full Verification And Packaging

**Files:**
- Modify: `design-qa.md`

- [ ] Run `npm test` and a Node syntax check for all modified JavaScript files.
- [ ] Run a WeChat DevTools compile and inspect the console for errors.
- [ ] Play the selected three grade flows, including incorrect input, hint, reset, resume, and next-round variation.
- [ ] Record outcomes in `design-qa.md` and package the verified source when the user asks.

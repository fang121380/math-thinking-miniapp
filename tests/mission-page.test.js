const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { generateMission, createMissionPlayer } = require('../miniprogram/packages/junior/mission-engine');
const { createSeededRandom } = require('../miniprogram/utils/game-engine');
const { createProgressStore, defaultProgress } = require('../miniprogram/utils/storage');

const pagePath = path.join(__dirname, '..', 'miniprogram', 'packages', 'junior', 'mission', 'mission.js');
const gamePagePath = path.join(__dirname, '..', 'miniprogram', 'pages', 'game', 'game.js');

function loadMissionPage() {
  delete require.cache[require.resolve(pagePath)];
  let captured = null;
  global.getApp = () => ({ globalData: { safeTop: 24 } });
  global.wx = { showToast() {} };
  global.Page = (config) => { captured = config; };
  require(pagePath);
  delete global.getApp;
  delete global.wx;
  delete global.Page;
  return captured;
}

function loadGamePage() {
  delete require.cache[require.resolve(gamePagePath)];
  let captured = null;
  global.getApp = () => ({ globalData: { safeTop: 24 } });
  global.wx = { showToast() {} };
  global.Page = (config) => { captured = config; };
  require(gamePagePath);
  delete global.getApp;
  delete global.wx;
  delete global.Page;
  return captured;
}

function createContext(page, round) {
  const events = [];
  const context = {
    data: { ...page.data, complete: false, loading: false, pendingCompletion: false },
    round,
    events,
    progress: { soundEnabled: false },
    audio: { play(kind) { events.push(`audio:${kind}`); return true; } },
    setData(patch) { events.push('setData'); Object.assign(this.data, patch); },
    persistPlayer(player) {
      this.round = { ...this.round, player };
      return true;
    },
  };
  context.playSound = page.playSound;
  context.renderRound = page.renderRound;
  return context;
}

test('primary games and junior missions honor the learner-selected difficulty', () => {
  const primaryPage = loadGamePage();
  const primaryRound = primaryPage.createRound.call({ type: 'target-number' }, {
    learnerId: 'difficulty-primary', schoolStage: 'primary', grade: 4, difficultyMode: 'hard',
    gameProgress: { byType: { 'target-number': { completions: 0, recentSignatures: [] } } },
  });
  assert.equal(primaryRound.challenge.difficulty, 'hard');

  const missionPage = loadMissionPage();
  const missionRound = missionPage.createRound.call({ type: 'equation-lab' }, {
    learnerId: 'difficulty-junior', schoolStage: 'junior', grade: 7, difficultyMode: 'medium',
    gameProgress: { byType: { 'equation-lab': { completions: 0, recentSignatures: [] } } },
  });
  assert.equal(missionRound.challenge.difficulty, 'medium');
});

test('junior mission page renders each interaction workspace from the mission contract', () => {
  const page = loadMissionPage();
  const samples = [
    ['algebra-expression', 7, 'transform'],
    ['rational-number', 7, 'coordinate'],
    ['geometry-clue', 8, 'proof-chain'],
    ['data-reasoning', 8, 'data-board'],
  ];
  samples.forEach(([type, grade, format], index) => {
    const mission = generateMission(type, { grade, difficulty: 'medium', rng: createSeededRandom(`page-${type}-${index}`) });
    const context = createContext(page, { challenge: mission, player: createMissionPlayer(mission) });
    page.renderRound.call(context, context.round);
    assert.equal(context.data.format, format);
    if (format === 'transform' || format === 'proof-chain') {
      assert.ok(context.data.workspaceCards.length > context.data.orderedCards.length);
    } else if (format === 'coordinate') {
      assert.ok(context.data.coordinateCells.length >= 6);
      assert.equal(context.data.coordinateSelectedCount, 0);
    } else {
      assert.ok(context.data.evidenceCards.length >= 3);
      assert.ok(context.data.conclusionChoices.length >= 3);
    }
  });
});

test('mission interactions play feedback before rendering, preserve state, and submit through the validator', () => {
  const page = loadMissionPage();
  const mission = generateMission('algebra-expression', {
    grade: 7,
    difficulty: 'medium',
    rng: createSeededRandom('mission-interaction'),
  });
  const context = createContext(page, { challenge: mission, player: createMissionPlayer(mission) });
  page.renderRound.call(context, context.round);
  context.events.length = 0;

  const firstCard = mission.correctIds[0];
  page.selectWorkspaceCard.call(context, { currentTarget: { dataset: { id: firstCard } } });
  assert.deepEqual(context.round.player.orderedIds, [firstCard]);
  assert.ok(context.events.indexOf('audio:tap') < context.events.indexOf('setData'));

  context.events.length = 0;
  context.round = { ...context.round, player: { format: mission.format, orderedIds: [...mission.correctIds] } };
  context.finishMission = () => context.events.push('finish');
  page.checkMission.call(context);
  assert.deepEqual(context.events, ['finish']);

  context.events.length = 0;
  context.round = { ...context.round, player: createMissionPlayer(mission) };
  page.checkMission.call(context);
  assert.ok(context.events.indexOf('audio:wrong') < context.events.indexOf('setData'));
  assert.match(context.data.feedbackText, /推理链/);
});

test('completed data missions are persisted as pattern journey progress', () => {
  const page = loadMissionPage();
  let savedProgress;
  const store = createProgressStore({
    get() { return savedProgress; },
    set(next) { savedProgress = next; },
  });
  const progress = store.save({
    ...defaultProgress(),
    gameJourneyCounts: { calculation: 0, problem: 0, geometry: 0, pattern: 2 },
  });
  const context = {
    type: 'data-reasoning',
    progress,
    gameProgress: progress.gameProgress,
    store,
  };

  assert.equal(page.commitGameProgress.call(context, progress.gameProgress, 1, true), true);
  assert.equal(context.progress.gameJourneyCounts.pattern, 3);
  assert.equal(Object.hasOwn(context.progress.gameJourneyCounts, 'data'), false);
});

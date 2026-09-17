const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  createDefaultGameProgress,
  normalizeGameProgress,
  startOrResumeRound,
  updateActiveRound,
  completeRound,
  abandonRound,
  roundMatchesScope,
  canResumeSavedRound,
} = require('../miniprogram/utils/game-progress');
const {
  createSeededRandom,
  generateChallenge,
  validateGameChallenge,
} = require('../miniprogram/utils/game-engine');

test('game progress defaults every type independently', () => {
  const progress = createDefaultGameProgress();
  ['puzzle', 'pattern', 'partition'].forEach((type) => {
    assert.deepEqual(progress.byType[type], {
      completions: 0,
      activeRound: null,
      recentSignatures: [],
    });
  });
  assert.deepEqual(progress.rewardedRoundIds, []);
});

test('normalization repairs corrupt nested game progress', () => {
  const normalized = normalizeGameProgress({
    byType: {
      puzzle: { completions: -2, activeRound: 'bad', recentSignatures: ['a', null] },
    },
    rewardedRoundIds: 'bad',
  });
  assert.equal(normalized.byType.puzzle.completions, 0);
  assert.equal(normalized.byType.puzzle.activeRound, null);
  assert.deepEqual(normalized.byType.puzzle.recentSignatures, ['a']);
  assert.deepEqual(normalized.rewardedRoundIds, []);
});

test('unfinished round resumes without generating a replacement', () => {
  const first = startOrResumeRound(createDefaultGameProgress(), 'pattern', () => ({
    id: 'round-1',
    signature: 'sig-1',
    challenge: { answer: 12 },
    player: { selectedAnswer: null },
  }));
  let generated = 0;
  const resumed = startOrResumeRound(first.gameProgress, 'pattern', () => {
    generated += 1;
    return { id: 'round-2' };
  });
  assert.equal(first.resumed, false);
  assert.equal(resumed.resumed, true);
  assert.equal(resumed.round.id, 'round-1');
  assert.equal(generated, 0);
});

test('a legacy saved game that fails the visible-content audit is replaced', () => {
  const legacyChallenge = {
    type: 'logic-seats',
    difficulty: 'easy',
    signature: 'seat:easy:小明-小丽-小红:1',
    title: '逻辑排座位',
    instruction: '小明坐最左边，小红坐最右边。谁坐中间？',
    choices: ['小明', '小丽', '小红', '无法确定'],
    answer: '小丽',
    explanation: '按条件从左到右排成小明、小丽、小红，所以答案是小丽。',
  };
  const saved = updateActiveRound(createDefaultGameProgress(), 'logic-seats', {
    id: 'legacy-logic-round',
    signature: legacyChallenge.signature,
    challenge: legacyChallenge,
    player: { selectedAnswer: null },
  });
  const freshChallenge = generateChallenge('logic-seats', {
    difficulty: 'easy',
    rng: createSeededRandom('fresh-logic-round'),
    recentSignatures: [],
  });
  let generated = 0;

  const result = startOrResumeRound(saved, 'logic-seats', () => {
    generated += 1;
    return {
      id: 'fresh-logic-round',
      signature: freshChallenge.signature,
      challenge: freshChallenge,
      player: { selectedAnswer: null },
    };
  }, (round) => (
    Boolean(round && round.challenge)
    && round.signature === round.challenge.signature
    && validateGameChallenge(round.challenge).valid
  ));

  assert.equal(result.resumed, false);
  assert.equal(result.round.id, 'fresh-logic-round');
  assert.equal(generated, 1);
});

test('active player state can be persisted between page visits', () => {
  const started = startOrResumeRound(createDefaultGameProgress(), 'puzzle', () => ({
    id: 'round-1', signature: 'sig-1', challenge: {}, player: { moves: 0 },
  }));
  const updated = updateActiveRound(started.gameProgress, 'puzzle', {
    ...started.round,
    player: { moves: 3 },
  });
  assert.equal(updated.byType.puzzle.activeRound.player.moves, 3);
});

test('completion rewards once, clears active state, and records recent signatures', () => {
  const started = startOrResumeRound(createDefaultGameProgress(), 'partition', () => ({
    id: 'round-1', signature: 'sig-1', challenge: {}, player: {},
  }));
  const first = completeRound(started.gameProgress, 'partition', started.round);
  const second = completeRound(first.gameProgress, 'partition', started.round);
  assert.equal(first.rewarded, true);
  assert.equal(second.rewarded, false);
  assert.equal(second.gameProgress.byType.partition.completions, 1);
  assert.equal(second.gameProgress.byType.partition.activeRound, null);
  assert.deepEqual(second.gameProgress.byType.partition.recentSignatures, ['sig-1']);
});

test('replaying an already rewarded round clears a stale active copy without another reward', () => {
  const started = startOrResumeRound(createDefaultGameProgress(), 'puzzle', () => ({
    id: 'round-1', signature: 'sig-1', challenge: {}, player: {},
  }));
  const completed = completeRound(started.gameProgress, 'puzzle', started.round).gameProgress;
  const stale = updateActiveRound(completed, 'puzzle', started.round);
  const recovered = completeRound(stale, 'puzzle', started.round);
  assert.equal(recovered.rewarded, false);
  assert.equal(recovered.gameProgress.byType.puzzle.activeRound, null);
  assert.equal(recovered.gameProgress.byType.puzzle.completions, 1);
});

test('recent signatures keep the newest ten and reward history keeps the newest hundred', () => {
  let progress = createDefaultGameProgress();
  for (let index = 0; index < 105; index += 1) {
    const type = 'puzzle';
    const round = { id: `round-${index}`, signature: `sig-${index}`, challenge: {}, player: {} };
    progress = completeRound(progress, type, round).gameProgress;
  }
  assert.equal(progress.byType.puzzle.recentSignatures.length, 10);
  assert.deepEqual(progress.byType.puzzle.recentSignatures.slice(0, 2), ['sig-104', 'sig-103']);
  assert.equal(progress.rewardedRoundIds.length, 100);
  assert.equal(progress.rewardedRoundIds[0], 'round-104');
  assert.equal(progress.rewardedRoundIds.at(-1), 'round-5');
});

test('abandoning one type does not alter the other active rounds', () => {
  const puzzle = startOrResumeRound(createDefaultGameProgress(), 'puzzle', () => ({
    id: 'p1', signature: 'p1', challenge: {}, player: {},
  }));
  const pattern = startOrResumeRound(puzzle.gameProgress, 'pattern', () => ({
    id: 'r1', signature: 'r1', challenge: {}, player: {},
  }));
  const abandoned = abandonRound(pattern.gameProgress, 'puzzle');
  assert.equal(abandoned.byType.puzzle.activeRound, null);
  assert.equal(abandoned.byType.pattern.activeRound.id, 'r1');
});

test('a saved junior round resumes only in the same school stage and grade', () => {
  assert.equal(typeof roundMatchesScope, 'function');
  const type = 'equation-lab';
  const savedRound = {
    id: 'junior-g7-round',
    signature: 'junior-g7-signature',
    schoolStage: 'junior',
    grade: 7,
    challenge: {},
    player: {},
  };
  const saved = updateActiveRound(createDefaultGameProgress(), type, savedRound);
  let generated = 0;
  const replacement = { ...savedRound, id: 'junior-g8-round', signature: 'junior-g8-signature', grade: 8 };
  const result = startOrResumeRound(
    saved,
    type,
    () => { generated += 1; return replacement; },
    (round) => roundMatchesScope(round, { schoolStage: 'junior', grade: 8 }),
  );
  assert.equal(result.resumed, false);
  assert.equal(result.replaced, true);
  assert.equal(result.round.id, replacement.id);
  assert.equal(generated, 1);
  assert.equal(roundMatchesScope(savedRound, { schoolStage: 'primary', grade: 7 }), false);
});

test('saved-round validation rejects tampered embedded stage, grade, and game type', () => {
  const challenge = generateChallenge('quadratic-path', {
    difficulty: 'medium', grade: 9, schoolStage: 'junior',
    rng: createSeededRandom('saved-scope-integrity'), recentSignatures: [],
  });
  const round = {
    id: 'junior-g9-quadratic',
    type: 'quadratic-path',
    signature: challenge.signature,
    schoolStage: 'junior',
    grade: 9,
    challenge,
    player: { selectedAnswer: null },
  };
  const scope = { schoolStage: 'junior', grade: 9 };
  assert.equal(canResumeSavedRound(round, scope, 'quadratic-path'), true);
  assert.equal(canResumeSavedRound({ ...round, type: 'trig-exact' }, scope, 'quadratic-path'), false);
  assert.equal(canResumeSavedRound({
    ...round, challenge: { ...challenge, type: 'trig-exact' },
  }, scope, 'quadratic-path'), false);
  assert.equal(canResumeSavedRound({
    ...round, challenge: { ...challenge, schoolStage: 'primary' },
  }, scope, 'quadratic-path'), false);
  assert.equal(canResumeSavedRound({
    ...round, challenge: { ...challenge, grade: 8 },
  }, scope, 'quadratic-path'), false);
});

test('game pages propagate school stage and grade and surface replacement recovery copy', () => {
  const root = path.join(__dirname, '..', 'miniprogram');
  const gamesPage = fs.readFileSync(path.join(root, 'pages', 'games', 'games.js'), 'utf8');
  const gamePage = fs.readFileSync(path.join(root, 'pages', 'game', 'game.js'), 'utf8');
  const feedback = fs.readFileSync(path.join(root, 'utils', 'activity-feedback.js'), 'utf8');
  assert.match(gamesPage, /getGamesForGrade\(progress\.grade,\s*progress\.schoolStage\)/);
  assert.match(gamesPage, /schoolStage=\$\{this\.data\.schoolStage\}/);
  assert.match(gamesPage, /grade=\$\{this\.data\.grade\}/);
  assert.match(gamePage, /schoolStage:\s*progress\.schoolStage/);
  assert.match(gamePage, /grade:\s*progress\.grade/);
  assert.match(gamePage, /canResumeSavedRound/);
  assert.match(gamePage, /game_round_replaced/);
  assert.match(feedback, /game_round_replaced/);
});

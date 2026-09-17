const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildDailySet,
  buildRecoverySet,
  normalizeDailyMissionMode,
} = require('../miniprogram/utils/adaptive');

function question(id, type, difficulty, knowledgePoint, examPattern = 'calculation_model') {
  return {
    id,
    grade: 4,
    textbookId: 'rjb',
    term: '上册',
    type,
    difficulty,
    knowledgePoint,
    examPattern,
    ability: knowledgePoint === 'shape' ? 'geometry' : 'calculation',
  };
}

const bank = [
  question('due-choice', 'choice', 2, 'due-point', 'condition_filter'),
  question('due-fill', 'fill', 2, 'due-point', 'reverse_reasoning'),
  question('due-problem', 'problem', 2, 'due-point', 'chart_data'),
  question('other-choice', 'choice', 2, 'other-point', 'calculation_model'),
  question('other-fill', 'fill', 2, 'other-point', 'estimation_check'),
  question('other-problem', 'problem', 2, 'other-point', 'strategy_combination'),
  question('easy-bridge', 'choice', 1, 'recover-point', 'visual_observation'),
  question('medium-original', 'choice', 2, 'recover-point', 'calculation_model'),
  question('medium-remix', 'fill', 2, 'recover-point', 'reverse_reasoning'),
  question('medium-remix-two', 'problem', 2, 'recover-point', 'condition_filter'),
];

const baseProfile = {
  grade: 4,
  textbookId: 'rjb',
  dailyGoal: 3,
  difficultyMode: 'medium',
  learnerId: 'learner-journey',
  completedIds: [],
  servedQuestionIds: [],
  weakKnowledgePoints: ['due-point'],
  knowledgeState: {
    'due-point': { mastery: 35, nextReviewDate: '2026-08-03' },
  },
};

const baseContext = {
  learnerId: 'learner-journey',
  date: '2026-08-04',
  grade: 4,
  textbookId: 'rjb',
  difficultyMode: 'medium',
  dailySetNonce: 11,
};

test('daily mission modes normalize to review or challenge', () => {
  assert.equal(normalizeDailyMissionMode('review'), 'review');
  assert.equal(normalizeDailyMissionMode('challenge'), 'challenge');
  assert.equal(normalizeDailyMissionMode('anything-else'), 'review');
});

test('review mission leads with due knowledge and still includes each question type', () => {
  const questions = buildDailySet(bank, baseProfile, {
    ...baseContext,
    missionMode: 'review',
  });

  assert.equal(questions.length, 3);
  assert.equal(questions[0].knowledgePoint, 'due-point');
  assert.deepEqual(questions.map((item) => item.type).sort(), ['choice', 'fill', 'problem']);
});

test('challenge mission keeps the selected difficulty and includes a thinking pattern', () => {
  const questions = buildDailySet(bank, {
    ...baseProfile,
    weakKnowledgePoints: [],
    knowledgeState: {},
  }, {
    ...baseContext,
    missionMode: 'challenge',
  });

  assert.equal(questions.length, 3);
  assert.ok(questions.every((item) => item.difficulty === 2));
  assert.ok(questions.some((item) => item.examPattern !== 'calculation_model'));
  assert.equal(new Set(questions.map((item) => item.id)).size, 3);
});

test('recovery picks a smaller same-topic step and a distinct same-level remix', () => {
  const original = bank.find((item) => item.id === 'medium-original');
  const recovery = buildRecoverySet(bank, original, baseProfile, baseContext);

  assert.ok(recovery);
  assert.equal(recovery.bridgeQuestion.id, 'easy-bridge');
  assert.equal(recovery.bridgeQuestion.knowledgePoint, original.knowledgePoint);
  assert.ok(recovery.bridgeQuestion.difficulty < original.difficulty);
  assert.equal(recovery.remixQuestion.knowledgePoint, original.knowledgePoint);
  assert.equal(recovery.remixQuestion.difficulty, original.difficulty);
  assert.notEqual(recovery.remixQuestion.id, original.id);
  assert.notEqual(recovery.remixQuestion.id, recovery.bridgeQuestion.id);
  assert.notEqual(recovery.remixQuestion.examPattern, original.examPattern);
});

test('recovery stays unavailable when two safe alternatives do not exist', () => {
  const original = bank.find((item) => item.id === 'medium-original');
  const unsafe = [original, bank.find((item) => item.id === 'easy-bridge')];
  assert.equal(buildRecoverySet(unsafe, original, baseProfile, baseContext), null);
});

test('an easy question can use two distinct same-topic variants when no easier level exists', () => {
  const original = question('easy-original', 'choice', 1, 'easy-recover', 'calculation_model');
  const easyOne = question('easy-one', 'fill', 1, 'easy-recover', 'calculation_model');
  const easyTwo = question('easy-two', 'problem', 1, 'easy-recover', 'calculation_model');
  const recovery = buildRecoverySet([original, easyOne, easyTwo], original, baseProfile, baseContext);

  assert.ok(recovery);
  assert.equal(recovery.bridgeQuestion.knowledgePoint, 'easy-recover');
  assert.equal(recovery.remixQuestion.knowledgePoint, 'easy-recover');
  assert.notEqual(recovery.bridgeQuestion.id, recovery.remixQuestion.id);
});

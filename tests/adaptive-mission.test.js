const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildDailySet,
  describeMissionFocus,
  updateKnowledgeState,
  getDueKnowledgePoints,
  recordRecoveryWin,
} = require('../miniprogram/utils/adaptive');
const { createProgressStore, defaultProgress } = require('../miniprogram/utils/storage');

test('independent correct answers raise mastery and widen review intervals', () => {
  const first = updateKnowledgeState({}, { correct: true, usedHint: false }, '2026-07-31');
  assert.deepEqual(first, {
    mastery: 65,
    reviewStage: 1,
    nextReviewDate: '2026-08-01',
    lastPracticedDate: '2026-07-31',
  });

  const second = updateKnowledgeState(first, { correct: true, usedHint: false }, '2026-08-01');
  assert.deepEqual(second, {
    mastery: 80,
    reviewStage: 2,
    nextReviewDate: '2026-08-04',
    lastPracticedDate: '2026-08-01',
  });
});

test('hinted and wrong answers schedule a next-day review without invalid mastery', () => {
  const hinted = updateKnowledgeState({}, { correct: true, usedHint: true }, '2026-07-31');
  assert.deepEqual(hinted, {
    mastery: 57,
    reviewStage: 0,
    nextReviewDate: '2026-08-01',
    lastPracticedDate: '2026-07-31',
  });

  const wrong = updateKnowledgeState({ mastery: 10, reviewStage: 3 }, { correct: false, usedHint: false }, '2026-07-31');
  assert.deepEqual(wrong, {
    mastery: 0,
    reviewStage: 0,
    nextReviewDate: '2026-08-01',
    lastPracticedDate: '2026-07-31',
  });
});

test('due knowledge points are returned only when their review date has arrived', () => {
  const due = getDueKnowledgePoints({
    division: { nextReviewDate: '2026-07-31' },
    fraction: { nextReviewDate: '2026-08-02' },
    geometry: { nextReviewDate: '' },
  }, '2026-07-31');
  assert.deepEqual(due, ['division']);
});

test('progress storage defaults and repairs local knowledge state', () => {
  assert.deepEqual(defaultProgress().knowledgeState, {});
  let saved;
  const store = createProgressStore({
    get: () => ({ knowledgeState: { valid: { mastery: 80 }, broken: 'bad-data' } }),
    set: (value) => { saved = value; },
  });
  const loaded = store.load();
  assert.deepEqual(loaded.knowledgeState, {
    valid: {
      mastery: 80,
      reviewStage: 0,
      nextReviewDate: '',
      lastPracticedDate: '',
    },
  });
  store.save({ ...loaded, knowledgeState: ['bad-data'] });
  assert.deepEqual(saved.knowledgeState, {});
});

test('a five-question mission leads with a due review and still covers every question type', () => {
  const bank = [
    { id: 'due-fill', type: 'fill', difficulty: 2, grade: 4, textbookId: 'rjb', term: '上册', knowledgePoint: 'due_topic' },
    { id: 'weak-choice', type: 'choice', difficulty: 2, grade: 4, textbookId: 'rjb', term: '上册', knowledgePoint: 'weak_topic' },
    { id: 'weak-problem', type: 'problem', difficulty: 2, grade: 4, textbookId: 'rjb', term: '上册', knowledgePoint: 'weak_topic' },
    { id: 'current-choice', type: 'choice', difficulty: 2, grade: 4, textbookId: 'rjb', term: '上册', knowledgePoint: 'current_topic' },
    { id: 'current-fill', type: 'fill', difficulty: 2, grade: 4, textbookId: 'rjb', term: '上册', knowledgePoint: 'current_topic' },
    { id: 'current-problem', type: 'problem', difficulty: 2, grade: 4, textbookId: 'rjb', term: '上册', knowledgePoint: 'current_topic' },
    { id: 'reasoning-choice', type: 'choice', difficulty: 2, grade: 4, textbookId: 'rjb', term: '上册', knowledgePoint: 'reasoning_topic', examPattern: 'reverse_reasoning' },
  ];
  const profile = {
    learnerId: 'mission-learner',
    grade: 4,
    textbookId: 'rjb',
    difficultyMode: 'medium',
    dailyGoal: 5,
    completedIds: [],
    servedQuestionIds: [],
    weakKnowledgePoints: ['weak_topic'],
    knowledgeState: {
      due_topic: { mastery: 85, nextReviewDate: '2026-07-31' },
      weak_topic: { mastery: 20, nextReviewDate: '2026-08-05' },
    },
  };
  const mission = buildDailySet(bank, profile, { date: '2026-07-31', goal: 5, difficultyMode: 'medium' });
  assert.equal(mission.length, 5);
  assert.equal(mission[0].knowledgePoint, 'due_topic');
  assert.equal(new Set(mission.map((item) => item.id)).size, 5);
  assert.deepEqual([...new Set(mission.map((item) => item.type))].sort(), ['choice', 'fill', 'problem']);
  assert.equal(describeMissionFocus(profile, mission, '2026-07-31'), 'review');
});

test('only a completed final recovery step records a recovery win', () => {
  assert.equal(recordRecoveryWin(2, false), 2);
  assert.equal(recordRecoveryWin(2, true), 3);
  assert.equal(recordRecoveryWin(-3, true), 1);
  assert.equal(recordRecoveryWin('bad', false), 0);
});

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeLearningScope,
  learningScopeKey,
  learningSessionKey,
  isSameLearningScope,
  filterRecordsForLearningScope,
} = require('../miniprogram/utils/learning-scope');

test('learning scope keeps textbook, school stage, and grade as one atomic selection', () => {
  const rjbGradeSeven = normalizeLearningScope({
    schoolStage: 'junior',
    textbookId: 'jr-rjb',
    grade: 7,
  });
  const lujGradeSeven = normalizeLearningScope({
    schoolStage: 'junior',
    textbookId: 'jr-luj',
    grade: 7,
  });
  const primaryGradeFour = normalizeLearningScope({
    schoolStage: 'primary',
    textbookId: 'rjb',
    grade: 4,
  });

  assert.equal(learningScopeKey(rjbGradeSeven), 'junior:jr-rjb:g7');
  assert.equal(learningScopeKey(lujGradeSeven), 'junior:jr-luj:g7');
  assert.equal(learningScopeKey(primaryGradeFour), 'primary:rjb:g4');
  assert.equal(isSameLearningScope(rjbGradeSeven, lujGradeSeven), false);
  assert.equal(isSameLearningScope(rjbGradeSeven, primaryGradeFour), false);
});

test('learning scope guard treats missing or out-of-stage values as safe defaults', () => {
  assert.deepEqual(normalizeLearningScope({}), {
    schoolStage: 'primary',
    textbookId: 'rjb',
    grade: 4,
  });
  assert.deepEqual(normalizeLearningScope({ schoolStage: 'junior', textbookId: '', grade: 4 }), {
    schoolStage: 'junior',
    textbookId: 'jr-rjb',
    grade: 7,
  });
  assert.equal(
    isSameLearningScope(
      { schoolStage: 'primary', textbookId: 'rjb', grade: 4 },
      { schoolStage: 'primary', textbookId: 'rjb', grade: 4 },
    ),
    true,
  );
});

test('learning session key also separates the current term', () => {
  const base = { schoolStage: 'primary', textbookId: 'rjb', grade: 4 };

  assert.equal(learningSessionKey({ ...base, learningTerm: '上册' }), 'primary:rjb:g4:上册');
  assert.equal(learningSessionKey({ ...base, learningTerm: '下册' }), 'primary:rjb:g4:下册');
  assert.notEqual(
    learningSessionKey({ ...base, learningTerm: '上册' }),
    learningSessionKey({ ...base, learningTerm: '下册' }),
  );
});

test('scope filtering keeps historical records stored while only showing the active textbook and grade', () => {
  const records = [
    { id: 'rjb-g4', schoolStage: 'primary', textbookId: 'rjb', grade: 4 },
    { id: 'rjb-g5', schoolStage: 'primary', textbookId: 'rjb', grade: 5 },
    { id: 'qd-g4', schoolStage: 'primary', textbookId: 'qd', grade: 4 },
    { id: 'jr-rjb-g7', schoolStage: 'junior', textbookId: 'jr-rjb', grade: 7 },
  ];

  const active = filterRecordsForLearningScope(records, {
    schoolStage: 'primary', textbookId: 'rjb', grade: 4,
  });

  assert.deepEqual(active.map((item) => item.id), ['rjb-g4']);
  assert.equal(records.length, 4);
});

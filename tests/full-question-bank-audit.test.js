const test = require('node:test');
const assert = require('node:assert/strict');
const packageConfig = require('../package.json');

const {
  collectPublishedQuestions,
  auditEveryPublishedQuestion,
} = require('../scripts/audit-question-bank');

test('exhaustive audit visits every public scope and reports a clean per-question result', () => {
  const questions = collectPublishedQuestions();
  const report = auditEveryPublishedQuestion(questions);

  assert.equal(questions.length, 21297);
  assert.equal(report.checked, questions.length);
  assert.equal(report.errors.length, 0);
  assert.equal(report.unique.ids, questions.length);
  assert.equal(report.unique.prompts, questions.length);
  assert.equal(report.unique.mathSignatures, questions.length);
});

test('exhaustive audit identifies the exact item when its answer is damaged', () => {
  const source = collectPublishedQuestions()[0];
  assert.ok(source);

  const damaged = {
    ...source,
    id: 'audit-damaged-unit-item',
    answer: '',
  };
  const report = auditEveryPublishedQuestion([damaged]);

  assert.equal(report.checked, 1);
  assert.ok(report.errors.some((error) => error.id === 'audit-damaged-unit-item'));
});

test('upload preparation always audits the complete question bank before running regression tests', () => {
  assert.equal(
    packageConfig.scripts['prepare:upload'],
    'npm run audit:questions && npm test',
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');

const { getCurriculumScope } = require('../miniprogram/utils/textbook-curriculum');
const { getQuestions } = require('../miniprogram/utils/question-bank');

const UPPER = '\u4e0a\u518c';
const LOWER = '\u4e0b\u518c';

test('RJB grade four observation questions follow the lower-volume observation unit', () => {
  const scope = getCurriculumScope('primary', 'rjb', 4, 'view_from_direction');

  assert.equal(scope.term, LOWER);
  assert.equal(scope.chapterLabel, '\u7b2c2\u5355\u5143 \u89c2\u5bdf\u7269\u4f53\uff08\u4e8c\uff09');

  const upper = getQuestions({
    schoolStage: 'primary', textbookId: 'rjb', grade: 4, term: UPPER, bank: 'practice',
  });
  const lower = getQuestions({
    schoolStage: 'primary', textbookId: 'rjb', grade: 4, term: LOWER, bank: 'practice',
  });

  assert.ok(!upper.some((question) => question.knowledgePoint === 'view_from_direction'));
  assert.ok(lower.some((question) => question.knowledgePoint === 'view_from_direction'));
});

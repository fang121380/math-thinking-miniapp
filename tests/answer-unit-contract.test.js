const test = require('node:test');
const assert = require('node:assert/strict');

const { diagnosticQuestions, practiceQuestions } = require('../miniprogram/utils/question-bank');
const { answersEquivalent } = require('../miniprogram/utils/math-answer');

const unitCases = [
  ['d-g1-length_compare-4', '厘米', '米'],
  ['p-g1-length_compare-5', '厘米', '米'],
  ['d-g2-length_unit-4', '厘米', '米'],
  ['d-g3-mass_convert-4', '克', '千克'],
  ['d-fill-average-3', '秒', '分钟'],
  ['d-fill-average-4', '页', '本'],
  ['p-fill-pattern-1', '本', '页'],
  ['p-fill-data-difference-1', '个', '组'],
  ['d-g5-unit_conversion_g5-4', '米', '千米'],
  ['p-g5-unit_conversion_g5-5', '升', '毫升'],
  ['d-g6-circle-4', '厘米', '米'],
  ['p-g6-circle-5', '厘米', '米'],
  ['p-qd-g4-two_step_division_problem-problem-l3-62', '个', '组'],
  ['d-xiang-g4-two_step_division_problem-problem-l1-1', '个', '组'],
  ['d-xiang-g4-two_step_division_problem-problem-l1-2', '个', '组'],
];

test('unit-bearing questions accept the asked unit and reject a wrong unit', () => {
  const questions = [...diagnosticQuestions, ...practiceQuestions];
  unitCases.forEach(([id, expectedUnit, wrongUnit]) => {
    const item = questions.find((question) => question.id === id);
    assert.ok(item, `${id} is missing`);
    assert.equal(item.answerUnit, expectedUnit, `${id} must store its asked unit`);
    assert.equal(answersEquivalent(`${item.answer}${expectedUnit}`, item.answer, item.answerUnit, item.answerSpec), true, id);
    assert.equal(answersEquivalent(`${item.answer}${wrongUnit}`, item.answer, item.answerUnit, item.answerSpec), false, id);
  });
});

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGradeBank, definitions } = require('../miniprogram/utils/question-bank-grade-data');

function staticBanks() {
  return [1, 2, 3, 5, 6].flatMap((grade) => {
    const bank = buildGradeBank(grade, definitions[grade]);
    return [...bank.diagnosticQuestions, ...bank.practiceQuestions];
  });
}

function staticContentKey(question) {
  const prompt = String(question.prompt || '')
    .replace(/^(?:\u6478\u5e95[^:\uff1a]*\u7b2c\s*\d+\s*\u9898[:\uff1a]|\u7b2c\s*\d+\s*\u9898[:\uff1a])/, '')
    .replace(/[\s\u3000,\uff0c.\u3002!?\uff01\uff1f;\uff1b:\uff1a'"()\uff08\uff09]/g, '');
  const expression = String(question.calculationExpression || '')
    .replace(/\s+/g, '')
    .replace(/[\u00d7xX]/g, '*')
    .replace(/[\u00f7/]/g, '/');
  return [
    question.knowledgePoint,
    prompt,
    expression,
    question.answer,
    question.answerUnit || '',
  ].join('|');
}

test('static published conditions are unique across diagnostics and practice', () => {
  [1, 2, 3, 5, 6].forEach((grade) => {
    const bank = buildGradeBank(grade, definitions[grade]);
    const questions = [...bank.diagnosticQuestions, ...bank.practiceQuestions];
    const keys = questions.map(staticContentKey);
    assert.equal(new Set(keys).size, keys.length, `grade ${grade} repeats a visible condition`);
  });
});

test('static sticker arithmetic word problems require the asked unit', () => {
  const arithmeticPoints = new Set([
    'add_within_20',
    'subtract_within_20',
    'add_within_100',
    'add_subtract_100',
    'multiplication_table',
    'division_table',
    'multiply_two_digit',
  ]);
  const questions = staticBanks().filter((question) => (
    question.type === 'problem' && arithmeticPoints.has(question.knowledgePoint)
  ));

  assert.ok(questions.length > 0);
  questions.forEach((question) => {
    assert.equal(question.answerUnit, '\u5f20', question.id);
    assert.ok(question.steps.at(-1).includes(`${question.answer}\u5f20`), question.id);
  });
});

test('static jump-pattern word problems require the asked unit', () => {
  const questions = staticBanks().filter((question) => (
    question.knowledgePoint === 'pattern_addition' && question.type === 'problem'
  ));

  assert.ok(questions.length > 0);
  questions.forEach((question) => {
    assert.equal(question.answerUnit, '\u4e0b', question.id);
    assert.ok(question.steps.at(-1).includes(`${question.answer}\u4e0b`), question.id);
  });
});

test('static grade-three and grade-five area questions retain dimensions and square units', () => {
  const questions = staticBanks().filter((question) => (
    question.knowledgePoint === 'area_rectangle_g3' || question.knowledgePoint === 'area_rectangle_g5'
  ));

  assert.ok(questions.length > 0);
  questions.forEach((question) => {
    assert.match(question.prompt, /\u957f.*\u5bbd.*\u9762\u79ef/, question.id);
    assert.equal(question.answerUnit, '\u5e73\u65b9\u5398\u7c73', question.id);
    assert.ok(question.steps.at(-1).includes(`${question.answer}\u5e73\u65b9\u5398\u7c73`), question.id);
    assert.ok(question.calculationExpression, question.id);
  });
});

test('static grade-bank prompts are unique across the published primary grades', () => {
  const questions = staticBanks();
  const normalize = (prompt) => String(prompt).replace(/[\s\u3002\uff0c,.!?\uff01\uff1f]/g, '');
  const prompts = questions.map((question) => normalize(question.prompt));

  assert.equal(new Set(prompts).size, prompts.length);
});

test('static physical-quantity concept answers preserve their requested units', () => {
  const expectedUnits = {
    'd-g1-length_compare-2': '\u5398\u7c73',
    'd-g1-length_compare-4': '\u5398\u7c73',
    'p-g1-length_compare-5': '\u5398\u7c73',
    'd-g2-length_unit-3': '\u5398\u7c73',
    'd-g2-length_unit-4': '\u5398\u7c73',
    'd-g2-angle_right-2': '\u5ea6',
    'd-g3-mass_convert-3': '\u514b',
    'd-g3-mass_convert-4': '\u514b',
    'd-g5-unit_conversion_g5-1': '\u5e73\u65b9\u5206\u7c73',
    'd-g5-unit_conversion_g5-2': '\u7c73',
    'd-g5-unit_conversion_g5-3': '\u5347',
    'd-g5-unit_conversion_g5-4': '\u7c73',
    'p-g5-unit_conversion_g5-5': '\u5347',
    'd-g6-circle-1': '\u5398\u7c73',
    'd-g6-circle-4': '\u5398\u7c73',
    'p-g6-circle-5': '\u5398\u7c73',
  };
  const byId = new Map(staticBanks().map((question) => [question.id, question]));

  Object.entries(expectedUnits).forEach(([id, unit]) => {
    const question = byId.get(id);
    assert.ok(question, id);
    assert.equal(question.answerUnit, unit, id);
    assert.ok(question.steps.at(-1).includes(`${question.answer}${unit}`), id);
  });
});

test('static decimal division gives a rounding instruction exactly once', () => {
  const questions = staticBanks().filter((question) => (
    question.knowledgePoint === 'decimal_divide' && question.prompt.includes('\u4fdd\u7559\u4e24\u4f4d\u5c0f\u6570')
  ));

  assert.ok(questions.length > 0);
  questions.forEach((question) => {
    const instructionCount = (question.prompt.match(/\u4fdd\u7559\u4e24\u4f4d\u5c0f\u6570/g) || []).length;
    assert.equal(instructionCount, 1, question.id);
  });
});

test('static decimal-division choices format computed distractors without floating-point artifacts', () => {
  const choice = staticBanks().find((question) => question.id === 'p-g5-decimal_divide-10');

  assert.ok(choice);
  assert.deepEqual(choice.options, ['1.7', '2.7', '3.7', '4.7']);
  assert.equal(choice.options.some((option) => /\d+\.\d{8,}/.test(String(option))), false);
});

test('static concept explanations end by naming the answer, including answers without a unit', () => {
  const conceptQuestions = staticBanks().filter((question) => (
    ['clock_reading', 'shape_recognition', 'fraction_compare', 'factor_multiple', 'fraction_add', 'fraction_multiply', 'fraction_divide', 'negative_number'].includes(question.knowledgePoint)
  ));

  assert.ok(conceptQuestions.length > 0);
  conceptQuestions.forEach((question) => {
    const finalStep = String(question.steps.at(-1) || '');
    assert.ok(finalStep.includes(String(question.answer)), question.id);
  });
});

test('static fallback choices use mathematical distractors instead of generic uncertainty labels', () => {
  const genericOption = /^(?:不是|可能|无法确定|条件不足|以上都不对)$/;
  const fallbackIds = [
    'd-g2-number_within_10000-4',
    'd-g3-fraction_compare-4',
    'd-g5-factor_multiple-4',
    'd-g5-fraction_add-4',
    'd-g6-fraction_multiply-4',
    'd-g6-fraction_divide-4',
    'd-g6-ratio-1',
    'd-g6-ratio-2',
    'd-g6-ratio-3',
    'd-g6-ratio-4',
    'p-g6-ratio-7',
    'p-g6-ratio-10',
  ];
  const byId = new Map(staticBanks().map((question) => [question.id, question]));

  fallbackIds.forEach((id) => {
    const question = byId.get(id);
    assert.ok(question, id);
    assert.equal(question.options.length, 4, id);
    assert.equal(question.options.some((option) => genericOption.test(String(option))), false, id);
  });
});

test('static equal-ratio choices stay distinct and keep one correct answer', () => {
  const choice = staticBanks().find((question) => question.id === 'p-g6-ratio-7');

  assert.ok(choice);
  assert.deepEqual(choice.options, ['3:3', '2:3', '4:3', '3:4']);
  assert.equal(new Set(choice.options).size, 4);
});

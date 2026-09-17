const test = require('node:test');
const assert = require('node:assert/strict');

const { getJuniorTopics } = require('../miniprogram/utils/junior-high-curriculum');
const {
  getJuniorQuestionBank,
  regenerateJuniorQuestion,
} = require('../miniprogram/utils/question-bank-junior-data');
const {
  getQuestionBank,
  getQuestions,
  auditQuestion,
} = require('../miniprogram/utils/question-bank');

function firstQuestion(grade, knowledgePoint, difficultyMode = 'easy', type = 'fill') {
  const question = getQuestions({
    schoolStage: 'junior',
    textbookId: 'jr-rjb',
    grade,
    knowledgePoint,
    difficultyMode,
    type,
  })[0];
  assert.ok(question, `missing g${grade} ${knowledgePoint} ${difficultyMode} ${type}`);
  return question;
}

function gcd(left, right) {
  let a = Math.abs(Number(left));
  let b = Math.abs(Number(right));
  while (b) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}

function reducedFraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

test('stated equation, triangle, circle, and fraction relations determine the canonical answers', () => {
  const equation = firstQuestion(7, 'linear_equation');
  const equationMatch = equation.prompt.match(/(\d+)x\s*([+-])\s*(\d+)\s*=\s*(\d+)/);
  assert.ok(equationMatch, equation.prompt);
  const coefficient = Number(equationMatch[1]);
  const constant = Number(equationMatch[3]) * (equationMatch[2] === '-' ? -1 : 1);
  assert.equal(Number(equation.answer), (Number(equationMatch[4]) - constant) / coefficient);

  const triangle = firstQuestion(7, 'triangle_intro');
  const triangleMatch = triangle.prompt.match(/\u4e24\u4e2a\u5185\u89d2\u5206\u522b\u4e3a\s*(\d+)\s*\u5ea6\D+(\d+)\s*\u5ea6/);
  assert.ok(triangleMatch, triangle.prompt);
  assert.equal(Number(triangle.answer), 180 - Number(triangleMatch[1]) - Number(triangleMatch[2]));
  assert.equal(triangle.answerUnit, '\u5ea6');

  const circle = firstQuestion(9, 'circle');
  const circleMatch = circle.prompt.match(/(?:\u534a\u5f84|\u5706\u5fc3\u5230\u5706\u4e0a\u4e00\u70b9\u7684\u8ddd\u79bb)(?:\u4e3a|\u662f)\s*(\d+)\s*\u5398\u7c73/);
  assert.ok(circleMatch, circle.prompt);
  assert.equal(Number(circle.answer), Number(circleMatch[1]) * 2);
  assert.equal(circle.answerUnit, '\u5398\u7c73');

  const fraction = firstQuestion(8, 'fraction_expression');
  const fractionMatch = fraction.prompt.match(/\(x\+(\d+)\)\/\(x-(\d+)\).*x=(\d+)/);
  assert.ok(fractionMatch, fraction.prompt);
  const x = Number(fractionMatch[3]);
  const expected = reducedFraction(x + Number(fractionMatch[1]), x - Number(fractionMatch[2]));
  assert.equal(fraction.answer, expected);
  assert.deepEqual(fraction.answerSpec, { kind: 'fraction', value: expected });
});

test('right_triangle is genuine exact-value trigonometry', () => {
  const item = firstQuestion(9, 'right_triangle');
  const match = item.prompt.match(/(sin|cos|tan)\s*(30|45|60)\s*\u00b0/i);
  assert.ok(match, item.prompt);
  const exactValues = {
    'sin:30': '1/2',
    'sin:45': '\u221a2/2',
    'sin:60': '\u221a3/2',
    'cos:30': '\u221a3/2',
    'cos:45': '\u221a2/2',
    'cos:60': '1/2',
    'tan:30': '\u221a3/3',
    'tan:45': '1',
    'tan:60': '\u221a3',
  };
  assert.equal(item.answer, exactValues[`${match[1].toLowerCase()}:${match[2]}`]);
  assert.equal(item.answerUnit, '');
});

test('junior audit regenerates immutable correctness fields from id', () => {
  assert.equal(typeof regenerateJuniorQuestion, 'function');
  const original = firstQuestion(7, 'linear_equation', 'easy', 'choice');
  assert.deepEqual(regenerateJuniorQuestion(original.id), original);

  const changedAnswer = '999';
  const tampered = {
    ...original,
    answer: changedAnswer,
    answerSpec: { kind: 'number', value: changedAnswer },
    calculationExpression: changedAnswer,
    options: [changedAnswer, '998', '997', '996'],
    solution: {
      ...original.solution,
      steps: [...original.solution.steps.slice(0, -1), `\u56e0\u6b64\u6700\u7ec8\u7b54\u6848\u662f ${changedAnswer}\u3002`],
    },
    auditRule: {
      ...original.auditRule,
      expectedAnswer: changedAnswer,
      answerSpecKind: 'number',
      answerSpecValue: changedAnswer,
      expression: changedAnswer,
    },
  };
  assert.ok(auditQuestion(tampered).includes('junior_answer_mismatch'));

  const contradictory = {
    ...original,
    prompt: `${original.prompt}\u53e6\u6709\u6761\u4ef6\u58f0\u79f0 x=999\u3002`,
  };
  assert.ok(auditQuestion(contradictory).includes('junior_prompt_mismatch'));

  const disguisedAsPrimary = {
    ...tampered,
    schoolStage: 'primary',
    textbookId: 'rjb',
    grade: 4,
  };
  assert.ok(auditQuestion(disguisedAsPrimary).includes('junior_identity_mismatch'));
  assert.ok(auditQuestion(disguisedAsPrimary).includes('junior_answer_mismatch'));
  assert.ok(auditQuestion({
    ...original,
    knowledgePoint: 'angle_line',
  }).includes('junior_identity_mismatch'));
});

test('junior scope validation is strict and returned banks are mutation-safe', () => {
  const empty = { diagnosticQuestions: [], practiceQuestions: [] };
  assert.deepEqual(getQuestionBank({ schoolStage: 'junior', textbookId: 'jr-madeup', grade: 7 }), empty);
  assert.deepEqual(getQuestions({ schoolStage: 'junior', textbookId: 'jr-madeup', grade: 7 }), []);

  const scope = { schoolStage: 'junior', textbookId: 'jr-rjb', grade: 7 };
  const first = getJuniorQuestionBank(scope);
  const originalPrompt = first.practiceQuestions[0].prompt;
  first.practiceQuestions[0].prompt = 'contaminated';
  first.practiceQuestions.push({ id: 'contaminated' });
  const second = getJuniorQuestionBank(scope);
  assert.equal(second.practiceQuestions[0].prompt, originalPrompt);
  assert.equal(second.practiceQuestions.some((item) => item.id === 'contaminated'), false);
  assert.notStrictEqual(second, first);
});

test('each junior scope has exactly five diagnostics per difficulty and canonical unique content', () => {
  const bank = getJuniorQuestionBank({ schoolStage: 'junior', textbookId: 'jr-rjb', grade: 9 });
  ['easy', 'medium', 'hard'].forEach((difficulty) => {
    const diagnostics = bank.diagnosticQuestions.filter((item) => item.difficulty === difficulty);
    assert.equal(diagnostics.length, 5, difficulty);
    assert.equal(new Set(diagnostics.map((item) => item.id)).size, diagnostics.length);
    assert.equal(new Set(diagnostics.map((item) => item.prompt)).size, diagnostics.length);
    diagnostics.forEach((item) => assert.deepEqual(auditQuestion(item), [], item.id));
  });
});

test('curriculum labels are grade-specific and edition modes change evidence structures', () => {
  const grade8 = getJuniorTopics('jr-rjb', 8);
  const grade9 = getJuniorTopics('jr-rjb', 9);
  assert.match(grade8.find((topic) => topic.key === 'congruent_triangle').label, /\u5168\u7b49/);
  assert.match(grade8.find((topic) => topic.key === 'linear_function').label, /\u4e00\u6b21\u51fd\u6570/);
  assert.match(grade9.find((topic) => topic.key === 'right_triangle').label, /\u4e09\u89d2\u51fd\u6570/);
  assert.doesNotMatch(grade8.map((topic) => topic.label).join('|'), /\u6570\u8f74\u89c2\u5bdf|\u5f0f\u7684\u8868\u8fbe/);

  const symbolic = getQuestions({
    schoolStage: 'junior', textbookId: 'jr-rjb', grade: 8,
    difficultyMode: 'medium', type: 'problem', knowledgePoint: 'linear_function',
  })[0];
  const table = getQuestions({
    schoolStage: 'junior', textbookId: 'jr-bsd', grade: 8,
    difficultyMode: 'medium', type: 'problem', knowledgePoint: 'linear_function',
  })[0];
  assert.notEqual(symbolic.textbookId, table.textbookId);
  assert.notDeepEqual(symbolic.auditRule.conditionTokens, table.auditRule.conditionTokens);
  assert.notEqual(symbolic.calculationExpression, table.calculationExpression);
  assert.notEqual(symbolic.prompt, table.prompt);
  assert.notDeepEqual(symbolic.solution.steps, table.solution.steps);
});

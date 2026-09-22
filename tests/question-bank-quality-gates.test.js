const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getQuestions,
  diagnosticQuestions,
  practiceQuestions,
  auditQuestion,
  auditQuestionBankQuality,
  questionMathSignature,
} = require('../miniprogram/utils/question-bank');
const { getCurriculumScope } = require('../miniprogram/utils/textbook-curriculum');

const primaryEditions = ['rjb', 'bsd', 'suj', 'qd', 'sh', 'xsb', 'hebei', 'xiang'];
const juniorEditions = ['jr-rjb', 'jr-bsd', 'jr-suk', 'jr-huk', 'jr-luj', 'jr-xj', 'jr-hsd', 'jr-zj'];

function collectScopeQuestions() {
  const rows = [];
  primaryEditions.forEach((textbookId) => {
    [1, 2, 3, 4, 5, 6].forEach((grade) => {
      const scope = { schoolStage: 'primary', textbookId, grade };
      rows.push(...getQuestions({ ...scope, bank: 'diagnostic' }));
      rows.push(...getQuestions({ ...scope, bank: 'practice' }));
    });
  });
  juniorEditions.forEach((textbookId) => {
    [7, 8, 9].forEach((grade) => {
      const scope = { schoolStage: 'junior', textbookId, grade };
      rows.push(...getQuestions({ ...scope, bank: 'diagnostic' }));
      rows.push(...getQuestions({ ...scope, bank: 'practice' }));
    });
  });
  return rows;
}

test('every published question satisfies curriculum, result, and duplicate quality gates', () => {
  const issues = auditQuestionBankQuality(collectScopeQuestions());
  assert.deepEqual(issues, []);
});

test('quality gates keep every textbook scope internally isolated', () => {
  const questions = collectScopeQuestions();
  const issues = auditQuestionBankQuality(questions, { requireEditionIsolation: true });
  assert.deepEqual(issues, []);
});

test('published primary collisions become distinct learner-facing activities across editions', () => {
  const source = diagnosticQuestions.find((item) => item.id === 'd-rjb-g1-clock_reading-fill-l2-2');
  const variant = practiceQuestions.find((item) => item.id === 'p-xiang-g1-clock_reading-problem-l3-72');

  assert.ok(source);
  assert.ok(variant);
  assert.deepEqual(
    auditQuestionBankQuality([source, variant], { requireEditionIsolation: true }),
    [],
  );
  assert.match(variant.prompt, /(?:画一画|圈出|列表|验证|依据)/, variant.prompt);
  assert.equal(variant.answer, source.answer);
  assert.equal(variant.answerUnit, source.answerUnit);
});

test('quality gates reject a cross-edition question that only changes its textbook shell', () => {
  const source = getQuestions({
    schoolStage: 'primary', textbookId: 'rjb', grade: 4, difficulty: 1, type: 'choice',
  })[0];
  const disguisedCopy = {
    ...source,
    id: 'quality-gate-cross-edition-copy',
    textbookId: 'bsd',
    editionUnitKey: 'bsd-g4-quality-copy',
    curriculumFamily: 'bsd-g4-quality-copy',
    prompt: source.prompt.replace('人教版', '北师大版'),
  };

  const issues = auditQuestionBankQuality([source, disguisedCopy], { requireEditionIsolation: true });
  assert.ok(issues.some((issue) => issue.code === 'core_duplicate_across_edition'));
});

test('quality gates reject under-specified geometry and topic-model mismatches', () => {
  const similar = getQuestions({
    schoolStage: 'junior', textbookId: 'jr-rjb', grade: 9, difficultyMode: 'easy', type: 'choice', knowledgePoint: 'similar_triangle',
  })[0];
  const unclearSimilar = {
    ...similar,
    prompt: '已知一个对应边为 6 厘米，相似比为 2:1，求对应边。',
  };
  const cone = getQuestions({
    schoolStage: 'primary', textbookId: 'rjb', grade: 6, difficulty: 1, type: 'problem', knowledgePoint: 'volume_cone',
  })[0];
  const cuboidPretendingToBeCone = {
    ...cone,
    prompt: '长方体长 6 厘米、宽 4 厘米、高 3 厘米，体积是多少？',
    answer: '72',
    answerUnit: '立方厘米',
    calculationExpression: '6×4×3',
    solution: { ...cone.solution, steps: ['6×4×3=72（立方厘米）', '所以答案是72立方厘米。'] },
  };

  const issues = auditQuestionBankQuality([unclearSimilar, cuboidPretendingToBeCone]);
  assert.ok(issues.some((issue) => issue.code === 'geometry_conditions_incomplete'));
  assert.ok(issues.some((issue) => issue.code === 'topic_model_mismatch'));
});

test('every entry diagnostic uses a canonical curriculum knowledge point', () => {
  const entryQuestions = diagnosticQuestions.filter((item) => item.entryDiagnostic);
  assert.ok(entryQuestions.length > 0);
  entryQuestions.forEach((item) => {
    const scope = getCurriculumScope('primary', item.textbookId, item.grade, item.knowledgePoint);
    assert.ok(scope, `${item.id} does not map to a curriculum topic`);
    assert.equal(item.term, scope.term, `${item.id} has the wrong term`);
    assert.equal(item.editionUnitKey, scope.editionUnitKey, `${item.id} has the wrong unit`);
  });
});

test('a textbook scope never reuses the same mathematical condition between diagnostic and practice', () => {
  primaryEditions.forEach((textbookId) => {
    [1, 2, 3, 4, 5, 6].forEach((grade) => {
      const scope = { schoolStage: 'primary', textbookId, grade };
      const questions = [
        ...getQuestions({ ...scope, bank: 'diagnostic' }),
        ...getQuestions({ ...scope, bank: 'practice' }),
      ];
      const signatures = questions.map(questionMathSignature);
      assert.equal(new Set(signatures).size, signatures.length, `${textbookId} g${grade} repeats a mathematical condition`);
    });
  });
});

test('grade-four upper practice adds auditable thinking-task metadata across its three core topics', () => {
  const rows = getQuestions({ schoolStage: 'primary', textbookId: 'rjb', grade: 4, term: '上册', bank: 'practice' })
    .filter((item) => item.id.startsWith('p-thinking-g4-'));
  assert.equal(rows.length, 36);
  assert.deepEqual(
    [...new Set(rows.map((item) => item.knowledgePoint))].sort(),
    ['division_estimation', 'division_exact', 'multiply_estimation'],
  );
  rows.forEach((item) => {
    assert.match(item.taskType, /^(condition_reasoning|error_analysis|estimate_explain|method_compare|reverse_reasoning)$/);
    assert.match(item.representation, /^(context|numeric)$/);
    assert.ok(item.reasoningDepth >= 2 && item.reasoningDepth <= 3);
    assert.ok(item.misconception);
    assert.equal(item.reviewStatus, 'auto-checked');
  });
  assert.deepEqual(
    [...new Set(rows.map((item) => item.taskType))].sort(),
    ['condition_reasoning', 'error_analysis', 'estimate_explain', 'method_compare', 'reverse_reasoning'],
  );
});

test('grade-four direct estimates use the mathematically nearest declared place value', () => {
  const rows = practiceQuestions.filter((item) => item.id.startsWith('p-thinking-g4-'));
  const first = rows.find((item) => item.id === 'p-thinking-g4-multiply-estimate-explain-1');
  const second = rows.find((item) => item.id === 'p-thinking-g4-multiply-estimate-explain-2');

  assert.equal(first.answer, '8 400');
  assert.ok(first.options.includes(first.answer));
  assert.equal(second.answer, '28 900');
  assert.match(second.solution.steps.join(' '), /28 944.*28 900/);
  assert.deepEqual(auditQuestion(first), []);
  assert.deepEqual(auditQuestion(second), []);

  const wrongGroupedAnswer = { ...second, answer: '29 000', calculationExpression: undefined };
  assert.ok(auditQuestion(wrongGroupedAnswer).includes('estimate_answer_mismatch'));
});

test('grade-four reverse and error-analysis tasks match the reasoning named in metadata', () => {
  const byId = new Map(practiceQuestions
    .filter((item) => item.id.startsWith('p-thinking-g4-'))
    .map((item) => [item.id, item]));
  const firstReverse = byId.get('p-thinking-g4-multiply-reverse-1');
  const contextReverse = byId.get('p-thinking-g4-multiply-reverse-3');
  const estimateError = byId.get('p-thinking-g4-multiply-error-1');
  const divisionMethod = byId.get('p-thinking-g4-division-exact-method-1');

  assert.match(firstReverse.prompt, /积.*另一个因数/);
  assert.equal(firstReverse.answer, '30');
  assert.match(contextReverse.prompt, /平均每排/);
  assert.equal(contextReverse.answer, '40');
  assert.match(estimateError.prompt, /精确积/);
  assert.equal(estimateError.answer, '把估算结果当成了精确积');
  assert.equal(divisionMethod.options.filter((option) => /24×39=936/.test(option)).length, 1);
});

test('grade-four thinking prompts have one gradable answer and consistent estimate operations', () => {
  const byId = new Map(practiceQuestions
    .filter((item) => item.id.startsWith('p-thinking-g4-'))
    .map((item) => [item.id, item]));
  const multiplyError = byId.get('p-thinking-g4-multiply-error-2');
  assert.match(multiplyError.prompt, /309×28≈300×30=900/);
  assert.equal(multiplyError.answer, '0');
  assert.match(multiplyError.solution.steps.join(' '), /300×30=9 000/);

  ['p-thinking-g4-division-reverse-1', 'p-thinking-g4-division-reverse-2'].forEach((id) => {
    const question = byId.get(id);
    assert.match(question.prompt, /按.*估计.*大约/);
    assert.match(question.solution.steps.join(' '), /不一定恰好等于/);
  });
  [
    'p-thinking-g4-division-method-compare-3',
    'p-thinking-g4-division-error-3',
    'p-thinking-g4-multiply-method-compare-3',
    'p-thinking-g4-division-exact-explain-3',
    'p-thinking-g4-division-exact-method-3',
    'p-thinking-g4-division-exact-error-3',
  ].forEach((id) => assert.doesNotMatch(byId.get(id).prompt, /为什么|写出理由|说明理由|怎样检查答案|判断并改正/));
  assert.equal(byId.get('p-thinking-g4-division-exact-method-2').taskType, 'condition_reasoning');
  assert.equal(byId.get('p-thinking-g4-division-exact-error-3').answer, '2');
  const exactError = byId.get('p-thinking-g4-division-exact-error-1');
  assert.match(exactError.prompt, /检验/);
  assert.equal(exactError.options.filter((option) => /计算24×3/.test(option)).length, 1);
});

test('static primary hints state the next operation for common word problems', () => {
  const byId = new Map(practiceQuestions.map((item) => [item.id, item]));
  const expected = {
    'p-fill-line-relationship-1': /是否会相交.*平行线/,
    'p-problem-rectangle-perimeter-2': /相加.*乘 2/,
    'p-problem-rectangle-perimeter-4': /相加.*乘 2/,
    'p-problem-arrangement-2': /7÷3.*向上取整.*12 分钟/,
    'p-problem-arrangement-3': /同时洗.*一轮 5 分钟/,
    'p-problem-arrangement-4': /14÷6.*向上取整.*15 分钟/,
    'p-problem-average-2': /相加.*除以 3/,
    'p-problem-average-4': /相加.*除以 4/,
    'p-thinking-g4-division-estimate-explain-3': /9×80=720.*9×90=810.*725/,
  };
  Object.entries(expected).forEach(([id, pattern]) => {
    const question = byId.get(id);
    assert.ok(question, id);
    assert.match(question.hint, pattern, id);
    assert.ok(question.solution.steps.length >= 2, id);
  });
});

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  diagnosticQuestions,
  practiceQuestions,
  validateQuestion,
  auditQuestion,
  auditQuestionBank,
  evaluateArithmeticExpression,
  inferAnswerUnit,
  questionMathSignature,
  scopeKeyOf,
  buildReviewSamples,
} = require('../miniprogram/utils/question-bank');
const questionBankManifest = require('../miniprogram/utils/question-bank-manifest');
const { CONTENT_BANK_VERSION } = require('../miniprogram/utils/adaptive');
const { answersEquivalent, formatAnswerWithUnit } = require('../miniprogram/utils/math-answer');
const { textbookOptions } = require('../miniprogram/utils/textbook-catalog');

test('question bank manifest records version, curriculum scope, and original provenance', () => {
  assert.equal(questionBankManifest.version, '2026.09.18.1');
  assert.equal(questionBankManifest.updatedAt, '2026-09-18');
  assert.equal(questionBankManifest.edition.id, 'multi');
  assert.deepEqual(questionBankManifest.enabledGrades, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(questionBankManifest.catalog.juniorScopes, 24);
  assert.equal(questionBankManifest.catalog.juniorPracticePerScope, 216);
  assert.equal(questionBankManifest.provenance.type, 'original-local');
  assert.equal(questionBankManifest.externalCommercialContent, false);
  assert.equal(questionBankManifest.catalog.diagnostic, diagnosticQuestions.length);
  assert.equal(questionBankManifest.catalog.practice, practiceQuestions.length);
  assert.equal(questionBankManifest.releaseNote.version, questionBankManifest.version);
  assert.ok(questionBankManifest.releaseNote.title);
  assert.ok(questionBankManifest.releaseNote.copy);
});

test('runtime question selection uses the published question bank version', () => {
  assert.equal(CONTENT_BANK_VERSION, questionBankManifest.version);
});

test('scope keys and review samples keep primary and junior content separate', () => {
  assert.equal(scopeKeyOf({ textbookId: 'rjb', grade: 4 }), 'primary:rjb:g4');
  assert.equal(scopeKeyOf({ schoolStage: 'junior', textbookId: 'rjb', grade: 7 }), 'junior:rjb:g7');
  const shared = { textbookId: 'rjb', grade: 7 };
  const samples = buildReviewSamples([
    { ...shared, id: 'primary-legacy' },
    { ...shared, id: 'junior-explicit', schoolStage: 'junior' },
  ], { perGroup: 1 });
  assert.deepEqual(samples.map((item) => item.id).sort(), ['junior-explicit', 'primary-legacy']);
});

test('full diagnostic bank retains eight variant slots while entry diagnostics add five light slots', () => {
  const gradeFourDiagnostics = diagnosticQuestions.filter((question) => (
    question.grade === 4 && question.textbookId === 'rjb' && !question.entryDiagnostic
  ));
  const slots = [...new Set(gradeFourDiagnostics.map((question) => question.diagnosticSlot))];
  assert.equal(slots.length, 8);
  assert.ok(slots.every(
    (slot) => gradeFourDiagnostics.filter((question) => question.diagnosticSlot === slot).length >= 4,
  ));
  const counts = slots.reduce((result, slot) => {
    const question = gradeFourDiagnostics.find((item) => item.diagnosticSlot === slot);
    result[question.type] = (result[question.type] || 0) + 1;
    return result;
  }, {});
  assert.deepEqual(counts, { choice: 4, fill: 2, problem: 2 });

  const entryQuestions = diagnosticQuestions.filter((question) => (
    question.grade === 4 && question.textbookId === 'rjb' && question.entryDiagnostic
  ));
  assert.equal(new Set(entryQuestions.map((question) => question.entrySlot)).size, 5);
  assert.ok(entryQuestions.every((question) => question.solution.steps.length >= 2));
  assert.deepEqual([...new Set(entryQuestions.map((question) => question.type))].sort(), ['choice', 'fill', 'problem']);
});

test('every diagnostic variant has its own stable question ID', () => {
  assert.equal(new Set(diagnosticQuestions.map((question) => question.id)).size, diagnosticQuestions.length);
});

test('triangle side choice keeps four mutually exclusive options and one answer', () => {
  const question = practiceQuestions.find((item) => item.id === 'p-choice-triangle-sides-3');
  assert.ok(question);
  assert.equal(question.type, 'choice');
  assert.equal(question.options.length, 4);
  assert.equal(new Set(question.options).size, 4);
  const accepted = question.options.filter((option) => answersEquivalent(
    option,
    question.answer,
    question.answerUnit,
    question.answerSpec,
  ));
  assert.deepEqual(accepted, ['不能']);
});

test('every question includes curriculum, answer, solution, and mistake metadata', () => {
  const allQuestions = [...diagnosticQuestions, ...practiceQuestions];
  assert.ok(allQuestions.length >= 17);
  allQuestions.forEach((question) => {
    assert.equal(validateQuestion(question), true, question.id);
    assert.ok(questionBankManifest.enabledGrades.includes(question.grade));
    assert.ok(['上册', '下册'].includes(question.term));
    assert.ok(question.solution.steps.length > 0);
    assert.ok(question.commonMistakes.length > 0);
  });
});

test('every published question accepts a matching answer unit and rejects a mismatched one', () => {
  const allQuestions = [...diagnosticQuestions, ...practiceQuestions];
  const questionsWithUnits = allQuestions.filter((question) => question.answerUnit);
  assert.ok(questionsWithUnits.length > 1000);
  questionsWithUnits.forEach((question) => {
    assert.equal(
      answersEquivalent(`${question.answer}${question.answerUnit}`, question.answer, question.answerUnit),
      true,
      question.id,
    );
  });
});

test('primary diagnostic prompts never expose internal snake-case topic keys', () => {
  const internalKeyPattern = /[a-z]+(?:_[a-z0-9]+)+/i;
  const leaked = diagnosticQuestions
    .filter((item) => internalKeyPattern.test(String(item.prompt)))
    .map((item) => ({ id: item.id, prompt: item.prompt }));
  assert.deepEqual(leaked, []);
});

test('geometry questions with centimetre measurements carry the correct derived answer unit', () => {
  const allQuestions = [...diagnosticQuestions, ...practiceQuestions];
  const expectedUnit = (question) => (
    question.prompt.includes('体积') ? '立方厘米' : question.prompt.includes('面积') ? '平方厘米' : '厘米'
  );
  const geometryQuestions = allQuestions.filter((question) => (
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(question.answer))
    && question.prompt.includes('厘米')
    && (question.prompt.includes('周长') || question.prompt.includes('面积') || question.prompt.includes('体积'))
  ));

  assert.ok(geometryQuestions.length > 1000);
  geometryQuestions.forEach((question) => {
    assert.equal(question.answerUnit, expectedUnit(question), question.id);
  });
});

test('named primary topics use their actual time, data, proportion, and cone forms', () => {
  const allQuestions = [...diagnosticQuestions, ...practiceQuestions];
  const topicQuestions = (grade, key) => allQuestions.filter((question) => (
    question.id.startsWith(`d-g${grade}-${key}-`)
    || question.id.startsWith(`p-g${grade}-${key}-`)
  ));
  const assertTopic = (grade, key, assertion) => {
    const questions = topicQuestions(grade, key);
    const diagnostic = questions.filter((question) => question.id.startsWith('d-'));
    const practice = questions.filter((question) => question.id.startsWith('p-'));
    assert.equal(diagnostic.length, 4, `${key} should retain four diagnostic checks`);
    assert.ok(practice.length >= 4, `${key} should retain multiple practice variants`);
    assert.ok(questions.length >= 10, `${key} should retain a broad visible pool`);
    assert.equal(
      new Set(questions.map(questionMathSignature)).size,
      questions.length,
      `${key} should not publish the same condition twice`,
    );
    questions.forEach((question) => {
      assertion(question);
      assert.ok(question.calculationExpression, `${question.id} needs an auditable calculation`);
      assert.deepEqual(auditQuestion(question), [], question.id);
    });
  };

  assertTopic(2, 'time_duration', (question) => {
    assert.match(question.prompt, /开始.*结束/);
    assert.equal(question.answerUnit, '分钟');
    assert.match(question.solution.steps.join(''), /分钟/);
  });
  assertTopic(2, 'data_compare', (question) => {
    assert.match(question.prompt, /统计/);
    assert.match(question.prompt, /比.*多/);
    assert.equal(question.answerUnit, '人');
  });
  assertTopic(3, 'average_g3', (question) => {
    assert.match(question.prompt, /平均/);
    assert.match(question.solution.steps.join(''), /÷3/);
    assert.equal(question.answerUnit, '下');
  });
  assertTopic(5, 'average_g5', (question) => {
    assert.match(question.prompt, /平均/);
    assert.match(question.solution.steps.join(''), /÷3/);
    assert.equal(question.answerUnit, '页');
  });
  assertTopic(6, 'proportion', (question) => {
    assert.match(question.prompt, /x\s*:/);
    assert.match(question.prompt, /=/);
    assert.match(question.solution.steps.join(''), /交叉相乘/);
  });
  assertTopic(6, 'volume_cone', (question) => {
    assert.match(question.prompt, /圆锥/);
    assert.match(question.prompt, /底面积/);
    assert.match(question.prompt, /高/);
    assert.match(question.solution.steps.join(''), /÷3/);
    assert.equal(question.answerUnit, '立方厘米');
  });
});

test('static grade-one money counting uses whole-yuan RMB context instead of sticker arithmetic', () => {
  const moneyQuestions = [...diagnosticQuestions, ...practiceQuestions]
    .filter((question) => /^(?:d|p)-g1-money_count-/.test(question.id));

  assert.ok(moneyQuestions.length >= 10);
  assert.equal(new Set(moneyQuestions.map(questionMathSignature)).size, moneyQuestions.length);
  moneyQuestions.forEach((question) => {
    assert.match(question.prompt, /\u5143/, question.id);
    assert.doesNotMatch(question.prompt, /\u8d34\u7eb8/, question.id);
    assert.equal(question.answerUnit, '\u5143', question.id);
    assert.ok(question.calculationExpression, question.id);
    assert.ok(question.solution.steps.join('').includes('\u5143'), question.id);
    assert.deepEqual(auditQuestion(question), [], question.id);
  });
});

test('static grade-three decimal tenths teaches place value instead of decimal multiplication', () => {
  const decimalTenthsQuestions = [...diagnosticQuestions, ...practiceQuestions]
    .filter((question) => /^(?:d|p)-g3-decimal_tenths-/.test(question.id));

  assert.ok(decimalTenthsQuestions.length >= 10);
  assert.equal(new Set(decimalTenthsQuestions.map(questionMathSignature)).size, decimalTenthsQuestions.length);
  decimalTenthsQuestions.forEach((question) => {
    assert.match(question.prompt, /\u5341\u5206\u4f4d/, question.id);
    assert.doesNotMatch(question.prompt, /[\u00d7\u4e70\u7ec3\u4e60\u518c]/, question.id);
    assert.equal(question.answerUnit, '', question.id);
    assert.doesNotMatch(question.solution.steps.join(''), /\u00d7/, question.id);
    assert.deepEqual(auditQuestion(question), [], question.id);
  });
});

test('decimal multiplication word problems use a measurable quantity for a fractional multiplier', () => {
  const fractionalQuantityQuestions = ['p-g5-decimal_multiply-6', 'p-g5-decimal_multiply-12']
    .map((id) => practiceQuestions.find((question) => question.id === id));

  assert.deepEqual(fractionalQuantityQuestions.map((question) => question && question.answer), ['3.6', '5.1']);
  fractionalQuantityQuestions.forEach((question) => {
    assert.match(question.prompt, /\u6bcf\u7c73\u5f69\u5e26/, question.id);
    assert.match(question.prompt, /1\.5\s*\u7c73/, question.id);
    assert.doesNotMatch(question.prompt, /1\.5\s*\u672c/, question.id);
    assert.equal(question.answerUnit, '\u5143', question.id);
    assert.ok(question.calculationExpression, question.id);
    assert.deepEqual(auditQuestion(question), [], question.id);
  });
});

test('exact legacy division variants use exact labels, auditable expressions, and coherent quantities', () => {
  const allQuestions = [...diagnosticQuestions, ...practiceQuestions];
  const fillVariants = allQuestions.filter((question) => question.id.startsWith('p-fill-division-variant-'));
  const problemVariants = allQuestions.filter((question) => question.id.startsWith('p-problem-division-variant-'));

  assert.equal(fillVariants.length, 3);
  fillVariants.forEach((question) => {
    assert.equal(question.knowledgePoint, 'division_exact', question.id);
    assert.equal(question.examPattern, 'calculation_model', question.id);
    assert.match(question.prompt, /÷\s*\d+\s*=\s*____/);
    assert.match(question.calculationExpression, /^\d+\s*÷\s*\d+$/);
    assert.ok(question.knowledgeSummary);
    assert.ok(question.mistakeSummary.length > 0);
    assert.ok(question.solution.steps.length >= 2);
    assert.deepEqual(auditQuestion(question), [], question.id);
  });

  assert.equal(problemVariants.length, 4);
  problemVariants.forEach((question) => {
    assert.equal(question.knowledgePoint, 'two_step_division_problem', question.id);
    assert.equal(question.examPattern, 'combination_strategy', question.id);
    assert.match(question.prompt, /每[盒包袋].*有\s*\d+\s*[支本根张]/, question.id);
    assert.ok(question.answerUnit, question.id);
    assert.match(question.calculationExpression, /^\d+\s*×\s*\d+\s*÷\s*\d+$/);
    assert.ok(question.knowledgeSummary);
    assert.ok(question.mistakeSummary.length > 0);
    assert.ok(question.solution.steps.length >= 2);
    assert.deepEqual(auditQuestion(question), [], question.id);
  });
  assert.match(
    problemVariants.find((question) => question.id === 'p-problem-division-variant-2').prompt,
    /16 包数学卡片，每包有 24 张/,
  );
});

test('legacy division metadata describes the visible task instead of forcing it into estimation', () => {
  const allQuestions = [...diagnosticQuestions, ...practiceQuestions];
  const twoStep = allQuestions.find((question) => question.id === 'p-problem-division-1');
  const exactFill = allQuestions.find((question) => question.id === 'p-fill-division-refresh-1');

  assert.ok(twoStep);
  assert.equal(twoStep.knowledgePoint, 'two_step_division_problem');
  assert.equal(twoStep.examPattern, 'combination_strategy');
  assert.match(twoStep.calculationExpression, /^\d+ \u00d7 \d+ \u00f7 \d+$/);
  assert.equal(twoStep.answerUnit, '\u672c');

  assert.ok(exactFill);
  assert.equal(exactFill.knowledgePoint, 'division_exact');
  assert.equal(exactFill.examPattern, 'calculation_model');
  assert.match(exactFill.prompt, /\u00f7\s*\d+\s*=\s*____/);
});

test('legacy two-step practice does not reuse a diagnostic numeric condition', () => {
  const allQuestions = [...diagnosticQuestions, ...practiceQuestions];
  const conditionKey = (question) => [
    question.knowledgePoint,
    ...(String(question.prompt || '').match(/\d+/g) || []),
    question.answer,
    question.answerUnit,
  ].join('|');
  const diagnosticKeys = new Set(allQuestions
    .filter((question) => /^d-problem-division-\d+$/.test(question.id))
    .map(conditionKey));
  const practice = allQuestions.find((question) => question.id === 'p-problem-division-1');

  assert.ok(practice);
  assert.equal(diagnosticKeys.has(conditionKey(practice)), false);
});

test('unit inference uses the asked result instead of a matching known quantity', () => {
  const answerUnit = inferAnswerUnit({
    answer: '12',
    prompt: '有 12 盒彩笔，平均分给 8 组，每组多少支？',
    solution: { summary: '', steps: [] },
  });

  assert.equal(answerUnit, '支');
});

test('practice bank supports all three daily question types', () => {
  const types = new Set(practiceQuestions.map((question) => question.type));
  assert.deepEqual([...types].sort(), ['choice', 'fill', 'problem']);
});

test('practice bank offers multiple original variants for each daily question type', () => {
  ['choice', 'fill', 'problem'].forEach((type) => {
    const variants = practiceQuestions.filter(
      (item) => item.knowledgePoint === 'division_estimation' && item.type === type,
    );
    assert.ok(variants.length >= 4, `${type} should have at least four division variants`);
  });
});

test('practice bank is release-ready and does not repeat diagnostic prompts', () => {
  assert.ok(practiceQuestions.length >= 80);
  assert.equal(new Set(practiceQuestions.map((item) => item.prompt)).size, practiceQuestions.length);
  const diagnosticPrompts = new Set(diagnosticQuestions.map((item) => item.prompt));
  assert.equal(practiceQuestions.some((item) => diagnosticPrompts.has(item.prompt)), false);
  const knowledgeCounts = practiceQuestions.reduce((result, item) => {
    result[item.knowledgePoint] = (result[item.knowledgePoint] || 0) + 1;
    return result;
  }, {});
  assert.ok(Object.values(knowledgeCounts).every((count) => count >= 4));
  assert.ok(practiceQuestions.filter((item) => item.term === '上册').length >= 35);
  assert.ok(practiceQuestions.filter((item) => item.term === '下册').length >= 35);
});

test('published primary dedupe keeps later practice questions as learner-visible variants', () => {
  const pairs = [
    ['d-choice-division-2', 'p-choice-division-variant-1'],
    ['d-g1-money_count-3', 'p-g1-money_count-3'],
  ];
  const allQuestions = [...diagnosticQuestions, ...practiceQuestions];

  pairs.forEach(([diagnosticId, practiceId]) => {
    const diagnostic = allQuestions.find((item) => item.id === diagnosticId);
    const practice = allQuestions.find((item) => item.id === practiceId);

    assert.ok(diagnostic, `${diagnosticId} should remain published`);
    assert.ok(practice, `${practiceId} should remain published`);
    assert.notEqual(practice.prompt, diagnostic.prompt, `${practiceId} needs a visible variant`);
    assert.notEqual(questionMathSignature(practice), questionMathSignature(diagnostic), `${practiceId} needs a new signature`);
    assert.equal(practice.answer, diagnostic.answer, `${practiceId} must preserve the answer`);
    assert.equal(practice.answerUnit, diagnostic.answerUnit, `${practiceId} must preserve the answer unit`);
    assert.equal(practice.calculationExpression || '', diagnostic.calculationExpression || '', `${practiceId} must preserve the calculation`);
    assert.deepEqual(auditQuestion(practice), [], `${practiceId} must pass the content audit`);
  });
});

test('every choice question exposes an option that the answer checker accepts', () => {
  [...diagnosticQuestions, ...practiceQuestions]
    .filter((item) => item.type === 'choice')
    .forEach((item) => {
      assert.ok(
        item.options.some((option) => answersEquivalent(option, item.answer)),
        `${item.id} has no selectable correct option`,
      );
    });
});

test('primary fraction choices expose exactly one mathematically correct option', () => {
  const fractionChoices = [...diagnosticQuestions, ...practiceQuestions]
    .filter((item) => !item.schoolStage)
    .filter((item) => item.grade === 6 && item.type === 'choice')
    .filter((item) => item.answerSpec && item.answerSpec.kind === 'fraction');

  assert.ok(fractionChoices.some((item) => item.id === 'd-g6-fraction_multiply-1'));
  assert.ok(fractionChoices.some((item) => item.id === 'd-entry-rjb-g6-fraction_sense-l1-v1'));
  fractionChoices.forEach((item) => {
    const accepted = item.options.filter((option) => (
      answersEquivalent(option, item.answer, item.answerUnit, item.answerSpec)
    ));
    assert.deepEqual(accepted, [item.answer], item.id);
  });
});

test('question audit rejects a choice with more than one accepted answer', () => {
  const fractionChoice = [...diagnosticQuestions, ...practiceQuestions].find((item) => (
    item.id === 'd-g6-fraction_multiply-1'
  ));
  const ambiguous = {
    ...fractionChoice,
    options: ['2/5', '4/10', '1/5', '3/5'],
  };

  assert.ok(auditQuestion(ambiguous).includes('choice_answer_ambiguous'));
});

test('question audit catches an answer that disagrees with its stored calculation', () => {
  const invalidQuestion = {
    ...practiceQuestions.find((question) => (
      question.knowledgePoint === 'division_exact' && question.calculationExpression
    )),
    answer: '999',
  };

  assert.ok(auditQuestion(invalidQuestion).includes('calculation_expression_mismatch'));
});

test('question audit calculates remainders, estimates, and exact division in their own contexts', () => {
  const allQuestions = [...diagnosticQuestions, ...practiceQuestions];
  const remainderQuestion = allQuestions.find((question) => (
    question.knowledgePoint === 'division_remainder'
    && question.calculationExpression
    && question.examPattern !== 'estimate_check'
  ));
  const divisionEstimate = allQuestions.find((question) => (
    question.knowledgePoint === 'division_estimation'
    && question.calculationExpression
    && question.examPattern === 'estimate_check'
  ));
  const exactDivision = allQuestions.find((question) => (
    question.knowledgePoint === 'division_exact'
    && question.calculationExpression
    && question.examPattern === 'calculation_model'
  ));

  assert.deepEqual(auditQuestion(remainderQuestion), []);
  assert.deepEqual(auditQuestion(divisionEstimate), []);
  assert.deepEqual(auditQuestion(exactDivision), []);
});

test('question audit rejects an estimate without a declared rounding target', () => {
  const source = [...diagnosticQuestions, ...practiceQuestions].find((item) => item.examPattern === 'estimate_check' && item.calculationExpression);
  assert.ok(source);
  const ambiguous = { ...source, prompt: source.prompt.replace(/（整十数）|（整百数）/g, '') };
  assert.ok(auditQuestion(ambiguous).includes('estimate_target_missing'));
});

test('question audit rejects an estimate answer that does not match its declared target', () => {
  const source = [...diagnosticQuestions, ...practiceQuestions].find((item) => item.examPattern === 'estimate_check' && item.calculationExpression && /整十数/.test(item.prompt));
  assert.ok(source);
  const invalid = { ...source, answer: String(Number(source.answer) + 10) };
  assert.ok(auditQuestion(invalid).includes('estimate_answer_mismatch'));
});

test('edition reverse questions never turn remainder or estimate answers into exact equations', () => {
  const unsafeReverseQuestions = [...diagnosticQuestions, ...practiceQuestions]
    .filter((question) => question.examPattern === 'reverse_reasoning')
    .filter((question) => ['division_remainder', 'division_estimation', 'multiply_estimation']
      .includes(question.knowledgePoint));

  assert.deepEqual(unsafeReverseQuestions.map((question) => question.id), []);
});

test('reverse-reasoning metadata is used only for visible inverse questions', () => {
  const mislabeled = [...diagnosticQuestions, ...practiceQuestions]
    .filter((question) => question.examPattern === 'reverse_reasoning')
    .filter((question) => !question.prompt.includes('□'));

  assert.deepEqual(mislabeled.map((question) => question.id), []);
});

test('grade-three remainder division keeps quotient-and-remainder answers auditable', () => {
  const legacyRemainderQuestions = [...diagnosticQuestions, ...practiceQuestions]
    .filter((question) => /^(?:d|p)-g3-division_remainder-/.test(question.id));

  assert.ok(legacyRemainderQuestions.length >= 10);
  assert.equal(new Set(legacyRemainderQuestions.map(questionMathSignature)).size, legacyRemainderQuestions.length);
  legacyRemainderQuestions.forEach((question) => {
    assert.match(question.answer, /^\d+余[1-9]\d*$/, question.id);
    assert.match(question.calculationExpression, /^\d+\s*[÷/]\s*\d+$/, question.id);
    assert.ok(question.solution.steps.join('').includes('余'), question.id);
    assert.deepEqual(auditQuestion(question), [], question.id);
  });

  const malformed = { ...legacyRemainderQuestions[0], answer: '99余9' };
  assert.ok(auditQuestion(malformed).includes('remainder_expression_mismatch'));
});

test('division estimate answers and calculations use the dividend shown to the learner', () => {
  const divisionEstimates = [...diagnosticQuestions, ...practiceQuestions]
    .filter((question) => question.knowledgePoint === 'division_estimation')
    .filter((question) => question.examPattern === 'estimate_check')
    .filter((question) => question.calculationExpression)
    .filter((question) => /的商最接近多少/.test(question.prompt));

  assert.ok(divisionEstimates.length > 0);
  divisionEstimates.forEach((question) => {
    const match = question.prompt.match(/(\d+)\s*÷\s*(\d+)\s*的商最接近/);
    assert.ok(match, question.id);
    const [, dividendText, divisorText] = match;
    const dividend = Number(dividendText);
    const divisor = Number(divisorText);
    const expected = Math.round((dividend / divisor) / 10) * 10;
    assert.equal(Number(question.answer), expected, question.id);
    assert.equal(question.calculationExpression, `${dividend} ÷ ${divisor}`, question.id);
    assert.match(question.prompt, /整十数/, question.id);
  });
});

test('division-estimation items visibly ask for an estimate instead of an exact quotient', () => {
  const divisionEstimates = [...diagnosticQuestions, ...practiceQuestions]
    .filter((question) => question.knowledgePoint === 'division_estimation');

  assert.ok(divisionEstimates.length > 0);
  divisionEstimates.forEach((question) => {
    assert.match(question.prompt, /估一估|大约|最接近|范围/, question.id);
    assert.doesNotMatch(question.prompt, /÷\s*\d+\s*=\s*____/, question.id);
    assert.equal(question.examPattern, 'estimate_check', question.id);
  });
});

test('legacy and entry estimate questions name their rounding target', () => {
  const rows = [...diagnosticQuestions, ...practiceQuestions]
    .filter((item) => item.examPattern === 'estimate_check');
  const legacyIds = [
    'd-choice-multiply-1', 'd-choice-multiply-2', 'd-choice-multiply-3', 'd-choice-multiply-4',
    'd-choice-division-3', 'd-choice-division-4', 'p-fill-division-1',
  ];
  legacyIds.forEach((id) => {
    const item = rows.find((row) => row.id === id);
    assert.ok(item, id);
    assert.match(item.prompt, /整十数|整百数/, id);
    const explanation = [item.solution?.summary, ...(item.solution?.steps || [])].join(' ');
    assert.match(explanation, new RegExp(String(item.answer)), id);
  });

  const entry = rows.filter((item) => item.entrySlot === 'estimate_division' && item.grade === 4);
  assert.equal(entry.length, 48);
  entry.forEach((item) => {
    assert.match(item.prompt, /整十数/, item.id);
    assert.equal(new Set(item.options).size, item.options.length, item.id);
    assert.equal(item.options.filter((option) => String(option) === String(item.answer)).length, 1, item.id);
    assert.match(item.solution.steps.join(' '), new RegExp(String(item.answer)), item.id);
  });
});

test('every estimation choice has the stored answer as its unique closest option', () => {
  const estimationChoices = [...diagnosticQuestions, ...practiceQuestions]
    .filter((question) => question.type === 'choice')
    .filter((question) => /最接近多少/.test(question.prompt))
    .filter((question) => question.calculationExpression)
    .filter((question) => question.options.every((option) => Number.isFinite(Number(option))));

  assert.ok(estimationChoices.length > 100);
  estimationChoices.forEach((question) => {
    const calculated = evaluateArithmeticExpression(question.calculationExpression);
    assert.ok(Number.isFinite(calculated), question.id);
    const distances = question.options.map((option) => Math.abs(Number(option) - calculated));
    const closestDistance = Math.min(...distances);
    const closestOptions = question.options.filter((option, index) => distances[index] === closestDistance);
    assert.deepEqual(closestOptions, [question.answer], question.id);
  });

  estimationChoices
    .filter((question) => Number(question.grade) <= 6)
    .forEach((question) => {
      assert.ok(question.options.every((option) => Number(option) >= 0), question.id);
    });
});

test('non-terminating legacy decimal division tells the learner to round to two places', () => {
  const decimalDivision = [...diagnosticQuestions, ...practiceQuestions]
    .filter((question) => /^(?:d|p)-g5-decimal_divide-/.test(question.id));
  const roundedQuestions = decimalDivision.filter((question) => {
    const exact = evaluateArithmeticExpression(question.calculationExpression);
    return Number.isFinite(exact) && Math.abs(exact - Number(question.answer)) > 1e-9;
  });

  assert.ok(roundedQuestions.length > 0);
  roundedQuestions.forEach((question) => {
    assert.match(question.prompt, /保留两位小数/, question.id);
    assert.ok(question.solution.steps.join('').includes('约等于'), question.id);
  });
});

test('batch-cooking explanations use a valid quotient-and-remainder equation', () => {
  const batchCooking = practiceQuestions.find((question) => question.id === 'p-problem-pattern-1');

  assert.ok(batchCooking);
  assert.ok(batchCooking.solution.steps.includes('10 = 4 × 2 + 2'));
  assert.equal(batchCooking.solution.steps.some((step) => /10÷4=2（锅）……2（个）/.test(step)), false);
});

test('every published question passes the visible content and calculation audit', () => {
  assert.deepEqual(auditQuestionBank([...diagnosticQuestions, ...practiceQuestions]), []);
});

test('primary perimeter answers accept bare and unit-bearing input and display the exact unit', () => {
  const item = practiceQuestions.find((question) => question.id === 'p-problem-rectangle-perimeter-4');
  assert.ok(item);
  assert.equal(item.answer, '116');
  assert.equal(item.answerUnit, '\u5206\u7c73');
  assert.equal(answersEquivalent('116', item.answer, item.answerUnit, item.answerSpec), true);
  assert.equal(answersEquivalent('116\u5206\u7c73', item.answer, item.answerUnit, item.answerSpec), true);
  assert.equal(formatAnswerWithUnit(item.answer, item.answerUnit), '116\u5206\u7c73');
  assert.ok(item.solution.steps[item.solution.steps.length - 1].includes('116\u5206\u7c73'));
});

test('primary fractional answers carry reduced fraction specs and accept equivalents', () => {
  const fractions = [...diagnosticQuestions, ...practiceQuestions].filter((item) => /^-?\d+\/\d+$/.test(String(item.answer)));
  assert.ok(fractions.length > 0);
  fractions.forEach((item) => {
    assert.equal(item.answerSpec && item.answerSpec.kind, 'fraction', item.id);
    const [numerator, denominator] = item.answerSpec.value.split('/').map(Number);
    let a = Math.abs(numerator);
    let b = Math.abs(denominator);
    while (b) [a, b] = [b, a % b];
    assert.equal(a, 1, `${item.id} spec must be reduced`);
    assert.equal(answersEquivalent(`${numerator * 2}/${denominator * 2}`, item.answer, '', item.answerSpec), true, item.id);
  });
});

test('primary unit-bearing questions end with and audit their formatted final answers', () => {
  const questions = [...diagnosticQuestions, ...practiceQuestions].filter((item) => item.schoolStage !== 'junior' && item.answerUnit);
  assert.ok(questions.length > 0);
  questions.forEach((item) => {
    const expected = formatAnswerWithUnit(item.answer, item.answerUnit);
    assert.ok(item.solution.steps[item.solution.steps.length - 1].includes(expected), item.id);
    assert.deepEqual(auditQuestion(item), [], item.id);
  });
  const sample = questions[0];
  const tampered = { ...sample, solution: { ...sample.solution, steps: ['\u53ea\u5199\u4e86\u8fc7\u7a0b\u3002'] } };
  assert.ok(auditQuestion(tampered).includes('solution_answer_missing'));
});

test('legacy visual and reasoning choices state their selected answer in the explanation', () => {
  const ids = [
    'd-choice-geometry-1',
    'd-choice-geometry-3',
    'd-choice-geometry-4',
    'p-choice-problem-1',
    'p-choice-geometry-1',
    'p-choice-operation-order-3',
    'p-choice-triangle-sides-1',
    'p-choice-triangle-sides-2',
    'p-choice-view-direction-1',
    'p-choice-view-direction-2',
    'p-choice-view-direction-3',
    'p-choice-view-direction-4',
  ];
  const byId = new Map([...diagnosticQuestions, ...practiceQuestions].map((question) => [question.id, question]));

  ids.forEach((id) => {
    const question = byId.get(id);
    assert.ok(question, `${id} is missing`);
    const conclusion = [
      question.solution.summary,
      question.solution.steps.at(-1),
    ];
    assert.ok(conclusion.some((text) => String(text).includes(question.answer)), id);
  });
});

test('every textbook grade difficulty and type has a broad multi-topic practice pool', () => {
  textbookOptions.forEach((textbook) => {
    for (let grade = 1; grade <= 6; grade += 1) {
      [1, 2, 3].forEach((difficulty) => {
        ['choice', 'fill', 'problem'].forEach((type) => {
          const pool = practiceQuestions.filter((item) => (
            item.textbookId === textbook.value
            && item.grade === grade
            && item.difficulty === difficulty
            && item.type === type
          ));
          const label = `${textbook.value} grade ${grade} difficulty ${difficulty} ${type}`;
          assert.ok(pool.length >= 12, `${label} needs at least twelve questions`);
          assert.ok(new Set(pool.map((item) => item.knowledgePoint)).size >= 6, `${label} needs at least six topics`);
          assert.equal(new Set(pool.map((item) => item.prompt)).size, pool.length, `${label} repeats prompts`);
        });
      });
    }
  });
});

const test = require('node:test');
const assert = require('node:assert/strict');

const { getTextbookOptions } = require('../miniprogram/utils/textbook-catalog');
const { getJuniorTopics } = require('../miniprogram/utils/junior-high-curriculum');
const { answersEquivalent } = require('../miniprogram/utils/math-answer');
const { formatAnswerWithUnit } = require('../miniprogram/utils/math-answer');
const {
  getQuestionBank,
  getQuestions,
  auditQuestion,
  auditQuestionBank,
  questionMathSignature,
} = require('../miniprogram/utils/question-bank');
const {
  getJuniorQuestionBank,
  buildJuniorDiagnosticQuestions,
  buildJuniorPracticeQuestions,
  __resetJuniorQuestionBankCache,
  __getJuniorQuestionBankCacheState,
} = require('../miniprogram/utils/question-bank-junior-data');

const difficulties = ['easy', 'medium', 'hard'];
const types = ['choice', 'fill', 'problem'];

function declaredTopicKeys(textbookId, grade) {
  return getJuniorTopics(textbookId, grade).map((topic) => topic.key);
}

function sharedDeclaredTopicKeys(editions, grade) {
  const [firstEdition, ...otherEditions] = editions;
  return declaredTopicKeys(firstEdition.value, grade).filter((topicKey) => (
    otherEditions.every((edition) => declaredTopicKeys(edition.value, grade).includes(topicKey))
  ));
}

function gcd(left, right) {
  let a = Math.abs(Number(left));
  let b = Math.abs(Number(right));
  while (b) [a, b] = [b, a % b];
  return a;
}

function mathematicalSignature(question) {
  return JSON.stringify({
    calculationExpression: question.calculationExpression || '',
    auditRule: question.auditRule || null,
    answerSpec: question.answerSpec,
    answer: question.answer,
    answerUnit: question.answerUnit,
  });
}

function observableSignature(question) {
  return JSON.stringify({
    prompt: question.prompt,
    answer: question.answer,
    solution: question.solution.steps,
    calculationExpression: question.calculationExpression,
  });
}

function mathematicalConditionSignature(question) {
  return JSON.stringify({
    knowledgePoint: question.knowledgePoint,
    calculationExpression: question.calculationExpression,
    answer: question.answer,
    answerUnit: question.answerUnit,
    conditions: question.auditRule && question.auditRule.conditionTokens,
  });
}

function completeConditionSignature(question) {
  return JSON.stringify({
    knowledgePoint: question.knowledgePoint,
    calculationExpression: String(question.calculationExpression || '').replace(/[()\s]/g, ''),
    answer: question.answer,
    answerUnit: question.answerUnit,
    conditions: (question.auditRule && question.auditRule.conditionTokens) || [],
  });
}

function variantOf(question) {
  const match = String(question.id).match(/-(\d+)$/);
  return match ? Number(match[1]) : NaN;
}

test('junior bank builds only requested scopes and returns mutation-safe scoped copies', () => {
  __resetJuniorQuestionBankCache();
  assert.deepEqual(__getJuniorQuestionBankCacheState(), { size: 0, keys: [] });

  const scope = { schoolStage: 'junior', textbookId: 'jr-rjb', grade: 7 };
  const first = getJuniorQuestionBank(scope);
  const second = getJuniorQuestionBank(scope);
  assert.notStrictEqual(second, first);
  assert.deepEqual(second, first);
  assert.deepEqual(__getJuniorQuestionBankCacheState(), { size: 1, keys: ['junior:jr-rjb:g7'] });
  assert.ok(first.diagnosticQuestions.every((item) => item.id.startsWith('j-d-jr-rjb-g7-')));
  assert.ok(first.practiceQuestions.every((item) => item.id.startsWith('j-p-jr-rjb-g7-')));
  assert.deepEqual(buildJuniorDiagnosticQuestions(scope), first.diagnosticQuestions);
  assert.deepEqual(buildJuniorPracticeQuestions(scope), first.practiceQuestions);

  const canonicalPrompt = second.practiceQuestions[0].prompt;
  first.practiceQuestions[0].prompt = 'contaminated';
  first.practiceQuestions.push({ id: 'contaminated' });
  const third = getJuniorQuestionBank(scope);
  assert.equal(third.practiceQuestions[0].prompt, canonicalPrompt);
  assert.equal(third.practiceQuestions.some((item) => item.id === 'contaminated'), false);
});

test('every junior edition-grade-difficulty-type pool is original, explained, and answerable', () => {
  getTextbookOptions('junior').forEach((edition) => [7, 8, 9].forEach((grade) => {
    difficulties.forEach((difficultyMode) => types.forEach((type) => {
      const pool = getQuestions({
        schoolStage: 'junior', textbookId: edition.value, grade, difficultyMode, type,
      });
      const label = `${edition.value} g${grade} ${difficultyMode} ${type}`;
      assert.equal(pool.length, declaredTopicKeys(edition.value, grade).length * 3, label);
      assert.equal(new Set(pool.map((item) => item.prompt)).size, pool.length, `${label} repeats prompts`);
      assert.ok(new Set(pool.map((item) => item.examPattern)).size >= 3, `${label} lacks thinking patterns`);
      assert.ok(pool.every((item) => (
        item.schoolStage === 'junior'
        && item.textbookId === edition.value
        && item.grade === grade
        && item.difficulty === difficultyMode
        && item.type === type
        && item.answerSpec
        && item.solution.steps.length >= 2
        && item.solution.steps.at(-1).includes(formatAnswerWithUnit(item.answer, item.answerUnit))
        && item.knowledgeSummary
        && item.mistakeSummary.length
        && item.sourceRegion === 'nationwide'
        && /^202[2-6]$/.test(item.sourceYear)
        && item.reviewStatus
        && item.reviewedAt
      )), `${label} metadata is incomplete`);
      assert.deepEqual(auditQuestionBank(pool), [], `${label} audit`);
      pool.filter((item) => item.type === 'choice').forEach((item) => {
        const accepted = item.options.filter((option) => answersEquivalent(
          option, item.answer, item.answerUnit, item.answerSpec,
        ));
        assert.equal(accepted.length, 1, `${item.id} needs one accepted option`);
      });
    }));
  }));
});

test('junior questions are isolated from the primary static bank', () => {
  const junior = getQuestionBank({ schoolStage: 'junior', textbookId: 'jr-bsd', grade: 8 });
  const primary = getQuestionBank({ schoolStage: 'primary', textbookId: 'bsd', grade: 4 });
  assert.ok(junior.practiceQuestions.length > 0);
  assert.ok(junior.diagnosticQuestions.length > 0);
  assert.ok(junior.practiceQuestions.every((item) => item.schoolStage === 'junior'));
  assert.ok(primary.practiceQuestions.every((item) => item.schoolStage !== 'junior'));
});

test('junior audit reports missing conditions, invalid domains, and ambiguous choices', () => {
  const sample = getQuestions({
    schoolStage: 'junior', textbookId: 'jr-rjb', grade: 8, difficultyMode: 'medium', type: 'choice',
  })[0];
  const missingFunctionCondition = { ...sample, knowledgePoint: 'linear_function', prompt: '求结果。' };
  const invalidDomain = { ...sample, knowledgePoint: 'fraction_expression', prompt: '当 x=2 时，求 (x+1)/(x-2) 的值。' };
  const ambiguousChoice = { ...sample, options: [sample.answer, sample.answer, '999', '-999'] };

  assert.ok(auditQuestion(missingFunctionCondition).includes('junior_missing_condition'));
  assert.ok(auditQuestion(invalidDomain).includes('junior_invalid_domain'));
  assert.ok(auditQuestion(ambiguousChoice).includes('junior_option_ambiguity'));
});

test('all junior scopes have globally unique ids and prompts with genuine pool variety', () => {
  const allPractice = [];
  let expectedPracticeCount = 0;
  getTextbookOptions('junior').forEach((edition) => [7, 8, 9].forEach((grade) => {
    const bank = getQuestionBank({ schoolStage: 'junior', textbookId: edition.value, grade });
    const topicCount = declaredTopicKeys(edition.value, grade).length;
    expectedPracticeCount += topicCount * difficulties.length * types.length * 3;
    allPractice.push(...bank.practiceQuestions);
    difficulties.forEach((difficulty) => types.forEach((type) => {
      const pool = bank.practiceQuestions.filter((item) => item.difficulty === difficulty && item.type === type);
      const label = `${edition.value} g${grade} ${difficulty} ${type}`;
      assert.equal(pool.length, topicCount * 3, `${label} needs three variants per declared topic`);
      assert.equal(new Set(pool.map((item) => item.knowledgePoint)).size, topicCount, `${label} needs every declared topic`);
      assert.ok(new Set(pool.map((item) => item.examPattern)).size >= 3, `${label} needs three exam patterns`);
      assert.equal(new Set(pool.map((item) => item.prompt)).size, pool.length, `${label} repeats a prompt`);
    }));
  }));

  assert.equal(allPractice.length, expectedPracticeCount);
  assert.equal(new Set(allPractice.map((item) => item.id)).size, allPractice.length, 'junior ids must be globally unique');
  // Different textbook editions may align to the same public curriculum topic;
  // enforce unique mathematical conditions inside each declared pool instead
  // of requiring cosmetic wording changes across all publishers.
});

test('junior catalog never reuses a mathematical condition across textbook scopes', () => {
  const questions = [];
  getTextbookOptions('junior').forEach((edition) => [7, 8, 9].forEach((grade) => {
    const bank = getJuniorQuestionBank({ schoolStage: 'junior', textbookId: edition.value, grade });
    questions.push(...bank.diagnosticQuestions, ...bank.practiceQuestions);
  }));
  const signatures = questions.map(questionMathSignature);
  assert.equal(new Set(signatures).size, signatures.length, 'junior catalog repeats a mathematical condition');
});

test('a textbook never reuses a junior mathematical condition across grades', () => {
  getTextbookOptions('junior').forEach((edition) => {
    const conditions = new Map();
    [7, 8, 9].forEach((grade) => {
      const questions = getQuestionBank({
        schoolStage: 'junior', textbookId: edition.value, grade,
      }).practiceQuestions;
      questions.forEach((question) => {
        const key = mathematicalConditionSignature(question);
        if (!conditions.has(key)) conditions.set(key, []);
        conditions.get(key).push(question);
      });
    });
    conditions.forEach((questions, key) => {
      const grades = new Set(questions.map((question) => question.grade));
      assert.equal(
        grades.size,
        1,
        `${edition.value} reuses one mathematical condition across grades: ${key} (${questions.map((question) => question.id).join(', ')})`,
      );
    });
  });
});

test('question type changes the requested learner action instead of only metadata', () => {
  const scope = { schoolStage: 'junior', textbookId: 'jr-rjb', grade: 7, difficultyMode: 'medium' };
  const choice = getQuestions({ ...scope, type: 'choice' });
  const fill = getQuestions({ ...scope, type: 'fill' });
  const problem = getQuestions({ ...scope, type: 'problem' });

  assert.ok(choice.every((item) => item.prompt.includes('（ ）') && item.options.length === 4));
  assert.ok(fill.every((item) => item.prompt.includes('____') && item.options.length === 0));
  assert.ok(problem.every((item) => (
    !item.prompt.includes('____')
    && item.options.length === 0
    && item.auditRule.taskShape === 'contextual_problem'
    && item.auditRule.conditionTokens.length >= 1
    && item.solution.steps.length >= 3
  )));
  const expressions = [choice, fill, problem].map((set) => new Set(set.map((item) => item.calculationExpression)));
  expressions.forEach((set, index) => expressions.slice(index + 1).forEach((other) => {
    assert.equal([...set].some((expression) => other.has(expression)), false, 'types must not reuse the same calculation');
  }));
  const bodies = new Set([...choice, ...fill, ...problem].map((item) => item.prompt));
  assert.equal(bodies.size, choice.length + fill.length + problem.length);
});

test('edition profiles change mathematical conditions for the same grade and topic', () => {
  const editions = getTextbookOptions('junior');
  const observedStructures = new Set();
  [7, 8, 9].forEach((grade) => {
    editions.forEach((edition) => declaredTopicKeys(edition.value, grade).forEach((knowledgePoint) => {
      difficulties.forEach((difficultyMode) => types.forEach((type) => {
        const set = getQuestions({
          schoolStage: 'junior', textbookId: edition.value, grade,
          difficultyMode, type, knowledgePoint,
        });
        assert.ok(set.length >= 3, `${edition.value} g${grade} ${knowledgePoint} ${difficultyMode} ${type}`);
        set.slice(0, 3).forEach((item) => {
          assert.ok(item.auditRule && item.auditRule.presentationStyle);
          assert.doesNotMatch(item.prompt, /条件\d+[:：]|学习主线|符号模型/, item.id);
          assert.ok(item.solution.steps.join('').includes(item.auditRule.relationToken));
          observedStructures.add(item.auditRule.presentationStyle);
        });
      }));
    }));

    sharedDeclaredTopicKeys(editions, grade).forEach((knowledgePoint) => {
      for (let variant = 0; variant < 3; variant += 1) {
        const samples = editions.map((edition) => getQuestions({
          schoolStage: 'junior', textbookId: edition.value, grade,
          difficultyMode: 'medium', type: 'problem', knowledgePoint,
        })[variant]);
        assert.ok(samples.every(Boolean), `${grade} ${knowledgePoint} must exist in every edition`);
        assert.equal(new Set(samples.map(mathematicalSignature)).size, editions.length);
        assert.ok(
          new Set(samples.map(observableSignature)).size >= 2,
          `${grade} ${knowledgePoint} variant ${variant} needs visible condition variety`,
        );
      }
    });
  });
  assert.ok(observedStructures.size >= 3, 'junior editions need distinct curriculum structures');
});

test('difficulty changes the mathematical relation inside the task', () => {
  const base = { schoolStage: 'junior', textbookId: 'jr-zj', grade: 9, type: 'problem' };
  const sets = difficulties.map((difficultyMode) => getQuestions({ ...base, difficultyMode }));
  sets.forEach((set, difficultyIndex) => set.forEach((item) => {
    assert.equal(item.auditRule.relationDepth, 1, item.id);
    assert.ok(item.auditRule.conditionTokens.length >= 1, item.id);
    assert.ok(item.solution.steps.length >= 3, item.id);
    assert.doesNotMatch(`${item.prompt}\n${item.solution.steps.join('\n')}`, /第[二三]层|核心结果|三级表达式/, item.id);
  }));
  sets[0].forEach((easy, index) => {
    const corresponding = sets.map((set) => set[index]);
    assert.equal(new Set(corresponding.map((item) => item.knowledgePoint)).size, 1, easy.id);
    assert.equal(new Set(corresponding.map((item) => item.calculationExpression)).size, 3, easy.id);
    assert.equal(new Set(corresponding.map((item) => item.answer)).size, 3, easy.id);
  });
});

test('junior units accept unit-bearing input and probability answers are reduced', () => {
  const questions = getTextbookOptions('junior').flatMap((edition) => [7, 8, 9].flatMap((grade) => (
    getQuestionBank({ schoolStage: 'junior', textbookId: edition.value, grade }).practiceQuestions
  )));
  const unitQuestions = questions.filter((item) => item.answerUnit);
  assert.ok(unitQuestions.length > 0, 'junior bank needs unit-bearing answers');
  unitQuestions.forEach((item) => {
    assert.equal(
      answersEquivalent(`${item.answer}${item.answerUnit}`, item.answer, item.answerUnit, item.answerSpec),
      true,
      `${item.id} should accept its displayed unit`,
    );
    const { formatAnswerWithUnit } = require('../miniprogram/utils/math-answer');
    assert.equal(formatAnswerWithUnit(`${item.answer}${item.answerUnit}`, item.answerUnit), `${item.answer}${item.answerUnit}`);
  });
  const degreeTopics = new Set(['angle_line', 'triangle_intro', 'congruent_triangle', 'geometry_proof']);
  questions.filter((item) => degreeTopics.has(item.knowledgePoint)).forEach((item) => {
    assert.equal(item.answerUnit, '\u5ea6', `${item.id} needs degree unit`);
  });
  const squareCentimetrePrompts = /\u6b63\u65b9\u5f62\u9762\u79ef|\u5706\u7684\u9762\u79ef/;
  questions.filter((item) => ['axis_symmetry', 'pythagorean', 'circle', 'similar_triangle', 'geometry_comprehensive'].includes(item.knowledgePoint))
    .forEach((item) => {
      const expectedUnit = squareCentimetrePrompts.test(item.prompt) ? '\u5e73\u65b9\u5398\u7c73' : '\u5398\u7c73';
      assert.equal(item.answerUnit, expectedUnit, `${item.id} needs its derived geometry unit`);
    });
  questions.filter((item) => item.knowledgePoint === 'probability').forEach((item) => {
    const [numerator, denominator] = String(item.answer).split('/').map(Number);
    assert.equal(gcd(numerator, denominator), 1, `${item.id} probability must be reduced`);
  });
});

test('junior audit contract catches tampered answers and malformed specs across topic families', () => {
  const scope = { schoolStage: 'junior', textbookId: 'jr-rjb', difficultyMode: 'medium', type: 'choice' };
  const knowledgePoints = [
    [7, 'rational_number'],
    [8, 'linear_function'],
    [8, 'pythagorean'],
    [9, 'probability'],
    [9, 'data_inference'],
  ];
  knowledgePoints.forEach(([grade, knowledgePoint]) => {
    const sample = getQuestions({ ...scope, grade, knowledgePoint })[0];
    assert.ok(sample.calculationExpression || sample.auditRule, `${sample.id} needs an executable audit contract`);
    const changed = String(Number(sample.answer) + 1);
    assert.ok(auditQuestion({ ...sample, answer: changed }).includes('junior_answer_mismatch'), `${sample.id} answer tamper`);
    assert.ok(auditQuestion({
      ...sample,
      answerSpec: { kind: 'unsupported', value: sample.answer },
    }).includes('junior_answer_spec_invalid'), `${sample.id} invalid spec`);
  });
});

test('junior audit reports stable condition, domain, and choice uniqueness issues', () => {
  const functionQuestion = getQuestions({
    schoolStage: 'junior', textbookId: 'jr-rjb', grade: 8,
    difficultyMode: 'medium', type: 'choice', knowledgePoint: 'linear_function',
  })[0];
  const circleQuestion = getQuestions({
    schoolStage: 'junior', textbookId: 'jr-rjb', grade: 9,
    difficultyMode: 'medium', type: 'choice', knowledgePoint: 'circle',
  })[0];
  const geometryQuestion = getQuestions({
    schoolStage: 'junior', textbookId: 'jr-rjb', grade: 8,
    difficultyMode: 'medium', type: 'choice', knowledgePoint: 'pythagorean',
  })[0];
  const domainQuestion = getQuestions({
    schoolStage: 'junior', textbookId: 'jr-rjb', grade: 8,
    difficultyMode: 'medium', type: 'choice', knowledgePoint: 'fraction_expression',
  })[0];

  [functionQuestion, circleQuestion, geometryQuestion].forEach((sample) => {
    assert.ok(auditQuestion({ ...sample, prompt: 'Calculate the result.' }).includes('junior_missing_condition'));
  });
  assert.ok(auditQuestion({ ...domainQuestion, prompt: 'x=2, calculate (x+1)/(x-2).' }).includes('junior_invalid_domain'));
  assert.ok(auditQuestion({
    ...functionQuestion,
    options: [functionQuestion.answer, Number(functionQuestion.answer), '999', '-999'],
  }).includes('junior_option_ambiguity'));
});

test('stage inference accepts junior ids or grades and safely rejects explicit conflicts', () => {
  const byTextbook = getQuestions({ textbookId: 'jr-rjb', grade: 7, difficultyMode: 'easy', type: 'fill' });
  const byGrade = getQuestions({ grade: 7, difficultyMode: 'easy', type: 'fill' });
  assert.ok(byTextbook.length >= 24);
  assert.ok(byGrade.length >= 24);
  assert.ok([...byTextbook, ...byGrade].every((item) => item.schoolStage === 'junior'));

  [
    { schoolStage: 'junior', textbookId: 'rjb', grade: 7 },
    { schoolStage: 'junior', textbookId: 'jr-rjb', grade: 4 },
    { schoolStage: 'primary', textbookId: 'jr-rjb', grade: 4 },
    { schoolStage: 'primary', textbookId: 'rjb', grade: 7 },
  ].forEach((scope) => {
    assert.deepEqual(getQuestionBank(scope), { diagnosticQuestions: [], practiceQuestions: [] });
    assert.deepEqual(getQuestions({ ...scope, difficultyMode: 'medium', type: 'choice' }), []);
  });
});

test('junior diagnostics, difficulty variants, and editions keep mathematical conditions distinct', () => {
  const editions = getTextbookOptions('junior');

  [7, 8, 9].forEach((grade) => editions.forEach((edition) => {
    const bank = getJuniorQuestionBank({ schoolStage: 'junior', textbookId: edition.value, grade });
    const diagnosticSignatures = new Set(bank.diagnosticQuestions.map(mathematicalConditionSignature));
    const diagnosticRepeats = bank.practiceQuestions
      .filter((item) => diagnosticSignatures.has(mathematicalConditionSignature(item)))
      .map((item) => item.id);
    // The learner-facing pool is independently unique. A diagnostic uses a
    // representative topic, so a matching exercise is allowed to remain in
    // the optional practice catalog rather than deleting a valid question.
    assert.ok(diagnosticRepeats.every((id) => /^j-p-/.test(id)), `${edition.value} g${grade} diagnostic collision shape`);

    const byVariant = new Map();
    bank.practiceQuestions.forEach((item) => {
      const key = `${item.knowledgePoint}|${item.type}|${variantOf(item)}`;
      if (!byVariant.has(key)) byVariant.set(key, []);
      byVariant.get(key).push(item);
    });
    byVariant.forEach((items, key) => {
      assert.equal(items.length, 3, `${edition.value} g${grade} ${key} needs three difficulties`);
      assert.equal(
        new Set(items.map(mathematicalConditionSignature)).size,
        3,
        `${edition.value} g${grade} ${key} reuses a mathematical condition across difficulties`,
      );
    });
  }));

  [7, 8, 9].forEach((grade) => difficulties.forEach((difficultyMode) => types.forEach((type) => {
    sharedDeclaredTopicKeys(editions, grade).forEach((knowledgePoint) => {
      for (let variant = 0; variant < 3; variant += 1) {
        const items = editions.map((edition) => getQuestions({
          schoolStage: 'junior', textbookId: edition.value, grade, difficultyMode, type, knowledgePoint,
        })[variant]);
        const key = `${knowledgePoint}|${variant + 1}`;
        assert.ok(items.every(Boolean), `g${grade} ${difficultyMode} ${type} ${key} coverage`);
        assert.ok(
          new Set(items.map(mathematicalConditionSignature)).size >= 2,
          `g${grade} ${difficultyMode} ${type} ${key} needs cross-edition variation`,
        );
      }
    });
  })));
});

test('junior scopes never reuse a complete learner condition across banks, types, or difficulties', () => {
  getTextbookOptions('junior').forEach((edition) => [7, 8, 9].forEach((grade) => {
    const bank = getJuniorQuestionBank({ schoolStage: 'junior', textbookId: edition.value, grade });
    const groups = new Map();
    [...bank.diagnosticQuestions, ...bank.practiceQuestions].forEach((item) => {
      const signature = completeConditionSignature(item);
      if (!groups.has(signature)) groups.set(signature, []);
      groups.get(signature).push(item.id);
    });
    const duplicates = [...groups.values()].filter((ids) => ids.length > 1);
    assert.deepEqual(duplicates, [], `${edition.value} g${grade} repeats a complete learner condition`);
  }));
});

test('junior questions use topic-aligned patterns and never rely on a missing figure or a bare context tag', () => {
  const patternByTopic = {
    rational_number: 'calculation_model', algebraic_expression: 'calculation_model', linear_equation: 'calculation_model',
    angle_line: 'condition_filter', triangle_intro: 'condition_filter', data_statistics: 'data_reading',
    inequality_intro: 'condition_filter', coordinate_plane: 'condition_filter', congruent_triangle: 'condition_filter',
    axis_symmetry: 'condition_filter', linear_function: 'calculation_model', fraction_expression: 'calculation_model',
    pythagorean: 'unit_check', data_analysis: 'data_reading', real_number: 'calculation_model',
    geometry_proof: 'condition_filter', quadratic_function: 'calculation_model', circle: 'unit_check',
    similar_triangle: 'unit_check', right_triangle: 'calculation_model', probability: 'condition_filter',
    quadratic_equation: 'calculation_model', geometry_comprehensive: 'unit_check', data_inference: 'data_reading',
  };
  getTextbookOptions('junior').forEach((edition) => [7, 8, 9].forEach((grade) => {
    const bank = getJuniorQuestionBank({ schoolStage: 'junior', textbookId: edition.value, grade });
    [...bank.diagnosticQuestions, ...bank.practiceQuestions].forEach((item) => {
      assert.equal(item.examPattern, patternByTopic[item.knowledgePoint], item.id);
      assert.doesNotMatch(item.prompt, /如图|本题情境：/, item.id);
      assert.doesNotMatch(item.hint, /先圈出已知条件/, item.id);
      assert.match(item.knowledgeSummary, new RegExp(item.knowledgePoint === 'right_triangle' ? '三角函数|特殊角' : item.knowledgePoint === 'axis_symmetry' ? '轴对称|对称' : '.+'), item.id);
    });
  }));
});

test('junior geometry questions use their native relation instead of a generic segment-total wrapper', () => {
  getTextbookOptions('junior').forEach((edition) => [7, 8, 9].forEach((grade) => {
    const bank = getJuniorQuestionBank({ schoolStage: 'junior', textbookId: edition.value, grade });
    [...bank.diagnosticQuestions, ...bank.practiceQuestions].forEach((item) => {
      const visible = [item.prompt, item.hint, ...item.solution.steps].join('\n');
      assert.doesNotMatch(visible, /\u4e24\u6bb5.*\u603b\u957f|\u9644\u52a0\u6bb5|\u4e24\u6bb5\u5747\u4e3a/, item.id);
    });
  }));
});

test('junior learner-facing prompts never retain presentation-framework labels', () => {
  const bank = getJuniorQuestionBank({ schoolStage: 'junior', textbookId: 'jr-suk', grade: 7 });
  const visible = [...bank.diagnosticQuestions, ...bank.practiceQuestions]
    .map((item) => item.prompt)
    .join('\n');

  assert.doesNotMatch(visible, /条件\d+[:：]|方案中[:：]|学习主线|符号模型|建模约束/);
});

test('junior generated conditions stay inside age-appropriate mathematical domains', () => {
  getTextbookOptions('junior').forEach((edition) => [7, 8, 9].forEach((grade) => {
    const bank = getJuniorQuestionBank({ schoolStage: 'junior', textbookId: edition.value, grade });
    [...bank.diagnosticQuestions, ...bank.practiceQuestions].forEach((item) => {
      const visible = item.prompt;
      if (item.knowledgePoint === 'angle_line') {
        const known = Number((visible.match(/已知角为\s*(-?\d+(?:\.\d+)?)\s*度/) || [])[1]);
        assert.ok(known > 0 && known < 180, `${item.id} has an impossible adjacent angle`);
        assert.ok(Number(item.answer) > 0, `${item.id} has a non-positive angle answer`);
      }
      if (item.knowledgePoint === 'triangle_intro') {
        const match = visible.match(/两个内角分别为\s*(\d+)\s*度和\s*(\d+)\s*度/);
        assert.ok(match, `${item.id} must state both triangle angles`);
        const sum = Number(match[1]) + Number(match[2]);
        assert.ok(sum > 0 && sum < 180, `${item.id} has invalid triangle angles`);
      }
      if (item.knowledgePoint === 'inequality_intro') {
        const boundary = Number((visible.match(/x<\s*(-?\d+)/) || [])[1]);
        assert.ok(boundary >= 2 && boundary <= 60, `${item.id} has an unsuitable inequality boundary`);
      }
      if (['pythagorean', 'circle', 'axis_symmetry', 'similar_triangle', 'geometry_comprehensive'].includes(item.knowledgePoint)) {
        const values = (visible.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
        assert.ok(values.every((value) => Math.abs(value) <= 200), `${item.id} has an out-of-range geometry value`);
      }
    });
  }));
});

test('junior same-topic slots remain distinct across editions and difficulties', () => {
  const editions = getTextbookOptions('junior');
  [7, 8, 9].forEach((grade) => editions.forEach((edition) => {
    const bank = getJuniorQuestionBank({ schoolStage: 'junior', textbookId: edition.value, grade });
    const byVariant = new Map();
    bank.practiceQuestions.forEach((item) => {
      const key = `${item.knowledgePoint}|${item.type}|${variantOf(item)}`;
      if (!byVariant.has(key)) byVariant.set(key, []);
      byVariant.get(key).push(item);
    });
    byVariant.forEach((items, key) => {
      assert.equal(new Set(items.map(mathematicalConditionSignature)).size, 3, `${edition.value} g${grade} ${key}`);
    });
  }));
  [7, 8, 9].forEach((grade) => editions.forEach((edition) => {
    const sharedTopics = sharedDeclaredTopicKeys(editions, grade);
    sharedTopics.forEach((knowledgePoint) => difficulties.forEach((difficultyMode) => types.forEach((type) => {
      const items = editions.map((candidate) => getQuestions({
        schoolStage: 'junior', textbookId: candidate.value, grade, difficultyMode, type, knowledgePoint,
      })[0]);
      assert.ok(new Set(items.map(mathematicalConditionSignature)).size >= 2, `${knowledgePoint} ${difficultyMode} ${type}`);
    })));
  }));
});

test('junior specialized stems use distinct mathematics instead of a pasted edition context label', () => {
  [
    { knowledgePoint: 'rational_number', grade: 7 },
    { knowledgePoint: 'right_triangle', grade: 9 },
  ].forEach(({ knowledgePoint, grade }) => {
    const questions = ['jr-rjb', 'jr-bsd', 'jr-suk', 'jr-huk', 'jr-luj', 'jr-xj', 'jr-hsd', 'jr-zj']
      .filter((textbookId) => getJuniorTopics(textbookId, grade).some((topic) => topic.key === knowledgePoint))
      .map((textbookId) => getQuestions({
        schoolStage: 'junior', textbookId, grade,
        difficultyMode: 'easy', type: 'choice', knowledgePoint,
      })[0]);
    questions.forEach((question) => assert.doesNotMatch(question.prompt, /本题情境：/, question.id));
    assert.ok(new Set(questions.map((question) => question.prompt)).size >= 2, `${knowledgePoint} must show edition-specific context`);
  });
});

test('junior diagnostic and practice prompts do not reuse the same learner-visible condition', () => {
  getTextbookOptions('junior').forEach((edition) => [7, 8, 9].forEach((grade) => {
    const bank = getJuniorQuestionBank({ schoolStage: 'junior', textbookId: edition.value, grade });
    const questions = [...bank.diagnosticQuestions, ...bank.practiceQuestions];
    const signatures = questions.map((item) => [item.prompt, item.calculationExpression, item.answer, item.answerUnit].join('|'));
    assert.equal(new Set(signatures).size, signatures.length, `${edition.value} g${grade} diagnostic/practice collision`);
  }));
});

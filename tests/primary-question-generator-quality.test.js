const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildEditionPracticeQuestions,
  buildEditionDiagnosticQuestions,
} = require('../miniprogram/utils/question-bank-edition-data');

const generatedQuestions = [
  ...buildEditionDiagnosticQuestions(),
  ...buildEditionPracticeQuestions(),
];

function topicQuestions(grade, key) {
  return generatedQuestions.filter((item) => (
    item.grade === grade
    && (item.knowledgePoint === key || item.knowledgePoint.endsWith(`_${key}`))
  ));
}

function corePrompt(item) {
  return item.prompt;
}

test('generated lower-primary topics stay within their named learning context', () => {
  const money = topicQuestions(1, 'money_count');
  const clocks = topicQuestions(1, 'clock_reading');
  const lengths = topicQuestions(1, 'length_compare');
  const angles = topicQuestions(2, 'angle_right');

  assert.ok(money.length > 0);
  assert.ok(clocks.length > 0);
  assert.ok(lengths.length > 0);
  assert.ok(angles.length > 0);

  money.forEach((item) => {
    assert.doesNotMatch(item.prompt, /\d+\.\d+\s*元/, item.id);
    assert.match(item.prompt, /元/, item.id);
  });
  clocks.forEach((item) => {
    assert.doesNotMatch(item.prompt, /\d+:\d{2}|经过\s*\d+\s*分钟/, item.id);
    assert.match(item.prompt, /时/, item.id);
  });
  lengths.forEach((item) => {
    assert.match(item.prompt, /(厘米|长|短)/, item.id);
    assert.doesNotMatch(item.prompt, /在\s*\d+\s*○\s*\d+\s*中/, item.id);
  });
  angles.forEach((item) => {
    assert.equal(item.answer, '直角', item.id);
    assert.doesNotMatch(item.prompt, /锐角|钝角/, item.id);
  });
});

test('generated measurement and proportion questions retain their mathematical conditions', () => {
  const measurementTopics = [
    [3, 'area_rectangle_g3', /长方形.*面积/],
    [5, 'area_rectangle_g5', /长方形.*面积/],
    [5, 'volume_cuboid', /长方体.*体积/],
    [5, 'unit_conversion_g5', /米|厘米/],
    [6, 'circle', /圆.*直径|圆的直径/],
    [6, 'volume_cone', /圆锥.*底面积.*高/],
    [6, 'proportion', /解比例：.*(?:x.*=|=.*x)/],
  ];

  measurementTopics.forEach(([grade, key, promptPattern]) => {
    const questions = topicQuestions(grade, key);
    assert.ok(questions.length > 0, key);
    questions.forEach((item) => {
      assert.match(item.prompt, promptPattern, item.id);
      assert.doesNotMatch(item.prompt, /□/, item.id);
      assert.notEqual(item.examPattern, 'reverse_reasoning', item.id);
      assert.notEqual(item.examPattern, 'estimate_check', item.id);
    });
  });

  topicQuestions(6, 'volume_cone').forEach((item) => {
    assert.match(item.solution.steps.join(''), /÷3/, item.id);
  });
  topicQuestions(6, 'proportion').forEach((item) => {
    assert.match(item.solution.steps.join(''), /交叉相乘/, item.id);
  });
});

test('generated circle questions retain their unit-check thinking pattern', () => {
  const circles = topicQuestions(6, 'circle');

  assert.ok(circles.length > 0);
  circles.forEach((item) => {
    assert.equal(item.examPattern, 'unit_check', item.id);
    assert.match(item.prompt, /厘米/, item.id);
    assert.match(item.answerUnit || '', /厘米/, item.id);
  });
});

test('generated area and volume questions state the answer unit in the prompt', () => {
  const questions = buildEditionPracticeQuestions()
    .filter((item) => ['area_rectangle_g3', 'area_rectangle_g5', 'volume_cuboid'].includes(item.knowledgePoint));
  assert.ok(questions.length > 0);
  questions.forEach((item) => {
    assert.ok(item.answerUnit, item.id);
    assert.match(item.prompt, new RegExp(item.answerUnit), item.id);
    assert.match(item.prompt, /结果填|是多少/, item.id);
  });
});

test('generated grade-four viewing and division questions match their named topic', () => {
  const visualQuestions = topicQuestions(4, 'view_from_direction');
  const divisionQuestions = topicQuestions(4, 'division_exact');

  visualQuestions.forEach((item) => {
    assert.match(item.prompt, /小正方体/, item.id);
    assert.match(item.prompt, /几(个|个小正方形)/, item.id);
    assert.notEqual(item.answer, '正方形', item.id);
  });
  divisionQuestions.forEach((item) => {
    assert.match(item.prompt, /÷\s*[1-9]\d/, item.id);
  });
});

test('generated concept questions never demand an arithmetic expression', () => {
  const invalid = generatedQuestions.filter((item) => (
    item.type === 'problem'
    && item.prompt.includes('请列式并写出结果。')
    && !item.calculationExpression
  ));
  assert.deepEqual(invalid.map((item) => item.id), []);
});

test('generated non-calculation questions use direct, learner-facing wording', () => {
  const conceptualQuestions = generatedQuestions.filter((item) => !item.calculationExpression);
  const removedFrames = /^(?:自测题：)?(?:仔细观察题目给出的信息：|先找出题目中的关键条件：|根据题目条件作出判断：|回到题意核对判断：|用算式记录数量关系：|把已知量写成数学式：|先看清算式中的每个量：|用逆运算检查这个关系：)/;

  assert.ok(conceptualQuestions.length > 0);
  conceptualQuestions.forEach((item) => {
    assert.doesNotMatch(item.prompt, removedFrames, item.id);
    if (item.type === 'problem') {
      assert.doesNotMatch(item.prompt, /请写出计算过程|请列式/, item.id);
    }
  });

  ['clock_reading', 'shape_recognition', 'length_compare', 'angle_right'].forEach((key) => {
    const questions = generatedQuestions.filter((item) => (
      item.knowledgePoint === key || item.knowledgePoint.endsWith(`_${key}`)
    ));
    assert.ok(questions.length > 0, key);
    questions.forEach((item) => assert.doesNotMatch(item.prompt, removedFrames, item.id));
  });
});

test('generated prompts never expose variation serials or generic study shells', () => {
  const variationSerial = /\u7b2c[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\d]+\u4e2a\u53d8\u5f0f/;
  const genericStudyShell = /^(?:\u8bf7\u5148\u8bfb\u9898|\u8ba4\u771f\u89c2\u5bdf\u9898\u76ee|\u60f3\u6e05\u6761\u4ef6\u540e\u4f5c\u7b54|\u5728\u8fd9\u9053\u7ec3\u4e60\u4e2d|\u52a8\u7b14\u524d\u5148\u68c0\u67e5\u6761\u4ef6|\u8bd5\u7740\u72ec\u7acb\u5b8c\u6210|\u628a\u9898\u76ee\u4e2d\u7684\u6570\u91cf\u8bfb\u6e05\u695a|\u5148\u627e\u51fa\u5df2\u77e5\u6761\u4ef6|\u8bfb\u5b8c\u9898\u76ee\u540e\u60f3\u4e00\u60f3|\u8bf7\u6839\u636e\u9898\u76ee\u7ed9\u51fa\u7684\u4fe1\u606f|\u522b\u6f0f\u770b\u5355\u4f4d|\u628a\u6761\u4ef6\u548c\u95ee\u9898\u5bf9\u5e94\u8d77\u6765|\u7528\u5408\u9002\u7684\u65b9\u6cd5\u89e3\u51b3|\u770b\u6e05\u9898\u610f\u540e\u518d\u8ba1\u7b97|\u8fd9\u662f\u4e00\u9053\u5c0f\u7ec3\u4e60|\u8bf7\u628a\u8fd9\u9053\u9898\u5b8c\u6574\u505a\u51fa\u6765|\u5148\u5708\u51fa\u5173\u952e\u6570\u5b57|\u8ba4\u771f\u60f3\u4e00\u60f3\u518d\u56de\u7b54|\u4ece\u9898\u76ee\u6761\u4ef6\u51fa\u53d1|\u6309\u7167\u9898\u610f\u5b8c\u6210\u8ba1\u7b97|\u8bd5\u7740\u8bf4\u4e00\u8bf4\u4f60\u7684\u5224\u65ad|\u8bf7\u68c0\u67e5\u7ed3\u679c\u662f\u5426\u5408\u7406|\u4e00\u6b65\u4e00\u6b65\u5b8c\u6210|\u628a\u7b54\u6848\u5199\u5728\u62ec\u53f7\u91cc)/;

  generatedQuestions.forEach((item) => {
    assert.doesNotMatch(item.prompt, variationSerial, item.id);
    assert.doesNotMatch(item.prompt, genericStudyShell, item.id);
  });
});

test('generated prompts do not expose generic instruction wrappers', () => {
  const wrappers = /^(?:根据题意，|检查单位后，|这道题要算的是)/;
  const offenders = generatedQuestions
    .filter((item) => wrappers.test(item.prompt))
    .map((item) => item.id);
  assert.deepEqual(offenders, []);
});

test('generated primary prompts never use a quantity-relation wrapper for every topic', () => {
  const offenders = generatedQuestions
    .filter((item) => item.prompt.includes('请根据数量关系求'))
    .map((item) => item.id);

  assert.deepEqual(offenders, []);
});

test('generated clock, time, and fraction choices always have four meaningful answers', () => {
  const targetKinds = new Set(['clock_reading', 'time_duration', 'fraction_add', 'fraction_multiply', 'fraction_divide']);
  const choices = generatedQuestions.filter((item) => targetKinds.has(item.knowledgePoint) && item.type === 'choice');

  assert.ok(choices.length > 0);
  choices.forEach((item) => {
    assert.equal(item.options.length, 4, item.id);
    assert.equal(new Set(item.options).size, 4, item.id);
    item.options.forEach((option) => {
      assert.doesNotMatch(String(option), /其他结果|错误值/, item.id);
    });
  });
});

test('generated guidance follows the topic instead of a profile-wide relation shell', () => {
  generatedQuestions.forEach((item) => {
    assert.doesNotMatch(item.hint, /先判断属于/, item.id);
    assert.doesNotMatch(item.knowledgeSummary, /数量或图形关系/, item.id);
    assert.doesNotMatch(item.mistakeSummary.join(' '), /条件顺序看反/, item.id);
    assert.notEqual(item.solution.steps[0], `先整理“${item.knowledgePoint}”中的已知条件。`, item.id);
  });

  topicQuestions(1, 'clock_reading').forEach((item) => assert.match(item.hint, /分针|时针/, item.id));
  topicQuestions(2, 'time_duration').forEach((item) => assert.match(item.hint, /开始时刻|分钟|时间线/, item.id));
  topicQuestions(2, 'number_within_10000').forEach((item) => assert.match(item.hint, /右往左|百位|数位/, item.id));
  topicQuestions(3, 'area_rectangle_g3').forEach((item) => assert.match(item.hint, /长.*宽|面积/, item.id));
  topicQuestions(5, 'fraction_add').forEach((item) => assert.match(item.hint, /分母|分数/, item.id));
});

test('generated textbook scopes use a distinct learner-visible number stream', () => {
  const scope = (textbookId, grade, knowledgePoint) => generatedQuestions
    .filter((item) => item.textbookId === textbookId
      && item.grade === grade
      && item.knowledgePoint === knowledgePoint);
  const rjb = scope('rjb', 2, 'multiplication_table');
  const bsd = scope('bsd', 2, 'multiplication_table');

  assert.ok(rjb.length > 0);
  assert.ok(bsd.length > 0);
  assert.notDeepEqual(
    rjb.map((item) => item.calculationExpression).sort(),
    bsd.map((item) => item.calculationExpression).sort(),
  );
});

test('generated lower-primary numeric contexts stay inside their grade scope', () => {
  const numericTokens = (item) => (item.prompt.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  const assertMaximum = (items, maximum, label) => {
    assert.ok(items.length > 0, label);
    items.forEach((item) => {
      const values = [...numericTokens(item), Number(item.answer)].filter(Number.isFinite);
      assert.ok(values.every((value) => value <= maximum), `${item.id} exceeds ${maximum}`);
    });
  };

  assertMaximum(topicQuestions(1, 'add_within_20'), 20, 'grade-one addition within 20');
  assertMaximum(topicQuestions(1, 'subtract_within_20'), 20, 'grade-one subtraction within 20');
  assertMaximum(topicQuestions(1, 'add_within_100'), 100, 'grade-one tens arithmetic within 100');
  assertMaximum(topicQuestions(1, 'pattern_addition'), 100, 'grade-one number patterns within 100');
  assertMaximum(topicQuestions(2, 'add_subtract_100'), 100, 'grade-two addition and subtraction within 100');
  assertMaximum(topicQuestions(2, 'data_compare'), 100, 'grade-two data values within 100');
  assertMaximum(topicQuestions(3, 'average_g3'), 100, 'grade-three average values within 100');
});

test('generated decimal, average, and percentage questions stay inside realistic grade ranges', () => {
  const numericTokens = (item) => [
    ...(item.prompt.match(/-?\d+(?:\.\d+)?/g) || []).map(Number),
    ...(String(item.calculationExpression || '').match(/-?\d+(?:\.\d+)?/g) || []).map(Number),
    Number(item.answer),
  ].filter(Number.isFinite);
  const assertMaximum = (grade, key, maximum, label) => {
    const items = topicQuestions(grade, key);
    assert.ok(items.length > 0, label);
    items.forEach((item) => {
      assert.ok(
        numericTokens(item).every((value) => Math.abs(value) <= maximum),
        `${item.id} exceeds ${maximum}: ${item.prompt}`,
      );
    });
  };

  assertMaximum(3, 'decimal_tenths', 100, 'grade-three decimal questions');
  assertMaximum(4, 'average', 1000, 'grade-four average questions');
  assertMaximum(5, 'average_g5', 1000, 'grade-five average questions');
  assertMaximum(6, 'percent', 1000, 'grade-six percentage questions');
});

test('generated prompts do not expose diagnostic wrappers or duplicated punctuation', () => {
  const wrapper = /^(?:第\s*\d+\s*题[:：]?|自测题：|(?:基础|进阶|挑战)第\d+组[:：])/;
  generatedQuestions.forEach((item) => {
    assert.doesNotMatch(item.prompt, wrapper, item.id);
    assert.doesNotMatch(item.prompt, /[。！？?!][ \t]+[请写]/, item.id);
    assert.doesNotMatch(item.prompt, /。。|！！|？？/, item.id);
  });
});

test('generated estimation questions use their true nearest value and avoid low quotients', () => {
  const divisionEstimates = topicQuestions(4, 'division_estimation');
  const multiplyEstimates = topicQuestions(4, 'multiply_estimation');

  assert.ok(divisionEstimates.length > 0);
  assert.ok(multiplyEstimates.length > 0);

  divisionEstimates.forEach((item) => {
    const match = item.prompt.match(/(\d+)\s*÷\s*(\d+).*最接近/);
    assert.ok(match, item.id);
    const quotient = Number(match[1]) / Number(match[2]);
    assert.ok(quotient >= 10, item.id);
    assert.equal(Number(item.answer), Math.round(quotient / 10) * 10, item.id);
    assert.equal(item.examPattern, 'estimate_check', item.id);
    assert.match(item.prompt, /整十数/, item.id);
  });

  multiplyEstimates.forEach((item) => {
    const match = item.prompt.match(/(\d+)\s*×\s*(\d+).*最接近/);
    assert.ok(match, item.id);
    const product = Number(match[1]) * Number(match[2]);
    assert.equal(Number(item.answer), Math.round(product / 100) * 100, item.id);
    assert.equal(item.examPattern, 'estimate_check', item.id);
    assert.match(item.prompt, /整百数/, item.id);
  });
});

test('generated estimation questions state the rounding target and explain the shown answer', () => {
  generatedQuestions
    .filter((item) => item.examPattern === 'estimate_check')
    .forEach((item) => {
      assert.match(item.prompt, /整十数|整百数/, item.id);
      const explanation = [item.solution?.summary, ...(item.solution?.steps || [])].join(' ');
      const answerPattern = String(item.answer).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      assert.match(explanation, new RegExp(answerPattern), item.id);
    });
});

test('grade-four division estimates never present a rounded quotient as an exact equality', () => {
  const items = topicQuestions(4, 'division_estimation');
  assert.ok(items.length > 0);
  for (const item of items) {
    const explanation = [item.solution.summary, ...item.solution.steps].join(' ');
    const equalities = [...explanation.matchAll(/(\d+)\s*([×÷])\s*(\d+)\s*=\s*(\d+(?:\.\d+)?)/g)];
    assert.ok(equalities.length > 0, item.id);
    for (const [, left, operator, right, result] of equalities) {
      const expected = operator === '×' ? Number(left) * Number(right) : Number(left) / Number(right);
      assert.ok(Math.abs(expected - Number(result)) < 1e-10, `${item.id}: ${left}${operator}${right}=${result}`);
    }
  }
});

test('grade-four product rounding explains the actual product before choosing its nearest hundred', () => {
  const items = topicQuestions(4, 'multiply_estimation');
  assert.ok(items.length > 0);
  for (const item of items) {
    const [, left, right] = item.prompt.match(/(\d+)\s*×\s*(\d+)/);
    const product = Number(left) * Number(right);
    const explanation = [item.solution.summary, ...item.solution.steps].join(' ').replace(/\s/g, '');
    assert.ok(explanation.includes(`${left}×${right}=${product}`), item.id);
    assert.equal(Number(item.answer), Math.round(product / 100) * 100, item.id);
  }
});

test('halfway grade-four estimates state how to choose between equally near multiples', () => {
  const items = [
    ...topicQuestions(4, 'division_estimation'),
    ...topicQuestions(4, 'multiply_estimation'),
  ];
  let checked = 0;
  for (const item of items) {
    const division = item.knowledgePoint === 'division_estimation';
    const [left, right] = item.calculationExpression.split(/[×÷]/).map(Number);
    const value = division ? left / right : left * right;
    const step = division ? 10 : 100;
    if (value % step !== step / 2) continue;
    checked += 1;
    assert.match(item.prompt, /四舍五入.*较大/, item.id);
    assert.equal(Number(item.answer), Math.ceil(value / step) * step, item.id);
  }
  assert.ok(checked > 0, 'Published variants should exercise the halfway case');
});

test('generated cube observations specify the row direction and rule out stacking', () => {
  const items = topicQuestions(4, 'view_from_direction');
  assert.ok(items.length > 0);
  for (const item of items) {
    assert.match(item.prompt, /从左到右/, item.id);
    assert.match(item.prompt, /不叠放/, item.id);
    assert.doesNotMatch(item.prompt, /首尾排成/, item.id);
    const [, count] = item.prompt.match(/(\d+)\s*个同样的小正方体/);
    assert.equal(Number(item.answer), Number(count), item.id);
  }
});

test('generated learner-facing prompts do not stack generic instructions or leave a missing target', () => {
  const duplicatedInstruction = /请(?:画一画或列一列|直接填写)：[\s\S]*(?:请写出想法|请填在横线上)。/;
  const missingProportionTarget = /解比例：[^\n]+，x 。/;
  const genericPlaceValueRequest = /请根据数量关系求\d+ 中百位上的数字/;

  generatedQuestions.forEach((item) => {
    assert.doesNotMatch(item.prompt, duplicatedInstruction, item.id);
    assert.doesNotMatch(item.prompt, missingProportionTarget, item.id);
    assert.doesNotMatch(item.prompt, genericPlaceValueRequest, item.id);
  });
});

test('generated primary number sizes remain readable for the selected grade', () => {
  const overlyLargeNegative = generatedQuestions
    .filter((item) => item.knowledgePoint === 'negative_number' && /-\d{4,}/.test(item.prompt))
    .map((item) => item.id);

  assert.deepEqual(overlyLargeNegative, []);
});

test('generated practice questions have no repeated core prompt within a curriculum pool', () => {
  const groups = new Map();
  buildEditionPracticeQuestions().forEach((item) => {
    const key = [
      item.textbookId,
      item.grade,
      item.knowledgePoint,
      item.type,
      item.difficulty,
      corePrompt(item),
    ].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item.id);
  });

  const duplicates = [...groups.values()].filter((ids) => ids.length > 1);
  assert.deepEqual(duplicates, []);
});

test('each generated bank keeps mathematical conditions unique within a textbook grade', () => {
  [
    ['diagnostic', buildEditionDiagnosticQuestions()],
    ['practice', buildEditionPracticeQuestions()],
  ].forEach(([bank, questions]) => {
    const groups = new Map();
    questions.forEach((item) => {
      const key = [
        item.textbookId,
        item.grade,
        item.mathSignature,
      ].join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item.id);
    });

    const duplicates = [...groups.values()].filter((ids) => ids.length > 1);
    assert.deepEqual(duplicates, [], `${bank} bank repeats a mathematical condition`);
  });
});

test('generated banks keep mathematical conditions unique across editions in each grade', () => {
  [
    ['diagnostic', buildEditionDiagnosticQuestions()],
    ['practice', buildEditionPracticeQuestions()],
  ].forEach(([bank, questions]) => {
    const groups = new Map();
    questions.forEach((item) => {
      const key = [item.grade, item.mathSignature].join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item.id);
    });

    const duplicates = [...groups.values()].filter((ids) => ids.length > 1);
    assert.equal(duplicates.length, 0, `${bank} bank repeats a mathematical condition across editions`);
  });
});

test('generated practice questions do not reuse diagnostic mathematical conditions', () => {
  const diagnosticKeys = new Set(buildEditionDiagnosticQuestions().map((item) => [
    item.textbookId,
    item.grade,
    item.mathSignature,
  ].join('|')));
  const collisions = buildEditionPracticeQuestions()
    .filter((item) => diagnosticKeys.has([
      item.textbookId,
      item.grade,
      item.mathSignature,
    ].join('|')))
    .map((item) => item.id);

  assert.deepEqual(collisions, []);
});

test('factor and ratio generators assign a distinct numeric condition to every textbook bank slot', () => {
  const questions = [
    ...buildEditionDiagnosticQuestions(),
    ...buildEditionPracticeQuestions(),
  ].filter((item) => ['factor_multiple', 'ratio'].includes(item.knowledgePoint));
  const conditions = new Map();

  questions.forEach((item) => {
    const numbers = [...item.prompt.matchAll(/\d+/g)].map((match) => match[0]);
    const key = [item.grade, item.knowledgePoint, ...numbers].join('|');
    if (!conditions.has(key)) conditions.set(key, []);
    conditions.get(key).push(item.id);
  });

  const duplicates = [...conditions.values()].filter((ids) => ids.length > 1);
  assert.deepEqual(duplicates, []);
});

const { textbookOptions, getLearningMap } = require('./textbook-catalog');
const { getEditionGradeProfile } = require('./textbook-edition-profiles');
const { getCurriculumScope } = require('./textbook-curriculum');

const TYPES = ['choice', 'fill', 'problem'];
const PRACTICE_PER_DIFFICULTY = 24;
const PRACTICE_PER_TYPE = PRACTICE_PER_DIFFICULTY * 3;
const DIAGNOSTIC_VARIANTS_PER_DIFFICULTY = 3;

const RJB_DIAGNOSTIC_SLOTS = {
  1: ['g1_add_within_20', 'g1_subtract_within_20', 'g1_add_within_100', 'g1_money_count', 'g1_clock_reading', 'g1_shape_recognition', 'g1_length_compare', 'g1_pattern_addition'],
  2: ['g2_add_subtract_100', 'g2_multiplication_table', 'g2_division_table', 'g2_number_within_10000', 'g2_length_unit', 'g2_time_duration', 'g2_angle_right', 'g2_data_compare'],
  3: ['g3_multiply_two_digit', 'g3_division_remainder', 'g3_fraction_compare', 'g3_rectangle_perimeter_g3', 'g3_mass_convert', 'g3_area_rectangle_g3', 'g3_decimal_tenths', 'g3_average_g3'],
  4: ['division_estimate', 'multiplication_estimate', 'visual_geometry', 'number_pattern', 'exact_division', 'average', 'two_step_problem', 'decimal_money_problem'],
  5: ['g5_decimal_multiply', 'g5_decimal_divide', 'g5_factor_multiple', 'g5_fraction_add', 'g5_area_rectangle_g5', 'g5_volume_cuboid', 'g5_unit_conversion_g5', 'g5_average_g5'],
  6: ['g6_fraction_multiply', 'g6_fraction_divide', 'g6_ratio', 'g6_percent', 'g6_circle', 'g6_proportion', 'g6_negative_number', 'g6_volume_cone'],
};

const GRADE_TOPICS = {
  1: [
    { key: 'add_within_20', label: '20以内加法', kind: 'add', ability: 'calculation' },
    { key: 'subtract_within_20', label: '20以内减法', kind: 'subtract', ability: 'calculation' },
    { key: 'add_within_100', label: '整十数加减', kind: 'tens', ability: 'calculation' },
    { key: 'money_count', label: '认识人民币', kind: 'moneyWhole', ability: 'problem' },
    { key: 'clock_reading', label: '认识钟表', kind: 'clockRead', ability: 'data' },
    { key: 'shape_recognition', label: '认识图形', kind: 'shape', ability: 'geometry' },
    { key: 'length_compare', label: '比较长短', kind: 'lengthCompare', ability: 'data' },
    { key: 'pattern_addition', label: '找数的规律', kind: 'pattern', ability: 'pattern' },
  ],
  2: [
    { key: 'add_subtract_100', label: '100以内加减法', kind: 'addSubtract', ability: 'calculation' },
    { key: 'multiplication_table', label: '表内乘法', kind: 'multiply', ability: 'calculation' },
    { key: 'division_table', label: '表内除法', kind: 'divide', ability: 'calculation' },
    { key: 'number_within_10000', label: '万以内数', kind: 'placeValue', ability: 'data' },
    { key: 'length_unit', label: '长度单位', kind: 'lengthUnit', ability: 'problem' },
    { key: 'time_duration', label: '时间计算', kind: 'time', ability: 'problem' },
    { key: 'angle_right', label: '直角认识', kind: 'rightAngle', ability: 'geometry' },
    { key: 'data_compare', label: '数据整理', kind: 'dataRange', ability: 'pattern' },
  ],
  3: [
    { key: 'multiply_two_digit', label: '两位数乘法', kind: 'multiply', ability: 'calculation' },
    { key: 'division_remainder', label: '有余数除法', kind: 'remainder', ability: 'calculation' },
    { key: 'fraction_compare', label: '分数初步', kind: 'fractionCompare', ability: 'data' },
    { key: 'rectangle_perimeter_g3', label: '长方形周长', kind: 'perimeter', ability: 'geometry' },
    { key: 'mass_convert', label: '质量单位', kind: 'massUnit', ability: 'problem' },
    { key: 'area_rectangle_g3', label: '长方形面积', kind: 'area', ability: 'geometry' },
    { key: 'decimal_tenths', label: '小数初步', kind: 'decimal', ability: 'calculation' },
    { key: 'average_g3', label: '数据规律', kind: 'average', ability: 'pattern' },
  ],
  4: [
    { key: 'division_estimation', label: '除法估算', kind: 'divisionEstimate', ability: 'calculation' },
    { key: 'multiply_estimation', label: '乘法估算', kind: 'multiplyEstimate', ability: 'calculation' },
    { key: 'view_from_direction', label: '观察物体', kind: 'visual', ability: 'geometry' },
    { key: 'number_pattern', label: '规律推理', kind: 'pattern', ability: 'pattern' },
    { key: 'division_exact', label: '两位数除法', kind: 'twoDigitDivision', ability: 'calculation' },
    { key: 'average', label: '平均数', kind: 'average', ability: 'data' },
    { key: 'two_step_division_problem', label: '两步应用题', kind: 'multiStep', ability: 'problem' },
    { key: 'decimal_money_problem', label: '小数生活应用', kind: 'money', ability: 'problem' },
  ],
  5: [
    { key: 'decimal_multiply', label: '小数乘法', kind: 'decimalMultiply', ability: 'calculation' },
    { key: 'decimal_divide', label: '小数除法', kind: 'decimalDivide', ability: 'calculation' },
    { key: 'factor_multiple', label: '因数与倍数', kind: 'factor', ability: 'data' },
    { key: 'fraction_add', label: '分数加减法', kind: 'fractionAdd', ability: 'calculation' },
    { key: 'area_rectangle_g5', label: '多边形面积', kind: 'area', ability: 'geometry' },
    { key: 'volume_cuboid', label: '长方体体积', kind: 'volume', ability: 'geometry' },
    { key: 'unit_conversion_g5', label: '单位换算', kind: 'lengthUnit', ability: 'problem' },
    { key: 'average_g5', label: '统计与平均数', kind: 'average', ability: 'pattern' },
  ],
  6: [
    { key: 'fraction_multiply', label: '分数乘法', kind: 'fractionMultiply', ability: 'calculation' },
    { key: 'fraction_divide', label: '分数除法', kind: 'fractionDivide', ability: 'calculation' },
    { key: 'ratio', label: '比的应用', kind: 'ratio', ability: 'problem' },
    { key: 'percent', label: '百分数', kind: 'percent', ability: 'data' },
    { key: 'circle', label: '圆的周长', kind: 'circle', ability: 'geometry' },
    { key: 'proportion', label: '比例关系', kind: 'proportionEquation', ability: 'problem' },
    { key: 'negative_number', label: '负数', kind: 'negative', ability: 'pattern' },
    { key: 'volume_cone', label: '圆锥体积', kind: 'coneVolume', ability: 'geometry' },
  ],
};

function gcd(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function fraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  return reducedDenominator === 1 ? String(reducedNumerator) : `${reducedNumerator}/${reducedDenominator}`;
}

function decimal(value) {
  return Number(Number(value).toFixed(2)).toString();
}

function rotate(items, offset) {
  if (!items.length) return items;
  const start = Math.abs(offset) % items.length;
  return items.slice(start).concat(items.slice(0, start));
}

function numericOptions(answer, difficulty) {
  const value = Number(answer);
  if (!Number.isFinite(value)) return [];
  const hasDecimal = String(answer).includes('.');
  const step = hasDecimal ? (difficulty === 3 ? 0.5 : 0.1) : Math.max(1, difficulty);
  return [value - step, value, value + step, value + step * 2].map(decimal);
}

function estimateOptions(answer, step) {
  const value = Number(answer);
  const interval = Number(step);
  if (!Number.isFinite(value) || !Number.isFinite(interval) || interval <= 0) return [];
  // Keep distractors at least one whole rounding interval away, so the keyed estimate is unambiguous.
  return [Math.max(0, value - interval * 2), value, value + interval * 2, value + interval * 4].map(decimal);
}

function fractionOptions(answer) {
  const match = String(answer).match(/^(-?\d+)\/(\d+)$/);
  if (!match) return [];
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  return [
    answer,
    fraction(Math.max(1, numerator - 1), denominator),
    fraction(numerator + 1, denominator),
    `${numerator}/${denominator + 1}`,
  ];
}

function clockChoiceOptions(answer) {
  const match = String(answer).match(/^(\d{1,2})时$/);
  if (!match) return [];
  const hour = Number(match[1]);
  const normalizeHour = (value) => ((value - 1 + 120) % 12) + 1;
  return [hour, normalizeHour(hour - 1), normalizeHour(hour + 1), normalizeHour(hour + 2)]
    .map((value) => `${value}时`);
}

function timeChoiceOptions(answer) {
  const match = String(answer).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return [];
  const start = Number(match[1]) * 60 + Number(match[2]);
  return [-30, 20, 40, 60].map((offset) => {
    const total = start + offset;
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  });
}

function fractionChoiceOptions(model) {
  const match = String(model.question || '').match(/(\d+)\/(\d+)\s*([+×÷])\s*(\d+)\/(\d+)/);
  if (!match) return [];
  const [, leftNumeratorText, leftDenominatorText, operator, rightNumeratorText, rightDenominatorText] = match;
  const leftNumerator = Number(leftNumeratorText);
  const leftDenominator = Number(leftDenominatorText);
  const rightNumerator = Number(rightNumeratorText);
  const rightDenominator = Number(rightDenominatorText);
  if (operator === '+') {
    return [
      fraction(leftNumerator + rightNumerator, leftDenominator),
      fraction(Math.max(1, Math.abs(leftNumerator - rightNumerator)), leftDenominator),
      fraction(leftNumerator + rightNumerator, leftDenominator + 1),
      fraction(leftNumerator * rightNumerator, leftDenominator),
    ];
  }
  if (operator === '×') {
    return [
      fraction(leftNumerator * rightNumerator, leftDenominator * rightDenominator),
      fraction(leftNumerator + rightNumerator, leftDenominator * rightDenominator),
      fraction(leftNumerator * rightNumerator, leftDenominator + rightDenominator),
      fraction(leftNumerator * rightNumerator, leftDenominator),
    ];
  }
  return [
    fraction(leftNumerator * rightDenominator, leftDenominator * rightNumerator),
    fraction(leftNumerator * rightNumerator, leftDenominator * rightDenominator),
    fraction(leftNumerator * rightDenominator, leftDenominator),
    fraction(leftNumerator, leftDenominator * rightNumerator),
  ];
}

function meaningfulChoiceOptions(model, difficulty) {
  if (model.kind === 'clockRead') return clockChoiceOptions(model.answer);
  if (model.kind === 'time') return timeChoiceOptions(model.answer);
  if (['fractionAdd', 'fractionMultiply', 'fractionDivide'].includes(model.kind)) return fractionChoiceOptions(model);
  if (model.options) return [...model.options];
  return estimateOptions(model.answer, model.estimateOptionStep).length
    ? estimateOptions(model.answer, model.estimateOptionStep)
    : numericOptions(model.answer, difficulty).length
      ? numericOptions(model.answer, difficulty)
      : fractionOptions(model.answer);
}

function buildOptions(model, difficulty, seed) {
  let options = meaningfulChoiceOptions(model, difficulty);
  if (!options.length) options = [String(model.answer), '无法确定', '条件不足', '以上都不对'];
  options = [...new Set([String(model.answer), ...options.map(String)])];
  if (options.length < 4) {
    const fallback = [
      '以上都不对',
      '条件不足',
      '无法确定',
      '都不符合',
    ];
    fallback.forEach((option) => {
      if (options.length < 4 && !options.includes(option)) options.push(option);
    });
  }
  return rotate(options.slice(0, 4), seed);
}

function parseSimpleNumericExpression(expression) {
  const match = String(expression || '').match(/^(-?\d+(?:\.\d+)?)\s*([+\-×÷])\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { left: Number(match[1]), operator: match[2], right: Number(match[3]) };
}

function defaultExamPattern(kind) {
  if (['divisionEstimate', 'multiplyEstimate'].includes(kind)) return 'estimate_check';
  if (['lengthUnit', 'massUnit', 'money', 'moneyWhole', 'time', 'clockRead', 'lengthCompare', 'circle'].includes(kind)) return 'unit_check';
  if (['average', 'dataRange'].includes(kind)) return 'data_reading';
  if (['multiStep', 'volume', 'coneVolume', 'ratio', 'proportion', 'proportionEquation'].includes(kind)) return 'combination_strategy';
  if (['shape', 'visual', 'compare', 'pattern', 'angle', 'rightAngle', 'factor', 'negative', 'fractionCompare'].includes(kind)) return 'condition_filter';
  return 'calculation_model';
}

function createReverseReasoningModel(model, expression) {
  const { left, operator, right } = expression;
  const answer = String(left);
  return {
    ...model,
    question: `已知 □ ${operator} ${right} = ${model.answer}，□ 里应该填多少？`,
    expression: `□ ${operator} ${right} = ${model.answer}`,
    answer,
    reason: `把 ${answer} 代入检验：${answer} ${operator} ${right} = ${model.answer}，所以 □ 里填 ${answer}。`,
    options: [],
    examPattern: 'reverse_reasoning',
  };
}

function isExactExpressionAnswer(expression, answer) {
  const value = Number(answer);
  if (!Number.isFinite(value)) return false;
  let calculated;
  if (expression.operator === '+') calculated = expression.left + expression.right;
  if (expression.operator === '-') calculated = expression.left - expression.right;
  if (expression.operator === '×') calculated = expression.left * expression.right;
  if (expression.operator === '÷' && expression.right !== 0) calculated = expression.left / expression.right;
  return Number.isFinite(calculated) && Math.abs(calculated - value) < 1e-9;
}

function createEstimateCheckModel(model) {
  const value = Number(model.answer);
  if (!Number.isFinite(value) || Math.abs(value) < 10) return null;
  const step = Math.abs(value) >= 100 ? 100 : 10;
  const answer = String(Math.round(value / step) * step);
  const roundingTarget = step === 100 ? '整百数' : '整十数';
  return {
    ...model,
    question: `先估一估：${model.expression} 的结果最接近多少（${roundingTarget}）？`,
    answer,
    reason: `${String(model.reason || '').replace(/[。！？]+$/g, '')}。先按${roundingTarget}估算，结果最接近 ${answer}。`,
    roundingTarget,
    estimateOptionStep: step,
    examPattern: 'estimate_check',
  };
}

function createThinkingForm(model, topic, difficulty, serial, grade) {
  if (Number(grade) <= 2) {
    return { ...model, examPattern: defaultExamPattern(topic.kind) };
  }
  const expression = parseSimpleNumericExpression(model.expression);
  const selector = Math.abs(serial + difficulty * 7) % 3;
  const reversibleKinds = ['add', 'addSubtract', 'subtract', 'tens', 'multiply', 'divide', 'twoDigitDivision', 'decimal', 'decimalMultiply', 'decimalDivide'];
  const supportsExactReverseReasoning = reversibleKinds.includes(topic.kind);
  if (expression && selector !== 0 && supportsExactReverseReasoning && isExactExpressionAnswer(expression, model.answer)) {
    return createReverseReasoningModel(model, expression);
  }
  if (expression && selector === 0 && reversibleKinds.includes(topic.kind)) {
    const estimate = createEstimateCheckModel(model);
    if (estimate) return estimate;
  }
  return { ...model, examPattern: defaultExamPattern(topic.kind) };
}

function addQuestionRepresentation(model) {
  return { ...model, question: String(model.question || '').replace(/^第\s*\d+\s*题[:：]?\s*/, '') };
}

function surfacePromptVariant(prompt, kind, variant, options = {}) {
  const source = String(prompt || '').replace(/\s+/g, ' ').trim();
  const index = Math.max(0, Number(variant) || 0);
  const type = String(options.type || '');
  const editionIndex = Math.max(0, Number(options.editionIndex) || 0);
  if (!source || index === 0) return source;
  const arithmetic = source.match(/^(.+?)\s*等于多少？$/);
  if (arithmetic) {
    const forms = [
      `计算 ${arithmetic[1]}。`,
      `${arithmetic[1]} 的结果是多少？`,
      `请算一算：${arithmetic[1]}。`,
      `把算式 ${arithmetic[1]} 算出来。`,
      `看清算式后计算：${arithmetic[1]}。`,
      `完成计算：${arithmetic[1]}。`,
      `口算 ${arithmetic[1]}。`,
      `用竖式或口算求出 ${arithmetic[1]} 的结果。`,
      `想一想，${arithmetic[1]} 的得数是多少？`,
      `请写出 ${arithmetic[1]} 的得数。`,
      `把 ${arithmetic[1]} 算对，并写出结果。`,
      `小试身手：${arithmetic[1]}。`,
    ];
    return forms[(index - 1) % forms.length];
  }
  const nextNumber = source.match(/^找规律：(.+)，下一个数是多少？$/);
  if (nextNumber) {
    const forms = [
      `观察数列 ${nextNumber[1]}，请写出下一项。`,
      `数列为 ${nextNumber[1]}，下一项是多少？`,
      `按照 ${nextNumber[1]} 的规律，接下来应填什么数？`,
      `找出数列 ${nextNumber[1]} 的规律，写出下一项。`,
      `数一数：${nextNumber[1]}。按规律补出下一个数。`,
      `先找相邻两项的变化，再补全：${nextNumber[1]}。`,
      `这列数是这样排列的：${nextNumber[1]}，请接着写。`,
      `按同样的规律继续写，${nextNumber[1]} 后面是什么？`,
      `动脑找规律：${nextNumber[1]}，下一项应为多少？`,
      `把数列 ${nextNumber[1]} 再延续一项。`,
      `观察每一步的变化：${nextNumber[1]}，下一项填什么？`,
      `请根据数列 ${nextNumber[1]} 的规律作答。`,
    ];
    return forms[(index - 1) % forms.length];
  }
  if (source.includes('解比例：') && /，x\s*。$/.test(source)) {
    return source.replace(/，x\s*。$/, '，x 是多少？');
  }
  const resultQuestion = source.match(/^(.+?)是多少？$/);
  if (resultQuestion) {
    const forms = [
      `${resultQuestion[1]}是多少？`,
      `请算出${resultQuestion[1]}。`,
      `求${resultQuestion[1]}。`,
      `请回答：${resultQuestion[1]}是多少？`,
      `先列出算式，${resultQuestion[1]}是多少？`,
      `计算并写出${resultQuestion[1]}。`,
      `想一想：${resultQuestion[1]}是多少？`,
      `请先列式，再求${resultQuestion[1]}。`,
      `把${resultQuestion[1]}算出来。`,
      `完成计算：${resultQuestion[1]}。`,
      `根据题目给出的信息，${resultQuestion[1]}是多少？`,
      `读完数据后，${resultQuestion[1]}是多少？`,
    ];
    return forms[(index - 1) % forms.length];
  }
  const choiceQuestion = source.match(/^(.+?)是什么？$/);
  if (choiceQuestion) {
    const forms = [
      `${choiceQuestion[1]}是什么？`,
      `请判断${choiceQuestion[1]}。`,
      `想一想：${choiceQuestion[1]}属于哪一类？`,
      `判断${choiceQuestion[1]}应选什么。`,
      `观察条件后判断：${choiceQuestion[1]}。`,
      `请选择${choiceQuestion[1]}的正确答案。`,
      `读题并作出判断：${choiceQuestion[1]}。`,
      `哪一个选项符合条件？${choiceQuestion[1]}`,
    ];
    return forms[(index - 1) % forms.length];
  }
  const activity = naturalPromptActivity(kind, index + editionIndex * 3, type);
  return activity ? `${activity}${source}` : source;
}

function naturalPromptActivity(kind, index, type) {
  const activities = {
    moneyWhole: ['数一数这些纸币，', '把两张纸币的金额合在一起，', '先分别看清两张纸币的金额，'],
    clockRead: ['观察钟面，', '看清时针和分针，', '根据钟面读一读，'],
    time: ['画一条时间线，', '把开始时刻和经过的时间写下来，', '按时间顺序想一想，'],
    shape: ['把图形的边和角数一数，', '观察图形的样子，', '根据图形的特征判断，'],
    visual: ['想一想从正面能看到的面，', '把小正方体的正面数一数，', '按从正面观察的结果判断，'],
    lengthCompare: ['把两个长度比一比，', '看清两个长度的数据，', '用大于号或小于号想一想，'],
    rightAngle: ['把它和直角比一比，', '根据 90° 判断，', '看清角的度数，'],
    dataRange: ['找出最大数和最小数，', '把这组数据从小到大看一看，', '先圈出两端的数据，'],
    fractionCompare: ['把分子相同的分数比一比，', '观察分子和分母，', '想一想同分母分数怎样比较，'],
    factor: ['用除法检验一下，', '想一想能不能整除，', '把乘法关系写一写，'],
    ratio: ['把前项和后项同时化简，', '找出前项和后项的最大公因数，', '先约一约这个比，'],
    negative: ['在数轴上想一想位置，', '比较谁离 0 更近，', '看清两个负数的大小，'],
  };
  const forms = activities[kind];
  return forms ? forms[(Math.max(1, index) - 1) % forms.length] : '';
}

function topicGuidance(topic, model, grade, textbook) {
  const focusedGuidance = {
    clockRead: {
      hint: '先看分针是否指向 12，再看时针指向几。',
      knowledge: '整时的分针指向 12，时针指向几就是几时。',
      mistake: '容易把长针和短针看反，先确认分针的位置。',
      firstStep: '先看分针是否指向 12。',
    },
    time: {
      hint: '把开始时刻和经过的分钟数写在时间线上，再往后推。',
      knowledge: '计算结束时刻时，要把开始时刻和经过的分钟数相加。',
      mistake: '分钟满 60 要进到下一时，别只改分钟数。',
      firstStep: '先写出开始时刻和经过的分钟数。',
    },
    placeValue: {
      hint: '从右往左数个位、十位、百位、千位，找到指定数位。',
      knowledge: '四位数从右往左依次是个位、十位、百位、千位。',
      mistake: '容易从左边开始数数位，先从个位开始定位。',
      firstStep: '从右往左标出个位、十位、百位和千位。',
    },
    area: {
      hint: '长方形面积用长乘宽，结果要写平方单位。',
      knowledge: '长方形面积=长×宽，面积单位要用平方单位。',
      mistake: '面积不能写成厘米，要写平方厘米。',
      firstStep: '先写出面积公式：长×宽。',
    },
    volume: {
      hint: '长方体体积用长乘宽乘高，结果要写立方单位。',
      knowledge: '长方体体积=长×宽×高，体积单位要用立方单位。',
      mistake: '体积不能漏乘高，单位要写成立方厘米。',
      firstStep: '先写出体积公式：长×宽×高。',
    },
    fractionAdd: {
      hint: '同分母分数相加减时，分母不变，只算分子。',
      knowledge: '同分母分数加减：分母不变，分子相加减，最后检查能否约分。',
      mistake: '不能把分母也相加，算完要检查能否约分。',
      firstStep: '先确认两个分数的分母相同。',
    },
    fractionMultiply: {
      hint: '分数相乘时分子乘分子、分母乘分母，再约分。',
      knowledge: '分数相乘后要把结果化成最简分数。',
      mistake: '不要把分子和分母交叉相加，结果要约分。',
      firstStep: '先把两个分数的分子相乘、分母相乘。',
    },
    fractionDivide: {
      hint: '除以一个分数，要改成乘这个分数的倒数。',
      knowledge: '分数除法要先把除号后的分数颠倒，再做乘法。',
      mistake: '只把分子或分母颠倒是不对的，要把整个分数取倒数。',
      firstStep: '先把除号后的分数改写成它的倒数。',
    },
  };
  const focused = focusedGuidance[topic.kind];
  if (focused) {
    return {
      hint: focused.hint,
      knowledgeSummary: `${textbook.label}${grade}年级“${topic.label}”：${focused.knowledge}`,
      mistakeSummary: [focused.mistake, '做完后把答案放回题目，检查结果是否合理。'],
      firstStep: focused.firstStep,
    };
  }

  const hasExpression = Boolean(model.expression);
  return {
    hint: hasExpression
      ? `先看清“${topic.label}”中的数和运算符，再按题意计算。`
      : `先找出“${topic.label}”要判断的内容，再根据题目条件作答。`,
    knowledgeSummary: `${textbook.label}${grade}年级“${topic.label}”要读清题目要求，选择对应的方法，并检查答案是否符合题意。`,
    mistakeSummary: [`易漏看“${topic.label}”中的关键信息。`, '做完后把答案放回题目，检查范围、单位和结果是否合理。'],
    firstStep: hasExpression
      ? `先写出题目中的算式：${model.expression}。`
      : `先圈出“${topic.label}”题目中的关键信息。`,
  };
}

function createModel(kind, difficulty, serial, options = {}) {
  const d = Math.max(1, Math.min(3, difficulty));
  const grade = Number(options.grade) || 4;
  const editionIndex = Math.max(0, Number(options.editionIndex) || 0);
  const typeIndex = Math.max(0, Number(options.typeIndex) || 0);
  const topicIndex = Math.max(0, Number(options.topicIndex) || 0);
  const variant = Math.max(0, Number(options.variant) || 0);
  const slotVariant = Math.max(0, Number(options.slotVariant) || 0);
  const bankOffset = options.diagnostic ? 173 : 0;
  // Keep every curriculum scope in a separate deterministic stream. The old
  // 97-value stream caused different difficulty/type slots to fold back onto
  // the same arithmetic condition.
  const rawSerial = Math.abs(Number(serial) || 0);
  const seedInput = rawSerial * 7919
    + editionIndex * 104729
    + grade * 1543
    + d * 313
    + typeIndex * 911
    + topicIndex * 677
    + variant * 1231
    + slotVariant * 1871
    + bankOffset;
  const variantSeed = (seedInput % 1000003) + 1;
  const variationSeed = ((seedInput * 31 + 17) % 1000003) + 1;
  const s = (variantSeed % 997) + 1;
  // Identity may use a large number to keep generated questions separate, but
  // learner-facing values must remain inside the range children see at each
  // grade. Mix the identity into a small, deterministic slot instead of
  // displaying the raw seed in a calculation.
  const boundedSeed = (size, offset = 0) => (
    (variantSeed * 29 + variationSeed * 17 + rawSerial * 13 + offset) % size
  );
  if (kind === 'add' || kind === 'addSubtract') {
    const limit = kind === 'add'
      ? (grade === 1 ? 20 : [10, 20, 30][d - 1])
      : (grade === 2 ? 100 : [100, 300, 1000][d - 1]);
    const left = 2 + ((variantSeed * 7) % Math.max(4, Math.floor(limit * 0.65)));
    const right = 1 + ((variantSeed * 5) % Math.max(3, limit - left));
    return { question: `${left} + ${right} 等于多少？`, expression: `${left} + ${right}`, answer: String(left + right), reason: `${left} + ${right} = ${left + right}` };
  }
  if (kind === 'subtract') {
    const limit = grade === 1 ? 20 : [10, 20, 30][d - 1];
    const right = 1 + ((variantSeed * 3) % Math.max(3, Math.floor(limit / 2)));
    const answer = 1 + ((variantSeed * 5) % Math.max(3, limit - right));
    return { question: `${answer + right} - ${right} 等于多少？`, expression: `${answer + right} - ${right}`, answer: String(answer), reason: `${answer + right} - ${right} = ${answer}` };
  }
  if (kind === 'tens') {
    const leftTens = 3 + ((variantSeed * 5 + d * 3) % 7);
    const rightTens = 1 + ((variantSeed * 7 + Math.floor(variantSeed / 7) + d) % (leftTens - 1));
    const left = leftTens * 10;
    const right = rightTens * 10;
    return { question: `${left} - ${right} 等于多少？`, expression: `${left} - ${right}`, answer: String(left - right), reason: `${left / 10} 个十减 ${right / 10} 个十，还剩 ${(left - right) / 10} 个十。` };
  }
  if (kind === 'multiply' || kind === 'multiplyEstimate') {
    if (kind === 'multiply' && grade === 2) {
      // The table has a finite set of small factors. Allocate its pairs by
      // action type and difficulty so the same edition-grade never repeats a
      // calculation when a learner switches between choice, fill, and problem.
      const pairSlot = typeIndex * 3 + slotVariant;
      const pairIndex = ((pairSlot * 17 + editionIndex * 11 + (options.diagnostic ? 5 : 23)) % 64 + 64) % 64;
      const left = 2 + Math.floor(pairIndex / 8);
      const right = 2 + (pairIndex % 8);
      const answer = left * right;
      return {
        question: `${left} × ${right} 等于多少？`,
        expression: `${left} × ${right}`,
        answer: String(answer),
        reason: `${left} × ${right} = ${answer}`,
      };
    }
    const leftLimit = grade <= 2 ? 8 : grade === 3 ? 48 : grade === 4 ? 180 : 480;
    const left = kind === 'multiplyEstimate'
      ? 96 + ((variantSeed * 7) % 804)
      : 2 + ((variantSeed * 7) % leftLimit);
    const right = 2 + ((variantSeed + d) % (grade <= 2 ? 8 : d === 1 ? 5 : 9));
    const answer = kind === 'multiplyEstimate' ? Math.round((left * right) / 100) * 100 : left * right;
    return {
      question: kind === 'multiplyEstimate' ? `${left} × ${right} 的积最接近多少（整百数）？` : `${left} × ${right} 等于多少？`,
      expression: `${left} × ${right}`,
      answer: String(answer),
      reason: kind === 'multiplyEstimate' ? `把 ${left} 看成接近的整十或整百数，估得 ${answer}。` : `${left} × ${right} = ${answer}`,
      ...(kind === 'multiplyEstimate' ? { estimateOptionStep: 100 } : {}),
    };
  }
  if (kind === 'divide' || kind === 'twoDigitDivision' || kind === 'divisionEstimate') {
    const isDivisionEstimate = kind === 'divisionEstimate';
    const divisor = kind === 'twoDigitDivision'
      ? 12 + ((variantSeed + d) % 78)
      : grade <= 2
        ? 2 + (variationSeed % 8)
        : 2 + ((variantSeed + d) % (d === 1 ? 6 : 11));
    const quotient = isDivisionEstimate
      ? 12 + ((variantSeed * d) % 49)
      : grade <= 2 ? 1 + (Math.floor(variationSeed / 8) % 9) : 4 + ((variantSeed * d) % 48);
    const dividend = divisor * quotient;
    const displayedDividend = isDivisionEstimate ? dividend + d : dividend;
    const exactQuotient = displayedDividend / divisor;
    const answer = isDivisionEstimate ? Math.round(exactQuotient / 10) * 10 : quotient;
    return {
      question: kind === 'divisionEstimate' ? `${displayedDividend} ÷ ${divisor} 的商最接近多少（整十数）？` : `${dividend} ÷ ${divisor} 等于多少？`,
      expression: `${displayedDividend} ÷ ${divisor}`,
      answer: String(answer),
      reason: kind === 'divisionEstimate'
        ? `${displayedDividend} ÷ ${divisor} = ${decimal(exactQuotient)}，商最接近 ${answer}。`
        : `${divisor} × ${quotient} = ${dividend}，所以商是 ${quotient}。`,
      ...(kind === 'divisionEstimate' ? { estimateOptionStep: 10 } : {}),
    };
  }
  if (kind === 'remainder') {
    const divisor = 3 + ((s + d) % 7);
    const quotient = 2 + ((s * d) % 9);
    const remainder = 1 + (s % (divisor - 1));
    const dividend = divisor * quotient + remainder;
    return { question: `${dividend} ÷ ${divisor} 的余数是多少？`, expression: `${dividend} ÷ ${divisor}`, answer: String(remainder), reason: `${dividend} = ${divisor} × ${quotient} + ${remainder}。` };
  }
  if (kind === 'money') {
    const first = decimal(2.3 + (variantSeed % 9) + d * 0.4);
    const second = decimal(1.2 + ((variantSeed * 3) % 7) + d * 0.3);
    const paid = Math.ceil(Number(first) + Number(second) + 5);
    const answer = decimal(paid - Number(first) - Number(second));
    return { question: `一件物品 ${first} 元，另一件 ${second} 元，付 ${paid} 元，应找回多少元？`, expression: `${paid} - ${first} - ${second}`, answer, answerUnit: '元', reason: `先算总价 ${first} + ${second}，再用 ${paid} 元减去总价，找回 ${answer} 元。` };
  }
  if (kind === 'moneyWhole') {
    const first = 1 + (variantSeed % 9);
    const second = 1 + ((variantSeed * 3) % 8);
    const answer = first + second;
    return {
      question: `小朋友用 ${first} 元和 ${second} 元两张纸币买文具，一共是几元？`,
      expression: `${first} + ${second}`,
      answer: String(answer),
      answerUnit: '元',
      reason: `${first} 元加 ${second} 元等于 ${answer} 元。`,
    };
  }
  if (kind === 'clockRead') {
    const hour = 1 + (variationSeed % 12);
    const places = ['教室里', '家里', '图书馆里', '走廊上', '操场边'];
    const place = places[Math.floor(variationSeed / 12) % places.length];
    const wording = Math.floor(variationSeed / (12 * places.length)) % 3;
    const questions = [
      `在${place}，一只挂钟的分针指向 12，时针指向 ${hour}，现在是几时？`,
      `${place}的钟面显示整时，短针指向 ${hour}，应读作几时？`,
      `观察${place}的钟面：长针指向 12，短针指向 ${hour}，这个时刻是几时？`,
    ];
    return {
      question: questions[wording],
      answer: `${hour}时`,
      reason: '分针指向 12 时表示整时，时针指向几就是几时。',
      options: [`${Math.max(1, hour - 1)}时`, `${hour}时`, `${hour === 12 ? 1 : hour + 1}时`, '无法确定'],
      instruction: '请根据钟面读出时刻。',
    };
  }
  if (kind === 'time') {
    const hour = 7 + (variationSeed % 4);
    const minute = [0, 10, 20, 30, 40][Math.floor(variationSeed / 4) % 5];
    const duration = [20, 30, 40, 50, 60][Math.floor(variationSeed / 20) % 5];
    const total = hour * 60 + minute + duration;
    const answer = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    return { question: `活动从 ${hour}:${String(minute).padStart(2, '0')} 开始，经过 ${duration} 分钟，结束时间是几点？`, answer, reason: `把开始时刻加上 ${duration} 分钟，得到 ${answer}。`, options: [answer, `${hour}:${String((minute + 10) % 60).padStart(2, '0')}`, `${hour + 1}:00`, `${hour + 1}:30`] };
  }
  if (kind === 'shape' || kind === 'visual') {
    const shapes = ['正方形', '长方形', '三角形', '圆'];
    if (kind === 'visual') {
      const count = (variationSeed % 300) + d + 2;
      return {
        question: `把 ${count} 个同样的小正方体首尾排成一排。从正面看，能看到几个小正方形的面？`,
        answer: String(count),
        reason: `每个小正方体正面露出 1 个正方形的面，一排共能看到 ${count} 个。`,
        options: [String(Math.max(1, count - 1)), String(count), String(count + 1), String(count + 2)],
      };
    }
    const descriptionsByDifficulty = [
      [
        { question: '没有角，边是一圈弯弯曲线的图形是什么？', answer: '圆', reason: '圆没有角，边是一条弯曲的曲线。' },
        { question: '有三条边和三个角的图形是什么？', answer: '三角形', reason: '三角形有三条边和三个角。' },
        { question: '四条边一样长、四个角都是直角的图形是什么？', answer: '正方形', reason: '正方形四条边相等，四个角都是直角。' },
        { question: '有四条边、四个直角，两条长边和两条短边的图形是什么？', answer: '长方形', reason: '长方形有四个直角，两组对边分别相等。' },
        { question: '一张纸片没有尖角，边缘像车轮一样圆圆的，它是什么图形？', answer: '圆', reason: '圆的边缘是一圈弯曲的线，没有角。' },
        { question: '用三根小棒首尾相接围成的图形是什么？', answer: '三角形', reason: '三条线段首尾相接围成三角形。' },
      ],
      [
        { question: '四条边都相等，四个角都是直角的四边形是什么？', answer: '正方形', reason: '四条边相等且有四个直角的是正方形。' },
        { question: '有四个直角，对边相等但相邻边不一定相等的图形是什么？', answer: '长方形', reason: '长方形有四个直角，两组对边分别相等。' },
        { question: '由三条线段围成，并且有三个顶点的图形是什么？', answer: '三角形', reason: '三条线段首尾相接围成三角形，形成三个顶点。' },
        { question: '边是弯曲的，图形上找不到角，这种图形是什么？', answer: '圆', reason: '圆没有角，边是弯曲的曲线。' },
        { question: '一个四边形有四个直角，其中一组边比另一组边长，它是什么图形？', answer: '长方形', reason: '长方形有四个直角，通常相邻两边长度不同。' },
        { question: '把四条同样长的小棒围成一个有四个直角的图形，是什么图形？', answer: '正方形', reason: '四条边相等且有四个直角的图形是正方形。' },
      ],
      [
        { question: '一个图形有三条直边、三个角，它属于哪一类图形？', answer: '三角形', reason: '有三条边和三个角的图形是三角形。' },
        { question: '四条边相等，并且每个角都是直角的图形叫什么？', answer: '正方形', reason: '正方形的四条边相等，四个角都是直角。' },
        { question: '有四个直角，两条较长的边相等、两条较短的边相等的图形是什么？', answer: '长方形', reason: '长方形有四个直角，两组对边分别相等。' },
        { question: '从任何方向看都没有顶点和角的平面图形是什么？', answer: '圆', reason: '圆没有顶点和角。' },
        { question: '三条线段围成一个封闭图形，这个图形是什么？', answer: '三角形', reason: '三条线段首尾相接围成三角形。' },
        { question: '有四个直角，并且四条边长度都一样的图形是什么？', answer: '正方形', reason: '四个直角和四条等边共同说明它是正方形。' },
      ],
    ];
    const descriptions = descriptionsByDifficulty[d - 1];
    const selected = descriptions[variationSeed % descriptions.length];
    const settings = ['观察一张图形卡片：', '手工课剪出一个图形：', '在图形展板上看到一个图形：', '在方格纸上画了一个图形：'];
    const setting = settings[Math.floor(variationSeed / descriptions.length) % settings.length];
    return { ...selected, question: `${setting}${selected.question}`, options: shapes };
  }
  if (kind === 'compare') {
    const left = 10 + variantSeed * d;
    const right = left + (variantSeed % 3) - 1;
    const answer = left > right ? '>' : left < right ? '<' : '=';
    return { question: `在 ${left} ○ ${right} 中填入正确的符号。`, answer, reason: `比较两个数，${left} ${answer} ${right}。`, options: ['>', '<', '=', '无法比较'] };
  }
  if (kind === 'lengthCompare') {
    const left = 8 + (variationSeed % 18);
    const right = 5 + (Math.floor(variationSeed / 18) % 18);
    const answer = left === right ? '一样长' : left > right ? '红绳' : '蓝绳';
    return {
      question: `红绳长 ${left} 厘米，蓝绳长 ${right} 厘米，哪根更长？`,
      answer,
      reason: left === right ? '两根绳子的长度相等，所以一样长。' : `${Math.max(left, right)} 厘米大于 ${Math.min(left, right)} 厘米，所以${answer}更长。`,
      options: ['红绳', '蓝绳', '一样长', '无法确定'],
      instruction: '请比较两个长度。',
    };
  }
  if (kind === 'pattern') {
    if (grade === 1) {
      const start = 1 + (variationSeed % 15);
      if (d === 1) {
        const step = 2 + (Math.floor(variationSeed / 15) % 4);
        const values = [start, start + step, start + step * 2, start + step * 3];
        const answer = start + step * 4;
        return { question: `找规律：${values.join('、')}，下一个数是多少？`, answer: String(answer), reason: `每次增加 ${step}，所以下一个数是 ${answer}。` };
      }
      if (d === 2) {
        const step = 2 + (Math.floor(variationSeed / 15) % 4);
        const values = [start, start + step, start + step + step + 1, start + step + step + 1 + step + 2];
        const answer = values[3] + step + 3;
        return { question: `找规律：${values.join('、')}，下一个数是多少？`, answer: String(answer), reason: `增加的数依次是 ${step}、${step + 1}、${step + 2}、${step + 3}，所以下一个数是 ${answer}。` };
      }
      const firstStep = 2 + (Math.floor(variationSeed / 15) % 4);
      const secondStep = 3 + (Math.floor(variationSeed / 60) % 4);
      const values = [start, start + firstStep, start + firstStep + secondStep, start + firstStep * 2 + secondStep];
      const answer = values[3] + secondStep;
      return { question: `找规律：${values.join('、')}，下一个数是多少？`, answer: String(answer), reason: `增加的数交替是 ${firstStep}、${secondStep}、${firstStep}、${secondStep}，所以下一个数是 ${answer}。` };
    }
    if (d === 1) {
      const start = 1 + (variationSeed % 15); const step = 2 + (Math.floor(variationSeed / 15) % 6); const answer = start + step * 4;
      return { question: `找规律：${start}，${start + step}，${start + step * 2}，${start + step * 3}，下一个数是多少？`, answer: String(answer), reason: `每次增加 ${step}，所以下一个数是 ${answer}。` };
    }
    if (d === 2) {
      const start = 2 + (variationSeed % 12); const step = 2 + (Math.floor(variationSeed / 12) % 5); const a = start + step; const b = a + step + 1; const c = b + step + 2; const answer = c + step + 3;
      return { question: `找规律：${start}，${a}，${b}，${c}，下一个数是多少？`, answer: String(answer), reason: `增加的数依次是 ${step}、${step + 1}、${step + 2}、${step + 3}，所以下一项是 ${answer}。` };
    }
    const start = 1 + (variationSeed % 15); const increment = 1 + (Math.floor(variationSeed / 15) % 5); const a = start * 2 + increment; const b = a * 2 + increment; const c = b * 2 + increment; const answer = c * 2 + increment;
    return { question: `找规律：${start}，${a}，${b}，${c}，下一个数是多少？`, answer: String(answer), reason: `每一项都是前一项的 2 倍再加 ${increment}，所以下一项是 ${answer}。` };
  }
  if (kind === 'placeValue') {
    const thousands = 1 + (variationSeed % 9);
    const hundreds = Math.floor(variationSeed / 9) % 10;
    const tens = Math.floor(variationSeed / 90) % 10;
    const ones = Math.floor(variationSeed / 900) % 10;
    const number = thousands * 1000 + hundreds * 100 + tens * 10 + ones;
    return { question: `在数 ${number} 中，百位上的数字是多少？`, answer: String(hundreds), reason: `${number} 从右往左依次是个位、十位、百位、千位，百位是 ${hundreds}。` };
  }
  if (kind === 'lengthUnit' || kind === 'massUnit') {
    const value = 2 + boundedSeed(97, kind === 'massUnit' ? 431 : 389);
    const unit = kind === 'massUnit' ? '千克' : '米';
    const smallUnit = kind === 'massUnit' ? '克' : '厘米';
    const rate = kind === 'massUnit' ? 1000 : 100;
    return { question: `${value} ${unit}等于多少${smallUnit}？`, expression: `${value} × ${rate}`, answer: String(value * rate), reason: `1 ${unit} = ${rate} ${smallUnit}，所以 ${value} × ${rate} = ${value * rate}。` };
  }
  if (kind === 'angle') {
    const degrees = [30, 45, 90, 120, 150][(variantSeed + d) % 5];
    const answer = degrees < 90 ? '锐角' : degrees === 90 ? '直角' : '钝角';
    return { question: `${degrees}° 的角是什么角？`, answer, reason: `小于 90° 是锐角，等于 90° 是直角，大于 90° 且小于 180° 是钝角。`, options: ['锐角', '直角', '钝角', '平角'] };
  }
  if (kind === 'rightAngle') {
    const objects = [
      '数学书封面',
      '练习本封面',
      '黑板边框',
      '教室门框',
      '窗框',
      '长方形桌面',
      '正方形纸片',
      '方格纸上的一个小方格',
      '相框',
      '长方形贺卡',
      '棋盘格上的一格',
      '长方形收纳盒正面',
      '投影幕布',
      '照片边框',
      '长方形文具盒盖',
    ];
    const positions = ['左上', '右上', '左下', '右下'];
    const object = objects[variationSeed % objects.length];
    const position = positions[Math.floor(variationSeed / objects.length) % positions.length];
    const observationForms = [
      '用量角器测量时，',
      '用直角三角尺检验时，',
      '把直角纸片贴上去比较时，',
      '在图形观察记录中，',
      '在手工课的测量表上，',
      '根据老师标出的角度，',
    ];
    const observation = observationForms[Math.floor(variationSeed / (objects.length * positions.length)) % observationForms.length];
    const scene = `${object}的${position}角`;
    return {
      question: `${observation}${scene}量得是 90°，它是什么角？`,
      answer: '直角',
      reason: '等于 90° 的角叫直角。',
      options: ['锐角', '直角', '钝角', '平角'],
      instruction: '请判断角的类型。',
    };
  }
  if (kind === 'dataRange') {
    const base = grade === 2 ? 10 + (variantSeed % 45) : 8 + variantSeed;
    const spread = grade === 2 ? 2 + ((variantSeed + d) % 8) : variantSeed * d;
    const values = [base, base + spread, base + 2, base + spread + 3];
    const answer = Math.max(...values) - Math.min(...values);
    return { question: `四次记录是 ${values.join('、')}，最大数比最小数大多少？`, answer: String(answer), reason: `最大数减最小数，得到 ${answer}。` };
  }
  if (kind === 'fractionCompare') {
    const denominator = 5 + (variationSeed % 20);
    const left = 1 + (Math.floor(variationSeed / 20) % (denominator - 2));
    const right = left + 1;
    const answer = `${right}/${denominator}`;
    return { question: `${left}/${denominator} 和 ${right}/${denominator} 哪个更大？`, answer, reason: `分母相同，分子大的分数更大，所以 ${answer} 更大。`, options: [`${left}/${denominator}`, answer, '一样大', '无法比较'] };
  }
  if (kind === 'perimeter' || kind === 'area') {
    const length = 4 + ((variantSeed * d) % 48); const width = 2 + ((variantSeed + d) % Math.max(3, length - 1));
    const answer = kind === 'perimeter' ? (length + width) * 2 : length * width;
    const answerUnit = kind === 'perimeter' ? '厘米' : '平方厘米';
    const target = kind === 'perimeter' ? '周长是多少厘米？' : '面积是多少（结果填平方厘米）？';
    return { question: `长方形长 ${length} 厘米、宽 ${width} 厘米，${target}`, expression: kind === 'perimeter' ? `(${length} + ${width}) × 2` : `${length} × ${width}`, answer: String(answer), answerUnit, reason: `${kind === 'perimeter' ? '周长=(长+宽)×2' : '面积=长×宽'}，结果是 ${answer}${answerUnit}。` };
  }
  if (kind === 'decimal' || kind === 'decimalMultiply' || kind === 'decimalDivide') {
    const maxLeftTenths = grade === 3 ? 850 : 1800;
    const leftTenths = 12 + boundedSeed(maxLeftTenths - 12, 43 + d * 17);
    const left = decimal(leftTenths / 10);
    if (kind === 'decimalDivide') {
      const divisor = 2 + boundedSeed(4, 71); const dividend = decimal(Number(left) * divisor);
      return { question: `${dividend} ÷ ${divisor} 等于多少？`, expression: `${dividend} ÷ ${divisor}`, answer: left, reason: `${divisor} × ${left} = ${dividend}，所以商是 ${left}。` };
    }
    if (kind === 'decimalMultiply') {
      const multiplier = 2 + boundedSeed(5, 97); const answer = decimal(Number(left) * multiplier);
      return { question: `${left} × ${multiplier} 等于多少？`, expression: `${left} × ${multiplier}`, answer, reason: `先按整数乘法计算，再确定小数点，结果是 ${answer}。` };
    }
    const right = decimal((5 + boundedSeed(10, 113)) / 10); const answer = decimal(Number(left) + Number(right));
    return { question: `${left} + ${right} 等于多少？`, expression: `${left} + ${right}`, answer, reason: `小数点对齐后相加，结果是 ${answer}。` };
  }
  if (kind === 'average') {
    const minimum = grade === 3 ? 8 : grade === 4 ? 24 : 60;
    const range = grade === 3 ? 88 : grade === 4 ? 277 : 841;
    const average = minimum + boundedSeed(range, 211 + d * 31);
    const values = [average - 3, average, average + 3];
    return { question: `三个数是 ${values.join('、')}，它们的平均数是多少？`, expression: `(${values.join(' + ')}) ÷ 3`, answer: String(average), reason: `先求和再除以 3，平均数是 ${average}。` };
  }
  if (kind === 'multiStep') {
    const groups = 2 + (variantSeed % 7); const each = 4 + ((variantSeed * d) % 48); const used = 2 + ((variantSeed + d) % 9); const total = groups * each + used;
    return { question: `共有 ${total} 个学习卡，先用掉 ${used} 个，剩下的平均分给 ${groups} 组，每组多少个？`, expression: `(${total} - ${used}) ÷ ${groups}`, answer: String(each), answerUnit: '个', reason: `先算剩下 ${total} - ${used} = ${groups * each}，再平均分得 ${each} 个。` };
  }
  if (kind === 'factor') {
    const factor = 2 + (variantSeed % 7); const multiple = factor * (3 + d + (variantSeed % 5));
    return { question: `${factor} 是 ${multiple} 的什么数？`, answer: '因数', reason: `${multiple} ÷ ${factor} 没有余数，所以 ${factor} 是 ${multiple} 的因数。`, options: ['因数', '倍数', '质数', '小数'] };
  }
  if (kind === 'fractionAdd' || kind === 'fractionMultiply' || kind === 'fractionDivide') {
    const denominator = 5 + (variantSeed % 8); const first = 1 + (variantSeed % 3); const second = 1 + ((variantSeed + d) % 3);
    if (kind === 'fractionAdd') {
      const answer = fraction(first + second, denominator);
      return { question: `${first}/${denominator} + ${second}/${denominator} 等于多少？`, answer, reason: `分母不变，分子相加，再约分得到 ${answer}。` };
    }
    if (kind === 'fractionMultiply') {
      const answer = fraction(first * second, denominator * (second + 1));
      return { question: `${first}/${denominator} × ${second}/${second + 1} 等于多少？`, answer, reason: `分子乘分子、分母乘分母，再约分得到 ${answer}。` };
    }
    const answer = fraction(first * (second + 1), denominator * second);
    return { question: `${first}/${denominator} ÷ ${second}/${second + 1} 等于多少？`, answer, reason: `除以一个分数等于乘它的倒数，约分后是 ${answer}。` };
  }
  if (kind === 'volume') {
    const length = 3 + (variantSeed % 36); const width = 2 + (variantSeed % 5); const height = 2 + ((variantSeed + d) % 4); const answer = length * width * height;
    return { question: `长方体长 ${length} 厘米、宽 ${width} 厘米、高 ${height} 厘米，体积是多少（结果填立方厘米）？`, expression: `${length} × ${width} × ${height}`, answer: String(answer), answerUnit: '立方厘米', reason: `长方体体积=长×宽×高，结果是 ${answer} 立方厘米。` };
  }
  if (kind === 'coneVolume') {
    const baseArea = 12 + ((variantSeed * 3) % 48);
    const height = 3 + ((variantSeed + d) % 9);
    const answer = baseArea * height / 3;
    return {
      question: `一个圆锥的底面积是 ${baseArea} 平方厘米，高是 ${height} 厘米，体积是多少立方厘米？`,
      expression: `${baseArea} × ${height} ÷ 3`,
      answer: String(answer),
      answerUnit: '立方厘米',
      reason: `圆锥体积=底面积×高÷3，${baseArea}×${height}÷3=${answer}（立方厘米）。`,
    };
  }
  if (kind === 'ratio') {
    const left = 2 + (variantSeed % 7); const right = 3 + ((variantSeed + d) % 8); const divisor = gcd(left, right); const answer = `${left / divisor}:${right / divisor}`;
    return { question: `把 ${left}:${right} 化成最简整数比。`, answer, reason: `前项和后项同时除以最大公因数 ${divisor}，得到 ${answer}。`, options: [answer, `${right}:${left}`, `${left + 1}:${right}`, `${left}:${right + 1}`] };
  }
  if (kind === 'proportionEquation') {
    const left = 2 + (variantSeed % 7);
    const right = 3 + ((variantSeed + d) % 7);
    const multiplier = 2 + ((variantSeed + editionIndex) % 5);
    const denominator = right * multiplier;
    const answer = left * multiplier;
    return {
      question: `解比例：${left}:${right}=x:${denominator}，x 是多少？`,
      expression: `${left} × ${denominator} ÷ ${right}`,
      answer: String(answer),
      reason: `根据比例的基本性质交叉相乘，${right}×x=${left}×${denominator}，所以 x=${left}×${denominator}÷${right}=${answer}。`,
      instruction: '请用交叉相乘解比例。',
    };
  }
  if (kind === 'percent') {
    const rate = [10, 20, 25, 40, 50][(variantSeed + d) % 5]; const base = 20 + boundedSeed(45, 389) * 20; const answer = base * rate / 100;
    return { question: `${base} 的 ${rate}% 是多少？`, expression: `${base} × ${rate}%`, answer: String(answer), reason: `${rate}% = ${rate / 100}，所以结果是 ${answer}。` };
  }
  if (kind === 'circle') {
    const diameter = 2 + (variationSeed % 180); const answer = decimal(diameter * 3.14);
    return { question: `一个圆的直径是 ${diameter} 厘米，周长是多少厘米？`, expression: `${diameter} × 3.14`, answer, answerUnit: '厘米', reason: `圆的周长=直径×圆周率，结果是 ${answer} 厘米。` };
  }
  if (kind === 'negative') {
    // Use compact values that pupils can compare on a mental number line.
    // The identity stream still varies them, but never exposes a six-digit negative number.
    const left = -(2 + (variantSeed % 97));
    const right = -(1 + ((variantSeed * 7 + d) % 97));
    const answer = left > right ? String(left) : String(right);
    return { question: `${left} 和 ${right} 中，哪个数更大？`, answer, reason: `负数离 0 越近越大，所以 ${answer} 更大。`, options: [String(left), String(right), '一样大', '无法比较'] };
  }
  return createModel('add', difficulty, serial);
}

function questionTypeForSlot(slotIndex) {
  return ['choice', 'choice', 'choice', 'choice', 'fill', 'fill', 'problem', 'problem'][slotIndex];
}

function createItem(textbook, grade, topic, type, difficulty, serial, diagnosticSlot = '', idIndex = serial, surfaceVariant = 0) {
  const editionIndex = textbookOptions.findIndex((item) => item.value === textbook.value);
  const typeIndex = TYPES.indexOf(type);
  const topicIndex = (GRADE_TOPICS[grade] || []).findIndex((entry) => entry.key === topic.key);
  const map = getLearningMap(textbook.value, grade);
  const profile = getEditionGradeProfile(textbook.value, grade);
  const curriculum = getCurriculumScope('primary', textbook.value, grade, topic.key);
  const modelSeed = serial + editionIndex * 29 + grade * 17;
  const generationVariant = Math.abs(Number(idIndex) || 0)
    + typeIndex * 24
    + editionIndex * 72
    + (diagnosticSlot ? 1000 : 0);
  // Each topic appears three times in every 24-question difficulty block.
  // Preserve that occurrence when allocating finite multiplication-table
  // pairs; using only difficulty previously made different action types meet
  // on the same pair.
  const topicOccurrence = Math.floor((Math.abs(Number(idIndex) || 0) % 24) / 8);
  const topicSlot = typeIndex * 9 + Math.max(0, difficulty - 1) * 3 + topicOccurrence;
  const catalogConditionSlot = diagnosticSlot
    ? editionIndex * 9 + (Math.max(1, difficulty) - 1) * 3 + Math.abs(Number(idIndex) || 0)
    : 72 + editionIndex * 27 + topicSlot;
  const baseModel = createModel(topic.kind, difficulty, modelSeed, {
    grade,
    editionIndex,
    diagnostic: Boolean(diagnosticSlot),
    typeIndex,
    topicIndex,
    variant: generationVariant,
    slotVariant: topicSlot,
    modelForm: curriculum && curriculum.modelForm,
  });
  // A learner should not receive the same arithmetic condition in two action
  // pools inside one edition-grade. Offset the model stream by the action
  // type; this still keeps the underlying topic and difficulty intact.
  if (topic.kind === 'multiply' && grade === 2) {
    const actionOffset = typeIndex * 19 + difficulty * 7;
    const adjustedModel = createModel(topic.kind, difficulty, modelSeed + actionOffset, {
      grade,
      editionIndex,
      diagnostic: Boolean(diagnosticSlot),
      typeIndex,
      topicIndex,
      variant: generationVariant,
      slotVariant: topicSlot,
      modelForm: curriculum && curriculum.modelForm,
    });
    Object.assign(baseModel, adjustedModel);
  }
  // Unit-conversion prompts have a fixed multiplier, so retrying with only a
  // new serial can still wrap onto an already-used learner value. Keep their
  // number stream tied to the stable topic slot as well as the edition.
  if (topic.kind === 'lengthUnit' || topic.kind === 'massUnit') {
    const unitPosition = diagnosticSlot
      ? (Math.max(1, difficulty) - 1) * 3 + Math.abs(Number(idIndex) || 0)
      : Math.abs(Number(idIndex) || 0);
    // A fixed conversion rate means the learner-visible number must carry the
    // uniqueness. Diagnostic values use 2-73; practice uses a separate
    // edition/type/occurrence stream beginning at 74.
    const unitOccurrence = Math.max(0, Number(typeIndex) || 0) * 9
      + Math.floor(Math.abs(Number(idIndex) || 0) / 8);
    const globalUnitSlot = diagnosticSlot
      ? editionIndex * 9 + unitPosition
      : 72 + editionIndex * 27 + unitOccurrence;
    const value = 2 + globalUnitSlot;
    const unit = topic.kind === 'massUnit' ? '千克' : '米';
    const smallUnit = topic.kind === 'massUnit' ? '克' : '厘米';
    const rate = topic.kind === 'massUnit' ? 1000 : 100;
    Object.assign(baseModel, {
      question: `${value} ${unit}等于多少${smallUnit}？`,
      expression: `${value} × ${rate}`,
      answer: String(value * rate),
      reason: `1 ${unit} = ${rate} ${smallUnit}，所以 ${value} × ${rate} = ${value * rate}。`,
    });
  }
  if (topic.kind === 'factor') {
    // A grade has 72 diagnostic and 216 practice factor slots across the
    // eight textbook editions. Allocate a one-to-one factor pair instead of
    // relying on a short modulo stream that repeats after retrying.
    const factor = 2 + (catalogConditionSlot % 12);
    const multiplier = 3 + Math.floor(catalogConditionSlot / 12);
    const multiple = factor * multiplier;
    Object.assign(baseModel, {
      question: `${factor} 是 ${multiple} 的什么数？`,
      answer: '因数',
      reason: `${multiple} ÷ ${factor} 没有余数，所以 ${factor} 是 ${multiple} 的因数。`,
      options: ['因数', '倍数', '质数', '小数'],
    });
  }
  if (topic.kind === 'ratio') {
    // Keep the same unique allocation for ratio questions. The displayed
    // pair itself is the learner condition, so every edition/bank slot gets
    // a distinct pair within a compact sixth-grade number range.
    const left = 2 + (catalogConditionSlot % 12);
    const right = 3 + Math.floor(catalogConditionSlot / 12);
    const divisor = gcd(left, right);
    const answer = `${left / divisor}:${right / divisor}`;
    Object.assign(baseModel, {
      question: `把 ${left}:${right} 化成最简整数比。`,
      answer,
      reason: `前项和后项同时除以最大公因数 ${divisor}，得到 ${answer}。`,
      options: [answer, `${right}:${left}`, `${left + 1}:${right}`, `${left}:${right + 1}`],
    });
  }
  if (topic.kind === 'circle') {
    const diameter = 2 + catalogConditionSlot;
    const answer = decimal(diameter * 3.14);
    Object.assign(baseModel, {
      question: `一个圆的直径是 ${diameter} 厘米，周长是多少厘米？`,
      expression: `${diameter} × 3.14`,
      answer,
      answerUnit: '厘米',
      reason: `圆的周长=直径×圆周率，结果是 ${answer} 厘米。`,
    });
  }
  if (topic.kind === 'moneyWhole') {
    // Money counting is a three-amount context, not a relabelled two-number
    // addition question. Twelve by twelve by two yields 288 compact, unique
    // first-grade conditions without colliding with the addition pool.
    const first = 1 + (catalogConditionSlot % 12);
    const second = 1 + (Math.floor(catalogConditionSlot / 12) % 12);
    const extra = 1 + Math.floor(catalogConditionSlot / 144);
    const answer = first + second + extra;
    Object.assign(baseModel, {
      question: `小丽有 ${first} 元，小明有 ${second} 元，妈妈又给了小丽 ${extra} 元，他们现在一共有多少元？`,
      expression: `${first} + ${second} + ${extra}`,
      answer: String(answer),
      answerUnit: '元',
      reason: `${first} 元加 ${second} 元再加 ${extra} 元，等于 ${answer} 元。`,
    });
  }
  if (topic.kind === 'coneVolume') {
    const conePosition = diagnosticSlot
      ? (Math.max(1, difficulty) - 1) * 3 + Math.abs(Number(idIndex) || 0)
      : Math.abs(Number(idIndex) || 0);
    // There are 8 editions x 9 cone items in each bank. Encode the complete
    // identity across base area and height: 16 legal base areas x 9 heights
    // give 144 compact, age-appropriate, integral-volume conditions.
    const globalConeSlot = diagnosticSlot
      ? editionIndex * 9 + conePosition
      : 72 + editionIndex * 72 + conePosition;
    const baseArea = 12 + 3 * (globalConeSlot % 16);
    const height = 3 + Math.floor(globalConeSlot / 16);
    const answer = baseArea * height / 3;
    Object.assign(baseModel, {
      question: `一个圆锥的底面积是 ${baseArea} 平方厘米，高是 ${height} 厘米，体积是多少立方厘米？`,
      expression: `${baseArea} × ${height} ÷ 3`,
      answer: String(answer),
      answerUnit: '立方厘米',
      reason: `圆锥体积=底面积×高÷3，${baseArea}×${height}÷3=${answer}（立方厘米）。`,
    });
  }
  const model = addQuestionRepresentation(
    createThinkingForm(baseModel, topic, difficulty, modelSeed, grade),
  );
  // The page already displays the diagnostic/practice state; keep the stem itself clean.
  const prefix = '';
  const action = type === 'choice'
    ? ''
    : type === 'fill'
      ? ''
      : (model.instruction || (model.expression ? '请写出计算过程。' : '请写出判断理由。'));
  const indexInGrade = Math.abs(idIndex) % 1000;
  const learningFrame = '';
  // Use the generation serial in the surface form as well as the learner
  // slot. Retry attempts then receive a genuinely different, readable stem
  // instead of cycling the same wording across editions.
  const promptVariant = surfaceVariant || (
    Math.abs(Number(serial) || 0)
    + Math.abs(Number(idIndex) || 0) * 17
    + typeIndex * 31
    + editionIndex * 97
    + difficulty * 13
    + topicIndex * 19
  );
  let cleanQuestion = surfacePromptVariant(model.question, topic.kind, promptVariant, { type, editionIndex });
  if (topic.kind === 'proportionEquation' && /，x\s*。$/.test(cleanQuestion)) {
    cleanQuestion = cleanQuestion.replace(/，x\s*。$/, '，x 是多少？');
  }
  // The same numerical conversion/area model is taught at different stages,
  // so state the curriculum context explicitly instead of showing identical
  // stems under two different grade headings.
  if (topic.kind === 'lengthUnit' && grade === 2) {
    cleanQuestion = `长度单位关系：${cleanQuestion}`;
  } else if (topic.kind === 'lengthUnit' && grade === 5) {
    cleanQuestion = `单位换算练习：${cleanQuestion}`;
  } else if (topic.kind === 'area' && grade === 3) {
    cleanQuestion = `三年级面积基础：${cleanQuestion}`;
  } else if (topic.kind === 'area' && grade === 5) {
    cleanQuestion = `多边形面积练习：${cleanQuestion}`;
  }
  const prompt = `${prefix}${cleanQuestion}${action ? `\n${action}` : ''}`.replace(/。。+/g, '。');
  const id = `${diagnosticSlot ? 'd' : 'p'}-${textbook.value}-g${grade}-${topic.key}-${type}-l${difficulty}-${indexInGrade + 1}`;
  const answerUnit = model.answerUnit || '';
  const displayedAnswer = `${model.answer}${answerUnit}`;
  const guidance = topicGuidance(topic, model, grade, textbook);
  // Signatures represent the learner-visible task, so wording/context changes
  // remain distinguishable while the same edition is still checked strictly.
  const signaturePrompt = String(prompt).replace(/\s+/g, '');
  const contentSignature = `${topic.key}|${type}|${learningFrame}|${signaturePrompt}|${model.expression || ''}|${model.answer}|${answerUnit}`;
  const mathSignature = `${topic.key}|${signaturePrompt}|${model.expression || ''}|${model.answer}|${answerUnit}`;
  return {
    id,
    schoolStage: 'primary',
    textbookId: textbook.value,
    ...(curriculum && curriculum.schoolSystem ? { schoolSystem: curriculum.schoolSystem } : {}),
    editionUnitKey: (curriculum && curriculum.editionUnitKey) || map.editionUnitKey,
    grade,
    term: (curriculum && curriculum.term) || '上册',
    unit: (curriculum && curriculum.chapterLabel) || `${profile.unit}·${topic.label}`,
    chapterId: curriculum && curriculum.chapterId,
    chapterLabel: curriculum && curriculum.chapterLabel,
    modelForm: curriculum && curriculum.modelForm,
    knowledgePoint: topic.key,
    ability: topic.ability,
    type,
    difficulty,
    diagnosticSlot: diagnosticSlot || undefined,
    curriculumFamily: `${textbook.value}-g${grade}-${topic.key}-${curriculum ? curriculum.modelForm : 'core'}`,
    contentSignature,
    mathSignature,
    prompt,
    options: type === 'choice' ? buildOptions({ ...model, kind: topic.kind }, difficulty, serial + editionIndex) : [],
    answer: String(model.answer),
    answerUnit,
    hint: guidance.hint,
    solution: {
      summary: `${topic.label}：${model.reason}`,
      steps: [guidance.firstStep, model.reason, `所以答案是 ${displayedAnswer}。`],
    },
    knowledgeSummary: guidance.knowledgeSummary,
    mistakeSummary: guidance.mistakeSummary,
    commonMistakes: [`${topic.key}_misread`, 'calculation_error'],
    calculationExpression: model.expression || '',
    examPattern: model.examPattern,
  };
}

let diagnosticConditionKeys = null;

function gradeMathKey(item) {
  return [
    item.grade,
    item.mathSignature || `${item.prompt}|${item.answer}`,
  ].join('|');
}

function getDiagnosticConditionKeys() {
  if (!diagnosticConditionKeys) buildEditionDiagnosticQuestions();
  return diagnosticConditionKeys;
}

function buildEditionPracticeQuestions() {
  const questions = [];
  const diagnosticKeys = getDiagnosticConditionKeys();
  const usedMathSignaturesByGrade = new Map();
  textbookOptions.forEach((textbook, editionIndex) => {
    [1, 2, 3, 4, 5, 6].forEach((grade) => {
      const topics = GRADE_TOPICS[grade];
      const usedExpressions = new Set();
      const usedSignatures = new Set();
      const usedMathSignatures = usedMathSignaturesByGrade.get(grade) || new Set();
      usedMathSignaturesByGrade.set(grade, usedMathSignatures);
      TYPES.forEach((type, typeIndex) => {
        for (let index = 0; index < PRACTICE_PER_TYPE; index += 1) {
          const difficulty = Math.floor(index / PRACTICE_PER_DIFFICULTY) + 1;
          const withinDifficulty = index % PRACTICE_PER_DIFFICULTY;
          const topic = topics[(withinDifficulty + typeIndex * 3 + editionIndex) % topics.length];
          const baseSerial = index + typeIndex * 83 + editionIndex * 227;
          let item;
          for (let retry = 0; retry < 240; retry += 1) {
            item = createItem(
              textbook,
              grade,
              topic,
              type,
              difficulty,
              baseSerial + retry * 131,
              '',
              index,
              1 + index + retry * 17 + typeIndex * 29 + editionIndex * 41 + difficulty * 7 + editionIndex * 97 + editionIndex * editionIndex * 211,
            );
            const signature = item.contentSignature || `${item.prompt}|${item.answer}`;
            const mathKey = gradeMathKey(item);
            if (
              (!item.calculationExpression || !usedExpressions.has(item.calculationExpression))
              && !usedSignatures.has(signature)
              && !usedMathSignatures.has(mathKey)
              && !diagnosticKeys.has(mathKey)
            ) break;
          }
          if (item.calculationExpression) usedExpressions.add(item.calculationExpression);
          usedSignatures.add(item.contentSignature || `${item.prompt}|${item.answer}`);
          usedMathSignatures.add(gradeMathKey(item));
          questions.push(item);
        }
      });
    });
  });
  return questions;
}

function buildEditionDiagnosticQuestions() {
  const questions = [];
  const usedMathSignaturesByGrade = new Map();
  textbookOptions.forEach((textbook, editionIndex) => {
    [1, 2, 3, 4, 5, 6].forEach((grade) => {
      const topics = GRADE_TOPICS[grade];
      const usedMathSignatures = usedMathSignaturesByGrade.get(grade) || new Set();
      usedMathSignaturesByGrade.set(grade, usedMathSignatures);
      topics.forEach((topic, slotIndex) => {
        [1, 2, 3].forEach((difficulty) => {
          for (let variant = 0; variant < DIAGNOSTIC_VARIANTS_PER_DIFFICULTY; variant += 1) {
            const diagnosticSlot = textbook.value === 'rjb'
              ? RJB_DIAGNOSTIC_SLOTS[grade][slotIndex]
              : `${textbook.value}_g${grade}_${topic.key}`;
            const serial = variant + difficulty * 7 + slotIndex * 31 + editionIndex * 43;
            const type = questionTypeForSlot(slotIndex);
            let item;
            for (let retry = 0; retry < 240; retry += 1) {
              item = createItem(
                textbook,
                grade,
                topic,
                type,
                difficulty,
                serial + retry * 131,
                diagnosticSlot,
                variant,
                101 + variant + retry * 19 + slotIndex * 31 + editionIndex * 43 + difficulty * 11 + editionIndex * 97 + editionIndex * editionIndex * 211,
              );
              const mathKey = gradeMathKey(item);
              if (!usedMathSignatures.has(mathKey)) break;
            }
            usedMathSignatures.add(gradeMathKey(item));
            questions.push(item);
          }
        });
      });
    });
  });
  diagnosticConditionKeys = new Set(questions.map(gradeMathKey));
  return questions;
}

module.exports = {
  GRADE_TOPICS,
  buildEditionPracticeQuestions,
  buildEditionDiagnosticQuestions,
};

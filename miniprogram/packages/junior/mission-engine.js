const {
  JUNIOR_GAME_CATALOG,
  JUNIOR_GAME_TYPES,
} = require('../../utils/game-engine-junior');

const MISSION_FORMATS = ['transform', 'coordinate', 'proof-chain', 'data-board'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const REASONING_DEPTH = { easy: 1, medium: 2, hard: 3 };

const TYPE_TO_FORMAT = Object.freeze({
  'rational-number': 'coordinate',
  'algebra-expression': 'transform',
  'equation-lab': 'transform',
  'geometry-clue': 'proof-chain',
  'data-reasoning': 'data-board',
  'function-match': 'coordinate',
  'pythagorean-route': 'proof-chain',
  'radical-reasoning': 'transform',
  'probability-lab': 'data-board',
  'quadratic-path': 'transform',
  'trig-exact': 'proof-chain',
  'sample-inference': 'data-board',
});

function catalogMeta(type) {
  return JUNIOR_GAME_CATALOG.find((item) => item.type === type) || null;
}

function getMissionFormat(type) {
  return TYPE_TO_FORMAT[type] || null;
}

function shuffle(items, rng) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function variedInt(rng, minimum, maximum, attempt, salt) {
  const span = maximum - minimum + 1;
  const randomOffset = Math.floor(rng() * span);
  return minimum + ((randomOffset + attempt * (salt + 1)) % span);
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(Number(left));
  let b = Math.abs(Number(right));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function reducedFraction(numerator, denominator) {
  const divisor = greatestCommonDivisor(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

function finiteDecimal(numerator, denominator) {
  const divisor = greatestCommonDivisor(numerator, denominator);
  const sign = numerator * denominator < 0 ? '-' : '';
  const wholeNumerator = Math.abs(numerator / divisor);
  const reducedDenominator = Math.abs(denominator / divisor);
  const whole = Math.floor(wholeNumerator / reducedDenominator);
  let remainder = wholeNumerator % reducedDenominator;
  if (!remainder) return `${sign}${whole}`;
  const digits = [];
  while (remainder && digits.length < 12) {
    remainder *= 10;
    digits.push(Math.floor(remainder / reducedDenominator));
    remainder %= reducedDenominator;
  }
  return `${sign}${whole}.${digits.join('')}`;
}

function sameIds(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const expected = right.map(String).sort();
  return left.map(String).sort().every((id, index) => id === expected[index]);
}

function sameOrderedIds(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((id, index) => String(id) === String(right[index]));
}

function hasValidAlternativeOrder(sequence, correctIds) {
  return Array.isArray(sequence)
    && sequence.length === correctIds.length
    && new Set(sequence.map(String)).size === sequence.length
    && sameIds(sequence, correctIds);
}

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizedOptions(type, options = {}) {
  const meta = catalogMeta(type);
  if (!meta) return null;
  const requestedGrade = Number(options.grade);
  return {
    type,
    meta,
    grade: meta.grades.includes(requestedGrade) ? requestedGrade : meta.grades[0],
    difficulty: DIFFICULTIES.includes(options.difficulty) ? options.difficulty : 'easy',
    rng: typeof options.rng === 'function' ? options.rng : Math.random,
    recentSignatures: new Set(Array.isArray(options.recentSignatures) ? options.recentSignatures : []),
  };
}

function createBase(context, attempt, key, content) {
  return {
    type: context.type,
    schoolStage: 'junior',
    grade: context.grade,
    difficulty: context.difficulty,
    reasoningDepth: REASONING_DEPTH[context.difficulty],
    format: getMissionFormat(context.type),
    ability: context.meta.ability,
    topicKeys: context.meta.topicKeys[context.grade] || [],
    signature: `mission:${context.type}:${context.difficulty}:${context.grade}:${key}:v${attempt}`,
    ...content,
  };
}

function createOrderedMission(base, correctCards, wrongCards, rng) {
  return {
    ...base,
    cards: shuffle([...correctCards, ...wrongCards], rng),
    correctIds: correctCards.map((card) => card.id),
  };
}

function createCoordinateMission(base, cells, requiredIds) {
  return { ...base, cells, requiredIds };
}

function uniqueTextChoices(correctText, wrongTexts) {
  const choices = [{ id: 'conclusion-correct', text: correctText }];
  wrongTexts.forEach((text) => {
    if (choices.some((item) => item.text === text)) return;
    choices.push({ id: `conclusion-wrong-${choices.length}`, text });
  });
  let fallback = 1;
  while (choices.length < 4) {
    const text = `${correctText}（核对条件 ${fallback}）`;
    if (!choices.some((item) => item.text === text)) choices.push({ id: `conclusion-wrong-${choices.length}`, text });
    fallback += 1;
  }
  return choices;
}

function createDataMission(base, correctEvidence, wrongEvidence, conclusion, wrongConclusions, rng) {
  const conclusionChoices = shuffle(uniqueTextChoices(conclusion, wrongConclusions), rng);
  return {
    ...base,
    answer: conclusion,
    evidenceCards: shuffle([...correctEvidence, ...wrongEvidence], rng),
    correctEvidenceIds: correctEvidence.map((item) => item.id),
    conclusionChoices,
    correctConclusionId: 'conclusion-correct',
  };
}

function buildRationalNumber(context, attempt) {
  const { rng, difficulty } = context;
  const start = variedInt(rng, difficulty === 'easy' ? -6 : -12, difficulty === 'hard' ? 10 : 6, attempt, 1);
  const distance = variedInt(rng, difficulty === 'easy' ? 2 : 4, difficulty === 'hard' ? 12 : 8, attempt, 2);
  const direction = difficulty === 'easy' || variedInt(rng, 0, 1, attempt, 3) ? 1 : -1;
  const change = direction * distance;
  const result = start + change;
  const minimum = Math.min(start, result) - 2;
  const maximum = Math.max(start, result) + 2;
  const cells = Array.from({ length: maximum - minimum + 1 }, (_, index) => {
    const x = minimum + index;
    return { id: `point:${x}:0`, x, y: 0, label: String(x) };
  });
  const expression = `${start} ${change >= 0 ? '+' : '-'} ${Math.abs(change)}`;
  const base = createBase(context, attempt, `${start}:${change}`, {
    title: '数轴定位',
    instruction: `在数轴上点出 ${expression} 的结果。`,
    explanation: `从 ${start} ${direction > 0 ? '向右' : '向左'}移动 ${distance} 个单位，落在 ${result}。`,
    hint: '先判断移动方向，再从起点数出移动的单位数。',
    answer: String(result),
  });
  return createCoordinateMission(base, cells, [`point:${result}:0`]);
}

function buildAlgebraExpression(context, attempt) {
  const { rng, difficulty } = context;
  const coefficientMaximum = { easy: 4, medium: 6, hard: 8 }[difficulty];
  const coefficient = variedInt(rng, 2, coefficientMaximum, attempt, 1);
  const hardValues = [-6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9];
  const value = difficulty === 'hard'
    ? hardValues[variedInt(rng, 0, hardValues.length - 1, attempt, 2)]
    : variedInt(rng, difficulty === 'easy' ? 2 : 3, difficulty === 'easy' ? 5 : 8, attempt, 2);
  const constant = variedInt(rng, difficulty === 'easy' ? 1 : 2, difficulty === 'easy' ? 6 : difficulty === 'medium' ? 10 : 14, attempt, 3);
  const result = coefficient * value + constant;
  const substituted = `${coefficient} × (${value}) + ${constant}`;
  const multiplied = `${coefficient * value} + ${constant}`;
  const base = createBase(context, attempt, `${coefficient}:${value}:${constant}`, {
    title: '代数式工坊',
    instruction: `已知 a = ${value}，把计算 ${coefficient}a + ${constant} 的正确步骤按顺序放入推导区。`,
    explanation: `先代入 a = ${value}，得到 ${substituted}，再计算为 ${result}。`,
    hint: '先把字母替换成已知数，再完成乘法和加法。',
    answer: String(result),
  });
  const correct = difficulty === 'easy' ? [
    { id: 'substitute', text: `代入：${substituted}` },
    { id: 'result', text: `计算 ${substituted}，结果是 ${result}` },
  ] : [
    { id: 'substitute', text: `代入：${substituted}` },
    { id: 'multiply', text: `先算乘法：${multiplied}` },
    ...(difficulty === 'hard' ? [{ id: 'check-sign', text: `检查符号后得到：${multiplied}` }] : []),
    { id: 'result', text: `结果：${result}` },
  ];
  return createOrderedMission(base, correct, [
    { id: 'wrong-constant', text: `错误地把常数也乘以 a，得到 ${coefficient * value + constant * value}` },
    { id: 'wrong-result', text: `结果：${result + coefficient}` },
  ], rng);
}

function buildEquationLab(context, attempt) {
  const { rng, difficulty } = context;
  const coefficient = difficulty === 'easy' ? 1 : variedInt(rng, 2, 6, attempt, 1);
  const answer = variedInt(rng, 2, difficulty === 'hard' ? 12 : 9, attempt, 2);
  const offset = variedInt(rng, 2, 14, attempt, 3);
  const total = coefficient * answer + offset;
  const middle = coefficient * answer;
  const left = coefficient === 1 ? 'x' : `${coefficient}x`;
  const explanation = coefficient === 1
    ? `等式两边同时减去 ${offset}，得到 x = ${total} - ${offset} = ${answer}。`
    : `等式两边先同时减去 ${offset}，再同时除以 ${coefficient}，得到 x = ${answer}。`;
  const base = createBase(context, attempt, `${coefficient}:${offset}:${total}`, {
    title: '方程变形',
    instruction: `解方程 ${left} + ${offset} = ${total}，把变形步骤按顺序放入推导区。`,
    explanation,
    hint: coefficient === 1 ? '保持等式平衡：两边同时减去常数项。' : '保持等式平衡：先去掉常数项，再去掉 x 前的系数。',
    answer: `x = ${answer}`,
  });
  const correctCards = coefficient === 1 ? [
    { id: 'subtract', text: `x = ${total} - ${offset}` },
    { id: 'result', text: `x = ${answer}` },
  ] : [
    { id: 'subtract', text: `${left} = ${total} - ${offset}` },
    { id: 'simplify', text: `${left} = ${middle}` },
    { id: 'divide', text: `x = ${answer}` },
  ];
  return createOrderedMission(base, correctCards, [
    { id: 'wrong-add', text: `${left} = ${total} + ${offset}` },
    { id: 'wrong-multiply', text: `x = ${middle * Math.max(2, coefficient)}` },
  ], rng);
}

function buildGeometryClue(context, attempt) {
  const { rng, grade, difficulty } = context;
  if (grade === 7) {
    const angleA = variedInt(rng, 35, 70, attempt, 1);
    const angleB = variedInt(rng, 35, 140 - angleA, attempt, 2);
    const angleC = 180 - angleA - angleB;
    const base = createBase(context, attempt, `${angleA}:${angleB}`, {
      title: '几何论证',
      instruction: `三角形 ABC 中，∠A = ${angleA}°，∠B = ${angleB}°。按推理顺序排出求 ∠C 的论证。`,
      explanation: `三角形内角和是 180°，所以 ∠C = 180° - ${angleA}° - ${angleB}° = ${angleC}°。`,
      hint: '先找到三角形内角和，再把已知角代入。',
      answer: `∠C = ${angleC}°`,
      // 内角和定理与已知角求和互不依赖，但代入必须等两条依据都完成。
      correctSequences: difficulty === 'hard' ? [
        ['angle-sum', 'known-sum', 'substitute', 'result'],
        ['known-sum', 'angle-sum', 'substitute', 'result'],
      ] : undefined,
    });
    const correct = difficulty === 'easy' ? [
      { id: 'angle-sum', text: '三角形三个内角的和是 180°' },
      { id: 'result', text: `∠C = ${angleC}°` },
    ] : [
      { id: 'angle-sum', text: '三角形三个内角的和是 180°' },
      { id: 'substitute', text: `∠C = 180° - ${angleA}° - ${angleB}°` },
      { id: 'result', text: `∠C = ${angleC}°` },
    ];
    if (difficulty === 'hard') correct.splice(1, 0, { id: 'known-sum', text: `已知两个角的和是 ${angleA + angleB}°` });
    return createOrderedMission(base, correct, [
      { id: 'wrong-sum', text: `∠C = 180° + ${angleA}° + ${angleB}°` },
      { id: 'wrong-rule', text: '三角形三个内角的和是 360°' },
    ], rng);
  }
  if (grade === 8) {
    const base = createBase(context, attempt, `sss:${attempt}`, {
      title: '全等推理',
      instruction: '在 △ABC 和 △DEF 中，已知 AB = DE、BC = EF、AC = DF。按推理顺序排出可以得到的结论。',
      explanation: '三组对应边分别相等，依据 SSS 可以判定两个三角形全等，因此对应角相等。',
      hint: '先识别已知的是哪三组对应元素，再选对应的全等判定方法。',
      answer: '△ABC ≌ △DEF，且对应角相等',
    });
    const correct = [
      { id: 'three-sides', text: '三组对应边分别相等' },
      { id: 'sss', text: '依据 SSS，△ABC ≌ △DEF' },
    ];
    if (difficulty !== 'easy') correct.push({ id: 'corresponding', text: '全等三角形的对应角相等' });
    if (difficulty === 'hard') correct.push({ id: 'result', text: '因此可得对应角相等' });
    return createOrderedMission(base, correct, [
      { id: 'wrong-sas', text: '依据 SAS，△ABC ≌ △DEF' },
      { id: 'wrong-asa', text: '依据 ASA，△ABC ≌ △DEF' },
    ], rng);
  }
  const centralAngleOptions = difficulty === 'easy'
    ? [80, 100, 120]
    : difficulty === 'medium' ? [100, 120, 140] : [120, 140, 160];
  const centralAngle = centralAngleOptions[variedInt(rng, 0, centralAngleOptions.length - 1, attempt, 1)];
  const inscribedAngle = centralAngle / 2;
  const base = createBase(context, attempt, `${centralAngle}`, {
    title: '圆的角度推理',
    instruction: `圆 O 中，∠AOB = ${centralAngle}°，C 在优弧 AB 上。按推理顺序求劣弧 AB 所对的 ∠ACB。`,
    explanation: `同弧所对的圆周角等于圆心角的一半，所以 ∠ACB = ${centralAngle}° ÷ 2 = ${inscribedAngle}°。`,
    hint: '比较圆心角和同弧所对的圆周角之间的倍数关系。',
    answer: `∠ACB = ${inscribedAngle}°`,
  });
  const correct = [{ id: 'circle-rule', text: '同弧所对的圆周角等于圆心角的一半' }];
  if (difficulty !== 'easy') correct.push({ id: 'divide', text: `∠ACB = ${centralAngle}° ÷ 2` });
  if (difficulty === 'hard') correct.splice(1, 0, { id: 'arc', text: `劣弧 AB 的圆心角是 ${centralAngle}°` });
  correct.push({ id: 'result', text: `∠ACB = ${inscribedAngle}°` });
  return createOrderedMission(base, correct, [
    { id: 'wrong-equal', text: `∠ACB = ${centralAngle}°` },
    { id: 'wrong-double', text: `∠ACB = ${centralAngle * 2}°` },
  ], rng);
}

function buildDataReasoning(context, attempt) {
  const { rng, grade, difficulty } = context;
  if (grade === 7) {
    const count = variedInt(rng, difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5, difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 7, attempt, 1);
    const average = variedInt(rng, difficulty === 'easy' ? 8 : difficulty === 'medium' ? 12 : 18, difficulty === 'easy' ? 15 : difficulty === 'medium' ? 22 : 30, attempt, 2);
    const total = count * average;
    const conclusion = `这组数据的平均数是 ${average} 页`;
    const base = createBase(context, attempt, `${count}:${total}`, {
      title: '数据解码',
      instruction: `${count} 名同学一周阅读页数的总和是 ${total} 页。选出能支持平均数结论的证据，再提交结论。`,
      explanation: `平均数 = 总页数 ÷ 人数 = ${total} 页 ÷ ${count} 人 = ${average} 页。`,
      hint: difficulty === 'easy' ? '平均数要同时用到总页数和人数。' : '先用总页数除以人数，再检查单位仍然是页。',
    });
    const correctEvidence = [
      { id: 'total', text: `阅读总页数：${total} 页` },
      { id: 'count', text: `参与人数：${count} 人` },
    ];
    if (difficulty !== 'easy') correctEvidence.push({ id: 'formula', text: '平均数 = 总页数 ÷ 人数' });
    if (difficulty === 'hard') correctEvidence.push({ id: 'unit', text: '平均数的单位仍是页' });
    return createDataMission(base, correctEvidence, [
      { id: 'largest', text: `最高个人阅读页数：${average + 5} 页` },
      { id: 'days', text: '统计时间：7 天' },
    ], conclusion, [
      `这组数据的平均数是 ${average + 2} 页`,
      `这组数据的平均数是 ${total} 页`,
      `这组数据的平均数是 ${count} 页`,
    ], rng);
  }
  const countOptions = difficulty === 'easy' ? [4, 5] : difficulty === 'medium' ? [5, 8] : [8, 10];
  const count = countOptions[variedInt(rng, 0, countOptions.length - 1, attempt, 1)];
  const recordedAverage = variedInt(rng, 12, 20, attempt, 2);
  const wrongValue = variedInt(rng, 18, 30, attempt, 3);
  const correction = variedInt(rng, 1, difficulty === 'hard' ? 8 : 5, attempt, 4);
  const correctValue = wrongValue + correction;
  const correctedText = finiteDecimal(recordedAverage * count + correction, count);
  const conclusion = `修正后的平均数是 ${correctedText}`;
  const base = createBase(context, attempt, `${count}:${recordedAverage}:${wrongValue}:${correctValue}`, {
    title: '数据修正',
    instruction: `有 ${count} 个数据，原平均数是 ${recordedAverage}。其中一个数据把 ${correctValue} 错记为 ${wrongValue}。选出关键证据并提交修正后的平均数。`,
    explanation: `原总量是 ${recordedAverage * count}，修正后增加 ${correction}，新平均数为 (${recordedAverage * count} + ${correction}) ÷ ${count} = ${correctedText}。`,
    hint: difficulty === 'easy' ? '先把平均数还原成总量，再补回少算的部分。' : '记录错误只会改变总量 ${correction}，最后再除以数据个数。',
  });
  return createDataMission(base, [
    { id: 'old-total', text: `原总量：${recordedAverage * count}` },
    { id: 'correction', text: `应补回：${correction}` },
  ], [
    { id: 'wrong-total', text: `原总量：${recordedAverage + count}` },
    { id: 'median', text: `中位数：${recordedAverage}` },
  ], conclusion, [
    `修正后的平均数是 ${finiteDecimal((recordedAverage + correction) * count, count)}`,
    `修正后的平均数是 ${finiteDecimal(recordedAverage * count - correction, count)}`,
    `修正后的平均数是 ${finiteDecimal(recordedAverage * count + correction * Math.max(2, count / 2), count)}`,
  ], rng);
}

function buildFunctionMatch(context, attempt) {
  const { rng, difficulty } = context;
  const slope = variedInt(rng, 1, { easy: 2, medium: 3, hard: 4 }[difficulty], attempt, 1);
  const interceptBound = { easy: 1, medium: 3, hard: 5 }[difficulty];
  const intercept = variedInt(rng, -interceptBound, interceptBound, attempt, 2);
  const targetX = variedInt(rng, difficulty === 'easy' ? 0 : -2, difficulty === 'hard' ? 4 : 3, attempt, 3);
  const targetY = slope * targetX + intercept;
  const cellRadius = { easy: 1, medium: 1, hard: 2 }[difficulty];
  const xValues = difficulty === 'easy' ? [targetX, targetX + 1] : Array.from({ length: cellRadius * 2 + 1 }, (_, index) => targetX - cellRadius + index);
  const yValues = Array.from({ length: cellRadius * 2 + 1 }, (_, index) => targetY - cellRadius + index);
  const cells = xValues.reduce((items, x) => items.concat(yValues.map((y) => ({
    id: `point:${x}:${y}`, x, y, label: `(${x}, ${y})`,
  }))), []);
  const expression = intercept >= 0 ? `y = ${slope}x + ${intercept}` : `y = ${slope}x - ${Math.abs(intercept)}`;
  const base = createBase(context, attempt, `${slope}:${intercept}:${targetX}`, {
    title: '函数坐标台',
    instruction: `函数 ${expression} 中，当 x = ${targetX} 时，点击正确的坐标格。`,
    explanation: `把 x = ${targetX} 代入，y = ${slope} × (${targetX}) ${intercept >= 0 ? '+' : '-'} ${Math.abs(intercept)} = ${targetY}，所以点是 (${targetX}, ${targetY})。`,
    hint: '先算出 y 的值，再在同一横坐标列里选择对应点。',
    answer: `(${targetX}, ${targetY})`,
  });
  return createCoordinateMission(base, cells, [`point:${targetX}:${targetY}`]);
}

function buildPythagoreanRoute(context, attempt) {
  const triples = context.difficulty === 'easy'
    ? [[3, 4, 5], [5, 12, 13]]
    : [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]];
  const triple = triples[variedInt(context.rng, 0, triples.length - 1, attempt, 1)];
  const scale = context.difficulty === 'easy'
    ? 1
    : variedInt(context.rng, context.difficulty === 'medium' ? 2 : 3, context.difficulty === 'medium' ? 3 : 4, attempt, 2);
  const [rawA, rawB, rawC] = triple;
  const a = rawA * scale;
  const b = rawB * scale;
  const c = rawC * scale;
  const squareSum = a * a + b * b;
  const base = createBase(context, attempt, `${a}:${b}`, {
    title: '勾股路线',
    instruction: `直角三角形的两条直角边长分别是 ${a} 和 ${b}。按推理顺序求斜边 c。`,
    explanation: `由勾股定理 c² = ${a}² + ${b}² = ${squareSum}，所以 c = ${c}。`,
    hint: '斜边的平方等于两条直角边平方的和。',
    answer: `c = ${c}`,
  });
  const correct = context.difficulty === 'easy' ? [
    { id: 'rule', text: '直角三角形满足 a² + b² = c²' },
    { id: 'result', text: `代入后得到 c = ${c}` },
  ] : [
    { id: 'rule', text: '直角三角形满足 a² + b² = c²' },
    ...(context.difficulty === 'hard' ? [{ id: 'squares', text: `${a}² + ${b}² = ${squareSum}` }] : []),
    { id: 'substitute', text: `c² = ${a}² + ${b}² = ${squareSum}` },
    { id: 'result', text: `c = ${c}` },
  ];
  return createOrderedMission(base, correct, [
    { id: 'wrong-add', text: `c = ${a + b}` },
    { id: 'wrong-square', text: `c² = ${a + b}` },
  ], context.rng);
}

function buildRadicalReasoning(context, attempt) {
  const { rng, difficulty } = context;
  const squareRoot = variedInt(rng, { easy: 3, medium: 7, hard: 10 }[difficulty], { easy: 6, medium: 11, hard: 15 }[difficulty], attempt, 1);
  const cubeRoot = difficulty === 'easy' ? 0 : variedInt(rng, difficulty === 'medium' ? 2 : 3, difficulty === 'medium' ? 4 : 6, attempt, 2);
  const result = squareRoot + cubeRoot;
  const expression = cubeRoot ? `√${squareRoot * squareRoot} + ∛${cubeRoot ** 3}` : `√${squareRoot * squareRoot}`;
  const base = createBase(context, attempt, `${squareRoot}:${cubeRoot}`, {
    title: '根式拆解',
    instruction: `把 ${expression} 的正确化简步骤按顺序放入推导区。`,
    explanation: cubeRoot
      ? `√${squareRoot * squareRoot} = ${squareRoot}，∛${cubeRoot ** 3} = ${cubeRoot}，所以结果是 ${result}。`
      : `√${squareRoot * squareRoot} = ${squareRoot}。`,
    hint: '先分别找到平方根和立方根，再进行最后的运算。',
    answer: String(result),
    // 两个根式的化简互不依赖，最终相加前可按任一顺序完成。
    correctSequences: cubeRoot
      ? (difficulty === 'hard'
        ? [['square', 'cube', 'add', 'result'], ['cube', 'square', 'add', 'result']]
        : [['square', 'cube', 'result'], ['cube', 'square', 'result']])
      : undefined,
  });
  const correct = cubeRoot ? [
    { id: 'square', text: `√${squareRoot * squareRoot} = ${squareRoot}` },
    { id: 'cube', text: `∛${cubeRoot ** 3} = ${cubeRoot}` },
    ...(difficulty === 'hard' ? [{ id: 'add', text: `再相加：${squareRoot} + ${cubeRoot}` }] : []),
    { id: 'result', text: `${squareRoot} + ${cubeRoot} = ${result}` },
  ] : [
    { id: 'square', text: `√${squareRoot * squareRoot} = ${squareRoot}` },
    { id: 'result', text: `结果是 ${squareRoot}` },
  ];
  return createOrderedMission(base, correct, [
    { id: 'wrong-square', text: `√${squareRoot * squareRoot} = ${squareRoot * squareRoot}` },
    { id: 'wrong-cube', text: `∛${cubeRoot ? cubeRoot ** 3 : 8} = ${(cubeRoot || 2) ** 3}` },
  ], rng);
}

function buildProbabilityLab(context, attempt) {
  const { difficulty } = context;
  const red = variedInt(context.rng, 2, difficulty === 'easy' ? 4 : 6, attempt, 1);
  const blue = variedInt(context.rng, 2, difficulty === 'easy' ? 4 : 6, attempt, 2);
  const green = difficulty === 'hard' ? variedInt(context.rng, 2, 5, attempt, 3) : 0;
  const total = red + blue + green;
  const probability = reducedFraction(red, total);
  const conclusion = `抽到红球的概率是 ${probability}`;
  const colorDescription = green
    ? `${red} 个红球、${blue} 个蓝球和 ${green} 个绿球`
    : `${red} 个红球和 ${blue} 个蓝球`;
  const base = createBase(context, attempt, `${red}:${blue}`, {
    title: '概率证据台',
    instruction: `袋中有 ${colorDescription}，每个球被抽到的机会相同。选出支持“抽到红球的概率”的证据，再提交结论。`,
    explanation: `所有等可能结果共有 ${total} 个，其中抽到红球的有 ${red} 个，所以概率是 ${probability}。`,
    hint: '概率需要同时数清全部等可能结果和满足条件的结果。',
  });
  const correctEvidence = [
    { id: 'total', text: `等可能结果总数：${total}` },
    { id: 'favorable', text: `抽到红球的结果数：${red}` },
  ];
  if (difficulty !== 'easy') {
    correctEvidence.push({ id: 'formula', text: `概率 = 红球数 ÷ 总数 = ${red} ÷ ${total}` });
  }
  if (difficulty === 'hard') {
    correctEvidence.push({ id: 'equal-chance', text: '每个球被抽到的机会相同' });
  }
  return createDataMission(base, correctEvidence, [
    { id: 'bag', text: '袋子的材质：布袋' },
    { id: 'color-count', text: `球的颜色种类：${green ? 3 : 2} 种` },
  ], conclusion, [
    `抽到红球的概率是 ${reducedFraction(red, total - 1)}`,
    `抽到红球的概率是 ${reducedFraction(red - 1, total)}`,
    `抽到红球的概率是 ${reducedFraction(red + 1, total)}`,
  ], context.rng);
}

function buildQuadraticPath(context, attempt) {
  const { difficulty } = context;
  const firstRoot = variedInt(context.rng, 1, difficulty === 'easy' ? 4 : 7, attempt, 1);
  const secondRoot = variedInt(context.rng, firstRoot + 1, firstRoot + 8, attempt, 2);
  const sum = firstRoot + secondRoot;
  const product = firstRoot * secondRoot;
  const leading = difficulty === 'hard' ? 2 : 1;
  const equation = leading === 1
    ? `x² - ${sum}x + ${product}`
    : `2x² - ${leading * sum}x + ${leading * product}`;
  const factors = leading === 1
    ? `(x - ${firstRoot})(x - ${secondRoot})`
    : `2(x - ${firstRoot})(x - ${secondRoot})`;
  const base = createBase(context, attempt, `${leading}:${firstRoot}:${secondRoot}`, {
    title: '二次方程路径',
    instruction: `解方程 ${equation} = 0，把因式分解后的推理步骤按顺序放入推导区。`,
    explanation: `${equation} = ${factors}，所以 x = ${firstRoot} 或 x = ${secondRoot}。`,
    hint: '寻找两个数：它们的和是 x 的系数绝对值，积是常数项。',
    answer: `x = ${firstRoot} 或 x = ${secondRoot}`,
  });
  const correct = difficulty === 'easy' ? [
    { id: 'factor', text: `${equation} = 0 可化为 ${factors} = 0` },
  ] : [
    { id: 'factor', text: `${equation} = ${factors}` },
    { id: 'zero-product', text: `${factors} = 0` },
  ];
  if (difficulty === 'hard') correct.push({ id: 'nonzero', text: '因为 2 不等于 0，所以两个因式中必有一个为 0' });
  correct.push(
    { id: 'roots', text: `x = ${firstRoot} 或 x = ${secondRoot}` },
  );
  return createOrderedMission(base, correct, [
    { id: 'wrong-factor', text: `${equation} = (x + ${firstRoot})(x + ${secondRoot})` },
    { id: 'wrong-root', text: `x = ${sum}` },
  ], context.rng);
}

function buildTrigExact(context, attempt) {
  const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17]];
  const triple = triples[variedInt(context.rng, 0, triples.length - 1, attempt, 1)];
  const scale = context.difficulty === 'easy'
    ? 1
    : variedInt(context.rng, context.difficulty === 'hard' ? 2 : 1, context.difficulty === 'hard' ? 4 : 2, attempt, 2);
  const opposite = triple[0] * scale;
  const adjacent = triple[1] * scale;
  const ratio = reducedFraction(opposite, adjacent);
  const base = createBase(context, attempt, `${opposite}:${adjacent}`, {
    title: '三角比推理',
    instruction: context.difficulty === 'hard'
      ? `一个基本直角三角形按 ${scale} 倍同比放大后，锐角 A 的对边长 ${opposite}，邻边长 ${adjacent}。按推理顺序求 tan A。`
      : `直角三角形中，锐角 A 的对边长 ${opposite}，邻边长 ${adjacent}。按推理顺序求 tan A。`,
    explanation: `tan A = 对边 ÷ 邻边 = ${opposite} ÷ ${adjacent} = ${ratio}。`,
    hint: 'tan 的定义是对边比邻边，不需要先求斜边。',
    answer: `tan A = ${ratio}`,
  });
  const correct = [
    { id: 'definition', text: 'tan A = 对边 ÷ 邻边' },
  ];
  if (context.difficulty === 'hard') correct.push({ id: 'scale', text: `对边和邻边同乘 ${scale}，三角比不变` });
  if (context.difficulty !== 'easy') correct.push({ id: 'substitute', text: `tan A = ${opposite} ÷ ${adjacent}` });
  correct.push({ id: 'result', text: `tan A = ${ratio}` });
  return createOrderedMission(base, correct, [
    { id: 'wrong-sin', text: 'tan A = 对边 ÷ 斜边' },
    { id: 'wrong-reverse', text: `tan A = ${reducedFraction(adjacent, opposite)}` },
  ], context.rng);
}

function buildSampleInference(context, attempt) {
  const { difficulty } = context;
  const total = variedInt(context.rng, difficulty === 'easy' ? 6 : 10, difficulty === 'hard' ? 30 : 24, attempt, 1) * 100;
  const sampleSize = variedInt(context.rng, 80, 200, attempt, 2);
  const rate = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70][variedInt(context.rng, 0, 10, attempt, 3)];
  const estimate = total * rate / 100;
  const conclusion = `按样本比例估计，约有 ${estimate} 人符合条件`;
  const base = createBase(context, attempt, `${total}:${sampleSize}:${rate}`, {
    title: '样本推断',
    instruction: `从全校 ${total} 名学生中随机抽取 ${sampleSize} 人，其中 ${rate}% 符合某项条件。选出支持总体估计的证据，再提交结论。`,
    explanation: `样本比例为 ${rate}%，按随机样本的比例估计，全校约有 ${total} × ${rate}% = ${estimate} 人符合条件。`,
    hint: '这是比例估计：用样本比例乘总体数量。',
  });
  const correctEvidence = [
    { id: 'population', text: `总体人数：${total}` },
    { id: 'rate', text: `样本比例：${rate}%` },
  ];
  if (difficulty !== 'easy') correctEvidence.push({ id: 'formula', text: '估计人数 = 总体人数 × 样本比例' });
  if (difficulty === 'hard') correctEvidence.push({ id: 'random', text: '抽样方式：随机抽取' });
  const wrongEstimates = [];
  [
    total - estimate,
    Math.round(sampleSize * rate / 100),
    total + estimate,
    estimate + Math.max(100, Math.round(total / 10)),
    Math.max(0, estimate - Math.max(100, Math.round(total / 10))),
  ].forEach((candidate) => {
    if (candidate !== estimate && !wrongEstimates.includes(candidate)) wrongEstimates.push(candidate);
  });
  let fallback = 1;
  while (wrongEstimates.length < 3) {
    const candidate = estimate + fallback * 100;
    if (candidate !== estimate && !wrongEstimates.includes(candidate)) wrongEstimates.push(candidate);
    fallback += 1;
  }
  return createDataMission(base, correctEvidence, [
    { id: 'sample-size', text: `样本人数：${sampleSize}` },
    { id: 'remaining', text: `未抽到的人数：${total - sampleSize}` },
  ], conclusion, [
    ...wrongEstimates.slice(0, 3).map((value) => `按样本比例估计，约有 ${value} 人符合条件`),
  ], context.rng);
}

const BUILDERS = {
  'rational-number': buildRationalNumber,
  'algebra-expression': buildAlgebraExpression,
  'equation-lab': buildEquationLab,
  'geometry-clue': buildGeometryClue,
  'data-reasoning': buildDataReasoning,
  'function-match': buildFunctionMatch,
  'pythagorean-route': buildPythagoreanRoute,
  'radical-reasoning': buildRadicalReasoning,
  'probability-lab': buildProbabilityLab,
  'quadratic-path': buildQuadraticPath,
  'trig-exact': buildTrigExact,
  'sample-inference': buildSampleInference,
};

function validateMission(mission) {
  if (!mission || typeof mission !== 'object') return { valid: false, issues: ['mission_missing'] };
  const issues = [];
  const meta = catalogMeta(mission.type);
  if (!meta) issues.push('type_unknown');
  if (mission.schoolStage !== 'junior') issues.push('school_stage_invalid');
  if (!meta || !meta.grades.includes(Number(mission.grade))) issues.push('grade_scope_invalid');
  if (!DIFFICULTIES.includes(mission.difficulty)) issues.push('difficulty_invalid');
  if (!MISSION_FORMATS.includes(mission.format)) issues.push('format_invalid');
  if (meta && getMissionFormat(mission.type) !== mission.format) issues.push('format_mismatch');
  if (mission.reasoningDepth !== REASONING_DEPTH[mission.difficulty]) issues.push('reasoning_depth_invalid');
  ['signature', 'title', 'instruction', 'explanation', 'hint'].forEach((field) => {
    if (!isNonEmptyText(mission[field])) issues.push(`${field}_missing`);
  });
  const visibleCopy = [mission.title, mission.instruction, mission.explanation, mission.hint]
    .filter((value) => typeof value === 'string').join('\n');
  if (/如图|见图|图中/.test(visibleCopy)) issues.push('unsupported_visual_reference');

  if (mission.format === 'transform' || mission.format === 'proof-chain') {
    const cards = Array.isArray(mission.cards) ? mission.cards : [];
    const correctIds = Array.isArray(mission.correctIds) ? mission.correctIds : [];
    const ids = cards.map((card) => card && card.id);
    if (cards.length < 3 || correctIds.length < 2 || cards.length <= correctIds.length) issues.push('workspace_missing');
    if (new Set(ids.map(String)).size !== ids.length || cards.some((card) => !card || !isNonEmptyText(card.text))) issues.push('workspace_cards_invalid');
    if (new Set(cards.map((card) => card && card.text)).size !== cards.length) issues.push('workspace_card_text_duplicate');
    if (!correctIds.every((id) => ids.some((cardId) => String(cardId) === String(id)))) issues.push('workspace_solution_invalid');
    if (mission.correctSequences !== undefined) {
      const sequences = Array.isArray(mission.correctSequences) ? mission.correctSequences : [];
      if (!sequences.length || !sequences.every((sequence) => hasValidAlternativeOrder(sequence, correctIds))) {
        issues.push('workspace_sequences_invalid');
      }
    }
  }

  if (mission.format === 'coordinate') {
    const cells = Array.isArray(mission.cells) ? mission.cells : [];
    const requiredIds = Array.isArray(mission.requiredIds) ? mission.requiredIds : [];
    const ids = cells.map((cell) => cell && cell.id);
    if (cells.length < 6 || requiredIds.length < 1) issues.push('coordinate_cells_missing');
    if (new Set(ids.map(String)).size !== ids.length || cells.some((cell) => !cell || !Number.isFinite(cell.x) || !Number.isFinite(cell.y) || !isNonEmptyText(cell.label))) issues.push('coordinate_cells_invalid');
    if (!requiredIds.every((id) => ids.some((cellId) => String(cellId) === String(id)))) issues.push('coordinate_solution_invalid');
  }

  if (mission.format === 'data-board') {
    const evidence = Array.isArray(mission.evidenceCards) ? mission.evidenceCards : [];
    const correctEvidenceIds = Array.isArray(mission.correctEvidenceIds) ? mission.correctEvidenceIds : [];
    const conclusions = Array.isArray(mission.conclusionChoices) ? mission.conclusionChoices : [];
    const evidenceIds = evidence.map((item) => item && item.id);
    const conclusionIds = conclusions.map((item) => item && item.id);
    if (evidence.length < 3 || correctEvidenceIds.length < 2 || evidence.length <= correctEvidenceIds.length || conclusions.length < 3) issues.push('data_board_missing');
    if (new Set(evidenceIds.map(String)).size !== evidenceIds.length || evidence.some((item) => !item || !isNonEmptyText(item.text))) issues.push('evidence_cards_invalid');
    if (new Set(evidence.map((item) => item && item.text)).size !== evidence.length) issues.push('evidence_card_text_duplicate');
    if (new Set(conclusionIds.map(String)).size !== conclusionIds.length || conclusions.some((item) => !item || !isNonEmptyText(item.text))) issues.push('conclusion_choices_invalid');
    if (new Set(conclusions.map((item) => item && item.text)).size !== conclusions.length) issues.push('conclusion_text_duplicate');
    if (!correctEvidenceIds.every((id) => evidenceIds.some((evidenceId) => String(evidenceId) === String(id)))) issues.push('evidence_solution_invalid');
    if (!conclusionIds.some((id) => String(id) === String(mission.correctConclusionId))) issues.push('conclusion_solution_invalid');
  }
  return { valid: issues.length === 0, issues };
}

function generateMission(type, options = {}) {
  if (!JUNIOR_GAME_TYPES.includes(type)) return null;
  const context = normalizedOptions(type, options);
  const builder = context && BUILDERS[type];
  if (!builder) return null;
  let fallback = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const mission = builder(context, attempt);
    const audit = validateMission(mission);
    if (!audit.valid) throw new Error(`Invalid mission: ${audit.issues.join(', ')}`);
    fallback = mission;
    if (!context.recentSignatures.has(mission.signature)) return mission;
  }
  return fallback ? { ...fallback, repeatExhausted: true } : null;
}

function createMissionPlayer(mission) {
  const format = mission && MISSION_FORMATS.includes(mission.format) ? mission.format : 'unknown';
  if (format === 'transform' || format === 'proof-chain') return { format, orderedIds: [] };
  if (format === 'coordinate') return { format, selectedIds: [] };
  if (format === 'data-board') return { format, selectedEvidenceIds: [], conclusionId: null };
  return { format: 'unknown', orderedIds: [], selectedIds: [], selectedEvidenceIds: [], conclusionId: null };
}

function evaluateMission(mission, player = {}) {
  if (!validateMission(mission).valid) return { complete: false, reason: 'invalid_mission' };
  if (mission.format === 'transform' || mission.format === 'proof-chain') {
    const orderedIds = Array.isArray(player.orderedIds) ? player.orderedIds : [];
    const allowedSequences = Array.isArray(mission.correctSequences) && mission.correctSequences.length
      ? mission.correctSequences
      : [mission.correctIds];
    if (allowedSequences.some((sequence) => sameOrderedIds(orderedIds, sequence))) return { complete: true, reason: 'complete' };
    const prefixMatches = allowedSequences.some((sequence) => (
      orderedIds.length <= sequence.length
      && orderedIds.every((id, index) => String(id) === String(sequence[index]))
    ));
    return { complete: false, reason: prefixMatches ? 'sequence_incomplete' : 'sequence_incorrect' };
  }
  if (mission.format === 'coordinate') {
    const selectedIds = Array.isArray(player.selectedIds) ? player.selectedIds : [];
    if (sameIds(selectedIds, mission.requiredIds)) return { complete: true, reason: 'complete' };
    const validIds = new Set(mission.cells.map((cell) => String(cell.id)));
    if (!selectedIds.every((id) => validIds.has(String(id)))) return { complete: false, reason: 'selection_invalid' };
    return { complete: false, reason: selectedIds.length < mission.requiredIds.length ? 'selection_incomplete' : 'selection_incorrect' };
  }
  const selectedEvidenceIds = Array.isArray(player.selectedEvidenceIds) ? player.selectedEvidenceIds : [];
  const evidenceCorrect = sameIds(selectedEvidenceIds, mission.correctEvidenceIds);
  const conclusionCorrect = String(player.conclusionId || '') === String(mission.correctConclusionId);
  if (evidenceCorrect && conclusionCorrect) return { complete: true, reason: 'complete' };
  if (!conclusionCorrect && selectedEvidenceIds.length === 0) return { complete: false, reason: 'evidence_and_conclusion_missing' };
  if (!evidenceCorrect) return { complete: false, reason: 'evidence_incorrect' };
  return { complete: false, reason: 'conclusion_incorrect' };
}

function getMissionHint(mission, player = {}) {
  if (!mission || !MISSION_FORMATS.includes(mission.format)) return '任务加载不完整，请返回任务列表后重新进入。';
  if (mission.format === 'transform' || mission.format === 'proof-chain') {
    const count = Array.isArray(player.orderedIds) ? player.orderedIds.length : 0;
    const alternativeFirstSteps = Array.isArray(mission.correctSequences)
      ? new Set(mission.correctSequences.map((sequence) => sequence && sequence[0]).filter(Boolean).map(String))
      : new Set();
    if (count === 0 && alternativeFirstSteps.size > 1) return mission.hint || '先从已知条件出发，逐步完成任务。';
    if (count === 0 && mission.correctIds && mission.correctIds[0]) {
      const first = (mission.cards || []).find((card) => String(card.id) === String(mission.correctIds[0]));
      if (first && first.text) return `先放入第一条：${first.text}`;
    }
  }
  if (mission.format === 'coordinate') return mission.hint || '先确定横坐标和纵坐标，再点击对应格。';
  if (mission.format === 'data-board') return mission.hint || '先选出直接支持结论的证据，再选择结论。';
  return mission.hint || '先从已知条件出发，逐步完成任务。';
}

module.exports = {
  MISSION_FORMATS,
  getMissionFormat,
  generateMission,
  validateMission,
  createMissionPlayer,
  evaluateMission,
  getMissionHint,
};

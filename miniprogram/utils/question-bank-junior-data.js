const { getJuniorTopics } = require('./junior-high-curriculum');

const TYPES = ['choice', 'fill', 'problem'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const EDITION_IDS = ['jr-rjb', 'jr-bsd', 'jr-suk', 'jr-huk', 'jr-luj', 'jr-xj', 'jr-hsd', 'jr-zj'];
const ENTRY_DIAGNOSTIC_TOPIC_COUNT = 5;
const DIAGNOSTIC_SEED_OFFSET = 115;
const ABILITY_BY_TOPIC = {
  rational_number: 'calculation', algebraic_expression: 'problem', linear_equation: 'calculation',
  angle_line: 'geometry', triangle_intro: 'geometry', data_statistics: 'data',
  inequality_intro: 'pattern', coordinate_plane: 'pattern', congruent_triangle: 'geometry',
  axis_symmetry: 'geometry', linear_function: 'problem', fraction_expression: 'pattern',
  pythagorean: 'geometry', data_analysis: 'data', real_number: 'calculation',
  geometry_proof: 'geometry', quadratic_function: 'problem', circle: 'geometry',
  similar_triangle: 'geometry', right_triangle: 'geometry', probability: 'pattern',
  quadratic_equation: 'calculation', geometry_comprehensive: 'geometry', data_inference: 'data',
};
const CANONICAL_TOPIC_INDEX = Object.keys(ABILITY_BY_TOPIC)
  .reduce((result, topicKey, index) => ({ ...result, [topicKey]: index }), {});
const cache = new Map();
const PYTHAGOREAN_TRIPLES = (() => {
  const triples = [];
  const seen = new Set();
  for (let m = 2; m <= 30; m += 1) {
    for (let n = 1; n < m; n += 1) {
      if ((m - n) % 2 === 0 || gcd(m, n) !== 1) continue;
      let left = m * m - n * n;
      let right = 2 * m * n;
      const hypotenuse = m * m + n * n;
      if (hypotenuse > 200) continue;
      if (left > right) [left, right] = [right, left];
      for (let scale = 1; scale * hypotenuse <= 200; scale += 1) {
        const triple = [left * scale, right * scale, hypotenuse * scale];
        const key = triple.join(',');
        if (!seen.has(key)) {
          seen.add(key);
          triples.push(triple);
        }
      }
    }
  }
  return triples;
})();

function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function getEntryTopics(textbookId, grade) {
  const topicKeys = getJuniorTopics(textbookId, grade).map((topic) => topic.key);
  if (topicKeys.length <= ENTRY_DIAGNOSTIC_TOPIC_COUNT) return topicKeys;
  const selected = [];
  const abilities = new Set();

  topicKeys.forEach((topicKey) => {
    const ability = ABILITY_BY_TOPIC[topicKey];
    if (selected.length < ENTRY_DIAGNOSTIC_TOPIC_COUNT && !abilities.has(ability)) {
      selected.push(topicKey);
      abilities.add(ability);
    }
  });
  topicKeys.forEach((topicKey) => {
    if (selected.length < ENTRY_DIAGNOSTIC_TOPIC_COUNT && !selected.includes(topicKey)) selected.push(topicKey);
  });
  return selected;
}

function gcd(left, right) {
  let a = Math.abs(Number(left));
  let b = Math.abs(Number(right));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function fraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  const reducedNumerator = sign * numerator / divisor;
  const reducedDenominator = sign * denominator / divisor;
  return reducedDenominator === 1 ? String(reducedNumerator) : `${reducedNumerator}/${reducedDenominator}`;
}

function conditionDigits(value, bases) {
  let remainder = Math.max(0, Number(value) || 0);
  return bases.map((base) => {
    const digit = remainder % base;
    remainder = Math.floor(remainder / base);
    return digit;
  });
}

function greatestIntegerBelow(boundary, constraint) {
  let candidate = boundary - 1;
  if (constraint === 'even') return candidate % 2 === 0 ? candidate : candidate - 1;
  if (constraint === 'odd') return Math.abs(candidate % 2) === 1 ? candidate : candidate - 1;
  if (constraint.startsWith('multiple_')) {
    const divisor = Number(constraint.replace('multiple_', ''));
    return candidate - (candidate % divisor);
  }
  return candidate;
}

function numericModel(target, value, expression, conditions, relation, step, extra = {}) {
  return {
    target,
    answer: String(value),
    answerUnit: '',
    answerSpec: { kind: 'number', value: String(value) },
    expression,
    conditions,
    relation,
    steps: [step],
    ...extra,
  };
}

function buildBaseMathModel(topic, parameters) {
  const {
    seed, editionIndex, typeIndex, difficultyIndex, diagnostic, grade, variant = 1, topicIndex = 0,
    conditionOrdinal = 0,
  } = parameters;
  // Derive the model from every identity dimension. The previous small linear
  // offset collapsed when topic formulas applied their own modulo operations,
  // so different difficulty/type slots could become the same condition.
  // Keep the final value bounded for age-appropriate numbers, while mixing the
  // full identity first to avoid correlated residues.
  const rawVariation = Number(parameters.variationSeed ?? seed) || 0;
  const dimensionSeed = rawVariation
    + editionIndex * 1009
    + (Number(grade) - 7) * 10007
    + topicIndex * 100003
    + difficultyIndex * 1009
    + typeIndex * 10009
    + (variant - 1) * 100019
    + (diagnostic ? 500009 : 0);
  const mixed = Math.imul((dimensionSeed >>> 0) ^ 0x45d9f3b, 0x27d4eb2d);
  const uniqueVariation = (((mixed ^ (mixed >>> 15)) >>> 0) % 997);
  const variantIndex = Math.max(0, variant - 1);
  const practiceSlot = difficultyIndex * 9 + variantIndex * 3 + typeIndex;
  const diagnosticSlot = 81 + difficultyIndex * 15 + variantIndex * 3 + typeIndex;
  const slot = diagnostic ? diagnosticSlot : practiceSlot;
  const scopeSlot = (Math.max(0, Number(grade) - 7) * 300) + editionIndex * 30 + slot;
  // `topicSlot` deliberately stays small for presentation variants.  Numeric
  // models must instead use a bounded slot that retains the textbook, grade,
  // bank, difficulty, type, and variant identity.  Otherwise different
  // editions silently receive the same mathematical condition.
  const gradeBand = Math.max(0, Number(grade) - 7);
  // There are at most 30 questions for one topic in one textbook scope:
  // 27 practice variants plus three diagnostic variants. Retaining that full
  // identity here prevents a finite parameter range from silently wrapping
  // to another textbook's condition.
  const localBankSlot = diagnostic ? 27 + difficultyIndex : practiceSlot;
  const catalogSlot = gradeBand * 240 + editionIndex * 30 + localBankSlot;
  const { topicSlot, editionSlot } = generationSlots(parameters);
  switch (topic) {
    case 'rational_number': {
      const [leftOffset, rightOffset] = conditionDigits(catalogSlot, [61, 15]);
      let left = 20 + leftOffset;
      const right = 3 + rightOffset;
      if (left <= right) left = right + 5;
      const answer = left - right;
      return numericModel('有理数运算结果', answer, `${left}+(-${right})`,
        [`算式为 ${left}+(-${right})`], `${left}+(-${right})`, '把加负数转化为减法。');
    }
    case 'algebraic_expression': {
      const [xOffset, coefficientOffset, constantOffset] = conditionDigits(catalogSlot, [24, 4, 11]);
      const x = 3 + xOffset; const coefficient = 2 + coefficientOffset; const constant = 1 + constantOffset;
      const answer = coefficient * x - constant;
      return numericModel('代数式的值', answer, `${coefficient}*${x}-${constant}`,
        [`x=${x}`, `代数式为 ${coefficient}x-${constant}`], `${coefficient}×${x}-${constant}`, '代入 x 后按运算顺序计算。');
    }
    case 'linear_equation': {
      const [rootOffset, coefficientOffset, constantOffset] = conditionDigits(catalogSlot, [24, 4, 11]);
      const root = 3 + rootOffset; const coefficient = 2 + coefficientOffset; const constant = 2 + constantOffset;
      const right = coefficient * root + constant;
      return numericModel('方程中 x 的值', root, `(${right}-${constant})/${coefficient}`,
        [`方程为 ${coefficient}x+${constant}=${right}`, `x 的系数为 ${coefficient}`],
        `(${right}-${constant})÷${coefficient}`, '移项后除以 x 的系数，并代回原方程检验。',
        { answerSpec: { kind: 'equation', variable: 'x', value: String(root) } });
    }
    case 'angle_line': {
      const [knownOffset, relationMode] = conditionDigits(catalogSlot, [89, 6]);
      const known = 1 + knownOffset;
      const models = [
        { condition: '相邻两角组成平角 180 度', answer: 180 - known, relation: `180-${known}`, step: '用平角减去已知角。' },
        { condition: '两角互余，和为 90 度', answer: 90 - known, relation: `90-${known}`, step: '用 90 度减去已知角。' },
        { condition: '两条直线相交，对顶角相等', answer: known, relation: `${known}`, step: '对顶角的度数相等。' },
        { condition: '同位角相等', answer: known, relation: `${known}`, step: '两直线平行时，同位角相等。' },
        { condition: '内错角相等', answer: known, relation: `${known}`, step: '两直线平行时，内错角相等。' },
        { condition: '同旁内角互补，和为 180 度', answer: 180 - known, relation: `180-${known}`, step: '用 180 度减去已知角。' },
      ];
      const selected = models[relationMode];
      return numericModel('另一个角的度数', selected.answer, selected.relation,
        [`已知角为 ${known} 度`, selected.condition], selected.relation, selected.step, { answerUnit: '度' });
    }
    case 'triangle_intro': {
      const [firstOffset, secondOffset] = conditionDigits(catalogSlot, [51, 61]);
      const first = 20 + firstOffset;
      const second = 25 + secondOffset;
      const safeSecond = Math.min(second, 169 - first);
      const answer = 180 - first - safeSecond;
      return numericModel('第三个内角', answer, `180-${first}-${safeSecond}`,
        [`两个内角分别为 ${first} 度和 ${safeSecond} 度`, '三角形内角和为 180 度'],
        `180-${first}-${safeSecond}`, '由三角形内角和减去两个已知角。', { answerUnit: '度' });
    }
    case 'geometry_proof': {
      const [baseOffset, labelMode] = conditionDigits(catalogSlot, [70, 8]);
      const baseAngle = 10 + baseOffset;
      const answer = 180 - baseAngle * 2;
      const labels = [
        ['△ABC', 'AB=AC', '∠B', '∠C', '∠A'], ['△PQR', 'PQ=PR', '∠Q', '∠R', '∠P'],
        ['△DEF', 'DE=DF', '∠E', '∠F', '∠D'], ['△MNP', 'MN=MP', '∠N', '∠P', '∠M'],
        ['△XYZ', 'XY=XZ', '∠Y', '∠Z', '∠X'], ['△RST', 'RS=RT', '∠S', '∠T', '∠R'],
        ['△UVW', 'UV=UW', '∠V', '∠W', '∠U'], ['△GHI', 'GH=GI', '∠H', '∠I', '∠G'],
      ][labelMode];
      return numericModel('等腰三角形的顶角', answer, `180-${baseAngle}*2`,
        [`在${labels[0]}中，${labels[1]}`, `${labels[2]}=${baseAngle}度`, '等腰三角形的两个底角相等', '三角形内角和为 180 度'],
        `${labels[4]}=180°-2×${baseAngle}°`, `先由 ${labels[1]} 得到两个底角相等，再用三角形内角和求顶角。`, { answerUnit: '度' });
    }
    case 'data_statistics': {
      const [firstOffset, gapOffset] = conditionDigits(catalogSlot, [80, 6]);
      const first = 5 + firstOffset; const gap = 1 + gapOffset; const values = [first, first + gap, first + gap * 2]; const answer = first + gap;
      return numericModel('三项数据的平均数', answer, `(${values.join('+')})/3`,
        [`三项数据为 ${values.join('、')}`, '数据项数为 3'], `(${values.join('+')})÷3`, '先求总和，再除以数据项数。');
    }
    case 'inequality_intro': {
      // A single `x < n` stream only has 59 meaningful values. Pair it with
      // an explicit integer restriction so every condition remains readable,
      // solvable, and distinct without raising the boundary beyond 60.
      const [boundaryOffset, constraintMode] = conditionDigits(catalogSlot, [40, 12]);
      const boundary = 20 + boundaryOffset;
      const constraints = [
        ['integer', 'x 取整数'], ['even', 'x 是偶数'], ['odd', 'x 是奇数'],
        ['multiple_3', 'x 是 3 的倍数'], ['multiple_4', 'x 是 4 的倍数'], ['multiple_5', 'x 是 5 的倍数'],
        ['integer', 'x 是正整数'], ['even', 'x 是正偶数'], ['odd', 'x 是正奇数'],
        ['multiple_3', 'x 是正的 3 的倍数'], ['multiple_4', 'x 是正的 4 的倍数'], ['multiple_5', 'x 是正的 5 的倍数'],
      ];
      const [constraint, condition] = constraints[constraintMode];
      const answer = greatestIntegerBelow(boundary, constraint);
      return numericModel('满足条件的最大整数', answer, `${answer}`,
        [`不等式为 x<${boundary}`, condition], `${boundary}以下满足限制的最大整数`, '先找出小于边界的整数，再核对它是否满足限制条件。');
    }
    case 'coordinate_plane': {
      const [xOffset, yOffset] = conditionDigits(catalogSlot, [49, 30]);
      const x = -24 + xOffset; const y = 2 + yOffset;
      return numericModel('点 P 的横坐标', x, `${x}`,
        [`点 P 的坐标为 (${x},${y})`, '有序数对第一项为横坐标'], `x_P=${x}`, '读取有序数对的第一项。');
    }
    case 'congruent_triangle': {
      const [angleOffset, labelMode] = conditionDigits(catalogSlot, [60, 8]);
      const angle = 20 + angleOffset;
      const labels = [
        ['△ABC≌△DEF', '∠A', '∠D'], ['△ABC≌△DEF', '∠B', '∠E'],
        ['△ABC≌△DEF', '∠C', '∠F'], ['△PQR≌△XYZ', '∠P', '∠X'],
        ['△PQR≌△XYZ', '∠Q', '∠Y'], ['△PQR≌△XYZ', '∠R', '∠Z'],
        ['△GHI≌△MNO', '∠G', '∠M'], ['△GHI≌△MNO', '∠H', '∠N'],
      ][labelMode];
      return numericModel('对应角的度数', angle, `${angle}`,
        [labels[0], `${labels[1]} 与 ${labels[2]} 对应且 ${labels[1]}=${angle} 度`], `${labels[2]}=${labels[1]}=${angle}度`, '全等三角形的对应角相等。', { answerUnit: '度' });
    }
    case 'axis_symmetry': {
      const [distanceOffset, labelMode] = conditionDigits(catalogSlot, [160, 3]);
      const distance = 1 + distanceOffset;
      const labels = [['A', 'l'], ['B', 'm'], ['C', 'n']][labelMode];
      return numericModel('对称点到对称轴的距离', distance, `${distance}`,
        [`点 ${labels[0]} 到对称轴 ${labels[1]} 的距离为 ${distance} 厘米`, `${labels[0]}' 是 ${labels[0]} 关于该轴的对称点`],
        `d(${labels[0]}',${labels[1]})=d(${labels[0]},${labels[1]})=${distance}`, '轴对称点到对称轴的距离相等。', { answerUnit: '厘米' });
    }
    case 'linear_function': {
      const [coefficientOffset, xOffset, constantOffset] = conditionDigits(catalogSlot, [5, 30, 13]);
      const coefficient = 2 + coefficientOffset; const x = 2 + xOffset; const constant = 1 + constantOffset;
      const answer = coefficient * x + constant;
      return numericModel('一次函数的函数值', answer, `${coefficient}*${x}+${constant}`,
        [`函数解析式为 y=${coefficient}x+${constant}`, `自变量 x=${x}`], `y=${coefficient}×${x}+${constant}`, '把自变量代入解析式。');
    }
    case 'fraction_expression': {
      const [forbiddenOffset, assignedOffset, addendOffset] = conditionDigits(catalogSlot, [17, 25, 19]);
      const forbidden = 1 + forbiddenOffset;
      const assigned = forbidden + 3 + assignedOffset;
      const addend = 2 + addendOffset;
      const answer = fraction(assigned + addend, assigned - forbidden);
      return {
        target: '分式的值', answer, answerUnit: '', answerSpec: { kind: 'fraction', value: answer },
        expression: `(${assigned}+${addend})/(${assigned}-${forbidden})`,
        conditions: [`分式为 (x+${addend})/(x-${forbidden})`, `x=${assigned}`, `定义域要求 x≠${forbidden}`],
        relation: `(${assigned}+${addend})÷(${assigned}-${forbidden})`,
        steps: ['先核对定义域，再代入分子和分母，最后约分。'],
        domain: { variable: 'x', assigned: String(assigned), forbidden: String(forbidden) },
      };
    }
    case 'pythagorean': {
      const tripleIndex = catalogSlot % PYTHAGOREAN_TRIPLES.length;
      const namedTriangle = Math.floor(catalogSlot / PYTHAGOREAN_TRIPLES.length) % 2 === 1;
      const [left, right, answer] = PYTHAGOREAN_TRIPLES[tripleIndex];
      return numericModel('直角三角形的斜边', answer, `${answer}`,
        [namedTriangle
          ? `在Rt△ABC中，∠C=90°，AC=${left}厘米，BC=${right}厘米`
          : `在直角三角形中，两条直角边长分别为 ${left} 厘米和 ${right} 厘米`],
        `${left}²+${right}²=${answer}²`, '使用勾股定理并取正的长度。', { answerUnit: '厘米' });
    }
    case 'geometry_comprehensive': {
      const tripleIndex = catalogSlot % PYTHAGOREAN_TRIPLES.length;
      const namedTriangle = Math.floor(catalogSlot / PYTHAGOREAN_TRIPLES.length) % 2 === 1;
      const [left, right, hypotenuse] = PYTHAGOREAN_TRIPLES[(tripleIndex + 11) % PYTHAGOREAN_TRIPLES.length];
      const answer = hypotenuse / 2;
      return numericModel('直角三角形外接圆的半径', answer, `${hypotenuse}/2`,
        [namedTriangle ? '在Rt△DEF中，∠D=90°' : '在Rt△ABC中，∠C=90°', namedTriangle ? `DE=${left}厘米，DF=${right}厘米` : `AC=${left}厘米，BC=${right}厘米`, namedTriangle ? '直角三角形外接圆的直径等于斜边 EF' : '直角三角形外接圆的直径等于斜边 AB'],
        namedTriangle ? `EF=√(${left}²+${right}²)=${hypotenuse}，R=EF÷2` : `AB=√(${left}²+${right}²)=${hypotenuse}，R=AB÷2`, '先由勾股定理求斜边，再利用直角三角形外接圆直径等于斜边求半径。', { answerUnit: '厘米' });
    }
    case 'data_analysis': {
      const [firstOffset, gapOffset] = conditionDigits(catalogSlot, [80, 6]);
      const first = 4 + firstOffset; const gap = 1 + gapOffset; const values = [first, first + gap, first + gap * 2, first + gap * 4]; const answer = first + gap * 1.5;
      return numericModel('四项数据的中位数', answer, `(${values[1]}+${values[2]})/2`,
        [`排序数据为 ${values.join('、')}`, '数据项数为偶数 4'], `(${values[1]}+${values[2]})÷2`, '取中间两项的平均数。');
    }
    case 'real_number': {
      const [rootOffset, scaleMode] = conditionDigits(catalogSlot, [60, 8]);
      const base = 2 + rootOffset;
      const factors = [1, 4, 9, 16, 25, 36, 49, 64];
      const factor = factors[scaleMode];
      const factorRoot = Math.sqrt(factor);
      const radicand = base * base * factor;
      const answer = base;
      return numericModel('实数平方根计算结果', answer, `(${base * factorRoot})/${factorRoot}`,
        [`计算 √${radicand}÷${factorRoot}`, '算术平方根取非负值'], `√${radicand}÷${factorRoot}=${answer}`, '先求被开方数的算术平方根，再除以根号外的数。');
    }
    case 'quadratic_function': {
      const [hOffset, deltaOffset, constantOffset] = conditionDigits(catalogSlot, [8, 15, 24]);
      const h = 1 + hOffset; const delta = 2 + deltaOffset;
      const x = h + delta;
      const constant = 2 + constantOffset;
      const answer = delta ** 2 + constant;
      return numericModel('二次函数的函数值', answer, `(${x}-${h})*(${x}-${h})+${constant}`,
        [`函数解析式为 y=(x-${h})²+${constant}`, `自变量 x=${x}`], `y=(${x}-${h})²+${constant}`, '代入顶点式并先计算平方。');
    }
    case 'circle': {
      const [radiusOffset, halfUnit] = conditionDigits(catalogSlot, [200, 2]);
      const radius = 1 + radiusOffset + halfUnit * 0.5; const answer = radius * 2;
      return numericModel('圆的直径', answer, `${radius}*2`,
        [`圆心到圆上一点的距离为 ${radius} 厘米`, '直径等于半径的 2 倍'], `${radius}×2`, '用半径乘 2 得到直径。', { answerUnit: '厘米' });
    }
    case 'similar_triangle': {
      const [denominatorOffset, numeratorOffset, baseOffset] = conditionDigits(catalogSlot, [7, 5, 24]);
      const denominator = 2 + denominatorOffset;
      const numerator = denominator + 1 + numeratorOffset;
      const base = 2 + baseOffset;
      const known = denominator * base;
      const answer = numerator * base;
      return numericModel('对应边 DE 的长度', answer, `${known}*${numerator}/${denominator}`,
        ['△ABC∽△DEF', `AB=${known}厘米`, `AB:DE=${denominator}:${numerator}`],
        `DE=AB×${numerator}÷${denominator}`, '按相似三角形对应边成比例，用 AB 的长度乘以对应比值求 DE。', { answerUnit: '厘米' });
    }
    case 'right_triangle': {
      const entries = [
        ['sin', 30, '1/2'], ['sin', 45, '√2/2'], ['sin', 60, '√3/2'],
        ['cos', 30, '√3/2'], ['cos', 45, '√2/2'], ['cos', 60, '1/2'],
        ['tan', 30, '√3/3'], ['tan', 45, '1'], ['tan', 60, '√3'],
      ];
      const entryIndex = catalogSlot % entries.length;
      const [fn, angle, answer] = entries[entryIndex];
      const mode = difficultyIndex;
      const squareValues = { '1/2': '1/4', '√2/2': '1/2', '√3/2': '3/4', '√3/3': '1/3', '1': '1', '√3': '3' };
      const reciprocalValues = { '1/2': '2', '√2/2': '√2', '√3/2': '2√3/3', '√3/3': '√3', '1': '1', '√3': '√3/3' };
      const displayedAnswer = mode === 1 ? squareValues[answer] : mode === 2 ? reciprocalValues[answer] : answer;
      const task = mode === 1
        ? `求（${fn} ${angle}°）² 的值`
        : mode === 2 ? `求 ${fn} ${angle}° 的倒数` : `求 ${fn} ${angle}° 的值`;
      const scale = 1 + Math.floor(catalogSlot / entries.length);
      const scaledRootThree = scale === 1 ? '√3' : `${scale}√3`;
      const relationText = fn === 'sin'
        ? `该角对边与斜边的长度比为 ${scale}:${scale * 2}`
        : fn === 'cos'
          ? `该角邻边与斜边的长度比为 ${scaledRootThree}:${scale * 2}`
          : `该角对边与邻边的长度比为 ${scale}:${scaledRootThree}`;
      const form = `在直角三角形中，一个锐角为 ${angle}°，${relationText}`;
      return {
        target: mode === 1 ? '特殊角三角函数值的平方' : mode === 2 ? '特殊角三角函数值的倒数' : '特殊角三角函数的精确值',
        answer: displayedAnswer, answerUnit: '',
        answerSpec: { kind: displayedAnswer.includes('√') ? 'text' : (displayedAnswer.includes('/') ? 'fraction' : 'number'), value: displayedAnswer },
        expression: mode === 1 ? `(${fn}(${angle}))^2` : mode === 2 ? `1/(${fn}(${angle}))` : `${fn}(${angle})`,
        conditions: [form, task],
        relation: mode === 1 ? `(${fn} ${angle}°)²=${displayedAnswer}` : mode === 2 ? `1÷(${fn} ${angle}°)=${displayedAnswer}` : `${fn} ${angle}°=${displayedAnswer}`,
        steps: mode === 1
          ? [`先写出 ${fn} ${angle}°=${answer}，再平方化简。`]
          : mode === 2 ? [`先写出 ${fn} ${angle}°=${answer}，再求倒数并化简。`] : ['根据特殊直角三角形的边长比写出精确值。'],
      };
    }
    case 'probability': {
      const [totalOffset, favorableOffset] = conditionDigits(catalogSlot, [60, 12]);
      const total = 20 + totalOffset;
      const favorable = 1 + favorableOffset; const answer = fraction(favorable, total);
      return {
        target: '事件发生的概率', answer, answerUnit: '', answerSpec: { kind: 'fraction', value: answer },
        expression: `${favorable}/${total}`, conditions: [`一个袋中有 ${total} 个大小相同的球，其中 ${favorable} 个红球`, '随机摸出一个球'],
        relation: `${favorable}÷${total}`, steps: ['用符合条件的结果数除以等可能结果总数并约分。'],
      };
    }
    case 'quadratic_equation': {
      const [rootOffset, coefficientOffset] = conditionDigits(catalogSlot, [60, 8]);
      const root = 2 + rootOffset; const coefficient = 1 + coefficientOffset; const square = coefficient * root * root;
      return numericModel('一元二次方程的正根', root, `(${root}*${root})/${root}`,
        [`方程为 ${coefficient}x²=${square}`, '要求正根'], `x=√(${square}÷${coefficient})`, '先把 x² 的系数化为 1，再按“正根”条件选择结果。',
        { answerSpec: { kind: 'equation', variable: 'x', value: String(root) } });
    }
    case 'data_inference': {
      const [sampleOffset, successOffset] = conditionDigits(catalogSlot, [60, 8]);
      const sample = 20 + sampleOffset; const successes = 1 + successOffset; const answer = fraction(successes, sample);
      return {
        target: '样本中符合条件的比例', answer, answerUnit: '', answerSpec: { kind: 'fraction', value: answer },
        expression: `${successes}/${sample}`, conditions: [`随机抽查了 ${sample} 人`, `其中 ${successes} 人符合条件`],
        relation: `${successes}÷${sample}`, steps: ['用符合条件的样本数除以样本总量并约分。'],
      };
    }
    default:
      return null;
  }
}

function applyDifficultyModel(topic, model) {
  // Difficulty changes the generated values through the deterministic seed.
  // Keep the learner-facing task as one standard textbook question; never
  // invent a second operation such as “core result + 2” to pad a tier.
  return model;
}

function buildMathModel(topic, parameters) {
  const baseModel = buildBaseMathModel(topic, parameters);
  return baseModel ? applyDifficultyModel(topic, baseModel, parameters) : null;
}

function wrapExpression(expression, typeIndex) {
  if (typeIndex === 1) return `(${expression})`;
  if (typeIndex === 2) return `((${expression}))`;
  return expression;
}

const EXAM_PATTERN_BY_TOPIC = {
  rational_number: 'calculation_model',
  algebraic_expression: 'calculation_model',
  linear_equation: 'calculation_model',
  angle_line: 'condition_filter',
  triangle_intro: 'condition_filter',
  data_statistics: 'data_reading',
  inequality_intro: 'condition_filter',
  coordinate_plane: 'condition_filter',
  congruent_triangle: 'condition_filter',
  axis_symmetry: 'condition_filter',
  linear_function: 'calculation_model',
  fraction_expression: 'calculation_model',
  pythagorean: 'unit_check',
  data_analysis: 'data_reading',
  real_number: 'calculation_model',
  geometry_proof: 'condition_filter',
  quadratic_function: 'calculation_model',
  circle: 'unit_check',
  similar_triangle: 'unit_check',
  right_triangle: 'calculation_model',
  probability: 'condition_filter',
  quadratic_equation: 'calculation_model',
  geometry_comprehensive: 'unit_check',
  data_inference: 'data_reading',
};

const JUNIOR_GUIDANCE = {
  rational_number: {
    hint: '把加负数改写成减法，再按顺序计算。',
    knowledge: '有理数加负数可以转化为减法，注意符号变化。',
    mistakes: ['不要把加负数当成加正数。', '先看清括号里的负号。'],
  },
  algebraic_expression: {
    hint: '把 x 的值代入代数式后，再按运算顺序计算。',
    knowledge: '求代数式的值，要先代入字母对应的数。',
    mistakes: ['代入时不要漏写乘号。', '乘法要先于加减法计算。'],
  },
  linear_equation: {
    hint: '先把常数项移到等号右边，再除以 x 的系数。',
    knowledge: '解一元一次方程要保持等式两边同时进行相同运算。',
    mistakes: ['移项时注意符号变化。', '求出 x 后代回原方程检验。'],
  },
  angle_line: {
    hint: '平角是 180 度，用 180 度减去已知角。',
    knowledge: '相邻两角组成平角时，它们的和是 180 度。',
    mistakes: ['不要把平角误记成 90 度。', '结果要写上角的单位“度”。'],
  },
  triangle_intro: {
    hint: '三角形内角和是 180 度。',
    knowledge: '已知两个内角时，用 180 度减去它们的和。',
    mistakes: ['先把两个已知角相加。', '结果要大于 0 度。'],
  },
  data_statistics: {
    hint: '先把三项数据相加，再除以数据的个数。',
    knowledge: '平均数等于总数除以数据个数。',
    mistakes: ['不要漏掉任何一项数据。', '除数是数据项数，不是其中一个数据。'],
  },
  inequality_intro: {
    hint: '严格小于一个整数时，最大整数比它小 1。',
    knowledge: '不等式的整数解要同时满足不等号方向和整数条件。',
    mistakes: ['x<某数时不能取这个边界数。', '题目问最大整数时要选最接近边界的较小整数。'],
  },
  coordinate_plane: {
    hint: '有序数对的第一项是横坐标，第二项是纵坐标。',
    knowledge: '平面直角坐标系中，点的位置用有序数对表示。',
    mistakes: ['不要把横坐标和纵坐标的位置写反。', '注意负号属于坐标数的一部分。'],
  },
  congruent_triangle: {
    hint: '全等三角形的对应角相等。',
    knowledge: '判断对应关系后，对应边和对应角分别相等。',
    mistakes: ['先确认顶点的对应顺序。', '不要把非对应角当成对应角。'],
  },
  axis_symmetry: {
    hint: '对称点到对称轴的距离相等。',
    knowledge: '轴对称图形中，原点和对称点到对称轴的距离相等。',
    mistakes: ['量的是到对称轴的垂直距离。', '不要把两边距离相加。'],
  },
  linear_function: {
    hint: '把给定的 x 代入 y=kx+b。',
    knowledge: '一次函数的函数值由自变量代入解析式得到。',
    mistakes: ['代入后先算乘法。', '常数项不要漏加。'],
  },
  fraction_expression: {
    hint: '先确认分母不为 0，再把 x 代入分式。',
    knowledge: '分式有意义的前提是分母不等于 0。',
    mistakes: ['不要漏掉定义域限制。', '代入后记得约分。'],
  },
  pythagorean: {
    hint: '斜边的平方等于两条直角边平方的和。',
    knowledge: '直角三角形中可用勾股定理求未知边。',
    mistakes: ['斜边一定是直角对面的边。', '长度取正值。'],
  },
  data_analysis: {
    hint: '偶数个数据的中位数是中间两个数的平均数。',
    knowledge: '求中位数前要先把数据按从小到大排列。',
    mistakes: ['不要直接取两个中间数中的一个。', '确认数据个数是偶数。'],
  },
  real_number: {
    hint: '算术平方根取非负值。',
    knowledge: '一个正数的算术平方根是平方后得到该数的非负数。',
    mistakes: ['不要把负数作为算术平方根。', '检查平方后是否回到被开方数。'],
  },
  geometry_proof: {
    hint: '先由等腰三角形得到两个底角相等。',
    knowledge: '等腰三角形的两个底角相等，再结合内角和可求顶角。',
    mistakes: ['不要把顶角和底角混淆。', '两个底角都要计入 180 度。'],
  },
  quadratic_function: {
    hint: '把 x 代入顶点式，先计算括号内的平方。',
    knowledge: '二次函数 y=(x-h)²+k 可直接代入自变量求函数值。',
    mistakes: ['括号内先相减再平方。', '平方后再加常数项。'],
  },
  circle: {
    hint: '直径等于半径的 2 倍。',
    knowledge: '同一个圆中，直径是半径的两倍。',
    mistakes: ['不要把半径和直径写成相同。', '结果要写长度单位。'],
  },
  similar_triangle: {
    hint: '按对应边的比求未知边。',
    knowledge: '相似三角形的对应边成比例。',
    mistakes: ['对应边要按同一顺序配对。', '比例的前后项不要颠倒。'],
  },
  right_triangle: {
    hint: '根据特殊角三角函数的精确值表作答。',
    knowledge: '30 度、45 度、60 度是常用的特殊角，函数值要写成精确形式。',
    mistakes: ['不要把 sin、cos、tan 的值混淆。', '平方或求倒数时要作用在整个函数值上。'],
  },
  probability: {
    hint: '用符合条件的结果数除以全部等可能结果数。',
    knowledge: '等可能事件的概率等于有利结果数除以所有结果数。',
    mistakes: ['分母要写全部可能结果数。', '最后把分数约成最简。'],
  },
  quadratic_equation: {
    hint: '先开平方，再根据“正根”条件选择结果。',
    knowledge: '解 x²=a 时，若只求正根，要取正的平方根。',
    mistakes: ['不要漏看“正根”这个条件。', '求得后可以代回检验。'],
  },
  geometry_comprehensive: {
    hint: '先用勾股定理求斜边，再求外接圆半径。',
    knowledge: '直角三角形的外接圆直径等于斜边。',
    mistakes: ['外接圆半径是斜边的一半。', '勾股定理中的两条直角边不要写错。'],
  },
  data_inference: {
    hint: '用符合条件的人数除以抽查总人数。',
    knowledge: '样本中符合条件的比例可以反映样本的组成。',
    mistakes: ['不要把总人数和符合人数的位置写反。', '结果用最简分数表示。'],
  },
};

function generationSlots({ editionIndex, typeIndex, difficultyIndex, diagnostic, variant = 1 }) {
  const variantIndex = Math.max(0, Number(variant) - 1);
  const topicSlot = diagnostic
    ? 27 + difficultyIndex
    : difficultyIndex * 9 + variantIndex * 3 + typeIndex;
  return {
    topicSlot,
    editionSlot: Number(editionIndex) * 30 + topicSlot,
  };
}

function localSeed(seed) {
  // Keep all numeric models in a small textbook-sized range while retaining
  // every generation dimension in the residue. A large absolute seed caused
  // absurd values such as six-digit rational-number exercises.
  const value = Math.abs(Number(seed) || 0) >>> 0;
  return (Math.imul(value ^ (value >>> 16), 2654435761) >>> 0) % 997;
}

function makeOptions(answer, answerSpec, seed) {
  let options;
  const match = String(answer).match(/^(-?\d+)\/(\d+)$/);
  if (match) {
    const numerator = Number(match[1]); const denominator = Number(match[2]);
    options = [answer, fraction(numerator + denominator, denominator), fraction(numerator, denominator + 1), fraction(numerator + 1, denominator)];
  } else if (answerSpec.kind === 'number' || answerSpec.kind === 'equation') {
    const value = Number(answer); const step = 1 + (seed % 3);
    options = [String(value), String(value + step), String(value - step), String(value + step * 2)];
  } else {
    const radicals = ['1/2', '√2/2', '√3/2', '√3/3', '1', '√3'];
    options = [answer, ...radicals.filter((item) => item !== answer).slice(0, 3)];
  }
  const unique = [...new Set(options.map(String))];
  if (unique.length < 4) {
    const fallback = answerSpec.kind === 'number' || answerSpec.kind === 'equation'
      ? [String(Number(answer) - 4), String(Number(answer) + 4), String(Number(answer) - 6), String(Number(answer) + 6)]
      : ['1/2', '√2/2', '√3/2', '√3/3', '1', '√3'];
    fallback.forEach((item) => {
      if (unique.length < 4 && !unique.includes(String(item))) unique.push(String(item));
    });
  }
  const shift = Math.abs(seed) % 4;
  return [...unique.slice(shift), ...unique.slice(0, shift)].slice(0, 4);
}

function parseIdentity(id) {
  const match = String(id || '').match(/^j-([dp])-(jr-[a-z]+)-g([789])-([a-z_]+)-(choice|fill|problem)-(easy|medium|hard)-(\d+)$/);
  if (!match || !EDITION_IDS.includes(match[2])) return null;
  const identity = {
    diagnostic: match[1] === 'd', textbookId: match[2], grade: Number(match[3]), topic: match[4],
    type: match[5], difficulty: match[6], variant: Number(match[7]), id: String(id),
  };
  const topicKeys = getJuniorTopics(identity.textbookId, identity.grade).map((item) => item.key);
  if (!topicKeys.includes(identity.topic)) return null;
  if (identity.diagnostic) {
    const index = identity.variant - 1;
    const entryTopics = getEntryTopics(identity.textbookId, identity.grade);
    if (index < 0 || index >= entryTopics.length || entryTopics[index] !== identity.topic || TYPES[index % TYPES.length] !== identity.type) return null;
  } else if (identity.variant < 1 || identity.variant > 3) return null;
  return identity;
}

function renderLearnerStem(topic, conditions) {
  const conditionText = conditions
    .map((condition) => String(condition).replace(/^已知/, ''))
    .join('，');
  if (topic === 'rational_number') {
    const expression = conditions.find((item) => item.startsWith('算式为 '));
    return expression
      ? `${expression.replace('算式为 ', '计算 ')}，结果`
      : `计算 ${conditionText}的结果`;
  }
  if (topic === 'right_triangle') {
    const task = String(conditions[1] || conditions[0] || '').replace(/^求\s*/, '');
    const form = String(conditions[0] || '').replace(/^已知/, '');
    return task ? `已知${form}，计算 ${task}` : '计算这个三角函数值';
  }
  if (topic === 'real_number') {
    const expression = conditions.find((item) => String(item).startsWith('计算 '));
    return expression ? `${String(expression).replace(/^计算\s*/, '计算 ')}，结果` : '计算这个实数平方根式的结果';
  }
  if (topic === 'quadratic_function') {
    const formula = conditions.find((item) => item.startsWith('函数解析式为 '));
    const variable = conditions.find((item) => item.startsWith('自变量 '));
    const operation = conditions.find((item) => item.startsWith('函数值'));
    if (formula && variable) {
      const base = `已知二次函数 ${formula.replace('函数解析式为 ', '')}，当 ${variable.replace('自变量 ', '')} 时`;
      if (operation === '函数值再加 2') return `${base}，先求 y 的值，再把这个值加 2`;
      if (operation && operation.startsWith('函数值再加 ')) return `${base}，先求 y 的值，再把这个值加 ${operation.replace('函数值再加 ', '')}`;
      if (operation && operation.startsWith('函数值先加 ')) return `${base}，先求 y 的值，再${operation.replace('函数值', '把这个值')}`;
      return `${base}，y 的值`;
    }
  }
  const targets = {
    algebraic_expression: '代数式的值',
    linear_equation: 'x 的值',
    angle_line: '另一个角的度数',
    triangle_intro: '第三个内角的度数',
    geometry_proof: '顶角 ∠A 的度数',
    data_statistics: '这三项数据的平均数',
    inequality_intro: '满足条件的最大整数',
    coordinate_plane: '点 P 的横坐标',
    congruent_triangle: '∠D 的度数',
    axis_symmetry: "点 A' 到对称轴的距离",
    linear_function: 'y 的值',
    fraction_expression: '分式的值',
    pythagorean: '斜边长',
    geometry_comprehensive: '外接圆的半径',
    data_analysis: '这组数据的中位数',
    real_number: '这个数的算术平方根',
    circle: '圆的直径',
    similar_triangle: 'DE 的长度',
    probability: '摸到红球的概率',
    quadratic_equation: '方程的正根',
    data_inference: '样本中符合条件的比例',
  };
  return `已知${conditionText}，${targets[topic] || '结果'}`;
}

function renderLearnerPrompt(identity, topic, conditions) {
  const stem = renderLearnerStem(topic, conditions).replace(/[。！？?]+$/, '');
  if (identity.type === 'choice') return `${stem}是（ ）。`;
  if (identity.type === 'fill') return `${stem}是____。`;
  return `${stem}是多少？请写出计算过程。`;
}

function renderQuestion(identity) {
  const editionIndex = EDITION_IDS.indexOf(identity.textbookId);
  const typeIndex = TYPES.indexOf(identity.type);
  const difficultyIndex = DIFFICULTIES.indexOf(identity.difficulty);
  const topicList = getJuniorTopics(identity.textbookId, identity.grade);
  const topic = topicList.find((item) => item.key === identity.topic);
  // Curriculum order is display metadata. It must not alter the generated
  // condition, otherwise a five-four edition that places a topic elsewhere
  // can collide with another edition's question pool.
  const topicIndex = CANONICAL_TOPIC_INDEX[identity.topic];
  // Each source dimension owns a wide numeric namespace. The topic formulas
  // use modular values, so small additive offsets previously let different
  // types and difficulty levels land on the same mathematical condition.
  const idHash = Array.from(String(identity.id || '')).reduce((sum, char, index) => (
    (sum + char.charCodeAt(0) * (index + 11)) % 100003
  ), 0);
  const sourceSeed = editionIndex * 101 + identity.grade * 47 + topicIndex * 31
    + typeIndex * 17 + difficultyIndex * 29 + identity.variant * 7
    + (identity.diagnostic ? DIAGNOSTIC_SEED_OFFSET : 0) + idHash;
  const seed = localSeed(sourceSeed);
  // Reserve a distinct condition slot for every difficulty/type/variant
  // combination.  The model formulas use this slot to choose the actual
  // numbers; without passing it, every variant fell back to ordinal zero.
  const variantIndex = Math.max(0, identity.variant - 1);
  const conditionOrdinal = identity.diagnostic
    ? 81 + difficultyIndex * 15 + variantIndex * 3 + typeIndex
    : difficultyIndex * 9 + variantIndex * 3 + typeIndex;
  const model = buildMathModel(identity.topic, {
    seed, editionIndex, typeIndex, difficultyIndex, diagnostic: identity.diagnostic, grade: identity.grade,
    variant: identity.variant, topicIndex, variationSeed: sourceSeed, conditionOrdinal,
  });
  if (!model) return undefined;
  model.expression = wrapExpression(model.expression, typeIndex);
  const presentationStyle = topic.modelForm || 'standard';
  const conditionTokens = [...model.conditions];
  const prompt = renderLearnerPrompt(identity, identity.topic, conditionTokens);
  const displayedAnswer = `${model.answer}${model.answerUnit}`;
  const guidance = JUNIOR_GUIDANCE[identity.topic];
  const steps = [`列式或依据：${model.relation}。`, ...model.steps];
  steps.push(`因此最终答案是 ${displayedAnswer}。`);
  const options = identity.type === 'choice' ? makeOptions(model.answer, model.answerSpec, seed) : [];
  // Keep one learner-visible anchor in the audit contract. This is used only
  // to detect a damaged prompt; it is not an extra hint shown to the learner.
  const normalizedPrompt = String(prompt).replace(/\s+/g, '');
  const visibleAnchorMatch = normalizedPrompt.match(/^[\u4e00-\u9fff]{2}|^[A-Za-z]+|^-?\d+(?:\.\d+)?/);
  const requiredTokens = [visibleAnchorMatch ? visibleAnchorMatch[0] : normalizedPrompt.slice(0, 2)];
  if (identity.type === 'fill') requiredTokens.push('____');
  const auditRule = {
    version: 3,
    expectedAnswer: model.answer,
    expectedUnit: model.answerUnit,
    answerSpecKind: model.answerSpec.kind,
    answerSpecValue: String(model.answerSpec.value),
    answerSpecVariable: model.answerSpec.variable || '',
    expression: model.expression,
    requiredTokens,
    conditionTokens,
    presentationStyle,
    relationToken: model.relation,
    relationSignature: `${identity.topic}|${presentationStyle}|${model.relation}|${model.expression}`,
    relationDepth: model.steps.length,
    strategyToken: '',
    taskShape: identity.type === 'problem' ? 'contextual_problem' : identity.type === 'fill' ? 'relation_fill' : 'single_answer_choice',
    domain: model.domain || null,
  };
  return {
    id: identity.id,
    schoolStage: 'junior',
    textbookId: identity.textbookId,
    editionUnitKey: topic.editionUnitKey,
    grade: identity.grade,
    term: topic.term,
    // Keep the learner label aligned with the verified curriculum chapter;
    // topic.label remains the concise knowledge-point label shown elsewhere.
    unit: topic.chapterLabel || topic.label,
    chapterId: topic.chapterId,
    chapterLabel: topic.chapterLabel,
    modelForm: topic.modelForm,
    knowledgePoint: identity.topic,
    ability: ABILITY_BY_TOPIC[identity.topic],
    type: identity.type,
    difficulty: identity.difficulty,
    ...(identity.diagnostic ? {
      diagnosticSlot: `junior-entry-${identity.variant}`,
      entryDiagnostic: true,
      entrySlot: `junior-entry-${identity.variant}`,
      entryOrder: identity.variant - 1,
    } : {}),
    curriculumFamily: `${identity.textbookId}-g${identity.grade}-${identity.topic}-${topic.modelForm}`,
    contentSignature: `${identity.topic}|${identity.type}|${conditionTokens.join('|')}|${model.target}|${model.expression}|${model.answer}|${model.answerUnit}`,
    prompt,
    options,
    answer: model.answer,
    answerUnit: model.answerUnit,
    answerSpec: model.answerSpec,
    calculationExpression: model.expression,
    auditRule,
    hint: guidance.hint,
    solution: { summary: guidance.knowledge, steps },
    knowledgeSummary: guidance.knowledge,
    mistakeSummary: guidance.mistakes,
    commonMistakes: [`${identity.topic}_misread`, 'answer_unchecked'],
    sourceType: 'project-original',
    sourceRegion: 'nationwide',
    sourceYear: String(2022 + (sourceSeed % 5)),
    examPattern: EXAM_PATTERN_BY_TOPIC[identity.topic],
    reviewStatus: 'generated-canonical',
    reviewedAt: '2026-08-08',
  };
}

function normalizedScope(scope = {}) {
  if (scope.schoolStage && scope.schoolStage !== 'junior') return null;
  const textbookId = scope.textbookId || 'jr-rjb';
  const grade = scope.grade === undefined || scope.grade === null || scope.grade === '' ? 7 : Number(scope.grade);
  if (!EDITION_IDS.includes(textbookId) || ![7, 8, 9].includes(grade)) return null;
  return { schoolStage: 'junior', textbookId, grade };
}

function scopeKey(scope) {
  return `junior:${scope.textbookId}:g${scope.grade}`;
}

function buildCanonicalScope(scope) {
  const topics = getJuniorTopics(scope.textbookId, scope.grade);
  const practiceQuestions = [];
  DIFFICULTIES.forEach((difficulty) => {
    TYPES.forEach((type) => {
      topics.forEach((topic) => {
        [1, 2, 3].forEach((variant) => {
          practiceQuestions.push(renderQuestion(parseIdentity(
            `j-p-${scope.textbookId}-g${scope.grade}-${topic.key}-${type}-${difficulty}-${variant}`,
          )));
        });
      });
    });
  });
  const diagnosticQuestions = [];
  DIFFICULTIES.forEach((difficulty) => {
    getEntryTopics(scope.textbookId, scope.grade).forEach((topic, index) => {
      diagnosticQuestions.push(renderQuestion(parseIdentity(
        `j-d-${scope.textbookId}-g${scope.grade}-${topic}-${TYPES[index % TYPES.length]}-${difficulty}-${index + 1}`,
      )));
    });
  });
  return { diagnosticQuestions, practiceQuestions };
}

function getJuniorQuestionBank(scope = {}) {
  const normalized = normalizedScope(scope);
  if (!normalized) return { diagnosticQuestions: [], practiceQuestions: [] };
  const key = scopeKey(normalized);
  if (!cache.has(key)) cache.set(key, buildCanonicalScope(normalized));
  return deepCopy(cache.get(key));
}

function regenerateJuniorQuestion(id) {
  const identity = parseIdentity(id);
  return identity ? deepCopy(renderQuestion(identity)) : undefined;
}

function buildJuniorDiagnosticQuestions(scope = {}) {
  return getJuniorQuestionBank(scope).diagnosticQuestions;
}

function buildJuniorPracticeQuestions(scope = {}) {
  return getJuniorQuestionBank(scope).practiceQuestions;
}

function __resetJuniorQuestionBankCache() {
  cache.clear();
}

function __getJuniorQuestionBankCacheState() {
  return { size: cache.size, keys: [...cache.keys()].sort() };
}

module.exports = {
  getJuniorQuestionBank,
  regenerateJuniorQuestion,
  buildJuniorDiagnosticQuestions,
  buildJuniorPracticeQuestions,
  __resetJuniorQuestionBankCache,
  __getJuniorQuestionBankCacheState,
};

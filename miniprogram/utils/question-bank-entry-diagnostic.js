const { textbookOptions, getLearningMap } = require('./textbook-catalog');
const { getEditionGradeProfile } = require('./textbook-edition-profiles');
const { getCurriculumScope } = require('./textbook-curriculum');

const ENTRY_DIAGNOSTIC_COUNT = 5;
const ENTRY_VARIANTS_PER_DIFFICULTY = 2;

const ENTRY_SLOTS = {
  1: [
    { key: 'number_sense', label: '数感与口算', knowledgePoint: 'add_within_20', ability: 'calculation', type: 'choice', examPattern: 'calculation_model' },
    { key: 'number_compare', label: '长度比较', knowledgePoint: 'length_compare', ability: 'data', type: 'choice', examPattern: 'condition_filter' },
    { key: 'shape_observe', label: '图形观察', knowledgePoint: 'shape_recognition', ability: 'geometry', type: 'fill', examPattern: 'condition_filter' },
    { key: 'simple_pattern', label: '规律发现', knowledgePoint: 'pattern_addition', ability: 'pattern', type: 'fill', examPattern: 'condition_filter' },
    { key: 'card_story', label: '生活应用', knowledgePoint: 'money_count', ability: 'problem', type: 'problem', examPattern: 'open_strategy' },
  ],
  2: [
    { key: 'table_reasoning', label: '乘法口算', knowledgePoint: 'multiplication_table', ability: 'calculation', type: 'choice', examPattern: 'calculation_model' },
    { key: 'place_value', label: '数位理解', knowledgePoint: 'number_within_10000', ability: 'data', type: 'choice', examPattern: 'condition_filter' },
    { key: 'right_angle', label: '角的认识', knowledgePoint: 'angle_right', ability: 'geometry', type: 'fill', examPattern: 'condition_filter' },
    { key: 'growing_pattern', label: '规律发现', knowledgePoint: 'data_compare', ability: 'pattern', type: 'fill', examPattern: 'data_reading' },
    { key: 'share_story', label: '平均分', knowledgePoint: 'division_table', ability: 'problem', type: 'problem', examPattern: 'combination_strategy' },
  ],
  3: [
    { key: 'division_sense', label: '除法关系', knowledgePoint: 'division_remainder', ability: 'calculation', type: 'choice', examPattern: 'calculation_model' },
    { key: 'fraction_compare', label: '分数比较', knowledgePoint: 'fraction_compare', ability: 'data', type: 'choice', examPattern: 'condition_filter' },
    { key: 'perimeter_sense', label: '图形周长', knowledgePoint: 'rectangle_perimeter_g3', ability: 'geometry', type: 'fill', examPattern: 'calculation_model' },
    { key: 'small_average', label: '平均数', knowledgePoint: 'average_g3', ability: 'pattern', type: 'fill', examPattern: 'data_reading' },
    { key: 'mass_story', label: '单位应用', knowledgePoint: 'mass_convert', ability: 'problem', type: 'problem', examPattern: 'unit_check' },
  ],
  4: [
    { key: 'estimate_division', label: '估算判断', knowledgePoint: 'division_estimation', ability: 'calculation', type: 'choice', examPattern: 'estimate_check' },
    { key: 'small_average', label: '数据理解', knowledgePoint: 'average', ability: 'data', type: 'choice', examPattern: 'data_reading' },
    { key: 'cube_view', label: '空间观察', knowledgePoint: 'view_from_direction', ability: 'geometry', type: 'fill', examPattern: 'condition_filter' },
    { key: 'number_pattern', label: '规律推理', knowledgePoint: 'number_pattern', ability: 'pattern', type: 'fill', examPattern: 'condition_filter' },
    { key: 'money_story', label: '生活应用', knowledgePoint: 'decimal_money_problem', ability: 'problem', type: 'problem', examPattern: 'open_strategy' },
  ],
  5: [
    { key: 'decimal_sense', label: '小数运算', knowledgePoint: 'decimal_multiply', ability: 'calculation', type: 'choice', examPattern: 'calculation_model' },
    { key: 'factor_judgement', label: '因数关系', knowledgePoint: 'factor_multiple', ability: 'data', type: 'choice', examPattern: 'condition_filter' },
    { key: 'area_sense', label: '图形面积', knowledgePoint: 'area_rectangle_g5', ability: 'geometry', type: 'fill', examPattern: 'calculation_model' },
    { key: 'small_average', label: '数据规律', knowledgePoint: 'average_g5', ability: 'pattern', type: 'fill', examPattern: 'data_reading' },
    { key: 'length_story', label: '单位应用', knowledgePoint: 'unit_conversion_g5', ability: 'problem', type: 'problem', examPattern: 'unit_check' },
  ],
  6: [
    { key: 'fraction_sense', label: '分数运算', knowledgePoint: 'fraction_multiply', ability: 'calculation', type: 'choice', examPattern: 'calculation_model' },
    { key: 'percent_sense', label: '百分数理解', knowledgePoint: 'percent', ability: 'data', type: 'choice', examPattern: 'data_reading' },
    { key: 'circle_sense', label: '圆的认识', knowledgePoint: 'circle', ability: 'geometry', type: 'fill', examPattern: 'condition_filter' },
    { key: 'negative_compare', label: '数的比较', knowledgePoint: 'negative_number', ability: 'pattern', type: 'fill', examPattern: 'condition_filter' },
    { key: 'ratio_story', label: '比的应用', knowledgePoint: 'ratio', ability: 'problem', type: 'problem', examPattern: 'open_strategy' },
  ],
};

function uniqueOptions(values) {
  return [...new Set(values.map((value) => String(value)))];
}

function numberOptions(answer, offsets = [-1, 1, 2]) {
  const value = Number(answer);
  return uniqueOptions([value, ...offsets.map((offset) => Math.max(0, value + offset))]);
}

function entryModel(grade, slotIndex, difficulty, variant, textbookIndex) {
  const revision = (difficulty - 1) * ENTRY_VARIANTS_PER_DIFFICULTY + variant;
  const seed = revision * 7 + textbookIndex * 5;
  const scale = 1 + revision;

  if (grade === 1 && slotIndex === 0) {
    const left = 5 + (seed % 5); const right = 3 + scale; const answer = left + right;
    return { prompt: `${left} + ${right} 等于多少？`, answer, options: numberOptions(answer), hint: '可以把较大的数先放在心里，再往后数。', steps: [`${left} + ${right} = ${answer}`] };
  }
  if (grade === 1 && slotIndex === 1) {
    const left = 12 + seed % 6; const right = left + 1 + difficulty % 2;
    return {
      prompt: `红绳长 ${left} 厘米，蓝绳长 ${right} 厘米。在 ${left} ○ ${right} 中填入正确的符号。`,
      answer: '<',
      options: ['>', '<', '=', '不能比较'],
      hint: '两根绳子的单位相同，比较数字大小就能比较长度。',
      steps: [`${left} 厘米比 ${right} 厘米短，所以填 <。`],
    };
  }
  if (grade === 1 && slotIndex === 2) {
    const shapes = [
      { clue: '有 4 条一样长的边和 4 个直角', answer: '正方形' },
      { clue: '有 4 个直角，对边一样长', answer: '长方形' },
      { clue: '有 3 条边和 3 个角', answer: '三角形' },
      { clue: '没有直直的边，像一个圆盘', answer: '圆形' },
      { clue: '正方形有几个直角', answer: '4' },
      { clue: '三角形有几条边', answer: '3' },
    ];
    const shape = shapes[revision];
    return { prompt: `一个图形${shape.clue}，它是（填图形名称）。`, answer: shape.answer, options: [], hint: '数一数边和角，再想一想图形的特征。', steps: [`符合“${shape.clue}”的图形是${shape.answer}。`] };
  }
  if (grade === 1 && slotIndex === 3) {
    const start = 1 + seed % 4; const step = 2 + difficulty % 2; const answer = start + step * 3;
    return { prompt: `找规律：${start}，${start + step}，${start + step * 2}，__。`, answer, options: [], hint: '比较相邻两个数相差多少。', steps: [`每次加 ${step}，所以答案是 ${answer}。`] };
  }
  if (grade === 1 && slotIndex === 4) {
    const total = 12 + seed % 5; const given = 3 + difficulty % 3; const answer = total - given;
    return {
      prompt: `小雨有 ${total} 元，买数学卡花了 ${given} 元，还剩多少元？`,
      answer,
      answerUnit: '元',
      options: [],
      hint: '先用原有的钱数减去花掉的钱数，单位仍然是元。',
      steps: [`${total} - ${given} = ${answer}（元）。`],
    };
  }

  if (grade === 2 && slotIndex === 0) {
    const left = 4 + difficulty; const right = 3 + variant + textbookIndex % 2; const answer = left * right;
    return { prompt: `${left} × ${right} 等于多少？`, answer, options: numberOptions(answer, [-left, right, 1]), hint: '想一想对应的乘法口诀。', steps: [`${left} × ${right} = ${answer}。`] };
  }
  if (grade === 2 && slotIndex === 1) {
    const thousands = 3 + variant; const hundreds = 2 + difficulty; const tens = seed % 8; const ones = 1 + textbookIndex % 7;
    const number = `${thousands}${hundreds}${tens}${ones}`;
    const options = uniqueOptions([hundreds, (hundreds + 1) % 10, (hundreds + 3) % 10, (hundreds + 5) % 10]);
    return { prompt: `${number} 中百位上的数字是几？`, answer: hundreds, options, hint: '从右往左依次是个位、十位、百位、千位。', steps: [`${number} 的百位数字是 ${hundreds}。`] };
  }
  if (grade === 2 && slotIndex === 2) {
    const count = 1 + revision;
    return { prompt: `有 ${count} 个直角，一共有多少度？`, answer: count * 90, options: [], hint: '一个直角是 90 度。', steps: [`${count} × 90 = ${count * 90}（度）。`] };
  }
  if (grade === 2 && slotIndex === 3) {
    const start = 2 + variant; const step = 3 + difficulty % 2; const answer = start + step * 3;
    return { prompt: `找规律：${start}，${start + step}，${start + step * 2}，__。`, answer, options: [], hint: '每次变化相同，就找相同的增加量。', steps: [`每次加 ${step}，答案是 ${answer}。`] };
  }
  if (grade === 2 && slotIndex === 4) {
    const people = 3 + variant; const each = 4 + difficulty; const total = people * each;
    return { prompt: `${total} 本练习册平均分给 ${people} 个同学，每人分到几本？`, answer: each, options: [], hint: '平均分可以用除法。', steps: [`${total} ÷ ${people} = ${each}（本）。`] };
  }

  if (grade === 3 && slotIndex === 0) {
    const divisor = 4 + variant; const answer = 8 + difficulty; const dividend = divisor * answer;
    return { prompt: `${dividend} ÷ ${divisor} 等于多少？`, answer, options: numberOptions(answer, [-1, 1, divisor]), hint: '用乘法口诀或乘法检验。', steps: [`${divisor} × ${answer} = ${dividend}，所以商是 ${answer}。`] };
  }
  if (grade === 3 && slotIndex === 1) {
    const denominator = 6 + difficulty; const left = 2 + variant; const right = left + 2;
    const answer = `${right}/${denominator}`;
    return { prompt: `${left}/${denominator} 和 ${right}/${denominator}，哪个更大？`, answer, options: [`${left}/${denominator}`, answer, '一样大', '无法比较'], hint: '分母相同时，比较分子。', steps: [`${right} 大于 ${left}，所以 ${answer} 更大。`] };
  }
  if (grade === 3 && slotIndex === 2) {
    const length = 5 + difficulty; const width = 3 + variant; const answer = (length + width) * 2;
    return { prompt: `长方形长 ${length} 厘米、宽 ${width} 厘米，周长是多少厘米？`, answer, options: [], hint: '周长是四条边的总长度。', steps: [`(${length} + ${width}) × 2 = ${answer}（厘米）。`] };
  }
  if (grade === 3 && slotIndex === 3) {
    const middle = 7 + revision; const values = [middle - 2, middle, middle + 2];
    return { prompt: `三个数是 ${values.join('、')}，它们的平均数是多少？`, answer: middle, options: [], hint: '先求三个数的和，再平均分成 3 份。', steps: [`(${values.join(' + ')}) ÷ 3 = ${middle}。`] };
  }
  if (grade === 3 && slotIndex === 4) {
    const kilograms = 2 + variant; const answer = kilograms * 1000;
    return { prompt: `一袋大米重 ${kilograms} 千克，合多少克？`, answer, options: [], hint: '1 千克 = 1000 克。', steps: [`${kilograms} × 1000 = ${answer}（克）。`] };
  }

  if (grade === 4 && slotIndex === 0) {
    const divisor = 7 + variant; const dividend = divisor * 50 - difficulty;
    return { prompt: `估一估：${dividend} ÷ ${divisor} 的商最接近多少（整十数）？`, answer: 50, options: ['5', '50', '500', '5000'], hint: '先把被除数看成接近的整百数，再用除法估算整十商。', steps: [`${dividend} 接近 ${divisor * 50}，所以商接近整十数 50。`, '所以答案是 50。'] };
  }
  if (grade === 4 && slotIndex === 1) {
    const middle = 10 + revision; const values = [middle - 2, middle, middle + 2];
    return { prompt: `三次记录是 ${values.join('、')}，平均数是多少？`, answer: middle, options: numberOptions(middle, [-2, 2, 3]), hint: '三个数围绕中间数对称时，平均数就是中间数。', steps: [`(${values.join(' + ')}) ÷ 3 = ${middle}。`] };
  }
  if (grade === 4 && slotIndex === 2) {
    const cubes = 2 + revision;
    return { prompt: `把 ${cubes} 个同样的小正方体排成一排，从正面看能看到几个小正方形？`, answer: cubes, options: [], hint: '从正面看，每个小正方体露出一个正方形。', steps: [`一排有 ${cubes} 个小正方体，所以能看到 ${cubes} 个小正方形。`] };
  }
  if (grade === 4 && slotIndex === 3) {
    const start = 3 + variant; const increments = [2 + difficulty % 2, 3 + difficulty % 2, 4 + difficulty % 2];
    const second = start + increments[0]; const third = second + increments[1]; const answer = third + increments[2];
    return { prompt: `找规律：${start}，${second}，${third}，__。`, answer, options: [], hint: '相邻两个数增加的数量也有规律。', steps: [`依次加 ${increments.join('、')}，所以答案是 ${answer}。`] };
  }
  if (grade === 4 && slotIndex === 4) {
    const first = 3 + variant + 0.5; const second = 1.5 + difficulty / 2; const paid = 10; const answer = paid - first - second;
    return { prompt: `买一本练习本 ${first} 元和一支笔 ${second} 元，付 ${paid} 元，应找回多少元？`, answer, options: [], hint: '先求一共花了多少钱，再用付款数减去总价。', steps: [`${first} + ${second} = ${first + second}（元）。`, `${paid} - ${first + second} = ${answer}（元）。`] };
  }

  if (grade === 5 && slotIndex === 0) {
    const left = 1.5 + variant + difficulty / 2; const right = 2 + difficulty % 2; const answer = left * right;
    return { prompt: `${left} × ${right} 等于多少？`, answer, options: numberOptions(answer, [-1, 1, right]), hint: '先按整数乘法计算，再确定小数点位置。', steps: [`${left} × ${right} = ${answer}。`] };
  }
  if (grade === 5 && slotIndex === 1) {
    const factor = 4 + variant; const multiple = factor * (5 + difficulty);
    return { prompt: `下面哪个数是 ${multiple} 的因数？`, answer: factor, options: uniqueOptions([factor, factor + 1, multiple - 1, multiple + 1]), hint: '能整除这个数的数，才是它的因数。', steps: [`${multiple} ÷ ${factor} = ${5 + difficulty}，没有余数，所以 ${factor} 是因数。`] };
  }
  if (grade === 5 && slotIndex === 2) {
    const length = 5 + difficulty; const width = 3 + variant; const answer = length * width;
    return { prompt: `一张长方形卡纸长 ${length} 厘米、宽 ${width} 厘米，面积是多少平方厘米？`, answer, options: [], hint: '长方形面积 = 长 × 宽。', steps: [`${length} × ${width} = ${answer}（平方厘米）。`] };
  }
  if (grade === 5 && slotIndex === 3) {
    const middle = 7 + revision; const values = [middle - 1, middle, middle + 1];
    return { prompt: `三次跳绳成绩是 ${values.join('、')}，平均数是多少？`, answer: middle, options: [], hint: '三个连续数的平均数是中间数。', steps: [`(${values.join(' + ')}) ÷ 3 = ${middle}。`] };
  }
  if (grade === 5 && slotIndex === 4) {
    const meters = 1.5 + variant + difficulty / 2; const answer = meters * 100;
    return { prompt: `一根彩带长 ${meters} 米，合多少厘米？`, answer, options: [], hint: '1 米 = 100 厘米。', steps: [`${meters} × 100 = ${answer}（厘米）。`] };
  }

  if (grade === 6 && slotIndex === 0) {
    const numerator = 1 + variant; const denominator = 3 + difficulty; const factor = denominator;
    const answer = `${numerator}/2`;
    return { prompt: `${numerator}/${denominator} × ${factor}/2 等于多少？`, answer, options: [answer, `${numerator}/${denominator}`, `${factor}/2`, `${numerator}/${denominator * 2}`], hint: '分子乘分子、分母乘分母后再约分。', steps: [`${numerator}/${denominator} × ${factor}/2 = ${numerator * factor}/${denominator * 2} = ${answer}。`] };
  }
  if (grade === 6 && slotIndex === 1) {
    const base = 40 + variant * 20; const rate = [25, 20, 10][difficulty - 1]; const answer = base * rate / 100;
    return { prompt: `${base} 的 ${rate}% 是多少？`, answer, options: numberOptions(answer, [-2, 2, 10]), hint: '把百分数写成分母是 100 的分数。', steps: [`${base} × ${rate}% = ${answer}。`] };
  }
  if (grade === 6 && slotIndex === 2) {
    const radius = 2 + revision; const answer = radius * 2;
    return { prompt: `一个圆的半径是 ${radius} 厘米，它的直径是多少厘米？`, answer, options: [], hint: '直径是半径的 2 倍。', steps: [`${radius} × 2 = ${answer}（厘米）。`] };
  }
  if (grade === 6 && slotIndex === 3) {
    const left = -(2 + variant); const right = -(5 + difficulty);
    return { prompt: `${left} 和 ${right} 中，哪个数更大？`, answer: left, options: [], hint: '负数离 0 越近，数越大。', steps: [`${left} 离 0 更近，所以 ${left} 更大。`] };
  }
  const left = 4 + variant * 2; const right = 6 + difficulty * 2; const divisor = 2;
  return { prompt: `红、蓝两种彩纸张数的比是 ${left}:${right}，化成最简整数比是多少？`, answer: `${left / divisor}:${right / divisor}`, options: [], hint: '前项和后项同时除以它们的公因数。', steps: [`${left}:${right} = ${left / divisor}:${right / divisor}。`] };
}

function buildEntryQuestion(textbook, textbookIndex, grade, slot, slotIndex, difficulty, variant) {
  const map = getLearningMap(textbook.value, grade);
  const curriculum = getCurriculumScope('primary', textbook.value, grade, slot.knowledgePoint);
  const profile = getEditionGradeProfile(textbook.value, grade);
  const context = profile.contexts[(slotIndex + difficulty + variant) % profile.contexts.length];
  const model = entryModel(grade, slotIndex, difficulty, variant, textbookIndex);
  const answer = String(model.answer);
  return {
    id: `d-entry-${textbook.value}-g${grade}-${slot.key}-l${difficulty}-v${variant + 1}`,
    textbookId: textbook.value,
    ...(curriculum && curriculum.schoolSystem ? { schoolSystem: curriculum.schoolSystem } : {}),
    editionUnitKey: curriculum ? curriculum.editionUnitKey : map.editionUnitKey,
    grade,
    term: curriculum ? curriculum.term : (slotIndex < 3 ? '上册' : '下册'),
    unit: curriculum ? curriculum.chapterLabel : `${profile.unit}·${slot.label}`,
    knowledgePoint: slot.knowledgePoint,
    ability: slot.ability,
    type: slot.type,
    difficulty,
    diagnosticSlot: `entry-g${grade}-${slot.key}`,
    entrySlot: slot.key,
    entryOrder: slotIndex,
    entryDiagnostic: true,
    curriculumFamily: `entry-${textbook.value}-g${grade}-${slot.key}`,
    prompt: `${textbook.label}${grade}年级起点小测·${context}：${model.prompt}`,
    options: model.options.map(String),
    answer,
    answerUnit: model.answerUnit || '',
    hint: model.hint,
    solution: {
      summary: `用“${slot.label}”的基础方法快速判断。`,
      steps: [...model.steps, `所以答案是 ${answer}。`],
    },
    knowledgeSummary: `${textbook.label}${grade}年级的“${slot.label}”重点是看清数量或图形关系，再选合适的方法。`,
    mistakeSummary: ['容易只看数字大小而忽略题目条件。', '算完后要把答案放回题目中检查是否合理。'],
    commonMistakes: [`entry_${slot.key}_misread`, 'calculation_error'],
    calculationExpression: '',
    examPattern: slot.examPattern,
  };
}

function buildEntryDiagnosticQuestions() {
  const questions = [];
  textbookOptions.forEach((textbook, textbookIndex) => {
    [1, 2, 3, 4, 5, 6].forEach((grade) => {
      ENTRY_SLOTS[grade].forEach((slot, slotIndex) => {
        [1, 2, 3].forEach((difficulty) => {
          for (let variant = 0; variant < ENTRY_VARIANTS_PER_DIFFICULTY; variant += 1) {
            questions.push(buildEntryQuestion(
              textbook,
              textbookIndex,
              grade,
              slot,
              slotIndex,
              difficulty,
              variant,
            ));
          }
        });
      });
    });
  });
  return questions;
}

module.exports = {
  ENTRY_DIAGNOSTIC_COUNT,
  ENTRY_SLOTS,
  buildEntryDiagnosticQuestions,
};

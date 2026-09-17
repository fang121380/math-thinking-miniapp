const TYPE_PATTERN = ['choice', 'fill', 'problem', 'choice', 'fill', 'problem', 'choice', 'fill', 'problem', 'choice', 'fill', 'problem'];
const DIFFICULTY_PATTERN = [1, 1, 1, 2, 1, 2, 2, 1, 2, 3, 3, 3];

function reducedFractionSpec(answer) {
  const match = String(answer || '').trim().match(/^(-?\d+)\/(-?\d+)$/);
  if (!match) return undefined;
  let numerator = Number(match[1]);
  let denominator = Number(match[2]);
  if (!denominator) return undefined;
  if (denominator < 0) {
    numerator *= -1;
    denominator *= -1;
  }
  let a = Math.abs(numerator);
  let b = Math.abs(denominator);
  while (b) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  const divisor = a || 1;
  return { kind: 'fraction', value: `${numerator / divisor}/${denominator / divisor}` };
}

function choiceOptions(answer, delta = 1) {
  const numeric = Number(answer);
  if (!Number.isFinite(numeric)) return [String(answer)];
  const precision = Math.max(
    (String(answer).split('.')[1] || '').length,
    (String(delta).split('.')[1] || '').length,
  );
  const format = (value) => String(Number(value.toFixed(Math.min(precision, 6))));
  return [...new Set([numeric - delta, numeric, numeric + delta, numeric + delta * 2].map(format))];
}

function conceptOptions(value, answer) {
  if (Array.isArray(value.options) && value.options.length) return value.options;
  const fallback = {
    '二千七百零八': ['二千七百零八', '二千七百零八十', '二千七百零八百', '二千七百零八千'],
    '3/8': ['3/8', '8/3', '3/5', '5/8'],
    '7/11': ['7/11', '7/22', '11/7', '4/11'],
    '1/2': ['1/2', '1/4', '3/5', '5/6'],
    '6/7': ['6/7', '4/7', '7/6', '2/7'],
  };
  if (fallback[String(answer)]) return fallback[String(answer)];
  return [String(answer)];
}

function arithmeticItem(topic, pair, type, index) {
  const [left, right] = pair;
  const operators = { add: '+', subtract: '-', multiply: '×', divide: '÷' };
  const operator = operators[topic.kind];
  const answer = topic.kind === 'add' ? left + right
    : topic.kind === 'subtract' ? left - right
      : topic.kind === 'multiply' ? left * right : left / right;
  const summary = topic.summary || `先看清题目中的 ${operator}，再按顺序计算。`;
  const base = `${left} ${operator} ${right}`;
  if (type === 'choice') {
    return {
      prompt: `第 ${index + 1} 题：${base} = ?`,
      answer: String(answer), options: choiceOptions(answer),
      hint: `把 ${base} 认真算一遍。`,
      steps: [`${base} = ${answer}`],
      summary,
    };
  }
  if (type === 'fill') {
    return {
      prompt: `第 ${index + 1} 题：${base} = ____。`, answer: String(answer),
      hint: `可以把数拆开，再计算。`, steps: [`${base} = ${answer}`], summary,
    };
  }
  const action = topic.kind === 'add' ? '又买来' : topic.kind === 'subtract' ? '送出' : topic.kind === 'multiply' ? '有' : '平均分给';
  const story = topic.kind === 'multiply'
    ? `有 ${left} 组贴纸，每组 ${right} 张，一共有多少张？`
    : topic.kind === 'divide'
      ? `有 ${left} 张贴纸，平均分给 ${right} 位同学，每人几张？`
      : `小明原来有 ${left} 张贴纸，${action} ${right} 张，现在有多少张？`;
  const answerUnit = '\u5f20';
  return {
    prompt: `第 ${index + 1} 题：${story}`,
    answer: String(answer),
    answerUnit,
    hint: `把题目里的数量列成 ${base}。`,
    steps: [`列式：${base}`, `计算得 ${answer}${answerUnit}。`],
    summary,
  };
}

function moneyItem(topic, pair, type, index) {
  const [left, right] = pair;
  const answer = left + right;
  const expression = `${left} + ${right}`;
  const question = `小华有 ${left} 元，又得到 ${right} 元，一共有多少元？`;
  const prompt = type === 'choice'
    ? `第 ${index + 1} 题：${question}`
    : type === 'fill'
      ? `第 ${index + 1} 题：${question}请把答案填在横线上。`
      : `第 ${index + 1} 题：${question}请列式并写出结果。`;
  return {
    prompt,
    answer: String(answer),
    options: type === 'choice' ? choiceOptions(answer) : [],
    answerUnit: '元',
    hint: '把两笔钱合起来，用加法计算。',
    steps: [`列式：${left} + ${right} = ${answer}（元）`, `所以一共有 ${answer} 元。`],
    summary: topic.summary,
    calculationExpression: expression,
  };
}

function decimalTenthsItem(topic, pair, type, index) {
  const [value] = pair;
  const numberText = Number(value).toFixed(1);
  const tenthsDigit = numberText.split('.')[1];
  const commonSteps = [
    `${numberText} 的小数点右边第一位是 ${tenthsDigit}，这一位叫作十分位。`,
    `${tenthsDigit} 表示 ${tenthsDigit} 个十分之一。`,
  ];
  const prompt = type === 'choice'
    ? `第 ${index + 1} 题：小数 ${numberText} 中，数字 ${tenthsDigit} 在个位、十分位、百分位中的哪一位？`
    : type === 'fill'
      ? `第 ${index + 1} 题：小数 ${numberText} 的十分位上的数字是 ____。`
      : `第 ${index + 1} 题：小数 ${numberText} 中，小数点右边第一位是十分位，${tenthsDigit} 表示 ${tenthsDigit} 个十分之一。请写出十分位上的数字。`;
  const answer = type === 'choice' ? '十分位' : tenthsDigit;
  if (!String(commonSteps[commonSteps.length - 1]).includes(answer)) {
    commonSteps.push(`所以答案是 ${answer}。`);
  }
  return {
    prompt,
    answer,
    options: type === 'choice' ? ['个位', '十分位', '百分位', '千位'] : [],
    hint: '先看小数点右边第一位，它就是十分位。',
    steps: commonSteps,
    summary: topic.summary,
  };
}

function remainderItem(topic, pair, type, index) {
  const [dividend, divisor] = pair;
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  const answer = `${quotient}余${remainder}`;
  const expression = `${dividend}÷${divisor}`;
  const steps = [
    `${dividend} = ${divisor}×${quotient} + ${remainder}`,
    `所以商是 ${quotient}，余数是 ${remainder}，写作 ${answer}。`,
  ];
  const options = [
    answer,
    `${Math.max(0, quotient - 1)}余${remainder}`,
    `${quotient}余${remainder === 1 ? 2 : remainder - 1}`,
    `${quotient + 1}余${remainder}`,
  ];
  const prompt = type === 'problem'
    ? `第 ${index + 1} 题：有 ${dividend} 张贴纸，每 ${divisor} 张分成一组，最多能分几组？还剩几张？`
    : `第 ${index + 1} 题：${expression} 的商和余数分别是多少？`;
  return {
    prompt,
    answer,
    options: type === 'choice' ? options : [],
    hint: `找到最大的整数组数：${divisor}×${quotient} 不超过 ${dividend}，再看还剩多少。`,
    steps,
    summary: topic.summary,
    calculationExpression: expression,
  };
}

function formulaItem(topic, pair, type, index) {
  const [left, right] = pair;
  const answer = topic.kind === 'perimeter' ? (left + right) * 2
    : topic.kind === 'area' ? left * right
      : topic.kind === 'volume' ? left * right * topic.height
        : topic.kind === 'decimalMultiply' ? Number((left * right).toFixed(2))
          : topic.kind === 'decimalDivide' ? Number((left / right).toFixed(2))
            : topic.kind === 'percent' ? Number((left * right / 100).toFixed(2))
              : topic.kind === 'ratio' ? `${left}:${right}` : left + right;
  const formula = topic.kind === 'perimeter' ? `(${left}+${right})×2`
    : topic.kind === 'area' ? `${left}×${right}`
      : topic.kind === 'volume' ? `${left}×${right}×${topic.height}`
        : topic.kind === 'decimalMultiply' ? `${left}×${right}`
          : topic.kind === 'decimalDivide' ? `${left}÷${right}`
            : topic.kind === 'percent' ? `${left}×${right}%`
              : topic.kind === 'ratio' ? `${left}:${right}` : `${left}+${right}`;
  const label = topic.kind === 'perimeter' ? '长方形的周长'
    : topic.kind === 'area' ? '长方形的面积'
      : topic.kind === 'volume' ? '长方体的体积'
        : topic.kind === 'percent' ? '百分数对应的数量' : '结果';
  const exactDecimalDivision = topic.kind === 'decimalDivide' ? left / right : null;
  const needsDecimalRounding = topic.kind === 'decimalDivide'
    && Math.abs(exactDecimalDivision - Number(answer)) > 1e-9;
  const roundingNote = needsDecimalRounding ? '（结果保留两位小数）' : '';
  let problemPrompt = `一个长方形长 ${left} 厘米、宽 ${right} 厘米，求${label}。`;
  if (topic.kind === 'area') problemPrompt = `一个长方形长 ${left} 厘米、宽 ${right} 厘米，求它的面积（结果填平方厘米）。`;
  if (topic.kind === 'volume') problemPrompt = `一个长方体长 ${left} 厘米、宽 ${right} 厘米、高 ${topic.height} 厘米，求它的体积（结果填立方厘米）。`;
  if (topic.kind === 'decimalMultiply') {
    problemPrompt = Number.isInteger(right)
      ? `每本练习册 ${left} 元，买 ${right} 本，一共多少元？`
      : `每米彩带 ${left} 元，买 ${right} 米，一共多少元？`;
  }
  if (topic.kind === 'decimalDivide') problemPrompt = `有 ${left} 米彩带，平均分成 ${right} 份，每份多少米？`;
  if (topic.kind === 'percent') problemPrompt = `班级有 ${left} 人，其中 ${right}% 参加了活动，有多少人参加？`;
  if (topic.kind === 'ratio') problemPrompt = `红球有 ${left} 个，蓝球有 ${right} 个，红球和蓝球的个数比是多少？`;
  const answerUnit = topic.kind === 'perimeter' ? '厘米'
    : topic.kind === 'area' ? '平方厘米'
      : topic.kind === 'volume' ? '立方厘米'
        : topic.kind === 'decimalMultiply' ? '元'
          : topic.kind === 'decimalDivide' ? '米'
            : topic.kind === 'percent' ? '人' : '';
  const prompt = type === 'problem'
    ? `第 ${index + 1} 题：${problemPrompt}${roundingNote}`
    : `第 ${index + 1} 题：${problemPrompt}请把结果填在横线上。${roundingNote}`;
  const displayedAnswer = `${answer}${answerUnit}`;
  const ratioOptions = left === right
    ? [
      `${left}:${right}`,
      `${Math.max(1, left - 1)}:${right}`,
      `${left + 1}:${right}`,
      `${left}:${right + 1}`,
    ]
    : [
      `${left}:${right}`,
      `${right}:${left}`,
      `${left + 1}:${right}`,
      `${left}:${right + 1}`,
    ];
  return {
    prompt,
    answer: String(answer),
    options: type === 'choice'
      ? (topic.kind === 'ratio' ? ratioOptions : choiceOptions(answer))
      : [],
    hint: needsDecimalRounding ? `先写出算式 ${formula}，再按题意保留两位小数。` : `先写出算式 ${formula}。`,
    steps: [`列式：${formula}`, `计算得${needsDecimalRounding ? '约等于 ' : ' '}${displayedAnswer}。`],
    summary: topic.summary,
    answerUnit,
    calculationExpression: formula,
  };
}

function patternItem(topic, pair, type, index) {
  const [start, step] = pair;
  const answer = start + step * 4;
  const answerUnit = type === 'problem' ? '\u4e0b' : '';
  const prompt = type === 'problem'
    ? `第 ${index + 1} 题：小兔第 1 天跳 ${start} 下，以后每天比前一天多跳 ${step} 下，第 5 天跳多少下？`
    : `第 ${index + 1} 题：${start}，${start + step}，${start + step * 2}，${start + step * 3}，____。`;
  return {
    prompt, answer: String(answer), options: type === 'choice' ? choiceOptions(answer, step) : [],
    hint: `先看相邻两个数相差多少。`,
    steps: [`每次增加 ${step}。`, `${start + step * 3}+${step}=${answer}${answerUnit}。`],
    summary: topic.summary,
    answerUnit,
  };
}

function clockText(hour, minute) {
  return minute ? `${hour}时${minute}分` : `${hour}时`;
}

function timeDurationItem(topic, pair, type, index) {
  const [startMinute, duration] = pair;
  const startHour = 8 + index % 4;
  const endMinuteTotal = startMinute + duration;
  const endHour = startHour + Math.floor(endMinuteTotal / 60);
  const endMinute = endMinuteTotal % 60;
  const start = clockText(startHour, startMinute);
  const end = clockText(endHour, endMinute);
  return {
    prompt: `第 ${index + 1} 题：小雨从 ${start} 开始练口算，到 ${end} 结束，她一共练了多少分钟？`,
    answer: String(duration),
    options: type === 'choice' ? choiceOptions(duration, 5) : [],
    answerUnit: '分钟',
    hint: '把结束时刻和开始时刻对应的分钟数相减。',
    steps: [`${endMinute}-${startMinute}=${duration}（分钟）`, `从 ${start} 到 ${end} 经过 ${duration} 分钟。`],
    summary: topic.summary,
    calculationExpression: `${endMinute}-${startMinute}`,
  };
}

function dataCompareItem(topic, pair, type, index) {
  const [larger, smaller] = pair;
  const categories = [['苹果', '香蕉'], ['图书', '故事书'], ['红花', '蓝花']];
  const [largerLabel, smallerLabel] = categories[index % categories.length];
  const answer = larger - smaller;
  return {
    prompt: `第 ${index + 1} 题：统计小组中喜欢${largerLabel}的有 ${larger} 人，喜欢${smallerLabel}的有 ${smaller} 人。喜欢${largerLabel}的比喜欢${smallerLabel}的多多少人？`,
    answer: String(answer),
    options: type === 'choice' ? choiceOptions(answer, 2) : [],
    answerUnit: '人',
    hint: '比较“多多少”要用较大人数减较小人数。',
    steps: [`${larger}-${smaller}=${answer}（人）`, `喜欢${largerLabel}的比喜欢${smallerLabel}的多 ${answer} 人。`],
    summary: topic.summary,
    calculationExpression: `${larger}-${smaller}`,
  };
}

function averageItem(topic, pair, type, index) {
  const [middle, gap] = pair;
  const records = [middle - gap, middle, middle + gap];
  const total = records.reduce((sum, value) => sum + value, 0);
  const unit = topic.answerUnit || '下';
  const activity = topic.activity || '跳绳';
  const verb = topic.averageVerb || '跳';
  const answer = String(middle);
  return {
    prompt: `第 ${index + 1} 题：三次${activity}记录分别是 ${records.map((value) => `${value}${unit}`).join('、')}，平均每次${verb}多少${unit}？`,
    answer,
    options: type === 'choice' ? choiceOptions(middle, gap) : [],
    answerUnit: unit,
    hint: '先把三次记录相加，再平均分成 3 份。',
    steps: [`${records.join('+')}=${total}（${unit}）`, `${total}÷3=${middle}（${unit}）`],
    summary: topic.summary,
    calculationExpression: `${total}÷3`,
  };
}

function proportionItem(topic, pair, type, index) {
  const [leftSeed, rightSeed] = pair;
  const ratioLeft = 2 + (leftSeed + index) % 5;
  const rightTerm = 2 + (rightSeed + index) % 4;
  const scale = 2 + (leftSeed + rightSeed) % 3;
  const scaledLeft = ratioLeft * scale;
  const answer = ratioLeft * rightTerm;
  return {
    prompt: `第 ${index + 1} 题：解比例：x : ${rightTerm} = ${scaledLeft} : ${scale}，x 是多少？`,
    answer: String(answer),
    options: type === 'choice' ? choiceOptions(answer) : [],
    hint: '比例的两内项之积等于两外项之积。',
    steps: [`交叉相乘：x × ${scale} = ${rightTerm} × ${scaledLeft}。`, `x = ${rightTerm}×${scaledLeft}÷${scale} = ${answer}。`],
    summary: topic.summary,
    calculationExpression: `${rightTerm}×${scaledLeft}÷${scale}`,
  };
}

function coneVolumeItem(topic, pair, type, index) {
  const [baseArea, height] = pair;
  const answer = baseArea * height / 3;
  const formula = `${baseArea}×${height}÷3`;
  return {
    prompt: `第 ${index + 1} 题：一个圆锥的底面积是 ${baseArea} 平方厘米，高是 ${height} 厘米，体积是多少立方厘米？`,
    answer: String(answer),
    options: type === 'choice' ? choiceOptions(answer, Math.max(1, height)) : [],
    answerUnit: '立方厘米',
    hint: '圆锥体积等于底面积乘高再除以 3。',
    steps: [`列式：${formula}`, `计算得 ${answer}（立方厘米）。`],
    summary: topic.summary,
    calculationExpression: formula,
  };
}

function conceptItem(topic, value, type, index) {
  const answer = String(value.answer);
  const answerUnit = value.answerUnit || topic.answerUnit || '';
  const displayedAnswer = `${answer}${answerUnit}`;
  const steps = (value.steps || [value.explanation || `根据 ${topic.title} 的规则判断。`]).slice();
  const finalStep = steps.length ? steps[steps.length - 1] : '';
  if (!String(finalStep).includes(displayedAnswer)) {
    steps.push(`所以答案是 ${displayedAnswer}。`);
  }
  return {
    prompt: `第 ${index + 1} 题：${value.prompt}`,
    answer,
    options: type === 'choice' ? conceptOptions(value, answer) : [],
    hint: value.hint || `想一想“${topic.title}”的定义。`,
    steps,
    summary: topic.summary,
    answerUnit,
    answerSpec: value.answerSpec || topic.answerSpec || reducedFractionSpec(answer),
  };
}

function buildItem(grade, topic, type, index, diagnosticSlot) {
  const rawValue = topic.values[index % topic.values.length];
  const cycle = Math.floor(index / topic.values.length);
  const value = Array.isArray(rawValue) && cycle > 0
    ? (topic.kind === 'coneVolume'
      ? [rawValue[0] + 3 * cycle, rawValue[1]]
      : topic.kind === 'divide' || topic.kind === 'remainder'
      ? [rawValue[0] + rawValue[1] * cycle, rawValue[1]]
      : [rawValue[0] + cycle, rawValue[1]])
    : rawValue;
  const built = topic.kind === 'money'
    ? moneyItem(topic, value, type, index)
    : topic.kind === 'decimalTenths'
      ? decimalTenthsItem(topic, value, type, index)
    : topic.kind === 'timeDuration'
    ? timeDurationItem(topic, value, type, index)
    : topic.kind === 'dataCompare'
      ? dataCompareItem(topic, value, type, index)
      : topic.kind === 'average'
        ? averageItem(topic, value, type, index)
        : topic.kind === 'proportion'
          ? proportionItem(topic, value, type, index)
          : topic.kind === 'coneVolume'
            ? coneVolumeItem(topic, value, type, index)
    : topic.kind === 'remainder'
    ? remainderItem(topic, value, type, index)
    : topic.kind === 'add' || topic.kind === 'subtract' || topic.kind === 'multiply' || topic.kind === 'divide'
    ? arithmeticItem(topic, value, type, index)
    : topic.kind === 'perimeter' || topic.kind === 'area' || topic.kind === 'volume' || topic.kind === 'decimalMultiply' || topic.kind === 'decimalDivide' || topic.kind === 'percent' || topic.kind === 'ratio'
      ? formulaItem(topic, value, type, index)
      : topic.kind === 'pattern' ? patternItem(topic, value, type, index) : conceptItem(topic, value, type, index);
  const itemMetadata = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    id: `${diagnosticSlot ? 'd' : 'p'}-g${grade}-${topic.key}-${index + 1}`,
    grade,
    term: topic.term,
    unit: topic.unit,
    knowledgePoint: topic.key,
    ability: topic.ability,
    type,
    difficulty: diagnosticSlot ? [1, 1, 2, 3][index] : DIFFICULTY_PATTERN[index],
    diagnosticSlot,
    ...built,
    answerUnit: built.answerUnit || itemMetadata.answerUnit || topic.answerUnit || '',
    answerSpec: built.answerSpec || itemMetadata.answerSpec || topic.answerSpec || reducedFractionSpec(built.answer),
    prompt: diagnosticSlot ? built.prompt.replace('第 ', `摸底${topic.title || topic.unit}第 `) : built.prompt,
    knowledgeSummary: topic.summary,
    mistakeSummary: topic.mistakes,
    commonMistakes: topic.mistakeCodes || ['calculation_error'],
  };
}

function staticContentKey(question) {
  const prompt = String(question && question.prompt || '')
    .replace(/^(?:\u6478\u5e95[^:\uff1a]*\u7b2c\s*\d+\s*\u9898[:\uff1a]|\u7b2c\s*\d+\s*\u9898[:\uff1a])/, '')
    .replace(/[\s\u3000,\uff0c.\u3002!?\uff01\uff1f;\uff1b:\uff1a'"()\uff08\uff09]/g, '');
  const expression = String(question && question.calculationExpression || '')
    .replace(/\s+/g, '')
    .replace(/[\u00d7xX]/g, '*')
    .replace(/[\u00f7/]/g, '/');
  return [
    question && question.knowledgePoint,
    prompt,
    expression,
    question && question.answer,
    question && question.answerUnit || '',
  ].join('|');
}

function buildGradeBank(grade, topics) {
  const diagnosticQuestions = [];
  topics.forEach((topic, topicIndex) => {
    const type = topicIndex < 4 ? 'choice' : topicIndex < 6 ? 'fill' : 'problem';
    [0, 1, 2, 3].forEach((index) => {
      diagnosticQuestions.push(buildItem(grade, topic, type, index, `g${grade}_${topic.key}`));
    });
  });
  const publishedContentKeys = new Set(diagnosticQuestions.map(staticContentKey));
  const practiceQuestions = [];
  topics.forEach((topic) => {
    const practiceIndexes = Array.isArray(topic.practiceIndexes)
      ? topic.practiceIndexes
      : (topic.kind === 'concept'
        ? TYPE_PATTERN.map((_, index) => index).slice(0, topic.values.length)
        : TYPE_PATTERN.map((_, index) => index));
    practiceIndexes.forEach((index) => {
      const question = buildItem(grade, topic, TYPE_PATTERN[index], index, undefined);
      const contentKey = staticContentKey(question);
      if (publishedContentKeys.has(contentKey)) return;
      publishedContentKeys.add(contentKey);
      practiceQuestions.push(question);
    });
  });
  return { diagnosticQuestions, practiceQuestions };
}

const definitions = {
  1: [
    { key: 'add_within_20', kind: 'add', term: '上册', unit: '20以内进位加法', ability: 'calculation', values: [[7, 5], [8, 6], [9, 4], [6, 8], [7, 7], [9, 8]], summary: '把两个数量合起来用加法。', mistakes: ['看清两个加数，不要漏加。'] },
    { key: 'subtract_within_20', kind: 'subtract', term: '上册', unit: '20以内退位减法', ability: 'calculation', values: [[15, 7], [14, 6], [18, 9], [13, 5], [17, 8], [16, 7]], summary: '从总数里去掉一部分用减法。', mistakes: ['被减数要写在前面。'] },
    { key: 'add_within_100', kind: 'add', term: '下册', unit: '100以内加法', ability: 'calculation', values: [[24, 35], [46, 27], [38, 42], [55, 18], [29, 63], [47, 36]], summary: '个位和十位要对齐计算。', mistakes: ['满十要向十位进一。'] },
    { key: 'money_count', kind: 'money', term: '下册', unit: '认识人民币', ability: 'problem', values: [[5, 3], [8, 6], [10, 7], [12, 5], [9, 9], [15, 4]], practiceIndexes: [0, 2, 3, 4, 5, 6, 8, 9, 10, 11], summary: '人民币相加时先看清单位都是元。', mistakes: ['不要把元和角混在一起算。'] },
    { key: 'clock_reading', kind: 'concept', term: '上册', unit: '认识钟表', ability: 'data', title: '整时', summary: '分针指向 12 时，时针指向几就是几时。', mistakes: ['先看分针，再看时针。'], values: [{ prompt: '分针指向12，时针指向3，是几时？', answer: '3时', options: ['2时', '3时', '6时', '12时'] }, { prompt: '分针指向12，时针指向8，是几时？', answer: '8时', options: ['6时', '7时', '8时', '9时'] }, { prompt: '上午9时，分针指向哪里？', answer: '12', options: ['3', '6', '9', '12'] }, { prompt: '时针指向1、分针指向12，写作____。', answer: '1时' }, { prompt: '时针指向10、分针指向12，写作____。', answer: '10时' }, { prompt: '整时的分针都指向____。', answer: '12' }] },
    { key: 'shape_recognition', kind: 'concept', term: '上册', unit: '认识图形', ability: 'geometry', title: '平面图形', summary: '三角形有三条边，正方形有四条一样长的边。', mistakes: ['数边时不要漏掉一条边。'], values: [{ prompt: '有3条边的图形是？', answer: '三角形', options: ['圆形', '三角形', '正方形', '长方形'] }, { prompt: '没有角、边是弯曲的图形是？', answer: '圆形', options: ['圆形', '三角形', '正方形', '长方形'] }, { prompt: '正方形有几条边？', answer: '4', options: ['3', '4', '5', '6'] }, { prompt: '长方形有____个角。', answer: '4' }, { prompt: '三角形有____条边。', answer: '3' }, { prompt: '球从桌上滚动，最像哪种平面图形？', answer: '圆形' }] },
    { key: 'length_compare', kind: 'concept', term: '下册', unit: '认识厘米', ability: 'geometry', title: '长度比较', summary: '比较长度时要从同一个起点开始比。', mistakes: ['尺子的0刻度要对准起点。'], values: [{ prompt: '铅笔长12厘米，橡皮长5厘米，谁更长？', answer: '铅笔', options: ['铅笔', '橡皮', '一样长', '无法判断'] }, { prompt: '10厘米比7厘米长多少厘米？', answer: '3', answerUnit: '\u5398\u7c73', options: ['2', '3', '7', '17'] }, { prompt: '测量课桌边长常用____作单位。', answer: '厘米', options: ['厘米', '元', '时', '个'] }, { prompt: '18厘米比20厘米短____厘米。', answer: '2', answerUnit: '\u5398\u7c73' }, { prompt: '一根绳长15厘米，剪去4厘米，还剩____厘米。', answer: '11', answerUnit: '\u5398\u7c73' }, { prompt: '比较两根绳子长度时，要先把一端____。', answer: '对齐' }] },
    { key: 'pattern_addition', kind: 'pattern', term: '下册', unit: '找规律', ability: 'pattern', values: [[2, 2], [3, 3], [5, 2], [10, 5], [4, 4], [6, 3]], summary: '找规律要先比较相邻两个数的变化。', mistakes: ['不要只看一个数，要连续验证。'] },
  ],
  2: [
    { key: 'add_subtract_100', kind: 'add', term: '上册', unit: '100以内加减法', ability: 'calculation', values: [[36, 27], [48, 35], [57, 26], [29, 64], [45, 38], [67, 25]], summary: '两位数加法要个位、十位分别计算。', mistakes: ['进位后别忘了加到十位。'] },
    { key: 'multiplication_table', kind: 'multiply', term: '上册', unit: '表内乘法', ability: 'calculation', values: [[6, 7], [8, 5], [9, 4], [7, 3], [6, 8], [9, 6]], summary: '求几个相同加数的和可以用乘法。', mistakes: ['乘数和被乘数的位置可以交换，结果不变。'] },
    { key: 'division_table', kind: 'divide', term: '下册', unit: '表内除法', ability: 'calculation', values: [[42, 6], [40, 5], [54, 9], [56, 7], [48, 8], [63, 9]], summary: '平均分用除法，结果叫商。', mistakes: ['想乘法口诀检查除法。'] },
    { key: 'number_within_10000', kind: 'concept', term: '下册', unit: '万以内数的认识', ability: 'calculation', title: '数位', summary: '从右往左依次是个位、十位、百位、千位。', mistakes: ['不要把数位和数字本身混淆。'], values: [{ prompt: '3052中的5在什么位？', answer: '十位', options: ['个位', '十位', '百位', '千位'] }, { prompt: '4000里面有几个千？', answer: '4', options: ['0', '4', '40', '400'] }, { prompt: '最大的三位数是？', answer: '999', options: ['99', '900', '999', '1000'] }, { prompt: '2708读作____。', answer: '二千七百零八' }, { prompt: '6个百和3个十组成____。', answer: '630' }, { prompt: '1000比999多____。', answer: '1' }] },
    { key: 'length_unit', kind: 'concept', term: '上册', unit: '长度单位', ability: 'geometry', title: '米和厘米', summary: '较长的物体常用米，较短的物体常用厘米。', mistakes: ['1米等于100厘米。'], values: [{ prompt: '教室门高约2____。', answer: '米', options: ['米', '厘米', '元', '时'] }, { prompt: '橡皮长约4____。', answer: '厘米', options: ['米', '厘米', '千米', '元'] }, { prompt: '1米等于多少厘米？', answer: '100', answerUnit: '\u5398\u7c73', options: ['10', '50', '100', '1000'] }, { prompt: '3米=____厘米。', answer: '300', answerUnit: '\u5398\u7c73' }, { prompt: '250厘米=____米____厘米。', answer: '2米50厘米' }, { prompt: '跑道长常用____作单位。', answer: '米' }] },
    { key: 'time_duration', kind: 'timeDuration', term: '下册', unit: '时间的认识', ability: 'data', values: [[10, 25], [15, 20], [5, 30], [10, 15], [20, 35], [5, 10]], summary: '求经过时间可以用结束时刻减开始时刻。', mistakes: ['要统一成同一种时间单位。'] },
    { key: 'angle_right', kind: 'concept', term: '上册', unit: '角的初步认识', ability: 'geometry', title: '直角', summary: '直角像方方正正的墙角。', mistakes: ['直角和尖角要看开口大小。'], values: [{ prompt: '三角尺上最大的直直的角是？', answer: '直角', options: ['锐角', '直角', '钝角', '平角'] }, { prompt: '直角有多少度？', answer: '90', answerUnit: '\u5ea6', options: ['45', '90', '120', '180'] }, { prompt: '课桌的角通常是？', answer: '直角', options: ['直角', '圆角', '没有角', '钝角'] }, { prompt: '比直角小的角叫____。', answer: '锐角' }, { prompt: '一个长方形有____个直角。', answer: '4' }, { prompt: '两条边张开成方方正正的角是____。', answer: '直角' }] },
    { key: 'data_compare', kind: 'dataCompare', term: '下册', unit: '数据收集整理', ability: 'data', values: [[12, 3], [15, 5], [20, 4], [18, 2], [10, 6], [25, 5]], summary: '读数据时先看每一项表示多少，再比较。', mistakes: ['比较多少用较大数减较小数。'] },
  ],
  3: [
    { key: 'multiply_two_digit', kind: 'multiply', term: '上册', unit: '多位数乘一位数', ability: 'calculation', values: [[24, 3], [36, 2], [45, 4], [18, 5], [27, 3], [32, 4]], summary: '多位数乘一位数要从个位乘起。', mistakes: ['进位数要加到下一位。'] },
    { key: 'division_remainder', kind: 'remainder', term: '上册', unit: '有余数的除法', ability: 'calculation', values: [[34, 5], [29, 4], [43, 6], [38, 7], [50, 8], [26, 3]], summary: '有余数时，余数一定比除数小。', mistakes: ['余数不能等于或大于除数。'] },
    { key: 'fraction_compare', kind: 'concept', term: '上册', unit: '分数的初步认识', ability: 'calculation', title: '分数', summary: '同分母分数比较大小时，看分子。', mistakes: ['分母相同才能直接比较分子。'], values: [{ prompt: '1/4表示把整体平均分成几份？', answer: '4', options: ['1', '2', '4', '8'] }, { prompt: '同一块蛋糕的1/2和1/4，哪个大？', answer: '1/2', options: ['1/2', '1/4', '一样大', '无法比较'] }, { prompt: '3/5的分子是？', answer: '3', options: ['3', '5', '8', '15'] }, { prompt: '把一张纸平均分成8份，取3份是____。', answer: '3/8' }, { prompt: '分母相同，分子大的分数____。', answer: '大' }, { prompt: '1/3+1/3=____。', answer: '2/3' }] },
    { key: 'rectangle_perimeter_g3', kind: 'perimeter', term: '上册', unit: '长方形和正方形', ability: 'geometry', values: [[8, 5], [12, 4], [15, 6], [10, 7], [18, 9], [20, 8]], summary: '长方形周长等于（长+宽）×2。', mistakes: ['周长要把四条边都算上。'] },
    { key: 'mass_convert', kind: 'concept', term: '下册', unit: '质量单位', ability: 'data', title: '千克和克', summary: '较重物体常用千克，较轻物体常用克。', mistakes: ['1千克等于1000克。'], values: [{ prompt: '一袋大米重5____。', answer: '千克', options: ['千克', '克', '厘米', '元'] }, { prompt: '一枚硬币约重6____。', answer: '克', options: ['千克', '克', '米', '时'] }, { prompt: '1千克等于多少克？', answer: '1000', answerUnit: '\u514b', options: ['10', '100', '1000', '10000'] }, { prompt: '3千克=____克。', answer: '3000', answerUnit: '\u514b' }, { prompt: '2500克=____千克____克。', answer: '2千克500克' }, { prompt: '称体重常用____。', answer: '千克' }] },
    { key: 'area_rectangle_g3', kind: 'area', term: '下册', unit: '面积', ability: 'geometry', values: [[6, 4], [8, 5], [9, 3], [12, 4], [7, 6], [10, 8]], summary: '长方形面积等于长乘宽。', mistakes: ['面积单位不要写成长度单位。'] },
    { key: 'decimal_tenths', kind: 'decimalTenths', term: '下册', unit: '小数的初步认识', ability: 'calculation', values: [[1.2, 2], [2.5, 2], [3.4, 2], [1.5, 4], [2.2, 3], [4.1, 2]], summary: '小数点后第一位表示十分之几。', mistakes: ['不要把十分位和个位混淆。'] },
    { key: 'average_g3', kind: 'average', term: '下册', unit: '数据整理', ability: 'data', answerUnit: '下', activity: '跳绳', averageVerb: '跳', values: [[10, 2], [12, 3], [15, 2], [20, 5], [8, 4], [16, 3]], summary: '平均数等于总数除以份数。', mistakes: ['要用总数除以记录的次数。'] },
  ],
  5: [
    { key: 'decimal_multiply', kind: 'decimalMultiply', term: '上册', unit: '小数乘法', ability: 'calculation', values: [[1.2, 3], [2.5, 4], [3.6, 2], [1.25, 4], [4.8, 5], [2.4, 1.5]], summary: '先按整数乘法算，再数因数中小数位数点小数点。', mistakes: ['小数位数要从两个因数合起来数。'] },
    { key: 'decimal_divide', kind: 'decimalDivide', term: '上册', unit: '小数除法', ability: 'calculation', values: [[7.2, 3], [8.4, 4], [9.6, 2], [12.5, 5], [15.6, 6], [18.9, 3]], summary: '除数是整数时，小数点要和被除数的小数点对齐。', mistakes: ['商的小数点不能漏写。'] },
    { key: 'factor_multiple', kind: 'concept', term: '上册', unit: '因数与倍数', ability: 'calculation', title: '因数和倍数', summary: 'a÷b没有余数时，a是b的倍数，b是a的因数。', mistakes: ['因数和倍数必须成对说。'], values: [{ prompt: '12的因数不包括？', answer: '5', options: ['1', '2', '3', '5'] }, { prompt: '18是6的什么数？', answer: '倍数', options: ['因数', '倍数', '质数', '小数'] }, { prompt: '最小的质数是？', answer: '2', options: ['1', '2', '3', '5'] }, { prompt: '20的最大因数是____。', answer: '20', options: ['1', '10', '20', '40'] }, { prompt: '3的最小倍数是____。', answer: '3' }, { prompt: '2、3、5都是____。', answer: '质数' }] },
    { key: 'fraction_add', kind: 'concept', term: '下册', unit: '分数加减法', ability: 'calculation', title: '同分母分数加减', summary: '同分母分数相加减，分母不变，只算分子。', mistakes: ['分母不能跟着一起加减。'], values: [{ prompt: '2/7+3/7=？', answer: '5/7', options: ['5/14', '5/7', '6/7', '1'] }, { prompt: '6/9-2/9=？', answer: '4/9', options: ['4/18', '4/9', '8/9', '2/9'] }, { prompt: '1/5+1/5=？', answer: '2/5', options: ['2/10', '2/5', '1/5', '1'] }, { prompt: '4/11+3/11=____。', answer: '7/11' }, { prompt: '8/13-5/13=____。', answer: '3/13' }, { prompt: '同分母分数加减，分母____。', answer: '不变' }] },
    { key: 'area_rectangle_g5', kind: 'area', term: '上册', unit: '多边形的面积', ability: 'geometry', values: [[12, 8], [15, 6], [9, 7], [20, 5], [14, 10], [18, 12]], summary: '求面积先确认图形的底和高（或长和宽）。', mistakes: ['面积和周长的公式不能混用。'] },
    { key: 'volume_cuboid', kind: 'volume', height: 3, term: '下册', unit: '长方体和正方体', ability: 'geometry', values: [[4, 2], [5, 3], [6, 2], [8, 2], [3, 5], [7, 2]], summary: '长方体体积等于长乘宽乘高。', mistakes: ['三个长度都要参与相乘。'] },
    { key: 'unit_conversion_g5', kind: 'concept', term: '下册', unit: '单位换算', ability: 'data', title: '单位换算', summary: '换算前先记住相邻单位之间的进率。', mistakes: ['大单位换小单位用乘法。'], values: [{ prompt: '1平方米等于多少平方分米？', answer: '100', answerUnit: '\u5e73\u65b9\u5206\u7c73', options: ['10', '100', '1000', '10000'] }, { prompt: '2.5千米等于多少米？', answer: '2500', answerUnit: '\u7c73', options: ['25', '250', '2500', '25000'] }, { prompt: '500毫升等于多少升？', answer: '0.5', answerUnit: '\u5347', options: ['5', '0.5', '50', '500'] }, { prompt: '3.6千米=____米。', answer: '3600', answerUnit: '\u7c73' }, { prompt: '750毫升=____升。', answer: '0.75', answerUnit: '\u5347' }, { prompt: '把大单位换成小单位要____。', answer: '乘进率' }] },
    { key: 'average_g5', kind: 'average', term: '下册', unit: '折线统计图', ability: 'data', answerUnit: '页', activity: '阅读', averageVerb: '读', values: [[15, 5], [20, 4], [25, 5], [30, 3], [12, 6], [18, 4]], summary: '平均数等于总数除以份数。', mistakes: ['要把所有记录相加后再除以次数。'] },
  ],
  6: [
    { key: 'fraction_multiply', kind: 'concept', term: '上册', unit: '分数乘法', ability: 'calculation', title: '分数乘法', summary: '分数乘法用分子乘分子、分母乘分母，能约分先约分。', mistakes: ['不要把分子和分母交叉相加。'], values: [{ prompt: '2/3×3/5=？', answer: '2/5', options: ['2/15', '2/5', '5/2', '1'] }, { prompt: '1/4×8=？', answer: '2', options: ['1/2', '2', '4', '8'] }, { prompt: '3/7×7/9=？', answer: '1/3', options: ['1/9', '1/3', '7/9', '10/16'] }, { prompt: '5/6×3/5=____。', answer: '1/2' }, { prompt: '2/9×3/4=____。', answer: '1/6' }, { prompt: '分数乘法结果要能约分就____。', answer: '约分' }] },
    { key: 'fraction_divide', kind: 'concept', term: '上册', unit: '分数除法', ability: 'calculation', title: '分数除法', summary: '除以一个分数等于乘这个分数的倒数。', mistakes: ['除号变乘号后，只有除数要变倒数。'], values: [{ prompt: '3/4÷1/2=？', answer: '3/2', options: ['3/8', '3/2', '1/2', '2/3'] }, { prompt: '2/5÷4/5=？', answer: '1/2', options: ['8/25', '1/2', '2', '4/2'] }, { prompt: '5/6÷5/3=？', answer: '1/2', options: ['25/18', '1/2', '2', '3/5'] }, { prompt: '4/7÷2/3=____。', answer: '6/7' }, { prompt: '3/8÷9/4=____。', answer: '1/6' }, { prompt: '分数除法要乘除数的____。', answer: '倒数' }] },
    { key: 'ratio', kind: 'ratio', term: '上册', unit: '比', ability: 'problem', values: [[2, 3], [4, 5], [3, 7], [5, 8], [6, 1], [7, 9]], summary: '比表示两个量相除的关系，写作前项:后项。', mistakes: ['比的前项和后项顺序不能颠倒。'] },
    { key: 'percent', kind: 'percent', term: '上册', unit: '百分数', ability: 'problem', values: [[80, 25], [120, 50], [200, 15], [60, 30], [150, 20], [300, 10]], summary: '求一个数的百分之几，用这个数乘百分数。', mistakes: ['百分数要先理解成除以100。'] },
    { key: 'circle', kind: 'concept', term: '上册', unit: '圆', ability: 'geometry', title: '圆', summary: '圆周率约等于3.14，圆的周长等于直径乘圆周率。', mistakes: ['半径和直径相差2倍。'], values: [{ prompt: '半径5厘米的圆，直径是多少厘米？', answer: '10', answerUnit: '\u5398\u7c73', options: ['2.5', '5', '10', '15'] }, { prompt: '圆周率通常取多少？', answer: '3.14', options: ['3', '3.14', '3.41', '31.4'] }, { prompt: '直径是半径的几倍？', answer: '2', options: ['1/2', '1', '2', '4'] }, { prompt: '半径8厘米，直径是____厘米。', answer: '16', answerUnit: '\u5398\u7c73' }, { prompt: '直径12厘米，半径是____厘米。', answer: '6', answerUnit: '\u5398\u7c73' }, { prompt: '圆的中心叫____。', answer: '圆心' }] },
    { key: 'proportion', kind: 'proportion', term: '下册', unit: '比例', ability: 'problem', values: [[24, 3], [36, 4], [45, 5], [56, 7], [63, 9], [72, 8]], summary: '解比例前先看两个比是否相等，再用交叉相乘求未知数。', mistakes: ['等号两边的对应量要对齐。'] },
    { key: 'negative_number', kind: 'concept', term: '下册', unit: '负数', ability: 'data', title: '负数', summary: '0的左边是负数，离0越远数越小。', mistakes: ['负数比较大小时，绝对值大反而数更小。'], values: [{ prompt: '-3和2，哪个数大？', answer: '2', options: ['-3', '2', '一样大', '无法比较'] }, { prompt: '-5比-2怎样？', answer: '小', options: ['大', '小', '一样', '无法判断'] }, { prompt: '0左边的数叫？', answer: '负数', options: ['正数', '负数', '自然数', '小数'] }, { prompt: '-8+3=____。', answer: '-5' }, { prompt: '温度-2℃比0℃____。', answer: '低' }, { prompt: '-1、0、1中最小的是____。', answer: '-1' }] },
    { key: 'volume_cone', kind: 'coneVolume', term: '下册', unit: '圆柱与圆锥', ability: 'geometry', values: [[6, 3], [9, 2], [12, 3], [15, 2], [18, 3], [21, 2]], summary: '圆锥体积等于底面积乘高再除以3。', mistakes: ['圆锥体积还要除以3。'] },
  ],
};

module.exports = { buildGradeBank, definitions };

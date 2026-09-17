const JUNIOR_GAME_CATALOG = [
  { type: 'rational-number', name: '有理数轨道', icon: '/assets/icons/route.svg', grades: [7], schoolStage: 'junior', ability: 'calculation', topicKeys: { 7: ['rational_number'] }, description: '用数轴和相反数完成有理数运算' },
  { type: 'algebra-expression', name: '代数式工坊', icon: '/assets/icons/layers.svg', grades: [7], schoolStage: 'junior', ability: 'calculation', topicKeys: { 7: ['algebraic_expression'] }, description: '代入、合并并求出代数式的值' },
  { type: 'equation-lab', name: '方程实验室', icon: '/assets/icons/target.svg', grades: [7], schoolStage: 'junior', ability: 'calculation', topicKeys: { 7: ['linear_equation'] }, description: '根据等量关系分步求未知数' },
  { type: 'geometry-clue', name: '几何线索局', icon: '/assets/icons/search.svg', grades: [7, 8, 9], schoolStage: 'junior', ability: 'geometry', topicKeys: { 7: ['angle_line', 'triangle_intro'], 8: ['congruent_triangle', 'geometry_proof'], 9: ['circle', 'similar_triangle', 'geometry_comprehensive'] }, description: '只用文字条件完成对应年级的几何推理' },
  { type: 'data-reasoning', name: '数据推理所', icon: '/assets/icons/chart-no-axes-column-increasing.svg', grades: [7, 8], schoolStage: 'junior', ability: 'data', topicKeys: { 7: ['data_statistics'], 8: ['data_analysis'] }, description: '用数据总量、平均数和修正关系推理' },
  { type: 'function-match', name: '函数配对站', icon: '/assets/icons/route.svg', grades: [8], schoolStage: 'junior', ability: 'pattern', topicKeys: { 8: ['linear_function'] }, description: '连接解析式、点和函数值' },
  { type: 'pythagorean-route', name: '勾股路径', icon: '/assets/icons/target.svg', grades: [8], schoolStage: 'junior', ability: 'geometry', topicKeys: { 8: ['pythagorean'] }, description: '选择直角三角形中的边长关系' },
  { type: 'radical-reasoning', name: '实数根式站', icon: '/assets/icons/layers.svg', grades: [8], schoolStage: 'junior', ability: 'calculation', topicKeys: { 8: ['real_number'] }, description: '连接平方根、立方根和实数运算' },
  { type: 'probability-lab', name: '概率试验台', icon: '/assets/icons/layers.svg', grades: [9], schoolStage: 'junior', ability: 'data', topicKeys: { 9: ['probability'] }, description: '数清所有等可能结果并化简' },
  { type: 'quadratic-path', name: '二次方程路径', icon: '/assets/icons/route.svg', grades: [9], schoolStage: 'junior', ability: 'calculation', topicKeys: { 9: ['quadratic_equation'] }, description: '从因式和根的关系分步求值' },
  { type: 'trig-exact', name: '锐角三角比', icon: '/assets/icons/target.svg', grades: [9], schoolStage: 'junior', ability: 'geometry', topicKeys: { 9: ['right_triangle'] }, description: '在直角三角形中连接三角比与边长' },
  { type: 'sample-inference', name: '样本推断室', icon: '/assets/icons/chart-no-axes-column-increasing.svg', grades: [9], schoolStage: 'junior', ability: 'data', topicKeys: { 9: ['data_inference'] }, description: '从样本比例估计总体数量' },
];

const JUNIOR_GAME_TYPES = JUNIOR_GAME_CATALOG.map((game) => game.type);
const REASONING_DEPTH = { easy: 1, medium: 2, hard: 3 };

function randomInt(rng, minimum, maximum) {
  return minimum + Math.floor(rng() * (maximum - minimum + 1));
}

function pick(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function shuffle(items, rng) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const value = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = value;
  }
  return result;
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}

function fraction(numerator, denominator) {
  const divisor = greatestCommonDivisor(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

function uniqueChoices(answer, candidates, rng) {
  const values = [answer];
  candidates.forEach((candidate) => {
    if (!values.some((value) => String(value) === String(candidate))) values.push(candidate);
  });
  let offset = 1;
  while (values.length < 4) {
    const numericAnswer = Number(answer);
    const candidate = Number.isFinite(numericAnswer) ? numericAnswer + offset : `${answer}-${offset}`;
    if (!values.some((value) => String(value) === String(candidate))) values.push(candidate);
    offset += 1;
  }
  return shuffle(values.slice(0, 4), rng);
}

function numericChoices(answer, rng, spread = 1) {
  return uniqueChoices(answer, [answer + spread, answer - spread, answer + spread * 2, answer - spread * 2], rng);
}

function fractionChoices(answer, numerator, denominator, rng) {
  return uniqueChoices(answer, [
    fraction(numerator + 1, denominator),
    fraction(Math.max(1, numerator - 1), denominator),
    fraction(numerator, denominator + 1),
    fraction(numerator + denominator, denominator * 2),
  ], rng);
}

function makeJuniorChoice(type, options, build, config = {}) {
  const difficulty = ['easy', 'medium', 'hard'].includes(options.difficulty) ? options.difficulty : 'easy';
  const rng = options.rng || Math.random;
  const recent = new Set(Array.isArray(options.recentSignatures) ? options.recentSignatures : []);
  const meta = JUNIOR_GAME_CATALOG.find((game) => game.type === type);
  const requestedGrade = Number(options.grade);
  const grade = meta.grades.includes(requestedGrade) ? requestedGrade : meta.grades[0];
  const candidateCount = Number(config.candidateCount);
  const exhaustivePool = Number.isInteger(candidateCount) && candidateCount > 0;
  const attemptLimit = exhaustivePool ? candidateCount : 80;
  let fallback = null;
  for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
    const built = build(difficulty, rng, grade, attempt);
    const challenge = {
      type,
      difficulty,
      schoolStage: 'junior',
      grade,
      mode: 'choice',
      reasoningDepth: REASONING_DEPTH[difficulty],
      ...built,
    };
    fallback = challenge;
    if (!recent.has(challenge.signature)) return challenge;
  }
  // Exhaustive generators enumerate their complete pool in a stable order. A repeat is
  // returned only when every candidate is recent, and is marked so callers do not claim an alternative existed.
  return exhaustivePool ? { ...fallback, repeatExhausted: true } : fallback;
}

function generateRationalNumber(options = {}) {
  return makeJuniorChoice('rational-number', options, (difficulty, rng) => {
    if (difficulty === 'easy') {
      const left = randomInt(rng, -8, 12);
      const magnitude = randomInt(rng, 2, 10);
      const answer = left - magnitude;
      return {
        signature: `jrat:e:${left}:${magnitude}`,
        answer,
        choices: numericChoices(answer, rng, 2),
        title: '有理数加法',
        instruction: `计算 ${left} + (-${magnitude})。`,
        explanation: `加上 -${magnitude} 就是在数轴上向左移动 ${magnitude} 格，${left}-${magnitude}=${answer}。`,
      };
    }
    if (difficulty === 'medium') {
      const start = randomInt(rng, -15, 8);
      const distance = randomInt(rng, 3, 12);
      const direction = rng() < 0.5 ? -1 : 1;
      const change = direction * distance;
      const answer = start + change;
      return {
        signature: `jrat:m:${start}:${change}`,
        answer,
        choices: numericChoices(answer, rng, 3),
        title: '数轴方向推理',
        instruction: `从数轴上的 ${start} 出发，${direction < 0 ? '向左' : '向右'}移动 ${distance} 个单位，终点表示什么数？`,
        explanation: `${direction < 0 ? '向左用减法' : '向右用加法'}，${start}${change >= 0 ? '+' : ''}${change}=${answer}。`,
      };
    }
    const magnitude = randomInt(rng, 3, 15);
    const offset = randomInt(rng, 2, 11);
    const x = -magnitude;
    const answer = 2 * x + offset;
    return {
      signature: `jrat:h:${magnitude}:${offset}`,
      answer,
      choices: numericChoices(answer, rng, 4),
      title: '绝对值条件推理',
      instruction: `已知 |x|=${magnitude} 且 x<0，求 2x+${offset} 的值。`,
      explanation: `由 |x|=${magnitude} 且 x<0 得 x=-${magnitude}，再代入 2x+${offset}，结果是 ${answer}。`,
    };
  });
}

function generateAlgebraExpression(options = {}) {
  return makeJuniorChoice('algebra-expression', options, (difficulty, rng) => {
    const first = randomInt(rng, 2, 7);
    const second = randomInt(rng, 2, 7);
    if (difficulty === 'easy') {
      const x = randomInt(rng, 2, 9);
      const offset = randomInt(rng, 1, 10);
      const answer = first * x + offset;
      return {
        signature: `jalg:e:${first}:${x}:${offset}`,
        answer,
        choices: numericChoices(answer, rng, first),
        title: '代数式求值',
        instruction: `当 x=${x} 时，代数式 ${first}x+${offset} 的值是多少？`,
        explanation: `把 x=${x} 代入，${first}×${x}+${offset}=${answer}。`,
      };
    }
    if (difficulty === 'medium') {
      const constant = randomInt(rng, 1, 9);
      const answer = first + second;
      return {
        signature: `jalg:m:${first}:${second}:${constant}`,
        answer,
        choices: numericChoices(answer, rng, 2),
        title: '合并同类项',
        instruction: `化简 ${first}x+${second}x-${constant} 后，x 的系数是多少？`,
        explanation: `${first}x 与 ${second}x 是同类项，系数相加得 ${first}+${second}=${answer}。`,
      };
    }
    const x = randomInt(rng, 2, 6);
    const constant = randomInt(rng, 3, 12);
    const answer = (first + second) * x - constant;
    return {
      signature: `jalg:h:${first}:${second}:${x}:${constant}`,
      answer,
      choices: numericChoices(answer, rng, first + second),
      title: '先化简再求值',
      instruction: `先化简 ${first}x+${second}x-${constant}，再求 x=${x} 时的值。`,
      explanation: `先合并为 ${first + second}x-${constant}，再代入 x=${x}，得到 ${answer}。`,
    };
  });
}

function generateEquationLab(options = {}) {
  return makeJuniorChoice('equation-lab', options, (difficulty, rng, grade) => {
    const x = randomInt(rng, 2, 6 + grade);
    if (difficulty === 'easy') {
      const addend = randomInt(rng, 2, 12);
      const total = x + addend;
      return {
        signature: `jeq:e:${addend}:${total}`,
        answer: x,
        choices: numericChoices(x, rng),
        title: '解一元一次方程',
        instruction: `方程 x + ${addend} = ${total}，x 等于多少？`,
        explanation: `等式两边同时减 ${addend}，x = ${total} - ${addend} = ${x}。`,
      };
    }
    const coefficient = randomInt(rng, 2, 7);
    const offset = randomInt(rng, 1, 12);
    if (difficulty === 'medium') {
      const total = coefficient * x + offset;
      return {
        signature: `jeq:m:${coefficient}:${offset}:${total}`,
        answer: x,
        choices: numericChoices(x, rng),
        title: '解一元一次方程',
        instruction: `方程 ${coefficient}x + ${offset} = ${total}，x 等于多少？`,
        explanation: `先减 ${offset} 得 ${coefficient}x = ${total - offset}，再除以 ${coefficient}，x = ${x}。`,
      };
    }
    const subtract = randomInt(rng, 2, 10);
    const total = coefficient * (x + offset) - subtract;
    return {
      signature: `jeq:h:${coefficient}:${offset}:${subtract}:${total}`,
      answer: x,
      choices: numericChoices(x, rng),
      title: '解含括号的一元一次方程',
      instruction: `方程 ${coefficient}(x + ${offset}) - ${subtract} = ${total}，x 等于多少？`,
      explanation: `先加 ${subtract}，再除以 ${coefficient}，最后减 ${offset}，x = ${x}。`,
    };
  });
}

function generateFunctionMatch(options = {}) {
  return makeJuniorChoice('function-match', options, (difficulty, rng) => {
    const slope = randomInt(rng, 2, 6);
    const intercept = randomInt(rng, 1, 9);
    if (difficulty === 'easy') {
      const x = randomInt(rng, 1, 8);
      const answer = slope * x + intercept;
      return {
        signature: `jfun:e:${slope}:${intercept}:${x}`,
        answer,
        choices: numericChoices(answer, rng, slope),
        title: '求一次函数值',
        instruction: `一次函数 y = ${slope}x + ${intercept}，当 x = ${x} 时，y 等于多少？`,
        explanation: `代入 x = ${x}，y = ${slope}×${x} + ${intercept} = ${answer}。`,
      };
    }
    if (difficulty === 'medium') {
      const x1 = randomInt(rng, 1, 5);
      const distance = randomInt(rng, 1, 4);
      const x2 = x1 + distance;
      const y1 = slope * x1 + intercept;
      const y2 = slope * x2 + intercept;
      return {
        signature: `jfun:m:${x1}:${y1}:${x2}:${y2}`,
        answer: slope,
        choices: numericChoices(slope, rng),
        title: '由两点求变化率',
        instruction: `一次函数经过点 (${x1}, ${y1}) 和 (${x2}, ${y2})，它的变化率是多少？`,
        explanation: `变化率 = (${y2}-${y1})÷(${x2}-${x1}) = ${slope}。`,
      };
    }
    const innerSlope = randomInt(rng, 2, 4);
    const innerOffset = randomInt(rng, 1, 6);
    const x = randomInt(rng, 1, 5);
    const innerValue = innerSlope * x + innerOffset;
    const answer = slope * innerValue + intercept;
    return {
      signature: `jfun:h:${slope}:${intercept}:${innerSlope}:${innerOffset}:${x}`,
      answer,
      choices: numericChoices(answer, rng, slope),
      title: '求复合函数值',
      instruction: `f(x) = ${slope}x + ${intercept}，g(x) = ${innerSlope}x + ${innerOffset}，求 f(g(${x}))。`,
      explanation: `先算 g(${x}) = ${innerValue}，再算 f(${innerValue}) = ${answer}。`,
    };
  });
}

function generateGeometryClue(options = {}) {
  return makeJuniorChoice('geometry-clue', options, (difficulty, rng, grade) => {
    if (grade === 8) {
      if (difficulty === 'easy') {
        const side = randomInt(rng, 4, 18);
        return {
          signature: `jgeo8:e:${side}`,
          answer: side,
          choices: numericChoices(side, rng, 2),
          title: '全等三角形对应边',
          instruction: `已知 △ABC≌△DEF，顶点按顺序对应，AB=${side}，求 DE。`,
          explanation: `全等三角形的对应边相等，AB 对应 DE，所以 DE=${side}。`,
        };
      }
      if (difficulty === 'medium') {
        const x = randomInt(rng, 2, 9);
        const coefficient = randomInt(rng, 2, 5);
        const offset = randomInt(rng, 1, 8);
        const side = coefficient * x + offset;
        return {
          signature: `jgeo8:m:${coefficient}:${offset}:${side}`,
          answer: x,
          choices: numericChoices(x, rng, 2),
          title: '由对应边列方程',
          instruction: `已知 △ABC≌△DEF，BC=${coefficient}x+${offset}，对应边 EF=${side}，求 x。`,
          explanation: `对应边相等，所以 ${coefficient}x+${offset}=${side}，解得 x=${x}。`,
        };
      }
      const firstAngle = randomInt(rng, 35, 70);
      const secondAngle = randomInt(rng, 35, 120 - firstAngle);
      const answer = 180 - firstAngle - secondAngle;
      return {
        signature: `jgeo8:h:${firstAngle}:${secondAngle}`,
        answer,
        choices: numericChoices(answer, rng, 5),
        title: '全等关系推理链',
        instruction: `已知 △ABC≌△DEF，顶点按顺序对应，∠A=${firstAngle}°，∠B=${secondAngle}°。求对应角 ∠F。`,
        explanation: `先由三角形内角和得 ∠C=180-${firstAngle}-${secondAngle}=${answer}°，再由全等知 ∠F=∠C=${answer}°。`,
      };
    }
    if (grade === 9) {
      if (difficulty === 'easy') {
        const radius = randomInt(rng, 3, 15);
        return {
          signature: `jgeo9:e:${radius}`,
          answer: radius,
          choices: numericChoices(radius, rng, 2),
          title: '圆的半径关系',
          instruction: `一个圆的直径是 ${radius * 2}，它的半径是多少？`,
          explanation: `半径等于直径的一半，${radius * 2}÷2=${radius}。`,
        };
      }
      if (difficulty === 'medium') {
        const shortSide = randomInt(rng, 3, 10);
        const scale = randomInt(rng, 2, 5);
        const answer = shortSide * scale;
        return {
          signature: `jgeo9:m:${shortSide}:${scale}`,
          answer,
          choices: numericChoices(answer, rng, shortSide),
          title: '相似三角形比例测量',
          instruction: `两个相似三角形的相似比为 1:${scale}，小三角形一条边长 ${shortSide}，大三角形对应边长多少？`,
          explanation: `对应边按相似比同时放大 ${scale} 倍，${shortSide}×${scale}=${answer}。`,
        };
      }
      const triple = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17]], rng);
      const scale = randomInt(rng, 1, 4);
      const radius = triple[0] * scale;
      const centerDistance = triple[2] * scale;
      const answer = triple[1] * scale;
      return {
        signature: `jgeo9:h:${triple[0]}:${triple[1]}:${triple[2]}:${scale}`,
        answer,
        choices: numericChoices(answer, rng, scale),
        title: '切线与半径综合',
        instruction: `从圆外点 P 向圆 O 作切线 PT，OT 是半径。已知 OP=${centerDistance}，OT=${radius}，求 PT。`,
        explanation: `半径 OT 垂直切线 PT，所以 △OPT 是直角三角形，PT=√(${centerDistance}²-${radius}²)=${answer}。`,
      };
    }
    if (difficulty === 'easy') {
      const first = randomInt(rng, 30, 70);
      const second = randomInt(rng, 30, 140 - first);
      const answer = 180 - first - second;
      return {
        signature: `jgeo:e:${first}:${second}`,
        answer,
        choices: numericChoices(answer, rng, 5),
        title: '三角形内角推理',
        instruction: `一个三角形的两个内角分别是 ${first}° 和 ${second}°，第三个内角是多少度？`,
        explanation: `三角形内角和是 180°，第三个角是 180-${first}-${second} = ${answer}°，答案是 ${answer}。`,
      };
    }
    if (difficulty === 'medium') {
      const apex = randomInt(rng, 20, 70) * 2;
      const answer = (180 - apex) / 2;
      return {
        signature: `jgeo:m:${apex}`,
        answer,
        choices: numericChoices(answer, rng, 5),
        title: '等腰三角形角度推理',
        instruction: `等腰三角形的顶角是 ${apex}°，两个底角相等，每个底角是多少度？`,
        explanation: `先算两个底角和 180-${apex}=${180 - apex}，再平均分，每个底角是 ${answer}°，答案是 ${answer}。`,
      };
    }
    const exterior = randomInt(rng, 100, 150);
    const remote = randomInt(rng, 30, exterior - 30);
    const otherRemote = exterior - remote;
    const adjacent = 180 - exterior;
    const answer = otherRemote + adjacent;
    return {
      signature: `jgeo:h:${exterior}:${remote}`,
      answer,
      choices: numericChoices(answer, rng, 5),
      title: '三角形外角综合推理',
      instruction: `三角形一个外角是 ${exterior}°，一个不相邻内角是 ${remote}°。求另一个不相邻内角与这个外角的相邻内角之和。`,
      explanation: `另一个不相邻内角是 ${exterior}-${remote}=${otherRemote}°，相邻内角是 180-${exterior}=${adjacent}°，所求和是 ${answer}°，答案是 ${answer}。`,
    };
  });
}

function generatePythagoreanRoute(options = {}) {
  return makeJuniorChoice('pythagorean-route', options, (difficulty, rng) => {
    const triple = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]], rng);
    const scale = randomInt(rng, 1, 4);
    const first = triple[0] * scale;
    const second = triple[1] * scale;
    const hypotenuse = triple[2] * scale;
    if (difficulty === 'easy') {
      return {
        signature: `jpyth:e:${triple[0]}:${triple[1]}:${triple[2]}:${scale}`,
        answer: hypotenuse,
        choices: numericChoices(hypotenuse, rng, scale),
        title: '由直角边求斜边',
        instruction: `直角三角形的两条直角边长为 ${first} 和 ${second}，斜边长多少？`,
        explanation: `由勾股定理，斜边长为 √(${first}²+${second}²)=${hypotenuse}。`,
      };
    }
    if (difficulty === 'medium') {
      return {
        signature: `jpyth:m:${triple[0]}:${triple[1]}:${triple[2]}:${scale}`,
        answer: second,
        choices: numericChoices(second, rng, scale),
        title: '由斜边求直角边',
        instruction: `直角三角形的斜边长 ${hypotenuse}，一条直角边长 ${first}，另一条直角边长多少？`,
        explanation: `另一条直角边为 √(${hypotenuse}²-${first}²)=${second}。`,
      };
    }
    const answer = hypotenuse + first;
    return {
      signature: `jpyth:h:${triple[0]}:${triple[1]}:${triple[2]}:${scale}`,
      answer,
      choices: numericChoices(answer, rng, scale),
      title: '矩形路径综合',
      instruction: `长方形长 ${second}、宽 ${first}。先求对角线，再求对角线与宽的和。`,
      explanation: `对角线为 √(${second}²+${first}²)=${hypotenuse}，再加宽 ${first}，得到 ${answer}。`,
    };
  });
}

function generateRadicalReasoning(options = {}) {
  return makeJuniorChoice('radical-reasoning', options, (difficulty, rng) => {
    const root = randomInt(rng, 3, 15);
    if (difficulty === 'easy') {
      return {
        signature: `jrad:e:${root}`,
        answer: root,
        choices: numericChoices(root, rng, 2),
        title: '算术平方根',
        instruction: `√${root * root} 的值是多少？`,
        explanation: `${root}²=${root * root}，所以 √${root * root}=${root}。`,
      };
    }
    if (difficulty === 'medium') {
      const cubeRoot = randomInt(rng, 2, 8);
      const answer = root + cubeRoot;
      return {
        signature: `jrad:m:${root}:${cubeRoot}`,
        answer,
        choices: numericChoices(answer, rng, 2),
        title: '平方根与立方根',
        instruction: `计算 √${root * root} + ∛${cubeRoot * cubeRoot * cubeRoot}。`,
        explanation: `√${root * root}=${root}，∛${cubeRoot * cubeRoot * cubeRoot}=${cubeRoot}，相加得 ${answer}。`,
      };
    }
    const offset = randomInt(rng, 2, Math.max(2, root - 1));
    const base = root - offset;
    const answer = base * base;
    return {
      signature: `jrad:h:${root}:${offset}`,
      answer,
      choices: numericChoices(answer, rng, Math.max(2, base)),
      title: '根式方程推理',
      instruction: `若 √x+${offset}=${root}，求 x。`,
      explanation: `先得 √x=${root}-${offset}=${base}，再平方，x=${base}²=${answer}。`,
    };
  });
}

function generateProbabilityLab(options = {}) {
  return makeJuniorChoice('probability-lab', options, (difficulty, rng) => {
    const red = randomInt(rng, 2, 7);
    const blue = randomInt(rng, 2, 7);
    const total = red + blue;
    if (difficulty === 'easy') {
      const answer = fraction(red, total);
      return {
        signature: `jprob:e:${red}:${blue}`,
        answer,
        choices: fractionChoices(answer, red, total, rng),
        title: '一次摸球概率',
        instruction: `袋中有 ${red} 个红球和 ${blue} 个蓝球，每个球被摸到的机会相同。随机摸 1 个球，摸到红球的概率是多少？`,
        explanation: `共有 ${total} 个球，其中红球 ${red} 个，概率是 ${red}/${total} = ${answer}。`,
      };
    }
    if (difficulty === 'medium') {
      const numerator = red * blue;
      const denominator = total * (total - 1);
      const answer = fraction(numerator, denominator);
      return {
        signature: `jprob:m:${red}:${blue}`,
        answer,
        choices: fractionChoices(answer, numerator, denominator, rng),
        title: '不放回连续摸球',
        instruction: `袋中有 ${red} 个红球和 ${blue} 个蓝球。不放回地连续摸 2 个球，先红后蓝的概率是多少？`,
        explanation: `先红的概率是 ${red}/${total}，再蓝是 ${blue}/${total - 1}，相乘并化简得 ${answer}。`,
      };
    }
    const numerator = 2 * red * blue;
    const denominator = total * (total - 1);
    const answer = fraction(numerator, denominator);
    return {
      signature: `jprob:h:${red}:${blue}`,
      answer,
      choices: fractionChoices(answer, numerator, denominator, rng),
      title: '两种顺序的概率',
      instruction: `袋中有 ${red} 个红球和 ${blue} 个蓝球。不放回摸 2 个球，恰好一红一蓝的概率是多少？`,
      explanation: `要合并“先红后蓝”和“先蓝后红”两种顺序，概率和化简为 ${answer}。`,
    };
  });
}

function generateSampleInference(options = {}) {
  return makeJuniorChoice('sample-inference', options, (difficulty, rng) => {
    if (difficulty === 'easy') {
      const sampleSize = pick([40, 50, 80, 100], rng);
      const sampled = randomInt(rng, 1, Math.floor(sampleSize / 10) - 1) * 5;
      const scale = randomInt(rng, 5, 12);
      const population = sampleSize * scale;
      const answer = sampled * scale;
      return {
        signature: `jsample:e:${sampleSize}:${sampled}:${population}`,
        answer,
        choices: numericChoices(answer, rng, scale * 5),
        title: '由样本估计总体',
        instruction: `随机抽查 ${sampleSize} 人，其中 ${sampled} 人符合条件。按这个比例估计 ${population} 人中约有多少人符合条件？`,
        explanation: `样本比例是 ${sampled}/${sampleSize}，用它乘总体 ${population}，估计约有 ${answer} 人。`,
      };
    }
    if (difficulty === 'medium') {
      const firstCount = randomInt(rng, 8, 24);
      const secondCount = randomInt(rng, 12, 30);
      const population = pick([500, 800, 1000], rng);
      const answer = (firstCount + secondCount) * population / 100;
      return {
        signature: `jsample:m:${firstCount}:${secondCount}:${population}`,
        answer,
        choices: numericChoices(answer, rng, population / 20),
        title: '合并样本再估计',
        instruction: `两次随机抽样各调查 50 人，符合条件的分别有 ${firstCount} 人和 ${secondCount} 人。合并样本后，估计总体 ${population} 人中约有多少人符合条件？`,
        explanation: `合并后样本共 100 人，符合条件 ${firstCount + secondCount} 人，按比例估计约有 ${answer} 人。`,
      };
    }
    const sampled = randomInt(rng, 16, 36) * 2;
    const population = pick([500, 1000, 1500], rng);
    const estimate = sampled * population / 100;
    const allowance = population / 50;
    const answer = estimate + allowance;
    return {
      signature: `jsample:h:${sampled}:${population}:${allowance}`,
      answer,
      choices: numericChoices(answer, rng, allowance),
      title: '样本估计的上界',
      instruction: `随机抽查 100 人，其中 ${sampled} 人符合条件。估计总体 ${population} 人中的人数，并把估计值上下各浮动 ${allowance} 人作为合理区间，区间上界是多少？`,
      explanation: `先按样本比例估计 ${sampled}/100×${population}=${estimate} 人，再加浮动量 ${allowance}，上界是 ${answer}。`,
    };
  });
}

function generateDataReasoning(options = {}) {
  return makeJuniorChoice('data-reasoning', options, (difficulty, rng, grade) => {
    if (difficulty === 'easy') {
      const mean = randomInt(rng, 8, 24);
      const distance = randomInt(rng, 2, 6);
      return {
        signature: `jdata:e:${mean}:${distance}`,
        answer: mean,
        choices: numericChoices(mean, rng),
        title: '平均数推理',
        instruction: `三次成绩分别是 ${mean - distance}、${mean}、${mean + distance}，平均数是多少？`,
        explanation: `三数之和是 ${mean * 3}，除以 3，平均数是 ${mean}。`,
      };
    }
    if (difficulty === 'medium') {
      const count = 5;
      const recordedMean = randomInt(rng, 10, 30);
      const wrongValue = randomInt(rng, 6, 22);
      const correction = pick([5, 10, 15], rng);
      const correctValue = wrongValue + correction;
      const answer = recordedMean + correction / count;
      return {
        signature: `jdata:m:${recordedMean}:${wrongValue}:${correctValue}:${count}`,
        answer,
        choices: numericChoices(answer, rng, 2),
        title: '更正数据后的平均数',
        instruction: `${count} 个数据按记录算出的平均数是 ${recordedMean}。复查发现其中一个数把 ${correctValue} 错记成 ${wrongValue}，更正后的平均数是多少？`,
        explanation: `总和应增加 ${correctValue}-${wrongValue}=${correction}，平均数增加 ${correction}÷${count}=${correction / count}，更正后是 ${answer}。`,
      };
    }
    if (grade === 7) {
      const firstCount = 2;
      const secondCount = 3;
      const answer = randomInt(rng, 16, 30);
      const distance = randomInt(rng, 2, 4);
      const firstMean = answer - secondCount * distance;
      const secondMean = answer + firstCount * distance;
      const firstTotal = firstCount * firstMean;
      const secondTotal = secondCount * secondMean;
      return {
        signature: `jdata7:h:${firstCount}:${firstMean}:${secondCount}:${secondMean}`,
        answer,
        choices: numericChoices(answer, rng, distance),
        title: '两组数据合并平均',
        instruction: `第一组有 ${firstCount} 个数据，平均数是 ${firstMean}；第二组有 ${secondCount} 个数据，平均数是 ${secondMean}。把两组合并后，平均数是多少？`,
        explanation: `第一组总和是 ${firstCount}×${firstMean}=${firstTotal}，第二组总和是 ${secondCount}×${secondMean}=${secondTotal}；总和除以 ${firstCount + secondCount}，合并平均数是 ${answer}。`,
      };
    }
    const count = 5;
    const median = randomInt(rng, 15, 30);
    const distance = randomInt(rng, 6, 9);
    const correction = pick([5, 10], rng);
    const wrongValue = median - 2 * distance;
    const correctValue = wrongValue + correction;
    const values = [wrongValue, median - distance, median, median + distance, median + 2 * distance];
    const recordedMean = median;
    const correctedMean = recordedMean + correction / count;
    const answer = correctedMean - median;
    return {
      signature: `jdata:h:${recordedMean}:${wrongValue}:${correctValue}:${median}:${count}`,
      answer,
      choices: numericChoices(answer, rng),
      title: '平均数与中位数综合',
      instruction: `数据 ${values.join('、')} 的平均数是 ${recordedMean}。把错记的 ${wrongValue} 更正为 ${correctValue} 后，更正后的平均数比中位数大多少？`,
      explanation: `更正后平均数是 ${recordedMean}+(${correctValue}-${wrongValue})÷${count}=${correctedMean}；重新排序后中位数仍是 ${median}，两者相差 ${answer}。`,
    };
  });
}

const QUADRATIC_ROOTS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const QUADRATIC_PAIRS = [];
QUADRATIC_ROOTS.forEach((first) => {
  [1, 2, 3, 4].forEach((distance) => QUADRATIC_PAIRS.push([first, first + distance]));
});

function generateQuadraticPath(options = {}) {
  const difficulty = ['easy', 'medium', 'hard'].includes(options.difficulty) ? options.difficulty : 'easy';
  const pool = difficulty === 'easy' ? QUADRATIC_ROOTS : QUADRATIC_PAIRS;
  let startIndex = null;
  return makeJuniorChoice('quadratic-path', options, (level, rng, grade, attempt) => {
    if (startIndex === null) startIndex = randomInt(rng, 0, pool.length - 1);
    const candidate = pool[(startIndex + attempt) % pool.length];
    const first = level === 'easy' ? candidate : candidate[0];
    const second = level === 'easy' ? null : candidate[1];
    if (level === 'easy') {
      return {
        signature: `jquad:e:${first}`,
        answer: first,
        choices: numericChoices(first, rng),
        title: '平方根与方程',
        instruction: `方程 x² = ${first * first}，它的正根是多少？`,
        explanation: `${first}² = ${first * first}，所以正根是 ${first}。`,
      };
    }
    if (level === 'medium') {
      return {
        signature: `jquad:m:${first}:${second}`,
        answer: second,
        choices: numericChoices(second, rng),
        title: '因式分解求根',
        instruction: `方程 (x-${first})(x-${second})=0，较大的根是多少？`,
        explanation: `两个根分别是 ${first} 和 ${second}，较大的根是 ${second}。`,
      };
    }
    const answer = first * first + second * second;
    return {
      signature: `jquad:h:${first}:${second}`,
      answer,
      choices: numericChoices(answer, rng, first + second),
      title: '二次方程根的综合计算',
      instruction: `方程 (x-${first})(x-${second})=0 有两个根。求这两个根的平方和。`,
      explanation: `先由两个因式求得根 ${first}、${second}，再算 ${first}²+${second}²=${answer}，答案是 ${answer}。`,
    };
  }, { candidateCount: pool.length });
}

const TRIG_CANDIDATES = [];
[
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [12, 35, 37],
].forEach((triple) => {
  [1, 2, 3].forEach((scale) => TRIG_CANDIDATES.push({ triple, scale }));
});

function generateTrigExact(options = {}) {
  let startIndex = null;
  return makeJuniorChoice('trig-exact', options, (difficulty, rng, grade, attempt) => {
    if (startIndex === null) startIndex = randomInt(rng, 0, TRIG_CANDIDATES.length - 1);
    const candidate = TRIG_CANDIDATES[(startIndex + attempt) % TRIG_CANDIDATES.length];
    const triple = candidate.triple;
    const scale = candidate.scale;
    const opposite = triple[0];
    const adjacent = triple[1];
    const hypotenuse = triple[2];
    if (difficulty === 'easy') {
      const answer = fraction(opposite, hypotenuse);
      return {
        signature: `jtrig:e:${opposite}:${adjacent}:${hypotenuse}:${scale}`,
        answer,
        choices: fractionChoices(answer, opposite, hypotenuse, rng),
        title: '求锐角的正弦值',
        instruction: `直角三角形中，锐角 A 的对边长 ${opposite * scale}，邻边长 ${adjacent * scale}，斜边长 ${hypotenuse * scale}。sin A 等于多少？`,
        explanation: `sin A = 对边÷斜边 = ${opposite * scale}/${hypotenuse * scale} = ${answer}。`,
      };
    }
    if (difficulty === 'medium') {
      const answer = opposite * scale;
      return {
        signature: `jtrig:m:${opposite}:${adjacent}:${hypotenuse}:${scale}`,
        answer,
        choices: numericChoices(answer, rng, scale),
        title: '由正弦比求边长',
        instruction: `直角三角形中 sin A=${opposite}/${hypotenuse}，斜边长 ${hypotenuse * scale}，锐角 A 的对边长多少？`,
        explanation: `斜边从 ${hypotenuse} 扩大到 ${hypotenuse * scale}，扩大 ${scale} 倍；对边也扩大 ${scale} 倍，${opposite}×${scale}=${answer}。`,
      };
    }
    const scaledAdjacent = adjacent * scale;
    const scaledOpposite = opposite * scale;
    const answer = hypotenuse * scale;
    return {
      signature: `jtrig:h:${opposite}:${adjacent}:${hypotenuse}:${scale}`,
      answer,
      choices: numericChoices(answer, rng, scale),
      title: '三角比与勾股综合',
      instruction: `直角三角形中 tan A=${opposite}/${adjacent}，锐角 A 的邻边长 ${scaledAdjacent}。先求对边，再求斜边长。`,
      explanation: `由 tan A=${opposite}/${adjacent} 得对边 ${opposite}×${scale}=${scaledOpposite}；再用勾股定理，斜边为 √(${scaledOpposite}²+${scaledAdjacent}²)=${answer}。`,
    };
  }, { candidateCount: TRIG_CANDIDATES.length });
}

const GENERATORS = {
  'rational-number': generateRationalNumber,
  'algebra-expression': generateAlgebraExpression,
  'equation-lab': generateEquationLab,
  'function-match': generateFunctionMatch,
  'geometry-clue': generateGeometryClue,
  'pythagorean-route': generatePythagoreanRoute,
  'radical-reasoning': generateRadicalReasoning,
  'probability-lab': generateProbabilityLab,
  'data-reasoning': generateDataReasoning,
  'quadratic-path': generateQuadraticPath,
  'trig-exact': generateTrigExact,
  'sample-inference': generateSampleInference,
};

function generateJuniorChallenge(type, options = {}) {
  const generator = GENERATORS[type];
  if (!generator) return null;
  return generator(options);
}

function expectedJuniorAnswer(challenge) {
  const parts = String(challenge && challenge.signature || '').split(':');
  const prefix = parts[0];
  const level = parts[1];
  const numbers = parts.slice(2).join(',').split(',').map(Number);
  if (numbers.some((value) => !Number.isFinite(value))) return undefined;
  if (prefix === 'jeq') {
    if (level === 'e') return numbers[1] - numbers[0];
    if (level === 'm') return (numbers[2] - numbers[1]) / numbers[0];
    if (level === 'h') return (numbers[3] + numbers[2]) / numbers[0] - numbers[1];
  }
  if (prefix === 'jrat') {
    if (level === 'e' || level === 'm') return numbers[0] + (level === 'e' ? -numbers[1] : numbers[1]);
    if (level === 'h') return -2 * numbers[0] + numbers[1];
  }
  if (prefix === 'jalg') {
    if (level === 'e') return numbers[0] * numbers[1] + numbers[2];
    if (level === 'm') return numbers[0] + numbers[1];
    if (level === 'h') return (numbers[0] + numbers[1]) * numbers[2] - numbers[3];
  }
  if (prefix === 'jfun') {
    if (level === 'e') return numbers[0] * numbers[2] + numbers[1];
    if (level === 'm') return (numbers[3] - numbers[1]) / (numbers[2] - numbers[0]);
    if (level === 'h') return numbers[0] * (numbers[2] * numbers[4] + numbers[3]) + numbers[1];
  }
  if (prefix === 'jgeo') {
    if (level === 'e') return 180 - numbers[0] - numbers[1];
    if (level === 'm') return (180 - numbers[0]) / 2;
    if (level === 'h') return (numbers[0] - numbers[1]) + (180 - numbers[0]);
  }
  if (prefix === 'jgeo8') {
    if (level === 'e') return numbers[0];
    if (level === 'm') return (numbers[2] - numbers[1]) / numbers[0];
    if (level === 'h') return 180 - numbers[0] - numbers[1];
  }
  if (prefix === 'jgeo9') {
    if (level === 'e') return numbers[0];
    if (level === 'm') return numbers[0] * numbers[1];
    if (level === 'h') return numbers[1] * numbers[3];
  }
  if (prefix === 'jpyth') {
    if (level === 'e') return numbers[2] * numbers[3];
    if (level === 'm') return numbers[1] * numbers[3];
    if (level === 'h') return (numbers[2] + numbers[0]) * numbers[3];
  }
  if (prefix === 'jrad') {
    if (level === 'e') return numbers[0];
    if (level === 'm') return numbers[0] + numbers[1];
    if (level === 'h') return (numbers[0] - numbers[1]) * (numbers[0] - numbers[1]);
  }
  if (prefix === 'jprob') {
    const total = numbers[0] + numbers[1];
    if (level === 'e') return fraction(numbers[0], total);
    if (level === 'm') return fraction(numbers[0] * numbers[1], total * (total - 1));
    if (level === 'h') return fraction(2 * numbers[0] * numbers[1], total * (total - 1));
  }
  if (prefix === 'jdata') {
    if (level === 'e') return numbers[0];
    if (level === 'm') return numbers[0] + (numbers[2] - numbers[1]) / numbers[3];
    if (level === 'h') return numbers[0] + (numbers[2] - numbers[1]) / numbers[4] - numbers[3];
  }
  if (prefix === 'jdata7' && level === 'h') {
    return (numbers[0] * numbers[1] + numbers[2] * numbers[3]) / (numbers[0] + numbers[2]);
  }
  if (prefix === 'jquad') {
    if (level === 'e') return numbers[0];
    if (level === 'm') return Math.max(numbers[0], numbers[1]);
    if (level === 'h') return numbers[0] * numbers[0] + numbers[1] * numbers[1];
  }
  if (prefix === 'jtrig') {
    if (level === 'e') return fraction(numbers[0], numbers[2]);
    if (level === 'm') return numbers[0] * numbers[3];
    if (level === 'h') return numbers[2] * numbers[3];
  }
  if (prefix === 'jsample') {
    if (level === 'e') return numbers[1] * numbers[2] / numbers[0];
    if (level === 'm') return (numbers[0] + numbers[1]) * numbers[2] / 100;
    if (level === 'h') return numbers[0] * numbers[1] / 100 + numbers[2];
  }
  return undefined;
}

module.exports = {
  JUNIOR_GAME_CATALOG,
  JUNIOR_GAME_TYPES,
  generateJuniorChallenge,
  expectedJuniorAnswer,
};

const {
  JUNIOR_GAME_CATALOG,
  JUNIOR_GAME_TYPES,
  generateJuniorChallenge,
  expectedJuniorAnswer,
} = require('./game-engine-junior');

const PRIMARY_GAME_CATALOG = [
  { type: 'number-chain', name: '数字接龙', icon: '/assets/icons/route.svg', grades: [1, 2], ability: 'pattern', description: '补全数字变化规律' },
  { type: 'calculation-match', name: '算式配对', icon: '/assets/icons/target.svg', grades: [1, 2], ability: 'calculation', description: '找出正确计算结果' },
  { type: 'shape-hunt', name: '图形寻宝', icon: '/assets/icons/search.svg', grades: [1, 2], ability: 'geometry', description: '认识图形和特征' },
  { type: 'change-maker', name: '找零小铺', icon: '/assets/icons/target.svg', grades: [1, 2], ability: 'problem', description: '练习人民币计算' },
  { type: 'order-maze', name: '顺序迷宫', icon: '/assets/icons/route.svg', grades: [1, 2], ability: 'pattern', description: '按计算结果找方向' },
  { type: 'puzzle', name: '数字拼图', icon: '/assets/icons/grid-3x3.svg', grades: [3, 4], ability: 'geometry', description: '观察顺序和空间移动' },
  { type: 'pattern', name: '规律侦探', icon: '/assets/icons/search.svg', grades: [3, 4], ability: 'pattern', description: '找出数字变化规律' },
  { type: 'partition', name: '图形分割', icon: '/assets/icons/layers.svg', grades: [3, 4], ability: 'geometry', description: '训练空间想象和组合' },
  { type: 'target-number', name: '目标数挑战', icon: '/assets/icons/target.svg', grades: [3, 4], ability: 'problem', description: '用算式凑出目标数' },
  { type: 'calculation-sprint', name: '计算闯关', icon: '/assets/icons/target.svg', grades: [3, 4], ability: 'calculation', description: '快速判断计算结果' },
  { type: 'fraction-match', name: '分数对对碰', icon: '/assets/icons/layers.svg', grades: [5, 6], ability: 'calculation', description: '比较相等的分数' },
  { type: 'unit-station', name: '单位换算站', icon: '/assets/icons/route.svg', grades: [5, 6], ability: 'calculation', description: '完成常用单位换算' },
  { type: 'ratio-reasoning', name: '数量关系推理', icon: '/assets/icons/target.svg', grades: [5, 6], ability: 'problem', description: '根据倍数或比例求未知量' },
  { type: 'logic-seats', name: '逻辑排座位', icon: '/assets/icons/search.svg', grades: [5, 6], ability: 'pattern', description: '根据条件排除判断' },
  { type: 'math-cipher', name: '数学密码', icon: '/assets/icons/route.svg', grades: [5, 6], ability: 'calculation', description: '多步计算解锁密码' },
];
const GAME_CATALOG = [
  ...PRIMARY_GAME_CATALOG.map((game) => ({ ...game, schoolStage: 'primary' })),
  ...JUNIOR_GAME_CATALOG,
];
const GAME_TYPES = GAME_CATALOG.map((game) => game.type);
const SOLVED_PUZZLE = [1, 2, 3, 4, 5, 6, 7, 8, null];

function getGamesForGrade(grade, schoolStage) {
  const numericGrade = Number(grade) || 4;
  const normalizedStage = schoolStage === 'junior' || (!schoolStage && numericGrade >= 7)
    ? 'junior'
    : 'primary';
  return GAME_CATALOG
    .filter((game) => game.schoolStage === normalizedStage && game.grades.includes(numericGrade))
    .map((game) => ({ ...game }));
}

function getGameMeta(type) {
  const game = GAME_CATALOG.find((item) => item.type === type);
  return game ? { ...game } : null;
}

function hashSeed(seedText) {
  return Array.from(String(seedText)).reduce(
    (value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
}

function createSeededRandom(seedText) {
  let state = hashSeed(seedText) || 0x6d2b79f5;
  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function shuffle(items, rng) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function difficultyForCompletions(completions) {
  const count = Math.max(0, Number(completions) || 0);
  if (count >= 7) return 'hard';
  if (count >= 3) return 'medium';
  return 'easy';
}

function primaryGrade(grade, fallback) {
  const numericGrade = Number(grade);
  return Number.isInteger(numericGrade) && numericGrade >= 1 && numericGrade <= 6
    ? numericGrade
    : fallback;
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(Number(left));
  let b = Math.abs(Number(right));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function puzzleKey(tiles) {
  return tiles.map((value) => (value === null ? 0 : value)).join('');
}

function puzzleNeighbors(emptyIndex) {
  const row = Math.floor(emptyIndex / 3);
  const column = emptyIndex % 3;
  const neighbors = [];
  if (row > 0) neighbors.push(emptyIndex - 3);
  if (row < 2) neighbors.push(emptyIndex + 3);
  if (column > 0) neighbors.push(emptyIndex - 1);
  if (column < 2) neighbors.push(emptyIndex + 1);
  return neighbors;
}

function puzzleManhattan(tiles) {
  return tiles.reduce((total, value, index) => {
    if (value === null) return total;
    const target = value - 1;
    return total
      + Math.abs(Math.floor(index / 3) - Math.floor(target / 3))
      + Math.abs((index % 3) - (target % 3));
  }, 0);
}

function solvePuzzlePath(initialTiles) {
  const initial = [...initialTiles];
  if (puzzleManhattan(initial) === 0) return [];
  const found = -1;
  let bound = puzzleManhattan(initial);

  while (bound <= 31) {
    const tiles = [...initial];
    const path = [];
    const seen = new Set([puzzleKey(tiles)]);

    function search(depth, limit, previousEmpty) {
      const estimate = puzzleManhattan(tiles);
      const score = depth + estimate;
      if (score > limit) return score;
      if (estimate === 0) return found;

      const emptyIndex = tiles.indexOf(null);
      const candidates = puzzleNeighbors(emptyIndex)
        .filter((index) => index !== previousEmpty)
        .map((tileIndex) => {
          [tiles[tileIndex], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[tileIndex]];
          const estimateAfterMove = puzzleManhattan(tiles);
          [tiles[tileIndex], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[tileIndex]];
          return { tileIndex, estimateAfterMove };
        })
        .sort((left, right) => left.estimateAfterMove - right.estimateAfterMove);

      let minimum = Infinity;
      for (const candidate of candidates) {
        const tileIndex = candidate.tileIndex;
        [tiles[tileIndex], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[tileIndex]];
        const key = puzzleKey(tiles);
        if (!seen.has(key)) {
          seen.add(key);
          path.push(tileIndex);
          const result = search(depth + 1, limit, emptyIndex);
          if (result === found) return found;
          minimum = Math.min(minimum, result);
          path.pop();
          seen.delete(key);
        }
        [tiles[tileIndex], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[tileIndex]];
      }
      return minimum;
    }

    const result = search(0, bound, -1);
    if (result === found) return path;
    if (!Number.isFinite(result)) break;
    bound = result;
  }
  return [];
}

function solvePuzzleNextMove(tiles) {
  const path = solvePuzzlePath(tiles);
  return path.length ? path[0] : null;
}

function generatePuzzle({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  const activeGrade = primaryGrade(grade, 3);
  const gradeFourBump = activeGrade >= 4 ? 6 : 0;
  const scrambleSteps = ({ easy: 10, medium: 18, hard: 26 }[difficulty] || 10) + gradeFourBump * 2;
  const minimumDistance = ({ easy: 4, medium: 7, hard: 10 }[difficulty] || 4) + gradeFourBump;
  const recent = new Set(recentSignatures);
  let fallback = null;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const tiles = [...SOLVED_PUZZLE];
    let previousEmpty = -1;
    for (let step = 0; step < scrambleSteps + (attempt % 4); step += 1) {
      const emptyIndex = tiles.indexOf(null);
      const choices = puzzleNeighbors(emptyIndex).filter((index) => index !== previousEmpty);
      const tileIndex = pick(choices.length ? choices : puzzleNeighbors(emptyIndex), rng);
      [tiles[tileIndex], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[tileIndex]];
      previousEmpty = emptyIndex;
    }
    const signature = puzzleKey(tiles);
    const solutionLength = solvePuzzlePath(tiles).length;
    const challenge = {
      type: 'puzzle', difficulty, signature, tiles, solutionLength,
      explanation: '每次只能移动空格旁边的一块，按从 1 到 8 的顺序排好就成功。',
      title: '把 1～8 按顺序排好',
      instruction: '点击空格旁边的数字，把它移到空格中。',
    };
    fallback = challenge;
    if (solutionLength >= minimumDistance && !recent.has(signature)) return challenge;
  }
  return fallback;
}

function arithmeticPattern(rng) {
  const start = randomInt(rng, 1, 40);
  const step = randomInt(rng, 2, 12);
  const values = Array.from({ length: 5 }, (_, index) => start + index * step);
  return { template: 'arithmetic', values };
}

function geometricPattern(rng) {
  const start = randomInt(rng, 1, 9);
  const ratio = randomInt(rng, 2, 3);
  const values = Array.from({ length: 5 }, (_, index) => start * (ratio ** index));
  return { template: 'geometric', values };
}

function increasingDifferencePattern(rng) {
  const start = randomInt(rng, 1, 25);
  const firstDifference = randomInt(rng, 1, 7);
  const increase = randomInt(rng, 1, 5);
  const values = [start];
  let difference = firstDifference;
  while (values.length < 5) {
    values.push(values[values.length - 1] + difference);
    difference += increase;
  }
  return { template: 'increasing-difference', values };
}

function alternatingPattern(rng) {
  const start = randomInt(rng, 2, 15);
  const addition = randomInt(rng, 2, 10);
  const multiplier = randomInt(rng, 2, 3);
  const values = [start];
  while (values.length < 5) {
    const index = values.length;
    values.push(index % 2 === 1
      ? values[index - 1] + addition
      : values[index - 1] * multiplier);
  }
  return { template: 'alternating', values };
}

function interleavedPattern(rng) {
  const oddStart = randomInt(rng, 1, 15);
  const evenStart = randomInt(rng, 2, 18);
  const oddStep = randomInt(rng, 2, 9);
  const evenStep = randomInt(rng, 3, 10);
  const values = [oddStart, evenStart, oddStart + oddStep, evenStart + evenStep, oddStart + oddStep * 2];
  return { template: 'interleaved', values };
}

function squarePattern(rng) {
  const start = randomInt(rng, 1, 12);
  const values = Array.from({ length: 5 }, (_, index) => (start + index) ** 2);
  return { template: 'squares', values };
}

const PATTERN_GENERATORS = {
  easy: [arithmeticPattern, geometricPattern],
  medium: [increasingDifferencePattern, alternatingPattern],
  hard: [interleavedPattern, squarePattern],
};

function patternChoices(answer, sequence, rng) {
  const lastDifference = Math.max(1, Math.abs(sequence[sequence.length - 1] - sequence[sequence.length - 2]));
  const candidates = [
    answer,
    answer + lastDifference,
    answer - lastDifference,
    answer + Math.max(2, Math.floor(lastDifference / 2)),
    answer - Math.max(2, Math.floor(lastDifference / 2)),
    answer + 1,
    answer - 1,
  ];
  const unique = [...new Set(candidates.filter((value) => value >= 0))];
  let offset = 2;
  while (unique.length < 4) {
    if (!unique.includes(answer + offset)) unique.push(answer + offset);
    offset += 1;
  }
  const distractors = shuffle(unique.filter((value) => value !== answer), rng).slice(0, 3);
  return shuffle([answer, ...distractors], rng);
}

function describePattern(template, values) {
  const firstDifference = values[1] - values[0];
  if (template === 'arithmetic') return `每次增加 ${firstDifference}`;
  if (template === 'geometric') return `每次乘 ${values[1] / values[0]}`;
  if (template === 'increasing-difference') {
    const increase = (values[2] - values[1]) - firstDifference;
    return `增加的数依次是 ${firstDifference}、${firstDifference + increase}、${firstDifference + increase * 2}、${firstDifference + increase * 3}`;
  }
  if (template === 'alternating') {
    return `交替进行“加 ${firstDifference}、乘 ${values[2] / values[1]}”`;
  }
  if (template === 'interleaved') {
    return `第1、3、5个数是 ${values[0]}、${values[2]}、${values[4]}，每次加 ${values[2] - values[0]}；第2、4个数是 ${values[1]}、${values[3]}，每次加 ${values[3] - values[1]}。`;
  }
  return '这些数是连续整数的平方';
}

function patternInstruction(template) {
  if (template === 'interleaved') return '把第1、3、5个数放一组，第2、4个数放一组，再分别找规律。';
  if (template === 'alternating') return '观察相邻数字交替使用的两种运算，再选择答案。';
  return '先观察相邻数字，再选择最符合规律的答案。';
}

function adjustPatternForGrade(generated, grade) {
  if (primaryGrade(grade, 3) < 4) return generated;
  const values = generated.template === 'squares'
    ? Array.from({ length: 5 }, (_, index) => (Math.sqrt(generated.values[0]) + 4 + index) ** 2)
    : generated.values.map((value) => value * 2);
  return { ...generated, values };
}

function generatePattern({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  const recent = new Set(recentSignatures);
  const generators = PATTERN_GENERATORS[difficulty] || PATTERN_GENERATORS.easy;
  let fallback = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const generated = adjustPatternForGrade(pick(generators, rng)(rng), grade);
    const sequence = generated.values.slice(0, 4);
    const answer = generated.values[4];
    const signature = `${generated.template}:${sequence.join(',')}:${answer}`;
    const challenge = {
      type: 'pattern', mode: 'choice', difficulty, signature, sequence, answer,
      choices: patternChoices(answer, sequence, rng),
      explanation: describePattern(generated.template, generated.values),
      title: '找出下一个数',
      instruction: patternInstruction(generated.template),
    };
    fallback = challenge;
    if (!recent.has(signature)) return challenge;
  }
  return fallback;
}

function cellKey(row, column) {
  return `${row}-${column}`;
}

const PARTITION_TEMPLATES = [
  {
    name: 'rectangle-2x3',
    cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
    solution: [[0, 0], [0, 1], [0, 2]],
  },
  {
    name: 'rectangle-2x4',
    cells: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3]],
    solution: [[0, 0], [0, 1], [1, 0], [1, 1]],
  },
  {
    name: 'ring',
    cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]],
    solution: [[0, 0], [0, 1], [0, 2], [1, 0]],
  },
  {
    name: 'long-l',
    cells: [[0, 0], [1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [3, 2], [3, 3]],
    solution: [[0, 0], [1, 0], [2, 0], [3, 0]],
  },
  {
    name: 'staircase',
    cells: [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2], [3, 3]],
    solution: [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]],
  },
];

function createRectanglePartition(name, rows, columns, includesCell) {
  const cells = [];
  const solution = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      cells.push([row, column]);
      if (includesCell(row, column)) solution.push([row, column]);
    }
  }
  return { name, cells, solution };
}

const GRADE_FOUR_PARTITION_TEMPLATES = {
  easy: [createRectanglePartition('rectangle-3x4', 3, 4, (row, column) => column < 2)],
  medium: [createRectanglePartition('rectangle-4x3', 4, 3, (row) => row < 2)],
  hard: [createRectanglePartition('rectangle-4x4', 4, 4, (row, column) => column < 2)],
};

function transformPartition(template, rotation, mirrored) {
  const solutionSet = new Set(template.solution.map(([row, column]) => cellKey(row, column)));
  const transformed = template.cells.map(([sourceRow, sourceColumn]) => {
    let row = sourceRow;
    let column = mirrored ? -sourceColumn : sourceColumn;
    for (let count = 0; count < rotation; count += 1) {
      [row, column] = [column, -row];
    }
    return { row, column, solution: solutionSet.has(cellKey(sourceRow, sourceColumn)) };
  });
  const minimumRow = Math.min(...transformed.map((cell) => cell.row));
  const minimumColumn = Math.min(...transformed.map((cell) => cell.column));
  return transformed.map((cell) => ({
    ...cell,
    row: cell.row - minimumRow,
    column: cell.column - minimumColumn,
  }));
}

function isConnected(keys) {
  const remaining = new Set(keys);
  if (!remaining.size) return false;
  const queue = [remaining.values().next().value];
  const visited = new Set(queue);
  while (queue.length) {
    const current = queue.shift();
    const [row, column] = current.split('-').map(Number);
    [cellKey(row - 1, column), cellKey(row + 1, column), cellKey(row, column - 1), cellKey(row, column + 1)]
      .forEach((neighbor) => {
        if (remaining.has(neighbor) && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
  }
  return visited.size === remaining.size;
}

function evaluatePartition(cells, selectedKeys) {
  const allKeys = cells.map((cell) => cell.key);
  const validKeys = new Set(allKeys);
  const selected = [...new Set(selectedKeys)].filter((key) => validKeys.has(key));
  if (selected.length !== allKeys.length / 2) return { complete: false, reason: 'count' };
  const selectedSet = new Set(selected);
  const unselected = allKeys.filter((key) => !selectedSet.has(key));
  if (!isConnected(selected)) return { complete: false, reason: 'selected_disconnected' };
  if (!isConnected(unselected)) return { complete: false, reason: 'remaining_disconnected' };
  return { complete: true, reason: 'complete' };
}

function generatePartition({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  const templatesByDifficulty = {
    easy: PARTITION_TEMPLATES.slice(0, 2),
    medium: PARTITION_TEMPLATES.slice(2, 4),
    hard: PARTITION_TEMPLATES.slice(4),
  };
  const activeGrade = primaryGrade(grade, 3);
  const templates = activeGrade >= 4
    ? (GRADE_FOUR_PARTITION_TEMPLATES[difficulty] || GRADE_FOUR_PARTITION_TEMPLATES.easy)
    : (templatesByDifficulty[difficulty] || templatesByDifficulty.easy);
  const recent = new Set(recentSignatures);
  let fallback = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const template = pick(templates, rng);
    const rotation = randomInt(rng, 0, 3);
    const mirrored = rng() >= 0.5;
    const transformed = transformPartition(template, rotation, mirrored);
    const cells = transformed
      .map((cell) => ({ row: cell.row, column: cell.column, key: cellKey(cell.row, cell.column) }))
      .sort((left, right) => left.row - right.row || left.column - right.column);
    const solutionKeys = transformed.filter((cell) => cell.solution)
      .map((cell) => cellKey(cell.row, cell.column)).sort();
    const cellSignature = cells.map((cell) => cell.key).join(',');
    const signature = `${template.name}:${cellSignature}:${solutionKeys.join(',')}`;
    const challenge = {
      type: 'partition', difficulty, signature, cells, solutionKeys,
      targetCount: cells.length / 2,
      explanation: '两部分格子数相同，并且每一部分内部都要首尾相连。',
      rows: Math.max(...cells.map((cell) => cell.row)) + 1,
      columns: Math.max(...cells.map((cell) => cell.column)) + 1,
      title: '把图形分成相等的两份',
      instruction: '点亮一半格子，并让点亮和未点亮的两部分都连在一起。',
    };
    fallback = challenge;
    if (!recent.has(signature)) return challenge;
  }
  return fallback && recent.has(fallback.signature)
    ? { ...fallback, repeatExhausted: true }
    : fallback;
}

function numericChoices(answer, rng, spread = 6) {
  const choices = [answer];
  let offset = 1;
  while (choices.length < 4) {
    const candidate = answer + (offset % 2 ? offset : -offset) * spread;
    if (candidate >= 0 && !choices.includes(candidate)) choices.push(candidate);
    offset += 1;
  }
  return shuffle(choices, rng);
}

function valueChoices(answer, values, rng) {
  return shuffle([...new Set([answer, ...values].filter((value) => value !== undefined))].slice(0, 4), rng);
}

function makeModeChallenge(type, mode, difficulty, rng, recentSignatures, build) {
  const recent = new Set(recentSignatures);
  let fallback = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const challenge = { type, difficulty, mode, ...build(attempt) };
    fallback = challenge;
    if (!recent.has(challenge.signature)) return challenge;
  }
  return fallback && recent.has(fallback.signature)
    ? { ...fallback, repeatExhausted: true }
    : fallback;
}

function makeChoiceChallenge(type, difficulty, rng, recentSignatures, build) {
  return makeModeChallenge(type, 'choice', difficulty, rng, recentSignatures, build);
}

function createConstructTokens(labels, extraLabels, rng) {
  const expectedTokenIds = labels.map((_, index) => `solution-${index}`);
  const palette = [
    ...labels.map((label, index) => ({ id: expectedTokenIds[index], label: String(label) })),
    ...extraLabels.map((label, index) => ({ id: `extra-${index}`, label: String(label) })),
  ];
  return { palette: shuffle(palette, rng), expectedTokenIds };
}

function labelsForTokenIds(challenge, tokenIds) {
  if (!challenge || !Array.isArray(tokenIds) || !Array.isArray(challenge.palette)) return null;
  const labelsById = challenge.palette.reduce((result, token) => ({
    ...result,
    [token && token.id]: token && String(token.label),
  }), {});
  const labels = tokenIds.map((id) => labelsById[id]);
  return labels.every((label) => typeof label === 'string' && label.length > 0) ? labels : null;
}

function sameTokenMultiset(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const counts = left.reduce((result, label) => ({
    ...result,
    [String(label)]: Number(result[String(label)] || 0) + 1,
  }), {});
  return right.every((label) => {
    const key = String(label);
    if (!counts[key]) return false;
    counts[key] -= 1;
    return true;
  });
}

function parseIntegerToken(label) {
  return /^-?\d+$/.test(String(label)) ? Number(label) : null;
}

function evaluateArithmeticTokens(tokens) {
  if (!Array.isArray(tokens) || tokens.length < 3 || tokens.length % 2 === 0) return null;
  const first = parseIntegerToken(tokens[0]);
  if (first === null) return null;
  let total = 0;
  let pendingOperator = '+';
  let current = first;
  for (let index = 1; index < tokens.length; index += 2) {
    const operator = tokens[index];
    const value = parseIntegerToken(tokens[index + 1]);
    if (!['+', '-', '×'].includes(operator) || value === null) return null;
    if (operator === '×') {
      current *= value;
    } else {
      total += pendingOperator === '-' ? -current : current;
      pendingOperator = operator;
      current = value;
    }
  }
  return total + (pendingOperator === '-' ? -current : current);
}

function constructTokenLabelSets(challenge) {
  const expected = labelsForTokenIds(challenge, challenge && challenge.expectedTokenIds);
  const alternatives = Array.isArray(challenge && challenge.constructAlternatives)
    ? challenge.constructAlternatives.filter((labels) => Array.isArray(labels)).map((labels) => labels.map(String))
    : [];
  return expected ? [expected, ...alternatives] : alternatives;
}

function constructTokensMatch(challenge, tokenIds) {
  const labels = labelsForTokenIds(challenge, tokenIds);
  const labelSets = constructTokenLabelSets(challenge);
  if (!labels || new Set(tokenIds).size !== tokenIds.length) return false;
  const usesExpectedTokenCount = labels.length === (challenge.expectedTokenIds || []).length;
  if (challenge.type !== 'target-number'
    && !labelSets.some((expected) => sameTokenMultiset(labels, expected))) return false;
  if (challenge.type === 'target-number' && !usesExpectedTokenCount) return false;
  if (challenge.type === 'logic-seats') {
    const expected = labelSets[0] || [];
    return labels.length === expected.length && labels.every((label, index) => label === expected[index]);
  }

  const equalsIndex = labels.indexOf('=');
  if (equalsIndex < 1 || equalsIndex !== labels.lastIndexOf('=')) return false;
  const leftValue = evaluateArithmeticTokens(labels.slice(0, equalsIndex));
  const resultTokens = labels.slice(equalsIndex + 1);
  if (leftValue === null || !resultTokens.length) return false;
  const answerToken = parseIntegerToken(resultTokens[0]);
  const trailingLabels = resultTokens.slice(1);
  if (answerToken === null || trailingLabels.some((label) => /^[+\-×=]$/.test(label) || parseIntegerToken(label) !== null)) return false;
  const expectedAnswer = Number(challenge.answer);
  return Number.isFinite(expectedAnswer) && leftValue === answerToken && answerToken === expectedAnswer;
}

function createMatchingCards(pairs, rng) {
  return shuffle(pairs.reduce((cards, pair, index) => cards.concat([
    { id: `pair-${index}-left`, pairId: `pair-${index}`, label: String(pair.left) },
    { id: `pair-${index}-right`, pairId: `pair-${index}`, label: String(pair.right) },
  ]), []), rng);
}

function createRouteStep(id, prompt, answer, candidates, hint, rng) {
  const labels = [String(answer), ...candidates.map(String)]
    .filter((label, index, values) => values.indexOf(label) === index);
  let offset = 1;
  while (labels.length < 3) {
    const numericAnswer = Number(answer);
    labels.push(Number.isFinite(numericAnswer) ? String(numericAnswer + offset) : `选项${offset}`);
    offset += 1;
  }
  const choices = shuffle(labels, rng).map((label, index) => ({ id: `${id}-${index}`, label }));
  const correct = choices.find((choice) => choice.label === String(answer));
  return { id, prompt, choices, answerId: correct.id, hint };
}

function generateNumberChain({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  return makeModeChallenge('number-chain', 'route', difficulty, rng, recentSignatures, () => {
    const activeGrade = primaryGrade(grade, 2);
    const gradeOne = activeGrade === 1;
    const profiles = gradeOne
      ? {
        easy: { start: [1, 8], step: [1, 2] },
        medium: { start: [9, 16], step: [2, 4] },
        hard: { start: [17, 20], step: [4, 5] },
      }
      : {
        easy: { start: [1, 30], step: [1, 5] },
        medium: { start: [31, 50], step: [4, 8] },
        hard: { start: [52, 60], step: [8, 10] },
      };
    const profile = profiles[difficulty] || profiles.easy;
    const start = randomInt(rng, profile.start[0], profile.start[1]);
    const step = randomInt(rng, profile.step[0], profile.step[1]);
    const sequence = [start, start + step, start + step * 2, start + step * 3];
    const answer = start + step * 4;
    const routeValues = [...sequence, answer];
    const routeSteps = routeValues.slice(0, -1).map((value, index) => {
      const next = routeValues[index + 1];
      return createRouteStep(
        `chain-${index}`,
        `${value} + ${step} = ?`,
        next,
        [next - step, next + step, next + step * 2],
        `每一格都增加 ${step}。`,
        rng,
      );
    });
    return {
      signature: `chain:${sequence.join(',')}`,
      sequence,
      answer,
      routeSteps,
      title: '数字接龙',
      instruction: `每走一步都要补上 +${step} 的结果，走到终点。`,
      explanation: `从 ${start} 开始，每次增加 ${step}，终点是 ${answer}。`,
    };
  });
}

function generateCalculationMatch({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  return makeModeChallenge('calculation-match', 'matching', difficulty, rng, recentSignatures, () => {
    const activeGrade = primaryGrade(grade, 2);
    const gradeOne = activeGrade === 1;
    const profiles = gradeOne
      ? {
        easy: { left: [4, 8], right: [1, 3] },
        medium: { left: [9, 12], right: [2, 5] },
        hard: { left: [13, 18], right: [3, 7] },
      }
      : {
        easy: { left: [10, 30], right: [2, 10] },
        medium: { left: [31, 55], right: [5, 18] },
        hard: { left: [56, 70], right: [10, 30] },
      };
    const profile = profiles[difficulty] || profiles.easy;
    const pairs = [];
    const answers = new Set();
    let attempts = 0;
    while (pairs.length < 3 && attempts < 30) {
      const left = randomInt(rng, profile.left[0], profile.left[1]);
      const right = randomInt(rng, profile.right[0], profile.right[1]);
      const subtract = rng() > 0.5 && left > right;
      const answer = subtract ? left - right : left + right;
      attempts += 1;
      if (answers.has(answer)) continue;
      answers.add(answer);
      pairs.push({ left: `${left} ${subtract ? '-' : '+'} ${right}`, right: answer });
    }
    return {
      signature: `match-board:${pairs.map((pair) => `${pair.left}=${pair.right}`).join('|')}`,
      cards: createMatchingCards(pairs, rng),
      title: '算式配对',
      instruction: '翻开两张卡，把算式和它的结果配成一对。',
      explanation: '每个算式只能和正确的计算结果配对。',
    };
  });
}

function generateShapeHunt({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  const shapes = [
    { name: '正方形', clue: '四条边一样长，且四个角都是直角。', hardClue: '有四条一样长的直边；不是圆形，并且四个角都是直角。' },
    { name: '长方形', clue: '有四个直角，且相邻两条边长度不相等。', hardClue: '有四个直角；不是正方形，因为相邻两条边不一样长。' },
    { name: '三角形', clue: '有三条边和三个角。', hardClue: '有三条直边和三个角；不是四边形。' },
    { name: '圆形', clue: '没有直边也没有角，边缘弯弯的。', hardClue: '边缘是一条闭合曲线；不是多边形，没有直边也没有角。' },
    { name: '平行四边形', clue: '两组对边分别平行，且四个角都不是直角。' },
    { name: '梯形', clue: '只有一组对边平行。' },
  ];
  return makeModeChallenge('shape-hunt', 'matching', difficulty, rng, recentSignatures, () => {
    const activeGrade = primaryGrade(grade, 2);
    const available = activeGrade <= 2 ? shapes.slice(0, 4) : shapes;
    const shuffled = shuffle(available, rng);
    const offset = { easy: 0, medium: 1, hard: 2 }[difficulty] || 0;
    const rotated = [...shuffled.slice(offset), ...shuffled.slice(0, offset)];
    const selected = rotated.slice(0, difficulty === 'easy' ? 3 : 4);
    const pairs = selected.map((shape) => ({
      left: shape.name,
      right: difficulty === 'hard' && activeGrade <= 2 ? shape.hardClue : shape.clue,
    }));
    return {
      signature: `shape-board:${difficulty}:${selected.map((shape) => shape.name).join('-')}`,
      cards: createMatchingCards(pairs, rng),
      title: '图形寻宝',
      instruction: '把图形和它独有的特征配成一对。',
      explanation: '先读清特征，再找只符合这一组条件的图形。',
    };
  });
}

function generateChangeMaker({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  return makeModeChallenge('change-maker', 'construct', difficulty, rng, recentSignatures, () => {
    const activeGrade = primaryGrade(grade, 2);
    if (activeGrade > 2) {
      const paid = pick(difficulty === 'easy' ? [10, 20] : [20, 50, 100], rng);
      const price = randomInt(rng, 1, paid - 1);
      const answer = paid - price;
      return {
        signature: `change:${paid}:${price}`,
        answer,
        ...createConstructTokens([paid, '-', price, '=', answer], ['+', answer + 1], rng),
        constructAlternatives: [[String(price), '+', String(answer), '=', String(paid)]],
        title: '找零小铺',
        instruction: `一件商品 ${price} 元，付 ${paid} 元。把找零算式摆进托盘。`,
        explanation: `用付的钱减去价钱：${paid} - ${price} = ${answer}（元）。`,
      };
    }
    const profiles = activeGrade === 1
      ? {
        easy: { paid: 5, price: [1, 4] },
        medium: { paid: 10, price: [1, 4] },
        hard: { paid: 10, price: [5, 9] },
      }
      : {
        easy: { paid: 10, price: [1, 9] },
        medium: { paid: 20, price: [4, 19] },
        hard: { paid: 50, price: [10, 49] },
      };
    const profile = profiles[difficulty] || profiles.easy;
    const paid = profile.paid;
    const price = randomInt(rng, profile.price[0], profile.price[1]);
    const answer = paid - price;
    return {
      signature: `change:${paid}:${price}`,
      answer,
      ...createConstructTokens([paid, '-', price, '=', answer], ['+', answer + 1], rng),
      constructAlternatives: [[String(price), '+', String(answer), '=', String(paid)]],
      title: '找零小铺',
      instruction: `一件商品 ${price} 元，付 ${paid} 元。把找零算式摆进托盘。`,
      explanation: `用付的钱减去价钱：${paid} - ${price} = ${answer}（元）。`,
    };
  });
}

function generateOrderMaze({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  return makeModeChallenge('order-maze', 'route', difficulty, rng, recentSignatures, () => {
    const activeGrade = primaryGrade(grade, 2);
    const gradeOne = activeGrade === 1;
    const tier = { easy: 0, medium: 1, hard: 2 }[difficulty] || 0;
    const groups = Array.from({ length: 3 }, (_, index) => {
      const base = gradeOne
        ? randomInt(rng, 1 + index * 5 + tier * 3, 4 + index * 5 + tier * 3)
        : randomInt(rng, 10 + index * 20 + tier * 5, 15 + index * 20 + tier * 5);
      const jumps = gradeOne
        ? [0, randomInt(rng, 1 + tier, 2 + tier), randomInt(rng, 3 + tier, 4 + tier), randomInt(rng, 5 + tier, 6 + tier)]
        : [0, randomInt(rng, 4 + tier, 6 + tier), randomInt(rng, 9 + tier, 12 + tier), randomInt(rng, 15 + tier, 18 + tier)];
      return shuffle(jumps.map((jump) => base + jump), rng);
    });
    const routeSteps = groups.map((values, index) => {
      const answer = Math.min(...values);
      return createRouteStep(
        `maze-${index}`,
        `选出最小的数，打开第 ${index + 1} 扇门：${values.join('、')}`,
        answer,
        values.filter((value) => value !== answer),
        '先比较十位，十位相同再比较个位。',
        rng,
      );
    });
    const answer = Math.min(...groups[groups.length - 1]);
    return {
      signature: `maze-route:${groups.map((values) => values.join(',')).join('|')}`,
      answer,
      routeSteps,
      title: '顺序迷宫',
      instruction: '连续选对每一扇门的最小数，走出数字迷宫。',
      explanation: '每一扇门都要先比较最高位，再决定哪一个数更小。',
    };
  });
}

function generateTargetNumber({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  return makeModeChallenge('target-number', 'construct', difficulty, rng, recentSignatures, () => {
    const activeGrade = primaryGrade(grade, 3);
    const gradeThree = activeGrade === 3;
    const profiles = gradeThree
      ? {
        easy: { left: [4, 8], middle: [3, 5], right: [1, 3] },
        medium: { left: [9, 12], middle: [5, 8], right: [3, 6] },
        hard: { left: [13, 18], middle: [7, 12], right: [5, 10] },
      }
      : {
        easy: { left: [8, 15], middle: [4, 8], right: [2, 5] },
        medium: { left: [16, 25], middle: [8, 14], right: [5, 10] },
        hard: { left: [26, 40], middle: [12, 20], right: [8, 16] },
      };
    const profile = profiles[difficulty] || profiles.easy;
    const left = randomInt(rng, profile.left[0], profile.left[1]);
    const middle = randomInt(rng, profile.middle[0], profile.middle[1]);
    const right = randomInt(rng, profile.right[0], Math.min(profile.right[1], left + middle - 1));
    const answer = left + middle - right;
    return {
      signature: `target:${left}+${middle}-${right}`,
      answer,
      ...createConstructTokens([left, '+', middle, '-', right, '=', answer], ['×', answer + 1], rng),
      title: '目标数挑战',
      instruction: '把正确的运算顺序摆进托盘，得到目标数。',
      explanation: `先算 ${left} + ${middle} = ${left + middle}，再减 ${right}，得到 ${answer}。`,
    };
  });
}

function generateCalculationSprint({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  return makeModeChallenge('calculation-sprint', 'matching', difficulty, rng, recentSignatures, () => {
    const activeGrade = primaryGrade(grade, 3);
    const factorProfile = activeGrade === 3
      ? {
        easy: [2, 4],
        medium: [4, 6],
        hard: [7, 9],
      }
      : {
        easy: [2, 6],
        medium: [4, 9],
        hard: [7, 12],
      };
    const [factorMinimum, factorMaximum] = factorProfile[difficulty] || factorProfile.easy;
    const pairs = [];
    const answers = new Set();
    let attempts = 0;
    while (pairs.length < 3 && attempts < 30) {
      const left = randomInt(rng, factorMinimum, factorMaximum);
      const right = randomInt(rng, factorMinimum, factorMaximum);
      const answer = left * right;
      attempts += 1;
      if (answers.has(answer)) continue;
      answers.add(answer);
      pairs.push({ left: `${left} × ${right}`, right: answer });
    }
    return {
      signature: `sprint-board:${pairs.map((pair) => `${pair.left}=${pair.right}`).join('|')}`,
      cards: createMatchingCards(pairs, rng),
      title: '计算闯关',
      instruction: '连续配对三组乘法算式和结果。',
      explanation: '先算个位，再用乘法口诀核对结果。',
    };
  });
}

function generateFractionMatch({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  return makeModeChallenge('fraction-match', 'matching', difficulty, rng, recentSignatures, () => {
    const activeGrade = primaryGrade(grade, 5);
    const denominatorProfiles = activeGrade === 5
      ? { easy: 5, medium: 7, hard: 9 }
      : { easy: 7, medium: 10, hard: 14 };
    const maximumDenominator = denominatorProfiles[difficulty] || denominatorProfiles.easy;
    const candidates = [];
    for (let denominator = 2; denominator <= maximumDenominator; denominator += 1) {
      for (let numerator = 1; numerator < denominator; numerator += 1) {
        if (greatestCommonDivisor(numerator, denominator) === 1) candidates.push({ numerator, denominator });
      }
    }
    const pairs = shuffle(candidates, rng).slice(0, 3).map(({ numerator, denominator }) => {
      const multiplier = { easy: 2, medium: 3, hard: 4 }[difficulty] || 2;
      return {
        left: `${numerator}/${denominator}`,
        right: `${numerator * multiplier}/${denominator * multiplier}`,
      };
    });
    return {
      signature: `fraction-board:${activeGrade}:${pairs.map((pair) => `${pair.left}=${pair.right}`).join('|')}`,
      cards: createMatchingCards(pairs, rng),
      title: '分数对对碰',
      instruction: '把相等的分数配成一对，清空整张卡片板。',
      explanation: '分子和分母同时乘同一个数，分数的大小不变。',
    };
  });
}

function generateUnitStation({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  return makeModeChallenge('unit-station', 'construct', difficulty, rng, recentSignatures, () => {
    const activeGrade = primaryGrade(grade, 5);
    const meterProfiles = activeGrade === 5
      ? { easy: [2, 9], medium: [15, 29], hard: [30, 60] }
      : { easy: [5, 29], medium: [40, 79], hard: [80, 150] };
    const meterRange = meterProfiles[difficulty] || meterProfiles.easy;
    const meters = randomInt(rng, meterRange[0], meterRange[1]);
    const answer = meters * 100;
    return {
      signature: `unit:${meters}m`,
      answer,
      ...createConstructTokens([meters, '×', 100, '=', answer, '厘米'], ['+', answer + 100], rng),
      title: '单位换算站',
      instruction: `${meters} 米等于多少厘米？把换算关系摆进托盘。`,
      explanation: `1 米 = 100 厘米，所以 ${meters} × 100 = ${answer}（厘米）。`,
    };
  });
}

function generateRatioReasoning({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  return makeModeChallenge('ratio-reasoning', 'construct', difficulty, rng, recentSignatures, () => {
    const activeGrade = primaryGrade(grade, 5);
    if (activeGrade === 5) {
      const profiles = {
        easy: { each: [2, 4], groups: 2 },
        medium: { each: [4, 7], groups: 3 },
        hard: { each: [6, 9], groups: 4 },
      };
      const profile = profiles[difficulty] || profiles.easy;
      const each = randomInt(rng, profile.each[0], profile.each[1]);
      const answer = each * profile.groups;
      return {
        signature: `multiple:${each}:${profile.groups}`,
        answer,
        ...createConstructTokens([each, '×', profile.groups, '=', answer], ['+', answer + 1], rng),
        title: '数量关系推理',
        instruction: `每盒彩笔有 ${each} 支，${profile.groups} 盒一共有多少支？把算式摆进托盘。`,
        explanation: `每盒同样多，用 ${each} × ${profile.groups} = ${answer}（支）。`,
      };
    }
    const profiles = {
      easy: { left: [1, 3], right: [2, 5], scale: 2 },
      medium: { left: [4, 6], right: [6, 9], scale: 3 },
      hard: { left: [7, 9], right: [10, 14], scale: 4 },
    };
    const profile = profiles[difficulty] || profiles.easy;
    const left = randomInt(rng, profile.left[0], profile.left[1]);
    const right = randomInt(rng, profile.right[0], profile.right[1]);
    const scale = profile.scale;
    const answer = right * scale;
    return {
      signature: `ratio:${left}:${right}:${scale}`,
      answer,
      ...createConstructTokens([right, '×', scale, '=', answer], ['+', answer + 1], rng),
      title: '数量关系推理',
      instruction: `${left}:${right} = ${left * scale}:?。把后项的变化关系摆进托盘。`,
      explanation: `前项乘 ${scale}，后项也乘 ${scale}：${right} × ${scale} = ${answer}。`,
    };
  });
}

function generateLogicSeats({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  return makeModeChallenge('logic-seats', 'construct', difficulty, rng, recentSignatures, () => {
    const activeGrade = primaryGrade(grade, 5);
    const count = activeGrade >= 6
      ? (difficulty === 'easy' ? 4 : 5)
      : (difficulty === 'easy' ? 3 : 4);
    const people = ['小红', '小明', '小丽', '小刚', '小雨', '小华'];
    const seats = shuffle(people, rng).slice(0, count);
    const setup = `${seats.join('、')}共${count}位同学，按从左到右的${count}个位置坐成一排。`;
    let condition;
    if (activeGrade >= 6 && difficulty === 'easy') {
      condition = `${seats[0]}坐最左边，${seats[1]}紧挨在${seats[0]}右边，${seats[3]}坐最右边。请把所有同学排到座位上。`;
    } else if (activeGrade >= 6 && difficulty === 'medium') {
      condition = `${seats[0]}坐最左边，${seats[1]}紧挨在${seats[0]}右边，${seats[3]}紧挨在${seats[4]}左边，${seats[4]}坐最右边。请把所有同学排到座位上。`;
    } else if (difficulty === 'easy') {
      condition = `${seats[0]}坐最左边，${seats[2]}坐最右边。请把所有同学排到座位上。`;
    } else if (difficulty === 'medium') {
      condition = `${seats[0]}坐最左边，${seats[1]}紧挨在${seats[0]}右边，${seats[3]}坐最右边。请把所有同学排到座位上。`;
    } else {
      condition = `${seats[0]}在最左边；${seats[1]}紧挨在${seats[0]}右边；${seats[2]}紧挨在${seats[3]}左边；${seats[3]}在最右边。请把所有同学排到座位上。`;
    }
    const solutionSeats = activeGrade >= 6 && difficulty === 'hard'
      ? [seats[0], seats[1], seats[4], seats[2], seats[3]]
      : seats;
    const extraName = people.find((name) => !seats.includes(name));
    return {
      signature: `seat:${activeGrade}:${difficulty}:${seats.join('-')}:0`,
      answer: solutionSeats.join('、'),
      ...createConstructTokens(solutionSeats, extraName ? [extraName] : ['小华'], rng),
      title: '逻辑排座位',
      instruction: `${setup}${condition}`,
      explanation: `按条件从左到右排成 ${solutionSeats.join('、')}。`,
    };
  });
}

function generateMathCipher({ difficulty = 'easy', grade, rng = Math.random, recentSignatures = [] } = {}) {
  return makeModeChallenge('math-cipher', 'route', difficulty, rng, recentSignatures, () => {
    const activeGrade = primaryGrade(grade, 5);
    const ranges = activeGrade === 5
      ? { easy: [2, 4], medium: [5, 7], hard: [8, 10] }
      : { easy: [3, 6], medium: [7, 10], hard: [11, 14] };
    const range = ranges[difficulty] || ranges.easy;
    const a = randomInt(rng, range[0], range[1]);
    const b = randomInt(rng, range[0], range[1]);
    const doubled = b * 2;
    const answer = a + doubled;
    return {
      signature: `cipher:${activeGrade}:${difficulty}:${a}:${b}`,
      answer,
      routeSteps: [
        createRouteStep('cipher-0', `先算 B × 2：${b} × 2 = ?`, doubled, [doubled - 1, doubled + 1, doubled + 2], '运算顺序里要先算乘法。', rng),
        createRouteStep('cipher-1', `再算 A + ${doubled}：${a} + ${doubled} = ?`, answer, [answer - 1, answer + 1, answer + 2], '把第一步的结果代回去再相加。', rng),
      ],
      title: '数学密码',
      instruction: `密码规则：A=${a}，B=${b}。连续算对两步，解开密码。`,
      explanation: `先算乘法：${b} × 2 = ${doubled}，再加 ${a}，得到 ${answer}。`,
    };
  });
}

function hasVisibleText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function valuesMatch(left, right) {
  return String(left) === String(right);
}

function addAuditIssue(issues, condition, code) {
  if (!condition) issues.push(code);
}

function expectedAnswerForPattern(signature, sequence) {
  const [template] = String(signature).split(':');
  if (!Array.isArray(sequence) || sequence.length !== 4 || sequence.some((value) => !Number.isFinite(Number(value)))) return null;
  const values = sequence.map(Number);
  if (template === 'arithmetic') {
    const step = values[1] - values[0];
    return values[2] - values[1] === step && values[3] - values[2] === step ? values[3] + step : null;
  }
  if (template === 'geometric') {
    const ratio = values[1] / values[0];
    return values[1] * ratio === values[2] && values[2] * ratio === values[3] ? values[3] * ratio : null;
  }
  if (template === 'increasing-difference') {
    const first = values[1] - values[0];
    const second = values[2] - values[1];
    const third = values[3] - values[2];
    return third - second === second - first ? values[3] + third + (second - first) : null;
  }
  if (template === 'alternating') {
    const addition = values[1] - values[0];
    const multiplier = values[2] / values[1];
    return values[2] + addition === values[3] ? values[3] * multiplier : null;
  }
  if (template === 'interleaved') return values[2] + (values[2] - values[0]);
  if (template === 'squares') {
    const root = Math.sqrt(values[3]);
    return Number.isInteger(root) && values.every((value, index) => value === (root - 3 + index) ** 2)
      ? (root + 1) ** 2
      : null;
  }
  return null;
}

function expectedAnswerForSignature(challenge) {
  const juniorAnswer = expectedJuniorAnswer(challenge);
  if (juniorAnswer !== undefined) return juniorAnswer;
  const signature = String(challenge.signature || '');
  let match = signature.match(/^chain:(\d+),(\d+),(\d+),(\d+)$/);
  if (match) {
    const values = match.slice(1).map(Number);
    const step = values[1] - values[0];
    return values[2] - values[1] === step && values[3] - values[2] === step ? values[3] + step : null;
  }
  match = signature.match(/^match:(\d+)([+-])(\d+)$/);
  if (match) return match[2] === '+' ? Number(match[1]) + Number(match[3]) : Number(match[1]) - Number(match[3]);
  match = signature.match(/^change:(\d+):(\d+)$/);
  if (match) return Number(match[1]) - Number(match[2]);
  match = signature.match(/^maze:(\d+),(\d+),(\d+),(\d+)$/);
  if (match) return Math.min(...match.slice(1).map(Number));
  match = signature.match(/^target:(\d+)\+(\d+)-(\d+)$/);
  if (match) return Number(match[1]) + Number(match[2]) - Number(match[3]);
  match = signature.match(/^sprint:(\d+)x(\d+)$/);
  if (match) return Number(match[1]) * Number(match[2]);
  match = signature.match(/^fraction:(\d+)\/(\d+):(\d+)$/);
  if (match) return `${Number(match[1]) * Number(match[3])}/${Number(match[2]) * Number(match[3])}`;
  match = signature.match(/^unit:(\d+)m$/);
  if (match) return Number(match[1]) * 100;
  match = signature.match(/^ratio:(\d+):(\d+):(\d+)$/);
  if (match) return Number(match[2]) * Number(match[3]);
  match = signature.match(/^multiple:(\d+):(\d+)$/);
  if (match) return Number(match[1]) * Number(match[2]);
  match = signature.match(/^cipher:(?:(\d+):(easy|medium|hard):)?(\d+):(\d+)$/);
  if (match) return Number(match[3]) + Number(match[4]) * 2;
  if (signature.includes(':') && Array.isArray(challenge.sequence)) return expectedAnswerForPattern(signature, challenge.sequence);
  return undefined;
}

function validateLogicSeats(challenge, issues) {
  const match = String(challenge.signature || '').match(/^seat:(?:(\d+):)?(easy|medium|hard):([^:]+):(\d+)$/);
  if (!match) {
    issues.push('logic_signature_invalid');
    return;
  }
  const [, gradeText, signatureDifficulty, namesText, indexText] = match;
  const names = namesText.split('-').filter(Boolean);
  const targetIndex = Number(indexText);
  const signatureGrade = Number(gradeText) || 5;
  const solutionNames = signatureGrade >= 6 && signatureDifficulty === 'hard'
    ? [names[0], names[1], names[4], names[2], names[3]]
    : names;
  const expectedCount = signatureGrade >= 6
    ? (signatureDifficulty === 'easy' ? 4 : 5)
    : (signatureDifficulty === 'easy' ? 3 : 4);
  const instruction = String(challenge.instruction || '');
  const explanation = String(challenge.explanation || '');

  addAuditIssue(issues, signatureDifficulty === challenge.difficulty && names.length === expectedCount, 'logic_signature_invalid');
  addAuditIssue(issues, targetIndex >= 0 && targetIndex < names.length, 'logic_target_invalid');
  addAuditIssue(issues, instruction.includes(`${expectedCount}位同学`) && instruction.includes(`${expectedCount}个位置`), 'logic_setup_missing');
  addAuditIssue(issues, names.every((name) => instruction.includes(name)), 'logic_participant_missing');
  if (challenge.mode === 'construct') {
    const paletteLabels = new Set((challenge.palette || []).map((item) => item && item.label));
    addAuditIssue(issues, Array.isArray(challenge.expectedTokenIds) && challenge.expectedTokenIds.length === names.length, 'logic_order_invalid');
    addAuditIssue(issues, names.every((name) => paletteLabels.has(name)), 'logic_palette_invalid');
    const paletteById = new Map((challenge.palette || []).map((item) => [item && item.id, item && item.label]));
    const expectedLabels = (challenge.expectedTokenIds || []).map((id) => paletteById.get(id));
    addAuditIssue(issues, expectedLabels.length === solutionNames.length && expectedLabels.every((name, index) => name === solutionNames[index]), 'logic_order_invalid');
    addAuditIssue(issues, valuesMatch(challenge.answer, solutionNames.join('、')), 'logic_answer_mismatch');
    addAuditIssue(issues, explanation.includes(solutionNames.join('、')) && explanation.includes(String(challenge.answer)), 'logic_explanation_mismatch');
    return;
  }
  addAuditIssue(issues, valuesMatch(challenge.answer, names[targetIndex]), 'logic_answer_mismatch');
  addAuditIssue(issues, explanation.includes(names.join('、')) && explanation.includes(String(challenge.answer)), 'logic_explanation_mismatch');
}

function validateConstructChallenge(challenge, issues) {
  const palette = Array.isArray(challenge.palette) ? challenge.palette : [];
  const expectedTokenIds = Array.isArray(challenge.expectedTokenIds) ? challenge.expectedTokenIds : [];
  const ids = palette.map((token) => token && token.id);
  addAuditIssue(issues, palette.length >= expectedTokenIds.length + 1, 'construct_palette_invalid');
  addAuditIssue(issues, ids.every((id) => hasVisibleText(id)) && new Set(ids).size === ids.length, 'construct_token_ids_invalid');
  addAuditIssue(issues, palette.every((token) => hasVisibleText(token && token.label)), 'construct_token_labels_invalid');
  addAuditIssue(issues, expectedTokenIds.length >= 3 && new Set(expectedTokenIds).size === expectedTokenIds.length, 'construct_target_invalid');
  addAuditIssue(issues, expectedTokenIds.every((id) => ids.includes(id)), 'construct_target_missing');
  addAuditIssue(issues, constructTokensMatch(challenge, expectedTokenIds), 'construct_solution_invalid');
}

function validateMatchingChallenge(challenge, issues) {
  const cards = Array.isArray(challenge.cards) ? challenge.cards : [];
  const ids = cards.map((card) => card && card.id);
  const pairCounts = cards.reduce((counts, card) => {
    const key = card && card.pairId;
    if (!hasVisibleText(key)) return counts;
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  addAuditIssue(issues, cards.length >= 6 && cards.length % 2 === 0, 'matching_card_count_invalid');
  addAuditIssue(issues, ids.every((id) => hasVisibleText(id)) && new Set(ids).size === ids.length, 'matching_card_ids_invalid');
  addAuditIssue(issues, cards.every((card) => hasVisibleText(card && card.pairId) && hasVisibleText(card && card.label)), 'matching_card_content_invalid');
  addAuditIssue(issues, new Set(cards.map((card) => card && card.label)).size === cards.length, 'matching_visible_labels_duplicate');
  addAuditIssue(issues, Object.keys(pairCounts).length * 2 === cards.length && Object.values(pairCounts).every((count) => count === 2), 'matching_pairs_invalid');
}

function validateRouteChallenge(challenge, issues) {
  const routeSteps = Array.isArray(challenge.routeSteps) ? challenge.routeSteps : [];
  addAuditIssue(issues, routeSteps.length >= 2 && routeSteps.length <= 5, 'route_step_count_invalid');
  addAuditIssue(issues, new Set(routeSteps.map((step) => step && step.id)).size === routeSteps.length, 'route_step_ids_invalid');
  routeSteps.forEach((step) => {
    const choices = Array.isArray(step && step.choices) ? step.choices : [];
    const ids = choices.map((choice) => choice && choice.id);
    addAuditIssue(issues, hasVisibleText(step && step.id) && hasVisibleText(step && step.prompt), 'route_step_content_invalid');
    addAuditIssue(issues, choices.length >= 3 && ids.every((id) => hasVisibleText(id)) && new Set(ids).size === ids.length, 'route_choices_invalid');
    addAuditIssue(issues, choices.every((choice) => hasVisibleText(choice && choice.label)), 'route_choice_labels_invalid');
    addAuditIssue(issues, choices.filter((choice) => choice.id === step.answerId).length === 1, 'route_answer_invalid');
  });
}

function validateGameChallenge(challenge) {
  const issues = [];
  const type = challenge && challenge.type;
  addAuditIssue(issues, challenge && GAME_TYPES.includes(type), 'type_invalid');
  addAuditIssue(issues, challenge && ['easy', 'medium', 'hard'].includes(challenge.difficulty), 'difficulty_invalid');
  addAuditIssue(issues, challenge && hasVisibleText(challenge.signature), 'signature_missing');
  addAuditIssue(issues, challenge && hasVisibleText(challenge.title), 'title_missing');
  addAuditIssue(issues, challenge && hasVisibleText(challenge.instruction), 'instruction_missing');
  addAuditIssue(issues, challenge && hasVisibleText(challenge.explanation), 'explanation_missing');
  if (issues.length || !challenge) return { valid: false, issues: [...new Set(issues)] };

  if (challenge.mode === 'construct') {
    validateConstructChallenge(challenge, issues);
  } else if (challenge.mode === 'matching') {
    validateMatchingChallenge(challenge, issues);
  } else if (challenge.mode === 'route') {
    validateRouteChallenge(challenge, issues);
  } else if (type === 'puzzle') {
    const expectedTiles = [...SOLVED_PUZZLE].sort((left, right) => Number(left) - Number(right));
    const actualTiles = [...(challenge.tiles || [])].sort((left, right) => Number(left) - Number(right));
    const path = Array.isArray(challenge.tiles) ? solvePuzzlePath(challenge.tiles) : [];
    addAuditIssue(issues, JSON.stringify(actualTiles) === JSON.stringify(expectedTiles), 'puzzle_tiles_invalid');
    addAuditIssue(issues, path.length > 0 && path.length === challenge.solutionLength, 'puzzle_solution_invalid');
  } else if (type === 'partition') {
    addAuditIssue(issues, Array.isArray(challenge.cells) && challenge.cells.length > 0 && challenge.cells.length % 2 === 0, 'partition_cells_invalid');
    addAuditIssue(issues, challenge.targetCount === (challenge.cells || []).length / 2, 'partition_target_invalid');
    addAuditIssue(issues, Array.isArray(challenge.solutionKeys) && evaluatePartition(challenge.cells || [], challenge.solutionKeys).complete, 'partition_solution_invalid');
  } else {
    const choices = Array.isArray(challenge.choices) ? challenge.choices : [];
    addAuditIssue(issues, choices.length === 4, 'choice_count_invalid');
    addAuditIssue(issues, new Set(choices.map(String)).size === choices.length, 'choice_duplicate');
    addAuditIssue(issues, choices.some((choice) => valuesMatch(choice, challenge.answer)), 'answer_not_in_choices');
    if (type === 'pattern') {
      addAuditIssue(issues, challenge.mode === 'choice', 'pattern_mode_invalid');
    }
    if (type === 'pattern' && String(challenge.signature).startsWith('interleaved:')) {
      addAuditIssue(issues, /第1、3、5个数.+第2、4个数/.test(challenge.instruction), 'pattern_instruction_ambiguous');
      addAuditIssue(issues, /第1、3、5个数是.+第2、4个数是/.test(challenge.explanation), 'pattern_explanation_ambiguous');
    }
  }

  const expectedAnswer = expectedAnswerForSignature(challenge);
  if (challenge.answer !== undefined && expectedAnswer !== undefined) {
    addAuditIssue(issues, expectedAnswer !== null && valuesMatch(challenge.answer, expectedAnswer), 'signature_answer_mismatch');
  }

  if (JUNIOR_GAME_TYPES.includes(type)) {
    const expectedDepth = { easy: 1, medium: 2, hard: 3 }[challenge.difficulty];
    const meta = getGameMeta(type);
    addAuditIssue(issues, challenge.schoolStage === 'junior', 'junior_stage_invalid');
    addAuditIssue(issues, meta && meta.grades.includes(Number(challenge.grade)), 'junior_grade_invalid');
    addAuditIssue(issues, challenge.reasoningDepth === expectedDepth, 'junior_reasoning_depth_invalid');
  }

  if (type === 'logic-seats') validateLogicSeats(challenge, issues);
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}

function ensureValidGameChallenge(challenge) {
  const audit = validateGameChallenge(challenge);
  if (!audit.valid) throw new Error(`Invalid generated game: ${audit.issues.join(', ')}`);
  return challenge;
}

function generateChallenge(type, options = {}) {
  if (type === 'pattern') return ensureValidGameChallenge(generatePattern(options));
  if (type === 'partition') return ensureValidGameChallenge(generatePartition(options));
  if (type === 'puzzle') return ensureValidGameChallenge(generatePuzzle(options));
  if (JUNIOR_GAME_TYPES.includes(type)) return ensureValidGameChallenge(generateJuniorChallenge(type, options));
  const generators = {
    'number-chain': generateNumberChain,
    'calculation-match': generateCalculationMatch,
    'shape-hunt': generateShapeHunt,
    'change-maker': generateChangeMaker,
    'order-maze': generateOrderMaze,
    'target-number': generateTargetNumber,
    'calculation-sprint': generateCalculationSprint,
    'fraction-match': generateFractionMatch,
    'unit-station': generateUnitStation,
    'ratio-reasoning': generateRatioReasoning,
    'logic-seats': generateLogicSeats,
    'math-cipher': generateMathCipher,
  };
  const generator = generators[type];
  if (!generator) throw new Error(`Unsupported game type: ${type}`);
  return ensureValidGameChallenge(generator(options));
}

function pickDailyGameType(learnerId, date, allowedTypes = GAME_TYPES) {
  const types = allowedTypes.filter((type) => GAME_TYPES.includes(type));
  if (!types.length) return GAME_TYPES[0];
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  const learnerOffset = hashSeed(learnerId || 'local-learner') % types.length;
  return types[(learnerOffset + day) % types.length];
}

function getWeakAbilityKey(progress = {}) {
  const abilities = progress.abilities && typeof progress.abilities === 'object' ? progress.abilities : {};
  const keys = ['calculation', 'problem', 'geometry', 'pattern', 'data'];
  const declared = Array.isArray(progress.weakAbilities)
    ? progress.weakAbilities.filter((key) => keys.includes(key))
    : [];
  const candidates = declared.length ? declared : keys;
  return [...candidates].sort((left, right) => (
    (Number(abilities[left]) || 70) - (Number(abilities[right]) || 70)
    || keys.indexOf(left) - keys.indexOf(right)
  ))[0];
}

function pickRecommendedGameType(progress, date, allowedTypes = GAME_TYPES) {
  const types = allowedTypes
    .map((item) => (typeof item === 'string' ? item : item && item.type))
    .filter((type) => GAME_TYPES.includes(type));
  if (!types.length) return '';
  const weakAbility = getWeakAbilityKey(progress);
  const matching = types.filter((type) => getGameMeta(type).ability === weakAbility);
  return pickDailyGameType(progress && progress.learnerId, date, matching.length ? matching : types);
}

module.exports = {
  GAME_CATALOG,
  GAME_TYPES,
  getGamesForGrade,
  getGameMeta,
  SOLVED_PUZZLE,
  createSeededRandom,
  difficultyForCompletions,
  generatePuzzle,
  solvePuzzlePath,
  solvePuzzleNextMove,
  generatePattern,
  generatePartition,
  evaluatePartition,
  constructTokensMatch,
  validateGameChallenge,
  generateChallenge,
  pickDailyGameType,
  pickRecommendedGameType,
};

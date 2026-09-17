const test = require('node:test');
const assert = require('node:assert/strict');

const {
  GAME_TYPES,
  createSeededRandom,
  difficultyForCompletions,
  generatePuzzle,
  solvePuzzlePath,
  solvePuzzleNextMove,
  generatePattern,
  generatePartition,
  evaluatePartition,
  generateChallenge,
  constructTokensMatch,
  validateGameChallenge,
  pickDailyGameType,
  pickRecommendedGameType,
  getGamesForGrade,
  getGameMeta,
} = require('../miniprogram/utils/game-engine');
const {
  createDefaultGameProgress,
  completeRound,
} = require('../miniprogram/utils/game-progress');
const { JUNIOR_GRADE_TOPICS } = require('../miniprogram/utils/junior-high-curriculum');

const SOLVED_PUZZLE = [1, 2, 3, 4, 5, 6, 7, 8, null];

function adjacent(left, right) {
  const leftRow = Math.floor(left / 3);
  const rightRow = Math.floor(right / 3);
  return Math.abs(left - right) === 3
    || (leftRow === rightRow && Math.abs(left - right) === 1);
}

function applyPuzzlePath(initial, path) {
  const tiles = [...initial];
  path.forEach((tileIndex) => {
    const emptyIndex = tiles.indexOf(null);
    assert.equal(adjacent(tileIndex, emptyIndex), true, `illegal move ${tileIndex} -> ${emptyIndex}`);
    [tiles[tileIndex], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[tileIndex]];
  });
  return tiles;
}

test('seeded random streams are reproducible and completion counts control difficulty', () => {
  const first = createSeededRandom('learner:round');
  const second = createSeededRandom('learner:round');
  assert.deepEqual([first(), first(), first()], [second(), second(), second()]);
  assert.equal(difficultyForCompletions(0), 'easy');
  assert.equal(difficultyForCompletions(3), 'medium');
  assert.equal(difficultyForCompletions(7), 'hard');
});

test('generated number puzzles are non-complete, solvable, and varied', () => {
  const signatures = new Set();
  ['easy', 'medium', 'hard'].forEach((difficulty) => {
    for (let seed = 0; seed < 30; seed += 1) {
      const challenge = generatePuzzle({
        difficulty,
        rng: createSeededRandom(`puzzle:${difficulty}:${seed}`),
        recentSignatures: [],
      });
      assert.notDeepEqual(challenge.tiles, SOLVED_PUZZLE);
      const path = solvePuzzlePath(challenge.tiles);
      assert.ok(path.length >= 4, `${difficulty} puzzle is too close to complete`);
      assert.deepEqual(applyPuzzlePath(challenge.tiles, path), SOLVED_PUZZLE);
      signatures.add(challenge.signature);
    }
  });
  assert.ok(signatures.size >= 75);
});

test('puzzle hint remains legal after the learner deviates from the generated route', () => {
  const challenge = generatePuzzle({
    difficulty: 'medium',
    rng: createSeededRandom('deviation'),
    recentSignatures: [],
  });
  const tiles = [...challenge.tiles];
  const emptyIndex = tiles.indexOf(null);
  const legal = tiles.map((value, index) => ({ value, index }))
    .filter((item) => item.value !== null && adjacent(item.index, emptyIndex));
  const generatedHint = solvePuzzleNextMove(tiles);
  const deviation = legal.find((item) => item.index !== generatedHint) || legal[0];
  [tiles[deviation.index], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[deviation.index]];
  const nextMove = solvePuzzleNextMove(tiles);
  assert.equal(adjacent(nextMove, tiles.indexOf(null)), true);
  assert.deepEqual(applyPuzzlePath(tiles, solvePuzzlePath(tiles)), SOLVED_PUZZLE);
});

test('recent number puzzle signatures are excluded', () => {
  const rngSeed = 'recent-puzzle';
  const first = generatePuzzle({ difficulty: 'easy', rng: createSeededRandom(rngSeed), recentSignatures: [] });
  const next = generatePuzzle({ difficulty: 'easy', rng: createSeededRandom(rngSeed), recentSignatures: [first.signature] });
  assert.notEqual(next.signature, first.signature);
});

test('generated pattern rounds have one answer, unique choices, and broad variation', () => {
  const signatures = new Set();
  ['easy', 'medium', 'hard'].forEach((difficulty) => {
    for (let seed = 0; seed < 200; seed += 1) {
      const challenge = generatePattern({
        difficulty,
        rng: createSeededRandom(`pattern:${difficulty}:${seed}`),
        recentSignatures: [],
      });
      assert.ok(challenge.sequence.length >= 4);
      assert.equal(challenge.choices.length, 4);
      assert.equal(new Set(challenge.choices).size, 4);
      assert.ok(challenge.choices.includes(challenge.answer));
      assert.ok(challenge.explanation.length > 0);
      signatures.add(challenge.signature);
    }
  });
  assert.ok(signatures.size >= 300);
});

test('recent pattern signatures are excluded with the same random stream', () => {
  const first = generatePattern({ difficulty: 'hard', rng: createSeededRandom('pattern-repeat'), recentSignatures: [] });
  const next = generatePattern({ difficulty: 'hard', rng: createSeededRandom('pattern-repeat'), recentSignatures: [first.signature] });
  assert.notEqual(next.signature, first.signature);
});

test('exhausted small primary pools label the returned round as review', () => {
  const recentSignatures = Array.from({ length: 8 }, (_, index) => `unit:${index + 2}m`);
  const challenge = generateChallenge('unit-station', {
    grade: 5,
    difficulty: 'easy',
    rng: createSeededRandom('unit-pool-exhausted'),
    recentSignatures,
  });

  assert.ok(recentSignatures.includes(challenge.signature));
  assert.equal(challenge.repeatExhausted, true);
});

test('generated partition rounds always provide a valid connected equal split', () => {
  const signatures = new Set();
  ['easy', 'medium', 'hard'].forEach((difficulty) => {
    for (let seed = 0; seed < 200; seed += 1) {
      const challenge = generatePartition({
        difficulty,
        rng: createSeededRandom(`partition:${difficulty}:${seed}`),
        recentSignatures: [],
      });
      assert.equal(challenge.cells.length % 2, 0);
      assert.equal(challenge.targetCount, challenge.cells.length / 2);
      assert.equal(challenge.solutionKeys.length, challenge.targetCount);
      assert.deepEqual(
        evaluatePartition(challenge.cells, challenge.solutionKeys),
        { complete: true, reason: 'complete' },
      );
      signatures.add(challenge.signature);
    }
  });
  assert.ok(signatures.size >= 12);
});

test('partition validator rejects unequal or disconnected selections', () => {
  const challenge = generatePartition({
    difficulty: 'hard',
    rng: createSeededRandom('partition-invalid'),
    recentSignatures: [],
  });
  assert.equal(evaluatePartition(challenge.cells, []).reason, 'count');
  const disconnected = challenge.cells
    .filter((cell, index) => index % 2 === 0)
    .slice(0, challenge.targetCount)
    .map((cell) => cell.key);
  const result = evaluatePartition(challenge.cells, disconnected);
  assert.equal(result.complete, false);
});

test('generic challenge generation supports every game type', () => {
  GAME_TYPES.forEach((type) => {
    const challenge = generateChallenge(type, {
      difficulty: 'medium',
      rng: createSeededRandom(`generic:${type}`),
      recentSignatures: [],
    });
    assert.equal(challenge.type, type);
    assert.ok(challenge.signature);
  });
});

test('primary game catalog uses real build, match, and route interactions', () => {
  const expectedModes = {
    'number-chain': 'route',
    'calculation-match': 'matching',
    'shape-hunt': 'matching',
    'change-maker': 'construct',
    'order-maze': 'route',
    'target-number': 'construct',
    'calculation-sprint': 'matching',
    'fraction-match': 'matching',
    'unit-station': 'construct',
    'ratio-reasoning': 'construct',
    'logic-seats': 'construct',
    'math-cipher': 'route',
  };

  Object.entries(expectedModes).forEach(([type, mode]) => {
    const challenge = generateChallenge(type, {
      difficulty: 'medium',
      rng: createSeededRandom(`interaction:${type}`),
      recentSignatures: [],
    });
    assert.equal(challenge.mode, mode, type);
    if (mode === 'construct') {
      assert.ok(challenge.palette.length >= 5, `${type} palette`);
      assert.ok(challenge.expectedTokenIds.length >= 3, `${type} target`);
    }
    if (mode === 'matching') {
      assert.ok(challenge.cards.length >= 6, `${type} cards`);
      assert.equal(challenge.cards.length % 2, 0, `${type} card count`);
    }
    if (mode === 'route') {
      assert.ok(challenge.routeSteps.length >= 2, `${type} route`);
      assert.ok(challenge.routeSteps.every((step) => step.choices.length >= 3), `${type} choices`);
    }
  });
});

function greatestCommonDivisor(left, right) {
  let a = Math.abs(Number(left));
  let b = Math.abs(Number(right));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function reducedFractionLabel(label) {
  const [numerator, denominator] = String(label).split('/').map(Number);
  const divisor = greatestCommonDivisor(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

function matchingPairs(cards) {
  return cards.reduce((result, card) => ({
    ...result,
    [card.pairId]: [...(result[card.pairId] || []), card.label],
  }), {});
}

test('primary matching and build interactions never rely on hidden ids for a visible answer', () => {
  ['easy', 'medium', 'hard'].forEach((difficulty) => {
    for (let seed = 0; seed < 80; seed += 1) {
      const fractionRound = generateChallenge('fraction-match', {
        difficulty,
        schoolStage: 'primary',
        grade: 5,
        rng: createSeededRandom(`fraction-visible-${difficulty}-${seed}`),
      });
      const values = Object.values(matchingPairs(fractionRound.cards))
        .map((pair) => reducedFractionLabel(pair[0]));
      assert.equal(new Set(values).size, values.length, `${difficulty}:${seed} has equivalent fraction pairs`);
    }
  });

  const duplicateTokenRound = generateChallenge('change-maker', {
    difficulty: 'easy',
    schoolStage: 'primary',
    grade: 4,
    rng: createSeededRandom('change-maker:8'),
  });
  const expected = [...duplicateTokenRound.expectedTokenIds];
  const labels = expected.map((id) => duplicateTokenRound.palette.find((token) => token.id === id).label);
  const duplicateIndexes = labels.reduce((found, label, index) => {
    if (found.length || labels.indexOf(label) === index) return found;
    return [labels.indexOf(label), index];
  }, []);
  assert.equal(duplicateIndexes.length, 2);
  const swapped = [...expected];
  [swapped[duplicateIndexes[0]], swapped[duplicateIndexes[1]]] = [swapped[duplicateIndexes[1]], swapped[duplicateIndexes[0]]];
  assert.equal(constructTokensMatch(duplicateTokenRound, swapped), true);
  assert.equal(constructTokensMatch(duplicateTokenRound, [...expected].reverse()), false);
});

test('shape hunt uses mutually exclusive primary-school clues', () => {
  const expectedClues = {
    正方形: '四条边一样长，且四个角都是直角。',
    长方形: '有四个直角，且相邻两条边长度不相等。',
    三角形: '有三条边和三个角。',
    圆形: '没有直边也没有角，边缘弯弯的。',
    平行四边形: '两组对边分别平行，且四个角都不是直角。',
    梯形: '只有一组对边平行。',
  };
  ['easy', 'medium', 'hard'].forEach((difficulty) => {
    for (let seed = 0; seed < 50; seed += 1) {
      const round = generateChallenge('shape-hunt', {
        difficulty,
        schoolStage: 'primary',
        grade: difficulty === 'easy' ? 2 : 3,
        rng: createSeededRandom(`shape-clue-${difficulty}-${seed}`),
      });
      Object.values(matchingPairs(round.cards)).forEach((pair) => {
        const shape = pair.find((label) => expectedClues[label]);
        const clue = pair.find((label) => label !== shape);
        assert.equal(clue, expectedClues[shape]);
      });
    }
  });
});

test('primary interactive rounds stay inside the selected grade scope', () => {
  for (let seed = 0; seed < 40; seed += 1) {
    const gradeOneChain = generateChallenge('number-chain', {
      difficulty: 'hard', schoolStage: 'primary', grade: 1,
      rng: createSeededRandom(`grade-one-chain:${seed}`),
    });
    assert.ok(Math.max(...gradeOneChain.sequence, gradeOneChain.answer) <= 40);

    const gradeOneChange = generateChallenge('change-maker', {
      difficulty: 'hard', schoolStage: 'primary', grade: 1,
      rng: createSeededRandom(`grade-one-change:${seed}`),
    });
    const [, paid] = gradeOneChange.signature.match(/^change:(\d+):/) || [];
    assert.ok(Number(paid) <= 10);

    const gradeOneShapes = generateChallenge('shape-hunt', {
      difficulty: 'hard', schoolStage: 'primary', grade: 1,
      rng: createSeededRandom(`grade-one-shape:${seed}`),
    });
    const visibleShapes = gradeOneShapes.cards
      .map((card) => card.label)
      .filter((label) => ['正方形', '长方形', '三角形', '圆形', '平行四边形', '梯形'].includes(label));
    assert.ok(visibleShapes.every((shape) => ['正方形', '长方形', '三角形', '圆形'].includes(shape)));

    const gradeThreeSprint = generateChallenge('calculation-sprint', {
      difficulty: 'hard', schoolStage: 'primary', grade: 3,
      rng: createSeededRandom(`grade-three-sprint:${seed}`),
    });
    gradeThreeSprint.cards
      .map((card) => card.label)
      .filter((label) => label.includes(' × '))
      .forEach((label) => label.split(' × ').map(Number).forEach((factor) => assert.ok(factor <= 9)));
  }
});

test('primary difficulty changes the player-visible work for every game type', () => {
  const primaryCases = [
    ['number-chain', 1],
    ['calculation-match', 1],
    ['shape-hunt', 2],
    ['change-maker', 1],
    ['order-maze', 2],
    ['puzzle', 3],
    ['pattern', 3],
    ['partition', 3],
    ['target-number', 3],
    ['calculation-sprint', 3],
    ['fraction-match', 5],
    ['unit-station', 5],
    ['ratio-reasoning', 5],
    ['logic-seats', 5],
    ['math-cipher', 5],
  ];

  primaryCases.forEach(([type, grade]) => {
    const visibleRounds = ['easy', 'medium', 'hard'].map((difficulty) => {
      const round = generateChallenge(type, {
        difficulty,
        schoolStage: 'primary',
        grade,
        rng: createSeededRandom(`difficulty-visible:${type}`),
        recentSignatures: [],
      });
      const { difficulty: ignoredDifficulty, signature: ignoredSignature, ...visible } = round;
      return JSON.stringify(visible);
    });
    assert.equal(new Set(visibleRounds).size, 3, `${type} must change visible work at each difficulty`);
  });
});

test('paired primary grades increase the actual task payload', () => {
  const puzzleThree = generateChallenge('puzzle', {
    difficulty: 'medium', schoolStage: 'primary', grade: 3, rng: createSeededRandom('grade-puzzle'),
  });
  const puzzleFour = generateChallenge('puzzle', {
    difficulty: 'medium', schoolStage: 'primary', grade: 4, rng: createSeededRandom('grade-puzzle'),
  });
  assert.notDeepEqual(puzzleFour.tiles, puzzleThree.tiles);
  assert.ok(puzzleFour.solutionLength >= 13);

  const patternThree = generateChallenge('pattern', {
    difficulty: 'medium', schoolStage: 'primary', grade: 3, rng: createSeededRandom('grade-pattern'),
  });
  const patternFour = generateChallenge('pattern', {
    difficulty: 'medium', schoolStage: 'primary', grade: 4, rng: createSeededRandom('grade-pattern'),
  });
  assert.notDeepEqual(patternFour.sequence, patternThree.sequence);

  const partitionThree = generateChallenge('partition', {
    difficulty: 'medium', schoolStage: 'primary', grade: 3, rng: createSeededRandom('grade-partition'),
  });
  const partitionFour = generateChallenge('partition', {
    difficulty: 'medium', schoolStage: 'primary', grade: 4, rng: createSeededRandom('grade-partition'),
  });
  assert.ok(partitionFour.cells.length > partitionThree.cells.length);

  const seatsFive = generateChallenge('logic-seats', {
    difficulty: 'medium', schoolStage: 'primary', grade: 5, rng: createSeededRandom('grade-seats'),
  });
  const seatsSix = generateChallenge('logic-seats', {
    difficulty: 'medium', schoolStage: 'primary', grade: 6, rng: createSeededRandom('grade-seats'),
  });
  assert.ok(seatsSix.expectedTokenIds.length > seatsFive.expectedTokenIds.length);
});

test('shape hunt medium adds a matching pair and fifth-grade quantity reasoning avoids ratio notation', () => {
  const easy = generateChallenge('shape-hunt', {
    difficulty: 'easy', schoolStage: 'primary', grade: 2, rng: createSeededRandom('shape-demand'),
  });
  const medium = generateChallenge('shape-hunt', {
    difficulty: 'medium', schoolStage: 'primary', grade: 2, rng: createSeededRandom('shape-demand'),
  });
  assert.ok(medium.cards.length > easy.cards.length);

  const gradeFive = generateChallenge('ratio-reasoning', {
    difficulty: 'medium', schoolStage: 'primary', grade: 5, rng: createSeededRandom('grade-five-quantity'),
  });
  const gradeSix = generateChallenge('ratio-reasoning', {
    difficulty: 'medium', schoolStage: 'primary', grade: 6, rng: createSeededRandom('grade-six-ratio'),
  });
  assert.doesNotMatch(gradeFive.instruction, /\d+:\d+/);
  assert.match(gradeSix.instruction, /\d+:\d+/);
});

test('grades one and two shape hunt only use the four basic shapes', () => {
  const basicShapes = new Set(['正方形', '长方形', '三角形', '圆形']);
  [1, 2].forEach((grade) => {
    ['easy', 'medium', 'hard'].forEach((difficulty) => {
      for (let seed = 0; seed < 30; seed += 1) {
        const round = generateChallenge('shape-hunt', {
          difficulty,
          schoolStage: 'primary',
          grade,
          rng: createSeededRandom(`basic-shapes:${grade}:${difficulty}:${seed}`),
        });
        round.cards
          .map((card) => card.label)
          .filter((label) => ['正方形', '长方形', '三角形', '圆形', '平行四边形', '梯形'].includes(label))
          .forEach((shape) => assert.ok(basicShapes.has(shape), `${grade}年级不应出现${shape}`));
      }
    });
  });
});

test('grade two hard number chains stay within one hundred', () => {
  for (let seed = 0; seed < 120; seed += 1) {
    const round = generateChallenge('number-chain', {
      difficulty: 'hard', schoolStage: 'primary', grade: 2,
      rng: createSeededRandom(`grade-two-chain:${seed}`),
    });
    assert.ok(Math.max(...round.sequence, round.answer) <= 100);
  }
});

test('partition marks a repeat only after its available layouts are exhausted', () => {
  const recentSignatures = new Set();
  for (let seed = 0; seed < 1200; seed += 1) {
    recentSignatures.add(generatePartition({
      difficulty: 'easy',
      rng: createSeededRandom(`partition-pool:${seed}`),
      recentSignatures: [],
    }).signature);
  }

  const repeated = generatePartition({
    difficulty: 'easy',
    rng: createSeededRandom('partition-fallback'),
    recentSignatures: [...recentSignatures],
  });
  assert.ok(recentSignatures.has(repeated.signature));
  assert.equal(repeated.repeatExhausted, true);
});

test('math cipher signatures record grade and difficulty without breaking answer validation', () => {
  const round = generateChallenge('math-cipher', {
    difficulty: 'hard', schoolStage: 'primary', grade: 6,
    rng: createSeededRandom('cipher-grade-difficulty'),
  });
  assert.match(round.signature, /^cipher:6:hard:\d+:\d+$/);
  assert.deepEqual(validateGameChallenge(round), { valid: true, issues: [] });
});

test('sixth-grade hard seating uses the order determined by its stated clues', () => {
  const round = generateChallenge('logic-seats', {
    difficulty: 'hard', schoolStage: 'primary', grade: 6,
    rng: createSeededRandom('sixth-grade-hard-seat-order'),
  });
  const [, namesText] = round.signature.match(/^seat:6:hard:([^:]+):0$/) || [];
  const generatedNames = namesText.split('-');
  const expectedOrder = [
    generatedNames[0], generatedNames[1], generatedNames[4], generatedNames[2], generatedNames[3],
  ];
  const paletteById = new Map(round.palette.map((token) => [token.id, token.label]));

  assert.deepEqual(round.expectedTokenIds.map((id) => paletteById.get(id)), expectedOrder);
  assert.equal(round.answer, expectedOrder.join('、'));
  assert.deepEqual(validateGameChallenge(round), { valid: true, issues: [] });
});

test('shape hunt hard mode adds elimination clues while staying within the four basic shapes', () => {
  const medium = generateChallenge('shape-hunt', {
    difficulty: 'medium', schoolStage: 'primary', grade: 2,
    rng: createSeededRandom('shape-hard-elimination'),
  });
  const hard = generateChallenge('shape-hunt', {
    difficulty: 'hard', schoolStage: 'primary', grade: 2,
    rng: createSeededRandom('shape-hard-elimination'),
  });
  const mediumClues = medium.cards.map((card) => card.label).filter((label) => label.includes('。'));
  const hardClues = hard.cards.map((card) => card.label).filter((label) => label.includes('。'));

  assert.equal(hard.cards.length, medium.cards.length);
  assert.ok(hardClues.every((clue) => clue.includes('不是')));
  assert.ok(mediumClues.every((clue) => !clue.includes('不是')));
  assert.deepEqual(validateGameChallenge(hard), { valid: true, issues: [] });
});

test('logic seating rounds must state every participant and every available seat', () => {
  const incompleteRound = {
    type: 'logic-seats',
    difficulty: 'easy',
    signature: 'seat:easy:小红-小雨-小明:1',
    title: '逻辑排座位',
    instruction: '小红坐最左边，小明坐最右边。谁坐中间？',
    choices: ['小明', '小雨', '小红', '无法确定'],
    answer: '小雨',
    explanation: '按条件从左到右排成小红、小雨、小明，所以答案是小雨。',
  };

  const audit = validateGameChallenge(incompleteRound);

  assert.equal(audit.valid, false);
  assert.ok(audit.issues.includes('logic_setup_missing'));
  assert.ok(audit.issues.includes('logic_participant_missing'));
});

test('all generated game rounds pass the player-visible consistency audit', () => {
  GAME_TYPES.forEach((type) => {
    ['easy', 'medium', 'hard'].forEach((difficulty) => {
      for (let seed = 0; seed < 120; seed += 1) {
        const round = generateChallenge(type, {
          difficulty,
          rng: createSeededRandom(`audit:${type}:${difficulty}:${seed}`),
          recentSignatures: [],
        });
        assert.deepEqual(
          validateGameChallenge(round),
          { valid: true, issues: [] },
          `${type}/${difficulty}/${seed} should be fully self-contained`,
        );
      }
    });
  });
});

test('daily recommendation rotates across all game types', () => {
  const picks = Array.from({ length: GAME_TYPES.length * 2 }, (_, offset) => {
    const date = new Date(Date.UTC(2026, 6, 15 + offset)).toISOString().slice(0, 10);
    return pickDailyGameType('learner-a', date);
  });
  assert.deepEqual(new Set(picks), new Set(GAME_TYPES));
  assert.ok(picks.every((type, index) => index === 0 || type !== picks[index - 1]));
});

test('recommended game targets an available weak ability and stays deterministic', () => {
  const progress = {
    learnerId: 'learner-geometry',
    abilities: { calculation: 80, problem: 75, geometry: 42, pattern: 68 },
    weakAbilities: ['geometry'],
  };
  const games = ['puzzle', 'pattern', 'partition', 'target-number', 'calculation-sprint'];
  const first = pickRecommendedGameType(progress, '2026-08-04', games);
  const second = pickRecommendedGameType(progress, '2026-08-04', games);
  assert.equal(first, second);
  assert.equal(getGameMeta(first).ability, 'geometry');
});

test('each grade receives five age-appropriate playable games', () => {
  const gradeOne = getGamesForGrade(1);
  const gradeFour = getGamesForGrade(4);
  const gradeSix = getGamesForGrade(6);
  assert.equal(gradeOne.length, 5);
  assert.equal(gradeFour.length, 5);
  assert.equal(gradeSix.length, 5);
  assert.ok(gradeOne.some((game) => game.type === 'number-chain'));
  assert.ok(gradeFour.some((game) => game.type === 'target-number'));
  assert.ok(gradeSix.some((game) => game.type === 'fraction-match'));
  assert.equal(getGameMeta('math-cipher').name, '数学密码');
});

test('every catalogue game generates a varied self-contained challenge', () => {
  const types = [
    ...getGamesForGrade(1),
    ...getGamesForGrade(4),
    ...getGamesForGrade(6),
  ].map((game) => game.type);
  [...new Set(types)].forEach((type) => {
    const first = generateChallenge(type, {
      difficulty: 'medium', rng: createSeededRandom(`first:${type}`), recentSignatures: [],
    });
    const next = generateChallenge(type, {
      difficulty: 'medium', rng: createSeededRandom(`first:${type}`), recentSignatures: [first.signature],
    });
    assert.equal(first.type, type);
    assert.ok(first.title.length > 0);
    assert.ok(first.instruction.length > 0);
    assert.ok(first.explanation.length > 0);
    assert.notEqual(next.signature, first.signature, `${type} should avoid a recent round`);
  });
});

test('small-pool games provide broad difficulty-sensitive round variety', () => {
  const sampleSignatures = (type, difficulty) => new Set(Array.from({ length: 160 }, (_, index) => (
    generateChallenge(type, {
      difficulty,
      rng: createSeededRandom(`${type}:${difficulty}:${index}`),
      recentSignatures: [],
    }).signature
  )));

  const shapeMedium = sampleSignatures('shape-hunt', 'medium');
  const seatsMedium = sampleSignatures('logic-seats', 'medium');
  assert.ok(shapeMedium.size >= 12, `shape-hunt only produced ${shapeMedium.size} rounds`);
  assert.ok(seatsMedium.size >= 20, `logic-seats only produced ${seatsMedium.size} rounds`);

  const shapeEasy = sampleSignatures('shape-hunt', 'easy');
  const shapeHard = sampleSignatures('shape-hunt', 'hard');
  const seatsEasy = sampleSignatures('logic-seats', 'easy');
  const seatsHard = sampleSignatures('logic-seats', 'hard');
  assert.notDeepEqual(shapeEasy, shapeHard);
  assert.notDeepEqual(seatsEasy, seatsHard);
});

test('each junior grade receives exactly five stage-scoped playable games', () => {
  [7, 8, 9].forEach((grade) => {
    const games = getGamesForGrade(grade, 'junior');
    assert.equal(games.length, 5, `grade ${grade}`);
    assert.equal(new Set(games.map((game) => game.type)).size, 5, `grade ${grade}`);
    assert.ok(games.every((game) => game.schoolStage === 'junior' && game.grades.includes(grade)));
  });
  assert.deepEqual(getGamesForGrade(7, 'primary'), []);
  assert.equal(getGamesForGrade(4, 'primary').length, 5);
});

test('junior game membership maps to the canonical curriculum topics for each grade', () => {
  const expectedTypes = {
    7: ['algebra-expression', 'data-reasoning', 'equation-lab', 'geometry-clue', 'rational-number'],
    8: ['data-reasoning', 'function-match', 'geometry-clue', 'pythagorean-route', 'radical-reasoning'],
    9: ['geometry-clue', 'probability-lab', 'quadratic-path', 'sample-inference', 'trig-exact'],
  };
  [7, 8, 9].forEach((grade) => {
    const games = getGamesForGrade(grade, 'junior');
    const canonicalKeys = new Set(JUNIOR_GRADE_TOPICS[grade].map((topic) => topic.key));
    assert.deepEqual(games.map((game) => game.type).sort(), expectedTypes[grade], `grade ${grade}`);
    games.forEach((game) => {
      const topicKeys = game.topicKeys && game.topicKeys[grade];
      assert.ok(Array.isArray(topicKeys) && topicKeys.length > 0, `${game.type}/grade ${grade} needs topic keys`);
      assert.ok(topicKeys.every((key) => canonicalKeys.has(key)), `${game.type}/grade ${grade} has an off-scope topic`);
    });
  });
  assert.equal(getGamesForGrade(7, 'junior').some((game) => game.type === 'function-match'), false);
  assert.equal(getGamesForGrade(7, 'junior').some((game) => game.type === 'probability-lab'), false);
  assert.equal(getGamesForGrade(9, 'junior').some((game) => game.type === 'probability-lab'), true);
});

test('junior generators are deterministic, answerable, and valid across grades and difficulties', () => {
  const games = [...new Map([7, 8, 9]
    .reduce((items, grade) => items.concat(getGamesForGrade(grade, 'junior')), [])
    .map((game) => [game.type, game])).values()];
  const expectedDepth = { easy: 1, medium: 2, hard: 3 };
  let samples = 0;
  games.forEach((game) => {
    ['easy', 'medium', 'hard'].forEach((difficulty) => {
      for (let seed = 0; seed < 30; seed += 1) {
        const options = {
          difficulty,
          grade: game.grades[0],
          schoolStage: 'junior',
          rng: createSeededRandom(`junior:${game.type}:${difficulty}:${seed}`),
          recentSignatures: [],
        };
        const first = generateChallenge(game.type, options);
        const second = generateChallenge(game.type, {
          ...options,
          rng: createSeededRandom(`junior:${game.type}:${difficulty}:${seed}`),
        });
        assert.deepEqual(first, second, `${game.type}/${difficulty}/${seed} must be deterministic`);
        assert.deepEqual(validateGameChallenge(first), { valid: true, issues: [] });
        assert.equal(first.choices.length, 4);
        assert.equal(new Set(first.choices.map(String)).size, 4);
        assert.equal(first.choices.filter((choice) => String(choice) === String(first.answer)).length, 1);
        assert.ok(first.explanation.includes(String(first.answer)), `${game.type} explanation must state the answer`);
        assert.equal(first.reasoningDepth, expectedDepth[difficulty]);
        assert.doesNotMatch(first.instruction, /如图|图中|见图/);
        samples += 1;
      }
    });
  });
  assert.equal(samples, 1080);
});

test('data medium and hard answers require independently verifiable correction relationships', () => {
  for (let seed = 0; seed < 40; seed += 1) {
    const medium = generateChallenge('data-reasoning', {
      difficulty: 'medium', grade: 8, schoolStage: 'junior',
      rng: createSeededRandom(`data-medium:${seed}`), recentSignatures: [],
    });
    const mediumParts = medium.signature.split(':').slice(2).map(Number);
    const [recordedMean, wrongValue, correctValue, count] = mediumParts;
    const correctedMean = recordedMean + (correctValue - wrongValue) / count;
    assert.equal(medium.answer, correctedMean);
    assert.ok(medium.instruction.includes(String(wrongValue)) && medium.instruction.includes(String(correctValue)));
    assert.ok(medium.explanation.includes(String(correctedMean)));

    const hard = generateChallenge('data-reasoning', {
      difficulty: 'hard', grade: 8, schoolStage: 'junior',
      rng: createSeededRandom(`data-hard:${seed}`), recentSignatures: [],
    });
    const hardParts = hard.signature.split(':').slice(2).map(Number);
    const [hardRecordedMean, hardWrong, hardCorrect, median, hardCount] = hardParts;
    const hardCorrectedMean = hardRecordedMean + (hardCorrect - hardWrong) / hardCount;
    assert.equal(hard.answer, hardCorrectedMean - median);
    assert.ok(hard.explanation.includes(String(hardCorrectedMean)));
    assert.ok(hard.explanation.includes(String(median)));
  }
});

test('grade 7 data prompts stay within average reasoning while grade 8 retains median work', () => {
  const forbiddenGrade7Terms = /中位数|众数|方差|波动/;
  const grade7Meta = getGamesForGrade(7, 'junior').find((game) => game.type === 'data-reasoning');
  assert.doesNotMatch(grade7Meta.description, forbiddenGrade7Terms);

  ['medium', 'hard'].forEach((difficulty) => {
    for (let seed = 0; seed < 60; seed += 1) {
      const challenge = generateChallenge('data-reasoning', {
        difficulty, grade: 7, schoolStage: 'junior',
        rng: createSeededRandom(`grade7-data:${difficulty}:${seed}`), recentSignatures: [],
      });
      assert.doesNotMatch(
        [challenge.title, challenge.instruction, challenge.explanation].join(' '),
        forbiddenGrade7Terms,
      );
      const numbers = challenge.signature.split(':').slice(2).map(Number);
      if (difficulty === 'medium') {
        const [recordedMean, wrongValue, correctValue, count] = numbers;
        assert.equal(challenge.answer, recordedMean + (correctValue - wrongValue) / count);
      } else {
        assert.match(challenge.signature, /^jdata7:h:/);
        const [firstCount, firstMean, secondCount, secondMean] = numbers;
        const combinedMean = (firstCount * firstMean + secondCount * secondMean)
          / (firstCount + secondCount);
        assert.equal(challenge.answer, combinedMean);
        assert.ok(challenge.explanation.includes(String(firstCount * firstMean)));
        assert.ok(challenge.explanation.includes(String(secondCount * secondMean)));
      }
    }
  });

  const grade8Hard = generateChallenge('data-reasoning', {
    difficulty: 'hard', grade: 8, schoolStage: 'junior',
    rng: createSeededRandom('grade8-data-median'), recentSignatures: [],
  });
  assert.match([grade8Hard.title, grade8Hard.instruction, grade8Hard.explanation].join(' '), /中位数/);
});

test('trig medium and hard answers independently combine ratios with a side scale', () => {
  for (let seed = 0; seed < 40; seed += 1) {
    const medium = generateChallenge('trig-exact', {
      difficulty: 'medium', grade: 9, schoolStage: 'junior',
      rng: createSeededRandom(`trig-medium:${seed}`), recentSignatures: [],
    });
    const [opposite, adjacent, hypotenuse, scale] = medium.signature.split(':').slice(2).map(Number);
    assert.equal(opposite * opposite + adjacent * adjacent, hypotenuse * hypotenuse);
    assert.equal(medium.answer, opposite * scale);
    assert.ok(medium.instruction.includes(String(hypotenuse * scale)));
    assert.ok(medium.explanation.includes(String(opposite * scale)));

    const hard = generateChallenge('trig-exact', {
      difficulty: 'hard', grade: 9, schoolStage: 'junior',
      rng: createSeededRandom(`trig-hard:${seed}`), recentSignatures: [],
    });
    const [hardOpposite, hardAdjacent, hardHypotenuse, hardScale] = hard.signature.split(':').slice(2).map(Number);
    const scaledAdjacent = hardAdjacent * hardScale;
    const derivedOpposite = hardOpposite * hardScale;
    assert.equal(hard.answer, Math.sqrt(scaledAdjacent * scaledAdjacent + derivedOpposite * derivedOpposite));
    assert.ok(hard.explanation.includes(String(derivedOpposite)));
    assert.ok(hard.explanation.includes(String(hardHypotenuse * hardScale)));
  }
});

test('junior generators avoid recent signatures for every type and difficulty', () => {
  const games = [...new Map([7, 8, 9]
    .reduce((items, grade) => items.concat(getGamesForGrade(grade, 'junior')), [])
    .map((game) => [game.type, game])).values()];
  games.forEach((game) => {
    ['easy', 'medium', 'hard'].forEach((difficulty) => {
      const seed = `junior-recent:${game.type}:${difficulty}`;
      const base = { difficulty, grade: game.grades[0], schoolStage: 'junior' };
      const first = generateChallenge(game.type, {
        ...base, rng: createSeededRandom(seed), recentSignatures: [],
      });
      const next = generateChallenge(game.type, {
        ...base, rng: createSeededRandom(seed), recentSignatures: [first.signature],
      });
      assert.notEqual(next.signature, first.signature, `${game.type}/${difficulty}`);
    });
  });
});

test('quadratic and trig games avoid ten actual saved signatures whenever another challenge exists', () => {
  ['quadratic-path', 'trig-exact'].forEach((type) => {
    ['easy', 'medium', 'hard'].forEach((difficulty) => {
      const seed = `saved-history:${type}:${difficulty}`;
      let progress = createDefaultGameProgress();
      const generated = new Set();
      for (let index = 0; index < 10; index += 1) {
        const challenge = generateChallenge(type, {
          difficulty, grade: 9, schoolStage: 'junior',
          rng: createSeededRandom(seed),
          recentSignatures: progress.byType[type].recentSignatures,
        });
        assert.equal(generated.has(challenge.signature), false, `${type}/${difficulty} repeated before history filled`);
        generated.add(challenge.signature);
        progress = completeRound(progress, type, {
          id: `${type}-${difficulty}-${index}`,
          signature: challenge.signature,
          challenge,
          player: {},
        }).gameProgress;
      }
      const history = progress.byType[type].recentSignatures;
      assert.equal(history.length, 10);
      const next = generateChallenge(type, {
        difficulty, grade: 9, schoolStage: 'junior',
        rng: createSeededRandom(seed), recentSignatures: history,
      });
      assert.equal(history.includes(next.signature), false, `${type}/${difficulty} repeated a saved signature`);
      assert.equal(next.repeatExhausted, undefined);
    });
  });
});

test('finite junior pools mark a deterministic repeat only when every candidate is exhausted', () => {
  [
    { type: 'quadratic-path', difficulty: 'easy', size: 19 },
    { type: 'trig-exact', difficulty: 'easy', size: 18 },
  ].forEach(({ type, difficulty, size }) => {
    const seed = `exhausted:${type}:${difficulty}`;
    const recentSignatures = [];
    for (let index = 0; index < size; index += 1) {
      const challenge = generateChallenge(type, {
        difficulty, grade: 9, schoolStage: 'junior',
        rng: createSeededRandom(seed), recentSignatures,
      });
      assert.equal(recentSignatures.includes(challenge.signature), false);
      recentSignatures.push(challenge.signature);
    }
    const firstRepeat = generateChallenge(type, {
      difficulty, grade: 9, schoolStage: 'junior',
      rng: createSeededRandom(seed), recentSignatures,
    });
    const secondRepeat = generateChallenge(type, {
      difficulty, grade: 9, schoolStage: 'junior',
      rng: createSeededRandom(seed), recentSignatures,
    });
    assert.equal(firstRepeat.repeatExhausted, true);
    assert.ok(recentSignatures.includes(firstRepeat.signature));
    assert.deepEqual(secondRepeat, firstRepeat);
  });
});

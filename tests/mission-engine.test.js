const test = require('node:test');
const assert = require('node:assert/strict');

const {
  JUNIOR_GAME_CATALOG,
  JUNIOR_GAME_TYPES,
} = require('../miniprogram/utils/game-engine-junior');
const {
  MISSION_FORMATS,
  getMissionFormat,
  generateMission,
  validateMission,
  createMissionPlayer,
  evaluateMission,
  getMissionHint,
} = require('../miniprogram/packages/junior/mission-engine');

function createSeededRandom(seed) {
  let value = 2166136261;
  String(seed).split('').forEach((character) => {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  });
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function matchingGrade(meta) {
  return meta.grades[0];
}

function solvedPlayer(mission) {
  const player = createMissionPlayer(mission);
  if (mission.format === 'transform' || mission.format === 'proof-chain') {
    return { ...player, orderedIds: [...mission.correctIds] };
  }
  if (mission.format === 'coordinate') {
    return { ...player, selectedIds: [...mission.requiredIds] };
  }
  return {
    ...player,
    selectedEvidenceIds: [...mission.correctEvidenceIds],
    conclusionId: mission.correctConclusionId,
  };
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(Number(left));
  let b = Math.abs(Number(right));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function exactDecimal(numerator, denominator) {
  const divisor = greatestCommonDivisor(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  return String(reducedNumerator / reducedDenominator);
}

test('mission engine exposes four distinct interaction formats for the junior catalogue', () => {
  assert.deepEqual(MISSION_FORMATS, ['transform', 'coordinate', 'proof-chain', 'data-board']);
  assert.equal(JUNIOR_GAME_TYPES.length, JUNIOR_GAME_CATALOG.length);
  assert.equal(new Set(JUNIOR_GAME_TYPES).size, JUNIOR_GAME_TYPES.length);

  const formats = new Set();
  JUNIOR_GAME_CATALOG.forEach((meta) => {
    const format = getMissionFormat(meta.type);
    assert.ok(MISSION_FORMATS.includes(format), `${meta.type} needs a supported format`);
    formats.add(format);
  });
  assert.deepEqual([...formats].sort(), [...MISSION_FORMATS].sort());
  assert.equal(getMissionFormat('not-a-mission'), null);
});

test('every catalogued junior type generates a scoped, self-contained, deterministic mission', () => {
  JUNIOR_GAME_CATALOG.forEach((meta) => {
    ['easy', 'medium', 'hard'].forEach((difficulty) => {
      const options = {
        grade: matchingGrade(meta),
        difficulty,
        rng: createSeededRandom(`${meta.type}:${difficulty}:same-seed`),
        recentSignatures: [],
      };
      const first = generateMission(meta.type, options);
      const second = generateMission(meta.type, {
        ...options,
        rng: createSeededRandom(`${meta.type}:${difficulty}:same-seed`),
      });

      assert.deepEqual(first, second, `${meta.type}/${difficulty} should be deterministic`);
      assert.equal(first.type, meta.type);
      assert.equal(first.schoolStage, 'junior');
      assert.ok(meta.grades.includes(first.grade));
      assert.equal(first.difficulty, difficulty);
      assert.equal(first.format, getMissionFormat(meta.type));
      assert.ok(first.signature.length > 0);
      assert.ok(first.title.length > 0);
      assert.ok(first.instruction.length > 0);
      assert.ok(first.explanation.length > 0);
      assert.ok(first.hint.length > 0);
      assert.doesNotMatch(`${first.title}\n${first.instruction}\n${first.explanation}\n${first.hint}`, /如图|见图|图中/);
      assert.deepEqual(validateMission(first), { valid: true, issues: [] });
      assert.deepEqual(evaluateMission(first, solvedPlayer(first)), { complete: true, reason: 'complete' });
      assert.ok(getMissionHint(first, createMissionPlayer(first)).length > 0);
    });
  });
});

test('transform and proof-chain missions require the exact ordered workspace chain', () => {
  ['algebra-expression', 'geometry-clue', 'quadratic-path', 'trig-exact'].forEach((type) => {
    const meta = JUNIOR_GAME_CATALOG.find((item) => item.type === type);
    const mission = generateMission(type, {
      grade: matchingGrade(meta),
      difficulty: 'medium',
      rng: createSeededRandom(`ordered:${type}`),
    });
    const initial = createMissionPlayer(mission);
    assert.ok(['transform', 'proof-chain'].includes(mission.format));
    assert.ok(mission.cards.length > mission.correctIds.length);
    assert.equal(new Set(mission.cards.map((card) => card.id)).size, mission.cards.length);
    assert.equal(evaluateMission(mission, initial).complete, false);
    assert.equal(evaluateMission(mission, { ...initial, orderedIds: [...mission.correctIds].reverse() }).complete, false);
    assert.deepEqual(evaluateMission(mission, solvedPlayer(mission)), { complete: true, reason: 'complete' });
  });
});

test('independent radical simplification steps accept either valid order', () => {
  const mission = generateMission('radical-reasoning', {
    grade: 8,
    difficulty: 'medium',
    rng: createSeededRandom('radical-independent-order'),
  });
  assert.deepEqual(evaluateMission(mission, {
    ...createMissionPlayer(mission),
    orderedIds: ['cube', 'square', 'result'],
  }), { complete: true, reason: 'complete' });
});

test('independent grade-seven geometry facts accept either valid order before substitution', () => {
  const mission = generateMission('geometry-clue', {
    grade: 7,
    difficulty: 'hard',
    rng: createSeededRandom('geometry-independent-facts'),
  });
  assert.deepEqual(evaluateMission(mission, {
    ...createMissionPlayer(mission),
    orderedIds: ['known-sum', 'angle-sum', 'substitute', 'result'],
  }), { complete: true, reason: 'complete' });
  assert.equal(evaluateMission(mission, {
    ...createMissionPlayer(mission),
    orderedIds: ['known-sum', 'substitute', 'angle-sum', 'result'],
  }).complete, false, 'substitution must still wait for both supporting facts');
});

test('coordinate missions use selectable cells rather than answer choices', () => {
  ['rational-number', 'function-match'].forEach((type) => {
    const meta = JUNIOR_GAME_CATALOG.find((item) => item.type === type);
    const mission = generateMission(type, {
      grade: matchingGrade(meta),
      difficulty: 'hard',
      rng: createSeededRandom(`coordinate:${type}`),
    });
    const initial = createMissionPlayer(mission);
    assert.equal(mission.format, 'coordinate');
    assert.ok(mission.cells.length >= 6);
    assert.ok(mission.requiredIds.length >= 1);
    assert.equal(new Set(mission.cells.map((cell) => cell.id)).size, mission.cells.length);
    assert.ok(mission.requiredIds.every((id) => mission.cells.some((cell) => cell.id === id)));
    assert.equal(evaluateMission(mission, initial).complete, false);
    assert.deepEqual(evaluateMission(mission, solvedPlayer(mission)), { complete: true, reason: 'complete' });
  });
});

test('data-board missions require both evidence and a conclusion', () => {
  ['data-reasoning', 'probability-lab', 'sample-inference'].forEach((type) => {
    const meta = JUNIOR_GAME_CATALOG.find((item) => item.type === type);
    const mission = generateMission(type, {
      grade: matchingGrade(meta),
      difficulty: 'medium',
      rng: createSeededRandom(`data-board:${type}`),
    });
    const initial = createMissionPlayer(mission);
    assert.equal(mission.format, 'data-board');
    assert.ok(mission.evidenceCards.length > mission.correctEvidenceIds.length);
    assert.ok(mission.conclusionChoices.length >= 3);
    assert.equal(
      new Set(mission.conclusionChoices.map((choice) => choice.text)).size,
      mission.conclusionChoices.length,
      `${type} conclusion text must not be ambiguous`,
    );
    assert.ok(mission.correctEvidenceIds.length >= 2);
    assert.equal(evaluateMission(mission, initial).complete, false);
    assert.equal(evaluateMission(mission, {
      ...initial,
      selectedEvidenceIds: mission.correctEvidenceIds,
      conclusionId: mission.conclusionChoices.find((choice) => choice.id !== mission.correctConclusionId).id,
    }).complete, false);
    assert.deepEqual(evaluateMission(mission, solvedPlayer(mission)), { complete: true, reason: 'complete' });
  });
});

test('data-board conclusion wording stays unique across generated variants', () => {
  ['data-reasoning', 'probability-lab', 'sample-inference'].forEach((type) => {
    const meta = JUNIOR_GAME_CATALOG.find((item) => item.type === type);
    for (let seed = 0; seed < 40; seed += 1) {
      const mission = generateMission(type, {
        grade: matchingGrade(meta),
        difficulty: 'hard',
        rng: createSeededRandom(`conclusion:${type}:${seed}`),
      });
      assert.equal(
        new Set(mission.conclusionChoices.map((choice) => choice.text)).size,
        mission.conclusionChoices.length,
        `${type}/${seed} must have unambiguous conclusions`,
      );
    }
  });
});

test('junior missions never hide correctness behind duplicate visible cards', () => {
  const workspaceTypes = ['algebra-expression', 'equation-lab', 'geometry-clue', 'pythagorean-route', 'radical-reasoning', 'quadratic-path', 'trig-exact'];
  workspaceTypes.forEach((type) => {
    const meta = JUNIOR_GAME_CATALOG.find((item) => item.type === type);
    ['easy', 'medium', 'hard'].forEach((difficulty) => {
      for (let seed = 0; seed < 60; seed += 1) {
        const mission = generateMission(type, {
          grade: matchingGrade(meta),
          difficulty,
          rng: createSeededRandom(`visible-workspace:${type}:${difficulty}:${seed}`),
        });
        assert.equal(
          new Set(mission.cards.map((card) => card.text)).size,
          mission.cards.length,
          `${type}/${difficulty}/${seed} has duplicate visible steps`,
        );
      }
    });
  });

  ['data-reasoning', 'probability-lab', 'sample-inference'].forEach((type) => {
    const meta = JUNIOR_GAME_CATALOG.find((item) => item.type === type);
    ['easy', 'medium', 'hard'].forEach((difficulty) => {
      for (let seed = 0; seed < 80; seed += 1) {
        const mission = generateMission(type, {
          grade: matchingGrade(meta),
          difficulty,
          rng: createSeededRandom(`visible-data:${type}:${difficulty}:${seed}`),
        });
        assert.equal(new Set(mission.evidenceCards.map((card) => card.text)).size, mission.evidenceCards.length);
        assert.equal(new Set(mission.conclusionChoices.map((choice) => choice.text)).size, mission.conclusionChoices.length);
      }
    });
  });
});

test('junior missions preserve exact fractions, units, conditions, and people counts', () => {
  for (let seed = 0; seed < 100; seed += 1) {
    const probability = generateMission('probability-lab', {
      grade: 8,
      difficulty: 'medium',
      rng: createSeededRandom(`probability-canonical:${seed}`),
    });
    const probabilityMatch = probability.answer.match(/概率是 (\d+)\/(\d+)$/);
    assert.ok(probabilityMatch);
    assert.equal(greatestCommonDivisor(probabilityMatch[1], probabilityMatch[2]), 1);
    assert.equal(
      probability.evidenceCards.some((card) => /抽到蓝球的结果数/.test(card.text)),
      false,
      'the blue-ball count is an alternative valid derivation, not a distractor',
    );

    const trigonometry = generateMission('trig-exact', {
      grade: 9,
      difficulty: 'hard',
      rng: createSeededRandom(`trig-canonical:${seed}`),
    });
    const trigMatch = trigonometry.answer.match(/tan A = (\d+)\/(\d+)$/);
    assert.ok(trigMatch);
    assert.equal(greatestCommonDivisor(trigMatch[1], trigMatch[2]), 1);

    const sample = generateMission('sample-inference', {
      grade: 9,
      difficulty: 'easy',
      rng: createSeededRandom(`sample-canonical:${seed}`),
    });
    const sampleText = [sample.instruction, sample.explanation]
      .concat(sample.conclusionChoices.map((choice) => choice.text))
      .join('\n');
    assert.doesNotMatch(sampleText, /\d+\.\d+ 人/);
    assert.match(sample.answer, /约有 \d+ 人符合条件$/);

    const correctedData = generateMission('data-reasoning', {
      grade: 8,
      difficulty: 'medium',
      rng: createSeededRandom(`correction-canonical:${seed}`),
    });
    const promptMatch = correctedData.instruction.match(/有 (\d+) 个数据，原平均数是 (\d+)。其中一个数据把 (\d+) 错记为 (\d+)/);
    assert.ok(promptMatch);
    const [, count, oldAverage, correctValue, wrongValue] = promptMatch.map(Number);
    const expected = exactDecimal(oldAverage * count + correctValue - wrongValue, count);
    assert.equal(correctedData.answer, `修正后的平均数是 ${expected}`);
  }

  const reading = generateMission('data-reasoning', {
    grade: 7,
    difficulty: 'easy',
    rng: createSeededRandom('reading-pages-unit'),
  });
  assert.match(reading.answer, /平均数是 \d+ 页$/);
  assert.match(reading.explanation, / = \d+ 页。$/);

  const circle = generateMission('geometry-clue', {
    grade: 9,
    difficulty: 'medium',
    rng: createSeededRandom('circle-arc-condition'),
  });
  assert.match(circle.instruction, /C 在优弧 AB 上/);

  const congruence = generateMission('geometry-clue', {
    grade: 8,
    difficulty: 'medium',
    rng: createSeededRandom('congruence-distractor'),
  });
  assert.equal(congruence.cards.some((card) => card.text === '所以两个三角形相似'), false);
});

test('junior mission difficulty changes the reasoning work instead of only its label', () => {
  const geometryEasy = generateMission('geometry-clue', {
    grade: 7, difficulty: 'easy', rng: createSeededRandom('difficulty-geometry'),
  });
  const geometryHard = generateMission('geometry-clue', {
    grade: 7, difficulty: 'hard', rng: createSeededRandom('difficulty-geometry'),
  });
  assert.ok(geometryHard.correctIds.length > geometryEasy.correctIds.length);

  const probabilityEasy = generateMission('probability-lab', {
    grade: 9, difficulty: 'easy', rng: createSeededRandom('difficulty-probability'),
  });
  const probabilityMedium = generateMission('probability-lab', {
    grade: 9, difficulty: 'medium', rng: createSeededRandom('difficulty-probability'),
  });
  const probabilityHard = generateMission('probability-lab', {
    grade: 9, difficulty: 'hard', rng: createSeededRandom('difficulty-probability'),
  });
  assert.ok(probabilityMedium.correctEvidenceIds.length > probabilityEasy.correctEvidenceIds.length);
  assert.ok(probabilityHard.correctEvidenceIds.length > probabilityMedium.correctEvidenceIds.length);
  assert.doesNotMatch(probabilityEasy.instruction, /绿球/);
  assert.match(probabilityHard.instruction, /绿球/);

  const quadraticEasy = generateMission('quadratic-path', {
    grade: 9, difficulty: 'easy', rng: createSeededRandom('difficulty-quadratic'),
  });
  const quadraticMedium = generateMission('quadratic-path', {
    grade: 9, difficulty: 'medium', rng: createSeededRandom('difficulty-quadratic'),
  });
  const quadraticHard = generateMission('quadratic-path', {
    grade: 9, difficulty: 'hard', rng: createSeededRandom('difficulty-quadratic'),
  });
  assert.ok(quadraticMedium.correctIds.length > quadraticEasy.correctIds.length);
  assert.ok(quadraticHard.correctIds.length > quadraticMedium.correctIds.length);
  assert.doesNotMatch(quadraticEasy.instruction, /^解方程 2x²/);
  assert.match(quadraticHard.instruction, /^解方程 2x²/);

  const trigEasy = generateMission('trig-exact', {
    grade: 9, difficulty: 'easy', rng: createSeededRandom('difficulty-trig'),
  });
  const trigMedium = generateMission('trig-exact', {
    grade: 9, difficulty: 'medium', rng: createSeededRandom('difficulty-trig'),
  });
  const trigHard = generateMission('trig-exact', {
    grade: 9, difficulty: 'hard', rng: createSeededRandom('difficulty-trig'),
  });
  assert.ok(trigMedium.correctIds.length > trigEasy.correctIds.length);
  assert.ok(trigHard.correctIds.length > trigMedium.correctIds.length);

  const sampleEasy = generateMission('sample-inference', {
    grade: 9, difficulty: 'easy', rng: createSeededRandom('difficulty-sample'),
  });
  const sampleMedium = generateMission('sample-inference', {
    grade: 9, difficulty: 'medium', rng: createSeededRandom('difficulty-sample'),
  });
  const sampleHard = generateMission('sample-inference', {
    grade: 9, difficulty: 'hard', rng: createSeededRandom('difficulty-sample'),
  });
  assert.ok(sampleMedium.correctEvidenceIds.length > sampleEasy.correctEvidenceIds.length);
  assert.ok(sampleHard.correctEvidenceIds.length > sampleMedium.correctEvidenceIds.length);
  assert.equal(sampleEasy.correctEvidenceIds.includes('random'), false);
  assert.equal(sampleHard.correctEvidenceIds.includes('random'), true);
});

test('junior difficulty tiers change the visible task payload for every supported mission', () => {
  const cases = [
    ['algebra-expression', 7],
    ['geometry-clue', 9],
    ['data-reasoning', 7],
    ['function-match', 8],
    ['pythagorean-route', 8],
    ['radical-reasoning', 8],
    ['probability-lab', 8],
    ['quadratic-path', 9],
    ['trig-exact', 9],
    ['sample-inference', 9],
  ];
  const visiblePayload = (mission) => JSON.stringify({
    instruction: mission.instruction,
    explanation: mission.explanation,
    cards: (mission.cards || []).map((card) => card.text).sort(),
    cells: (mission.cells || []).map((cell) => cell.label).sort(),
    evidence: (mission.evidenceCards || []).map((card) => card.text).sort(),
    conclusions: (mission.conclusionChoices || []).map((choice) => choice.text).sort(),
  });

  cases.forEach(([type, grade]) => {
    const payloads = ['easy', 'medium', 'hard'].map((difficulty) => visiblePayload(generateMission(type, {
      grade,
      difficulty,
      rng: createSeededRandom(`visible-difficulty:${type}:${grade}`),
    })));
    assert.equal(new Set(payloads).size, 3, `${type} grade ${grade} needs three visibly different tiers`);
  });
});

test('sample inference never labels the correct people estimate as a wrong conclusion', () => {
  ['easy', 'medium', 'hard'].forEach((difficulty) => {
    for (let seed = 0; seed < 300; seed += 1) {
      const mission = generateMission('sample-inference', {
        grade: 9,
        difficulty,
        rng: createSeededRandom(`sample-wrong-estimate:${difficulty}:${seed}`),
      });
      const correct = mission.conclusionChoices.find((choice) => choice.id === mission.correctConclusionId);
      const correctEstimate = Number(correct.text.match(/约有 (\d+) 人/)[1]);
      mission.conclusionChoices
        .filter((choice) => choice.id !== mission.correctConclusionId)
        .forEach((choice) => {
          const wrongEstimate = Number(choice.text.match(/约有 (\d+) 人/)[1]);
          assert.notEqual(wrongEstimate, correctEstimate, `${difficulty}:${seed} repeats the correct estimate`);
        });
    }
  });
});

test('mission generator avoids recent signatures without losing scope or solvability', () => {
  JUNIOR_GAME_CATALOG.forEach((meta) => {
    const seed = `recent:${meta.type}`;
    const first = generateMission(meta.type, {
      grade: matchingGrade(meta),
      difficulty: 'easy',
      rng: createSeededRandom(seed),
      recentSignatures: [],
    });
    const next = generateMission(meta.type, {
      grade: matchingGrade(meta),
      difficulty: 'easy',
      rng: createSeededRandom(seed),
      recentSignatures: [first.signature],
    });
    assert.notEqual(next.signature, first.signature, `${meta.type} should avoid a recent mission`);
    assert.deepEqual(validateMission(next), { valid: true, issues: [] });
    assert.deepEqual(evaluateMission(next, solvedPlayer(next)), { complete: true, reason: 'complete' });
  });
});

test('mission validator reports malformed interaction payloads and unknown types are safe', () => {
  assert.equal(generateMission('not-a-mission'), null);
  assert.deepEqual(validateMission(null), { valid: false, issues: ['mission_missing'] });

  const malformed = {
    type: 'equation-lab',
    schoolStage: 'junior',
    grade: 7,
    difficulty: 'easy',
    format: 'transform',
    signature: 'bad',
    title: '坏任务',
    instruction: '请完成',
    explanation: '没有可用步骤',
    hint: '无',
    cards: [],
    correctIds: [],
  };
  const audit = validateMission(malformed);
  assert.equal(audit.valid, false);
  assert.ok(audit.issues.includes('workspace_missing'));

  const duplicateVisibleSteps = generateMission('equation-lab', {
    grade: 7,
    difficulty: 'medium',
    rng: createSeededRandom('duplicate-visible-steps'),
  });
  duplicateVisibleSteps.cards[1] = { ...duplicateVisibleSteps.cards[1], text: duplicateVisibleSteps.cards[0].text };
  assert.ok(validateMission(duplicateVisibleSteps).issues.includes('workspace_card_text_duplicate'));

  const malformedAlternativeOrder = generateMission('radical-reasoning', {
    grade: 8,
    difficulty: 'medium',
    rng: createSeededRandom('malformed-alternative-order'),
  });
  malformedAlternativeOrder.correctSequences = [['square', 'cube']];
  assert.ok(validateMission(malformedAlternativeOrder).issues.includes('workspace_sequences_invalid'));

  const duplicateVisibleConclusions = generateMission('data-reasoning', {
    grade: 8,
    difficulty: 'medium',
    rng: createSeededRandom('duplicate-visible-conclusions'),
  });
  duplicateVisibleConclusions.conclusionChoices[1] = {
    ...duplicateVisibleConclusions.conclusionChoices[1],
    text: duplicateVisibleConclusions.conclusionChoices[0].text,
  };
  assert.ok(validateMission(duplicateVisibleConclusions).issues.includes('conclusion_text_duplicate'));
});

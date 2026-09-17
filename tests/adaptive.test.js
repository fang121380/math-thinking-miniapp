const test = require('node:test');
const assert = require('node:assert/strict');

const { diagnosticQuestions, practiceQuestions } = require('../miniprogram/utils/question-bank');
const {
  scoreDiagnostic,
  buildDailySet,
  resolveDailyQuestionIds,
  updateSkillState,
  updateWeakKnowledgePoints,
  recordDailyCompletion,
  createMistakeRecord,
} = require('../miniprogram/utils/adaptive');

test('diagnostic scoring identifies calculation and problem solving as weak abilities', () => {
  const responses = diagnosticQuestions.map((question) => ({
    questionId: question.id,
    correct: !['calculation', 'problem'].includes(question.ability),
    usedHint: question.ability === 'calculation',
  }));
  const profile = scoreDiagnostic(responses, diagnosticQuestions);
  assert.ok(profile.abilities.calculation < profile.abilities.geometry);
  assert.ok(profile.abilities.problem < profile.abilities.pattern);
  assert.ok(profile.weakAbilities.includes('calculation'));
  assert.ok(profile.weakAbilities.includes('problem'));
});

test('daily set contains choice, fill, and problem questions for the weak knowledge point', () => {
  const set = buildDailySet(practiceQuestions, {
    weakKnowledgePoints: ['division_estimation'],
    level: 2,
    completedIds: [],
  });
  assert.equal(set.length, 3);
  assert.deepEqual(set.map((question) => question.type).sort(), ['choice', 'fill', 'problem']);
  assert.ok(set.every((question) => question.knowledgePoint === 'division_estimation'));
});

test('daily sets are stable per learner and date but differ across learners', () => {
  const profile = { weakKnowledgePoints: ['division_estimation'], level: 1, completedIds: [] };
  const first = buildDailySet(practiceQuestions, profile, { learnerId: 'learner-a', date: '2026-07-15' });
  const repeat = buildDailySet(practiceQuestions, profile, { learnerId: 'learner-a', date: '2026-07-15' });
  const other = buildDailySet(practiceQuestions, profile, { learnerId: 'learner-b', date: '2026-07-15' });

  assert.deepEqual(first.map((item) => item.id), repeat.map((item) => item.id));
  assert.notDeepEqual(first.map((item) => item.id), other.map((item) => item.id));
});

test('daily selection prioritizes zero mastery and defaults only missing mastery to fifty', () => {
  const bank = ['choice', 'fill', 'problem'].flatMap((type) => (
    ['zero', 'low', 'unknown', 'missing', 'high'].map((knowledgePoint) => ({
      id: `${type}-${knowledgePoint}`,
      prompt: `${type}: ${knowledgePoint}`,
      answer: '1',
      type,
      difficulty: 2,
      knowledgePoint,
      ability: 'calculation',
      grade: 4,
      textbookId: 'rjb',
      term: '上册',
    }))
  ));
  const profile = {
    grade: 4,
    textbookId: 'rjb',
    knowledgeState: {
      zero: { mastery: 0 },
      low: { mastery: 20 },
      missing: {},
      high: { mastery: 80 },
    },
  };
  const context = { date: '2026-09-17', themeAbility: 'calculation' };

  for (const excluded of [[], ['zero'], ['zero', 'low']]) {
    const selected = buildDailySet(
      bank.filter((item) => !excluded.includes(item.knowledgePoint)),
      profile,
      context,
    );
    const expected = excluded.length === 0 ? ['zero']
      : excluded.length === 1 ? ['low'] : ['unknown', 'missing'];
    assert.equal(selected.length, 3);
    assert.deepEqual(selected.map((item) => item.type).sort(), ['choice', 'fill', 'problem']);
    assert.ok(selected.every((item) => expected.includes(item.knowledgePoint)),
      `Expected ${expected}, got ${selected.map((item) => item.knowledgePoint)}`);
  }
});

test('zero mastery does not override due review, explicit weaknesses, or fresh question priority', () => {
  const bank = ['choice', 'fill', 'problem'].flatMap((type) => (
    ['zero', 'other'].map((knowledgePoint) => ({
      id: `${type}-${knowledgePoint}`,
      prompt: `${type}: ${knowledgePoint}`,
      answer: '1',
      type,
      difficulty: 2,
      knowledgePoint,
      ability: 'calculation',
      grade: 4,
      textbookId: 'rjb',
      term: '上册',
    }))
  ));
  const zero = { mastery: 0 };
  const other = { mastery: 80 };
  const scenarios = [
    { knowledgeState: { zero, other: { ...other, nextReviewDate: '2026-09-16' } } },
    { knowledgeState: { zero, other }, weakKnowledgePoints: ['other'] },
    { knowledgeState: { zero, other }, servedQuestionIds: bank.filter((q) => q.knowledgePoint === 'zero').map((q) => q.id) },
  ];
  for (const profile of scenarios) {
    const selected = buildDailySet(bank, profile, {
      date: '2026-09-17', themeAbility: 'calculation', missionMode: 'review',
    });
    assert.equal(selected.length, 3);
    assert.ok(selected.every((item) => item.knowledgePoint === 'other'));
  }
});

test('daily selection avoids completed variants while alternatives exist', () => {
  const profile = { weakKnowledgePoints: ['division_estimation'], level: 1, completedIds: [] };
  const first = buildDailySet(practiceQuestions, profile, { learnerId: 'learner-a', date: '2026-07-15' });
  const next = buildDailySet(practiceQuestions, {
    ...profile,
    completedIds: first.map((item) => item.id),
  }, { learnerId: 'learner-a', date: '2026-07-16' });

  assert.equal(next.some((item) => first.some((previous) => previous.id === item.id)), false);
});

test('daily selection retains a learner daily set until its date changes', () => {
  const profile = {
    learnerId: 'learner-a',
    grade: 4,
    textbookId: 'rjb',
    learningTerm: '上册',
    dailySetDate: '2026-07-15',
    dailyQuestionIds: [
      'p-rjb-g4-multiply_estimation-choice-l2-34',
      'p-fill-division-1',
      'p-problem-arrangement-3',
    ],
  };

  assert.deepEqual(
    resolveDailyQuestionIds(practiceQuestions, profile, '2026-07-15'),
    profile.dailyQuestionIds,
  );
});

test('difficulty setting changes the eligible question range', () => {
  const bank = ['choice', 'fill', 'problem'].flatMap((type) => [
    { id: `${type}-easy`, type, difficulty: 1, knowledgePoint: 'number', grade: 4, textbookId: 'rjb', term: '上册' },
    { id: `${type}-hard`, type, difficulty: 3, knowledgePoint: 'number', grade: 4, textbookId: 'rjb', term: '上册' },
  ]);
  const profile = { learnerId: 'learner-a', weakKnowledgePoints: ['number'], completedIds: [], grade: 4 };
  const easy = buildDailySet(bank, profile, { date: '2026-07-15', difficultyMode: 'easy', goal: 3 });
  const hard = buildDailySet(bank, profile, { date: '2026-07-15', difficultyMode: 'hard', goal: 3 });

  assert.ok(easy.every((item) => item.difficulty === 1));
  assert.ok(hard.every((item) => item.difficulty === 3));
});

test('difficulty modes are mutually exclusive', () => {
  const bank = ['choice', 'fill', 'problem'].flatMap((type) => [
    { id: `${type}-easy`, type, difficulty: 1, knowledgePoint: 'number', grade: 4, textbookId: 'rjb', term: '上册' },
    { id: `${type}-medium`, type, difficulty: 2, knowledgePoint: 'number', grade: 4, textbookId: 'rjb', term: '上册' },
    { id: `${type}-hard`, type, difficulty: 3, knowledgePoint: 'number', grade: 4, textbookId: 'rjb', term: '上册' },
  ]);
  const profile = { learnerId: 'difficulty-learner', weakKnowledgePoints: ['number'], completedIds: [], grade: 4 };

  const sets = ['easy', 'medium', 'hard'].map((difficultyMode) => buildDailySet(
    bank,
    profile,
    { date: '2026-07-20', difficultyMode, goal: 3 },
  ));

  assert.deepEqual(sets.map((set) => new Set(set.map((item) => item.difficulty))), [new Set([1]), new Set([2]), new Set([3])]);
  assert.equal(new Set(sets.flatMap((set) => set.map((item) => item.id))).size, 9);
});

test('daily selection excludes previously served questions while unseen alternatives exist', () => {
  const bank = ['choice', 'fill', 'problem'].flatMap((type) => [
    { id: `${type}-served`, type, difficulty: 2, knowledgePoint: 'number', grade: 4, textbookId: 'rjb', term: '上册' },
    { id: `${type}-fresh`, type, difficulty: 2, knowledgePoint: 'number', grade: 4, textbookId: 'rjb', term: '上册' },
  ]);
  const profile = {
    learnerId: 'served-history-learner',
    weakKnowledgePoints: ['number'],
    completedIds: [],
    servedQuestionIds: ['choice-served', 'fill-served', 'problem-served'],
    grade: 4,
  };

  const next = buildDailySet(bank, profile, {
    date: '2026-07-20', difficultyMode: 'medium', goal: 3,
  });

  assert.deepEqual(next.map((item) => item.id).sort(), ['choice-fresh', 'fill-fresh', 'problem-fresh']);
});

test('a ten-question set never falls back to a served question while its edition still has unseen variants', () => {
  const profile = {
    learnerId: 'audit-bsd-1',
    textbookId: 'bsd',
    grade: 1,
    weakKnowledgePoints: [],
    completedIds: [],
    servedQuestionIds: [],
  };
  const first = buildDailySet(practiceQuestions, profile, {
    date: '2026-07-20', difficultyMode: 'medium', goal: 10,
  });
  const second = buildDailySet(practiceQuestions, {
    ...profile,
    servedQuestionIds: first.map((item) => item.id),
  }, {
    date: '2026-07-21', difficultyMode: 'medium', goal: 10,
  });

  assert.equal(second.some((item) => first.some((previous) => previous.id === item.id)), false);
});

test('daily goals return unique questions and preserve every type', () => {
  [3, 5, 10].forEach((goal) => {
    const set = buildDailySet(practiceQuestions, {
      learnerId: `learner-${goal}`,
      weakKnowledgePoints: ['division_estimation'],
      completedIds: [],
      grade: 4,
    }, { date: '2026-07-15', difficultyMode: 'medium', goal });
    assert.equal(set.length, goal);
    assert.equal(new Set(set.map((item) => item.id)).size, goal);
    assert.deepEqual([...new Set(set.map((item) => item.type))].sort(), ['choice', 'fill', 'problem']);
  });
});

test('ten-question daily set uses multiple topics without overusing one topic', () => {
  const set = buildDailySet(practiceQuestions, {
    learnerId: 'variety-learner',
    weakKnowledgePoints: ['division_estimation'],
    completedIds: [],
    grade: 4,
  }, { date: '2026-07-16', difficultyMode: 'medium', goal: 10 });
  const knowledgeCounts = set.reduce((result, item) => {
    result[item.knowledgePoint] = (result[item.knowledgePoint] || 0) + 1;
    return result;
  }, {});
  assert.ok(Object.keys(knowledgeCounts).length >= 4);
  assert.ok(Object.values(knowledgeCounts).every((count) => count <= 2));
});

test('skill level rises after three independent correct answers', () => {
  let state = { level: 1, consecutiveCorrect: 0, consecutiveWrong: 0 };
  state = updateSkillState(state, { correct: true, usedHint: false });
  state = updateSkillState(state, { correct: true, usedHint: false });
  state = updateSkillState(state, { correct: true, usedHint: false });
  assert.deepEqual(state, { level: 2, consecutiveCorrect: 0, consecutiveWrong: 0 });
});

test('skill level falls after two wrong answers but never below one', () => {
  let state = { level: 2, consecutiveCorrect: 1, consecutiveWrong: 0 };
  state = updateSkillState(state, { correct: false, usedHint: false });
  state = updateSkillState(state, { correct: false, usedHint: false });
  assert.deepEqual(state, { level: 1, consecutiveCorrect: 0, consecutiveWrong: 0 });
  state = updateSkillState(state, { correct: false, usedHint: false });
  state = updateSkillState(state, { correct: false, usedHint: false });
  assert.equal(state.level, 1);
});

test('practice results continuously add and retire weak knowledge points', () => {
  const afterWrong = updateWeakKnowledgePoints(['old_topic'], 'new_topic', {
    level: 1, consecutiveWrong: 1,
  }, { correct: false, usedHint: false });
  assert.deepEqual(afterWrong, ['new_topic', 'old_topic']);

  const afterMastery = updateWeakKnowledgePoints(afterWrong, 'new_topic', {
    level: 2, consecutiveCorrect: 0,
  }, { correct: true, usedHint: false });
  assert.deepEqual(afterMastery, ['old_topic']);

  const afterHint = updateWeakKnowledgePoints(['hint_topic'], 'hint_topic', {
    level: 3, consecutiveCorrect: 2,
  }, { correct: true, usedHint: true });
  assert.deepEqual(afterHint, ['hint_topic']);
});

test('daily completion dates update a real consecutive-day streak idempotently', () => {
  const first = recordDailyCompletion({ completionDates: [], streakDays: 0 }, '2026-07-19');
  const second = recordDailyCompletion(first, '2026-07-20');
  const duplicate = recordDailyCompletion(second, '2026-07-20');
  const afterGap = recordDailyCompletion(duplicate, '2026-07-22');

  assert.equal(first.streakDays, 1);
  assert.equal(second.streakDays, 2);
  assert.deepEqual(duplicate, second);
  assert.equal(afterGap.streakDays, 1);
  assert.deepEqual(afterGap.completionDates, ['2026-07-19', '2026-07-20', '2026-07-22']);
});

test('wrong two-step problem creates an explainable mistake record', () => {
  const source = diagnosticQuestions.find((question) => question.id === 'd-problem-division-1');
  const record = createMistakeRecord(source, '12', practiceQuestions);
  assert.equal(record.questionId, source.id);
  assert.equal(record.mistakeCode, 'skip_total');
  assert.match(record.reason, /先求总量/);
  assert.deepEqual(record.solutionSteps, source.solution.steps);
  assert.ok(record.retryQuestionId);
  assert.notEqual(record.retryQuestionId, source.id);
});

test('mistake records display a numeric answer with its required unit', () => {
  const source = practiceQuestions.find((question) => question.id === 'p-problem-geometry-1');
  const record = createMistakeRecord(source, '80厘米', practiceQuestions);

  assert.equal(source.answerUnit, '米');
  assert.equal(record.correctAnswer, '80米');
});

test('mistake retry chooses a different question with the same topic and type', () => {
  const source = practiceQuestions.find((question) => question.id === 'p-problem-division-1');
  const record = createMistakeRecord(source, '0', practiceQuestions);
  const retry = practiceQuestions.find((question) => question.id === record.retryQuestionId);
  assert.notEqual(record.retryQuestionId, source.id);
  assert.equal(retry.knowledgePoint, source.knowledgePoint);
  assert.equal(retry.type, source.type);
});

test('daily, self-practice, recovery, and saved daily selectors enforce school stage', () => {
  const scopedBank = ['choice', 'fill', 'problem'].flatMap((type) => [
    { id: `primary-${type}`, schoolStage: 'primary', textbookId: 'rjb', grade: 7, term: '上册', type, difficulty: 2, knowledgePoint: 'scope' },
    { id: `junior-${type}`, schoolStage: 'junior', textbookId: 'jr-rjb', grade: 7, term: '上册', type, difficulty: 2, knowledgePoint: 'scope' },
  ]);
  const profile = {
    learnerId: 'scoped-learner', schoolStage: 'junior', textbookId: 'jr-rjb', grade: 7,
    weakKnowledgePoints: ['scope'], completedIds: [], dailyGoal: 3,
    dailySetDate: '2026-08-08', dailyQuestionIds: ['primary-choice', 'primary-fill', 'primary-problem'],
  };

  const daily = buildDailySet(scopedBank, profile, { date: '2026-08-08', difficultyMode: 'medium', goal: 3 });
  const self = require('../miniprogram/utils/adaptive').buildSelfPracticeSet(scopedBank, profile, {
    schoolStage: 'junior', grade: 7, difficultyMode: 'medium', goal: 3,
  });
  const resolved = resolveDailyQuestionIds(scopedBank, profile, '2026-08-08');
  const recoveryBank = [
    { ...scopedBank[0], id: 'primary-bridge', difficulty: 1 },
    { ...scopedBank[0], id: 'primary-remix' },
    { ...scopedBank[1], id: 'junior-original' },
    { ...scopedBank[1], id: 'junior-bridge', difficulty: 1 },
    { ...scopedBank[1], id: 'junior-remix' },
  ];
  const recovery = require('../miniprogram/utils/adaptive').buildRecoverySet(
    recoveryBank,
    recoveryBank.find((item) => item.id === 'junior-original'),
    profile,
    { date: '2026-08-08' },
  );

  assert.ok(daily.every((item) => item.schoolStage === 'junior'));
  assert.equal(daily.length, 3);
  assert.ok(self.questions.every((item) => item.schoolStage === 'junior'));
  assert.equal(self.questions.length, 3);
  assert.ok(resolved.every((id) => id.startsWith('junior-')));
  assert.ok([recovery.bridgeQuestion, recovery.remixQuestion].every((item) => item.schoolStage === 'junior'));
});

test('mistake records persist normalized school stage', () => {
  const primarySource = diagnosticQuestions.find((question) => question.id === 'd-problem-division-1');
  const juniorSource = { ...primarySource, id: 'junior-mistake', schoolStage: 'junior' };
  const juniorRecord = createMistakeRecord(juniorSource, '0', practiceQuestions);

  assert.equal(createMistakeRecord(primarySource, '0', practiceQuestions).schoolStage, 'primary');
  assert.equal(juniorRecord.schoolStage, 'junior');
  assert.equal(juniorRecord.retryQuestionId, '');
});

test('real junior banks support daily, self-practice, and recovery without scope leaks', () => {
  const { getQuestionBank } = require('../miniprogram/utils/question-bank');
  const { buildSelfPracticeSet, buildRecoverySet } = require('../miniprogram/utils/adaptive');
  const scope = { schoolStage: 'junior', textbookId: 'jr-rjb', grade: 7 };
  const bank = getQuestionBank(scope).practiceQuestions;
  const profile = {
    ...scope,
    learnerId: 'junior-adaptive-real',
    difficultyMode: 'medium',
    dailyGoal: 10,
    weakKnowledgePoints: ['rational_number'],
    completedIds: [],
    servedQuestionIds: [],
    knowledgeState: {},
  };
  const daily = buildDailySet(bank, profile, { date: '2026-08-08', goal: 10 });
  const self = buildSelfPracticeSet(bank, profile, { difficultyMode: 'hard', goal: 10 });
  const original = bank.find((item) => item.knowledgePoint === 'rational_number' && item.difficulty === 'medium');
  const recovery = buildRecoverySet(bank, original, profile, { date: '2026-08-08' });

  assert.equal(daily.length, 10);
  assert.ok(daily.every((item) => item.schoolStage === 'junior' && item.textbookId === 'jr-rjb' && item.grade === 7));
  assert.ok(daily.every((item) => item.difficulty === 'medium'));
  assert.equal(self.questions.length, 10);
  assert.ok(self.questions.every((item) => item.difficulty === 'hard' && item.textbookId === 'jr-rjb' && item.grade === 7));
  assert.ok(recovery);
  assert.equal(recovery.bridgeQuestion.difficulty, 'easy');
  assert.equal(recovery.remixQuestion.difficulty, 'medium');
  assert.ok([recovery.bridgeQuestion, recovery.remixQuestion].every((item) => (
    item.schoolStage === 'junior' && item.textbookId === 'jr-rjb' && item.grade === 7
  )));
});

test('mistake records persist grade for scoped historical lookup', () => {
  const { getQuestionBank } = require('../miniprogram/utils/question-bank');
  const bank = getQuestionBank({ schoolStage: 'junior', textbookId: 'jr-rjb', grade: 8 });
  const source = bank.practiceQuestions[0];
  const record = createMistakeRecord(source, 'wrong', bank.practiceQuestions);
  assert.equal(record.grade, 8);
  assert.equal(record.schoolStage, 'junior');
  assert.equal(record.textbookId, 'jr-rjb');
});

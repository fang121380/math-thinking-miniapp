const test = require('node:test');
const assert = require('node:assert/strict');

const { getTextbookOptions } = require('../miniprogram/utils/textbook-catalog');
const { answersEquivalent } = require('../miniprogram/utils/math-answer');
const { getQuestionBank, getQuestions } = require('../miniprogram/utils/question-bank');
const { selectDiagnosticSet } = require('../miniprogram/utils/diagnostic');
const {
  buildDailySet,
  buildSelfPracticeSet,
  buildRecoverySet,
  createMistakeRecord,
  scoreDiagnostic,
} = require('../miniprogram/utils/adaptive');

function gcd(left, right) {
  let a = Math.abs(Number(left));
  let b = Math.abs(Number(right));
  while (b) [a, b] = [b, a % b];
  return a;
}

test('junior unit answers accept their displayed units and reduce probabilities', () => {
  const bank = getQuestionBank({ schoolStage: 'junior', textbookId: 'jr-rjb', grade: 9 }).practiceQuestions;
  const units = bank.filter((item) => item.answerUnit);
  assert.ok(units.length > 0);
  assert.ok(units.every((item) => answersEquivalent(
    `${item.answer}${item.answerUnit}`, item.answer, item.answerUnit, item.answerSpec,
  )));

  const probabilities = bank.filter((item) => item.knowledgePoint === 'probability');
  assert.ok(probabilities.length > 0);
  probabilities.forEach((item) => {
    const [numerator, denominator] = item.answer.split('/').map(Number);
    assert.equal(gcd(numerator, denominator), 1, item.id);
  });
});

test('scope inference accepts implicit junior scope and rejects explicit conflicts', () => {
  const implicit = getQuestions({ textbookId: 'jr-rjb', grade: 7, difficultyMode: 'easy', type: 'choice' });
  assert.ok(implicit.length >= 24);
  assert.ok(implicit.every((item) => item.schoolStage === 'junior'));

  [
    { schoolStage: 'junior', textbookId: 'rjb', grade: 7 },
    { schoolStage: 'junior', textbookId: 'jr-rjb', grade: 6 },
    { schoolStage: 'primary', textbookId: 'jr-rjb', grade: 7 },
    { schoolStage: 'primary', textbookId: 'rjb', grade: 7 },
  ].forEach((scope) => {
    assert.deepEqual(getQuestionBank(scope), { diagnosticQuestions: [], practiceQuestions: [] });
    assert.deepEqual(getQuestions({ ...scope, difficultyMode: 'medium', type: 'choice' }), []);
  });

  [
    { schoolStage: 'unknown', textbookId: 'rjb', grade: 4 },
    ...[0, 7.5, 10].flatMap((grade) => [
      { schoolStage: 'junior', textbookId: 'jr-rjb', grade },
      { schoolStage: 'primary', textbookId: 'rjb', grade },
      { textbookId: 'jr-rjb', grade },
      { textbookId: 'rjb', grade },
    ]),
  ].forEach((scope) => {
    assert.deepEqual(getQuestionBank(scope), { diagnosticQuestions: [], practiceQuestions: [] }, JSON.stringify(scope));
    assert.deepEqual(getQuestions(scope), [], JSON.stringify(scope));
  });
});

test('every junior scope offers five distinct entry slots at each difficulty', () => {
  getTextbookOptions('junior').forEach((textbook) => [7, 8, 9].forEach((grade) => {
    const scope = { schoolStage: 'junior', textbookId: textbook.value, grade };
    const bank = getQuestionBank(scope).diagnosticQuestions;
    ['easy', 'medium', 'hard'].forEach((difficultyMode) => {
      const set = selectDiagnosticSet(bank, { ...scope, learnerId: 'contract-core', attempt: 1, difficultyMode });
      assert.equal(set.length, 5, `${textbook.value} g${grade} ${difficultyMode}`);
      assert.equal(new Set(set.map((item) => item.entrySlot)).size, 5);
      assert.ok(set.every((item) => item.entryDiagnostic && item.difficulty === difficultyMode));
    });
  }));
});

test('junior diagnostics map to displayed abilities', () => {
  const scope = { schoolStage: 'junior', textbookId: 'jr-rjb', grade: 8 };
  const selected = selectDiagnosticSet(getQuestionBank(scope).diagnosticQuestions, {
    ...scope, learnerId: 'contract-score', attempt: 1, difficultyMode: 'medium',
  });
  const result = scoreDiagnostic(selected.map((item) => ({ questionId: item.id, correct: false })), selected);
  assert.ok(Object.keys(result.abilities).every((ability) => ['calculation', 'problem', 'geometry', 'pattern', 'data'].includes(ability)));
  assert.ok(Object.keys(result.abilities).some((ability) => result.abilityLabels[ability]));
});

test('junior adaptive selectors retain scope and string difficulty order', () => {
  const scope = { schoolStage: 'junior', textbookId: 'jr-rjb', grade: 7 };
  const bank = getQuestionBank(scope).practiceQuestions;
  const profile = {
    ...scope,
    learnerId: 'contract-adaptive',
    difficultyMode: 'medium',
    dailyGoal: 10,
    weakKnowledgePoints: ['rational_number'],
    completedIds: [],
    servedQuestionIds: [],
  };
  const daily = buildDailySet(bank, profile, { date: '2026-08-08', goal: 10 });
  const self = buildSelfPracticeSet(bank, profile, { difficultyMode: 'hard', goal: 10 });
  const original = bank.find((item) => item.knowledgePoint === 'rational_number' && item.difficulty === 'medium');
  const recovery = buildRecoverySet(bank, original, profile, { date: '2026-08-08' });

  assert.ok(daily.every((item) => item.difficulty === 'medium' && item.textbookId === scope.textbookId && item.grade === scope.grade));
  assert.ok(self.questions.every((item) => item.difficulty === 'hard' && item.textbookId === scope.textbookId && item.grade === scope.grade));
  assert.equal(recovery.bridgeQuestion.difficulty, 'easy');
  assert.equal(recovery.remixQuestion.difficulty, 'medium');
});

test('junior mistake records retain their grade', () => {
  const scope = { schoolStage: 'junior', textbookId: 'jr-rjb', grade: 8 };
  const bank = getQuestionBank(scope).practiceQuestions;
  const record = createMistakeRecord(bank[0], 'wrong', bank);
  assert.equal(record.grade, 8);
  assert.equal(record.schoolStage, 'junior');
});

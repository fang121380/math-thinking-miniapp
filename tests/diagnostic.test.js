const test = require('node:test');
const assert = require('node:assert/strict');

const { diagnosticQuestions } = require('../miniprogram/utils/question-bank');
const { textbookOptions, getTextbookOptions } = require('../miniprogram/utils/textbook-catalog');
const { getQuestionBank } = require('../miniprogram/utils/question-bank');
const { getJuniorTopics } = require('../miniprogram/utils/junior-high-curriculum');
const {
  DIAGNOSTIC_SLOTS,
  ENTRY_DIAGNOSTIC_COUNT,
  selectDiagnosticSet,
  prepareDiagnosticAttempt,
} = require('../miniprogram/utils/diagnostic');

test('diagnostic bank covers all eight assessment slots with equivalent variants', () => {
  DIAGNOSTIC_SLOTS.forEach((slot) => {
    const variants = diagnosticQuestions.filter((item) => item.diagnosticSlot === slot);
    assert.ok(variants.length >= 4, `${slot} needs four variants`);
    assert.ok(variants.filter((item) => item.difficulty === 1).length >= 2);
    assert.ok(variants.some((item) => item.difficulty === 2));
    assert.ok(variants.some((item) => item.difficulty === 3));
  });
});

test('one diagnostic attempt selects one question for every slot', () => {
  const set = selectDiagnosticSet(diagnosticQuestions, {
    learnerId: 'learner-a', attempt: 1, difficultyMode: 'medium', grade: 4,
  });
  assert.equal(set.length, ENTRY_DIAGNOSTIC_COUNT);
  assert.ok(set.every((item) => item.entryDiagnostic === true));
  assert.equal(new Set(set.map((item) => item.id)).size, ENTRY_DIAGNOSTIC_COUNT);
  assert.equal(new Set(set.map((item) => item.knowledgePoint)).size, ENTRY_DIAGNOSTIC_COUNT);
  assert.deepEqual([...new Set(set.map((item) => item.type))].sort(), ['choice', 'fill', 'problem']);
  assert.deepEqual([...new Set(set.map((item) => item.ability))].sort(), ['calculation', 'data', 'geometry', 'pattern', 'problem']);
});

test('an attempt is stable but a completed next attempt rotates variants', () => {
  const context = { learnerId: 'learner-a', difficultyMode: 'medium', grade: 4 };
  const first = selectDiagnosticSet(diagnosticQuestions, { ...context, attempt: 1 });
  const repeat = selectDiagnosticSet(diagnosticQuestions, { ...context, attempt: 1 });
  const second = selectDiagnosticSet(diagnosticQuestions, { ...context, attempt: 2 });

  assert.deepEqual(first.map((item) => item.id), repeat.map((item) => item.id));
  assert.notDeepEqual(first.map((item) => item.id), second.map((item) => item.id));
});

test('difficulty mode controls diagnostic variant eligibility', () => {
  const base = { learnerId: 'learner-a', attempt: 1, grade: 4 };
  const easy = selectDiagnosticSet(diagnosticQuestions, { ...base, difficultyMode: 'easy' });
  const hard = selectDiagnosticSet(diagnosticQuestions, { ...base, difficultyMode: 'hard' });

  assert.ok(easy.every((item) => item.difficulty === 1));
  assert.ok(hard.every((item) => item.difficulty >= 2));
});

test('unfinished diagnostic preserves its IDs and completed diagnostic starts a new attempt', () => {
  const currentSet = selectDiagnosticSet(diagnosticQuestions, {
    learnerId: 'learner-a', attempt: 2, difficultyMode: 'medium', grade: 4,
  });
  const unfinished = prepareDiagnosticAttempt(diagnosticQuestions, {
    learnerId: 'learner-a', diagnosticAttempt: 2, diagnosticInProgress: true,
    diagnosticQuestionIds: currentSet.map((item) => item.id),
    diagnosticResponses: [{ questionId: currentSet[0].id, correct: true }],
    diagnosticCurrentIndex: 1, difficultyMode: 'medium', grade: 4,
  });
  assert.equal(unfinished.isNew, false);
  assert.equal(unfinished.attempt, 2);
  assert.equal(unfinished.currentIndex, 1);

  const next = prepareDiagnosticAttempt(diagnosticQuestions, {
    learnerId: 'learner-a', diagnosticAttempt: 2, diagnosticInProgress: false,
    difficultyMode: 'medium', grade: 4,
  });
  assert.equal(next.isNew, true);
  assert.equal(next.attempt, 3);
  assert.equal(next.questionIds.length, ENTRY_DIAGNOSTIC_COUNT);
  assert.deepEqual(next.responses, []);
});

test('every textbook grade and difficulty produces five lightweight diagnostic questions', () => {
  const difficultyModes = ['easy', 'medium', 'hard'];
  textbookOptions.forEach((textbook) => {
    for (let grade = 1; grade <= 6; grade += 1) {
      difficultyModes.forEach((difficultyMode) => {
        const set = selectDiagnosticSet(diagnosticQuestions, {
          learnerId: 'coverage-audit', attempt: 1, textbookId: textbook.value, grade, difficultyMode,
        });
        const label = `${textbook.value} grade ${grade} ${difficultyMode}`;
        assert.equal(set.length, ENTRY_DIAGNOSTIC_COUNT, `${label} should contain five questions`);
        assert.equal(new Set(set.map((item) => item.id)).size, ENTRY_DIAGNOSTIC_COUNT, `${label} should not repeat IDs`);
        assert.equal(new Set(set.map((item) => item.knowledgePoint)).size, ENTRY_DIAGNOSTIC_COUNT, `${label} should cover five topics`);
        assert.equal(new Set(set.map((item) => item.ability)).size, 5, `${label} should cover five abilities`);
        assert.ok(set.every((item) => item.entryDiagnostic), `${label} should use concise entry questions`);
        assert.deepEqual([...new Set(set.map((item) => item.type))].sort(), ['choice', 'fill', 'problem']);
      });
    }
  });
});

test('diagnostic selection and resume reject a mismatched school stage', () => {
  const scopedBank = ['calculation', 'data', 'geometry', 'pattern', 'problem'].flatMap((ability, index) => [
    {
      id: `primary-${index}`, schoolStage: 'primary', textbookId: 'rjb', grade: 7,
      entryDiagnostic: true, entryOrder: index, entrySlot: `slot-${index}`,
      difficulty: 2, curriculumFamily: 'scope', ability,
    },
    {
      id: `junior-${index}`, schoolStage: 'junior', textbookId: 'jr-rjb', grade: 7,
      entryDiagnostic: true, entryOrder: index, entrySlot: `slot-${index}`,
      difficulty: 2, curriculumFamily: 'scope', ability,
    },
  ]);
  const context = {
    learnerId: 'diagnostic-scope', schoolStage: 'junior', textbookId: 'jr-rjb', grade: 7,
    attempt: 1, difficultyMode: 'medium',
  };
  const selected = selectDiagnosticSet(scopedBank, context);
  const resumed = prepareDiagnosticAttempt(scopedBank, {
    ...context,
    diagnosticAttempt: 1,
    diagnosticInProgress: true,
    diagnosticQuestionIds: scopedBank.filter((item) => item.schoolStage === 'primary').map((item) => item.id),
    diagnosticResponses: [],
    diagnosticCurrentIndex: 0,
  });

  assert.equal(selected.length, ENTRY_DIAGNOSTIC_COUNT);
  assert.ok(selected.every((item) => item.schoolStage === 'junior'));
  assert.equal(resumed.isNew, true);
  assert.ok(resumed.questions.every((item) => item.schoolStage === 'junior'));
});

test('every junior scope prepares five resumable and rotating diagnostics at each difficulty', () => {
  getTextbookOptions('junior').forEach((textbook) => [7, 8, 9].forEach((grade) => {
    const scope = { schoolStage: 'junior', textbookId: textbook.value, grade };
    const scopedBank = getQuestionBank(scope);
    const bank = scopedBank.diagnosticQuestions;
    ['easy', 'medium', 'hard'].forEach((difficultyMode) => {
      const progress = {
        ...scope,
        learnerId: 'junior-diagnostic-audit',
        difficultyMode,
        diagnosticAttempt: 0,
        diagnosticInProgress: false,
      };
      const first = prepareDiagnosticAttempt(bank, progress);
      const label = `${textbook.value} g${grade} ${difficultyMode}`;
      assert.equal(first.questions.length, ENTRY_DIAGNOSTIC_COUNT, label);
      assert.equal(new Set(first.questions.map((item) => item.entrySlot)).size, ENTRY_DIAGNOSTIC_COUNT, `${label} slots`);
      const supportedAbilityCount = new Set(getJuniorTopics(textbook.value, grade)
        .map((topic) => scopedBank.practiceQuestions.find((item) => item.knowledgePoint === topic.key).ability)).size;
      assert.equal(
        new Set(first.questions.map((item) => item.ability)).size,
        Math.min(ENTRY_DIAGNOSTIC_COUNT, supportedAbilityCount),
        `${label} abilities`,
      );
      assert.ok(first.questions.every((item) => item.difficulty === difficultyMode), `${label} difficulty`);

      const resumed = prepareDiagnosticAttempt(bank, {
        ...progress,
        diagnosticAttempt: first.attempt,
        diagnosticInProgress: true,
        diagnosticQuestionIds: first.questionIds,
        diagnosticResponses: [{ questionId: first.questionIds[0], correct: true }],
        diagnosticCurrentIndex: 1,
      });
      assert.equal(resumed.isNew, false, `${label} resume`);
      assert.deepEqual(resumed.questionIds, first.questionIds, `${label} resume ids`);

      const next = prepareDiagnosticAttempt(bank, {
        ...progress,
        diagnosticAttempt: first.attempt,
        diagnosticInProgress: false,
      });
      assert.notDeepEqual(next.questionIds, first.questionIds, `${label} rotates`);
    });
  }));
});

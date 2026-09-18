const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createProgressStore,
  defaultProgress,
  GRADE_CONFIRMATION_VERSION,
} = require('../miniprogram/utils/storage');
const {
  DEFAULT_LEARNING_SETTINGS,
  normalizeLearningSettings,
  gradeOptions,
} = require('../miniprogram/utils/learning-settings');

function memoryAdapter(initialValue) {
  let value = initialValue;
  return {
    get() { return value; },
    set(next) { value = next; },
    inspect() { return value; },
  };
}

test('missing or corrupt data falls back to a fresh progress record', () => {
  const missing = createProgressStore(memoryAdapter(undefined));
  const corrupt = createProgressStore(memoryAdapter('bad data'));
  assert.deepEqual(missing.load(), defaultProgress());
  assert.deepEqual(corrupt.load(), defaultProgress());
});

test('saving imported progress normalizes corrupt collection fields before the pages read them', () => {
  const store = createProgressStore(memoryAdapter(undefined));
  const progress = store.save({
    ...defaultProgress(),
    mistakes: 'bad',
    completedIds: ['ok', 4],
    dailyQuestionIds: { bad: true },
    stars: 'nine',
    dailyCompleted: -2,
    level: 99,
    abilities: { calculation: 140, problem: 'bad' },
    weakAbilities: ['calculation', 'unknown'],
    weakKnowledgePoints: ['valid', 3],
  });
  assert.deepEqual(progress.mistakes, []);
  assert.deepEqual(progress.completedIds, ['ok']);
  assert.deepEqual(progress.dailyQuestionIds, []);
  assert.equal(progress.stars, 0);
  assert.equal(progress.dailyCompleted, 0);
  assert.equal(progress.level, 4);
  assert.equal(progress.abilities.calculation, 100);
  assert.equal(progress.abilities.problem, 70);
  assert.deepEqual(progress.weakAbilities, ['calculation']);
  assert.deepEqual(progress.weakKnowledgePoints, ['valid']);
});

test('saving progress preserves a completed diagnostic profile', () => {
  const adapter = memoryAdapter(undefined);
  const store = createProgressStore(adapter);
  const progress = store.save({ ...defaultProgress(), diagnosticComplete: true, stars: 4 });
  assert.equal(progress.diagnosticComplete, true);
  assert.equal(adapter.inspect().stars, 4);
});

test('adding the same mistake updates it instead of duplicating it', () => {
  const adapter = memoryAdapter(undefined);
  const store = createProgressStore(adapter);
  const mistake = { id: 'mistake-q1', questionId: 'q1', studentAnswer: '12' };
  store.addMistake(mistake);
  store.addMistake({ ...mistake, studentAnswer: '14' });
  const progress = store.load();
  assert.equal(progress.mistakes.length, 1);
  assert.equal(progress.mistakes[0].studentAnswer, '14');
});

test('progress assigns and preserves a local learner ID', () => {
  const adapter = memoryAdapter(undefined);
  const store = createProgressStore(adapter, () => 'learner-test');
  const first = store.ensureLearner(store.load());
  const second = store.ensureLearner(store.load());

  assert.equal(first.learnerId, 'learner-test');
  assert.equal(second.learnerId, 'learner-test');
});

test('learning settings default to medium, three questions, and RJB grade four', () => {
  const progress = defaultProgress();
  assert.equal(progress.difficultyMode, DEFAULT_LEARNING_SETTINGS.difficultyMode);
  assert.equal(progress.dailyGoal, DEFAULT_LEARNING_SETTINGS.dailyGoal);
  assert.equal(progress.textbookId, 'rjb');
  assert.equal(progress.grade, 4);
});

test('a new learner confirms a first grade while keeping the default RJB textbook', () => {
  const store = createProgressStore(memoryAdapter(undefined));
  const fresh = store.load();

  assert.equal(fresh.initialGradeConfirmed, false);
  const confirmed = store.confirmInitialGrade(fresh, 2);

  assert.equal(confirmed.initialGradeConfirmed, true);
  assert.equal(confirmed.gradeConfirmationVersion, GRADE_CONFIRMATION_VERSION);
  assert.equal(confirmed.grade, 2);
  assert.equal(confirmed.textbookId, 'rjb');
  assert.equal(confirmed.diagnosticComplete, false);
});

test('every existing learner must confirm grade once and keeps completed learning history', () => {
  const legacy = {
    ...defaultProgress(),
    grade: 5,
    initialGradeConfirmed: true,
    diagnosticComplete: true,
    diagnosticQuestionIds: ['legacy-question'],
    diagnosticResponses: [{ questionId: 'legacy-question', correct: true }],
    dailyQuestionIds: ['legacy-daily-question'],
    dailySetDate: '2026-08-05',
    selfPracticeQuestionIds: ['legacy-self-question'],
    completedIds: ['finished-question'],
    servedQuestionIds: ['served-question'],
    completionDates: ['2026-08-01', '2026-08-02'],
    dailyCompleted: 8,
    streakDays: 3,
    mistakes: [{ id: 'old-mistake', questionId: 'old-question' }],
    stars: 9,
  };
  delete legacy.gradeConfirmationVersion;
  const store = createProgressStore(memoryAdapter(legacy));
  const migrated = store.load();

  assert.equal(migrated.initialGradeConfirmed, false);
  assert.equal(migrated.grade, 5);
  const confirmed = store.confirmInitialGrade(migrated, 6);

  assert.equal(confirmed.initialGradeConfirmed, true);
  assert.equal(confirmed.gradeConfirmationVersion, GRADE_CONFIRMATION_VERSION);
  assert.equal(confirmed.grade, 6);
  assert.equal(confirmed.stars, 9);
  assert.equal(confirmed.dailyCompleted, 8);
  assert.equal(confirmed.streakDays, 3);
  assert.deepEqual(confirmed.completedIds, ['finished-question']);
  assert.deepEqual(confirmed.servedQuestionIds, ['served-question']);
  assert.deepEqual(confirmed.completionDates, ['2026-08-01', '2026-08-02']);
  assert.deepEqual(confirmed.mistakes, [{ id: 'old-mistake', questionId: 'old-question' }]);
  assert.equal(confirmed.diagnosticComplete, false);
  assert.deepEqual(confirmed.diagnosticQuestionIds, []);
  assert.deepEqual(confirmed.dailyQuestionIds, []);
  assert.deepEqual(confirmed.selfPracticeQuestionIds, []);
});

test('learning settings normalize unsupported values safely', () => {
  assert.deepEqual(normalizeLearningSettings({
    difficultyMode: 'extreme',
    dailyGoal: 99,
    textbookId: 'unknown',
    grade: 6,
  }), { ...DEFAULT_LEARNING_SETTINGS, grade: 6 });
  assert.equal(gradeOptions.find((item) => item.value === 4).available, true);
  assert.equal(gradeOptions.find((item) => item.value === 6).available, true);
});

test('diagnostic attempt state defaults to an idle first attempt', () => {
  const progress = defaultProgress();
  assert.equal(progress.diagnosticAttempt, 0);
  assert.equal(progress.diagnosticInProgress, false);
  assert.equal(progress.diagnosticCurrentIndex, 0);
  assert.deepEqual(progress.diagnosticQuestionIds, []);
});

test('game progress defaults and corrupt nested values are normalized', () => {
  const empty = defaultProgress();
  assert.equal(empty.gameProgress.byType.puzzle.completions, 0);

  const stored = {
    ...empty,
    gameProgress: { byType: { puzzle: { completions: 'bad' } } },
  };
  const progress = createProgressStore(memoryAdapter(stored)).load();
  assert.equal(progress.gameProgress.byType.puzzle.completions, 0);
  assert.deepEqual(progress.gameProgress.byType.pattern.recentSignatures, []);
});

test('sound and local reminder settings persist and reject corrupt values', () => {
  const adapter = memoryAdapter(undefined);
  const store = createProgressStore(adapter);
  store.save({ ...store.load(), soundEnabled: false, reminderEnabled: false });
  assert.equal(store.load().soundEnabled, false);
  assert.equal(store.load().reminderEnabled, false);
  assert.equal(store.load().bgmEnabled, false);

  const corrupt = createProgressStore(memoryAdapter({
    ...defaultProgress(),
    soundEnabled: 'yes',
    bgmEnabled: 'yes',
    reminderEnabled: 1,
  })).load();
  assert.equal(corrupt.soundEnabled, true);
  assert.equal(corrupt.bgmEnabled, false);
  assert.equal(corrupt.reminderEnabled, true);
});

test('background track selection persists and normalizes invalid values', () => {
  const adapter = memoryAdapter(undefined);
  const store = createProgressStore(adapter);
  store.save({ ...store.load(), bgmTrackIndex: 9 });
  assert.equal(store.load().bgmTrackIndex, 9);
  assert.equal(createProgressStore(memoryAdapter({ ...defaultProgress(), bgmTrackIndex: 99 })).load().bgmTrackIndex, 0);
});

test('daily-set nonce is persisted as a non-negative integer', () => {
  const adapter = memoryAdapter(undefined);
  const store = createProgressStore(adapter);
  assert.equal(defaultProgress().dailySetNonce, 0);
  store.save({ ...store.load(), dailySetNonce: 7 });
  assert.equal(store.load().dailySetNonce, 7);
  assert.equal(createProgressStore(memoryAdapter({ ...defaultProgress(), dailySetNonce: -1 })).load().dailySetNonce, 0);
});

test('completion dates default safely and survive progress normalization', () => {
  assert.deepEqual(defaultProgress().completionDates, []);
  const stored = createProgressStore(memoryAdapter({
    ...defaultProgress(), completionDates: ['2026-07-19', '2026-07-20'],
  })).load();
  assert.deepEqual(stored.completionDates, ['2026-07-19', '2026-07-20']);
  const corrupt = createProgressStore(memoryAdapter({ ...defaultProgress(), completionDates: 'bad' })).load();
  assert.deepEqual(corrupt.completionDates, []);
});

test('changing textbook or grade preserves a completed diagnostic and learning history', () => {
  const adapter = memoryAdapter(undefined);
  const store = createProgressStore(adapter);
  const learned = {
    ...defaultProgress(),
    diagnosticComplete: true,
    diagnosticAttempt: 3,
    diagnosticResponses: [{ questionId: 'old', correct: false }],
    weakAbilities: ['calculation'],
    weakKnowledgePoints: ['old_topic'],
    skillState: { old_topic: { level: 2 } },
    knowledgeState: { old_topic: { mastery: 25, reviewStage: 2, nextReviewDate: '2026-08-03' } },
    dailyQuestionIds: ['old-question'],
  };

  const newTextbook = store.changeTextbook(learned, 'qd');
  assert.equal(newTextbook.textbookId, 'qd');
  assert.equal(newTextbook.diagnosticComplete, true);
  assert.deepEqual(newTextbook.weakKnowledgePoints, ['old_topic']);
  assert.deepEqual(newTextbook.skillState, { old_topic: { level: 2 } });
  assert.deepEqual(newTextbook.knowledgeState, {
    old_topic: { mastery: 25, reviewStage: 2, nextReviewDate: '2026-08-03', lastPracticedDate: '' },
  });
  assert.deepEqual(newTextbook.diagnosticResponses, [{ questionId: 'old', correct: false }]);
  assert.deepEqual(newTextbook.dailyQuestionIds, []);

  const newGrade = store.changeGrade({ ...learned, textbookId: 'rjb' }, 6);
  assert.equal(newGrade.grade, 6);
  assert.equal(newGrade.diagnosticComplete, true);
  assert.deepEqual(newGrade.weakAbilities, ['calculation']);
  assert.deepEqual(newGrade.knowledgeState, {
    old_topic: { mastery: 25, reviewStage: 2, nextReviewDate: '2026-08-03', lastPracticedDate: '' },
  });
  assert.deepEqual(newGrade.dailyQuestionIds, []);
});

test('learning journey state defaults and repairs invalid local values', () => {
  const empty = defaultProgress();
  assert.equal(empty.dailyMissionMode, '');
  assert.equal(empty.recoveryState, null);
  assert.deepEqual(empty.gameJourneyCounts, {
    calculation: 0,
    problem: 0,
    geometry: 0,
    pattern: 0,
  });

  const progress = createProgressStore(memoryAdapter({
    ...empty,
    dailyMissionMode: 'not-a-mode',
    recoveryState: { originalQuestionId: 'q-1', stage: 'unknown' },
    gameJourneyCounts: { calculation: -2, pattern: 3.8, unrelated: 99 },
  })).load();

  assert.equal(progress.dailyMissionMode, '');
  assert.equal(progress.recoveryState, null);
  assert.deepEqual(progress.gameJourneyCounts, {
    calculation: 0,
    problem: 0,
    geometry: 0,
    pattern: 4,
  });
});

test('changing textbook or grade clears active mission and recovery state', () => {
  const store = createProgressStore(memoryAdapter(undefined));
  const active = {
    ...defaultProgress(),
    dailyMissionMode: 'challenge',
    dailyQuestionIds: ['practice-1'],
    recoveryState: {
      originalQuestionId: 'practice-1',
      bridgeQuestionId: 'practice-2',
      remixQuestionId: 'practice-3',
      stage: 'explain',
      source: 'daily',
      nextIndex: 1,
      contentBankVersion: '2026.08.04.1',
    },
  };

  const switched = store.changeTextbook(active, 'qd');
  assert.equal(switched.dailyMissionMode, '');
  assert.deepEqual(switched.dailyQuestionIds, []);
  assert.equal(switched.recoveryState, null);
});

test('changing school stage preserves the completed diagnostic while clearing active scoped work', () => {
  const store = createProgressStore(memoryAdapter(undefined));
  const active = {
    ...defaultProgress(),
    grade: 6,
    diagnosticComplete: true,
    diagnosticQuestionIds: ['diagnostic-1'],
    dailyQuestionIds: ['daily-1'],
    selfPracticeQuestionIds: ['self-1'],
    completedIds: ['completed-1'],
    mistakes: [{ id: 'mistake-1', questionId: 'question-1' }],
    stars: 11,
    streakDays: 4,
    learnerId: 'learner-1',
  };

  const switched = store.changeSchoolStage(active, 'junior');

  assert.equal(switched.schoolStage, 'junior');
  assert.equal(switched.grade, 7);
  assert.equal(switched.diagnosticComplete, true);
  assert.deepEqual(switched.diagnosticQuestionIds, ['diagnostic-1']);
  assert.deepEqual(switched.dailyQuestionIds, []);
  assert.deepEqual(switched.selfPracticeQuestionIds, []);
  assert.deepEqual(switched.completedIds, ['completed-1']);
  assert.deepEqual(switched.mistakes, [{ id: 'mistake-1', questionId: 'question-1' }]);
  assert.equal(switched.stars, 11);
  assert.equal(switched.streakDays, 4);
  assert.equal(switched.learnerId, 'learner-1');
});

test('invalid or unchanged grade and stage settings retain the active learning profile', () => {
  const store = createProgressStore(memoryAdapter(undefined));
  const active = {
    ...defaultProgress(),
    diagnosticComplete: true,
    diagnosticQuestionIds: ['diagnostic-1'],
    dailyQuestionIds: ['daily-1'],
    selfPracticeQuestionIds: ['self-1'],
  };

  [
    store.changeGrade(active, 7),
    store.changeGrade(active, 4),
    store.changeSchoolStage(active, 'secondary'),
    store.changeSchoolStage(active, 'primary'),
  ].forEach((result) => {
    assert.equal(result.schoolStage, 'primary');
    assert.equal(result.grade, 4);
    assert.equal(result.diagnosticComplete, true);
    assert.deepEqual(result.diagnosticQuestionIds, ['diagnostic-1']);
    assert.deepEqual(result.dailyQuestionIds, ['daily-1']);
    assert.deepEqual(result.selfPracticeQuestionIds, ['self-1']);
  });
});

test('initial learning-level confirmation records a stage and keeps legacy history', () => {
  const store = createProgressStore(memoryAdapter(undefined));
  const legacy = {
    ...defaultProgress(),
    diagnosticComplete: true,
    completedIds: ['completed-1'],
    mistakes: [{ id: 'mistake-1', questionId: 'question-1' }],
    stars: 5,
    learnerId: 'learner-1',
  };
  delete legacy.schoolStage;

  const confirmed = store.confirmInitialLearningLevel(legacy, 'junior', 8);

  assert.equal(confirmed.initialGradeConfirmed, true);
  assert.equal(confirmed.gradeConfirmationVersion, GRADE_CONFIRMATION_VERSION);
  assert.equal(confirmed.schoolStage, 'junior');
  assert.equal(confirmed.grade, 8);
  assert.equal(confirmed.diagnosticComplete, false);
  assert.deepEqual(confirmed.completedIds, ['completed-1']);
  assert.deepEqual(confirmed.mistakes, [{ id: 'mistake-1', questionId: 'question-1' }]);
  assert.equal(confirmed.stars, 5);
  assert.equal(confirmed.learnerId, 'learner-1');
});

test('confirming the current learning level preserves the active learning state', () => {
  const store = createProgressStore(memoryAdapter(undefined));
  const active = {
    ...defaultProgress(),
    schoolStage: 'primary',
    grade: 4,
    diagnosticComplete: true,
    diagnosticResponses: [{ questionId: 'diagnostic-1', correct: true }],
    diagnosticAttempt: 2,
    diagnosticInProgress: true,
    diagnosticCurrentIndex: 3,
    diagnosticQuestionIds: ['diagnostic-1', 'diagnostic-2'],
    abilities: { calculation: 82, problem: 61, geometry: 75, pattern: 68 },
    weakAbilities: ['problem'],
    weakKnowledgePoints: ['average'],
    level: 4,
    skillState: { average: { level: 2 } },
    knowledgeState: {
      average: {
        mastery: 45,
        reviewStage: 1,
        nextReviewDate: '2026-08-12',
        lastPracticedDate: '',
      },
    },
    dailySetDate: '2026-08-11',
    dailyQuestionIds: ['daily-1', 'daily-2'],
    dailySetNonce: 5,
    dailyMissionMode: 'challenge',
    recoveryState: {
      originalQuestionId: 'daily-1',
      bridgeQuestionId: 'daily-2',
      remixQuestionId: 'daily-3',
      stage: 'bridge',
      source: 'daily',
      nextIndex: 1,
      contentBankVersion: '2026.08.10.1',
    },
    selfPracticeQuestionIds: ['self-1'],
    selfPracticeIndex: 1,
    selfPracticeMode: 'review',
    selfPracticeFilters: { type: 'choice' },
    contentBankVersion: '2026.08.10.1',
  };

  const confirmed = store.confirmInitialLearningLevel(active, 'primary', 4);

  assert.equal(confirmed.initialGradeConfirmed, true);
  assert.equal(confirmed.gradeConfirmationVersion, GRADE_CONFIRMATION_VERSION);
  assert.equal(confirmed.diagnosticComplete, true);
  assert.deepEqual(confirmed.diagnosticResponses, active.diagnosticResponses);
  assert.equal(confirmed.diagnosticAttempt, 2);
  assert.equal(confirmed.diagnosticInProgress, true);
  assert.equal(confirmed.diagnosticCurrentIndex, 3);
  assert.deepEqual(confirmed.diagnosticQuestionIds, active.diagnosticQuestionIds);
  assert.deepEqual(confirmed.abilities, active.abilities);
  assert.deepEqual(confirmed.weakAbilities, active.weakAbilities);
  assert.deepEqual(confirmed.weakKnowledgePoints, active.weakKnowledgePoints);
  assert.equal(confirmed.level, 4);
  assert.deepEqual(confirmed.skillState, active.skillState);
  assert.deepEqual(confirmed.knowledgeState, active.knowledgeState);
  assert.equal(confirmed.dailySetDate, active.dailySetDate);
  assert.deepEqual(confirmed.dailyQuestionIds, active.dailyQuestionIds);
  assert.equal(confirmed.dailySetNonce, 5);
  assert.equal(confirmed.dailyMissionMode, 'challenge');
  assert.deepEqual(confirmed.recoveryState, active.recoveryState);
  assert.deepEqual(confirmed.selfPracticeQuestionIds, active.selfPracticeQuestionIds);
  assert.equal(confirmed.selfPracticeIndex, 1);
  assert.equal(confirmed.selfPracticeMode, 'review');
  assert.deepEqual(confirmed.selfPracticeFilters, active.selfPracticeFilters);
  assert.equal(confirmed.contentBankVersion, '2026.08.10.1');
});

test('retention fields normalize safely and preserve a dismissed content release', () => {
  const empty = defaultProgress();
  assert.equal(empty.recoveryWins, 0);
  assert.equal(empty.seenContentVersion, '');

  const adapter = memoryAdapter({
    ...empty,
    recoveryWins: -4,
    seenContentVersion: 20260805,
  });
  const store = createProgressStore(adapter);
  const repaired = store.load();
  assert.equal(repaired.recoveryWins, 0);
  assert.equal(repaired.seenContentVersion, '');

  store.save({ ...repaired, recoveryWins: 3.6, seenContentVersion: '2026.08.05.1', difficultyMode: 'hard' });
  const saved = store.load();
  assert.equal(saved.recoveryWins, 4);
  assert.equal(saved.seenContentVersion, '2026.08.05.1');
  assert.equal(saved.difficultyMode, 'hard');
});

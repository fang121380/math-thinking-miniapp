const STORAGE_KEY = 'mathThinkingProgressV1';
const GRADE_CONFIRMATION_VERSION = 3;
const {
  DEFAULT_LEARNING_SETTINGS,
  getGradeOptions,
  normalizeLearningSettings,
  schoolStageOptions,
} = require('./learning-settings');
const { createDefaultGameProgress, normalizeGameProgress } = require('./game-progress');
const { questionContentSignature, normalizeContentSignatures } = require('./question-content-signature');

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function normalizeKnowledgeState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value).reduce((result, [knowledgePoint, record]) => {
    if (!knowledgePoint || !record || typeof record !== 'object' || Array.isArray(record)) return result;
    const mastery = Number(record.mastery);
    const reviewStage = Number(record.reviewStage);
    result[knowledgePoint] = {
      mastery: Number.isFinite(mastery) ? Math.max(0, Math.min(100, Math.round(mastery))) : 50,
      reviewStage: Number.isFinite(reviewStage) ? Math.max(0, Math.min(4, Math.round(reviewStage))) : 0,
      nextReviewDate: isDateKey(record.nextReviewDate) ? record.nextReviewDate : '',
      lastPracticedDate: isDateKey(record.lastPracticedDate) ? record.lastPracticedDate : '',
    };
    return result;
  }, {});
}

const journeyAbilityKeys = ['calculation', 'problem', 'geometry', 'pattern'];
const abilityKeys = [...journeyAbilityKeys, 'data'];

function normalizeNonNegativeInteger(value, fallback = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const candidate = Number(value);
  return Number.isInteger(candidate) && candidate >= 0
    ? Math.min(candidate, maximum)
    : fallback;
}

function normalizeAbilities(value) {
  const source = isProgress(value) ? value : {};
  const defaults = defaultProgress().abilities;
  const keys = source.data === undefined ? journeyAbilityKeys : abilityKeys;
  return keys.reduce((result, key) => {
    const candidate = Number(source[key]);
    result[key] = Number.isFinite(candidate)
      ? Math.max(0, Math.min(100, Math.round(candidate)))
      : (defaults[key] ?? 0);
    return result;
  }, {});
}

function normalizeWeakAbilities(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => abilityKeys.includes(item)))];
}

function normalizeDailyMissionMode(value) {
  return value === 'review' || value === 'challenge' ? value : '';
}

function normalizeRecoveryState(value) {
  const stages = ['explain', 'bridge', 'remix'];
  if (!value || typeof value !== 'object' || Array.isArray(value) || !stages.includes(value.stage)) {
    return null;
  }
  const requiredIds = [value.originalQuestionId, value.bridgeQuestionId, value.remixQuestionId];
  if (!requiredIds.every((id) => typeof id === 'string' && id)) return null;
  return {
    originalQuestionId: value.originalQuestionId,
    bridgeQuestionId: value.bridgeQuestionId,
    remixQuestionId: value.remixQuestionId,
    stage: value.stage,
    source: value.source === 'self' ? 'self' : 'daily',
    nextIndex: Math.max(0, Math.floor(Number(value.nextIndex) || 0)),
    contentBankVersion: typeof value.contentBankVersion === 'string' ? value.contentBankVersion : '',
  };
}

function normalizeGameJourneyCounts(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return journeyAbilityKeys.reduce((result, key) => {
    const count = Number(source[key]);
    result[key] = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
    return result;
  }, {});
}

function normalizeGradeConfirmationVersion(value) {
  return Number(value) === GRADE_CONFIRMATION_VERSION ? GRADE_CONFIRMATION_VERSION : 0;
}

function normalizeInitialGradeConfirmed(value, confirmationVersion) {
  return value === true && confirmationVersion === GRADE_CONFIRMATION_VERSION;
}

function normalizeRecoveryWins(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
}

function normalizeSeenContentVersion(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._-]{1,48}$/.test(value) ? value : '';
}

function defaultProgress() {
  return {
    diagnosticComplete: false,
    diagnosticResponses: [],
    diagnosticAttempt: 0,
    diagnosticInProgress: false,
    diagnosticCurrentIndex: 0,
    diagnosticQuestionIds: [],
    abilities: {
      calculation: 70,
      problem: 70,
      geometry: 70,
      pattern: 70,
    },
    weakAbilities: [],
    weakKnowledgePoints: [],
    level: 1,
    completedIds: [],
    servedQuestionIds: [],
    servedQuestionSignatures: [],
    dailyCompleted: 0,
    streakDays: 0,
    completionDates: [],
    stars: 0,
    mistakes: [],
    skillState: {},
    knowledgeState: {},
    learnerId: '',
    dailySetDate: '',
    dailyQuestionIds: [],
    dailySetNonce: 0,
    dailyMissionMode: '',
    recoveryState: null,
    selfPracticeQuestionIds: [],
    selfPracticeIndex: 0,
    selfPracticeMode: 'new',
    selfPracticeFilters: {},
    contentBankVersion: '',
    lastReminderDate: '',
    gameProgress: createDefaultGameProgress(),
    gameJourneyCounts: normalizeGameJourneyCounts(),
    recoveryWins: 0,
    seenContentVersion: '',
    gradeConfirmationVersion: 0,
    initialGradeConfirmed: false,
    ...DEFAULT_LEARNING_SETTINGS,
  };
}

function isProgress(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStringList(value, limit = 500) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string' && item).slice(-limit);
}

function wxAdapter() {
  return {
    get() {
      return wx.getStorageSync(STORAGE_KEY);
    },
    set(value) {
      wx.setStorageSync(STORAGE_KEY, value);
    },
  };
}

function createProgressStore(adapter = wxAdapter(), createLearnerId = () => `learner-${Date.now()}-${Math.random().toString(16).slice(2)}`) {
  function load() {
    const stored = adapter.get();
    if (!isProgress(stored)) return defaultProgress();
    const learningSettings = normalizeLearningSettings(stored);
    const gradeConfirmationVersion = normalizeGradeConfirmationVersion(stored.gradeConfirmationVersion);
    return {
      ...defaultProgress(),
      ...stored,
      ...learningSettings,
      abilities: normalizeAbilities(stored.abilities),
      weakAbilities: normalizeWeakAbilities(stored.weakAbilities),
      weakKnowledgePoints: normalizeStringList(stored.weakKnowledgePoints, 8),
      skillState: isProgress(stored.skillState) ? stored.skillState : {},
      mistakes: Array.isArray(stored.mistakes) ? stored.mistakes.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) : [],
      completedIds: normalizeStringList(stored.completedIds, 10000),
      servedQuestionIds: normalizeStringList(stored.servedQuestionIds),
      servedQuestionSignatures: normalizeContentSignatures(stored.servedQuestionSignatures),
      dailyQuestionIds: normalizeStringList(stored.dailyQuestionIds),
      completionDates: Array.isArray(stored.completionDates)
        ? [...new Set(stored.completionDates.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)))].sort()
        : [],
      dailySetNonce: Number.isInteger(stored.dailySetNonce) && stored.dailySetNonce >= 0 ? stored.dailySetNonce : 0,
      dailyMissionMode: normalizeDailyMissionMode(stored.dailyMissionMode),
      recoveryState: normalizeRecoveryState(stored.recoveryState),
      selfPracticeQuestionIds: normalizeStringList(stored.selfPracticeQuestionIds),
      selfPracticeIndex: Number.isInteger(stored.selfPracticeIndex) ? stored.selfPracticeIndex : 0,
      selfPracticeMode: stored.selfPracticeMode === 'review' ? 'review' : 'new',
      selfPracticeFilters: isProgress(stored.selfPracticeFilters) ? stored.selfPracticeFilters : {},
      diagnosticQuestionIds: normalizeStringList(stored.diagnosticQuestionIds),
      diagnosticResponses: Array.isArray(stored.diagnosticResponses) ? stored.diagnosticResponses : [],
      diagnosticAttempt: normalizeNonNegativeInteger(stored.diagnosticAttempt),
      diagnosticCurrentIndex: normalizeNonNegativeInteger(stored.diagnosticCurrentIndex),
      level: normalizeNonNegativeInteger(stored.level, 1, 4) || 1,
      dailyCompleted: normalizeNonNegativeInteger(stored.dailyCompleted),
      streakDays: normalizeNonNegativeInteger(stored.streakDays),
      stars: normalizeNonNegativeInteger(stored.stars),
      knowledgeState: normalizeKnowledgeState(stored.knowledgeState),
      gameProgress: normalizeGameProgress(stored.gameProgress),
      gameJourneyCounts: normalizeGameJourneyCounts(stored.gameJourneyCounts),
      recoveryWins: normalizeRecoveryWins(stored.recoveryWins),
      seenContentVersion: normalizeSeenContentVersion(stored.seenContentVersion),
      lastReminderDate: typeof stored.lastReminderDate === 'string' ? stored.lastReminderDate : '',
      gradeConfirmationVersion,
      initialGradeConfirmed: normalizeInitialGradeConfirmed(stored.initialGradeConfirmed, gradeConfirmationVersion),
    };
  }

  function save(next) {
    const gradeConfirmationVersion = normalizeGradeConfirmationVersion(next.gradeConfirmationVersion);
    const normalized = {
      ...defaultProgress(),
      ...next,
      ...normalizeLearningSettings(next),
      abilities: normalizeAbilities(next.abilities),
      weakAbilities: normalizeWeakAbilities(next.weakAbilities),
      weakKnowledgePoints: normalizeStringList(next.weakKnowledgePoints, 8),
      skillState: isProgress(next.skillState) ? next.skillState : {},
      mistakes: Array.isArray(next.mistakes) ? next.mistakes.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) : [],
      completedIds: normalizeStringList(next.completedIds, 10000),
      servedQuestionIds: normalizeStringList(next.servedQuestionIds),
      dailyQuestionIds: normalizeStringList(next.dailyQuestionIds),
      selfPracticeQuestionIds: normalizeStringList(next.selfPracticeQuestionIds),
      diagnosticQuestionIds: normalizeStringList(next.diagnosticQuestionIds),
      diagnosticResponses: Array.isArray(next.diagnosticResponses) ? next.diagnosticResponses : [],
      diagnosticAttempt: normalizeNonNegativeInteger(next.diagnosticAttempt),
      diagnosticCurrentIndex: normalizeNonNegativeInteger(next.diagnosticCurrentIndex),
      level: normalizeNonNegativeInteger(next.level, 1, 4) || 1,
      dailyCompleted: normalizeNonNegativeInteger(next.dailyCompleted),
      streakDays: normalizeNonNegativeInteger(next.streakDays),
      stars: normalizeNonNegativeInteger(next.stars),
      dailySetNonce: Number.isInteger(next.dailySetNonce) && next.dailySetNonce >= 0 ? next.dailySetNonce : 0,
      servedQuestionSignatures: normalizeContentSignatures(next.servedQuestionSignatures),
      dailyMissionMode: normalizeDailyMissionMode(next.dailyMissionMode),
      recoveryState: normalizeRecoveryState(next.recoveryState),
      knowledgeState: normalizeKnowledgeState(next.knowledgeState),
      gameProgress: normalizeGameProgress(next.gameProgress),
      gameJourneyCounts: normalizeGameJourneyCounts(next.gameJourneyCounts),
      recoveryWins: normalizeRecoveryWins(next.recoveryWins),
      seenContentVersion: normalizeSeenContentVersion(next.seenContentVersion),
      gradeConfirmationVersion,
      initialGradeConfirmed: normalizeInitialGradeConfirmed(next.initialGradeConfirmed, gradeConfirmationVersion),
    };
    adapter.set(normalized);
    return normalized;
  }

  function addMistake(mistake) {
    const progress = load();
    const mistakes = progress.mistakes.filter((item) => item.id !== mistake.id);
    mistakes.unshift(mistake);
    return save({ ...progress, mistakes });
  }

  function rememberServedQuestions(progress, questionIds) {
    const existing = Array.isArray(progress.servedQuestionIds) ? progress.servedQuestionIds : [];
    const questions = Array.isArray(questionIds) ? questionIds : [];
    const nextIds = questions.map((item) => (typeof item === 'string' ? item : item && item.id))
      .filter((item) => typeof item === 'string' && item);
    const nextSignatures = questions
      .filter((item) => item && typeof item === 'object')
      .map((item) => questionContentSignature(item));
    return save({
      ...progress,
      servedQuestionIds: Array.from(new Set([...existing, ...nextIds])).slice(-500),
      servedQuestionSignatures: normalizeContentSignatures([
        ...(Array.isArray(progress.servedQuestionSignatures) ? progress.servedQuestionSignatures : []),
        ...nextSignatures,
      ]),
    });
  }

  function changeTextbook(progress, textbookId) {
    const settings = normalizeLearningSettings({ ...progress, textbookId });
    return switchLearningScope(progress, settings);
  }

  function changeGrade(progress, grade) {
    const currentSettings = normalizeLearningSettings(progress);
    const isValidGrade = getGradeOptions(currentSettings.schoolStage)
      .some((item) => item.value === Number(grade));
    if (!isValidGrade) return save({ ...progress, ...currentSettings });

    const settings = normalizeLearningSettings({ ...progress, ...currentSettings, grade });
    if (settings.schoolStage === currentSettings.schoolStage && settings.grade === currentSettings.grade) {
      return save({ ...progress, ...settings });
    }
    return switchLearningScope(progress, settings);
  }

  function changeSchoolStage(progress, schoolStage) {
    const currentSettings = normalizeLearningSettings(progress);
    const isValidSchoolStage = schoolStageOptions.some((item) => item.value === schoolStage);
    if (!isValidSchoolStage) return save({ ...progress, ...currentSettings });

    const settings = normalizeLearningSettings({ ...progress, schoolStage });
    if (settings.schoolStage === currentSettings.schoolStage && settings.grade === currentSettings.grade) {
      return save({ ...progress, ...settings });
    }
    return switchLearningScope(progress, settings);
  }

  function changeLearningTerm(progress, learningTerm) {
    const currentSettings = normalizeLearningSettings(progress);
    const settings = normalizeLearningSettings({ ...progress, ...currentSettings, learningTerm });
    if (settings.learningTerm === currentSettings.learningTerm) return save({ ...progress, ...settings });
    return save({
      ...progress,
      ...settings,
      dailyCompleted: 0,
      dailySetDate: '',
      dailyQuestionIds: [],
      dailySetNonce: 0,
      dailyMissionMode: '',
      recoveryState: null,
      selfPracticeQuestionIds: [],
      selfPracticeIndex: 0,
      selfPracticeMode: 'new',
      selfPracticeFilters: {},
    });
  }

  function confirmInitialLearningLevel(progress, schoolStage, grade) {
    const currentSettings = normalizeLearningSettings(progress);
    const settings = normalizeLearningSettings({ ...progress, schoolStage, grade });
    const scopeChanged = settings.schoolStage !== currentSettings.schoolStage
      || settings.grade !== currentSettings.grade;
    const nextProgress = scopeChanged
      ? resetLearningProfile(progress, settings)
      : { ...progress, ...settings };
    return save({
      ...nextProgress,
      gradeConfirmationVersion: GRADE_CONFIRMATION_VERSION,
      initialGradeConfirmed: true,
    });
  }

  function confirmInitialGrade(progress, grade) {
    const schoolStage = normalizeLearningSettings(progress).schoolStage;
    return confirmInitialLearningLevel(progress, schoolStage, grade);
  }

  function resetLearningProfile(progress, settings) {
    const fresh = defaultProgress();
    return save({
      ...progress,
      ...settings,
      diagnosticComplete: false,
      diagnosticResponses: [],
      diagnosticAttempt: 0,
      diagnosticInProgress: false,
      diagnosticCurrentIndex: 0,
      diagnosticQuestionIds: [],
      abilities: { ...fresh.abilities },
      weakAbilities: [],
      weakKnowledgePoints: [],
      level: 1,
      skillState: {},
      knowledgeState: {},
      dailySetDate: '',
      dailyQuestionIds: [],
      dailySetNonce: 0,
      dailyMissionMode: '',
      recoveryState: null,
      selfPracticeQuestionIds: [],
      selfPracticeIndex: 0,
      selfPracticeMode: 'new',
      selfPracticeFilters: {},
      contentBankVersion: '',
    });
  }

  // A learner has only one first-time diagnostic requirement. Changing the
  // current material selects a new question scope, so cancel scope-bound work
  // in progress but retain the learner's completed diagnostic and history.
  function switchLearningScope(progress, settings) {
    const wasDiagnosticInProgress = Boolean(progress.diagnosticInProgress);
    return save({
      ...progress,
      ...settings,
      diagnosticInProgress: false,
      diagnosticCurrentIndex: wasDiagnosticInProgress ? 0 : progress.diagnosticCurrentIndex,
      diagnosticQuestionIds: wasDiagnosticInProgress ? [] : progress.diagnosticQuestionIds,
      diagnosticResponses: wasDiagnosticInProgress ? [] : progress.diagnosticResponses,
      dailySetDate: '',
      dailyQuestionIds: [],
      dailySetNonce: 0,
      dailyMissionMode: '',
      recoveryState: null,
      selfPracticeQuestionIds: [],
      selfPracticeIndex: 0,
      selfPracticeMode: 'new',
      selfPracticeFilters: {},
      contentBankVersion: '',
    });
  }

  function ensureLearner(progress) {
    if (progress.learnerId) return progress;
    return save({ ...progress, learnerId: createLearnerId() });
  }

  function clear() {
    const fresh = defaultProgress();
    adapter.set(fresh);
    return fresh;
  }

  return {
    load,
    save,
    addMistake,
    rememberServedQuestions,
    changeTextbook,
    changeGrade,
    changeSchoolStage,
    changeLearningTerm,
    confirmInitialGrade,
    confirmInitialLearningLevel,
    clear,
    ensureLearner,
  };
}

module.exports = {
  STORAGE_KEY,
  GRADE_CONFIRMATION_VERSION,
  defaultProgress,
  createProgressStore,
};

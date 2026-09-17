const { hashSeed } = require('./adaptive');
const { scopeKeyOf } = require('./question-bank');
const { ENTRY_DIAGNOSTIC_COUNT } = require('./question-bank-entry-diagnostic');

const DIAGNOSTIC_SLOTS = [
  'division_estimate',
  'multiplication_estimate',
  'visual_geometry',
  'number_pattern',
  'exact_division',
  'average',
  'two_step_problem',
  'decimal_money_problem',
];

function matchesDiagnosticDifficulty(item, mode) {
  if (typeof item.difficulty === 'string') return item.difficulty === mode;
  if (mode === 'easy') return item.difficulty === 1;
  if (mode === 'hard') return item.difficulty === 3;
  return item.difficulty === 2;
}

function getDiagnosticSlots(bank, grade, textbookId = 'rjb', schoolStage = 'primary') {
  const scopeKey = scopeKeyOf({ schoolStage, textbookId, grade });
  const slots = [...new Set(bank
    .filter((item) => scopeKeyOf(item) === scopeKey)
    .map((item) => item.diagnosticSlot)
    .filter(Boolean))];
  if (textbookId === 'rjb' && Number(grade) === 4 && DIAGNOSTIC_SLOTS.every((slot) => slots.includes(slot))) {
    return DIAGNOSTIC_SLOTS;
  }
  return slots.sort();
}

function getEntryDiagnosticSlots(bank, grade, textbookId = 'rjb', schoolStage = 'primary') {
  const scopeKey = scopeKeyOf({ schoolStage, textbookId, grade });
  return [...new Map(bank
    .filter((item) => (
      item.entryDiagnostic
      && scopeKeyOf(item) === scopeKey
    ))
    .sort((left, right) => Number(left.entryOrder) - Number(right.entryOrder))
    .map((item) => [item.entrySlot, item]))
    .values()]
    .slice(0, ENTRY_DIAGNOSTIC_COUNT)
    .map((item) => item.entrySlot);
}

function selectDiagnosticSet(bank, context = {}) {
  const learnerId = context.learnerId || 'local-learner';
  const attempt = Math.max(1, Number(context.attempt) || 1);
  const difficultyMode = context.difficultyMode || 'medium';
  const grade = Number(context.grade || 4);
  const textbookId = context.textbookId || 'rjb';
  const schoolStage = context.schoolStage || 'primary';
  const scopeKey = scopeKeyOf({ schoolStage, textbookId, grade });

  const selected = getEntryDiagnosticSlots(bank, grade, textbookId, schoolStage).map((slot) => {
    const slotQuestions = bank.filter(
      (item) => (
        item.entryDiagnostic
        && scopeKeyOf(item) === scopeKey
        && item.entrySlot === slot
      ),
    );
    const eligible = slotQuestions.filter((item) => matchesDiagnosticDifficulty(item, difficultyMode));
    const difficultyCandidates = eligible.length ? eligible : slotQuestions;
    const currentBlueprint = difficultyCandidates.filter((item) => item.curriculumFamily);
    const candidates = currentBlueprint.length ? currentBlueprint : difficultyCandidates;
    if (!candidates.length) return null;

    const ordered = [...candidates].sort((left, right) => left.id.localeCompare(right.id));
    const baseOffset = hashSeed(`${learnerId}:${scopeKey}:${difficultyMode}:${slot}`) % ordered.length;
    return ordered[(baseOffset + attempt - 1) % ordered.length];
  }).filter(Boolean);
  if (selected.length < 2) return selected;
  const shift = (attempt - 1) % selected.length;
  return [...selected.slice(shift), ...selected.slice(0, shift)];
}

function prepareDiagnosticAttempt(bank, progress) {
  const textbookId = progress.textbookId || 'rjb';
  const schoolStage = progress.schoolStage || 'primary';
  const scopeKey = scopeKeyOf({ schoolStage, textbookId, grade: progress.grade || 4 });
  const slots = getEntryDiagnosticSlots(bank, progress.grade || 4, textbookId, schoolStage);
  const savedIds = Array.isArray(progress.diagnosticQuestionIds)
    ? progress.diagnosticQuestionIds
    : [];
  const savedQuestions = savedIds
    .map((id) => bank.find((item) => item.id === id && scopeKeyOf(item) === scopeKey))
    .filter(Boolean);
  const savedSlots = new Set(savedQuestions.map((item) => item.entrySlot));
  const canResume = progress.diagnosticInProgress
    && savedQuestions.length === slots.length
    && savedSlots.size === slots.length;

  if (canResume) {
    return {
      isNew: false,
      attempt: Math.max(1, Number(progress.diagnosticAttempt) || 1),
      questionIds: savedIds,
      questions: savedQuestions,
      responses: Array.isArray(progress.diagnosticResponses) ? progress.diagnosticResponses : [],
      currentIndex: Math.min(
        Math.max(0, Number(progress.diagnosticCurrentIndex) || 0),
        slots.length - 1,
      ),
    };
  }

  const attempt = Math.max(0, Number(progress.diagnosticAttempt) || 0) + 1;
  const questions = selectDiagnosticSet(bank, {
    learnerId: progress.learnerId,
    attempt,
    difficultyMode: progress.difficultyMode,
    grade: progress.grade,
    textbookId,
    schoolStage,
  });
  return {
    isNew: true,
    attempt,
    questionIds: questions.map((item) => item.id),
    questions,
    responses: [],
    currentIndex: 0,
  };
}

module.exports = {
  DIAGNOSTIC_SLOTS,
  ENTRY_DIAGNOSTIC_COUNT,
  getDiagnosticSlots,
  getEntryDiagnosticSlots,
  matchesDiagnosticDifficulty,
  selectDiagnosticSet,
  prepareDiagnosticAttempt,
};

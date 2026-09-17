const { getTextbookOptions } = require('./textbook-catalog');

function safeStage(value = {}) {
  if (value.schoolStage === 'junior') return 'junior';
  if (value.schoolStage === 'primary') return 'primary';
  return String(value.textbookId || '').startsWith('jr-') ? 'junior' : 'primary';
}

function normalizeLearningScope(value = {}) {
  const schoolStage = safeStage(value);
  const options = getTextbookOptions(schoolStage);
  const requestedTextbookId = String(value.textbookId || '');
  const textbookId = options.some((item) => item.value === requestedTextbookId && item.available)
    ? requestedTextbookId
    : options[0].value;
  const lowerGrade = schoolStage === 'junior' ? 7 : 1;
  const upperGrade = schoolStage === 'junior' ? 9 : 6;
  const fallbackGrade = schoolStage === 'junior' ? 7 : 4;
  const candidateGrade = Number(value.grade);
  const grade = Number.isInteger(candidateGrade) && candidateGrade >= lowerGrade && candidateGrade <= upperGrade
    ? candidateGrade
    : fallbackGrade;
  return { schoolStage, textbookId, grade };
}

function learningScopeKey(value = {}) {
  const scope = normalizeLearningScope(value);
  return `${scope.schoolStage}:${scope.textbookId}:g${scope.grade}`;
}

function learningSessionKey(value = {}) {
  const learningTerm = value.learningTerm === '下册' ? '下册' : '上册';
  return `${learningScopeKey(value)}:${learningTerm}`;
}

function isSameLearningScope(left, right) {
  return learningScopeKey(left) === learningScopeKey(right);
}

function filterRecordsForLearningScope(records, scope) {
  if (!Array.isArray(records)) return [];
  return records.filter((record) => isSameLearningScope(record, scope));
}

module.exports = {
  normalizeLearningScope,
  learningScopeKey,
  learningSessionKey,
  isSameLearningScope,
  filterRecordsForLearningScope,
};

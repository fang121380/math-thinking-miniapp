const {
  getQuestions,
  auditQuestion,
  auditQuestionBankQuality,
  questionMathSignature,
} = require('../miniprogram/utils/question-bank');
const { auditQuestionSourceAdmission } = require('./question-source-policy');

const PRIMARY_EDITIONS = ['rjb', 'bsd', 'suj', 'qd', 'sh', 'xsb', 'hebei', 'xiang'];
const JUNIOR_EDITIONS = ['jr-rjb', 'jr-bsd', 'jr-suk', 'jr-huk', 'jr-luj', 'jr-xj', 'jr-hsd', 'jr-zj'];

function collectPublishedQuestions() {
  const questions = [];
  PRIMARY_EDITIONS.forEach((textbookId) => {
    [1, 2, 3, 4, 5, 6].forEach((grade) => {
      const scope = { schoolStage: 'primary', textbookId, grade };
      questions.push(...getQuestions({ ...scope, bank: 'diagnostic' }));
      questions.push(...getQuestions({ ...scope, bank: 'practice' }));
    });
  });
  JUNIOR_EDITIONS.forEach((textbookId) => {
    [7, 8, 9].forEach((grade) => {
      const scope = { schoolStage: 'junior', textbookId, grade };
      questions.push(...getQuestions({ ...scope, bank: 'diagnostic' }));
      questions.push(...getQuestions({ ...scope, bank: 'practice' }));
    });
  });
  return questions;
}

function duplicateError(code, questions, selector) {
  const groups = new Map();
  questions.forEach((question) => {
    const key = selector(question);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(question.id);
  });
  return [...groups.values()]
    .filter((ids) => ids.length > 1)
    .map((ids) => ({ id: ids.join(','), issues: [code] }));
}

function auditEveryPublishedQuestion(questions = collectPublishedQuestions()) {
  const errors = [];
  const checkedIds = new Set();
  const prompts = new Set();
  const mathSignatures = new Set();

  questions.forEach((question) => {
    const issues = [...auditQuestion(question), ...auditQuestionSourceAdmission(question)];
    if (issues.length) errors.push({ id: String(question && question.id || ''), issues });
    checkedIds.add(String(question && question.id || ''));
    prompts.add(String(question && question.prompt || ''));
    mathSignatures.add(questionMathSignature(question));
  });

  errors.push(...duplicateError('duplicate_id', questions, (question) => String(question && question.id || '')));
  errors.push(...duplicateError('duplicate_prompt', questions, (question) => String(question && question.prompt || '')));
  errors.push(...duplicateError('duplicate_math_signature', questions, questionMathSignature));
  errors.push(...auditQuestionBankQuality(questions, { requireEditionIsolation: true }));

  return {
    checked: questions.length,
    errors,
    unique: {
      ids: checkedIds.size,
      prompts: prompts.size,
      mathSignatures: mathSignatures.size,
    },
  };
}

function formatReport(report) {
  const lines = [
    `Checked: ${report.checked}`,
    `Unique IDs: ${report.unique.ids}`,
    `Unique prompts: ${report.unique.prompts}`,
    `Unique math signatures: ${report.unique.mathSignatures}`,
    `Errors: ${report.errors.length}`,
  ];
  report.errors.forEach((error) => lines.push(`${error.id}: ${error.issues.join(',')}`));
  return lines.join('\n');
}

if (require.main === module) {
  const report = auditEveryPublishedQuestion();
  console.log(formatReport(report));
  if (report.errors.length) process.exitCode = 1;
}

module.exports = {
  collectPublishedQuestions,
  auditEveryPublishedQuestion,
  formatReport,
};

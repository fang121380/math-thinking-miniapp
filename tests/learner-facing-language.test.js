const test = require('node:test');
const assert = require('node:assert/strict');

const { getQuestions, auditQuestion } = require('../miniprogram/utils/question-bank');
const { regenerateJuniorQuestion } = require('../miniprogram/utils/question-bank-junior-data');

const PRIMARY_EDITIONS = ['rjb', 'bsd', 'suj', 'qd', 'sh', 'xsb', 'hebei', 'xiang'];
const JUNIOR_EDITIONS = ['jr-rjb', 'jr-bsd', 'jr-suk', 'jr-huk', 'jr-luj', 'jr-xj', 'jr-hsd', 'jr-zj'];
const INTERNAL_TEMPLATE_LANGUAGE = /学习主线|探究主题|应用单元|思维课题|实践专题|规律研习|活动研究|拓展任务|符号模型|建模约束|条件\\d+[:：]|第[二三]层(?:关系|结果)?|核心结果|三级表达式|经(?:第二次|三级)变化|建立关系并分步求|(?:基础|进阶|挑战)第\\d+组[:：]/;

function learnerFacingText(question) {
  return [
    question.prompt,
    question.hint,
    question.solution && question.solution.summary,
    ...((question.solution && question.solution.steps) || []),
    question.knowledgeSummary,
    ...((question.mistakeSummary) || []),
  ].filter(Boolean).join('\n');
}

function publishedQuestions() {
  const questions = [];
  PRIMARY_EDITIONS.forEach((textbookId) => {
    [1, 2, 3, 4, 5, 6].forEach((grade) => {
      questions.push(...getQuestions({ schoolStage: 'primary', textbookId, grade, bank: 'diagnostic' }));
      questions.push(...getQuestions({ schoolStage: 'primary', textbookId, grade, bank: 'practice' }));
    });
  });
  JUNIOR_EDITIONS.forEach((textbookId) => {
    [7, 8, 9].forEach((grade) => {
      questions.push(...getQuestions({ schoolStage: 'junior', textbookId, grade, bank: 'diagnostic' }));
      questions.push(...getQuestions({ schoolStage: 'junior', textbookId, grade, bank: 'practice' }));
    });
  });
  return [...new Map(questions.map((question) => [question.id, question])).values()];
}

test('the reported quadratic diagnostic is a normal, answerable math question', () => {
  const question = regenerateJuniorQuestion('j-d-jr-rjb-g9-quadratic_function-choice-medium-1');

  assert.match(question.prompt, /^已知二次函数 y=\(x-\d+\)²\+\d+，当 x=\d+ 时，y 的值是（ ）。$/);
  assert.ok(/^\d+$/.test(question.answer));
  assert.equal(question.solution.steps.at(-1), `因此最终答案是 ${question.answer}。`);
  assert.doesNotMatch(question.prompt, /条件\d+|第二层|核心结果|经第二次变化/);
});

test('published learner-facing content never exposes generator labels or textbook shells', () => {
  const offenders = publishedQuestions()
    .filter((question) => INTERNAL_TEMPLATE_LANGUAGE.test(learnerFacingText(question))
      || /已知已知/.test(question.prompt)
      || /已知求\\s*(?:sin|cos|tan)/i.test(question.prompt)
      || /求\\s*(?:这个三角函数值|这个三角函数的值)/.test(question.prompt))
    .map((question) => question.id);

  assert.deepEqual(offenders, []);
});

test('the content audit rejects learner-facing generator language and malformed punctuation', () => {
  const sample = regenerateJuniorQuestion('j-d-jr-rjb-g9-quadratic_function-choice-medium-1');

  assert.ok(auditQuestion({ ...sample, prompt: '学习主线：条件1：x=3，结果是（ ）。' })
    .includes('learner_facing_language_invalid'));
  assert.ok(auditQuestion({ ...sample, prompt: '已知二次函数 y=x²，，y 的值是（ ）。' })
    .includes('learner_facing_punctuation_invalid'));
});
